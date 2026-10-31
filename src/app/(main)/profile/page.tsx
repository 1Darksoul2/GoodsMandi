import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default async function OwnProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return <div>Profile not found</div>;
  }

  const { data: activeListings } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', user.id)
    .eq('status', 'active');

  const { data: userBids } = await supabase
    .from('bids')
    .select('*, listing:listings(title, status)')
    .eq('bidder_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Profile Header */}
      <div className="glass-card rounded-2xl p-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="relative w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center z-10 shadow-xl">
          {profile.profile_photo_url ? (
            <Image src={profile.profile_photo_url} alt={profile.name} fill className="object-cover" sizes="128px" />
          ) : (
            <span className="text-4xl font-bold text-slate-300">{profile.name?.charAt(0) || 'U'}</span>
          )}
        </div>

        <div className="flex-1 text-center md:text-left z-10">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
            <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
            {profile.verified && (
              <span className="badge-success inline-flex items-center text-xs px-2 py-1 gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Verified Student
              </span>
            )}
          </div>
          
          <div className="text-slate-400 mb-4 font-medium flex items-center justify-center md:justify-start gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            {user.email}
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
          <button className="btn-secondary whitespace-nowrap flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Edit Profile
          </button>
          
          {profile.warning_count === 0 ? (
            <div className="text-xs text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              No reports on record
            </div>
          ) : (
            <div className="text-xs text-amber-400 flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              Warning count: {profile.warning_count}/3
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Listings Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              My Active Listings
            </h2>
            <Link href="/listings/my" className="text-sm text-brand-400 hover:text-brand-300">View all</Link>
          </div>
          
          {activeListings && activeListings.length > 0 ? (
            <div className="space-y-3">
              {activeListings.slice(0, 3).map(listing => (
                <Link key={listing.id} href={`/listings/${listing.id}`} className="block glass-card glass-card-hover rounded-xl p-4 transition-all">
                  <div className="font-semibold text-slate-200 mb-1">{listing.title}</div>
                  <div className="text-sm text-brand-400 font-medium">₹{listing.asking_price}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass-card p-6 text-center rounded-xl text-slate-400">
              No active listings right now.
            </div>
          )}
        </div>

        {/* My Bids Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            My Bids
          </h2>
          
          {userBids && userBids.length > 0 ? (
            <div className="space-y-3">
              {userBids.slice(0, 5).map(bid => (
                <div key={bid.id} className="glass-card rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-slate-200 mb-1">{bid.listing?.title || 'Unknown Listing'}</div>
                    <div className="text-sm font-semibold text-slate-300">Bid: ₹{bid.bid_amount}</div>
                  </div>
                  <div>
                    {bid.status === 'accepted' && <span className="badge-success">Accepted</span>}
                    {bid.status === 'rejected' && <span className="badge-danger">Rejected</span>}
                    {bid.status === 'pending' && <span className="badge-warning">Pending</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card p-6 text-center rounded-xl text-slate-400">
              You haven&apos;t placed any bids yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
