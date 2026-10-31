'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, timeAgo } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import BidDashboard from '@/components/listings/BidDashboard';
import BidModalController from './BidModalController';
import DeleteListingButton from './DeleteListingButton';
import RatingModal from '@/components/ratings/RatingModal';
import type { Listing } from '@/lib/types';

export type ListingDetail = Omit<Listing, 'seller'> & {
  seller: { id: string; name: string; profile_photo_url: string | null; rating_avg: number; total_items_sold: number };
  winner: { id: string; name: string } | null;
};

interface ListingDetailClientProps {
  listing: ListingDetail;
  categoryColor: string;
  serverUserId: string | null;
}

export default function ListingDetailClient({ listing, categoryColor, serverUserId }: ListingDetailClientProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(serverUserId);
  const [authChecked, setAuthChecked] = useState(!!serverUserId);
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  // Client-side auth check as fallback when server-side auth returns null
  useEffect(() => {
    if (serverUserId) return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
      setAuthChecked(true);
    });
  }, [serverUserId]);

  const isSeller = authChecked && currentUserId === listing.seller_id;
  const isBuyer = authChecked && !!currentUserId && currentUserId === listing.selected_bidder_id;
  const isSold = listing.status === 'sold';
  const isRemoved = listing.status === 'removed';
  const mainPhoto = listing.photos && listing.photos.length > 0 ? listing.photos[0] : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href={isSeller ? "/listings/my" : "/listings"} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {isSeller ? 'Back to My Listings' : 'Back to Listings'}
      </Link>

      {/* Seller Banner */}
      {isSeller && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">You are viewing your own listing</span>
          </div>
          {!isSold && !isRemoved && (
            <DeleteListingButton listingId={listing.id} />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Photos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
            {mainPhoto ? (
              <Image src={mainPhoto} alt={listing.title} fill className="object-contain bg-black/40" sizes="(max-width: 1024px) 100vw, 66vw" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <svg className="w-20 h-20 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            
            {isSold && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-red-500/90 text-white px-8 py-3 rounded-xl font-bold text-2xl tracking-wider uppercase border border-red-400/50 transform -rotate-12">
                  Sold
                </div>
              </div>
            )}

            {isRemoved && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-slate-500/90 text-white px-8 py-3 rounded-xl font-bold text-2xl tracking-wider uppercase border border-slate-400/50 transform -rotate-12">
                  Removed
                </div>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {listing.photos && listing.photos.length > 1 && (
            <div className="grid grid-cols-5 gap-4">
              {listing.photos.map((photo: string, idx: number) => (
                <div key={idx} className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 ${idx === 0 ? 'border-emerald-500' : 'border-transparent hover:border-slate-500'}`}>
                  <Image src={photo} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" sizes="20vw" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Details */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border border-white/10 ${categoryColor}`}>
                {listing.category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-white/5">
                {listing.product_age}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{listing.title}</h1>
            <div className="text-sm text-slate-400 mb-6">Listed {timeAgo(listing.created_at)}</div>

            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 mb-6">
              {formatPrice(listing.asking_price)}
            </div>

            {/* Buyer Actions */}
            {!isSeller && !isSold && !isRemoved && currentUserId && (
              <BidModalController listing={{ id: listing.id, title: listing.title, asking_price: listing.asking_price }} />
            )}
            
            {!currentUserId && authChecked && !isSold && !isRemoved && (
              <Link href="/login" className="btn-primary w-full block text-center">
                Log in to Bid
              </Link>
            )}

            {isSold && (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 mt-4 text-center">
                <p className="text-slate-300">This item has been sold to <span className="font-semibold text-white">{listing.winner?.name || 'a buyer'}</span></p>
                {(isBuyer || isSeller) && (
                  <div className="mt-4 flex gap-3 justify-center">
                    <Link href={`/chat/${listing.id}/${isSeller ? listing.selected_bidder_id : listing.seller_id}`} className="btn-secondary text-sm">
                      Open Chat
                    </Link>
                    <button type="button" onClick={() => setIsRatingOpen(true)} className="btn-secondary text-sm">
                      {isSeller ? 'Rate Buyer' : 'Rate Seller'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seller Card — hide when viewing own listing */}
          {!isSeller && (
            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">About the Seller</h3>
              <Link href={`/profile/${listing.seller.id}`} className="flex items-center gap-4 group">
                <div className="relative w-14 h-14 rounded-full overflow-hidden bg-slate-700 ring-2 ring-transparent group-hover:ring-emerald-500 transition-all">
                  {listing.seller.profile_photo_url ? (
                    <Image src={listing.seller.profile_photo_url} alt={listing.seller.name} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white bg-teal-600">
                      {listing.seller.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-lg text-white group-hover:text-emerald-400 transition-colors">
                    {listing.seller.name}
                  </div>
                  <div className="flex items-center gap-3 text-sm mt-1">
                    {listing.seller.rating_avg > 0 ? (
                      <div className="flex items-center gap-1 text-amber-400">
                        ★ {listing.seller.rating_avg.toFixed(1)}
                      </div>
                    ) : (
                      <div className="text-slate-500">No ratings</div>
                    )}
                    <span className="text-slate-600">•</span>
                    <div className="text-slate-400">{listing.seller.total_items_sold || 0} items sold</div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Description</h3>
              <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                {listing.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Seller Bid Dashboard */}
      {isSeller && !isRemoved && (
        <div className="mt-10">
          <BidDashboard listingId={listing.id} askingPrice={listing.asking_price} />
        </div>
      )}
      {isSold && (isBuyer || isSeller) && listing.selected_bidder_id && (
        <RatingModal
          isOpen={isRatingOpen}
          onClose={() => setIsRatingOpen(false)}
          listingId={listing.id}
          ratedUserId={isSeller ? listing.selected_bidder_id : listing.seller_id}
          ratedUserName={isSeller ? listing.winner?.name || 'the buyer' : listing.seller.name}
        />
      )}
    </div>
  );
}
