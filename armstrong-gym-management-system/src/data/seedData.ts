import { Member, Payment, Attendance, Trainer, Expense, ReminderLog, AdminUser } from '../types';

export const initialAdmin: AdminUser = {
  id: 'ADM-01',
  name: 'Armstrong Gym Admin',
  email: 'admin@armstrong.gym',
  role: 'Super Admin',
};

// Helper for formatting YYYY-MM-DD
const formatDate = (date: Date) => date.toISOString().split('T')[0];

const today = new Date();
const todayStr = formatDate(today);

const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = formatDate(yesterday);

const inFiveDays = new Date(today);
inFiveDays.setDate(inFiveDays.getDate() + 5);
const inFiveDaysStr = formatDate(inFiveDays);

const tenDaysAgo = new Date(today);
tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
const tenDaysAgoStr = formatDate(tenDaysAgo);

const oneMonthAgo = new Date(today);
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
const oneMonthAgoStr = formatDate(oneMonthAgo);

const twoMonthsAgo = new Date(today);
twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
const twoMonthsAgoStr = formatDate(twoMonthsAgo);

const oneMonthFromNow = new Date(today);
oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
const oneMonthFromNowStr = formatDate(oneMonthFromNow);

const sixMonthsFromNow = new Date(today);
sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
const sixMonthsFromNowStr = formatDate(sixMonthsFromNow);

export const initialMembers: Member[] = [
  {
    id: 'GM-001',
    name: 'Tariq Mahmood',
    email: 'tariq.mahmood@example.com',
    phone: '+92 300 1234567',
    gender: 'Male',
    dateOfBirth: '1992-05-14',
    address: 'Block 4, Gulshan-e-Iqbal, Karachi',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    planType: 'Yearly',
    planDurationMonths: 12,
    planCost: 18000,
    amountPaid: 18000,
    remainingBalance: 0,
    startDate: twoMonthsAgoStr,
    expiryDate: sixMonthsFromNowStr,
    status: 'Active',
    trainerId: 'TR-01',
    emergencyContact: '+92 300 0000000',
    notes: 'Focus on strength training & heavy deadlifts with Coach Quadir.',
    createdAt: twoMonthsAgoStr,
  },
  {
    id: 'GM-002',
    name: 'Zainab Fatima',
    email: 'zainab.fatima@example.com',
    phone: '+92 301 9876543',
    gender: 'Female',
    dateOfBirth: '1996-08-22',
    address: 'DHA Phase 5, Lahore',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    planType: 'Quarterly',
    planDurationMonths: 3,
    planCost: 6000,
    amountPaid: 4500,
    remainingBalance: 1500,
    startDate: tenDaysAgoStr,
    expiryDate: inFiveDaysStr, // Expiring soon
    status: 'Expiring',
    trainerId: 'TR-02',
    emergencyContact: '+92 301 0000000',
    notes: 'Cardio & HIIT conditioning enthusiast with Coach Gul.',
    createdAt: tenDaysAgoStr,
  },
  {
    id: 'GM-003',
    name: 'Bilal Ahmed',
    email: 'bilal.ahmed@example.com',
    phone: '+92 302 5551234',
    gender: 'Male',
    dateOfBirth: '1988-11-03',
    address: 'F-7/2, Islamabad',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    planType: 'Monthly',
    planDurationMonths: 1,
    planCost: 2500,
    amountPaid: 2500,
    remainingBalance: 0,
    startDate: twoMonthsAgoStr,
    expiryDate: oneMonthAgoStr, // Expired
    status: 'Expired',
    trainerId: 'TR-03',
    emergencyContact: '+92 302 0000000',
    notes: 'Needs renewal notice sent via WhatsApp.',
    createdAt: twoMonthsAgoStr,
  },
  {
    id: 'GM-004',
    name: 'Ayesha Siddiqui',
    email: 'ayesha.siddiqui@example.com',
    phone: '+92 303 4448888',
    gender: 'Female',
    dateOfBirth: '1995-03-19',
    address: 'PECHS Block 6, Karachi',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    planType: 'Half-Yearly',
    planDurationMonths: 6,
    planCost: 10000,
    amountPaid: 8000,
    remainingBalance: 2000,
    startDate: oneMonthAgoStr,
    expiryDate: oneMonthFromNowStr,
    status: 'Active',
    trainerId: 'TR-04',
    emergencyContact: '+92 303 0000000',
    notes: 'CrossFit and flexibility core goal with Coach Hamza.',
    createdAt: oneMonthAgoStr,
  },
  {
    id: 'GM-005',
    name: 'Usman Khan',
    email: 'usman.khan@example.com',
    phone: '+92 304 7779999',
    gender: 'Male',
    dateOfBirth: '1990-12-01',
    address: 'Gulberg III, Lahore',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    planType: 'Monthly',
    planDurationMonths: 1,
    planCost: 2500,
    amountPaid: 2500,
    remainingBalance: 0,
    startDate: tenDaysAgoStr,
    expiryDate: inFiveDaysStr,
    status: 'Expiring',
    trainerId: 'TR-01',
    emergencyContact: '+92 304 0000000',
    notes: 'Regular morning lifter (6 AM) with Coach Quadir.',
    createdAt: tenDaysAgoStr,
  },
  {
    id: 'GM-006',
    name: 'Maryam Nawaz',
    email: 'maryam.nawaz@example.com',
    phone: '+92 305 2223333',
    gender: 'Female',
    dateOfBirth: '1998-07-11',
    address: 'DHA Phase 2, Islamabad',
    photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
    planType: 'Quarterly',
    planDurationMonths: 3,
    planCost: 6000,
    amountPaid: 6000,
    remainingBalance: 0,
    startDate: todayStr,
    expiryDate: oneMonthFromNowStr,
    status: 'Active',
    trainerId: 'TR-02',
    emergencyContact: '+92 305 0000000',
    notes: 'New member. Orientation completed.',
    createdAt: todayStr,
  },
];

export const initialPayments: Payment[] = [
  {
    id: 'PAY-1001',
    memberId: 'GM-001',
    memberName: 'Tariq Mahmood',
    amount: 18000,
    paymentMethod: 'UPI',
    date: `${twoMonthsAgoStr} 10:30:00`,
    transactionId: 'UPI98723411',
    billUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    verificationStatus: 'Verified',
    verifiedBy: 'Armstrong Admin',
    verifiedAt: `${twoMonthsAgoStr} 10:35:00`,
    notes: 'Full payment for Yearly Plan',
  },
  {
    id: 'PAY-1002',
    memberId: 'GM-002',
    memberName: 'Zainab Fatima',
    amount: 4500,
    paymentMethod: 'Card',
    date: `${tenDaysAgoStr} 14:15:00`,
    transactionId: 'TXN44920192',
    billUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=600&q=80',
    verificationStatus: 'Verified',
    verifiedBy: 'Armstrong Admin',
    verifiedAt: `${tenDaysAgoStr} 14:20:00`,
    notes: 'Partial payment. ₹1,500 balance remaining.',
  },
  {
    id: 'PAY-1003',
    memberId: 'GM-004',
    memberName: 'Ayesha Siddiqui',
    amount: 8000,
    paymentMethod: 'Net Banking',
    date: `${oneMonthAgoStr} 11:00:00`,
    transactionId: 'NB88123004',
    billUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
    verificationStatus: 'Verified',
    verifiedBy: 'Armstrong Admin',
    verifiedAt: `${oneMonthAgoStr} 11:10:00`,
    notes: 'First installment for Half-Yearly plan',
  },
  {
    id: 'PAY-1004',
    memberId: 'GM-006',
    memberName: 'Maryam Nawaz',
    amount: 6000,
    paymentMethod: 'Cash',
    date: `${todayStr} 09:45:00`,
    transactionId: 'CASH-REC-006',
    verificationStatus: 'Verified',
    verifiedBy: 'Armstrong Admin',
    verifiedAt: `${todayStr} 09:46:00`,
    notes: 'Full quarterly plan payment',
  },
  {
    id: 'PAY-1005',
    memberId: 'GM-002',
    memberName: 'Zainab Fatima',
    amount: 1500,
    paymentMethod: 'UPI',
    date: `${todayStr} 08:30:00`,
    transactionId: 'UPI-UTR-908123441',
    billUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    verificationStatus: 'Pending Verification',
    notes: 'Member submitted online receipt for pending quarterly fee clearance.',
  },
];

export const initialAttendance: Attendance[] = [
  {
    id: 'ATT-5001',
    memberId: 'GM-001',
    memberName: 'Tariq Mahmood',
    date: todayStr,
    time: '06:15:20',
    checkInMethod: 'QR Scan',
  },
  {
    id: 'ATT-5002',
    memberId: 'GM-002',
    memberName: 'Zainab Fatima',
    date: todayStr,
    time: '07:05:10',
    checkInMethod: 'QR Scan',
  },
  {
    id: 'ATT-5003',
    memberId: 'GM-005',
    memberName: 'Usman Khan',
    date: todayStr,
    time: '08:30:00',
    checkInMethod: 'Manual',
  },
  {
    id: 'ATT-5004',
    memberId: 'GM-001',
    memberName: 'Tariq Mahmood',
    date: yesterdayStr,
    time: '06:20:15',
    checkInMethod: 'QR Scan',
  },
  {
    id: 'ATT-5005',
    memberId: 'GM-004',
    memberName: 'Ayesha Siddiqui',
    date: yesterdayStr,
    time: '18:45:00',
    checkInMethod: 'Manual',
  },
];

export const initialTrainers: Trainer[] = [
  {
    id: 'TR-01',
    name: 'Quadir',
    phone: '+92 300 9898989',
    email: 'quadir@armstrong.gym',
    specialty: 'Heavy Bodybuilding & Powerlifting',
    salary: 85000,
    shift: 'Morning',
    status: 'Active',
    joiningDate: '2023-01-15',
    assignedMembersCount: 3,
  },
  {
    id: 'TR-02',
    name: 'Gul',
    phone: '+92 301 9797979',
    email: 'gul@armstrong.gym',
    specialty: 'CrossFit, Functional & HIIT',
    salary: 80000,
    shift: 'Evening',
    status: 'Active',
    joiningDate: '2023-06-01',
    assignedMembersCount: 2,
  },
  {
    id: 'TR-03',
    name: 'Yasir',
    phone: '+92 302 9696969',
    email: 'yasir@armstrong.gym',
    specialty: 'Heavy Barbell Technique & Powerbuilding',
    salary: 90000,
    shift: 'Full Day',
    status: 'Active',
    joiningDate: '2022-11-10',
    assignedMembersCount: 2,
  },
  {
    id: 'TR-04',
    name: 'Hamza',
    phone: '+92 303 9595959',
    email: 'hamza@armstrong.gym',
    specialty: 'Fat Loss, Toning & Athletic Nutrition',
    salary: 75000,
    shift: 'Morning',
    status: 'Active',
    joiningDate: '2024-01-05',
    assignedMembersCount: 2,
  },
];

export const initialExpenses: Expense[] = [
  {
    id: 'EXP-2001',
    title: 'Gym Floor Rent - August',
    amount: 135000,
    category: 'Rent',
    date: `${todayStr}`,
    notes: 'Monthly property rent',
  },
  {
    id: 'EXP-2002',
    title: 'Electricity & Aircon Bill',
    amount: 42500,
    category: 'Utilities',
    date: `${tenDaysAgoStr}`,
    notes: 'Power bill for high performance AC units',
  },
  {
    id: 'EXP-2003',
    title: 'Dumbbell Rack Maintenance & Oil',
    amount: 12000,
    category: 'Maintenance',
    date: `${oneMonthAgoStr}`,
    notes: 'Equipment servicing & new cable wires',
  },
];

export const initialReminderLogs: ReminderLog[] = [
  {
    id: 'LOG-3001',
    memberId: 'GM-002',
    memberName: 'Zainab Fatima',
    phone: '+92 301 9876543',
    type: 'Fee Reminder',
    message: 'Dear Zainab Fatima, your remaining balance of ₹1,500 for Armstrong Gym is due. Kindly settle at your earliest.',
    sentAt: `${todayStr} 09:00:00`,
    status: 'Sent',
  },
  {
    id: 'LOG-3002',
    memberId: 'GM-003',
    memberName: 'Bilal Ahmed',
    phone: '+92 302 5551234',
    type: 'Expired Notice',
    message: 'Dear Bilal Ahmed, your Armstrong Gym membership has expired. Renew today to keep your workout streak going!',
    sentAt: `${yesterdayStr} 11:30:00`,
    status: 'Sent',
  },
];
