export enum UserRole {
  ADMIN = 'ADMIN',
  NASABAH = 'NASABAH'
}

export enum OfftakePaymentStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  CANCELLED = 'Cancelled'
}

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface Notification {
  id: string;
  message: string;
  date: string;
  read: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  password: string; // Added password field
  role: UserRole;
  balance: number; // in IDR
  joinedDate: string;
  notifications: Notification[]; // Added for user-specific notifications
}

export interface WasteType {
  id: string;
  name: string;
  pricePerKg: number;
  category: string;
}

export interface Transaction {
  id: string;
  userId: string;
  adminId: string; // who recorded it
  wasteTypeId: string;
  wasteName: string; // snapshot in case type is deleted
  weight: number; // in Kg
  totalAmount: number;
  date: string;
  wastePricePerKgSnapshot: number; // Added: price at the time of transaction
}

export interface OfftakeTransaction {
  id: string;
  wasteTypeId: string;
  wasteName: string;
  weight: number; // in Kg
  pricePerKgNasabah: number; // Base price
  pricePerKgOfftake: number; // +10%
  totalAmount: number;
  date: string;
  adminId: string;
  paymentStatus: OfftakePaymentStatus;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: WithdrawalStatus;
  requestDate: string;
  processedDate?: string;
  adminId?: string; // Admin who processed it
}

export interface AppState {
  currentUser: User | null;
  view: 'LOGIN' | 'DASHBOARD';
}