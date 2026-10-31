'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MAX_BID_ATTEMPTS, minimumBid } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';

interface BidModalProps {
  listing: {
    id: string;
    title: string;
    asking_price: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

type ExistingBid = { id: string; bid_amount: number; bid_attempts: number; status: string };

export default function BidModal(props: BidModalProps) {
  // Mount the body only while open, so each opening starts with fresh state and refetches.
  if (!props.isOpen) return null;
  return <BidModalBody {...props} />;
}

function BidModalBody({ listing, onClose }: BidModalProps) {
  const [bidAmount, setBidAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingBid, setExistingBid] = useState<ExistingBid | null>(null);
  const [checkingBid, setCheckingBid] = useState(true);
  const [supabase] = useState(() => createClient());

  // Whole rupees, rounded up so the UI never accepts a bid the database rejects.
  const minBid = minimumBid(listing.asking_price);

  // Check for an existing bid when the modal opens
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: bid } = await supabase
          .from('bids')
          .select('id, bid_amount, bid_attempts, status')
          .eq('listing_id', listing.id)
          .eq('bidder_id', userData.user.id)
          .maybeSingle();

        if (bid && !cancelled) {
          setExistingBid(bid);
          setBidAmount(bid.bid_amount.toString());
        }
      } catch {
        // Not critical: the form still works as a first bid and the database validates it.
      } finally {
        if (!cancelled) setCheckingBid(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listing.id, supabase]);

  const attemptsUsed = existingBid?.bid_attempts ?? 0;
  const attemptsRemaining = MAX_BID_ATTEMPTS - attemptsUsed;
  const isMaxedOut = attemptsUsed >= MAX_BID_ATTEMPTS;
  const isClosed = existingBid !== null && existingBid.status !== 'pending';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = Number(bidAmount);

    if (isNaN(amount) || amount < minBid) {
      setError(`Minimum bid must be ₹${minBid} (70% of asking price)`);
      return;
    }

    if (isMaxedOut) {
      setError(`You've reached the maximum of ${MAX_BID_ATTEMPTS} bid attempts on this listing.`);
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error('You must be logged in to place a bid');
      }

      // Ban status, minimum bid, listing status and attempt count are all enforced by the
      // database (validate_bid trigger); its error messages are shown to the user as-is.
      if (existingBid) {
        // Revision: only the amount is sent; the database increments bid_attempts.
        const { data: updated, error: bidError } = await supabase
          .from('bids')
          .update({ bid_amount: amount })
          .eq('id', existingBid.id)
          .select('id');

        if (bidError) throw bidError;
        if (!updated || updated.length === 0) {
          throw new Error('Your bid could not be updated. Please refresh and try again.');
        }
      } else {
        const { error: bidError } = await supabase
          .from('bids')
          .insert({
            listing_id: listing.id,
            bidder_id: userData.user.id,
            bid_amount: amount,
          });

        if (bidError) {
          if (bidError.code === '23505') {
            throw new Error('You have already placed a bid on this item. Refresh and try updating it.');
          }
          throw bidError;
        }
      }

      // Success
      alert(existingBid ? 'Bid updated successfully!' : 'Bid placed successfully!');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to place bid'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-1">
            {existingBid ? 'Update Your Bid' : 'Place a Bid'}
          </h2>
          <p className="text-slate-400 text-sm mb-6">For: {listing.title}</p>

          {isClosed ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-300 text-sm">
                Bidding on this item is closed. Your bid of ₹{existingBid?.bid_amount} is marked <span className="font-medium text-white">{existingBid?.status}</span>.
              </div>
              <button type="button" onClick={onClose} className="btn-secondary w-full">
                Close
              </button>
            </div>
          ) : isMaxedOut ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                <div className="font-medium mb-1">Maximum bids reached</div>
                <p>You&apos;ve used all {MAX_BID_ATTEMPTS} bid attempts on this listing. Your current bid of ₹{existingBid?.bid_amount} stands.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary w-full"
              >
                Close
              </button>
            </div>
          ) : checkingBid ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {existingBid ? 'Revised Bid Amount' : 'Your Bid Amount'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                  <input
                    type="number"
                    required
                    min={minBid}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="input-field w-full pl-8 text-lg font-medium"
                    placeholder={minBid.toString()}
                    disabled={loading}
                  />
                </div>
                <div className="flex justify-between items-center mt-2 text-xs">
                  <span className="text-slate-500">Asking price: ₹{listing.asking_price}</span>
                  <span className="text-emerald-400">Minimum bid: ₹{minBid}</span>
                </div>
              </div>

              {/* Attempts indicator */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="flex gap-1">
                  {Array.from({ length: MAX_BID_ATTEMPTS }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < attemptsUsed ? 'bg-amber-500' : i === attemptsUsed ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <span>
                  {existingBid
                    ? `${attemptsRemaining} revision${attemptsRemaining === 1 ? '' : 's'} remaining`
                    : `${MAX_BID_ATTEMPTS} attempts allowed`
                  }
                </span>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={loading || !bidAmount}
                >
                  {loading ? 'Submitting...' : existingBid ? 'Update Bid' : 'Confirm Bid'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
