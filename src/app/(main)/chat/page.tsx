'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';

type ParticipantRow = { id: string; name: string; profile_photo_url: string | null };
type MessageRow = {
  id: string;
  listing_id: string;
  sender_id: string;
  recipient_id: string;
  message_text: string;
  created_at: string;
  listing: { title: string } | null;
  sender: ParticipantRow | null;
  recipient: ParticipantRow | null;
};

type Conversation = {
  listing_id: string;
  other_user_id: string;
  listing_title: string;
  other_user_name: string;
  other_user_photo?: string | null;
  last_message: string;
  last_message_time: string;
};

export default function ChatListPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    async function fetchConversations() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch all messages involving the current user
        const { data: messages, error } = await supabase
          .from('chat_messages')
          .select(`
            id,
            listing_id,
            sender_id,
            recipient_id,
            message_text,
            created_at,
            listing:listings ( title ),
            sender:profiles!sender_id ( id, name, profile_photo_url ),
            recipient:profiles!recipient_id ( id, name, profile_photo_url )
          `)
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .overrideTypes<MessageRow[], { merge: false }>();

        if (error) {
          console.error('Error fetching conversations:', error.message, error.code, error.details, error.hint);
          setFetchError(error.message);
          return;
        }

        // Group by conversation (listing_id + other_user_id)
        const convMap = new Map<string, Conversation>();

        messages?.forEach((msg) => {
          const isSender = msg.sender_id === user.id;
          const otherUser = isSender ? msg.recipient : msg.sender;
          
          if (!otherUser) return;
          
          const key = `${msg.listing_id}_${otherUser.id}`;
          
          if (!convMap.has(key)) {
            convMap.set(key, {
              listing_id: msg.listing_id,
              other_user_id: otherUser.id,
              listing_title: msg.listing?.title || 'Unknown Listing',
              other_user_name: otherUser.name || 'Unknown User',
              other_user_photo: otherUser.profile_photo_url,
              last_message: msg.message_text,
              last_message_time: msg.created_at
            });
          }
        });

        setConversations(Array.from(convMap.values()));
      } catch (err) {
        console.error('Error fetching conversations:', getErrorMessage(err));
        setFetchError(getErrorMessage(err, 'An unexpected error occurred'));
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, [supabase]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-slate-100">Your Conversations</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card skeleton h-24 w-full rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-slate-100">Your Conversations</h1>
      
      {fetchError ? (
        <div className="glass-card p-12 text-center rounded-2xl flex flex-col items-center">
          <svg className="w-16 h-16 text-red-500/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-xl font-semibold text-slate-200 mb-2">Failed to load conversations</h2>
          <p className="text-slate-400 mb-4">Please try refreshing the page.</p>
          <p className="text-xs text-slate-600">{fetchError}</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl flex flex-col items-center">
          <svg className="w-16 h-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h2 className="text-xl font-semibold text-slate-200 mb-2">No conversations yet</h2>
          <p className="text-slate-400 mb-6">Start browsing listings and message sellers to begin.</p>
          <Link href="/listings" className="btn-primary">Browse Listings</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conv) => (
            <Link 
              key={`${conv.listing_id}_${conv.other_user_id}`} 
              href={`/chat/${conv.listing_id}/${conv.other_user_id}`}
              className="block glass-card glass-card-hover rounded-xl p-4 transition-all duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="relative w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-700">
                  {conv.other_user_photo ? (
                    <Image src={conv.other_user_photo} alt={conv.other_user_name} fill className="object-cover" sizes="48px" />
                  ) : (
                    <span className="text-xl font-medium text-slate-300">{conv.other_user_name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-lg font-semibold text-slate-200 truncate">{conv.other_user_name}</h3>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{timeAgo(conv.last_message_time)}</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-400">
                    <span className="truncate max-w-[50%] badge-neutral mr-2 py-0.5">{conv.listing_title}</span>
                    <span className="truncate text-slate-300">{conv.last_message}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
