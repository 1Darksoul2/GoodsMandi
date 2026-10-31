import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { CATEGORY_COLORS } from '@/lib/constants';
import ListingDetailClient, { type ListingDetail } from './ListingDetailClient';

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Try to get current user (may be null if session isn't available server-side)
  const { data: userData } = await supabase.auth.getUser();
  const serverUserId = userData?.user?.id || null;

  // Fetch listing with seller and winner profiles
  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      seller:profiles!seller_id(id, name, profile_photo_url, rating_avg, total_items_sold),
      winner:profiles!selected_bidder_id(id, name)
    `)
    .eq('id', id)
    .single<ListingDetail>();

  if (error || !listing) {
    notFound();
  }

  const categoryColor = CATEGORY_COLORS[listing.category as keyof typeof CATEGORY_COLORS] || 'bg-slate-500/20 text-slate-300';

  return (
    <ListingDetailClient
      listing={listing}
      categoryColor={categoryColor}
      serverUserId={serverUserId}
    />
  );
}
