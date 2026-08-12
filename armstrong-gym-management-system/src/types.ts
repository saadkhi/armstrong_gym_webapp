export type MembershipPlanType = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';

export type MembershipStatus = 'Active' | 'Expiring' | 'Expired';

export interface Member {
  id: string; // e.g. "GM-001"
  name: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  address?: string;
  photoUrl?: string;
  planType: MembershipPlanType;
  planDurationMonths: number;
  planCost: number;
  amountPaid: number;
  remainingBalance: number;
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  status: MembershipStatus;
  trainerId?: string;
  emergencyContact?: string;
  qrCodeUrl?: string;
  notes?: string;
  createdAt: string;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Net Banking';

export interface Payment {
  id: string; // e.g. "PAY-1001"
  memberId: string;
  memberName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD HH:mm:ss
  transactionId?: string;
  billUrl?: string; // Image or document proof URL of the transaction bill
  verificationStatus?: 'Verified' | 'Pending Verification' | 'Rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface Attendance {
  id: string; // e.g. "ATT-5001"
  memberId: string;
  memberName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  checkInMethod: 'QR Scan' | 'Manual';
}

export interface Trainer {
  id: string; // e.g. "TR-01"
  name: string;
  phone: string;
  email: string;
  specialty: string;
  salary: number;
  shift: 'Morning' | 'Evening' | 'Full Day';
  status: 'Active' | 'Inactive';
  joiningDate: string;
  assignedMembersCount?: number;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Utilities'
  | 'Equipment'
  | 'Maintenance'
  | 'Salaries'
  | 'Marketing'
  | 'Misc';

export interface Expense {
  id: string; // e.g. "EXP-2001"
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export type ReminderType = 'Fee Reminder' | 'Expiry Reminder' | 'Expired Notice' | 'Custom';

export interface ReminderLog {
  id: string;
  memberId: string;
  memberName: string;
  phone: string;
  type: ReminderType;
  message: string;
  sentAt: string;
  status: 'Sent' | 'Failed' | 'Simulated';
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface SystemStats {
  totalMembers: number;
  activeMembers: number;
  expiringMembers: number;
  expiredMembers: number;
  todaysIncome: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  outstandingDues: number;
  netProfit: number;
}
