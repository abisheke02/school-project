import React, { useEffect, useState, useRef } from 'react';
import Layout from '../../components/Layout';
import { messagesAPI } from '../../services/api';
import useAuthStore from '../../services/authStore';
import toast from 'react-hot-toast';

const timeLabel = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const MessagingPage = () => {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    messagesAPI.getConversations()
      .then(({ conversations: c }) => setConversations(c || []))
      .catch(() => toast.error('Could not load conversations'))
      .finally(() => setLoadingConvos(false));
  }, []);

  const loadThread = async (partnerId) => {
    setLoadingThread(true);
    try {
      const { messages } = await messagesAPI.getThread(partnerId);
      setThread(messages || []);
    } catch {
      toast.error('Could not load messages');
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    if (!activePartnerId) return;
    loadThread(activePartnerId);

    // Poll every 5s for new messages
    pollRef.current = setInterval(() => loadThread(activePartnerId), 5000);
    return () => clearInterval(pollRef.current);
  }, [activePartnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const selectConversation = (partnerId) => {
    setActivePartnerId(partnerId);
    // Mark as read locally
    setConversations((prev) =>
      prev.map((c) => c.partner_id === partnerId ? { ...c, unread_count: 0 } : c)
    );
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || !activePartnerId) return;
    setSending(true);
    const text = draft.trim();
    setDraft('');

    // Optimistic update
    const optimistic = {
      id: `tmp-${Date.now()}`,
      sender_id: user?.id,
      sender_name: user?.name,
      body: text,
      sent_at: new Date().toISOString(),
      read_at: null,
    };
    setThread((prev) => [...prev, optimistic]);

    try {
      await messagesAPI.send(activePartnerId, text);
      // Refresh to get server ID
      await loadThread(activePartnerId);
      setConversations((prev) =>
        prev.map((c) =>
          c.partner_id === activePartnerId
            ? { ...c, last_message: text, last_sent_at: new Date().toISOString() }
            : c
        )
      );
    } catch {
      toast.error('Message failed to send');
      setThread((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const activeConvo = conversations.find((c) => c.partner_id === activePartnerId);

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)]">

        {/* Sidebar: conversation list */}
        <div className="w-80 border-r border-slate-100 bg-white flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-lg font-extrabold text-slate-800">Messages</h2>
            <p className="text-xs text-slate-400 mt-0.5">Teacher ↔ Parent communication</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvos ? (
              <div className="text-slate-400 text-center py-8 text-sm">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="text-slate-400 text-center py-12 px-4 text-sm">
                No conversations yet. Parents will appear here once students are enrolled.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.partner_id}
                  onClick={() => selectConversation(c.partner_id)}
                  className={`w-full text-left px-5 py-4 border-b border-slate-50 hover:bg-blue-50/40 transition
                    ${activePartnerId === c.partner_id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold text-sm
                        flex-shrink-0 flex items-center justify-center">
                        {(c.partner_name || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{c.partner_name}</p>
                        <p className="text-xs text-slate-400 truncate">{c.last_message || 'Start a conversation'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 gap-1">
                      <span className="text-xs text-slate-400">{timeLabel(c.last_sent_at)}</span>
                      {c.unread_count > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread panel */}
        {activePartnerId ? (
          <div className="flex-1 flex flex-col bg-slate-50">
            {/* Thread header */}
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold text-sm
                flex items-center justify-center">
                {(activeConvo?.partner_name || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-800">{activeConvo?.partner_name || 'Contact'}</p>
                <p className="text-xs text-slate-400">Tap to view profile</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingThread ? (
                <div className="text-slate-400 text-center py-8">Loading messages…</div>
              ) : thread.length === 0 ? (
                <div className="text-slate-400 text-center py-16">
                  <p className="text-3xl mb-3">💬</p>
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              ) : (
                thread.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                          ${isMine
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm shadow-sm'}`}
                      >
                        <p>{msg.body}</p>
                        <p className={`text-xs mt-1 ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                          {timeLabel(msg.sent_at)}
                          {isMine && msg.read_at && ' · Read'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Compose */}
            <form onSubmit={handleSend} className="bg-white border-t border-slate-100 px-5 py-4 flex gap-3">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5
                  rounded-xl transition disabled:bg-blue-200"
              >
                {sending ? '…' : 'Send'}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center text-slate-400">
              <p className="text-5xl mb-4">💬</p>
              <p className="font-semibold text-slate-500">Select a conversation</p>
              <p className="text-sm mt-1">Messages between teachers and parents appear here</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MessagingPage;
