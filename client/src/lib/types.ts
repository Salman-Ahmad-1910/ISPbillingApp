import type { LucideIcon } from 'lucide-react';

// SaaS / Multi-Tenancy
export type Company = {
  id: string;
  name: string;
  logo: string;
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
  href: string;
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
  splitterId: string;
  location: string;
  companyId: string;
};

export type POP = {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  lastOutage?: string;
  companyId: string;
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
  phone: string;
  address: string;
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
  commissionRate: number;
  walletBalance: number;
  companyId: string;
  franchiseId?: string;
  parentDealerId?: string; // If it's a sub-dealer
};

export type DealerCollection = {
  id: string;
  dealerId: string;
  dealerName: string;
  subscriberId: string;
  subscriberName: string;
  amount: number;
  collectionDate: string;
  settlementStatus: 'pending' | 'settled';
  companyId: string;
};

// Billing & Recharge
export type Package = {
  id: string;
  name: string;
  speed: string;
  price: number;
  dataLimit: string;
  companyId: string;
};

export type Invoice = {
  id: string;
  subscriberId: string;
  subscriberName: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  billingPeriod: string;
  companyId: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  subscriberId: string;
  subscriberName: string;
  amount: number;
  paymentDate: string;
  method: 'cash' | 'bank' | 'online' | 'dealer';
  collectorId?: string;
  companyId: string;
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
  category: 'network' | 'billing' | 'service';
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  assignedToId?: string;
  createdAt: string;
  resolvedAt?: string;
  companyId: string;
};


// HR & Staff
export type Staff = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  secondaryPhone?: string;
  designation: string;
  department: 'technical' | 'recovery' | 'sales' | 'admin';
  salary: number;
  companyId: string;
  areaId?: string;
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
  unitType: 'piece' | 'meter';
  companyId: string;
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
};

export type InstallmentPlan = {
  id: string;
  name: string;
  productId: string;
  productName: string;
  downPayment: number;
  installments: number;
  installmentAmount: number;
  totalAmount: number;
  companyId: string;
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
  amount: number;
  date: string;
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
