-- Policy and trigger scenarios. Each line prints PASS or FAIL. Run via supabase/tests/run.sh.
\set QUIET on
\set VERBOSITY terse
CREATE FUNCTION public.t_err(label text, q text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE q; RAISE NOTICE 'FAIL  % (no error)', label;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'PASS  % -> %', label, SQLERRM; END $$;
CREATE FUNCTION public.t_ok(label text, q text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN EXECUTE q; RAISE NOTICE 'PASS  %', label;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FAIL  % -> %', label, SQLERRM; END $$;
CREATE FUNCTION public.t_eq(label text, q text, expected text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v text; BEGIN EXECUTE q INTO v;
IF v IS NOT DISTINCT FROM expected THEN RAISE NOTICE 'PASS  % = %', label, v; ELSE RAISE NOTICE 'FAIL  % = % (expected %)', label, v, expected; END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FAIL  % -> %', label, SQLERRM; END $$;
GRANT EXECUTE ON FUNCTION t_err(text,text), t_ok(text,text), t_eq(text,text,text) TO authenticated;

-- users (as dashboard/postgres)
SELECT t_err('S3 non-college signup rejected', $q$INSERT INTO auth.users(email) VALUES ('x@gmail.com')$q$);
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('00000000-0000-0000-0000-00000000000a','Seller@STU.UPES.AC.IN','{"full_name":"Sam Seller","year_of_study":"2","branch_course":"CSE"}'),
 ('00000000-0000-0000-0000-00000000000b','b1@stu.upes.ac.in','{"full_name":"Bea"}'),
 ('00000000-0000-0000-0000-00000000000c','b2@stu.upes.ac.in','{}'),
 ('00000000-0000-0000-0000-00000000000d','admin@stu.upes.ac.in','{}'),
 ('00000000-0000-0000-0000-00000000000e','out@stu.upes.ac.in','{}');
UPDATE profiles SET is_admin=true WHERE id='00000000-0000-0000-0000-00000000000d';
SELECT t_eq('F13 year/branch saved', $q$SELECT year_of_study||'/'||branch_course||'/'||college_email FROM profiles WHERE id='00000000-0000-0000-0000-00000000000a'$q$, '2/CSE/seller@stu.upes.ac.in');

-- ===== as seller A
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false); SET ROLE authenticated;
SELECT t_err('S1 self-promote to admin', $q$UPDATE profiles SET is_admin=true WHERE id=auth.uid()$q$);
SELECT t_err('S1 clear own warnings', $q$UPDATE profiles SET warning_count=0, banned=false WHERE id=auth.uid()$q$);
SELECT t_ok ('S1 edit own name still allowed', $q$UPDATE profiles SET name='Sam' WHERE id=auth.uid()$q$);
SELECT t_ok ('create listing', $q$INSERT INTO listings(id,seller_id,title,category,asking_price,product_age,status,selected_bidder_id) VALUES ('10000000-0000-0000-0000-000000000001',auth.uid(),'Cycle','Cycles & Transport',99,'1-2 years','sold','00000000-0000-0000-0000-00000000000b')$q$);
SELECT t_eq('S9 insert forced to active, no buyer', $q$SELECT status||coalesce(selected_bidder_id::text,'-') FROM listings$q$, 'active-');
SELECT t_err('S4 seller bids on own listing', $q$INSERT INTO bids(listing_id,bidder_id,bid_amount) VALUES ('10000000-0000-0000-0000-000000000001',auth.uid(),90)$q$);
RESET ROLE;

-- ===== as bidder B
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false); SET ROLE authenticated;
SELECT t_err('S4 bid below 70% (69 < 69.30)', $q$INSERT INTO bids(listing_id,bidder_id,bid_amount) VALUES ('10000000-0000-0000-0000-000000000001',auth.uid(),69)$q$);
SELECT t_ok ('place bid 70', $q$INSERT INTO bids(id,listing_id,bidder_id,bid_amount,bid_attempts,status) VALUES ('20000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-000000000001',auth.uid(),70,0,'selected')$q$);
SELECT t_eq('S4 insert forced pending/attempt 1', $q$SELECT status||'/'||bid_attempts FROM bids WHERE id='20000000-0000-0000-0000-00000000000b'$q$, 'pending/1');
SELECT t_eq('F4 revise bid (rows updated)', $q$WITH u AS (UPDATE bids SET bid_amount=80 WHERE id='20000000-0000-0000-0000-00000000000b' RETURNING bid_attempts) SELECT bid_attempts::text FROM u$q$, '2');
SELECT t_ok ('F4 revise bid again', $q$UPDATE bids SET bid_amount=85 WHERE id='20000000-0000-0000-0000-00000000000b'$q$);
SELECT t_err('F4 4th attempt blocked', $q$UPDATE bids SET bid_amount=86 WHERE id='20000000-0000-0000-0000-00000000000b'$q$);
SELECT t_err('S8 chat with stranger listing pair', $q$INSERT INTO chat_messages(listing_id,sender_id,recipient_id,message_text) VALUES ('10000000-0000-0000-0000-000000000001',auth.uid(),'00000000-0000-0000-0000-00000000000e','hi')$q$);
SELECT t_ok ('chat bidder->seller', $q$INSERT INTO chat_messages(listing_id,sender_id,recipient_id,message_text) VALUES ('10000000-0000-0000-0000-000000000001',auth.uid(),'00000000-0000-0000-0000-00000000000a','hi')$q$);
SELECT t_err('S7 rate before sale', $q$INSERT INTO ratings(listing_id,rater_id,rated_user_id,rating_value) VALUES ('10000000-0000-0000-0000-000000000001',auth.uid(),'00000000-0000-0000-0000-00000000000a',5)$q$);
SELECT t_err('S9 non-seller accepts bid via RPC', $q$SELECT select_winning_bid('20000000-0000-0000-0000-00000000000b')$q$);
RESET ROLE;

-- ===== as bidder C
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false); SET ROLE authenticated;
SELECT t_ok ('C places bid 75', $q$INSERT INTO bids(id,listing_id,bidder_id,bid_amount) VALUES ('20000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-000000000001',auth.uid(),75)$q$);
SELECT t_eq('C cannot see B''s bid', $q$SELECT count(*)::text FROM bids$q$, '1');
SELECT t_ok ('F1 report seller', $q$INSERT INTO reports(id,reporter_id,reported_user_id,reported_listing_id,category,description,status) VALUES ('30000000-0000-0000-0000-000000000001',auth.uid(),'00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000001','Scam','x','pending')$q$);
SELECT t_err('report self', $q$INSERT INTO reports(reporter_id,reported_user_id,category) VALUES (auth.uid(),auth.uid(),'Scam')$q$);
SELECT t_eq('reporter cannot confirm report (0 rows)', $q$WITH u AS (UPDATE reports SET status='confirmed' WHERE id='30000000-0000-0000-0000-000000000001' RETURNING 1) SELECT count(*)::text FROM u$q$, '0');
RESET ROLE;

-- ===== seller A manages bids
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false); SET ROLE authenticated;
SELECT t_err('S4 seller rewrites bid amount', $q$UPDATE bids SET bid_amount=1000 WHERE id='20000000-0000-0000-0000-00000000000b'$q$);
SELECT t_err('S9 seller sets buyer directly', $q$UPDATE listings SET selected_bidder_id='00000000-0000-0000-0000-00000000000e'$q$);
SELECT t_err('F7 backup before winner', $q$SELECT select_backup_bid('20000000-0000-0000-0000-00000000000c')$q$);
SELECT t_ok ('F9 accept B atomically', $q$SELECT select_winning_bid('20000000-0000-0000-0000-00000000000b')$q$);
SELECT t_eq('F9 listing sold to B', $q$SELECT status||'/'||selected_bidder_id FROM listings$q$, 'sold/00000000-0000-0000-0000-00000000000b');
SELECT t_eq('F9 bid statuses', $q$SELECT string_agg(status::text, ',' ORDER BY bidder_id) FROM bids$q$, 'selected,rejected');
SELECT t_ok ('F7 backup C', $q$SELECT select_backup_bid('20000000-0000-0000-0000-00000000000c')$q$);
SELECT t_eq('F7 C is backup', $q$SELECT status::text FROM bids WHERE id='20000000-0000-0000-0000-00000000000c'$q$, 'backup');
SELECT t_err('S9 sold listing back to active', $q$UPDATE listings SET status='active'$q$);
SELECT t_ok ('S7 seller rates buyer', $q$INSERT INTO ratings(listing_id,rater_id,rated_user_id,rating_value) VALUES ('10000000-0000-0000-0000-000000000001',auth.uid(),'00000000-0000-0000-0000-00000000000b',4)$q$);
RESET ROLE;
SELECT t_eq('F3 B rating_avg updated', $q$SELECT rating_avg::text FROM profiles WHERE id='00000000-0000-0000-0000-00000000000b'$q$, '4.00');
SELECT t_eq('items sold counter', $q$SELECT total_items_sold||'/'||active_listings_count FROM profiles WHERE id='00000000-0000-0000-0000-00000000000a'$q$, '1/0');

-- ===== winner B
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false); SET ROLE authenticated;
SELECT t_eq('F10 winner can read sold listing', $q$SELECT count(*)::text FROM listings$q$, '1');
SELECT t_err('F4 revise bid after sale', $q$UPDATE bids SET bid_amount=90 WHERE id='20000000-0000-0000-0000-00000000000b'$q$);
SELECT t_ok ('S7 buyer rates seller', $q$INSERT INTO ratings(listing_id,rater_id,rated_user_id,rating_value) VALUES ('10000000-0000-0000-0000-000000000001',auth.uid(),'00000000-0000-0000-0000-00000000000a',5)$q$);
RESET ROLE;
-- ===== outsider E
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000e',false); SET ROLE authenticated;
SELECT t_eq('outsider cannot read sold listing', $q$SELECT count(*)::text FROM listings$q$, '0');
SELECT t_err('S7 outsider rates seller', $q$INSERT INTO ratings(listing_id,rater_id,rated_user_id,rating_value) VALUES ('10000000-0000-0000-0000-000000000001',auth.uid(),'00000000-0000-0000-0000-00000000000a',1)$q$);
RESET ROLE;
-- ===== admin confirms 3 reports
INSERT INTO reports(id,reporter_id,reported_user_id,category) VALUES
 ('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000a','Scam'),
 ('30000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-00000000000a','Scam');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000d',false); SET ROLE authenticated;
SELECT t_eq('admin sees all reports', $q$SELECT count(*)::text FROM reports$q$, '3');
SELECT t_ok ('F2/F3 admin confirms reports', $q$UPDATE reports SET status='confirmed'$q$);
RESET ROLE;
SELECT t_eq('F3 warnings + auto-ban', $q$SELECT warning_count||'/'||banned FROM profiles WHERE id='00000000-0000-0000-0000-00000000000a'$q$, '3/true');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false); SET ROLE authenticated;
SELECT t_err('banned user creates listing', $q$INSERT INTO listings(seller_id,title,category,asking_price,product_age) VALUES (auth.uid(),'X','Appliances',10,'2+ years')$q$);
RESET ROLE;
DELETE FROM ratings WHERE rated_user_id='00000000-0000-0000-0000-00000000000b';
SELECT t_eq('F3 rating avg after delete', $q$SELECT rating_avg::text FROM profiles WHERE id='00000000-0000-0000-0000-00000000000b'$q$, '0.00');
SELECT t_eq('S5 bucket limits', $q$SELECT string_agg(file_size_limit::text,',') FROM storage.buckets$q$, '5242880,5242880');
