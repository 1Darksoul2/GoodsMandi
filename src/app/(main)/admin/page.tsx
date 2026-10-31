'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';

type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  category: string;
  description: string;
  status: 'pending' | 'confirmed' | 'dismissed';
  created_at: string;
  reporter: { name: string };
  reported: { name: string; warning_count: number };
};

export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'dismissed'>('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          reporter_id,
          reported_user_id,
          category,
          description,
          status,
          created_at,
          reporter:profiles!reporter_id(name),
          reported:profiles!reported_user_id(name, warning_count)
        `)
        .order('created_at', { ascending: false })
        .overrideTypes<Report[], { merge: false }>();

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // UX check only: report access is enforced by RLS (public.is_admin()).
    async function checkAdminAndFetch() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (!profile?.is_admin) {
          router.push('/listings');
          return;
        }

        await fetchReports();
      } catch (err) {
        console.error('Error in admin init:', getErrorMessage(err));
        router.push('/');
      }
    }

    checkAdminAndFetch();
  }, [router, supabase, fetchReports]);

  const handleAction = async (reportId: string, action: 'confirmed' | 'dismissed') => {
    setProcessingId(reportId);
    try {
      // Confirming a report adds a warning (and bans at 3) in the database trigger
      // handle_report_confirmation, so no separate call is needed here.
      const { data: updated, error: updateError } = await supabase
        .from('reports')
        .update({ status: action })
        .eq('id', reportId)
        .select('id');

      if (updateError) throw updateError;
      if (!updated || updated.length === 0) throw new Error('You are not allowed to update this report.');

      // Reload so warning counts reflect the database
      await fetchReports();
    } catch (err) {
      console.error(`Error processing action ${action}:`, err);
      alert(getErrorMessage(err, 'Failed to process action. Please try again.'));
    } finally {
      setProcessingId(null);
    }
  };

  const filteredReports = reports.filter(r => r.status === activeTab);
  
  const stats = {
    pending: reports.filter(r => r.status === 'pending').length,
    confirmed: reports.filter(r => r.status === 'confirmed').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length,
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-slate-100">Admin Dashboard</h1>
        <div className="glass-card skeleton h-32 w-full rounded-2xl mb-8"></div>
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="glass-card skeleton h-24 w-full rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Admin Control Panel
          </h1>
          <p className="text-slate-400 mt-1">Manage community reports and moderation</p>
        </div>
        
        <div className="flex gap-4">
          <div className="glass-card px-4 py-2 rounded-xl text-center">
            <div className="text-xl font-bold text-amber-400">{stats.pending}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Pending</div>
          </div>
          <div className="glass-card px-4 py-2 rounded-xl text-center">
            <div className="text-xl font-bold text-red-400">{stats.confirmed}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Confirmed</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 p-1 bg-slate-800/50 rounded-xl inline-flex">
        {(['pending', 'confirmed', 'dismissed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className={`ml-2 text-xs py-0.5 px-2 rounded-full ${
              activeTab === tab ? 'bg-slate-600 text-slate-200' : 'bg-slate-800 text-slate-500'
            }`}>
              {stats[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl">
            <svg className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No {activeTab} reports</h3>
            <p className="text-slate-500">You&apos;re all caught up!</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="glass-card rounded-xl p-6 border-l-4 border-l-transparent hover:border-l-brand-500 transition-all duration-200">
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Info Column */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="badge-danger font-medium">{report.category}</span>
                    <span className="text-sm text-slate-400">{timeAgo(report.created_at)}</span>
                  </div>
                  
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                    <p className="text-slate-300 whitespace-pre-wrap">{report.description}</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Reporter:</span>
                      <span className="font-medium text-slate-300">{report.reporter?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Reported User:</span>
                      <Link href={`/profile/${report.reported_user_id}`} className="font-medium text-brand-400 hover:underline flex items-center gap-1">
                        {report.reported?.name || 'Unknown'}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </Link>
                      {report.reported && (
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                          report.reported.warning_count >= 2 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          Warnings: {report.reported.warning_count}/3
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Column */}
                {activeTab === 'pending' && (
                  <div className="lg:w-48 flex lg:flex-col gap-3 justify-center lg:justify-start lg:border-l lg:border-slate-700/50 lg:pl-6">
                    <button 
                      onClick={() => handleAction(report.id, 'confirmed')}
                      disabled={!!processingId}
                      className="btn-danger w-full flex justify-center items-center gap-2"
                    >
                      {processingId === report.id ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Confirm & Warn
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => handleAction(report.id, 'dismissed')}
                      disabled={!!processingId}
                      className="btn-ghost w-full hover:bg-slate-700 hover:text-white"
                    >
                      Dismiss Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
