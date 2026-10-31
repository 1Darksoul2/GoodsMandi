import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';

export default async function OtherUserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) {
    notFound();
  }

  const { data: activeListings } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Profile Header */}
      <div className="glass-card rounded-2xl p-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="relative w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center z-10 shadow-xl">
          {profile.profile_photo_url ? (
            <Image src={profile.profile_photo_url} alt={profile.name} fill className="object-cover" sizes="128px" />
          ) : (
            <span className="text-4xl font-bold text-slate-300">{profile.name?.charAt(0) || 'U'}</span>
          )}
        </div>

        <div className="flex-1 text-center md:text-left z-10">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4 justify-center md:justify-start">
            <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
            {profile.verified && (
              <span className="badge-success inline-flex items-center text-xs px-2 py-1 gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Verified
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
            {profile.year_of_study && profile.branch_course && (
              <div className="bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700 text-sm text-slate-300 flex items-center">
                <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-9 5m9-5l9 5" /></svg>
                Year {profile.year_of_study} • {profile.branch_course}
              </div>
            )}
            
            <div className="flex items-center gap-1 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              <span className="font-semibold text-slate-200">{profile.rating_avg ? profile.rating_avg.toFixed(1) : 'No rating'}</span>
            </div>
          </div>

          <div className="flex justify-center md:justify-start gap-4">
            <div className="text-center bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800">
              <div className="text-2xl font-bold text-white">{profile.total_items_sold || 0}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Items Sold</div>
            </div>
            <div className="text-center bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800">
              <div className="text-2xl font-bold text-brand-400">{activeListings?.length || 0}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Listings</div>
            </div>
          </div>
        </div>

        <div className="md:ml-auto z-10 flex flex-col items-center md:items-end gap-3">
          {profile.warning_count === 0 && (
            <div className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              No reports on record
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          {profile.name}&apos;s Active Listings
        </h2>
        
        {activeListings && activeListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeListings.map(listing => (
              <Link key={listing.id} href={`/listings/${listing.id}`} className="block glass-card glass-card-hover rounded-xl overflow-hidden transition-all group flex flex-col h-full">
                {listing.photos && listing.photos.length > 0 ? (
                  <div className="h-40 overflow-hidden relative">
                    <Image src={listing.photos[0]} alt={listing.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="(max-width: 768px) 100vw, 33vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60"></div>
                  </div>
                ) : (
                  <div className="h-40 bg-slate-800 flex items-center justify-center relative">
                    <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-slate-100 mb-1 line-clamp-1">{listing.title}</h3>
                  <div className="text-xl font-bold text-brand-400 mb-2">{formatPrice(listing.asking_price)}</div>
                  <div className="text-xs text-slate-400 mt-auto flex items-center">
                    <span className="badge-neutral py-0.5 px-2">{listing.category}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-card p-12 text-center rounded-2xl text-slate-400">
            This user doesn&apos;t have any active listings.
          </div>
        )}
      </div>
    </div>
  );
}
