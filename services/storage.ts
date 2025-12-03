import { User, WasteType, Transaction, UserRole, Notification, OfftakeTransaction, OfftakePaymentStatus, WithdrawalRequest, WithdrawalStatus } from '../types';

const STORAGE_KEYS = {
  USERS: 'ecovault_users',
  WASTE_TYPES: 'ecovault_waste_types',
  TRANSACTIONS: 'ecovault_transactions',
  OFFTAKE_TRANSACTIONS: 'ecovault_offtake_transactions',
  WITHDRAWALS: 'ecovault_withdrawals',
};

// Seed Data
const INITIAL_USERS: User[] = [
  {
    id: 'admin1',
    username: 'admin',
    fullName: 'Admin Utama',
    password: '0987', // Changed password from 'adminpassword' to '0987'
    role: UserRole.ADMIN,
    balance: 0,
    joinedDate: new Date().toISOString(),
    notifications: [], // Added for new notification feature
  },
  {
    id: 'user1',
    username: 'nasabah',
    fullName: 'Budi Santoso',
    password: 'nasabahpassword', // Added password
    role: UserRole.NASABAH,
    balance: 15000,
    joinedDate: new Date().toISOString(),
    notifications: [], // Added for new notification feature
  },
  {
    id: 'user2',
    username: 'siti',
    fullName: 'Siti Aminah',
    password: 'sitipassword', // Added password
    role: UserRole.NASABAH,
    balance: 45000,
    joinedDate: new Date().toISOString(),
    notifications: [], // Added for new notification feature
  }
];

// Define INITIAL_WASTE_TYPES
const INITIAL_WASTE_TYPES: WasteType[] = [
  {
    id: 'waste1',
    name: 'Botol Plastik PET',
    pricePerKg: 3000,
    category: 'Plastik',
  },
  {
    id: 'waste2',
    name: 'Kertas HVS',
    pricePerKg: 1500,
    category: 'Kertas',
  },
  {
    id: 'waste3',
    name: 'Kaleng Aluminium',
    pricePerKg: 5000,
    category: 'Logam',
  },
  {
    id: 'waste4',
    name: 'Kaca Bening',
    pricePerKg: 1000,
    category: 'Kaca',
  },
];

export const StorageService = {
  init: () => {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.WASTE_TYPES)) {
      localStorage.setItem(STORAGE_KEYS.WASTE_TYPES, JSON.stringify(INITIAL_WASTE_TYPES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.OFFTAKE_TRANSACTIONS)) {
      localStorage.setItem(STORAGE_KEYS.OFFTAKE_TRANSACTIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.WITHDRAWALS)) {
      localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify([]));
    }
  },

  getUsers: (): User[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  },

  saveUser: (user: User) => {
    const users = StorageService.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      // For new users from registration, ensure notifications array is present
      if (!user.notifications) {
        user.notifications = [];
      }
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  registerUser: (fullName: string, username: string, password: string, role: UserRole = UserRole.NASABAH): { success: boolean; message: string; user?: User } => {
    const users = StorageService.getUsers();
    
    // Check if username exists
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Username sudah digunakan.' };
    }

    const newUser: User = {
      id: `${role.toLowerCase()}-${Date.now()}`,
      username: username,
      fullName: fullName,
      password: password, // Store the provided password
      role: role, // Use the provided role
      balance: 0,
      joinedDate: new Date().toISOString(),
      notifications: [], // Initialize notifications for new user
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    return { success: true, message: 'Registrasi berhasil', user: newUser };
  },

  deleteUser: (userId: string) => {
    console.log(`[StorageService] Attempting to delete user with ID: ${userId}`);
    let users = StorageService.getUsers();
    console.log(`[StorageService] Users before filter: ${users.map(u => u.id).join(', ')}`);
    users = users.filter(u => u.id !== userId);
    console.log(`[StorageService] Users after filter: ${users.map(u => u.id).join(', ')}`);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    console.log(`[StorageService] localStorage updated for USERS. New count: ${users.length}`);
  },

  updateUserPassword: (userId: string, newPassword: string): boolean => {
    const users = StorageService.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      users[userIndex].password = newPassword;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      return true;
    }
    return false;
  },

  getWasteTypes: (): WasteType[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.WASTE_TYPES) || '[]');
  },

  saveWasteTypes: (types: WasteType[]) => {
    localStorage.setItem(STORAGE_KEYS.WASTE_TYPES, JSON.stringify(types));
  },

  getTransactions: (): Transaction[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
  },

  addTransaction: (transaction: Transaction) => {
    const transactions = StorageService.getTransactions();
    transactions.push(transaction);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));

    // Update user balance AND add notification
    const users = StorageService.getUsers();
    const userIndex = users.findIndex(u => u.id === transaction.userId);
    if (userIndex >= 0) {
      const updatedUser = { ...users[userIndex] };
      updatedUser.balance += transaction.totalAmount;

      const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        message: `Saldo Anda telah diperbarui. Setoran sampah "${transaction.wasteName}" (${transaction.weight} kg) senilai Rp ${transaction.totalAmount.toLocaleString('id-ID')} telah ditambahkan.`,
        date: new Date().toISOString(),
        read: false,
      };
      // Ensure notifications array exists before pushing
      if (!updatedUser.notifications) {
        updatedUser.notifications = [];
      }
      updatedUser.notifications = [...updatedUser.notifications, newNotification];
      
      users[userIndex] = updatedUser;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  },

  getOfftakeTransactions: (): OfftakeTransaction[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.OFFTAKE_TRANSACTIONS) || '[]');
  },

  addOfftakeTransaction: (transaction: OfftakeTransaction) => {
    const transactions = StorageService.getOfftakeTransactions();
    transactions.push(transaction);
    localStorage.setItem(STORAGE_KEYS.OFFTAKE_TRANSACTIONS, JSON.stringify(transactions));
  },

  updateOfftakeTransactionStatus: (id: string, status: OfftakePaymentStatus) => {
    const transactions = StorageService.getOfftakeTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index >= 0) {
      transactions[index].paymentStatus = status;
      localStorage.setItem(STORAGE_KEYS.OFFTAKE_TRANSACTIONS, JSON.stringify(transactions));
    }
  },

  // --- WITHDRAWAL FEATURES ---

  getWithdrawals: (): WithdrawalRequest[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.WITHDRAWALS) || '[]');
  },

  createWithdrawalRequest: (userId: string, amount: number): { success: boolean; message: string; user?: User } => {
    console.log(`[StorageService] createWithdrawalRequest called for user: ${userId}, amount: ${amount}`);
    const users = StorageService.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      console.log(`[StorageService] User ${userId} not found.`);
      return { success: false, message: 'User tidak ditemukan' };
    }

    const user = users[userIndex];
    if (user.balance < amount) {
      console.log(`[StorageService] Insufficient balance for user ${userId}. Balance: ${user.balance}, requested: ${amount}`);
      return { success: false, message: 'Saldo tidak mencukupi untuk penarikan ini.' };
    }

    // Saldo TIDAK dipotong langsung saat pengajuan. Dipotong saat admin menyetujui.
    // Hanya buat permintaan penarikan.

    const withdrawals = StorageService.getWithdrawals();
    const newRequest: WithdrawalRequest = {
      id: `wd-${Date.now()}`,
      userId,
      amount,
      status: WithdrawalStatus.PENDING,
      requestDate: new Date().toISOString(),
    };
    withdrawals.push(newRequest);
    localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(withdrawals));
    console.log(`[StorageService] Withdrawal request ${newRequest.id} created for user ${userId} with status PENDING.`);

    // Return the original user, as balance has not been updated yet
    return { success: true, message: 'Permintaan penarikan berhasil dibuat. Menunggu persetujuan admin.', user: user };
  },

  approveWithdrawal: (requestId: string, adminId: string) => {
    console.log(`[StorageService] approveWithdrawal called for ID: ${requestId} by Admin: ${adminId}`);
    const withdrawals = StorageService.getWithdrawals();
    const index = withdrawals.findIndex(w => w.id === requestId);
    if (index === -1) {
        console.log(`[StorageService] Withdrawal request ${requestId} not found.`);
        return;
    }
    if (withdrawals[index].status !== WithdrawalStatus.PENDING) {
        console.log(`[StorageService] Withdrawal request ${requestId} is not PENDING. Current status: ${withdrawals[index].status}`);
        return;
    }

    const amount = withdrawals[index].amount;
    const userId = withdrawals[index].userId;

    // Deduct balance from user
    const users = StorageService.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        console.error(`[StorageService] User ${userId} for withdrawal ${requestId} not found during approval.`);
        return; // Or handle as an error
    }
    const user = users[userIndex];
    if (user.balance < amount) {
        console.error(`[StorageService] User ${userId} has insufficient balance (${user.balance}) for approved withdrawal ${requestId} (requested: ${amount}).`);
        // If balance check at request time failed for some reason, auto-reject or flag
        withdrawals[index].status = WithdrawalStatus.REJECTED; // Auto-reject due to current balance
        withdrawals[index].processedDate = new Date().toISOString();
        withdrawals[index].adminId = adminId;
        localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(withdrawals));
        const newNotification: Notification = {
            id: `notif-wd-fail-app-${Date.now()}`,
            message: `Permintaan penarikan saldo sebesar Rp ${amount.toLocaleString('id-ID')} GAGAL DISETUJUI karena saldo Anda tidak mencukupi saat proses persetujuan. Silakan periksa saldo Anda.`,
            date: new Date().toISOString(),
            read: false,
        };
        user.notifications = [...(user.notifications || []), newNotification];
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        console.log(`[StorageService] Withdrawal ${requestId} auto-rejected for ${userId} due to insufficient balance.`);
        return;
    }
    user.balance -= amount;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    console.log(`[StorageService] User ${userId} balance deducted by ${amount}. New balance: ${user.balance}`);


    // Update Withdrawal Status
    withdrawals[index].status = WithdrawalStatus.APPROVED;
    withdrawals[index].processedDate = new Date().toISOString();
    withdrawals[index].adminId = adminId;
    localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(withdrawals));
    console.log(`[StorageService] Withdrawal request ${requestId} status updated to APPROVED.`);

    // Notify User
    const newNotification: Notification = {
        id: `notif-wd-app-${Date.now()}`,
        message: `Penarikan saldo sebesar Rp ${amount.toLocaleString('id-ID')} telah DISETUJUI oleh admin. Saldo Anda telah berkurang. Dana akan segera dicairkan.`,
        date: new Date().toISOString(),
        read: false,
    };
    user.notifications = [...(user.notifications || []), newNotification];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    console.log(`[StorageService] User ${userId} notified about approved withdrawal.`);
  },

  rejectWithdrawal: (requestId: string, adminId: string) => {
    console.log(`[StorageService] rejectWithdrawal called for ID: ${requestId} by Admin: ${adminId}`);
    const withdrawals = StorageService.getWithdrawals();
    const index = withdrawals.findIndex(w => w.id === requestId);
    if (index === -1) {
        console.log(`[StorageService] Withdrawal request ${requestId} not found.`);
        return;
    }
    if (withdrawals[index].status !== WithdrawalStatus.PENDING) {
        console.log(`[StorageService] Withdrawal request ${requestId} is not PENDING. Current status: ${withdrawals[index].status}`);
        return;
    }

    const amount = withdrawals[index].amount;
    const userId = withdrawals[index].userId;

    // Update Withdrawal Status
    withdrawals[index].status = WithdrawalStatus.REJECTED;
    withdrawals[index].processedDate = new Date().toISOString();
    withdrawals[index].adminId = adminId;
    localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(withdrawals));
    console.log(`[StorageService] Withdrawal request ${requestId} status updated to REJECTED.`);

    // Notify User (no balance refund needed as it was not deducted initially)
    const users = StorageService.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
        const updatedUser = { ...users[userIndex] };
        const newNotification: Notification = {
            id: `notif-wd-rej-${Date.now()}`,
            message: `Permintaan penarikan saldo sebesar Rp ${amount.toLocaleString('id-ID')} DITOLAK oleh admin. Saldo Anda tidak berubah.`,
            date: new Date().toISOString(),
            read: false,
        };
        if (!updatedUser.notifications) updatedUser.notifications = [];
        updatedUser.notifications = [...updatedUser.notifications, newNotification];
        users[userIndex] = updatedUser;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        console.log(`[StorageService] User ${userId} notified about rejected withdrawal.`);
    }
  },

  // --- NOTIFICATIONS ---

  markNotificationAsRead: (userId: string, notificationId: string): User | undefined => {
    const users = StorageService.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      const updatedUser = { ...users[userIndex] };
      const notifIndex = updatedUser.notifications.findIndex(n => n.id === notificationId);
      if (notifIndex >= 0) {
        updatedUser.notifications[notifIndex] = { ...updatedUser.notifications[notifIndex], read: true };
        users[userIndex] = updatedUser;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        return updatedUser;
      }
    }
    return undefined;
  },

  clearReadNotifications: (userId: string): User | undefined => {
    const users = StorageService.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      const updatedUser = { ...users[userIndex] };
      updatedUser.notifications = updatedUser.notifications.filter(n => !n.read);
      users[userIndex] = updatedUser;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      return updatedUser;
    }
    return undefined;
  },

  // Simple login simulation
  login: (username: string, password: string): User | undefined => { // Added password parameter
    const users = StorageService.getUsers();
    const user = users.find(u => u.username === username);
    if (user && user.password === password) { // Verify both username and password
      return user;
    }
    return undefined;
  }
};