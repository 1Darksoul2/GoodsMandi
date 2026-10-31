'use client';

import { useState } from 'react';
import ListingCard from './ListingCard';
import { LISTING_CATEGORIES } from '@/lib/constants';

type Profile = {
  id: string;
  name: string;
  profile_photo_url: string;
  rating_avg: number;
};

type Listing = {
  id: string;
  title: string;
  description: string;
  asking_price: number;
  category: string;
  product_age: string;
  photos: string[];
  status: string;
  created_at: string;
  seller_id: string;
  seller: Profile;
};

interface ListingsGridProps {
  initialListings: Listing[];
  fetchError?: string | null;
}

export default function ListingsGrid({ initialListings, fetchError }: ListingsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');

  const filteredListings = initialListings.filter((listing) => {
    const matchesSearch =
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || listing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === 'price_low') {
      return a.asking_price - b.asking_price;
    } else {
      return b.asking_price - a.asking_price;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-white/10 backdrop-blur">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search listings..."
            className="input-field w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex-1 overflow-x-auto no-scrollbar w-full flex gap-2 pb-2 md:pb-0">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
              selectedCategory === 'All'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {LISTING_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="w-full md:w-auto">
          <select
            className="input-field w-full md:w-auto bg-slate-900 text-slate-200 border-white/10 appearance-none"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="newest" className="bg-slate-900 text-slate-200">Newest First</option>
            <option value="price_low" className="bg-slate-900 text-slate-200">Price: Low to High</option>
            <option value="price_high" className="bg-slate-900 text-slate-200">Price: High to Low</option>
          </select>
        </div>
      </div>

      <div className="text-slate-400 text-sm">
        Showing {sortedListings.length} {sortedListings.length === 1 ? 'listing' : 'listings'}
      </div>

      {fetchError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-24 h-24 text-red-500/50 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-xl font-medium text-white mb-2">Something went wrong</h3>
          <p className="text-slate-400 max-w-sm mb-4">
            We couldn&apos;t load listings right now. Please try refreshing the page.
          </p>
          <p className="text-xs text-slate-600">{fetchError}</p>
        </div>
      ) : sortedListings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-24 h-24 text-slate-700 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-xl font-medium text-white mb-2">No listings found</h3>
          <p className="text-slate-400 max-w-sm">
            Try adjusting your search query or filters to find what you&apos;re looking for.
          </p>
        </div>
      )}
    </div>
  );
}
