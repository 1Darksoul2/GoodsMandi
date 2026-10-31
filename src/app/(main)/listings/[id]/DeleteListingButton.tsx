'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/errors';

interface DeleteListingButtonProps {
  listingId: string;
}

export default function DeleteListingButton({ listingId }: DeleteListingButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Soft delete: set status to 'removed' to preserve bid/chat history
      const { error } = await supabase
        .from('listings')
        .update({ status: 'removed' })
        .eq('id', listingId);

      if (error) throw error;

      router.push('/listings/my');
      router.refresh();
    } catch (err) {
      console.error('Error removing listing:', getErrorMessage(err));
      alert('Failed to remove listing. Please try again.');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Are you sure?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? 'Removing…' : 'Yes, Remove'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Remove Listing
    </button>
  );
}
