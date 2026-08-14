import type { LucideIcon } from 'lucide-react';

// SaaS / Multi-Tenancy
export type Company = {
  id: string;
  name: string;
  logo: string;
  stamp: string;
  contact1: string;
  contact2: string;
  email: string;
  address: string;
  description: string;
  taxRules: string;
  invoiceTemplate: string;
  subscriptionPlan?: 'basic' | 'pro' | 'enterprise';
  subscriptionExpiry?: string;
}

// Basic Nav
export type NavItem = {
  title: string;
  href?: string;
  icon: LucideIcon;
  label?: string;
  items?: NavItem[]; // For nested menus
  permission?: string;
  minimumRole?: string;
  allowedRoles?: string[]; // New property for role-based access
  hidden?: boolean; // Add hidden property
};

export type NavItemGroup = {
  title: string;
  items: NavItem[];
};

// Generic types
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  contact1?: string;
  contact2?: string;
  companyId?: string;
  createdBy?: string;
  createdUsers?: User[];
  // Granted page/feature permissions (permission ids from the Roles & Permissions page)
  permissions?: string[];
  permissionsConfigured?: boolean;
  // Hierarchy properties for display
  level?: number;
  isParent?: boolean;
  isOrphaned?: boolean;
  subUsers?: User[];
  parentId?: string;
  parent?: User;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  companyId?: string;
};

export type LedgerEntry = {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  companyId: string;
  customerId?: string;
};

export type SystemLog = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  companyId?: string;
};

// Network Operations
export type Area = {
  id: string;
  city: string;
  zone: string;
  locality: string;
  subLocality?: string;
  recoveryOfficerId?: string;
  companyId: string;
};

export type OLT = {
  id: string;
  name: string;
  location: string;
  ipAddress: string;
  ports: number;
  popId?: string;
  companyId: string;
};

export type Splitter = {
  id: string;
  name: string;
  oltId: string;
  location: string;
  totalPorts: number;
  availablePorts: number;
  companyId: string;
};

export type DistributionBox = {
  id: string;
  name: string;
  companyId: string;
};

export type Connection = {
  id: string;
  companyId: string;
  internetId: string;
  name: string;
  address?: string;
  cell?: string;
  mobile?: string;
  installationAmount: number;
  otherAmount: number;
  installationDate?: string;
  rechargeDate?: string;
  connectionProvider?: string;
  connectionType: string;
  boxNumber?: string;
  packageCable?: string;
  discount?: string;
  amount: number;
  packageInternet?: string;
  createBalance: boolean;
  balanceDays: number;
  sameDiscount?: string;
  sameAmount: number;
  status: string;
  sublocalityId?: string;
  splitterId?: string;
  splitterPort?: number;
  lastPaymentDate?: string;
  remainingAmount?: number;
  cnic?: string;
  leavingDate?: string;
  deactivationReason?: string;
  comments?: string;
  badDebt?: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type POP = {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  lastOutage?: string;
  companyId: string;
};

export type ConnectionLog = {
  id: string;
  companyId: string;
  connectionId: string;
  subscriberName?: string;
  internetId?: string;
  connectionType?: string;
  actionType?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  remarks?: string;
  updatedBy?: string;
  updatedByName?: string;
  userRole?: string;
  branch?: string;
  ipAddress?: string;
  deviceName?: string;
  logDate?: string;
  logTime?: string;
  createdAt: string;
};

// Subscriber Management
export type Subscriber = {
  id: string;
  subscriber_identity: string;
  name: string;
  cnic: string;
  phone: string;
  installationAddress: string;
  packageId: string;
  packageName: string;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'suspended' | 'inactive' | 'deactivated';
  balance: number;
  deviceInfo?: string;
  areaId: string;
  areaName: string;
  splitterId: string;
  splitterPort: number;
  documents?: string[];
  dealerId?: string;
  collectorId?: string;
  connectionDate: string;
  companyId: string;
};

export type CorporateCustomer = {
  id: string;
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  negotiatedPricing: string;
  contractStartDate: string;
  contractEndDate: string;
  totalConnections: number;
  companyId: string;
};

export type Inquiry = {
  id: string;
  name: string;
  internetId?: string;
  cell?: string;
  mobile?: string;
  address: string;
  installationAmount?: number;
  otherAmount?: number;
  installationDate?: string;
  rechargeDate?: string;
  subLocality?: string;
  connectionType?: string;
  boxNumber?: string;
  packageCable?: string;
  discount?: number;
  amount?: number;
  comments?: string;
  status: 'new' | 'follow-up' | 'converted' | 'closed';
  assignedToId?: string;
  notes?: string;
  createdAt: string;
  companyId: string;
};

// Dealer Management
export type DealerFranchise = {
  id: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  status: 'pending' | 'approved' | 'rejected';
  companyId: string;
};

export type Dealer = {
  id: string;
  name: string;
  phone: string;
  cnic: string;
  address?: string;
  commissionRate: number;
  walletBalance: number;
  companyId: string;
  franchiseId?: string;
  parentDealerId?: string; // If it's a sub-dealer
  areaId?: string;
  areaName?: string;
  lastPaymentDate?: string;
  remainingAmount?: number;
  createdAt: string;
  updatedAt: string;
};

export type DealerCollection = {
  id: string;
  dealerId: string;
  dealerName: string;
  dealerAddress: string;
  amount: number;
  collectionDate: string;
  settlementStatus: 'pending' | 'settled';
  transactionType: 'cash' | 'bank' | 'easypaisa' | 'jazzcash';
  comment: string;
  receivedById: string;
  receivedByName: string;
  companyId: string;
};

// Billing & Recharge
export type Package = {
  id: string;
  packageNumber: number;
  name: string;
  speed: string;
  price: number;
  dataLimit: string;
  companyName: string;
  salePrice: number;
  purchasePrice: number;
  packageType: string;
  companyId: string;
};

export type Invoice = {
  id: string;
  subscriberId: string;
  subscriberName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  billingPeriod: string;
  companyId: string;
  batch?: string;
  // The fields below are not persisted by the backend but are used by the
  // invoice form. They are optional so editing a server-fetched invoice
  // (which omits them) type-checks.
  packageId?: string;
  packageName?: string;
  packagePrice?: number;
  taxAmount?: number;
  totalAmount?: number;
  notes?: string;
  invoiceDate?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
};

export type Payment = {
  id: string;
  billNo?: number;
  invoiceId?: string;
  subscriberId?: string;
  subscriberName: string;
  amount: number;
  paymentDate: string;
  method: 'cash' | 'bank' | 'online' | 'dealer';
  transactionId?: string;
  transactionType?: string;
  collectorId?: string;
  companyId: string;
  address?: string;
  areaName?: string;
  collectedByName?: string;
};

export type CustomBill = {
  id: string;
  subscriberId: string;
  subscriberName: string; // This will be populated by the backend
  amount: number;
  description: string;
  status: 'pending' | 'paid';
  date: string; // Changed from createdAt to date
  createdAt: string; // From TenantModel
  companyId: string;
  dealerId: string;
  subscriber?: Subscriber; // Optional subscriber relationship
};

export type PromiseEntry = {
  id: string;
  companyId: string;
  subscriberId?: string;
  subscriberName?: string;
  internetId?: string;
  phone?: string;
  address?: string;
  sublocality?: string;
  connectionType?: string;
  amount: number;
  promiseDate: string;
  description?: string;
  status: 'pending' | 'completed' | 'overdue';
  collectorId?: string;
  collectorName?: string;
  createdAt: string;
  updatedAt: string;
};

// Recovery
export type RecoveryTransaction = {
  id: string;
  officerId: string;
  date: string;
  description: string;
  type: 'credit' | 'debit';
  amount: number;
  companyId: string;
};

// Support
export type Complaint = {
  id: string;
  subscriberId: string;
  subscriberName: string;
  phone?: string;
  address?: string;
  type?: string;
  subject?: string;
  department?: string;
  priority?: string;
  deadline?: string;
  category: 'network' | 'billing' | 'service';
  description: string;
  status: 'open' | 'done' | 'on-hold' | 'reject' | 'closed';
  assignedToId?: string;
  createdAt: string;
  resolvedAt?: string;
  companyId: string;
};


// HR & Staff
export type StaffQualification = {
  id?: string;
  staffId?: string;
  qualification: string;
  institute: string;
  startDate: string;
  endDate: string;
  obtainedMarks: string;
  grade: string;
  majorSubject: string;
};

export type StaffExperience = {
  id?: string;
  staffId?: string;
  organization: string;
  designation: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type StaffWorkTime = {
  id?: string;
  staffId?: string;
  day: string;
  startTime: string;
  endTime: string;
};

export type StaffDepartment = {
  id: string;
  name: string;
  companyId: string;
};

export type Staff = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  secondaryPhone?: string;
  designation: string;
  department: string;
  salary: number;
  companyId: string;
  areaId?: string;
  gender?: string;
  maritalStatus?: string;
  fatherName?: string;
  nic?: string;
  address?: string;
  basicPay?: number;
  leaveAllow?: number;
  paymentMode?: string;
  bankName?: string;
  accountTitle?: string;
  accountNo?: string;
  appointedDate?: string;
  technical?: string;
  status?: string;
  leaveDate?: string;
  plainPassword?: string;
  cnicFront?: string;
  cnicBack?: string;
  employeeImage?: string;
  cv?: string;
  qualifications?: StaffQualification[];
  experiences?: StaffExperience[];
  workTimes?: StaffWorkTime[];
  createdAt?: string;
  updatedAt?: string;
};

export type RecoveryOfficer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  secondaryPhone?: string;
  areaId?: string;
  status: 'active' | 'inactive';
  companyId: string;
  createdAt: string;
  updatedAt: string;
  target?: number;
  collected?: number;
};

export type SalaryPayment = {
  id: string;
  staffId: string;
  staffName: string;
  month: string;
  year: number;
  salary: number;
  basicPay: number;
  leaveAllow: number;
  otherAllowance: number;
  deduction: number;
  netPay: number;
  paymentMode?: string;
  paidAt?: string;
  companyId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Attendance = {
  id: string;
  staffId: string;
  staffName: string;
  checkIn: string;
  checkOut?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  companyId: string;
};

// Inventory & POS
export type InventoryItem = {
  id: string;
  name: string;
  type: 'router' | 'ont' | 'cable' | 'accessory';
  stock: number;
  price: number;
  status: 'in_stock' | 'assigned' | 'damaged' | 'returned';
  subscriberId?: string;
  companyId: string;
};


export type Expense = {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  companyId: string;
};

// From FinTrack - to be integrated or replaced
export type Customer = {
  id: string;
  name: string;
  cnic: string;
  phone: string;
  city: string;
  status: 'active' | 'inactive' | 'blacklisted';
  totalInvoices: number;
  outstandingBalance: number;
  companyId: string;
};

export type Guarantor = {
  id: string;
  name: string;
  cnic: string;
  phone: string;
  customerId: string;
  customerName: string;
  companyId: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unitType: string;
  taxPercent?: number; // per-item tax %, default 0
  image?: string; // optional product image path
  companyId: string;
  barcode?: string;
  brandId?: string;
  brandName?: string;
  productTypeId?: string;
  productTypeName?: string;
  purchasePrice?: number;
  salePrice?: number;
  discount?: number;
  serialNumber?: string;
};

export type SerialNumberPoolEntry = {
  id: string;
  companyId: string;
  serialNumber: string;
  status: 'available' | 'used';
  productId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Vendor = {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
};

export type VendorInvoice = {
  id: string;
  vendorId: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  batch?: string;
  items: VendorInvoiceItem[];
  createdAt: string;
  updatedAt: string;
  companyId: string;
};

export type VendorInvoiceItem = {
  id: string;
  invoiceId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitType: 'piece' | 'meter';
  subtotal: number;
  serialNumber?: string;
};

export type InstallmentPlan = {
  id: string;
  name: string;
  installments: number;
  percentageIncrease: number;
  companyId: string;
};

export type SubscriberInstallment = {
  id: string;
  saleId: string;
  subscriberId: string;
  subscriberName: string;
  installmentPlanId: string;
  planName: string;
  totalInstallments: number;
  paidInstallments: number;
  installmentAmount: number;
  totalAmount: number;
  nextInstallment: number;
  status: string;
  companyId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type pricingPlans = {
  id: string;
  name: string;
  price: number;
  features: string;
  companyId: string;
}

export type AlertTemplate = {
  id: string;
  companyId: string;
  templateId: string;
  title: string;
  description: string;
  smsEnabled: boolean;
  smsTemplate: string;
  whatsAppEnabled: boolean;
  whatsAppTemplate: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdvanceLoan = {
  id: string;
  staffId: string;
  staffName: string;
  category: 'advance' | 'loan';
  direction: 'issue' | 'return';
  amount: number;
  date: string;
  returnValue: number;
  transactionType: string;
  comments: string;
  description: string;
  repaymentStatus: 'pending' | 'partial' | 'completed';
  companyId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SystemConfig = {
  id: string;
  appName: string;
  defaultCurrency: string;
  autoSuspend: boolean;
  gracePeriod: number;
  invoiceTemplate: string;
  smsGateway: string;
  whatsAppGateway: string;
  invoiceSms: string;
  enable2fa: boolean;
  sessionTimeout: number;
  companyId: string;
};

// Inventory sub-types
export type Brand = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
};

export type UnitType = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
};

export type ProductType = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
};

export type InventoryStatus = {
  id: string;
  name: string;
  label?: string;
  color?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
};

export type Purchase = {
  id: string;
  vendorId: string;
  vendorName: string;
  purchaseNumber: string;
  purchaseDate: string;
  billId: string;
  batch: string;
  totalAmount: number;
  remainingAmount: number;
  discount: number;
  salesTax: number;
  wthTax: number;
  status: 'paid' | 'unpaid' | 'partial';
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
  companyId: string;
};

export type PurchaseItem = {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  unitType: string;
  focNormal: string;
  subtotal: number;
  saleTax: number;
  wthTax: number;
  disc: number;
  expiryDate?: string;
  serialNumber?: string;
};

export type Message = {
  id: string;
  status: 'draft' | 'sent' | 'outbox' | 'new' | 'expired' | 'whatsapp_draft';
  entityId?: string;
  internetId?: string;
  name: string;
  mobileNo?: string;
  phone?: string;
  address?: string;
  messageType?: string;
  messageText?: string;
  sentBy?: string;
  sendedAt?: string;
  sendTo?: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
};

export type MessageTemplate = {
  id: string;
  title: string;
  message: string;
  parameters?: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
};

export type SupportTicket = {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'open' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  companyId: string;
};

export type TransactionType = {
  id: string;
  transaction: string;
  openingBalance: number;
  title: string;
  paymentChannel: string;
  companyId: string;
};
