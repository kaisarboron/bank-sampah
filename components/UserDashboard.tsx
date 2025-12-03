import React, { useEffect, useState, useMemo } from 'react';
import { User, Transaction, WasteType, Notification, WithdrawalRequest, WithdrawalStatus } from '../types';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface UserDashboardProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void; 
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ user, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<'HOME' | 'REPORT'>('HOME');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalMsg, setWithdrawalMsg] = useState('');
  
  // Report State
  const [reportContent, setReportContent] = useState<string>('');
  const [loadingReport, setLoadingReport] = useState(false);
  
  const unreadNotificationsCount = user.notifications.filter(n => !n.read).length;
  const hasReadNotifications = user.notifications.some(n => n.read);

  useEffect(() => {
    const allTx = StorageService.getTransactions();
    const myTx = allTx.filter(t => t.userId === user.id);
    setTransactions(myTx.reverse()); 
    setWasteTypes(StorageService.getWasteTypes());

    const allWd = StorageService.getWithdrawals();
    const myWd = allWd.filter(w => w.userId === user.id);
    setWithdrawals(myWd.reverse());

  }, [user.id, user.notifications, user.balance]); 

  const totalWeight = transactions.reduce((acc, curr) => acc + curr.weight, 0);

  const pendingWithdrawalAmount = useMemo(() => {
    return withdrawals
      .filter(w => w.userId === user.id && w.status === WithdrawalStatus.PENDING)
      .reduce((acc, w) => acc + w.amount, 0);
  }, [withdrawals, user.id]);

  const handleMarkAsRead = (notificationId: string) => {
    const updatedUser = StorageService.markNotificationAsRead(user.id, notificationId);
    if (updatedUser) {
      onUserUpdate(updatedUser); 
    }
  };

  const handleClearReadNotifications = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua notifikasi yang sudah dibaca?')) {
      const updatedUser = StorageService.clearReadNotifications(user.id);
      if (updatedUser) {
        onUserUpdate(updatedUser); 
      }
    }
  };

  const handleRequestWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalMsg('');
    const amount = parseInt(withdrawalAmount.replace(/\D/g, ''));
    
    if (isNaN(amount) || amount <= 0) {
      setWithdrawalMsg('Masukkan jumlah yang valid.');
      return;
    }
    
    if (amount > user.balance) {
      setWithdrawalMsg('Saldo Anda tidak mencukupi.');
      return;
    }

    if (amount < 10000) {
      setWithdrawalMsg('Minimal penarikan adalah Rp 10.000.');
      return;
    }

    const result = StorageService.createWithdrawalRequest(user.id, amount);
    if (result.success) { 
      setWithdrawalAmount('');
      setWithdrawalMsg(result.message); 
      
      const allWd = StorageService.getWithdrawals();
      const myWd = allWd.filter(w => w.userId === user.id);
      setWithdrawals(myWd.reverse());
    } else {
      setWithdrawalMsg(result.message);
    }
  };

  const generateUserAIReport = async () => {
    setLoadingReport(true);
    const report = await GeminiService.generateUserReport(transactions, user.fullName);
    setReportContent(report);
    setLoadingReport(false);
  };

  // Data for Charts
  const wasteCompositionData = useMemo(() => {
    const composition: Record<string, number> = {};
    transactions.forEach(t => {
        composition[t.wasteName] = (composition[t.wasteName] || 0) + t.weight;
    });
    return Object.keys(composition).map(key => ({
        name: key,
        value: composition[key]
    }));
  }, [transactions]);

  const monthlyStats = useMemo(() => {
      const stats: Record<string, { weight: number, amount: number, count: number }> = {};
      transactions.forEach(t => {
          const date = new Date(t.date);
          const monthYear = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
          if (!stats[monthYear]) {
              stats[monthYear] = { weight: 0, amount: 0, count: 0 };
          }
          stats[monthYear].weight += t.weight;
          stats[monthYear].amount += t.totalAmount;
          stats[monthYear].count += 1;
      });
      return Object.keys(stats).map(key => ({
          month: key,
          ...stats[key],
          sortDate: new Date(key.replace(/(\w+) (\d{4})/, '1 $1 $2'))
      })).sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  }, [transactions]);

  // Classic Blue Palette for Charts
  const COLORS = ['#1e40af', '#3b82f6', '#93c5fd', '#1e3a8a', '#60a5fa', '#2563eb'];

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-surface p-1 rounded-lg shadow-sm border border-gray-200 overflow-x-auto mb-6">
        <button
            onClick={() => setActiveTab('HOME')}
            className={`flex-1 py-2.5 px-2 text-sm font-bold rounded-md transition-all duration-200 whitespace-nowrap uppercase tracking-wider ${
            activeTab === 'HOME'
                ? 'bg-blue-100 text-primary border border-blue-200 shadow-sm'
                : 'text-muted hover:text-text hover:bg-gray-100'
            }`}
        >
            Beranda
        </button>
        <button
            onClick={() => setActiveTab('REPORT')}
            className={`flex-1 py-2.5 px-2 text-sm font-bold rounded-md transition-all duration-200 whitespace-nowrap uppercase tracking-wider ${
            activeTab === 'REPORT'
                ? 'bg-blue-100 text-primary border border-blue-200 shadow-sm'
                : 'text-muted hover:text-text hover:bg-gray-100'
            }`}
        >
            Laporan Saya
        </button>
      </div>

      {activeTab === 'HOME' && (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-secondary to-primary rounded-lg p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <h3 className="font-medium opacity-90 uppercase tracking-widest text-sm">Saldo Saya</h3>
                        <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <p className="text-4xl font-bold relative z-10 text-white drop-shadow-sm">Rp {user.balance.toLocaleString('id-ID')}</p>
                    {pendingWithdrawalAmount > 0 && (
                        <div className="mt-4 inline-block bg-white/20 px-3 py-1 rounded-lg border border-white/10 relative z-10">
                            <p className="text-xs text-white font-medium">
                            Dalam Proses: Rp {pendingWithdrawalAmount.toLocaleString('id-ID')}
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-surface rounded-lg p-6 shadow-md border border-gray-200 relative">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-500 uppercase tracking-widest text-sm">Total Sampah Disetor</h3>
                        <span className="p-2 bg-blue-50 text-primary rounded-lg border border-blue-100">
                        ♻️
                        </span>
                    </div>
                    <p className="text-4xl font-bold text-text">{totalWeight.toFixed(1)} <span className="text-xl text-gray-500 font-normal">kg</span></p>
                    <p className="text-sm mt-4 text-gray-500">Terima kasih telah menjaga bumi.</p>
                </div>
            </div>

            {/* Withdraw Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Tarik Tunai */}
                <div className="lg:col-span-1 bg-surface rounded-lg shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-text mb-4 uppercase tracking-wide">Tarik Tunai</h3>
                <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Jumlah Penarikan (Rp)</label>
                    <input
                        type="number"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        placeholder="Min. 10.000"
                        className="w-full bg-white rounded-lg border-gray-300 border p-2.5 text-text focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                    </div>
                    {withdrawalMsg && (
                    <div className={`text-sm p-2 rounded ${withdrawalMsg.includes('berhasil') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {withdrawalMsg}
                    </div>
                    )}
                    <button
                    type="submit"
                    className="w-full py-2.5 bg-primary hover:bg-secondary text-white font-bold rounded-lg shadow-sm transition-all"
                    >
                    AJUKAN PENARIKAN
                    </button>
                    <p className="text-[10px] text-gray-500 text-center">
                    *Saldo akan dipotong setelah disetujui admin.
                    </p>
                </form>
                </div>

                {/* Riwayat Penarikan */}
                <div className="lg:col-span-2 bg-surface rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-text uppercase tracking-wide">Riwayat Penarikan</h3>
                </div>
                <div className="overflow-x-auto max-h-[300px]">
                    <table className="w-full text-left text-sm text-gray-500">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-700 sticky top-0">
                        <tr>
                        <th className="px-6 py-3">Tanggal</th>
                        <th className="px-6 py-3 text-right">Jumlah</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {withdrawals.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-gray-400">Belum ada riwayat penarikan.</td>
                        </tr>
                        ) : (
                        withdrawals.map(w => (
                            <tr key={w.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3">
                                {new Date(w.requestDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-3 text-right font-medium text-text">
                                Rp {w.amount.toLocaleString('id-ID')}
                            </td>
                            <td className="px-6 py-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                ${w.status === WithdrawalStatus.APPROVED ? 'bg-green-100 text-green-700 border border-green-200' : 
                                    w.status === WithdrawalStatus.REJECTED ? 'bg-red-100 text-red-700 border border-red-200' : 
                                    'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                                {w.status === WithdrawalStatus.PENDING ? 'Menunggu' : 
                                w.status === WithdrawalStatus.APPROVED ? 'Disetujui' : 'Ditolak'}
                                </span>
                            </td>
                            </tr>
                        ))
                        )}
                    </tbody>
                    </table>
                </div>
                </div>
            </div>

            {/* Notifications Section */}
            <div className="bg-surface rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-text uppercase tracking-wide">
                    Notifikasi
                    {unreadNotificationsCount > 0 && (
                    <span className="ml-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {unreadNotificationsCount} Baru
                    </span>
                    )}
                </h3>
                {hasReadNotifications && (
                    <button
                    onClick={handleClearReadNotifications}
                    className="text-red-600 hover:text-red-500 text-xs px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                    Bersihkan
                    </button>
                )}
                </div>
                <div className="divide-y divide-gray-100">
                {user.notifications.length === 0 ? (
                    <p className="px-6 py-8 text-center text-gray-500 text-sm">Tidak ada notifikasi.</p>
                ) : (
                    user.notifications.slice().reverse().map(n => ( 
                    <div key={n.id} className={`px-6 py-4 flex items-start justify-between ${!n.read ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                        <div>
                        <p className={`text-sm ${!n.read ? 'font-semibold text-text' : 'text-gray-500'}`}>
                            {n.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {new Date(n.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        </div>
                        {!n.read && (
                        <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="ml-4 flex-shrink-0 text-blue-600 hover:text-blue-500 text-xs px-3 py-1 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                        >
                            Tandai Baca
                        </button>
                        )}
                    </div>
                    ))
                )}
                </div>
            </div>

            {/* Price List */}
            <div className="bg-surface rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-text uppercase tracking-wide">Harga Pasar (Live)</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {wasteTypes.map(w => (
                            <div key={w.id} className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200 hover:border-primary transition-all hover:shadow-sm">
                                <p className="font-medium text-gray-500 text-sm mb-1">{w.name}</p>
                                <p className="text-primary font-bold text-lg">Rp {w.pricePerKg.toLocaleString('id-ID')}/kg</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-surface rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-text uppercase tracking-wide">Riwayat Setoran</h3>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-700 text-xs uppercase">
                    <tr>
                        <th className="px-6 py-4 font-medium">Tanggal</th>
                        <th className="px-6 py-4 font-medium">Jenis Sampah</th>
                        <th className="px-6 py-4 font-medium text-right">Berat</th>
                        <th className="px-6 py-4 font-medium text-right">Nilai</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {transactions.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Belum ada transaksi.</td>
                        </tr>
                    ) : (
                        transactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-gray-600 text-sm">
                                {new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4">
                                <span className="font-medium text-text">{t.wasteName}</span>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-600">{t.weight} kg</td>
                            <td className="px-6 py-4 text-right font-bold text-primary">
                                + Rp {t.totalAmount.toLocaleString('id-ID')}
                            </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'REPORT' && (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-text uppercase tracking-wide">Laporan Kinerja Lingkungan</h2>
            <p className="text-gray-500">Lihat seberapa besar dampak positif yang telah Anda berikan untuk lingkungan.</p>

            {/* Charts Section */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Waste Composition Chart */}
                <div className="bg-surface p-6 rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center uppercase tracking-wide">Komposisi Sampah</h3>
                    <div className="h-64 w-full">
                        {wasteCompositionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={wasteCompositionData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                    <XAxis type="number" tick={{fill: '#64748b'}} />
                                    <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12, fill: '#64748b'}} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' }}
                                        formatter={(value) => [`${value} kg`, 'Berat']} 
                                    />
                                    <Bar dataKey="value" fill="#1e40af" radius={[0, 4, 4, 0]}>
                                        {wasteCompositionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                Belum ada data transaksi.
                            </div>
                        )}
                    </div>
                </div>

                {/* Monthly Progress Table */}
                <div className="bg-surface rounded-lg shadow-md border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-700 uppercase tracking-wide">Riwayat Bulanan</h3>
                    </div>
                    <div className="overflow-x-auto max-h-64">
                         <table className="w-full text-sm text-left text-gray-500">
                            <thead className="bg-gray-100 text-xs text-gray-700 uppercase sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Bulan</th>
                                    <th className="px-4 py-3 text-right">Berat (kg)</th>
                                    <th className="px-4 py-3 text-right">Pendapatan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {monthlyStats.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-4 text-center">Belum ada data.</td></tr>
                                ) : (
                                    monthlyStats.map((stat, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-text">{stat.month}</td>
                                            <td className="px-4 py-3 text-right">{stat.weight.toFixed(1)}</td>
                                            <td className="px-4 py-3 text-right text-primary">Rp {stat.amount.toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                         </table>
                    </div>
                </div>
            </div>

            {/* AI Personal Report */}
            <div className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-lg border border-blue-100 relative overflow-hidden shadow-md">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 relative z-10">
                    <div className="mb-4 md:mb-0">
                        <h3 className="text-xl font-bold text-text">✨ Analisis Cerdas Personal</h3>
                        <p className="text-sm text-gray-500">Dapatkan wawasan dan motivasi khusus berdasarkan aktivitas Anda.</p>
                    </div>
                    <button
                        onClick={generateUserAIReport}
                        disabled={loadingReport}
                        className="px-6 py-2 bg-white text-primary border border-primary rounded-full font-bold shadow-sm hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                    >
                        {loadingReport ? 'Menganalisis...' : 'Buat Laporan Saya'}
                    </button>
                </div>

                {reportContent && (
                    <div className="bg-white p-6 rounded-lg shadow-inner border border-gray-100 prose prose-slate max-w-none text-sm text-gray-700 relative z-10">
                        {/* Simple Markdown Rendering */}
                        {reportContent.split('\n').map((line, i) => {
                            if (line.startsWith('**')) return <h4 key={i} className="font-bold text-text mt-4 text-base">{line.replace(/\*\*/g, '')}</h4>;
                            if (line.startsWith('#')) return <h3 key={i} className="text-lg font-bold text-primary mt-6 tracking-wide">{line.replace(/#/g, '')}</h3>;
                            if (line.trim().startsWith('*') || line.trim().startsWith('-')) return <li key={i} className="ml-4 list-disc text-gray-600">{line.replace(/^[\*\-]\s/, '')}</li>;
                            // Check for numbered list
                            if (/^\d+\./.test(line.trim())) return <li key={i} className="ml-4 list-decimal text-gray-600">{line.replace(/^\d+\.\s/, '')}</li>;
                            
                            return <p key={i} className="mb-2 leading-relaxed">{line}</p>;
                        })}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};