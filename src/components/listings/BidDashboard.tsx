'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, timeAgo } from '@/lib/utils';
import { minimumBid } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import Image from 'next/image';

interface BidDashboardProps {
  listingId: string;
  askingPrice: number;
}

type Bidder = {
  id: string;
  name: string;
  profile_photo_url: string | null;
  rating_avg: number;
};

type Bid = {
  id: string;
  bid_amount: number;
  status: 'pending' | 'selected' | 'rejected' | 'backup';
  created_at: string;
  bidder_id: string;
  bidder: Bidder;
};

export default function BidDashboard({ listingId, askingPrice }: BidDashboardProps) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());

  const minThreshold = minimumBid(askingPrice);

  // Pure query; callers decide when to put the result into state.
  const loadBids = useCallback(async (): Promise<Bid[] | null> => {
    const { data, error } = await supabase
      .from('bids')
      .select(`
        id, bid_amount, status, created_at, bidder_id,
        bidder:profiles!bidder_id(id, name, profile_photo_url, rating_avg)
      `)
      .eq('listing_id', listingId)
      .order('bid_amount', { ascending: false })
      .overrideTypes<Bid[], { merge: false }>();

    if (error) {
      console.error('Error fetching bids:', error.message);
      return null;
    }
    return data;
  }, [listingId, supabase]);

  const fetchBids = async () => {
    const rows = await loadBids();
    if (rows) setBids(rows);
  };

  useEffect(() => {
    let cancelled = false;
    loadBids().then((rows) => {
      if (cancelled) return;
      if (rows) setBids(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadBids]);

  const handleSelectWinner = async (bidId: string) => {
    if (!confirm('Are you sure you want to accept this bid? This will close the listing.')) return;

    setActionLoading(`winner-${bidId}`);
    try {
      // One database transaction: marks the listing sold, the bid selected and rejects the rest.
      const { error } = await supabase.rpc('select_winning_bid', { p_bid_id: bidId });
      if (error) throw error;
      await fetchBids();
    } catch (error) {
      console.error('Error selecting winner:', error);
      alert(getErrorMessage(error, 'Failed to select winner.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelectBackup = async (bidId: string) => {
    setActionLoading(`backup-${bidId}`);
    try {
      const { error } = await supabase.rpc('select_backup_bid', { p_bid_id: bidId });
      if (error) throw error;
      await fetchBids();
    } catch (error) {
      console.error('Error selecting backup:', error);
      alert(getErrorMessage(error, 'Failed to set backup bidder.'));
    } finally {
      setActionLoading(null);
    }
  };

  const hasWinner = bids.some(b => b.status === 'selected');
  const hasBackup = bids.some(b => b.status === 'backup');

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading bids...</div>;
  }

  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden mt-8">
      <div className="p-6 border-b border-white/10 bg-slate-800/50 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Bid Dashboard</h2>
          <p className="text-sm text-slate-400">Manage offers for your item</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="bg-slate-900 px-4 py-2 rounded-lg border border-white/5">
            <span className="text-slate-400 block text-xs">Asking Price</span>
            <span className="font-semibold text-white">{formatPrice(askingPrice)}</span>
          </div>
          <div className="bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-500/20">
            <span className="text-emerald-500 block text-xs">Min Threshold (70%)</span>
            <span className="font-semibold text-emerald-400">{formatPrice(minThreshold)}</span>
          </div>
        </div>
      </div>

      <div className="p-0 overflow-x-auto">
        {bids.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <svg className="w-16 h-16 text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-400">No bids yet. Check back later!</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/30 text-xs uppercase text-slate-400 border-b border-white/5">
                <th className="px-6 py-4 font-medium">Bidder</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bids.map((bid) => (
                <tr key={bid.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/profile/${bid.bidder.id}`} className="flex items-center gap-3 group">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-700">
                        {bid.bidder.profile_photo_url ? (
                          <Image src={bid.bidder.profile_photo_url} alt={bid.bidder.name} fill className="object-cover" sizes="32px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-teal-600">
                            {bid.bidder.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-200 group-hover:text-white">{bid.bidder.name}</div>
                        {bid.bidder.rating_avg > 0 && (
                          <div className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                            ★ {bid.bidder.rating_avg.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-emerald-400">{formatPrice(bid.bid_amount)}</span>
                    {bid.bid_amount >= askingPrice && (
                      <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">Asking</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {timeAgo(bid.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border
                      ${bid.status === 'selected' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}
                      ${bid.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : ''}
                      ${bid.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' : ''}
                      ${bid.status === 'backup' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : ''}
                    `}>
                      {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Link 
                        href={`/chat/${listingId}/${bid.bidder_id}`}
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        title="Chat with bidder"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </Link>
                      
                      {!hasWinner && bid.status === 'pending' && (
                        <button
                          onClick={() => handleSelectWinner(bid.id)}
                          disabled={actionLoading !== null}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `winner-${bid.id}` ? 'Accepting...' : 'Accept'}
                        </button>
                      )}
                      
                      {hasWinner && !hasBackup && (bid.status === 'pending' || bid.status === 'rejected') && (
                        <button
                          onClick={() => handleSelectBackup(bid.id)}
                          disabled={actionLoading !== null}
                          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {actionLoading === `backup-${bid.id}` ? 'Setting...' : 'Set Backup'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
