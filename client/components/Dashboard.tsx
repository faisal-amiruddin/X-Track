import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  LayoutDashboard, Wallet, LogOut, Plus, RefreshCw, Trash2,
  TrendingUp, TrendingDown, DollarSign, Activity, Key, Eye, EyeOff,
  Menu, X, Users, ChevronRight, User as UserIcon, Calendar, Filter
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Account, Statistic, TodaySummary, User, OverallSummary } from '../types';
import { api } from '../services/api';

const MotionDiv = motion.div as any;
const MotionTr = motion.tr as any;

interface DashboardProps {
  user: User;
  token: string;
  onLogout: () => void;
}

// --- 3D Card Component ---
const TiltCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [5, -5]);
    const rotateY = useTransform(x, [-100, 100], [-5, 5]);

    return (
        <div className={`perspective-1000 ${className}`}>
            <MotionDiv
                style={{ x, y, rotateX, rotateY, z: 100 }}
                drag
                dragElastic={0.16}
                dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
                whileHover={{ scale: 1.02, cursor: 'grab' }}
                whileTap={{ cursor: 'grabbing' }}
                className="w-full h-full glass-card rounded-2xl p-6 transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transform-gpu"
            >
                {children}
            </MotionDiv>
        </div>
    );
};

type FilterRange = 'all' | '7d' | '30d';

export const Dashboard: React.FC<DashboardProps> = ({ user, token, onLogout }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data State
  const [stats, setStats] = useState<Statistic[]>([]);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [overallSummary, setOverallSummary] = useState<OverallSummary | null>(null);
  
  // UI State
  const [refreshing, setRefreshing] = useState(false);
  const [showApiToken, setShowApiToken] = useState<Record<number, boolean>>({});
  const [filterRange, setFilterRange] = useState<FilterRange>('all');

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchStats(selectedAccountId, filterRange);
    } else {
      setStats([]);
      setTodaySummary(null);
      setOverallSummary(null);
    }
  }, [selectedAccountId, filterRange]);

  const fetchAccounts = async () => {
    setLoading(true);
    const res = await api.accounts.getMyAccounts(token);
    if (res.success && res.data) {
      setAccounts(res.data);
      if (res.data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(res.data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchStats = async (accountId: number, range: FilterRange) => {
    setRefreshing(true);
    try {
      // Always fetch Summary and Today's data regardless of filter
      const [todayRes, overallRes] = await Promise.all([
        api.statistics.getToday(token, accountId),
        api.statistics.getOverall(token, accountId)
      ]);

      if (todayRes.success) setTodaySummary(todayRes.data || null);
      if (overallRes.success) setOverallSummary(overallRes.data || null);

      // Fetch List based on Filter
      let listRes;
      if (range === 'all') {
         // Default fetches page 1, size 100 to get a good chart overview
         listRes = await api.statistics.getAll(token, accountId, 1, 100);
      } else {
         const endDate = new Date();
         const startDate = new Date();
         
         if (range === '7d') startDate.setDate(endDate.getDate() - 7);
         if (range === '30d') startDate.setDate(endDate.getDate() - 30);

         // Format YYYY-MM-DD
         const formatDate = (d: Date) => d.toISOString().split('T')[0];
         listRes = await api.statistics.getRange(token, accountId, formatDate(startDate), formatDate(endDate));
      }

      if (listRes.success) {
          setStats(listRes.data || []);
      }

    } catch (e) {
      console.error("Failed to fetch stats", e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.accounts.create(token, newAccountName, user.id);
    if (res.success && res.data) {
      setAccounts([...accounts, res.data]);
      setSelectedAccountId(res.data.id);
      setCreateModalOpen(false);
      setNewAccountName('');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (confirm("Are you sure you want to delete this account?")) {
      const res = await api.accounts.delete(token, id);
      if (res.success) {
        const newAccounts = accounts.filter(a => a.id !== id);
        setAccounts(newAccounts);
        if (selectedAccountId === id) {
          setSelectedAccountId(newAccounts.length > 0 ? newAccounts[0].id : null);
        }
      }
    }
  };

  const handleRegenerateToken = async (id: number) => {
      const res = await api.accounts.regenerateToken(token, id);
      if(res.success && res.data) {
          setAccounts(accounts.map(acc => acc.id === id ? res.data! : acc));
      }
  }

  const selectedAccount = useMemo(() => 
    accounts.find(a => a.id === selectedAccountId), 
    [accounts, selectedAccountId]
  );

  // 1. Fix Chart Direction: Sort data Oldest -> Newest
  const chartData = useMemo(() => {
    // Clone array before sorting to avoid mutating state
    const sortedStats = [...stats].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return sortedStats.map(s => ({
      name: new Date(s.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
      pl: s.daily_pl,
      balance: s.total_balance,
      time: new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      fullDate: new Date(s.timestamp).toLocaleString()
    }));
  }, [stats]);

  // 2. Calculate Net Profit based on loaded stats
  const netProfit = useMemo(() => {
      return stats.reduce((acc, curr) => acc + curr.daily_pl, 0);
  }, [stats]);

  return (
    <div className="flex h-screen bg-background text-slate-200 overflow-hidden relative font-sans">
      {/* Background Ambience */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Sidebar - Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <MotionDiv 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Fixed width, Flex Column */}
      <motion.aside 
        className={`fixed md:relative z-50 h-full w-72 flex-shrink-0 bg-surface/95 md:bg-surface/50 backdrop-blur-xl border-r border-white/5 flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-lg shadow-primary/30">
                    <Activity className="text-white w-6 h-6" />
                </div>
                <div>
                    <span className="font-bold text-xl text-white tracking-tight block leading-none">X-Track</span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">User Terminal</span>
                </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-6 scrollbar-hide">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-white border border-white/10">
                        <UserIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{user.username}</p>
                        <p className="text-xs text-slate-500">Standard Plan</p>
                    </div>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">
                    <span>Your Portfolios</span>
                    <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md text-[10px]">{accounts.length}</span>
                </div>
                <div className="space-y-1">
                {accounts.map(account => (
                    <button
                    key={account.id}
                    onClick={() => {
                        setSelectedAccountId(account.id);
                        setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 text-sm font-medium border ${
                        selectedAccountId === account.id
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
                    }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <Wallet className="w-4 h-4 shrink-0" />
                            <span className="truncate">{account.name}</span>
                        </div>
                        {selectedAccountId === account.id && <ChevronRight className="w-3 h-3" />}
                    </button>
                ))}
                
                <button
                    onClick={() => {
                        setCreateModalOpen(true);
                        setSidebarOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium border border-dashed border-slate-700 mt-3 group"
                >
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>New Account</span>
                </button>
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-white/5 flex-shrink-0">
            <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all text-sm font-medium border border-red-500/20"
            >
            <LogOut className="w-4 h-4" />
            Disconnect
            </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <div className="md:hidden flex-shrink-0 sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
            <span className="font-bold text-lg text-white">X-Track</span>
            <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-800 rounded-lg text-white">
                <Menu className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-14 pb-20 scroll-smooth">
             {loading ? (
                <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-slate-400 animate-pulse">Loading data...</p>
                </div>
            ) : accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto">
                     <div className="w-24 h-24 bg-gradient-to-tr from-slate-800 to-slate-700 rounded-3xl flex items-center justify-center mb-8 shadow-2xl relative">
                        <Wallet className="w-10 h-10 text-slate-300 relative z-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Welcome to X-Track</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Create your first trading portfolio to begin tracking real-time analytics.
                    </p>
                    <button 
                        onClick={() => setCreateModalOpen(true)}
                        className="bg-primary hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all transform hover:-translate-y-1"
                    >
                        <Plus className="w-5 h-5" />
                        Create Portfolio
                    </button>
                </div>
            ) : (
                <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                     {/* Header */}
                    <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
                                {selectedAccount?.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                                <div className="flex items-center gap-2 bg-surfaceLight/50 px-3 py-1.5 rounded-lg border border-white/5">
                                    <Key className="w-3 h-3 text-primary" /> 
                                    <span className="font-mono text-xs">
                                        {showApiToken[selectedAccountId!] ? selectedAccount?.api_token : '••••••••••••••••••••••••'}
                                    </span>
                                    <button 
                                        onClick={() => setShowApiToken(prev => ({...prev, [selectedAccountId!]: !prev[selectedAccountId!]}))}
                                        className="text-slate-500 hover:text-white transition-colors ml-1"
                                    >
                                        {showApiToken[selectedAccountId!] ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}
                                    </button>
                                </div>
                                <button 
                                    onClick={() => handleRegenerateToken(selectedAccountId!)}
                                    className="text-xs text-primary hover:text-indigo-300 transition-colors font-medium"
                                >
                                    Rotate Key
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                            {/* 3. Filter Controls */}
                            <div className="bg-white/5 p-1 rounded-xl flex items-center border border-white/5">
                                <button 
                                    onClick={() => setFilterRange('all')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterRange === 'all' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    All Time
                                </button>
                                <button 
                                    onClick={() => setFilterRange('7d')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterRange === '7d' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    7 Days
                                </button>
                                <button 
                                    onClick={() => setFilterRange('30d')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterRange === '30d' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    30 Days
                                </button>
                            </div>

                             <button 
                                 onClick={() => handleDeleteAccount(selectedAccountId!)}
                                 className="p-3 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                                 title="Delete Portfolio"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => selectedAccountId && fetchStats(selectedAccountId, filterRange)}
                                className={`flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/5 font-medium ${refreshing ? 'opacity-70' : ''}`}
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                        </div>
                    </header>

                    {/* Stats Grid 3D - Updated to 4 cols */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
                        <TiltCard>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Balance</p>
                                    <h3 className="text-2xl font-bold text-white mt-2">
                                        ${overallSummary?.current_balance.toLocaleString('en-US', {minimumFractionDigits: 2}) || '0.00'}
                                    </h3>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl border border-blue-500/20">
                                    <DollarSign className="w-5 h-5 text-blue-400" />
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                               Last sync: {overallSummary?.latest_update ? new Date(overallSummary.latest_update).toLocaleTimeString() : '--:--'}
                            </div>
                        </TiltCard>

                        {/* 2. New Net Profit Card */}
                        <TiltCard>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Net Profit {filterRange !== 'all' && '(Period)'}</p>
                                    <h3 className={`text-2xl font-bold mt-2 ${
                                        netProfit >= 0 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]'
                                    }`}>
                                        {netProfit >= 0 ? '+' : ''}
                                        ${netProfit.toLocaleString('en-US', {minimumFractionDigits: 2})}
                                    </h3>
                                </div>
                                <div className={`p-3 rounded-xl border ${
                                    netProfit >= 0 
                                    ? 'bg-green-500/10 border-green-500/20' 
                                    : 'bg-red-500/10 border-red-500/20'
                                }`}>
                                    <Wallet className={`w-5 h-5 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-500">
                                Cumulative P/L of {stats.length} records
                            </div>
                        </TiltCard>

                        <TiltCard>
                             <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Daily P/L</p>
                                    <h3 className={`text-2xl font-bold mt-2 ${
                                        (todaySummary?.daily_pl || 0) >= 0 ? 'text-accent drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'text-danger drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'
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
                                        <TrendingUp className="w-5 h-5 text-accent" />
                                    ) : (
                                        <TrendingDown className="w-5 h-5 text-danger" />
                                    )}
                                </div>
                            </div>
                            <div className="w-full bg-slate-800/50 rounded-full h-1 mt-2 overflow-hidden">
                                <MotionDiv 
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    className={`h-full ${ (todaySummary?.daily_pl || 0) >= 0 ? 'bg-accent' : 'bg-danger'}`} 
                                />
                            </div>
                        </TiltCard>

                        <TiltCard>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Trades Today</p>
                                    <h3 className="text-2xl font-bold text-white mt-2">
                                        {todaySummary?.trades_today || 0}
                                    </h3>
                                </div>
                                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                    <Activity className="w-5 h-5 text-purple-400" />
                                </div>
                            </div>
                             <div className="text-[10px] text-slate-500">
                                Total Activity: {todaySummary?.total_records || 0} signals
                            </div>
                        </TiltCard>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        <div className="glass-card p-6 md:p-8 rounded-3xl">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <div className="w-2 h-6 bg-primary rounded-full"></div>
                                Equity Curve
                            </h3>
                            <div className="h-[300px] w-full">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                                            <XAxis 
                                                dataKey="name" 
                                                stroke="#94a3b8" 
                                                fontSize={12} 
                                                tickLine={false} 
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis 
                                                stroke="#94a3b8" 
                                                fontSize={12} 
                                                tickLine={false} 
                                                axisLine={false} 
                                                domain={['auto', 'auto']} 
                                                dx={-10}
                                            />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', backdropFilter: 'blur(10px)', borderColor: '#334155', color: '#fff', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff' }}
                                                labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="balance" 
                                                stroke="#6366f1" 
                                                strokeWidth={3} 
                                                fillOpacity={1} 
                                                fill="url(#colorBalance)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-xl">
                                        No data available for selected range
                                    </div>
                                )}
                            </div>
                        </div>

                         <div className="glass-card p-6 md:p-8 rounded-3xl">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <div className="w-2 h-6 bg-accent rounded-full"></div>
                                P/L Performance
                            </h3>
                            <div className="h-[300px] w-full">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                                            <XAxis 
                                                dataKey="name" 
                                                stroke="#94a3b8" 
                                                fontSize={12} 
                                                tickLine={false} 
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis 
                                                stroke="#94a3b8" 
                                                fontSize={12} 
                                                tickLine={false} 
                                                axisLine={false} 
                                                dx={-10}
                                            />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', backdropFilter: 'blur(10px)', borderColor: '#334155', color: '#fff', borderRadius: '12px' }}
                                                labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="pl" 
                                                stroke="#06b6d4" 
                                                strokeWidth={3} 
                                                dot={{ r: 4, fill: '#06b6d4', strokeWidth: 0 }} 
                                                activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-xl">
                                        No data available for selected range
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-card rounded-3xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Recent Data Streams</h3>
                            <div className="flex gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                                <span className="text-xs text-slate-400 font-mono">LIVE</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="bg-slate-900/50 text-xs uppercase font-bold text-slate-500 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4">Session Trades</th>
                                        <th className="px-6 py-4">P/L Delta</th>
                                        <th className="px-6 py-4 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {/* Sort Newest -> Oldest for Table View */}
                                    {stats.length > 0 ? [...stats].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10).map((stat, i) => (
                                        <MotionTr 
                                            key={stat.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="hover:bg-white/5 transition-colors"
                                        >
                                            <td className="px-6 py-4 font-mono text-slate-300">
                                                {new Date(stat.timestamp).toLocaleTimeString()}
                                                <span className="text-slate-600 ml-2 text-xs">{new Date(stat.timestamp).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded-md text-xs font-mono">
                                                    {stat.trades_today}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 font-bold ${stat.daily_pl >= 0 ? 'text-accent' : 'text-danger'}`}>
                                                {stat.daily_pl >= 0 ? '+' : ''}{stat.daily_pl.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-white text-right font-bold font-mono">
                                                ${stat.total_balance.toLocaleString()}
                                            </td>
                                        </MotionTr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                                No incoming data stream...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </MotionDiv>
            )}
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
      {createModalOpen && (
        <MotionDiv 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
            <MotionDiv 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="glass-card rounded-2xl p-8 w-full max-w-md shadow-2xl border-t border-white/10"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Initialize Portfolio</h3>
                    <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                        <Plus className="w-6 h-6 rotate-45" />
                    </button>
                </div>
                <form onSubmit={handleCreateAccount}>
                    <div className="mb-8">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Portfolio Name</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            placeholder="e.g. Master Funding Acc 01"
                            value={newAccountName}
                            onChange={(e) => setNewAccountName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-4">
                         <button 
                            type="button"
                            onClick={() => setCreateModalOpen(false)}
                            className="px-6 py-3 text-slate-400 hover:text-white font-medium"
                        >
                            Abort
                        </button>
                        <button 
                            type="submit"
                            className="bg-primary hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/25"
                        >
                            Create
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
