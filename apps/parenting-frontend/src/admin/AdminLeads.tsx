import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { marketingApi, MarketingLead } from '../lib/marketingApi.js';
import { toast } from 'sonner';
import { clsx } from 'clsx';

export const AdminLeads = () => {
  const [leads, setLeads] = useState<MarketingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    fetchLeads();
  }, [page, resourceFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await marketingApi.getLeads({ 
        limit: LIMIT, 
        offset: page * LIMIT,
        resourceId: resourceFilter !== 'all' ? resourceFilter : undefined,
      });
      setLeads(res.leads);
      setTotal(res.total);
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this lead?')) return;
    try {
      await marketingApi.deleteLead(id);
      toast.success('Lead removed');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    
    const headers = ['Email', 'Resource', 'Status', 'Date', 'Source'];
    const rows = leads.map(l => [
      l.email,
      l.resourceId,
      l.status,
      new Date(l.createdAt).toLocaleDateString(),
      l.metadata?.source || 'unknown'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `raised-leads-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exporting leads...');
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => 
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
      lead.resourceId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [leads, searchQuery]);

  const uniqueResources = useMemo(() => {
    // Ideally this would come from the backend, but we can derive it from the current leads
    // and maybe some known constants.
    return ['newborn-essentials-guide'];
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-brand-blue/40 bg-brand-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-blue">
            Marketing Pipeline
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Growth Center</h1>
          <p className="text-text-secondary font-medium italic">Manage marketing leads and guide downloads</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={leads.length === 0}
          className="btn-duo-green-sm !px-5 disabled:opacity-50"
        >
          <Icon name={uiIcons.download} className="h-5 w-5" alt="" /> Export to CSV
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface p-6 rounded-[32px] border border-border shadow-sm">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Total Leads</p>
          <p className="text-3xl font-black text-text-primary">{total}</p>
        </div>
        <div className="bg-surface p-6 rounded-[32px] border border-border shadow-sm">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">New Today</p>
          <p className="text-3xl font-black text-brand-blue">
            {leads.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
        <div className="bg-surface p-6 rounded-[32px] border border-border shadow-sm">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Active Guides</p>
          <p className="text-3xl font-black text-success">{uniqueResources.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Icon name={uiIcons.search} className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" alt="" />
          <input 
            type="text" 
            placeholder="Search leads by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-surface-light border-none rounded-xl text-sm focus:ring-2 focus:ring-border-focus transition-all outline-none font-medium text-text-secondary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-light px-4 py-2.5 rounded-xl">
            <Icon name={uiIcons.filter} className="h-4 w-4 text-text-tertiary" alt="" />
            <select 
              value={resourceFilter}
              onChange={(e) => { setResourceFilter(e.target.value); setPage(0); }}
              className="bg-transparent border-none text-sm font-bold text-text-secondary focus:ring-0 outline-none cursor-pointer p-0"
            >
              <option value="all">All Resources</option>
              {uniqueResources.map(res => (
                <option key={res} value={res}>{res.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-surface rounded-[32px] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-light/50 border-b border-border">
                <th className="px-8 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Subscriber</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Resource</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-center">Fulfillment</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Captured At</th>
                <th className="px-8 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence mode='popLayout'>
                {filteredLeads.map((lead) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={lead.id} 
                    className="group hover:bg-surface-light transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0 border border-brand-blue/25 italic font-black text-xs">
                          {lead.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text-primary truncate">{lead.email}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary font-bold uppercase mt-0.5">
                            <Icon name={uiIcons.externalLink} className="h-3 w-3" alt="" /> {lead.metadata?.source || 'direct'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex px-3 py-1 bg-surface-light rounded-full text-[10px] font-black uppercase text-text-secondary border border-border">
                        {lead.resourceId.split('-').join(' ')}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex justify-center">
                        <span className={clsx(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border transition-all",
                          lead.status === 'delivered' ? "bg-success/10 text-success border-success/30" :
                          lead.status === 'error' ? "bg-error/10 text-error border-red-100" :
                          "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {lead.status === 'delivered' ? (
                            <Icon name={uiIcons.circleCheck} className="h-3 w-3" alt="" />
                          ) : lead.status === 'error' ? (
                            <Icon name={uiIcons.circleAlert} className="h-3 w-3" alt="" />
                          ) : (
                            <Icon name={uiIcons.clock} className="h-3 w-3" alt="" />
                          )}
                          {lead.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-text-secondary">{new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="text-[10px] font-medium text-text-tertiary">{new Date(lead.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="p-2.5 text-text-tertiary hover:text-error hover:bg-error/10 rounded-xl transition border border-transparent hover:border-red-100"
                        title="Remove Lead"
                      >
                        <Icon name={uiIcons.trash} className="h-5 w-5" alt="" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredLeads.length === 0 && !loading && (
            <div className="text-center py-24 bg-surface-light/50">
              <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-border shadow-sm text-text-dimmed">
                <Icon name={uiIcons.mail} className="h-10 w-10" alt="" />
              </div>
              <h3 className="text-xl font-bold text-text-primary">No leads found</h3>
              <p className="text-text-secondary font-medium mt-1">Try adjusting your search or filters</p>
            </div>
          )}

          {loading && (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-brand-blue/25 border-t-brand-blue rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Loading Leads...</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="px-8 py-5 bg-surface-light/50 border-t border-border flex items-center justify-between">
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
              Showing {page * LIMIT + 1}-{Math.min((page + 1) * LIMIT, total)} of {total} leads
            </p>
            <div className="flex items-center gap-3">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-xl bg-surface border border-border text-text-secondary disabled:opacity-30 hover:bg-surface-light transition shadow-sm"
              >
                <Icon name={uiIcons.chevronLeft} className="h-5 w-5" alt="" />
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.ceil(total / LIMIT) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={clsx(
                      "w-9 h-9 rounded-xl text-xs font-black transition-all",
                      page === i 
                        ? "bg-background text-white shadow-lg shadow-md" 
                        : "bg-surface text-text-secondary hover:bg-surface-light border border-border"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={(page + 1) * LIMIT >= total}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-xl bg-surface border border-border text-text-secondary disabled:opacity-30 hover:bg-surface-light transition shadow-sm"
              >
                <Icon name={uiIcons.chevronRight} className="h-5 w-5" alt="" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-brand-blue/10 p-6 rounded-[32px] border border-brand-blue/25 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-blue flex items-center justify-center text-white shrink-0 shadow-lg shadow-md">
           <Icon name={uiIcons.calendar} className="h-6 w-6" alt="" />
        </div>
        <div>
          <h4 className="font-bold text-brand-blue leading-tight">Growth Insight</h4>
          <p className="text-sm text-brand-blue mt-0.5">The <span className="font-bold underline">Newborn Essentials Guide</span> is your best performing lead magnet this week. Consider promoting it on social media.</p>
        </div>
      </div>
    </div>
  );
};
