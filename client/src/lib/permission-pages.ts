// Permission definitions shown on the Roles & Permissions page. Each entry maps
// a permission id to a human readable name and module. These ids are stored in
// the `user_permissions` table when an admin saves rights for a user.
export type PermissionDef = {
  id: string;
  name: string;
  module: string;
};

export const PERMISSION_DEFS: PermissionDef[] = [
  { id: '13309', name: 'Country', module: 'Area' },
  { id: '13310', name: 'City', module: 'Area' },
  { id: '13311', name: 'Locality', module: 'Area' },
  { id: '13312', name: 'Sublocality', module: 'Area' },
  { id: '13313', name: 'Package', module: 'Subscribers Profile' },
  { id: '13314', name: 'Box/Media', module: 'Subscribers Profile' },
  { id: '13315', name: 'Subscribers Details', module: 'Subscribers Profile' },
  { id: '13316', name: 'New Queries', module: 'Subscribers Profile' },
  { id: '13351', name: 'Subscriber Location', module: 'Subscribers Profile' },
  { id: '13318', name: 'Dealers Details', module: 'Dealers Profile' },
  { id: '13317', name: 'Recovery Officer', module: 'Recovery Officer' },
  { id: '13319', name: 'Area Allocation', module: 'Recovery Officer' },
  { id: '13305', name: 'Allocated Collection', module: 'Transactions' },
  { id: '13324', name: 'Transaction Type', module: 'Transactions' },
  { id: '14079', name: 'New Collection', module: 'Transactions' },
  { id: '13308', name: 'Reprint Slip', module: 'Transactions' },
  { id: '13304', name: 'Subscribers Collections', module: 'Transactions' },
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
  { id: '13341', name: 'One Day Accounts', module: 'Accounts' },
  { id: '15313', name: 'Purchase', module: 'Inventory' },
  { id: '15312', name: 'Products', module: 'Inventory' },
  { id: '15309', name: 'Brand', module: 'Inventory' },
  { id: '15311', name: 'Unit Type', module: 'Inventory' },
  { id: '15310', name: 'Vendor', module: 'Inventory' },
  { id: '15321', name: 'Product Type', module: 'Inventory' },
  { id: '15314', name: 'Inventory Status', module: 'Inventory' },
  { id: '15315', name: 'Sales', module: 'Point Of Sale' },
  { id: '15317', name: 'Advance & Loan', module: 'HRM' },
  { id: '15318', name: 'Employee Salary', module: 'HRM' },
  { id: '15324', name: 'Subscriber Wise Attendance', module: 'HRM' },
  { id: '15322', name: 'Day Wise Attendance', module: 'HRM' },
  { id: '15316', name: 'Employee Details', module: 'HRM' },
  { id: '13334', name: 'Deleted Collection', module: 'Logs' },
  { id: '15328', name: 'Update Connections Log', module: 'Logs' },
  { id: '13335', name: 'Deleted Subscribers', module: 'Logs' },
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
  { id: '13331', name: 'Dealers Collection', module: 'Dealers Reports' },
  { id: '13333', name: 'New Dealers List', module: 'Dealers Reports' },
  { id: '13350', name: 'Dealer Invoice List', module: 'Dealers Reports' },
  { id: '13332', name: 'Dealers Defaulter', module: 'Dealers Reports' },
  { id: '13340', name: 'One Day Balance Sheet', module: 'Accounts Reports' },
  { id: '13336', name: 'Accounts Report', module: 'Accounts Reports' },
  { id: '15319', name: 'Abstract Stock', module: 'Stock Reports' },
  { id: '15320', name: 'Abstract Sales', module: 'Sales Reports' },
  { id: '13339', name: 'Change Username/Password', module: 'Settings' },
  { id: '13338', name: 'Subscriber Rights', module: 'Settings' },
  { id: '13337', name: 'Configurations', module: 'Settings' },
  { id: '15334', name: 'Dashboard Summary', module: 'Dashboard' },
];

// Permission id that controls whether a user can see the dashboard summary
// section (subscriber overview + financial metric cards).
export const DASHBOARD_SUMMARY_PERMISSION = '15334';

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
  '13341': ['/accounts/one-day-balance-sheet'],
  '15313': ['/inventory/purchases'],
  '15312': ['/inventory/products'],
  '15309': ['/inventory/brands'],
  '15311': ['/inventory/unit-types'],
  '15310': ['/inventory/vendors'],
  '15321': ['/inventory/product-types'],
  '15314': ['/inventory/statuses'],
  '15315': ['/sales'],
  '15317': ['/hr/advances'],
  '15318': ['/hr/salary'],
  '15324': ['/hr/attendance-subscriber'],
  '15322': ['/hr/attendance-day'],
  '15316': ['/hr/staff'],
  '13334': ['/admin/logs/deleted-collections'],
  '15328': ['/admin/logs/update-connection'],
  '13335': ['/admin/logs/deleted-members'],
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
  '13340': ['/accounts/one-day-balance-sheet'],
  '13336': ['/accounts/account-reports'],
  '15319': ['/reports/abstract-stock'],
  '15320': ['/reports/abstract-sale'],
  '13339': ['/profile'],
  '13338': ['/admin/roles'],
  '13337': ['/admin/settings'],
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
