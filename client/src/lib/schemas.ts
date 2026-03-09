import { z } from 'zod';

export const companySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  contact1: z.string().min(1, 'Primary contact is required'),
  contact2: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  description: z.string().optional(),
  taxRules: z.string().optional(),
  invoiceTemplate: z.string().optional(),
  logo: z.string().optional(),
  role: z.enum(['owner', 'manager']).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
}).refine((data) => {
  // role and password are required for new companies (no id)
  if (!data.id) {
    if (!data.role) return false;
    if (!data.password || data.password.trim() === '') return false;
  }
  return true;
}, {
  message: "Role and password are required for new companies",
  path: ["role", "password"],
});

export const dealerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  cnic: z.string().min(1, 'CNIC is required'),
  commissionRate: z.coerce.number().min(0, 'Commission must be a positive number'),
  parentDealerId: z.string().optional(),
}).refine((data) => {
  // Email and Password are required only for new dealers
  if (!data.id) {
    if (!data.email || data.email.trim() === '') return false;
    if (!data.password || data.password.trim() === '') return false;
  }
  return true;
}, {
  message: "Email and Password are required for new dealers",
  path: ["email"], // This will attach the error to the email field, but we check both
});

export const expenseSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
});

export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  stock: z.coerce.number().min(0, 'Stock must be a positive number'),
});

export const packageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Package name is required'),
  speed: z.string().min(1, 'Speed is required'),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  dataLimit: z.string().min(1, 'Data limit is required'),
});

export const areaSchema = z.object({
  id: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  zone: z.string().min(1, 'Zone is required'),
  locality: z.string().min(1, 'Locality is required'),
  subLocality: z.string().nullable().optional(),
  recoveryOfficerId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
});

export const popSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'POP name is required'),
  location: z.string().min(1, 'Location is required'),
  status: z.enum(['online', 'offline']),
  companyId: z.string().optional(),
});

export const oltSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "OLT name is required"),
  location: z.string().min(1, "Location is required"),
  ipAddress: z.string().ip({ version: "v4", message: "Invalid IP address" }),
  ports: z.coerce.number().int().positive("Ports must be a positive number"),
  companyId: z.string().optional(),
});

export const splitterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Splitter name is required"),
  location: z.string().min(1, "Location is required"),
  oltId: z.string().min(1, "OLT ID is required"),
  totalPorts: z.coerce.number().int().positive("Total ports must be a positive number"),
  availablePorts: z.coerce.number().int().min(0, "Available ports cannot be negative"),
  companyId: z.string().optional(),
}).refine(data => data.availablePorts <= data.totalPorts, {
  message: "Available ports cannot exceed total ports",
  path: ["availablePorts"],
});

export const subscriberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  cnic: z.string().min(1, 'CNIC is required'),
  phone: z.string().min(1, 'Phone number is required'),
  installationAddress: z.string().min(1, 'Address is required'),
  packageId: z.string().min(1, 'Package is required'),
  areaId: z.string().min(1, 'Area is required'),
  splitterId: z.string().min(1, 'Splitter is required'),
  splitterPort: z.coerce.number().int().positive('Port must be a positive number'),
  status: z.enum(['active', 'suspended', 'inactive', 'deactivated']),
  balance: z.coerce.number().optional().default(0),
  connectionDate: z.string().min(1, 'Connection date is required'),
  companyId: z.string().optional(),
});

export const inquirySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  status: z.enum(['new', 'follow-up', 'converted', 'closed']),
  notes: z.string().optional(),
  companyId: z.string().optional(),
});

export const corporateCustomerSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().min(1, 'Company name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  contactPhone: z.string().min(1, 'Contact phone is required'),
  negotiatedPricing: z.string().optional(),
  contractStartDate: z.string().min(1, 'Start date is required'),
  contractEndDate: z.string().min(1, 'End date is required'),
  totalConnections: z.coerce.number().int().positive('Must be a positive number'),
  companyId: z.string().optional(),
});

export const customBillSchema = z.object({
  id: z.string().optional(),
  subscriberId: z.string().min(1, 'Subscriber is required'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  status: z.enum(['pending', 'paid']).optional().default('pending'),
});

export const paymentSchema = z.object({
  id: z.string().optional(),
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  subscriberId: z.string().min(1, 'Subscriber is required'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  method: z.enum(['cash', 'bank', 'online', 'dealer']),
  collectorId: z.string().nullable().optional(),
});

export const recoveryTransactionSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['credit', 'debit']),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  officerId: z.string().optional(),
  companyId: z.string().optional(),
});

export const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  cnic: z.string().min(1, 'CNIC is required'),
  phone: z.string().min(1, 'Phone is required'),
  city: z.string().min(1, 'City is required'),
  status: z.enum(['active', 'inactive', 'blacklisted']),
});

export const guarantorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  cnic: z.string().min(1, 'CNIC is required'),
  phone: z.string().min(1, 'Phone is required'),
  customerId: z.string().min(1, 'Customer is required'),
});

export const invoiceSchema = z.object({
  id: z.string().optional(),
  subscriberId: z.string().min(1, 'Subscriber is required'),
  amount: z.coerce.number().min(0, 'Amount must be a positive number'),
  dueDate: z.string().min(1, 'Due date is required'),
  billingPeriod: z.string().min(1, 'Billing period is required, e.g., July 2024'),
  status: z.enum(['pending', 'paid', 'overdue', 'draft']),
});

export const installmentPlanSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Plan name is required'),
  productId: z.string().min(1, 'Product is required'),
  downPayment: z.coerce.number().min(0, 'Down payment must be a non-negative number'),
  installments: z.coerce.number().int().positive('Installments must be a positive integer'),
  installmentAmount: z.coerce.number().min(0, 'Installment amount must be a non-negative number'),
});

export const pricingPlanSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Plan name is required'),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  features: z.string().min(1, 'Please provide at least one feature, one per line.'),
});

export const inventoryItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  type: z.enum(['router', 'ont', 'cable', 'accessory']),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  price: z.coerce.number().min(0, "Price must be a non-negative number"),
  status: z.enum(['in_stock', 'assigned', 'damaged', 'returned']),
  companyId: z.string().optional(),
});

export const ledgerEntrySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0, "Amount must be non-negative"),
  isCredit: z.boolean(),
}).refine(data => data.amount > 0, {
  message: 'Amount must be greater than 0',
  path: ['amount'],
});

export const complaintSchema = z.object({
  id: z.string().optional(),
  subscriberId: z.string().min(1, 'Subscriber is required'),
  category: z.enum(['network', 'billing', 'service']),
  description: z.string().min(1, 'Description is required'),
  status: z.enum(['open', 'in-progress', 'resolved', 'closed']),
  assignedToId: z.string().optional().or(z.literal('unassigned')),
  companyId: z.string().optional(),
});

export const staffSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone number is required'),
  secondaryPhone: z.string().optional().or(z.literal('')),
  designation: z.string().min(1, 'Designation is required'),
  department: z.enum(['technical', 'recovery', 'sales', 'admin']),
  salary: z.coerce.number().min(0, 'Salary must be a positive number'),
  areaId: z.string().nullable().optional().or(z.literal('unassigned')),
  companyId: z.string().optional(),
}).refine((data) => {
  // For new records (no id), email and password are required
  if (!data.id) {
    if (!data.email || data.email.trim() === '') {
      return false;
    }
    if (!data.password || data.password.trim() === '') {
      return false;
    }
  }
  return true;
}, {
  message: "Email and password are required for new staff members",
  path: ['email', 'password'],
});

export const recoveryOfficerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone number is required'),
  secondaryPhone: z.string().optional(),
  areaId: z.string().nullable().optional(),
  role: z.literal('recovery_officer'),
  companyId: z.string().optional(),
}).refine((data) => {
  // Password is required only for new ones (no id)
  if (!data.id && (!data.password || data.password.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Password is required for new recovery officers",
  path: ["password"],
});

export const attendanceSchema = z.object({
  id: z.string().optional(),
  staffId: z.string().min(1, 'Staff member is required'),
  date: z.string().min(1, 'Date is required'),
  status: z.enum(['present', 'absent', 'late', 'leave']),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  companyId: z.string().optional(),
});

export const advanceLoanSchema = z.object({
  id: z.string().optional(),
  staffId: z.string().min(1, 'Staff member is required'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  repaymentStatus: z.enum(['pending', 'deducted', 'paid']),
  description: z.string().min(1, 'Description is required'),
});

export const dealerFranchiseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Franchise name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  contactPhone: z.string().min(1, 'Contact phone is required'),
  status: z.enum(['pending', 'approved', 'rejected']),
  companyId: z.string().optional(),
});

export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  contact1: z.string().optional(),
  contact2: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  status: z.enum(['active', 'inactive']),
  companyId: z.string().optional(),
}).refine((data) => {
  // Password is required only for new users (no id)
  if (!data.id && !data.password) {
    return false;
  }
  return true;
}, {
  message: "Password is required for new users",
  path: ["password"],
});

export const roleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Role name is required"),
  description: z.string().min(1, "Description is required"),
  permissions: z.string().min(1, "Enter permissions, comma-separated"),
  companyId: z.string().optional(),
});
export const supportTicketSchema = z.object({
  id: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['open', 'closed']).optional().default('open'),
  userId: z.string().optional(),
  companyId: z.string().optional(),
});
