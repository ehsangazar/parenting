import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Icon } from '../components/icons/index.js';
import { uiIcons } from '../lib/iconSemantics.js';
import { clsx } from 'clsx';
import { api } from '../lib/api.js';
import { useAuth } from '../state/auth.js';

export const AdminUsers = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/users', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      setUsers(res.data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      await api.patch(`/api/admin/users/${userId}`, { role: newRole }, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      toast.success('User role updated successfully');
      setEditingRole(null);
      loadUsers();
    } catch (error: any) {
      console.error('Failed to update user role:', error);
      toast.error(error.response?.data?.message || 'Failed to update user role');
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/api/admin/users/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      toast.success('User deleted successfully');
      loadUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  useEffect(() => {
    if (token) loadUsers();
  }, [token]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-brand-blue/40 bg-brand-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-blue">
            Access Control
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">User Management</h1>
          <p className="text-text-secondary font-medium italic">Manage platform access and security levels</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadUsers}
            className="p-2.5 bg-surface border border-border rounded-xl text-text-secondary hover:text-brand-blue hover:border-brand-blue/40 transition-all shadow-sm"
            title="Refresh List"
          >
            <Icon name={uiIcons.rotateCw} className={clsx('h-5 w-5', loading && 'animate-spin')} alt="" />
          </button>
          <button type="button" className="btn-duo-blue-sm">
            <Icon name={uiIcons.userPlus} className="h-4 w-4" alt="" /> Add New User
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Icon name={uiIcons.search} className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" alt="" />
          <input 
            type="text" 
            placeholder="Search users by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-surface-light border-none rounded-xl text-sm focus:ring-2 focus:ring-border-focus transition-all outline-none font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-light p-1 rounded-xl border border-border">
            {(['all', 'admin', 'user'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={clsx(
                  "px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                  roleFilter === role 
                    ? "bg-surface text-brand-blue shadow-sm" 
                    : "text-text-secondary hover:text-text-secondary"
                )}
              >
                {role}s
              </button>
            ))}
          </div>
          <button className="p-2.5 bg-surface-light text-text-secondary rounded-xl hover:bg-surface-light transition-colors border border-border">
            <Icon name={uiIcons.filter} className="h-5 w-5" alt="" />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface rounded-[32px] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-light/50 border-b border-border">
                <th className="px-8 py-5 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">User Details</th>
                <th className="px-8 py-5 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-center">Security Level</th>
                <th className="px-8 py-5 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Joined Date</th>
                <th className="px-8 py-5 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence mode='popLayout'>
                {filteredUsers.map((user) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={user.id} 
                    className="group hover:bg-surface-light transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand-blue/15 flex items-center justify-center text-brand-blue font-bold border border-brand-blue/25 shrink-0">
                          {user.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text-primary truncate">{user.email}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary font-bold uppercase mt-0.5">
                            <Icon name={uiIcons.mail} className="h-3 w-3" alt="" /> UID: {user.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center">
                        <button 
                          onClick={() => setEditingRole(user.id)}
                          className={clsx(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border",
                            user.role === 'admin' 
                              ? "bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100" 
                              : "bg-success/10 text-success border-success/30 hover:bg-success/15"
                          )}
                        >
                          {user.role === 'admin' ? (
                            <>
                              <Icon name={uiIcons.shield} className="h-3 w-3" alt="" /> Administrator
                            </>
                          ) : (
                            <>
                              <Icon name={uiIcons.user} className="h-3 w-3" alt="" /> Member
                            </>
                          )}
                          <Icon name={uiIcons.chevronDown} className="h-3 w-3 opacity-50" alt="" />
                        </button>
                      </div>
                      
                      {/* Inline Role Picker Modal/Dropdown */}
                      {editingRole === user.id && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/10 backdrop-blur-[2px]">
                          <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-surface rounded-3xl p-6 shadow-2xl border border-border w-80"
                          >
                            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                              <Icon name={uiIcons.shield} className="text-brand-blue" alt="" /> Update Security Level
                            </h3>
                            <div className="space-y-2">
                              {(['user', 'admin'] as const).map((role) => (
                                <button
                                  key={role}
                                  onClick={() => updateUserRole(user.id, role)}
                                  className={clsx(
                                    "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group",
                                    user.role === role 
                                      ? "border-brand-blue bg-brand-blue/10" 
                                      : "border-border hover:border-brand-blue/40 hover:bg-surface-light"
                                  )}
                                >
                                  <div className="text-left">
                                    <p className={clsx("font-bold capitalize", user.role === role ? "text-brand-blue" : "text-text-secondary")}>
                                      {role} Status
                                    </p>
                                    <p className="text-[10px] text-text-tertiary font-medium">
                                      {role === 'admin' ? 'Full system access & logs' : 'Standard app capabilities'}
                                    </p>
                                  </div>
                                  {user.role === role && <Icon name={uiIcons.check} className="h-5 w-5 text-brand-blue" alt="" />}
                                </button>
                              ))}
                            </div>
                            <button 
                              onClick={() => setEditingRole(null)}
                              className="w-full mt-4 py-2 text-sm font-bold text-text-secondary hover:text-text-primary"
                            >
                              Cancel
                            </button>
                          </motion.div>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                        <Icon name={uiIcons.calendar} className="h-4 w-4 text-text-dimmed" alt="" />
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-text-tertiary hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-all border border-transparent hover:border-brand-blue/25">
                          <Icon name={uiIcons.settings} className="h-5 w-5" alt="" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-2 text-text-tertiary hover:text-error hover:bg-error/10 rounded-lg transition-all border border-transparent hover:border-red-100"
                            title="Remove User"
                          >
                            <Icon name={uiIcons.trash} className="h-5 w-5" alt="" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && !loading && (
            <div className="text-center py-24 bg-surface-light/50">
              <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-border shadow-sm text-text-dimmed">
                <Icon name={uiIcons.user} className="h-10 w-10" alt="" />
              </div>
              <h3 className="text-xl font-bold text-text-primary">No users found</h3>
              <p className="text-text-secondary font-medium mt-1">Try adjusting your search or filters</p>
              <button 
                onClick={() => { setSearchQuery(''); setRoleFilter('all'); }}
                className="mt-6 px-6 py-2 bg-surface border border-border rounded-xl text-sm font-bold text-brand-blue hover:bg-surface-light transition-colors shadow-sm"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
