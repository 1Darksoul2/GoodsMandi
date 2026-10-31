'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/errors';

type RatingModalProps = {
  listingId: string;
  ratedUserId: string;
  ratedUserName: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function RatingModal({ listingId, ratedUserId, ratedUserName, isOpen, onClose }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: dbError } = await supabase
        .from('ratings')
        .insert({
          rater_id: user.id,
          rated_user_id: ratedUserId,
          listing_id: listingId,
          rating_value: rating
        });

      if (dbError) {
        if (dbError.code === '23505') { // Unique violation
          throw new Error('You have already rated this user for this listing.');
        }
        throw dbError;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setRating(0);
      }, 2000);
      
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit rating'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Rating Submitted</h3>
            <p className="text-slate-400">Thank you for your feedback!</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Rate {ratedUserName}</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="text-slate-300 text-sm mb-6">How was your experience trading with this user?</p>

            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 focus:outline-none transition-transform hover:scale-110"
                >
                  <svg 
                    className={`w-10 h-10 transition-colors ${
                      (hoverRating || rating) >= star ? 'text-amber-400' : 'text-slate-600'
                    }`} 
                    fill={(hoverRating || rating) >= star ? 'currentColor' : 'none'} 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button 
                onClick={onClose}
                className="btn-ghost flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                className="btn-primary flex-1 flex justify-center items-center"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  'Submit Rating'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
