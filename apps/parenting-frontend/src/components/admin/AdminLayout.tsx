import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

import { uiIcons } from '../../lib/iconSemantics.js';
import type { IconName } from '../icons/index.js';
import { Icon } from '../icons/index.js';
import { useAuth } from '../../state/auth.js';

type NavItem = { path: string; label: string; iconName: IconName };

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setToken, setUser, isAdmin } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    navigate('/');
  };

  const menuItems: NavItem[] = [
    { path: '/admin', label: 'Dashboard', iconName: uiIcons.layoutDashboard },
    { path: '/admin/modules', label: 'Module Defaults', iconName: uiIcons.layers },
    { path: '/admin/upload', label: 'Upload Content', iconName: uiIcons.cloudUpload },
    { path: '/admin/content', label: 'Manage Content', iconName: uiIcons.fileText },
    { path: '/admin/users', label: 'Manage Users', iconName: uiIcons.users },
    { path: '/admin/conversations', label: 'Conversations', iconName: uiIcons.messageSquare },
    { path: '/admin/surveys', label: 'Survey Responses', iconName: uiIcons.clipboard },
    { path: '/admin/learning', label: 'LMS Center', iconName: uiIcons.graduationCap },
    { path: '/admin/chat', label: 'AI Chat', iconName: uiIcons.bot },
    { path: '/admin/articles', label: 'Articles', iconName: uiIcons.files },
    { path: '/admin/leads', label: 'Leads', iconName: uiIcons.mail },
  ];

  const menuItemsToShow: NavItem[] = isAdmin()
    ? menuItems
    : [{ path: '/profile', label: 'My Profile', iconName: uiIcons.user }];
  const pageTitleMap: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/modules': 'Module Defaults',
    '/admin/upload': 'Upload Content',
    '/admin/content': 'Manage Content',
    '/admin/users': 'Manage Users',
    '/admin/conversations': 'Conversations',
    '/admin/surveys': 'Survey Responses',
    '/admin/learning': 'LMS Center',
    '/admin/chat': 'AI Chat',
    '/admin/articles': 'Articles',
    '/admin/leads': 'Leads',
  };
  const pageTitle = pageTitleMap[location.pathname] || 'Admin';

  return (
    <div className="h-screen flex bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarCollapsed ? 80 : 280 }}
        className="relative bg-surface/90 backdrop-blur-md border-r border-border flex flex-col z-20 shadow-md"
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-10 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center shadow-md hover:bg-surface-light transition-colors z-30"
        >
          <Icon
            name={uiIcons.chevronLeft}
            className={clsx('w-4 h-4 object-contain', isSidebarCollapsed && 'rotate-180')}
            alt=""
          />
        </button>

        {/* Logo/Brand */}
        <div className={clsx(
          "p-6 h-24 flex items-center gap-3 transition-opacity",
          isSidebarCollapsed ? "justify-center" : "px-6"
        )}>
          <div className="min-w-[40px] w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <Icon name={uiIcons.graduationCap} className="w-6 h-6 object-contain brightness-0 invert" alt="" />
          </div>
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="overflow-hidden"
            >
              <h1 className="text-xl font-black text-text-primary tracking-tight leading-none">RAISED</h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-tertiary mt-1">Admin Center</p>
            </motion.div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItemsToShow.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all group relative',
                  isActive
                    ? 'bg-brand-blue/10 text-brand-blue'
                    : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
                )}
              >
                <div className={clsx(
                  "shrink-0 transition-transform group-hover:scale-110 duration-200",
                  isActive ? "text-brand-blue" : "text-text-tertiary"
                )}>
                  <Icon name={item.iconName} className="w-5 h-5 object-contain" alt="" />
                </div>
                {!isSidebarCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute left-[-16px] w-1.5 h-8 bg-brand-blue rounded-r-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Admin User Footer */}
        <div className="p-4 border-t border-border bg-surface-light/50">
          <div className={clsx(
            "flex items-center gap-3",
            isSidebarCollapsed ? "justify-center" : "px-2"
          )}>
            <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center text-white font-bold shadow-md shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{user?.email?.split('@')[0]}</p>
                <p className="text-xs text-text-secondary">Administrator</p>
              </div>
            )}
            {!isSidebarCollapsed && (
              <button 
                onClick={handleLogout}
                className="p-2 text-text-tertiary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                title="Logout"
              >
                <Icon name={uiIcons.logout} className="w-5 h-5 object-contain" alt="" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-surface/85 backdrop-blur-md border-b border-border px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-6 flex-1">
            <div className="hidden xl:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">Admin Workspace</p>
              <h2 className="text-lg font-black tracking-tight text-text-primary">{pageTitle}</h2>
            </div>
            <div className="max-w-md w-full relative">
              <Icon name={uiIcons.search} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary w-5 h-5 object-contain pointer-events-none" alt="" />
              <input 
                type="text" 
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-light border-none rounded-2xl pl-12 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-border-focus transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative w-10 h-10 flex items-center justify-center text-text-secondary hover:bg-surface-light rounded-xl transition-colors">
              <Icon name={uiIcons.bell} className="w-5 h-5 object-contain" alt="" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-border"></span>
            </button>
            <div className="h-8 w-px bg-surface-warm mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-text-primary leading-none">{isAdmin() ? 'Super Admin' : 'Editor'}</p>
                <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider mt-1">Role</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center text-text-secondary font-bold border border-border shadow-sm">
                <Icon name={uiIcons.user} className="w-5 h-5 object-contain" alt="" />
              </div>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto bg-transparent p-6 md:p-8 custom-scrollbar relative">
          {/* Subtle Background Elements */}
          <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-brand-blue/10 blur-[120px] pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-1/4 bg-purple-500/10 blur-[100px] pointer-events-none rounded-full" />
          
          <div className="relative z-10 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
