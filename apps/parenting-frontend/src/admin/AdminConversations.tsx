import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api.js';
import { useAuth } from '../state/auth.js';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';

interface Conversation {
  id: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
  };
  messageCount: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  citations?: { title?: string; source?: string }[];
}

interface ConversationDetail {
  id: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
  };
  messages: Message[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const AdminConversations = () => {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [filterEmail, setFilterEmail] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const loadConversations = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; email?: string; dateFrom?: string; dateTo?: string } = {
        page,
        limit: 20,
      };
      if (filterEmail) params.email = filterEmail;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;

      const res = await api.get('/api/admin/conversations', {
        params,
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      setConversations(res.data.conversations || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (error) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [token, filterEmail, filterDateFrom, filterDateTo]);

  const loadConversationMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/api/admin/conversations/${conversationId}/messages`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      // The API returns { conversation: {...}, messages: [...] }
      setSelectedConversation({
        ...res.data.conversation,
        messages: res.data.messages || [],
      });
    } catch (error) {
      toast.error('Failed to load conversation messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadConversations(1);
    }
  }, [token, loadConversations]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-brand-blue/40 bg-brand-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-blue">
              Conversation Logs
            </div>
            <h1 className="text-3xl font-black tracking-tight text-text-primary mb-2">Conversations</h1>
            <p className="text-text-secondary font-medium">View and monitor all conversations in the system</p>
          </div>
          <button
            onClick={() => loadConversations(1)}
            className="btn-duo-blue-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-surface rounded-3xl shadow-sm border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Filters</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Filter by Email</label>
              <input
                type="text"
                placeholder="user@example.com"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                className="w-full px-4 py-2 border border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">From Date</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">To Date</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          {(filterEmail || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => {
                setFilterEmail('');
                setFilterDateFrom('');
                setFilterDateTo('');
                // Filters will trigger useEffect to reload
              }}
              className="mt-4 px-4 py-2 text-sm text-text-secondary hover:text-text-primary font-medium transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Conversations Table */}
        <div className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-text-tertiary">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg font-medium">No conversations found</p>
              {filterEmail || filterDateFrom || filterDateTo ? (
                <p className="text-sm mt-2">Try adjusting your filters</p>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-light border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Messages</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {conversations.map((conversation) => (
                    <tr key={conversation.id} className="hover:bg-surface-light transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-text-primary">{conversation.user?.email || 'Unknown User'}</div>
                        <div className="text-xs text-text-secondary mt-1">ID: {conversation.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-50 text-brand-blue rounded-lg text-sm font-medium">
                          {conversation.messageCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {formatDate(conversation.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => loadConversationMessages(conversation.id)}
                          className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-brand-blue rounded-lg text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && conversations.length > 0 && (
            <div className="mt-6 flex items-center justify-between px-6 py-4 border-t border-border">
              <div className="text-sm text-text-secondary">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} conversations
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadConversations(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface border border-border-dark rounded-xl hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => loadConversations(pageNum)}
                        className={`
                          px-3 py-2 text-sm font-medium rounded-xl transition-colors
                          ${pagination.page === pageNum
                            ? 'bg-brand-blue text-white'
                            : 'text-text-secondary bg-surface border border-border-dark hover:bg-surface-light'
                          }
                        `}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => loadConversations(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface border border-border-dark rounded-xl hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversation Detail Drawer */}
      <AnimatePresence>
        {selectedConversation && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedConversation(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-surface shadow-2xl z-[60] overflow-hidden flex flex-col border-l border-border"
            >
              {/* Header */}
              <div className="p-8 border-b border-border flex justify-between items-center bg-surface-light/50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white shadow-lg">
                      <Icon name={uiIcons.messageCircle} className="h-4 w-4" alt="" />
                    </div>
                    <h2 className="text-2xl font-black text-text-primary tracking-tight">Conversation Log</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="flex items-center gap-1.5 text-[10px] text-text-secondary font-bold uppercase tracking-widest">
                      <Icon name={uiIcons.user} className="h-3 w-3" alt="" /> {selectedConversation.user?.email || 'Unknown User'}
                    </p>
                    <p className="flex items-center gap-1.5 text-[10px] text-text-secondary font-bold uppercase tracking-widest">
                      <Icon name={uiIcons.calendar} className="h-3 w-3" alt="" /> {formatDate(selectedConversation.createdAt)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedConversation(null)}
                  className="w-10 h-10 flex items-center justify-center bg-surface hover:bg-surface-light rounded-full transition border border-border text-text-secondary shadow-sm"
                >
                  <Icon name={uiIcons.close} className="h-6 w-6" alt="" />
                </button>
              </div>

              {/* Messages Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-surface">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Rewinding conversation...</p>
                  </div>
                ) : selectedConversation.messages.length === 0 ? (
                  <div className="text-center py-24 opacity-50">
                    <Icon name={uiIcons.messageCircle} className="mx-auto mb-4 h-16 w-16 opacity-40" alt="" />
                    <p className="text-text-secondary font-medium">No messages found in this history</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1.5 px-2">
                          <span className={clsx(
                            "text-[10px] font-black uppercase tracking-widest",
                            message.role === 'user' ? "text-brand-blue" : "text-success"
                          )}>
                            {message.role === 'user' ? 'Parent' : 'AI Guide'}
                          </span>
                          <span className="text-[10px] text-text-dimmed font-bold">{formatDate(message.createdAt)}</span>
                        </div>
                        
                        <div
                          className={clsx(
                            "max-w-[90%] rounded-[24px] p-5 shadow-sm border",
                            message.role === 'user'
                              ? "bg-brand-blue text-white border-brand-blue rounded-tr-none"
                              : "bg-surface-light text-text-primary border-border rounded-tl-none"
                          )}
                        >
                          <div className={clsx(
                            "prose prose-sm max-w-none",
                            message.role === 'user' 
                              ? "text-white prose-headings:text-white prose-strong:text-white prose-p:text-white prose-li:text-white"
                              : "text-text-secondary prose-headings:text-text-primary prose-strong:text-text-primary"
                          )}>
                            <ReactMarkdown
                              components={{
                                ul: ({...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                                ol: ({...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                                p: ({...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                strong: ({...props}) => <strong className={clsx('font-bold underline', message.role === 'user' ? 'decoration-white/40' : 'decoration-brand-blue/30')} {...props} />,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                          
                          {message.citations && message.citations.length > 0 && (
                            <div className={clsx(
                              "mt-4 pt-4 border-t",
                              message.role === 'user' ? "border-brand-blue/50" : "border-border"
                            )}>
                              <p className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-60">Verified Citations</p>
                              <div className="space-y-1.5">
                                {message.citations.map((citation: { title?: string; source?: string }, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 text-[10px] font-bold opacity-80 hover:opacity-100 transition-opacity">
                                    <Icon name={uiIcons.arrowRight} className="h-3 w-3" alt="" /> {citation.title || citation.source || 'Medical Source'}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-8 border-t border-border bg-surface-light/50 flex justify-between items-center">
                <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">End of History</p>
                <button 
                  onClick={() => setSelectedConversation(null)}
                  className="btn-duo-surface-pill !rounded-xl !px-6 !py-2.5"
                >
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
