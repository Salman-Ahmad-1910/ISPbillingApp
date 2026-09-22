// Permission definitions shown on the Roles & Permissions page. Each entry maps
// a permission id to a human readable name and module. These ids are stored in
// the `user_permissions` table when an admin saves rights for a user.
export type PermissionDef = {
  id: string;
  name: string;
  module: string;
};

export const PERMISSION_DEFS: PermissionDef[] = [
  { id: '13309', name: 'Area', module: 'Network' },
  { id: '15365', name: 'POPs', module: 'Network' },
  { id: '15366', name: 'OLTs', module: 'Network' },
  { id: '15367', name: 'Splitters', module: 'Network' },
  { id: '13314', name: 'Box/Media', module: 'Network' },
  { id: '13315', name: 'Subscribers Details', module: 'Subscriber Management' },
  { id: '13316', name: 'New Inquiries', module: 'Subscriber Management' },
  { id: '15368', name: 'Corporate Clients', module: 'Subscriber Management' },
  { id: '13313', name: 'Package', module: 'Subscriber Management' },
  { id: '13351', name: 'Subscriber Location', module: 'Subscriber Management' },
  { id: '13318', name: 'My Dealers', module: 'Dealer Management' },
  { id: '15385', name: 'Dealer Dashboard', module: 'Dealer Management' },
  { id: '13331', name: 'Collections', module: 'Dealer Management' },
  { id: '13332', name: 'Defaulters', module: 'Dealer Management' },
  { id: '13333', name: 'New Dealers', module: 'Dealer Management' },
  { id: '13350', name: 'Invoices', module: 'Dealer Management' },
  { id: '13317', name: 'Recovery Officer', module: 'Recovery Officer' },
  { id: '13319', name: 'Area Assignment', module: 'Recovery Officer' },
  { id: '13305', name: 'Allocated Collection', module: 'Transactions' },
  { id: '13324', name: 'Transaction Type', module: 'Transactions' },
  { id: '14079', name: 'New Collection', module: 'Transactions' },
  { id: '13308', name: 'Reprint Slip', module: 'Transactions' },
  { id: '13304', name: 'Subscribers Collections', module: 'Transactions' },
  { id: '15388', name: 'Collection Search', module: 'Transactions' },
  { id: '15389', name: 'Collection Summary', module: 'Transactions' },
  { id: '13320', name: 'Bills Creator', module: 'Transactions' },
  { id: '13321', name: 'Dealers Collections', module: 'Transactions' },
  { id: '13357', name: 'Baddebt Collection', module: 'Transactions' },
  { id: '15323', name: 'Subject Type', module: 'Complain' },
  { id: '15325', name: 'Complain Type', module: 'Complain' },
  { id: '15326', name: 'Complain Report', module: 'Complain' },
  { id: '13342', name: 'Subscribers Complain', module: 'Complain' },
  { id: '13343', name: 'Allocated Complains', module: 'Complain' },
  { id: '13347', name: 'Draft Messages', module: 'Messages' },
  { id: '13348', name: 'Sent Messages', module: 'Messages' },
  { id: '13359', name: 'Whatsapp Draft Message', module: 'Messages' },
  { id: '13346', name: 'Other Messages', module: 'Messages' },
  { id: '13345', name: 'Expiry Messages', module: 'Messages' },
  { id: '13344', name: 'New Messages', module: 'Messages' },
  { id: '13322', name: 'Account Heads', module: 'Accounts' },
  { id: '13323', name: 'Account Entry', module: 'Accounts' },
  { id: '15387', name: 'Account Entry Filters & Table', module: 'Accounts' },
  { id: '13341', name: 'One Day Accounts', module: 'Accounts' },
  { id: '15309', name: 'Brand', module: 'Inventory' },
  { id: '15311', name: 'Unit Type', module: 'Inventory' },
  { id: '15321', name: 'Product Type', module: 'Inventory' },
  { id: '15312', name: 'Products', module: 'Inventory' },
  { id: '15310', name: 'Vendor', module: 'Inventory' },
  { id: '15372', name: 'Vendor Invoice', module: 'Inventory' },
  { id: '15313', name: 'Purchase', module: 'Inventory' },
  { id: '15314', name: 'Inventory Status', module: 'Inventory' },
  { id: '15373', name: 'Stock', module: 'Inventory' },
  { id: '15315', name: 'Sales', module: 'Sales' },
  { id: '15336', name: 'Customers', module: 'Sales' },
  { id: '15337', name: 'Installment Plans', module: 'Sales' },
  { id: '15338', name: 'Point of Sale', module: 'Sales' },
  { id: '15370', name: 'Guarantors', module: 'Sales' },
  { id: '15316', name: 'Staff', module: 'Human Resources' },
  { id: '15318', name: 'Staff Salary', module: 'Human Resources' },
  { id: '15322', name: 'Staff Attendance', module: 'Human Resources' },
  { id: '15324', name: 'Attendance Report', module: 'Human Resources' },
  { id: '15317', name: 'Advance and Loans', module: 'Human Resources' },
  { id: '15386', name: 'System Log', module: 'System Logs' },
  { id: '13307', name: 'Allocated Defualters', module: 'Subscribers Reports' },
  { id: '13325', name: 'Subscribers Defaulter', module: 'Subscribers Reports' },
  { id: '13326', name: 'New Subscribers List', module: 'Subscribers Reports' },
  { id: '13328', name: 'Package Wise List', module: 'Subscribers Reports' },
  { id: '13329', name: 'Promise Date Report', module: 'Subscribers Reports' },
  { id: '13330', name: 'Allocated Collections', module: 'Subscribers Reports' },
  { id: '13355', name: 'Month Wise Collection', module: 'Subscribers Reports' },
  { id: '13349', name: 'Expiry Wise Defaulter', module: 'Subscribers Reports' },
  { id: '13356', name: 'Collection Not Generated', module: 'Subscribers Reports' },
  { id: '13354', name: 'Monthly Collection Month Wise', module: 'Subscribers Reports' },
  { id: '13358', name: 'Unpaid Collection', module: 'Subscribers Reports' },
  { id: '13306', name: 'Subscriber Collections', module: 'Subscribers Reports' },
  { id: '13353', name: 'Month Wise Defualter', module: 'Subscribers Reports' },
  { id: '13327', name: 'Deactivate Subscriber List', module: 'Subscribers Reports' },
  { id: '15327', name: 'Subscribers Creator Summary', module: 'Subscribers Reports' },
  { id: '15329', name: 'New Subscribers List', module: 'Subscribers Reports' },
  { id: '15330', name: 'Subscribers Defaulters', module: 'Subscribers Reports' },
  { id: '15331', name: 'Allocated Collections', module: 'Subscribers Reports' },
  { id: '15332', name: 'Month Wise Collection Monthly', module: 'Subscribers Reports' },
  { id: '13336', name: 'Accounts Report', module: 'Accounts' },
  { id: '15319', name: 'Abstract Stock', module: 'Stock Reports' },
  { id: '15320', name: 'Abstract Sales', module: 'Sales Reports' },
  { id: '15376', name: 'My Company Profile', module: 'Administration' },
  { id: '13338', name: 'Roles & Permissions', module: 'Administration' },
  { id: '13337', name: 'System Config', module: 'Administration' },
  { id: '15334', name: 'Dashboard Summary', module: 'Dashboard' },
  { id: '15384', name: 'Dashboard', module: 'Dashboard' },
  { id: '15362', name: 'Add / Create', module: 'CRUD' },
  { id: '15363', name: 'Update / Edit', module: 'CRUD' },
  { id: '15364', name: 'Delete', module: 'CRUD' },

  // Sidebar pages (added to cover every nav page without a permission).
  { id: '15371', name: 'Replaced Products', module: 'Sales' },
  { id: '15378', name: 'Drivers', module: 'Downloads' },
  { id: '15379', name: 'Application', module: 'Downloads' },
  { id: '15380', name: 'Pending Subscribers', module: 'Subscribers Reports' },
  { id: '15381', name: 'Advance Subscribers', module: 'Subscribers Reports' },
  { id: '15382', name: 'Not Generated Collections', module: 'Subscribers Reports' },
  { id: '15383', name: 'Unpaid Collections', module: 'Subscribers Reports' },
];

// Permission id that controls whether a user can see the dashboard summary
// section (subscriber overview + financial metric cards).
export const DASHBOARD_SUMMARY_PERMISSION = '15334';

// Permission id that controls whether a user can see the search bar on the
// Subscriber Collections page. When unchecked, the search bar is hidden.
export const COLLECTION_SEARCH_PERMISSION = '15388';

// Permission id that controls whether a user can see the four summary cards on
// the Subscriber Collections page (Total Subscribers, Total Collected, Pending
// Subscribers, Pending Amount). Replaces the previous per-card permissions.
export const COLLECTION_SUMMARY_PERMISSION = '15389';

// Permission id that controls whether a user can create/add records anywhere
// in the app. When this is granted (web checkbox selected on the Roles &
// Permissions page), Add/Create buttons are visible; otherwise they are hidden.
export const CAN_CREATE_PERMISSION = '15362';

// Permission id that controls whether a user can update/edit records anywhere
// in the app. Hides Edit/Update buttons when not granted.
export const CAN_UPDATE_PERMISSION = '15363';

// Permission id that controls whether a user can delete records anywhere in
// the app. Hides Delete buttons when not granted.
export const CAN_DELETE_PERMISSION = '15364';

// Feature-level permission check for a numeric permission id stored on the
// user (user.permissions / grantedPermissions). When an admin has NOT
// configured per-user permissions, features remain visible to everyone. Admin
// roles always see everything.
export function hasFeaturePermission(
  grantedPermissions: string[],
  permissionsConfigured: boolean,
  isAdmin: boolean,
  id: string,
): boolean {
  if (isAdmin) return true;
  if (!permissionsConfigured) return true;
  return (grantedPermissions || []).includes(id);
}

// Map a permission id to the page(s) it unlocks. Pages that are always available
// (e.g. Dashboard, Support) do not appear here and are never filtered out.
export const PERMISSION_PAGES: Record<string, string[]> = {
  '13309': ['/network/areas'],
  '13310': ['/network/areas'],
  '13311': ['/network/areas'],
  '13312': ['/network/areas'],
  '13313': ['/crm/packages'],
  '13314': ['/network/boxes'],
  '13315': ['/crm/subscriber-detail'],
  '13316': ['/subscribers/inquiries'],
  '13351': ['/crm/subscriber-detail'],
  '13318': ['/franchise/my-dealers'],
  '15385': ['/franchise/my-dealers/dashboard'],
  '13317': ['/recovery-officers-management/officers'],
  '13319': ['/recovery-officers-management/areas'],
  '13305': ['/transaction/allocated-collections'],
  '13324': ['/transaction/transaction-type'],
  '14079': ['/transaction/user-collections'],
  '13308': ['/transaction/user-collections'],
  '13304': ['/transaction/user-collections'],
  '13320': ['/transaction/bill-creator'],
  '13321': ['/transaction/dealers-collections'],
  '13357': ['/transaction/bad-debt-collections'],
  '15323': ['/support/complaints/subject-type'],
  '15325': ['/support/complaints/complaint-type'],
  '15326': ['/support/complaints/report'],
  '13342': ['/support/complaints/user'],
  '13343': ['/support/complaints/allocated'],
  '13347': ['/messages/draft'],
  '13348': ['/messages/sent'],
  '13359': ['/messages/whatsapp-draft'],
  '13346': ['/messages/other'],
  '13345': ['/messages/expired'],
  '13344': ['/messages/new'],
  '13322': ['/accounts/account-head'],
  '13323': ['/accounts/account-entry'],
  '15387': ['/accounts/account-entry'],
  '13341': ['/accounts/one-day-balance-sheet'],
  '15313': ['/inventory/purchases'],
  '15312': ['/inventory/products'],
  '15309': ['/inventory/brands'],
  '15311': ['/inventory/unit-types'],
  '15310': ['/inventory/vendors'],
  '15321': ['/inventory/product-types'],
  '15314': ['/inventory/statuses'],
  '15315': ['/sales'],
  '15336': ['/sales/customers', '/crm/customers'],
  '15337': ['/sales/installment-plans'],
  '15338': ['/inventory/pos'],
  '15317': ['/hr/advances'],
  '15318': ['/hr/salary'],
  '15324': ['/hr/attendance-subscriber'],
  '15322': ['/hr/attendance-day'],
  '15316': ['/hr/staff'],
  '15386': ['/admin/logs'],
  '13307': ['/subscriber-reports/allocated-defaulters'],
  '13325': ['/subscriber-reports/month-defaulters'],
  '13326': ['/subscriber-reports/collections'],
  '13328': ['/subscriber-reports/package-wise'],
  '13329': ['/subscriber-reports/promise-dates'],
  '13330': ['/subscriber-reports/collections'],
  '13355': ['/subscriber-reports/monthly-collections'],
  '13349': ['/subscriber-reports/expiry-defaulters'],
  '13356': ['/subscriber-reports/collections'],
  '13354': ['/subscriber-reports/monthly-collections'],
  '13358': ['/subscriber-reports/collections'],
  '13306': ['/subscriber-reports/collections'],
  '13353': ['/subscriber-reports/month-defaulters'],
  '13327': ['/subscriber-reports/deactivated-users'],
  '15327': ['/subscriber-reports/creator-summary'],
  '15329': ['/subscriber-reports/new-subscribers'],
  '15330': ['/subscriber-reports/subscribers-defaulters'],
  '15331': ['/subscriber-reports/allocated-collections'],
  '15332': ['/subscriber-reports/monthwise-collection-monthly'],
  '13331': ['/dealer/reports/collections'],
  '13333': ['/dealer/reports/new-dealers'],
  '13350': ['/dealer/reports/invoices'],
  '13332': ['/dealer/reports/defaulters'],
  '13336': ['/accounts/account-reports'],
  '15319': ['/reports/abstract-stock'],
  '15320': ['/reports/abstract-sale'],
  '13338': ['/admin/roles'],
  '13337': ['/admin/settings'],
  '15384': ['/dashboard'],

  // Newly added sidebar page permissions (do not conflict with above).
  '15365': ['/network/pop'],
  '15366': ['/network/olt'],
  '15367': ['/network/splitters'],
  '15368': ['/subscribers/corporate'],
  '15370': ['/crm/guarantors'],
  '15371': ['/sales/replaced'],
  '15372': ['/inventory/vendor-invoices'],
  '15373': ['/inventory/stock'],
  '15376': ['/admin/company-profile'],
  '15378': ['/drivers'],
  '15379': ['/applications'],
  '15380': ['/collection/pending-subscribers'],
  '15381': ['/collection/advance-subscribers'],
  '15382': ['/subscriber-reports/not-generated-collections'],
  '15383': ['/subscriber-reports/unpaid-collections'],
};

// Compute the set of hrefs the user is allowed to see based on their granted
// permission ids. Pages in `alwaysAllowed` are never filtered out.
const ALWAYS_ALLOWED = ['/dashboard'];

export function getAllowedHrefs(permissionIds: string[]): Set<string> {
  const hrefs = new Set<string>(ALWAYS_ALLOWED);
  (permissionIds || []).forEach((id) => {
    (PERMISSION_PAGES[id] || []).forEach((href) => hrefs.add(href));
  });
  return hrefs;
}
