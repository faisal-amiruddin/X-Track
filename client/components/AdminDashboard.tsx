import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { 
    LayoutDashboard, Users, Activity, Settings, LogOut, Shield, 
    Search, Wallet, RefreshCw, Plus, Edit2, Trash2, X, Check, Key,
    BarChart3, ChevronLeft, DollarSign, TrendingUp, TrendingDown
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { User, Account, Statistic, TodaySummary, OverallSummary } from '../types';
import { api } from '../services/api';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

const MotionDiv = motion.div as any;
const MotionTr = motion.tr as any;

// --- 3D Card Component (Reused for Admin View) ---
const TiltCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [5, -5]);
    const rotateY = useTransform(x, [-100, 100], [-5, 5]);

    return (
        <div className={`perspective-1000 ${className}`}>
            <MotionDiv
                style={{ x, y, rotateX, rotateY, z: 100 }}
                whileHover={{ scale: 1.02 }}
                className="w-full h-full glass-card rounded-2xl p-6 transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transform-gpu"
            >
                {children}
            </MotionDiv>
        </div>
    );
};

interface AdminDashboardProps {
  user: User;
  token: string;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, token, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'accounts'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analytics State
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [stats, setStats] = useState<Statistic[]>([]);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [overallSummary, setOverallSummary] = useState<OverallSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null);
  const [formData, setFormData] = useState({
      username: '',
      password: '',
      role: 'user' as 'user' | 'admin'
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
        if (activeTab === 'users') {
            const res = await api.users.getAll(token);
            if (res.success && res.data) {
                setUsers(res.data);
            } else {
                setError(res.error || 'Failed to load users');
            }
        } else if (activeTab === 'accounts') {
            const res = await api.accounts.getAll(token);
            if (res.success && res.data) {
                setAccounts(res.data);
            } else {
                setError(res.error || 'Failed to load accounts');
            }
        }
    } catch (err) {
        setError('An unexpected error occurred');
    } finally {
        setLoading(false);
    }
  };

  const handleViewStats = async (account: Account) => {
    setSelectedAccount(account);
    setStatsLoading(true);
    try {
        const [listRes, todayRes, overallRes] = await Promise.all([
            api.statistics.getAll(token, account.id),
            api.statistics.getToday(token, account.id),
            api.statistics.getOverall(token, account.id)
        ]);

        if (listRes.success) setStats(listRes.data || []);
        if (todayRes.success) setTodaySummary(todayRes.data || null);
        if (overallRes.success) setOverallSummary(overallRes.data || null);
    } catch (error) {
        console.error("Failed to fetch stats", error);
    } finally {
        setStatsLoading(false);
    }
  };

  const handleBackToAccounts = () => {
      setSelectedAccount(null);
      setStats([]);
      setTodaySummary(null);
      setOverallSummary(null);
  };

  const handleOpenCreate = () => {
      setModalMode('create');
      setFormData({ username: '', password: '', role: 'user' });
      setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
      setModalMode('edit');
      setCurrentUser(user);
      setFormData({ username: user.username, password: '', role: user.role });
      setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: number) => {
      if(confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
          const res = await api.users.delete(token, id);
          if (res.success) {
              loadData();
          } else {
              setError(res.error || 'Failed to delete user');
          }
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          let res;
          if (modalMode === 'create') {
              res = await api.users.create(token, formData);
          } else {
              const updateData = {
                  username: formData.username,
                  role: formData.role,
                  ...(formData.password ? { password: formData.password } : {})
              };
              res = await api.users.update(token, currentUser!.id!, updateData);
          }

          if (res.success) {
              setIsModalOpen(false);
              loadData();
          } else {
              alert(res.error || 'Operation failed');
          }
      } catch (err) {
          alert('An error occurred');
      }
  };

  const chartData = useMemo(() => {
    return stats.map(s => ({
      name: new Date(s.timestamp).toLocaleDateString(),
      pl: s.daily_pl,
      balance: s.total_balance,
      time: new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }));
  }, [stats]);

  return (
    <div className="flex h-screen bg-[#02040a] text-slate-200 font-sans overflow-hidden">
      {/* Admin Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#0a0f1c] border-r border-indigo-900/20 flex flex-col h-full">
        <div className="p-6 border-b border-indigo-900/20 flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">Admin<span className="text-indigo-500">Panel</span></span>
        </div>

        <div className="flex-1 py-6 space-y-1 overflow-y-auto">
            <div className="px-4 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Main</div>
            <button 
                onClick={() => { setActiveTab('users'); setSelectedAccount(null); }} 
                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'users' && !selectedAccount ? 'text-white bg-indigo-500/10 border-r-2 border-indigo-500' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Users className="w-4 h-4" /> User Management
            </button>
            <button 
                onClick={() => { setActiveTab('accounts'); setSelectedAccount(null); }} 
                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'accounts' || selectedAccount ? 'text-white bg-indigo-500/10 border-r-2 border-indigo-500' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Wallet className="w-4 h-4" /> All Accounts
            </button>
        </div>

        <div className="p-4 border-t border-indigo-900/20 flex-shrink-0">
             <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-300 border border-indigo-500/30">
                    AD
                </div>
                <div>
                    <p className="text-sm font-bold text-white">Administrator</p>
                    <p className="text-xs text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Online
                    </p>
                </div>
            </div>
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg text-xs font-bold transition-colors border border-slate-800">
                <LogOut className="w-3 h-3" /> Sign Out
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-[#02040a]">
        <header className="bg-[#0a0f1c]/50 backdrop-blur-sm border-b border-indigo-900/20 px-8 py-5 flex justify-between items-center flex-shrink-0 z-20">
            <h1 className="text-xl font-bold text-white">
                {selectedAccount ? `Analytics: ${selectedAccount.name}` : 
                 activeTab === 'users' ? 'User Management' : 'Global Account List'}
            </h1>
            <div className="flex items-center gap-4">
                 <button onClick={() => selectedAccount ? handleViewStats(selectedAccount) : loadData()} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loading || statsLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-indigo-900 scrollbar-track-transparent">
            {error && !selectedAccount && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {selectedAccount ? (
                // --- ANALYTICS VIEW ---
                <div className="animate-in fade-in zoom-in duration-300">
                    <button 
                        onClick={handleBackToAccounts}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" /> Back to Accounts
                    </button>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <TiltCard>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Balance</p>
                                    <h3 className="text-3xl font-bold text-white mt-2">
                                        ${overallSummary?.current_balance.toLocaleString('en-US', {minimumFractionDigits: 2}) || '0.00'}
                                    </h3>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl border border-blue-500/20">
                                    <DollarSign className="w-6 h-6 text-blue-400" />
                                </div>
                            </div>
                        </TiltCard>

                        <TiltCard>
                             <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Daily P/L</p>
                                    <h3 className={`text-3xl font-bold mt-2 ${
                                        (todaySummary?.daily_pl || 0) >= 0 ? 'text-accent' : 'text-danger'
                                    }`}>
                                        {(todaySummary?.daily_pl || 0) >= 0 ? '+' : ''}
                                        ${todaySummary?.daily_pl.toLocaleString('en-US', {minimumFractionDigits: 2}) || '0.00'}
                                    </h3>
                                </div>
                                <div className={`p-3 rounded-xl border ${
                                    (todaySummary?.daily_pl || 0) >= 0 
                                    ? 'bg-accent/10 border-accent/20' 
                                    : 'bg-danger/10 border-danger/20'
                                }`}>
                                    {(todaySummary?.daily_pl || 0) >= 0 ? (
                                        <TrendingUp className="w-6 h-6 text-accent" />
                                    ) : (
                                        <TrendingDown className="w-6 h-6 text-danger" />
                                    )}
                                </div>
                            </div>
                        </TiltCard>

                        <TiltCard>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Trades Today</p>
                                    <h3 className="text-3xl font-bold text-white mt-2">
                                        {todaySummary?.trades_today || 0}
                                    </h3>
                                </div>
                                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                    <Activity className="w-6 h-6 text-purple-400" />
                                </div>
                            </div>
                        </TiltCard>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div className="bg-[#0a0f1c] border border-indigo-900/20 p-6 rounded-2xl">
                            <h3 className="text-lg font-bold text-white mb-6">Equity Curve</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="adminColorBalance" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                                        />
                                        <Area type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2} fill="url(#adminColorBalance)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                         <div className="bg-[#0a0f1c] border border-indigo-900/20 p-6 rounded-2xl">
                            <h3 className="text-lg font-bold text-white mb-6">Performance</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                                        <Line type="stepAfter" dataKey="pl" stroke="#06b6d4" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-[#0a0f1c] rounded-2xl border border-indigo-900/20 overflow-hidden">
                        <div className="p-6 border-b border-indigo-900/20">
                            <h3 className="text-lg font-bold text-white">Recent Data Points</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-[#02040a] text-xs uppercase font-bold text-slate-500 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4">Trades</th>
                                        <th className="px-6 py-4">P/L</th>
                                        <th className="px-6 py-4 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-indigo-900/20">
                                    {stats.length > 0 ? stats.slice().reverse().slice(0, 8).map((stat, i) => (
                                        <MotionTr 
                                            key={stat.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="hover:bg-white/5 transition-colors"
                                        >
                                            <td className="px-6 py-4 font-mono text-slate-300">
                                                {new Date(stat.timestamp).toLocaleTimeString()}
                                            </td>
                                            <td className="px-6 py-4">{stat.trades_today}</td>
                                            <td className={`px-6 py-4 font-bold ${stat.daily_pl >= 0 ? 'text-accent' : 'text-danger'}`}>
                                                {stat.daily_pl >= 0 ? '+' : ''}{stat.daily_pl.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-white text-right font-mono">
                                                ${stat.total_balance.toLocaleString()}
                                            </td>
                                        </MotionTr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                No trading data available for this account.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'users' ? (
                // --- USERS LIST ---
                <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0f1c] rounded-2xl border border-indigo-900/20 overflow-hidden">
                    <div className="p-6 border-b border-indigo-900/20 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-white">Registered Users</h2>
                            <p className="text-xs text-slate-500 mt-1">Manage platform access</p>
                        </div>
                        <button 
                            onClick={handleOpenCreate}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add User
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-[#02040a] text-xs uppercase font-bold text-slate-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Username</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Created At</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-indigo-900/20">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center">Loading users...</td></tr>
                                ) : users.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center">No users found</td></tr>
                                ) : users.map((u) => (
                                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-500">#{u.id}</td>
                                        <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                                                {u.username.substring(0,2).toUpperCase()}
                                            </div>
                                            {u.username}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleOpenEdit(u)}
                                                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <div className="p-4 border-t border-indigo-900/20 text-center text-xs text-slate-500">
                        Total Users: {users.length}
                    </div>
                </MotionDiv>
            ) : (
                // --- ACCOUNTS LIST ---
                <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0f1c] rounded-2xl border border-indigo-900/20 overflow-hidden">
                    <div className="p-6 border-b border-indigo-900/20 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white">All Trading Accounts</h2>
                         <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">System Wide</span>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-[#02040a] text-xs uppercase font-bold text-slate-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Account Name</th>
                                    <th className="px-6 py-4">Owner</th>
                                    <th className="px-6 py-4">API Token</th>
                                    <th className="px-6 py-4">Created At</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-indigo-900/20">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center">Loading accounts...</td></tr>
                                ) : accounts.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center">No accounts found</td></tr>
                                ) : accounts.map((acc) => (
                                    <tr key={acc.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-500">#{acc.id}</td>
                                        <td className="px-6 py-4 font-bold text-white">{acc.name}</td>
                                        <td className="px-6 py-4">
                                            {acc.user ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                                                        {acc.user.username.substring(0,2).toUpperCase()}
                                                    </span>
                                                    {acc.user.username}
                                                </span>
                                            ) : (
                                                <span className="text-slate-600 italic">Unknown (ID: {acc.user_id})</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-xs font-mono bg-slate-900 px-2 py-1 rounded w-fit border border-slate-800">
                                                <Key className="w-3 h-3 text-slate-600" />
                                                <span className="text-slate-500 truncate max-w-[100px]">{acc.api_token}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(acc.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleViewStats(acc)}
                                                className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                                title="View Analytics"
                                            >
                                                <BarChart3 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-indigo-900/20 text-center text-xs text-slate-500">
                        Total Accounts: {accounts.length}
                    </div>
                </MotionDiv>
            )}
        </div>
      </main>

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
            <MotionDiv 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <MotionDiv 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-[#0a0f1c] border border-indigo-900/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">
                            {modalMode === 'create' ? 'Create New User' : 'Edit User'}
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Username</label>
                            <input 
                                type="text"
                                required
                                value={formData.username}
                                onChange={e => setFormData({...formData, username: e.target.value})}
                                className="w-full bg-[#02040a] border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                {modalMode === 'edit' ? 'Password (Leave blank to keep)' : 'Password'}
                            </label>
                            <input 
                                type="text"
                                required={modalMode === 'create'}
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                                className="w-full bg-[#02040a] border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Role</label>
                            <select 
                                value={formData.role}
                                onChange={e => setFormData({...formData, role: e.target.value as 'user' | 'admin'})}
                                className="w-full bg-[#02040a] border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        
                        <div className="flex justify-end gap-3 mt-6">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-indigo-600/20"
                            >
                                {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </MotionDiv>
            </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};