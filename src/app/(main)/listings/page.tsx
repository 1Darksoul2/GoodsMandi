import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ListingsGrid from '@/components/listings/ListingsGrid';

export const metadata = {
  title: 'Browse Listings | GoodsMandi',
  description: 'Find great deals on campus',
};

export default async function ListingsPage() {
  const supabase = await createClient();
  
  const { data: listings, error } = await supabase
    .from('listings')
    .select(`
      *,
      seller:profiles!seller_id(id, name, profile_photo_url, rating_avg)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching listings:', error.message, error.code, error.details, error.hint);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Campus Marketplace</h1>
          <p className="text-slate-400">Discover and buy items from your peers.</p>
        </div>
        <Link href="/listings/create" className="btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Sell Item
        </Link>
      </div>
      
      <ListingsGrid initialListings={listings || []} fetchError={error ? error.message : null} />
    </div>
  );
}
