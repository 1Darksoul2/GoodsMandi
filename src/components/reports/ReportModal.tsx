'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/errors';
import { REPORT_CATEGORIES } from '@/lib/constants';

type ReportModalProps = {
  reportedUserId: string;
  reportedListingId?: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function ReportModal({ reportedUserId, reportedListingId, isOpen, onClose }: ReportModalProps) {
  const [category, setCategory] = useState<string>(REPORT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a description.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: dbError } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          reported_listing_id: reportedListingId || null,
          category,
          description: description.trim(),
          status: 'pending'
        });

      if (dbError) throw dbError;

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setCategory(REPORT_CATEGORIES[0]);
        setDescription('');
      }, 3000);
      
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit report. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Report Submitted</h3>
            <p className="text-slate-400 mb-2">Our team will review this report shortly.</p>
            <p className="text-xs text-slate-500">Note: False reports may result in account penalties.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Report User
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Reason for reporting</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field w-full bg-slate-900 text-slate-200 border-white/10 appearance-none"
                >
                  {REPORT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-slate-800 bg-slate-900 text-slate-200">{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Additional details</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide specific details to help our admins review this report..."
                  className="input-field w-full h-32 resize-none"
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={onClose}
                  className="btn-ghost flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-danger flex-1 flex justify-center items-center"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
