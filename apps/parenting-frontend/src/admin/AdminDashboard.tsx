import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Icon, type IconName } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { clsx } from 'clsx';
import { api } from '../lib/api.js';
import { useAuth } from '../state/auth.js';

export const AdminDashboard = () => {
  const { token } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/reports', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      setReport(res.data);
      const tix = await api.get('/api/support', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      setTickets(tix.data.tickets ?? []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadReport().catch(() => {});
  }, [token]);

  const stats: {
    label: string;
    value: number;
    iconName: IconName;
    color: string;
    trend: string;
    description: string;
  }[] = [
    {
      label: 'Total Users',
      value: report?.users || 0,
      iconName: uiIcons.users,
      color: 'bg-blue-500',
      trend: '+12%',
      description: 'Active users this month',
    },
    {
      label: 'Documents',
      value: report?.documentCount || 0,
      iconName: uiIcons.fileText,
      color: 'bg-brand-blue',
      trend: '+5%',
      description: 'Knowledge base resources',
    },
    {
      label: 'AI Conversations',
      value: report?.conversations || 0,
      iconName: uiIcons.messageSquare,
      color: 'bg-purple-500',
      trend: '+24%',
      description: 'Total expert chats',
    },
    {
      label: 'Open Tickets',
      value: tickets.length,
      iconName: uiIcons.clipboardList,
      color: 'bg-amber-500',
      trend: '-2%',
      description: 'Pending support needs',
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-brand-blue/40 bg-brand-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-blue">
            System Intelligence
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">System Overview</h1>
          <p className="text-text-secondary font-medium">Monitoring Raised platform health and growth</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadReport}
            className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-text-secondary hover:bg-surface-light transition-colors shadow-sm flex items-center gap-2"
          >
            <Icon name={uiIcons.clock} className="h-4 w-4" alt="" /> Refresh Data
          </button>
          <button type="button" className="btn-duo-blue-sm">
            <Icon name={uiIcons.trendingUp} className="h-4 w-4" alt="" /> Download Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            variants={item}
            className="bg-surface rounded-[32px] p-6 border border-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", stat.color)}>
                <Icon name={stat.iconName} className="h-6 w-6 brightness-0 invert" alt="" />
              </div>
              <div className={clsx(
                "px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1",
                stat.trend.startsWith('+') ? "bg-success/10 text-success" : "bg-error/10 text-error"
              )}>
                {stat.trend}{' '}
                <Icon
                  name={uiIcons.trendingUp}
                  className={clsx('h-3 w-3', !stat.trend.startsWith('+') && 'rotate-180')}
                  alt=""
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-text-tertiary uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-text-primary">{loading ? '...' : stat.value}</h3>
              <p className="text-xs text-text-secondary mt-2 font-medium">{stat.description}</p>
            </div>
            {/* Decoration */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-surface-light rounded-full group-hover:scale-110 transition-transform duration-500 -z-0" />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Growth Chart (Mock Visual) */}
        <div className="lg:col-span-2 bg-surface rounded-[32px] p-8 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                <Icon name={uiIcons.chartColumn} className="h-5 w-5" alt="" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Growth Activity</h3>
                <p className="text-xs text-text-secondary font-medium">User engagement over the last 7 days</p>
              </div>
            </div>
            <select className="bg-surface-light border-none rounded-xl px-3 py-1.5 text-xs font-bold text-text-secondary focus:ring-2 focus:ring-border-focus outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>

          <div className="h-64 flex items-end justify-between gap-4 px-2">
            {[45, 60, 35, 80, 55, 90, 70].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div className="w-full relative">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${val}%` }}
                    transition={{ delay: i * 0.1, duration: 1 }}
                    className="w-full bg-surface-light rounded-t-xl group-hover:bg-brand-blue transition-colors relative"
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-background text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                      {val}%
                    </div>
                  </motion.div>
                </div>
                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-tighter">Day {i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Support Activity */}
        <div className="bg-surface rounded-[32px] p-8 border border-border shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-text-primary">Recent Tickets</h3>
            <button className="text-xs font-bold text-brand-blue hover:text-brand-blue flex items-center gap-1">
              View All <Icon name={uiIcons.chevronRight} className="h-4 w-4" alt="" />
            </button>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {tickets.length > 0 ? (
              tickets.slice(0, 5).map((ticket, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-surface-light hover:bg-surface-light transition-colors border border-transparent hover:border-border">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-bold text-text-primary truncate pr-4">{ticket.subject}</p>
                    <Icon name={uiIcons.arrowUpRight} className="h-4 w-4 shrink-0 text-text-tertiary" alt="" />
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2 mb-2 leading-snug">{ticket.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-tertiary">{ticket.email.split('@')[0]}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-surface border border-border rounded-full text-text-secondary font-bold uppercase tracking-wider">
                      {ticket.status || 'Active'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-text-dimmed py-12">
                <Icon name={uiIcons.clipboardList} className="mb-2 h-12 w-12 opacity-20" alt="" />
                <p className="text-sm font-bold">No active tickets</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Recent Usage Logs */}
      <div className="bg-surface rounded-[32px] p-8 border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Recent System Activity</h3>
            <p className="text-xs text-text-secondary font-medium">Audit logs and usage records</p>
          </div>
          <button type="button" className="btn-duo-ghost-sm">
            View Complete Logs
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">User ID</th>
                <th className="pb-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Action</th>
                <th className="pb-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Model</th>
                <th className="pb-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Tokens</th>
                <th className="pb-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(report?.usage || []).map((log: any, i: number) => (
                <tr key={i} className="group hover:bg-surface-light/50 transition-colors">
                  <td className="py-4 text-xs font-bold text-text-secondary font-mono">{log.userId.slice(0, 8)}...</td>
                  <td className="py-4">
                    <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue rounded-md text-[10px] font-bold uppercase">
                      {log.action || 'Query'}
                    </span>
                  </td>
                  <td className="py-4 text-xs font-medium text-text-secondary">{log.model || 'gpt-4o'}</td>
                  <td className="py-4 text-xs font-bold text-text-secondary">{log.tokensUsed || 0}</td>
                  <td className="py-4 text-xs text-text-tertiary text-right">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!report?.usage?.length && (
            <div className="text-center py-12 text-text-tertiary text-sm font-medium">
              No recent activity logs found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
