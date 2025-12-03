import React, { useState, useEffect, useMemo } from 'react';
import { User, WasteType, Transaction, UserRole, OfftakeTransaction, OfftakePaymentStatus, WithdrawalRequest, WithdrawalStatus } from '../types';
import { StorageService } from '../services/storage';
import { GeminiService } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface AdminPanelProps {
  currentUser: User;
}

interface MonthlyRecapData {
  monthYear: string; // e.g., "Jan 2023"
  totalWeight: number;
  totalAmount: number;
  transactionCount: number;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'WASTE_TYPES' | 'TRANSACTION' | 'REPORT' | 'USERS' | 'ADMIN_USERS' | 'OFFTAKE' | 'WITHDRAWALS'>('DASHBOARD');
  const [users, setUsers] = useState<User[]>([]);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [offtakeTransactions, setOfftakeTransactions] = useState<OfftakeTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  // Transaction Form State
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedWaste, setSelectedWaste] = useState('');
  const [weight, setWeight] = useState('');

  // Offtake Form State
  const [selectedOfftakeWasteType, setSelectedOfftakeWasteType] = useState('');
  const [offtakeQuantity, setOfftakeQuantity] = useState('');
  const [offtakeCustomPrice, setOfftakeCustomPrice] = useState('');
  const [offtakeSaleMessage, setOfftakeSaleMessage] = useState('');

  // Waste Type Form State
  const [newWasteName, setNewWasteName] = useState('');
  const [newWastePrice, setNewWastePrice] = useState('');
  const [newWasteCategory, setNewWasteCategory] = useState('');
  // Edit Waste Type State
  const [editingWasteTypeId, setEditingWasteTypeId] = useState<string | null>(null);
  const [currentEditWasteName, setCurrentEditWasteName] = useState('');
  const [currentEditWastePrice, setCurrentEditWastePrice] = useState('');
  const [currentEditWasteCategory, setCurrentEditWasteCategory] = useState('');


  // Report State
  const [reportContent, setReportContent] = useState<string>('');
  const [loadingReport, setLoadingReport] = useState(false);

  // Password Reset State
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetPasswordMessage, setResetPasswordMessage] = useState('');

  // Transaction Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWasteTypeId, setFilterWasteTypeId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Admin User Registration State
  const [newAdminFullName, setNewAdminFullName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminRegMessage, setAdminRegMessage] = useState('');

  // Nasabah Registration State
  const [newNasabahFullName, setNewNasabahFullName] = useState('');
  const [newNasabahUsername, setNewNasabahUsername] = useState('');
  const [newNasabahPassword, setNewNasabahPassword] = useState('');
  const [nasabahRegMessage, setNasabahRegMessage] = useState('');

  // UI States for Custom Modal & Toast (Replacing window.confirm/alert)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setUsers(StorageService.getUsers());
    setWasteTypes(StorageService.getWasteTypes());
    setTransactions(StorageService.getTransactions());
    setOfftakeTransactions(StorageService.getOfftakeTransactions());
    setWithdrawals(StorageService.getWithdrawals());
  };

  // Helper for Toast Notification
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Helper for Confirmation Modal
  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmationModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const waste = wasteTypes.find(w => w.id === selectedWaste);
    if (!waste || !selectedUser || !weight) return;

    const weightNum = parseFloat(weight);
    const total = weightNum * waste.pricePerKg;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      userId: selectedUser,
      adminId: currentUser.id,
      wasteTypeId: waste.id,
      wasteName: waste.name,
      weight: weightNum,
      totalAmount: total,
      date: new Date().toISOString(),
      wastePricePerKgSnapshot: waste.pricePerKg,
    };

    StorageService.addTransaction(newTx);
    setWeight('');
    setSelectedWaste('');
    setSelectedUser('');
    showNotification('Transaksi berhasil disimpan!');
    refreshData();
  };

  const handleWasteTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWasteTypeId) {
      // Edit existing waste type
      const updatedTypes = wasteTypes.map(w =>
        w.id === editingWasteTypeId
          ? {
              ...w,
              name: currentEditWasteName,
              pricePerKg: parseInt(currentEditWastePrice),
              category: currentEditWasteCategory,
            }
          : w
      );
      StorageService.saveWasteTypes(updatedTypes);
      setWasteTypes(updatedTypes);
      showNotification('Jenis sampah berhasil diperbarui!');
    } else {
      // Add new waste type
      const newType: WasteType = {
        id: `w-${Date.now()}`,
        name: newWasteName,
        pricePerKg: parseInt(newWastePrice),
        category: newWasteCategory,
      };
      const updatedTypes = [...wasteTypes, newType];
      StorageService.saveWasteTypes(updatedTypes);
      setWasteTypes(updatedTypes);
      showNotification('Jenis sampah baru berhasil ditambahkan!');
    }
    // Clear form and exit edit mode
    setNewWasteName('');
    setNewWastePrice('');
    setNewWasteCategory('');
    setEditingWasteTypeId(null);
    setCurrentEditWasteName('');
    setCurrentEditWastePrice('');
    setCurrentEditWasteCategory('');
    refreshData();
  };

  const startEditingWasteType = (waste: WasteType) => {
    setEditingWasteTypeId(waste.id);
    setCurrentEditWasteName(waste.name);
    setCurrentEditWastePrice(waste.pricePerKg.toString());
    setCurrentEditWasteCategory(waste.category);
  };

  const cancelEditingWasteType = () => {
    setEditingWasteTypeId(null);
    setCurrentEditWasteName('');
    setCurrentEditWastePrice('');
    setCurrentEditWasteCategory('');
    setNewWasteName('');
    setNewWastePrice('');
    setNewWasteCategory('');
  };

  const handleDeleteWasteType = (id: string) => {
    askConfirmation(
      'Hapus Jenis Sampah',
      'Apakah Anda yakin ingin menghapus jenis sampah ini? Transaksi lama tidak akan terpengaruh.',
      () => {
        const updatedTypes = wasteTypes.filter(w => w.id !== id);
        StorageService.saveWasteTypes(updatedTypes);
        setWasteTypes(updatedTypes);
        showNotification('Jenis sampah berhasil dihapus!');
        refreshData();
      }
    );
  };

  const handleDeleteUser = (userId: string) => {
    askConfirmation(
      'Hapus Nasabah',
      'Apakah Anda yakin ingin menghapus nasabah ini? Data saldo akan hilang, namun riwayat transaksi tetap tercatat.',
      () => {
        StorageService.deleteUser(userId);
        refreshData();
        showNotification('Nasabah berhasil dihapus!');
      }
    );
  }

  const openPasswordResetModal = (user: User) => {
    setUserToResetPassword(user);
    setNewPassword('');
    setResetPasswordMessage('');
    setShowPasswordResetModal(true);
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (userToResetPassword && newPassword.length >= 6) {
      const success = StorageService.updateUserPassword(userToResetPassword.id, newPassword);
      if (success) {
        setResetPasswordMessage('Password berhasil diatur ulang!');
        refreshData();
        setTimeout(() => setShowPasswordResetModal(false), 1500);
      } else {
        setResetPasswordMessage('Gagal mengatur ulang password.');
      }
    } else {
      setResetPasswordMessage('Password baru harus minimal 6 karakter.');
    }
  };

  const handleRegisterAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminRegMessage('');

    if (!newAdminFullName || !newAdminUsername || !newAdminPassword) {
      setAdminRegMessage('Mohon lengkapi semua bidang.');
      return;
    }
    if (newAdminPassword.length < 6) {
      setAdminRegMessage('Password minimal 6 karakter.');
      return;
    }

    const result = StorageService.registerUser(newAdminFullName, newAdminUsername, newAdminPassword, UserRole.ADMIN);
    if (result.success) {
      setAdminRegMessage('Akun Admin berhasil didaftarkan!');
      showNotification('Admin baru berhasil ditambahkan');
      setNewAdminFullName('');
      setNewAdminUsername('');
      setNewAdminPassword('');
      refreshData();
    } else {
      setAdminRegMessage(result.message);
    }
  };

  const handleDeleteAdmin = (adminId: string) => {
    if (adminId === currentUser.id) {
        showNotification('Anda tidak bisa menghapus akun sendiri.', 'error');
        return;
    }
    askConfirmation(
      'Hapus Admin',
      'Apakah Anda yakin ingin menghapus akun admin ini?',
      () => {
        StorageService.deleteUser(adminId);
        showNotification('Akun admin berhasil dihapus.');
        refreshData();
      }
    );
  }

  const handleRegisterNasabah = (e: React.FormEvent) => { 
    e.preventDefault();
    setNasabahRegMessage('');

    if (!newNasabahFullName || !newNasabahUsername || !newNasabahPassword) {
      setNasabahRegMessage('Mohon lengkapi semua bidang.');
      return;
    }
    if (newNasabahPassword.length < 6) {
      setNasabahRegMessage('Password minimal 6 karakter.');
      return;
    }

    const result = StorageService.registerUser(newNasabahFullName, newNasabahUsername, newNasabahPassword, UserRole.NASABAH);
    if (result.success) {
      setNasabahRegMessage('Akun Nasabah berhasil didaftarkan!');
      showNotification('Nasabah berhasil didaftarkan');
      setNewNasabahFullName('');
      setNewNasabahUsername('');
      setNewNasabahPassword('');
      refreshData(); 
    } else {
      setNasabahRegMessage(result.message);
    }
  };

  const generateAIReport = async () => {
    setLoadingReport(true);
    const report = await GeminiService.generateReport(transactions, wasteTypes);
    setReportContent(report);
    setLoadingReport(false);
  };

  const availableOfftakeStock = useMemo(() => {
    const collectedMap = transactions.reduce((acc, curr) => {
      acc[curr.wasteTypeId] = (acc[curr.wasteTypeId] || 0) + curr.weight;
      return acc;
    }, {} as Record<string, number>);

    const soldToOfftakerMap = offtakeTransactions
      .filter(t => t.paymentStatus === OfftakePaymentStatus.PAID)
      .reduce((acc, curr) => {
        acc[curr.wasteTypeId] = (acc[curr.wasteTypeId] || 0) + curr.weight;
        return acc;
      }, {} as Record<string, number>);

    return wasteTypes.map(waste => {
      const totalCollected = collectedMap[waste.id] || 0;
      const totalSoldToOfftaker = soldToOfftakerMap[waste.id] || 0;

      const available = totalCollected - totalSoldToOfftaker;
      
      return {
        ...waste,
        availableStock: Math.max(0, available),
        offtakePrice: waste.pricePerKg * 1.1 
      };
    });
  }, [wasteTypes, transactions, offtakeTransactions]);

  const handleSellOfftake = (e: React.FormEvent) => {
    e.preventDefault();
    setOfftakeSaleMessage('');

    const wasteInfo = availableOfftakeStock.find(w => w.id === selectedOfftakeWasteType);
    if (!wasteInfo || !offtakeQuantity || !offtakeCustomPrice) return;

    const qty = parseFloat(offtakeQuantity);
    const finalPrice = parseFloat(offtakeCustomPrice);

    if (qty > wasteInfo.availableStock) {
      setOfftakeSaleMessage(`Stok tidak cukup. Hanya tersedia ${wasteInfo.availableStock.toFixed(1)} kg.`);
      return;
    }
    if (qty <= 0) {
      setOfftakeSaleMessage('Jumlah harus lebih dari 0.');
      return;
    }
    if (finalPrice <= 0) {
        setOfftakeSaleMessage('Harga harus lebih dari 0.');
        return;
    }

    const newOfftakeTx: OfftakeTransaction = {
      id: `off-${Date.now()}`,
      wasteTypeId: wasteInfo.id,
      wasteName: wasteInfo.name,
      weight: qty,
      pricePerKgNasabah: wasteInfo.pricePerKg,
      pricePerKgOfftake: finalPrice,
      totalAmount: qty * finalPrice,
      date: new Date().toISOString(),
      adminId: currentUser.id,
      paymentStatus: OfftakePaymentStatus.PENDING,
    };

    StorageService.addOfftakeTransaction(newOfftakeTx);
    showNotification('Penjualan ke Offtaker berhasil dicatat!');
    setSelectedOfftakeWasteType('');
    setOfftakeQuantity('');
    setOfftakeCustomPrice('');
    refreshData();
  };

  const handleUpdateOfftakeStatus = (id: string, status: OfftakePaymentStatus) => {
    StorageService.updateOfftakeTransactionStatus(id, status);
    refreshData();
  };

  const handleExportWasteBalance = () => {
    const data = wasteTypes.map(waste => {
      const totalCollected = transactions
        .filter(t => t.wasteTypeId === waste.id)
        .reduce((acc, curr) => acc + curr.weight, 0);

      const totalSold = offtakeTransactions
        .filter(t => t.wasteTypeId === waste.id && t.paymentStatus === OfftakePaymentStatus.PAID)
        .reduce((acc, curr) => acc + curr.weight, 0);

      const stock = totalCollected - totalSold;
      const assetValue = stock * waste.pricePerKg;

      return {
        "Jenis Sampah": waste.name,
        "Kategori": waste.category,
        "Total Masuk (kg)": parseFloat(totalCollected.toFixed(2)),
        "Total Terjual (kg)": parseFloat(totalSold.toFixed(2)),
        "Stok Tersedia (kg)": parseFloat(stock.toFixed(2)),
        "Harga Beli (Rp/kg)": waste.pricePerKg,
        "Estimasi Nilai Aset (Rp)": assetValue
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wscols = [
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Neraca Sampah");
    XLSX.writeFile(wb, `neraca_sampah_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // WITHDRAWAL HANDLERS (UPDATED TO USE CUSTOM MODAL)
  const handleApproveWithdrawal = (id: string, userId: string, amount: number) => {
    const user = users.find(u => u.id === userId);
    askConfirmation(
      'Setujui Penarikan',
      `Setujui penarikan Rp ${amount.toLocaleString('id-ID')} untuk ${user?.fullName}? Saldo nasabah akan dipotong.`,
      () => {
        try {
          StorageService.approveWithdrawal(id, currentUser.id);
          showNotification('Permintaan penarikan berhasil disetujui!');
          refreshData();
        } catch (error) {
          console.error("Error approving withdrawal:", error);
          showNotification('Gagal menyetujui permintaan.', 'error');
        }
      }
    );
  };

  const handleRejectWithdrawal = (id: string, userId: string, amount: number) => {
    const user = users.find(u => u.id === userId);
    askConfirmation(
      'Tolak Penarikan',
      `Tolak penarikan Rp ${amount.toLocaleString('id-ID')} untuk ${user?.fullName}? Saldo nasabah tidak akan dipotong.`,
      () => {
        try {
          StorageService.rejectWithdrawal(id, currentUser.id);
          showNotification('Permintaan penarikan berhasil ditolak!');
          refreshData();
        } catch (error) {
          console.error("Error rejecting withdrawal:", error);
          showNotification('Gagal menolak permintaan.', 'error');
        }
      }
    );
  };


  // Prepare Chart Data
  const chartData = wasteTypes.map(w => {
    const totalWeight = transactions
      .filter(t => t.wasteTypeId === w.id)
      .reduce((acc, curr) => acc + curr.weight, 0);
    return { name: w.name, weight: totalWeight };
  });

  // Filtered Transactions Logic
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.slice().reverse();

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(tx => {
        const user = users.find(u => u.id === tx.userId);
        const userName = user ? user.fullName.toLowerCase() : 'nasabah terhapus';
        const wasteName = tx.wasteName.toLowerCase();
        return userName.includes(lowerCaseSearchTerm) || wasteName.includes(lowerCaseSearchTerm);
      });
    }

    if (filterWasteTypeId) {
      filtered = filtered.filter(tx => tx.wasteTypeId === filterWasteTypeId);
    }

    if (filterStartDate) {
      const start = new Date(filterStartDate).setHours(0, 0, 0, 0);
      filtered = filtered.filter(tx => new Date(tx.date).getTime() >= start);
    }

    if (filterEndDate) {
      const end = new Date(filterEndDate).setHours(23, 59, 59, 999);
      filtered = filtered.filter(tx => new Date(tx.date).getTime() <= end);
    }

    return filtered;
  }, [transactions, users, searchTerm, filterWasteTypeId, filterStartDate, filterEndDate]);

  const adminUsers = useMemo(() => {
    return users.filter(u => u.role === UserRole.ADMIN);
  }, [users]);

  const nasabahUsers = useMemo(() => {
    return users.filter(u => u.role === UserRole.NASABAH);
  }, [users]);

  // Monthly Recap Logic
  const monthlyRecap = useMemo(() => {
    const recapMap: { [key: string]: { totalWeight: number; totalAmount: number; transactionCount: number } } = {};

    transactions.forEach(tx => {
      const date = new Date(tx.date);
      const month = date.toLocaleDateString('id-ID', { month: 'short' });
      const year = date.getFullYear();
      const monthYearKey = `${month} ${year}`;

      if (!recapMap[monthYearKey]) {
        recapMap[monthYearKey] = { totalWeight: 0, totalAmount: 0, transactionCount: 0 };
      }
      recapMap[monthYearKey].totalWeight += tx.weight;
      recapMap[monthYearKey].totalAmount += tx.totalAmount;
      recapMap[monthYearKey].transactionCount += 1;
    });

    const sortedRecap = Object.keys(recapMap)
      .map(key => ({
        monthYear: key,
        totalWeight: recapMap[key].totalWeight,
        totalAmount: recapMap[key].totalAmount,
        transactionCount: recapMap[key].transactionCount,
        sortDate: new Date(key.replace(/(\w+) (\d{4})/, '1 $1 $2')),
      }))
      .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime()); 

    return sortedRecap.map(({ sortDate, ...rest }) => rest);
  }, [transactions]);


  const resetFilters = () => {
    setSearchTerm('');
    setFilterWasteTypeId('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const totalNasabahBalance = useMemo(() => {
    return nasabahUsers.reduce((acc, user) => acc + user.balance, 0);
  }, [nasabahUsers]);

  const totalOfftakeRevenuePaid = useMemo(() => {
    return offtakeTransactions
      .filter(t => t.paymentStatus === OfftakePaymentStatus.PAID)
      .reduce((acc, t) => acc + t.totalAmount, 0);
  }, [offtakeTransactions]);

  const totalCollectedWaste = useMemo(() => {
    return transactions.reduce((acc, curr) => acc + curr.weight, 0);
  }, [transactions]);

  const totalSoldWaste = useMemo(() => {
    return offtakeTransactions
      .filter(t => t.paymentStatus === OfftakePaymentStatus.PAID)
      .reduce((acc, curr) => acc + curr.weight, 0);
  }, [offtakeTransactions]);

  const remainingStockWaste = useMemo(() => {
    return totalCollectedWaste - totalSoldWaste;
  }, [totalCollectedWaste, totalSoldWaste]);

  const totalApprovedWithdrawals = useMemo(() => {
    return withdrawals
      .filter(w => w.status === WithdrawalStatus.APPROVED)
      .reduce((acc, w) => acc + w.amount, 0);
  }, [withdrawals]);

  const bankCashBalance = useMemo(() => {
    return totalOfftakeRevenuePaid - totalApprovedWithdrawals;
  }, [totalOfftakeRevenuePaid, totalApprovedWithdrawals]);


  return (
    <div className="space-y-6 relative">
      {/* GLOBAL NOTIFICATION TOAST */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-fade-in flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <span>{notification.type === 'success' ? '✅' : '⚠️'}</span>
          {notification.message}
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all scale-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmationModal.title}</h3>
            <p className="text-gray-600 mb-6">{confirmationModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmationModal.onConfirm}
                className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-secondary focus:outline-none shadow-sm transition-transform transform active:scale-95"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-surface p-1 rounded-lg shadow-sm border border-gray-200 overflow-x-auto scrollbar-hide">
        {[
          { id: 'DASHBOARD', label: 'Dashboard' },
          { id: 'TRANSACTION', label: 'Catat Transaksi' },
          { id: 'WITHDRAWALS', label: 'Penarikan' },
          { id: 'OFFTAKE', label: 'Offtaker' },
          { id: 'USERS', label: 'Nasabah' },
          { id: 'ADMIN_USERS', label: 'Admin' },
          { id: 'WASTE_TYPES', label: 'Jenis Sampah' },
          { id: 'REPORT', label: 'Laporan AI' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-md transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-100 text-primary border border-blue-200 shadow-sm'
                : 'text-muted hover:text-text hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-surface rounded-lg shadow-md border border-gray-200 p-6 min-h-[500px]">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-xl font-bold text-text mb-6 uppercase tracking-widest border-b border-gray-200 pb-2">Operational Command Center</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <h3 className="text-blue-600 font-medium text-xs uppercase tracking-wider">Total Nasabah</h3>
                <p className="text-2xl font-bold text-gray-800 mt-1">{nasabahUsers.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <h3 className="text-indigo-600 font-medium text-xs uppercase tracking-wider">Total Saldo Nasabah</h3>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  Rp {totalNasabahBalance.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <h3 className="text-teal-600 font-medium text-xs uppercase tracking-wider">Pendapatan Offtaker</h3>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  Rp {totalOfftakeRevenuePaid.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <h3 className="text-orange-600 font-medium text-xs uppercase tracking-wider">Total Penarikan</h3>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  Rp {totalApprovedWithdrawals.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="bg-gradient-to-br from-primary to-secondary p-4 rounded-lg shadow-md text-white">
                <h3 className="text-blue-100 font-medium text-xs uppercase tracking-wider">Kas Bank Sampah</h3>
                <p className="text-2xl font-bold mt-1">
                  Rp {bankCashBalance.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-700 uppercase tracking-wide">Neraca Sampah</h3>
                <button 
                  onClick={handleExportWasteBalance}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Export Excel (.xlsx)</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <h3 className="text-emerald-600 font-medium text-xs uppercase">Sampah Diterima</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                        {totalCollectedWaste.toFixed(1)} <span className="text-base font-normal text-gray-500">kg</span>
                    </p>
                </div>
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <h3 className="text-red-600 font-medium text-xs uppercase">Sampah Terjual</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                        {totalSoldWaste.toFixed(1)} <span className="text-base font-normal text-gray-500">kg</span>
                    </p>
                </div>
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <h3 className="text-blue-600 font-medium text-xs uppercase">Stok Tersedia</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                        {remainingStockWaste.toFixed(1)} <span className="text-base font-normal text-gray-500">kg</span>
                    </p>
                </div>
            </div>


            <div className="h-80 w-full mt-8 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase">Statistik Pengumpulan per Jenis Sampah</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} />
                  <YAxis tick={{ fill: '#64748b'}} axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b' }}
                    itemStyle={{ color: '#1e293b' }}
                    formatter={(value) => [`${value} kg`, 'Berat']} 
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="weight" fill="#1e40af" radius={[4, 4, 0, 0]} name="Berat (kg)" barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TRANSACTION TAB */}
        {activeTab === 'TRANSACTION' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-text mb-6 uppercase tracking-wide">Input Transaksi Baru</h2>
            <form onSubmit={handleAddTransaction} className="space-y-5 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Pilih Nasabah</label>
                <select
                  required
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full bg-white rounded-lg border-gray-300 border p-2.5 text-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="" className="text-gray-400">-- Pilih Nasabah --</option>
                  {nasabahUsers.map(u => ( 
                    <option key={u.id} value={u.id}>{u.fullName} ({u.username})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Jenis Sampah</label>
                  <select
                    required
                    value={selectedWaste}
                    onChange={(e) => setSelectedWaste(e.target.value)}
                    className="w-full bg-white rounded-lg border-gray-300 border p-2.5 text-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  >
                    <option value="" className="text-gray-400">-- Pilih Jenis --</option>
                    {wasteTypes.map(w => (
                      <option key={w.id} value={w.id}>{w.name} (Rp {w.pricePerKg}/kg)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Berat (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-white rounded-lg border-gray-300 border p-2.5 text-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="0.0"
                  />
                </div>
              </div>

              {selectedWaste && weight && (
                <div className="bg-white p-4 rounded-lg text-right border border-gray-200 shadow-sm">
                  <span className="text-gray-500 text-sm">Estimasi Pendapatan:</span>
                  <div className="text-3xl font-bold text-primary">
                    Rp {(parseFloat(weight) * (wasteTypes.find(w => w.id === selectedWaste)?.pricePerKg || 0)).toLocaleString('id-ID')}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 bg-primary hover:bg-secondary text-white font-bold rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
              >
                SIMPAN TRANSAKSI
              </button>
            </form>
            
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Riwayat Transaksi</h3>

              {/* Transaction Filters */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end border border-gray-200">
                <div className="col-span-full">
                  <label htmlFor="search-term" className="block text-xs font-medium text-gray-500 mb-1">
                    Cari (Nasabah/Sampah)
                  </label>
                  <input
                    id="search-term"
                    type="text"
                    placeholder="Cari..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 rounded-md bg-white border-gray-300 border text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="filter-waste-type" className="block text-xs font-medium text-gray-500 mb-1">
                    Jenis Sampah
                  </label>
                  <select
                    id="filter-waste-type"
                    value={filterWasteTypeId}
                    onChange={(e) => setFilterWasteTypeId(e.target.value)}
                    className="w-full p-2 rounded-md bg-white border-gray-300 border text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">Semua Jenis</option>
                    {wasteTypes.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="filter-start-date" className="block text-xs font-medium text-gray-500 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    id="filter-start-date"
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full p-2 rounded-md bg-white border-gray-300 border text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="filter-end-date" className="block text-xs font-medium text-gray-500 mb-1">
                    Tanggal Akhir
                  </label>
                  <input
                    id="filter-end-date"
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full p-2 rounded-md bg-white border-gray-300 border text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                {(searchTerm || filterWasteTypeId || filterStartDate || filterEndDate) && (
                  <div>
                    <button
                      onClick={resetFilters}
                      className="w-full py-2 px-3 bg-gray-200 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Reset Filter
                    </button>
                  </div>
                )}
              </div>


              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Nasabah</th>
                      <th className="px-4 py-3">Sampah</th>
                      <th className="px-4 py-3 text-right">Berat</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Tidak ada transaksi yang ditemukan.</td>
                      </tr>
                    ) : (
                      filteredTransactions.map(t => (
                        <tr key={t.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium text-text">
                            {users.find(u => u.id === t.userId)?.fullName || 'Nasabah Terhapus'}
                          </td>
                          <td className="px-4 py-3">{t.wasteName}</td>
                          <td className="px-4 py-3 text-right">{t.weight} kg</td>
                          <td className="px-4 py-3 text-right font-semibold text-primary">
                            Rp {t.totalAmount.toLocaleString('id-ID')}
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

        {/* WITHDRAWALS TAB */}
        {activeTab === 'WITHDRAWALS' && (
          <div>
            <h2 className="text-xl font-bold text-text mb-6 uppercase tracking-wide">Permintaan Penarikan Saldo</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                  <tr>
                    <th className="px-6 py-3">Tanggal</th>
                    <th className="px-6 py-3">Nasabah</th>
                    <th className="px-6 py-3 text-right">Jumlah (Rp)</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Belum ada permintaan penarikan.</td>
                    </tr>
                  ) : (
                    withdrawals.slice().reverse().map(w => {
                      const user = users.find(u => u.id === w.userId);
                      return (
                        <tr key={w.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-4">{new Date(w.requestDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-6 py-4 font-medium text-text">
                            {user ? user.fullName : 'Unknown User'}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-text">
                            Rp {w.amount.toLocaleString('id-ID')}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold
                              ${w.status === WithdrawalStatus.APPROVED ? 'bg-green-100 text-green-700 border border-green-200' : 
                                w.status === WithdrawalStatus.REJECTED ? 'bg-red-100 text-red-700 border border-red-200' : 
                                'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {w.status === WithdrawalStatus.PENDING && (
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => handleApproveWithdrawal(w.id, w.userId, w.amount)}
                                  className="text-white bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs transition-colors"
                                >
                                  Setujui
                                </button>
                                <button
                                  onClick={() => handleRejectWithdrawal(w.id, w.userId, w.amount)}
                                  className="text-white bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-xs transition-colors"
                                >
                                  Tolak
                                </button>
                              </div>
                            )}
                            {w.status !== WithdrawalStatus.PENDING && (
                              <span className="text-xs text-gray-400">
                                Diproses: {w.processedDate ? new Date(w.processedDate).toLocaleDateString() : '-'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OFFTAKE TAB */}
        {activeTab === 'OFFTAKE' && (
          <div>
            <h2 className="text-xl font-bold text-text mb-6 uppercase tracking-wide">Marketplace Offtaker</h2>

            {/* Form Jual ke Offtaker */}
             <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-50 p-6 rounded-lg border border-teal-200">
                   <h3 className="font-semibold text-teal-700 mb-4 tracking-wide uppercase">Penjualan Baru</h3>
                   <p className="text-sm text-teal-600 mb-4">Harga jual dapat disesuaikan manual (Default: Harga Nasabah + 10%).</p>
                   
                   <form onSubmit={handleSellOfftake} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Pilih Jenis Sampah</label>
                        <select 
                          required
                          value={selectedOfftakeWasteType} 
                          onChange={(e) => {
                            const wasteId = e.target.value;
                            setSelectedOfftakeWasteType(wasteId);
                            const waste = availableOfftakeStock.find(w => w.id === wasteId);
                            if (waste) {
                                // Pre-fill custom price with default calculation
                                setOfftakeCustomPrice(waste.offtakePrice.toString());
                            } else {
                                setOfftakeCustomPrice('');
                            }
                          }}
                          className="w-full bg-white rounded-lg border-gray-300 border p-2 text-sm text-text focus:ring-teal-500 focus:border-teal-500 outline-none"
                        >
                          <option value="">-- Pilih Jenis --</option>
                          {availableOfftakeStock.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.name} (Stok: {w.availableStock.toFixed(1)} kg)
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedOfftakeWasteType && (
                        <div className="bg-white p-3 rounded border border-teal-100 text-sm space-y-1">
                           <div className="flex justify-between">
                              <span className="text-gray-500">Harga Beli (Nasabah):</span>
                              <span className="font-medium text-gray-700">Rp {availableOfftakeStock.find(w => w.id === selectedOfftakeWasteType)?.pricePerKg}/kg</span>
                           </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Jumlah Berat (kg)</label>
                            <input 
                              type="number"
                              step="0.1"
                              required
                              value={offtakeQuantity}
                              onChange={(e) => setOfftakeQuantity(e.target.value)}
                              className="w-full bg-white rounded-lg border-gray-300 border p-2 text-sm text-text focus:ring-teal-500 focus:border-teal-500 outline-none"
                              placeholder="0.0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Harga Jual / Kg (Rp)</label>
                            <input 
                              type="number"
                              required
                              value={offtakeCustomPrice}
                              onChange={(e) => setOfftakeCustomPrice(e.target.value)}
                              className="w-full bg-white rounded-lg border-gray-300 border p-2 text-sm text-text focus:ring-teal-500 focus:border-teal-500 outline-none"
                              placeholder="0"
                            />
                          </div>
                      </div>

                      {offtakeQuantity && offtakeCustomPrice && (
                        <div className="text-right text-sm font-bold text-teal-700">
                             Total Estimasi: Rp {(parseFloat(offtakeQuantity) * parseFloat(offtakeCustomPrice)).toLocaleString('id-ID')}
                        </div>
                      )}
                      
                      {offtakeSaleMessage && (
                        <div className={`text-sm p-2 rounded ${offtakeSaleMessage.includes('berhasil') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {offtakeSaleMessage}
                        </div>
                      )}

                      <button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2 rounded font-bold text-sm shadow-md transition-all">
                        EKSEKUSI PENJUALAN
                      </button>
                   </form>
                </div>

                {/* Tabel Stok Tersedia */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                   <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-700">Inventaris Stok</h3>
                   </div>
                   <div className="overflow-x-auto max-h-[400px]">
                      <table className="w-full text-sm text-left text-gray-500">
                         <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                               <th className="px-4 py-3">Jenis</th>
                               <th className="px-4 py-3 text-right">Stok (kg)</th>
                               <th className="px-4 py-3 text-right">Estimasi Jual (+10%)</th>
                            </tr>
                         </thead>
                         <tbody>
                            {availableOfftakeStock.map(w => (
                               <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-4 py-3 font-medium text-text">{w.name}</td>
                                  <td className="px-4 py-3 text-right">{w.availableStock.toFixed(1)}</td>
                                  <td className="px-4 py-3 text-right">Rp {w.offtakePrice.toLocaleString()}</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
             
             {/* Riwayat Transaksi Offtaker */}
             <h3 className="text-lg font-bold text-gray-700 mb-4">Log Transaksi Offtaker</h3>
             <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm text-left text-gray-500">
                   <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                      <tr>
                         <th className="px-6 py-3">Tanggal</th>
                         <th className="px-6 py-3">Jenis Sampah</th>
                         <th className="px-6 py-3 text-right">Berat (kg)</th>
                         <th className="px-6 py-3 text-right">Harga Jual</th>
                         <th className="px-6 py-3 text-right">Total</th>
                         <th className="px-6 py-3 text-center">Status Pembayaran</th>
                      </tr>
                   </thead>
                   <tbody>
                      {offtakeTransactions.length === 0 ? (
                         <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400">Belum ada transaksi penjualan ke offtaker.</td></tr>
                      ) : (
                         offtakeTransactions.slice().reverse().map(t => (
                            <tr key={t.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                               <td className="px-6 py-4">{new Date(t.date).toLocaleDateString()}</td>
                               <td className="px-6 py-4 font-medium text-text">{t.wasteName}</td>
                               <td className="px-6 py-4 text-right">{t.weight}</td>
                               <td className="px-6 py-4 text-right">Rp {t.pricePerKgOfftake.toLocaleString()}</td>
                               <td className="px-6 py-4 text-right font-bold text-teal-600">Rp {t.totalAmount.toLocaleString()}</td>
                               <td className="px-6 py-4 text-center">
                                  {t.paymentStatus === OfftakePaymentStatus.PENDING ? (
                                    <div className="flex flex-col items-center space-y-1">
                                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full text-xs font-semibold mb-1">Pending</span>
                                      <div className="flex space-x-1">
                                        <button 
                                          onClick={() => handleUpdateOfftakeStatus(t.id, OfftakePaymentStatus.PAID)}
                                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-500"
                                        >
                                          Lunas
                                        </button>
                                        <button 
                                          onClick={() => handleUpdateOfftakeStatus(t.id, OfftakePaymentStatus.CANCELLED)}
                                          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-500"
                                        >
                                          Batal
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      t.paymentStatus === OfftakePaymentStatus.PAID ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                                    }`}>
                                      {t.paymentStatus}
                                    </span>
                                  )}
                               </td>
                            </tr>
                         ))
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'USERS' && (
            <div>
                <h2 className="text-xl font-bold text-text mb-6 uppercase tracking-wide">Database Nasabah</h2>

                {/* Form Tambah Nasabah */}
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-8 max-w-lg mx-auto">
                    <h3 className="font-semibold mb-4 text-gray-700">Registrasi Nasabah Baru</h3>
                    <form onSubmit={handleRegisterNasabah} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Nama Lengkap Nasabah"
                            required
                            value={newNasabahFullName}
                            onChange={e => setNewNasabahFullName(e.target.value)}
                            className="w-full p-2 rounded bg-white border border-gray-300 text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Username Nasabah Unik"
                            required
                            value={newNasabahUsername}
                            onChange={e => setNewNasabahUsername(e.target.value)}
                            className="w-full p-2 rounded bg-white border border-gray-300 text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                        <input
                            type="password"
                            placeholder="Password (min. 6 karakter)"
                            required
                            value={newNasabahPassword}
                            onChange={e => setNewNasabahPassword(e.target.value)}
                            className="w-full p-2 rounded bg-white border border-gray-300 text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                        {nasabahRegMessage && (
                          <div className={`text-sm p-2 rounded ${nasabahRegMessage.includes('berhasil') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {nasabahRegMessage}
                          </div>
                        )}
                        <button className="w-full bg-primary hover:bg-secondary text-white py-2 rounded text-sm font-bold shadow-md transition-all">
                            + DAFTARKAN NASABAH
                        </button>
                    </form>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-6 py-3">Nama Lengkap</th>
                                <th className="px-6 py-3">Username</th>
                                <th className="px-6 py-3">Bergabung Sejak</th>
                                <th className="px-6 py-3 text-right">Saldo Saat Ini</th>
                                <th className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {nasabahUsers.length === 0 ? ( 
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center">Belum ada data nasabah.</td>
                                </tr>
                            ) : (
                                nasabahUsers.map(u => ( 
                                    <tr key={u.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-text">{u.fullName}</td>
                                        <td className="px-6 py-4">{u.username}</td>
                                        <td className="px-6 py-4">{new Date(u.joinedDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-primary">
                                            Rp {u.balance.toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4 text-center space-x-2">
                                            <button 
                                                onClick={() => openPasswordResetModal(u)}
                                                className="text-blue-600 hover:text-blue-500 px-3 py-1 text-xs underline"
                                            >
                                                Reset Pwd
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="text-red-600 hover:text-red-500 px-3 py-1 text-xs underline"
                                            >
                                                Hapus
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* ADMIN USERS TAB */}
        {activeTab === 'ADMIN_USERS' && (
            <div>
                <h2 className="text-xl font-bold text-text mb-6 uppercase tracking-wide">Kelola Admin</h2>
                
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-8 max-w-lg mx-auto">
                    <h3 className="font-semibold mb-4 text-gray-700">Registrasi Admin Baru</h3>
                    <form onSubmit={handleRegisterAdmin} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Nama Lengkap Admin"
                            required
                            value={newAdminFullName}
                            onChange={e => setNewAdminFullName(e.target.value)}
                            className="w-full p-2 rounded bg-white border border-gray-300 text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Username Admin Unik"
                            required
                            value={newAdminUsername}
                            onChange={e => setNewAdminUsername(e.target.value)}
                            className="w-full p-2 rounded bg-white border border-gray-300 text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                        <input
                            type="password"
                            placeholder="Password (min. 6 karakter)"
                            required
                            value={newAdminPassword}
                            onChange={e => setNewAdminPassword(e.target.value)}
                            className="w-full p-2 rounded bg-white border border-gray-300 text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        />
                        {adminRegMessage && (
                          <div className={`text-sm p-2 rounded ${adminRegMessage.includes('berhasil') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {adminRegMessage}
                          </div>
                        )}
                        <button className="w-full bg-secondary hover:bg-blue-800 text-white py-2 rounded text-sm font-bold shadow-md transition-all">
                            + DAFTARKAN ADMIN
                        </button>
                    </form>
                </div>

                <h3 className="text-lg font-bold text-gray-700 mb-4 mt-8">Daftar Admin Aktif</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-6 py-3">Nama Lengkap</th>
                                <th className="px-6 py-3">Username</th>
                                <th className="px-6 py-3">Bergabung Sejak</th>
                                <th className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adminUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center">Belum ada data admin.</td>
                                </tr>
                            ) : (
                                adminUsers.map(u => (
                                    <tr key={u.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-text">{u.fullName}</td>
                                        <td className="px-6 py-4">{u.username}</td>
                                        <td className="px-6 py-4">{new Date(u.joinedDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleDeleteAdmin(u.id)}
                                                className={`text-red-600 hover:text-red-500 px-3 py-1 text-xs underline ${u.id === currentUser.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={u.id === currentUser.id}
                                            >
                                                Hapus
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* WASTE TYPES TAB */}
        {activeTab === 'WASTE_TYPES' && (
          <div>
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-text uppercase tracking-wide">Konfigurasi Harga</h2>
             </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <h3 className="font-semibold mb-4 text-gray-700">
                    {editingWasteTypeId ? 'Edit Parameter' : 'Input Parameter Baru'}
                  </h3>
                  <form onSubmit={handleWasteTypeSubmit} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nama Sampah (mis: Tembaga)"
                      required
                      value={editingWasteTypeId ? currentEditWasteName : newWasteName}
                      onChange={e => editingWasteTypeId ? setCurrentEditWasteName(e.target.value) : setNewWasteName(e.target.value)}
                      className="w-full p-2 rounded bg-white border border-gray-300 text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Kategori (mis: Logam)"
                      required
                      value={editingWasteTypeId ? currentEditWasteCategory : newWasteCategory}
                      onChange={e => editingWasteTypeId ? setCurrentEditWasteCategory(e.target.value) : setNewWasteCategory(e.target.value)}
                      className="w-full p-2 rounded bg-white border border-gray-300 text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Harga per Kg (Rp)"
                      required
                      value={editingWasteTypeId ? currentEditWastePrice : newWastePrice}
                      onChange={e => editingWasteTypeId ? setCurrentEditWastePrice(e.target.value) : setNewWastePrice(e.target.value)}
                      className="w-full p-2 rounded bg-white border border-gray-300 text-text text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                    <div className="flex space-x-2">
                      {editingWasteTypeId && (
                        <button
                          type="button"
                          onClick={cancelEditingWasteType}
                          className="flex-1 py-2 px-3 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                        >
                          Batal
                        </button>
                      )}
                      <button className="flex-1 bg-secondary hover:bg-blue-800 text-white py-2 rounded text-sm font-bold transition-all">
                        {editingWasteTypeId ? 'SIMPAN' : 'TAMBAH'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="grid gap-3">
                  {wasteTypes.map(waste => (
                    <div key={waste.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary/30 transition-colors shadow-sm">
                      <div>
                        <h4 className="font-semibold text-text">{waste.name}</h4>
                        <p className="text-xs text-primary bg-blue-50 inline-block px-2 py-0.5 rounded mt-1 border border-blue-100">{waste.category}</p>
                      </div>
                      <div className="text-right flex items-center space-x-2">
                        <div className="text-primary font-bold text-lg">Rp {waste.pricePerKg.toLocaleString('id-ID')}</div>
                        <div className="flex flex-col space-y-1 ml-2">
                            <button
                            onClick={() => startEditingWasteType(waste)}
                            className="text-blue-600 hover:text-blue-500 text-xs"
                            >
                            Edit
                            </button>
                            <button 
                            onClick={() => handleDeleteWasteType(waste.id)}
                            className="text-red-600 hover:text-red-500 text-xs"
                            >
                            Hapus
                            </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORT TAB */}
        {activeTab === 'REPORT' && (
          <div className="max-w-4xl mx-auto">
            {/* AI Report Section */}
            <div className="flex flex-col items-center justify-center py-6 text-center border-b border-gray-200 pb-8 mb-8">
              <h2 className="text-2xl font-bold text-text mb-2 tracking-wide">Analisis Cerdas EcoVault</h2>
              <p className="text-gray-500 mb-6 max-w-lg">
                Gunakan kecerdasan buatan (Gemini AI) untuk menganalisis data transaksi, tren sampah, dan dampak lingkungan secara otomatis.
              </p>
              
              <button
                onClick={generateAIReport}
                disabled={loadingReport}
                className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full font-bold shadow-md transform transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loadingReport ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    PROCESSING...
                  </>
                ) : (
                  <>
                    ✨ GENERATE LAPORAN AI
                  </>
                )}
              </button>
            </div>

            {reportContent && (
              <div className="mt-8 bg-white p-8 rounded-lg border border-gray-200 shadow-md prose prose-slate max-w-none">
                <div className="flex items-center mb-6 border-b border-gray-100 pb-4">
                  <div className="bg-blue-50 p-2 rounded-lg mr-4 border border-blue-100">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text m-0">Hasil Analisis</h3>
                    <p className="text-sm text-gray-400 m-0">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                
                <div className="space-y-4 text-gray-700 leading-relaxed font-normal">
                  {reportContent.split('\n').map((line, i) => {
                    if (line.startsWith('**')) return <h4 key={i} className="font-bold text-text mt-4 text-lg">{line.replace(/\*\*/g, '')}</h4>;
                    if (line.startsWith('#')) return <h3 key={i} className="text-xl font-bold text-primary mt-6 tracking-wide">{line.replace(/#/g, '')}</h3>;
                    if (line.trim().startsWith('*') || line.trim().startsWith('-')) return <li key={i} className="ml-4 text-gray-600">{line.replace(/^[\*\-]\s/, '')}</li>;
                    return <p key={i}>{line}</p>;
                  })}
                </div>
              </div>
            )}

            {/* Monthly Recap Section */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-text mb-6 text-center uppercase tracking-wide">Rekapitulasi Bulanan</h2>
              <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                    <tr>
                      <th className="px-6 py-3">Bulan & Tahun</th>
                      <th className="px-6 py-3 text-right">Jumlah Transaksi</th>
                      <th className="px-6 py-3 text-right">Berat Sampah (kg)</th>
                      <th className="px-6 py-3 text-right">Total Uang (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRecap.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Belum ada data rekapitulasi bulanan.</td>
                      </tr>
                    ) : (
                      monthlyRecap.map((recap, index) => (
                        <tr key={index} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-text">{recap.monthYear}</td>
                          <td className="px-6 py-4 text-right">{recap.transactionCount}</td>
                          <td className="px-6 py-4 text-right">{recap.totalWeight.toFixed(1)}</td>
                          <td className="px-6 py-4 text-right font-semibold text-primary">
                            Rp {recap.totalAmount.toLocaleString('id-ID')}
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

      </div>

      {/* Password Reset Modal */}
      {showPasswordResetModal && userToResetPassword && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-text mb-4">Reset Password</h3>
            <p className="text-sm text-gray-600 mb-4">Target: <span className="font-semibold text-primary">{userToResetPassword.fullName}</span></p>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Password Baru</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-text"
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>
              {resetPasswordMessage && (
                <div className={`text-sm p-2 rounded ${resetPasswordMessage.includes('berhasil') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {resetPasswordMessage}
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordResetModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-secondary focus:outline-none disabled:opacity-50"
                  disabled={newPassword.length < 6}
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};