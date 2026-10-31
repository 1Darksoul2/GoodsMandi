-- 005_security_and_integrity.sql
-- Security hardening and data-integrity fixes from the October 2026 audit.
-- Run after 001-004. Safe to re-run: every object is dropped or replaced first.
--
-- Convention used below:
--   * Validation triggers are SECURITY INVOKER and check `current_user = 'authenticated'`
--     to tell a direct API request from a call made inside one of the trusted
--     SECURITY DEFINER functions in this file (where current_user is the owner).
--   * Every SECURITY DEFINER function pins `search_path = ''` and schema-qualifies names.

------------------------------------------------------------------------------
-- 1. Helper functions used by RLS policies (SECURITY DEFINER avoids policy recursion)
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), false);
$$;

-- True when the current user has a bid on the listing.
CREATE OR REPLACE FUNCTION public.has_bid_on(p_listing_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.bids b
        WHERE b.listing_id = p_listing_id AND b.bidder_id = auth.uid()
    );
$$;

-- True when the current user and p_other are the seller and a bidder of the listing.
CREATE OR REPLACE FUNCTION public.can_chat(p_listing_id uuid, p_other uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.listings l
        WHERE l.id = p_listing_id
          AND (
                (l.seller_id = auth.uid() AND EXISTS (
                    SELECT 1 FROM public.bids b WHERE b.listing_id = l.id AND b.bidder_id = p_other))
             OR (l.seller_id = p_other AND EXISTS (
                    SELECT 1 FROM public.bids b WHERE b.listing_id = l.id AND b.bidder_id = auth.uid()))
          )
    );
$$;

-- True when the listing is sold and the current user and p_rated are its seller and buyer.
CREATE OR REPLACE FUNCTION public.can_rate(p_listing_id uuid, p_rated uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.listings l
        WHERE l.id = p_listing_id
          AND l.status = 'sold'
          AND (
                (l.seller_id = auth.uid() AND l.selected_bidder_id = p_rated)
             OR (l.selected_bidder_id = auth.uid() AND l.seller_id = p_rated)
          )
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_bid_on(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_chat(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_rate(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_bid_on(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_chat(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_rate(uuid, uuid) TO authenticated;

------------------------------------------------------------------------------
-- 2. Profiles: users may only edit their own public fields (S1)
------------------------------------------------------------------------------

-- Column-level privileges: is_admin, banned, warning_count, verified, rating_avg,
-- counters, id and college_email can no longer be changed through the API.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (name, year_of_study, branch_course, profile_photo_url) ON public.profiles TO authenticated;

------------------------------------------------------------------------------
-- 3. Sign-up: college e-mail only, keep the signup form fields (S3, F13, S10)
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_college_email()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.email IS NOT DISTINCT FROM OLD.email THEN
        RETURN NEW;
    END IF;
    IF NEW.email IS NULL OR lower(NEW.email) NOT LIKE '%@stu.upes.ac.in' THEN
        RAISE EXCEPTION 'Only @stu.upes.ac.in email addresses are allowed';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_college_email ON auth.users;
CREATE TRIGGER enforce_college_email
    BEFORE INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.enforce_college_email();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    meta jsonb := COALESCE(new.raw_user_meta_data, '{}'::jsonb);
    v_year integer;
BEGIN
    IF meta->>'year_of_study' ~ '^[1-9]$' THEN
        v_year := (meta->>'year_of_study')::integer;
    END IF;

    INSERT INTO public.profiles (id, college_email, name, year_of_study, branch_course)
    VALUES (
        new.id,
        lower(new.email),
        COALESCE(NULLIF(trim(meta->>'full_name'), ''), split_part(new.email, '@', 1)),
        v_year,
        NULLIF(trim(meta->>'branch_course'), '')
    );
    RETURN new;
END;
$$;

------------------------------------------------------------------------------
-- 4. Counter / moderation triggers run with owner rights so RLS does not block them (F3)
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_report_confirmation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    current_warning_count integer;
BEGIN
    IF OLD.status IS DISTINCT FROM 'confirmed' AND NEW.status = 'confirmed' THEN
        UPDATE public.profiles
        SET warning_count = warning_count + 1
        WHERE id = NEW.reported_user_id
        RETURNING warning_count INTO current_warning_count;

        IF current_warning_count >= 3 THEN
            UPDATE public.profiles SET banned = true WHERE id = NEW.reported_user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Fixed: used NEW on DELETE (which is NULL), so deleting a rating never recalculated.
CREATE OR REPLACE FUNCTION public.update_rating_avg()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    target uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.rated_user_id ELSE NEW.rated_user_id END;
BEGIN
    UPDATE public.profiles
    SET rating_avg = (
        SELECT COALESCE(ROUND(AVG(r.rating_value)::numeric, 2), 0)
        FROM public.ratings r
        WHERE r.rated_user_id = target
    )
    WHERE id = target;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.recount_active_listings()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        UPDATE public.profiles SET active_listings_count = (
            SELECT COUNT(*) FROM public.listings WHERE seller_id = NEW.seller_id AND status = 'active'
        ) WHERE id = NEW.seller_id;
    END IF;
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.seller_id IS DISTINCT FROM NEW.seller_id) THEN
        UPDATE public.profiles SET active_listings_count = (
            SELECT COUNT(*) FROM public.listings WHERE seller_id = OLD.seller_id AND status = 'active'
        ) WHERE id = OLD.seller_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_items_sold()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM 'sold' AND NEW.status = 'sold' THEN
        UPDATE public.profiles SET total_items_sold = total_items_sold + 1 WHERE id = NEW.seller_id;
    ELSIF OLD.status = 'sold' AND NEW.status IS DISTINCT FROM 'sold' THEN
        UPDATE public.profiles SET total_items_sold = GREATEST(total_items_sold - 1, 0) WHERE id = NEW.seller_id;
    END IF;
    RETURN NEW;
END;
$$;

------------------------------------------------------------------------------
-- 5. Bids: one validation trigger for inserts and revisions (S4, F4)
------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_check_minimum_bid ON public.bids;
DROP TRIGGER IF EXISTS trg_check_banned_on_bid ON public.bids;
DROP FUNCTION IF EXISTS public.check_minimum_bid();
DROP FUNCTION IF EXISTS public.check_banned_on_bid();

CREATE OR REPLACE FUNCTION public.validate_bid()
RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
    max_attempts constant integer := 3;
    v_listing public.listings%ROWTYPE;
    v_banned boolean;
    v_min numeric(10,2);
BEGIN
    -- Trusted SECURITY DEFINER functions (select_winning_bid, select_backup_bid) skip checks.
    IF TG_OP = 'UPDATE' AND current_user <> 'authenticated' THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_listing FROM public.listings WHERE id = NEW.listing_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF TG_OP = 'UPDATE' AND auth.uid() = v_listing.seller_id AND auth.uid() <> OLD.bidder_id THEN
        -- Seller: may only change the status of bids on their listing.
        IF NEW.bid_amount IS DISTINCT FROM OLD.bid_amount
           OR NEW.bidder_id IS DISTINCT FROM OLD.bidder_id
           OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
           OR NEW.bid_attempts IS DISTINCT FROM OLD.bid_attempts
           OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Sellers can only change the status of a bid';
        END IF;
        RETURN NEW;
    END IF;

    -- From here on: the bidder placing (INSERT) or revising (UPDATE) their own bid.
    IF v_listing.status <> 'active' THEN
        RAISE EXCEPTION 'This listing is no longer accepting bids';
    END IF;
    IF NEW.bidder_id = v_listing.seller_id THEN
        RAISE EXCEPTION 'You cannot bid on your own listing';
    END IF;

    SELECT banned INTO v_banned FROM public.profiles WHERE id = NEW.bidder_id;
    IF COALESCE(v_banned, false) THEN
        RAISE EXCEPTION 'You are banned and cannot place a bid.';
    END IF;

    v_min := ROUND(v_listing.asking_price * 0.70, 2);
    IF NEW.bid_amount < v_min THEN
        RAISE EXCEPTION 'Bid amount must be at least 70%% of asking price (minimum: %)', v_min;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.status := 'pending';
        NEW.bid_attempts := 1;
        NEW.created_at := now();
    ELSE
        IF NEW.bidder_id IS DISTINCT FROM OLD.bidder_id OR NEW.listing_id IS DISTINCT FROM OLD.listing_id THEN
            RAISE EXCEPTION 'A bid cannot be moved to another listing or user';
        END IF;
        IF OLD.status <> 'pending' THEN
            RAISE EXCEPTION 'This bid can no longer be changed';
        END IF;
        IF OLD.bid_attempts >= max_attempts THEN
            RAISE EXCEPTION 'You have reached the maximum of % bid attempts on this listing', max_attempts;
        END IF;
        NEW.status := 'pending';
        NEW.bid_attempts := OLD.bid_attempts + 1;
        NEW.created_at := now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_bid ON public.bids;
CREATE TRIGGER trg_validate_bid
    BEFORE INSERT OR UPDATE ON public.bids
    FOR EACH ROW EXECUTE FUNCTION public.validate_bid();

-- Bidders can now revise their own bid (previously no policy allowed it).
DROP POLICY IF EXISTS "bids_update_own_policy" ON public.bids;
CREATE POLICY "bids_update_own_policy"
ON public.bids FOR UPDATE
TO authenticated
USING (bidder_id = (SELECT auth.uid()))
WITH CHECK (bidder_id = (SELECT auth.uid()));

------------------------------------------------------------------------------
-- 6. Listings: visibility for buyers/admins, and guarded updates (F10, S9)
------------------------------------------------------------------------------

DROP POLICY IF EXISTS "listings_select_policy" ON public.listings;
CREATE POLICY "listings_select_policy"
ON public.listings FOR SELECT
TO authenticated
USING (
    status = 'active'
    OR seller_id = (SELECT auth.uid())
    OR selected_bidder_id = (SELECT auth.uid())
    OR backup_bidder_id = (SELECT auth.uid())
    OR public.has_bid_on(id)
    OR public.is_admin()
);

CREATE OR REPLACE FUNCTION public.guard_listing_write()
RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
    v_banned boolean;
BEGIN
    IF current_user <> 'authenticated' THEN
        RETURN NEW;  -- trusted SECURITY DEFINER function or dashboard/service role
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.status := 'active';
        NEW.selected_bidder_id := NULL;
        NEW.backup_bidder_id := NULL;
        NEW.created_at := now();
        RETURN NEW;
    END IF;

    IF NEW.seller_id IS DISTINCT FROM OLD.seller_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.selected_bidder_id IS DISTINCT FROM OLD.selected_bidder_id
       OR NEW.backup_bidder_id IS DISTINCT FROM OLD.backup_bidder_id THEN
        RAISE EXCEPTION 'Use the bid dashboard to choose a buyer';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status = 'active' AND NEW.status = 'removed') THEN
        RAISE EXCEPTION 'A listing can only be changed from active to removed';
    END IF;

    IF OLD.status <> 'active' THEN
        RAISE EXCEPTION 'Only active listings can be edited';
    END IF;

    SELECT banned INTO v_banned FROM public.profiles WHERE id = OLD.seller_id;
    IF COALESCE(v_banned, false) AND NEW.status IS DISTINCT FROM 'removed' THEN
        RAISE EXCEPTION 'You are banned and can only remove your listings.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_listing_write ON public.listings;
CREATE TRIGGER trg_guard_listing_write
    BEFORE INSERT OR UPDATE ON public.listings
    FOR EACH ROW EXECUTE FUNCTION public.guard_listing_write();

------------------------------------------------------------------------------
-- 7. Accepting a winner / backup atomically (F9, F7)
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.select_winning_bid(p_bid_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_bid public.bids%ROWTYPE;
    v_listing public.listings%ROWTYPE;
BEGIN
    SELECT * INTO v_bid FROM public.bids WHERE id = p_bid_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bid not found';
    END IF;

    SELECT * INTO v_listing FROM public.listings WHERE id = v_bid.listing_id FOR UPDATE;
    IF v_listing.seller_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Only the seller can accept a bid';
    END IF;
    IF v_listing.status <> 'active' THEN
        RAISE EXCEPTION 'This listing is no longer active';
    END IF;
    IF v_bid.status <> 'pending' THEN
        RAISE EXCEPTION 'Only pending bids can be accepted';
    END IF;

    UPDATE public.listings
    SET status = 'sold', selected_bidder_id = v_bid.bidder_id
    WHERE id = v_listing.id;

    UPDATE public.bids SET status = 'selected' WHERE id = v_bid.id;

    UPDATE public.bids SET status = 'rejected'
    WHERE listing_id = v_listing.id AND id <> v_bid.id AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.select_backup_bid(p_bid_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_bid public.bids%ROWTYPE;
    v_listing public.listings%ROWTYPE;
BEGIN
    SELECT * INTO v_bid FROM public.bids WHERE id = p_bid_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bid not found';
    END IF;

    SELECT * INTO v_listing FROM public.listings WHERE id = v_bid.listing_id FOR UPDATE;
    IF v_listing.seller_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Only the seller can choose a backup bidder';
    END IF;
    IF v_listing.status <> 'sold' OR v_listing.selected_bidder_id IS NULL THEN
        RAISE EXCEPTION 'Accept a winning bid before choosing a backup';
    END IF;
    IF v_listing.backup_bidder_id IS NOT NULL THEN
        RAISE EXCEPTION 'A backup bidder has already been chosen';
    END IF;
    IF v_bid.status NOT IN ('pending', 'rejected') THEN
        RAISE EXCEPTION 'This bid cannot be the backup';
    END IF;

    UPDATE public.listings SET backup_bidder_id = v_bid.bidder_id WHERE id = v_listing.id;
    UPDATE public.bids SET status = 'backup' WHERE id = v_bid.id;
END;
$$;

REVOKE ALL ON FUNCTION public.select_winning_bid(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.select_backup_bid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.select_winning_bid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.select_backup_bid(uuid) TO authenticated;

------------------------------------------------------------------------------
-- 8. Ratings, chat and reports: only between people in a real deal (S7, S8)
------------------------------------------------------------------------------

DROP POLICY IF EXISTS "ratings_insert_policy" ON public.ratings;
CREATE POLICY "ratings_insert_policy"
ON public.ratings FOR INSERT
TO authenticated
WITH CHECK (
    rater_id = (SELECT auth.uid())
    AND rated_user_id <> (SELECT auth.uid())
    AND public.can_rate(listing_id, rated_user_id)
);

DROP POLICY IF EXISTS "chat_messages_insert_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_policy"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND recipient_id <> (SELECT auth.uid())
    AND length(trim(message_text)) BETWEEN 1 AND 2000
    AND public.can_chat(listing_id, recipient_id)
);

DROP POLICY IF EXISTS "reports_insert_policy" ON public.reports;
CREATE POLICY "reports_insert_policy"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (
    reporter_id = (SELECT auth.uid())
    AND reported_user_id <> (SELECT auth.uid())
    AND status = 'pending'
);

DROP POLICY IF EXISTS "reports_select_policy" ON public.reports;
CREATE POLICY "reports_select_policy"
ON public.reports FOR SELECT
TO authenticated
USING (reporter_id = (SELECT auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "reports_update_policy" ON public.reports;
CREATE POLICY "reports_update_policy"
ON public.reports FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

------------------------------------------------------------------------------
-- 9. Storage: images only, 5 MB max (S5)
------------------------------------------------------------------------------

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id IN ('listing-photos', 'profile-photos');
