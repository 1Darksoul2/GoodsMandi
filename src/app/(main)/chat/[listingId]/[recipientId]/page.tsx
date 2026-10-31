'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';
import ReportModal from '@/components/reports/ReportModal';
import { getErrorMessage } from '@/lib/errors';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Message = {
  id: string;
  message_text: string;
  sender_id: string;
  recipient_id?: string;
  created_at: string;
};

export default function ChatThreadPage() {
  const params = useParams();
  const listingId = params.listingId as string;
  const recipientId = params.recipientId as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [recipientName, setRecipientName] = useState('User');
  const [listingTitle, setListingTitle] = useState('Listing');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [supabase] = useState(() => createClient());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let subscription: RealtimeChannel | undefined;

    async function fetchInitialData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        // Fetch header info
        const [recipientRes, listingRes] = await Promise.all([
          supabase.from('profiles').select('name').eq('id', recipientId).single(),
          supabase.from('listings').select('title').eq('id', listingId).single()
        ]);
        
        if (recipientRes.data) setRecipientName(recipientRes.data.name);
        if (listingRes.data) setListingTitle(listingRes.data.title);

        // Fetch messages
        const { data: msgs, error } = await supabase
          .from('chat_messages')
          .select('id, message_text, sender_id, recipient_id, created_at')
          .eq('listing_id', listingId)
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(msgs || []);
        
        // Subscribe to real-time changes
        subscription = supabase
          .channel('public:chat_messages')
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'chat_messages',
            filter: `listing_id=eq.${listingId}`
          }, payload => {
            const newMsg = payload.new as Message;
            if (
              (newMsg.sender_id === user.id && newMsg.recipient_id === recipientId) ||
              (newMsg.sender_id === recipientId && newMsg.recipient_id === user.id)
            ) {
              // Skip duplicates (the realtime event can arrive after a refetch)
              setMessages(prev => (prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]));
            }
          })
          .subscribe();

      } catch (err) {
        console.error('Error fetching chat thread:', getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [listingId, recipientId, supabase]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId) return;
    
    const text = newMessage;
    setNewMessage('');
    setSendError(null);
    setSending(true);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          listing_id: listingId,
          sender_id: currentUserId,
          recipient_id: recipientId,
          message_text: text.trim()
        });
        
      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', getErrorMessage(err));
      // Give the text back so the user can retry, and say why it failed.
      setNewMessage(text);
      setSendError(
        getErrorMessage(err).includes('row-level security')
          ? 'You can only message the seller or bidders of this listing.'
          : getErrorMessage(err, 'Message not sent. Please try again.')
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl h-[calc(100vh-100px)] flex flex-col">
        <div className="glass-card skeleton h-20 w-full rounded-t-2xl"></div>
        <div className="glass-card flex-1 w-full rounded-b-2xl mt-1 skeleton"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="glass-card rounded-t-2xl p-4 flex items-center justify-between border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md z-10">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center">
            {recipientName}
          </h2>
          <Link href={`/listings/${listingId}`} className="text-sm text-brand-500 hover:text-brand-400 transition-colors flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            {listingTitle}
          </Link>
        </div>
        <button 
          onClick={() => setIsReportModalOpen(true)}
          className="btn-ghost text-slate-400 hover:text-red-400 text-sm py-1.5 px-3 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
          Report
        </button>
      </div>

      {/* Messages */}
      <div className="glass-card flex-1 overflow-y-auto p-4 space-y-4 rounded-none bg-slate-900/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <p>No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMe 
                      ? 'bg-brand-500/20 text-brand-100 border border-brand-500/30 rounded-br-sm' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm md:text-base">{msg.message_text}</p>
                  <div className={`text-[10px] mt-1 ${isMe ? 'text-brand-500/60 text-right' : 'text-slate-500 text-left'}`}>
                    {timeAgo(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass-card rounded-b-2xl p-4 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-md">
        {sendError && (
          <p role="alert" className="text-sm text-red-400 mb-2">{sendError}</p>
        )}
        <form onSubmit={handleSend} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="input-field flex-1"
            disabled={sending}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || sending}
            className="btn-primary px-6 rounded-xl flex items-center justify-center min-w-[100px]"
          >
            {sending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            )}
          </button>
        </form>
      </div>

      <ReportModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportedUserId={recipientId}
        reportedListingId={listingId}
      />
    </div>
  );
}
