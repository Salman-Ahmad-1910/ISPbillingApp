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
  { id: '15391', name: 'Fiber Jointing', module: 'Sales' },
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
  { id: '15390', name: 'Charts & Activity', module: 'Dashboard' },
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

// Sidebar folders, in the exact order they appear in the navigation, mapped to
// the permission modules they own. The Roles & Permissions page uses this to
// filter the permission table down to a single folder. `modules` is empty for
// the "all" entry, which means every module.
export type PermissionFolder = {
  id: string;
  name: string;
  modules: string[];
};

export const ALL_FOLDERS_ID = 'all';

export const PERMISSION_FOLDERS: PermissionFolder[] = [
  { id: ALL_FOLDERS_ID, name: 'All Folders', modules: [] },
  { id: 'dashboard', name: 'Dashboard', modules: ['Dashboard'] },
  { id: 'network', name: 'Network', modules: ['Network'] },
  { id: 'messages', name: 'Messages', modules: ['Messages'] },
  { id: 'subscribers-management', name: 'Subscribers Management', modules: ['Subscriber Management'] },
  { id: 'sales', name: 'Sales', modules: ['Sales'] },
  { id: 'transaction', name: 'Transaction', modules: ['Transactions'] },
  { id: 'dealer-management', name: 'Dealer Management', modules: ['Dealer Management'] },
  { id: 'inventory', name: 'Inventory', modules: ['Inventory'] },
  { id: 'accounts', name: 'Accounts', modules: ['Accounts'] },
  { id: 'stock-report', name: 'Stock Report', modules: ['Stock Reports'] },
  { id: 'sale-report', name: 'Sale Report', modules: ['Sales Reports'] },
  { id: 'complaints', name: 'Complaints', modules: ['Complain'] },
  { id: 'recovery-officers', name: 'Recovery Officers', modules: ['Recovery Officer'] },
  { id: 'human-resources', name: 'Human Resources', modules: ['Human Resources'] },
  { id: 'administration', name: 'Administration', modules: ['Administration'] },
  { id: 'system-log', name: 'System Log', modules: ['System Logs'] },
  { id: 'subscriber-reports', name: 'Subscriber Reports', modules: ['Subscribers Reports'] },
  { id: 'downloads', name: 'Downloads', modules: ['Downloads'] },
  { id: 'general-actions', name: 'General Actions', modules: ['CRUD'] },
];

// Permission id that controls whether a user can see the graphs, recent
// payments and open complaints widgets on the Dashboard page.
export const DASHBOARD_CHARTS_PERMISSION = '15390';

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
  '15391': ['/fiber-jointing'],
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

// --- Per-page child permissions ---------------------------------------------
// A page-level permission (e.g. "Area") can own finer-grained children that
// control the individual features and buttons on that page. Child ids are
// derived from the parent id ("13309:create") so they can never collide with
// the legacy numeric permission ids and stay self-describing in the database.

// Page permission ids that own children.
export const AREA_PERMISSION = '13309';
export const POP_PERMISSION = '15365';
export const OLT_PERMISSION = '15366';
export const SPLITTER_PERMISSION = '15367';
export const BOX_MEDIA_PERMISSION = '13314';
export const SUBSCRIBER_DETAIL_PERMISSION = '13315';
export const INQUIRIES_PERMISSION = '13316';
export const CORPORATE_CLIENTS_PERMISSION = '15368';
export const PACKAGE_PERMISSION = '13313';
export const RECOVERY_OFFICER_PERMISSION = '13317';
export const AREA_ASSIGNMENT_PERMISSION = '13319';
export const SALES_CUSTOMERS_PERMISSION = '15336';
export const GUARANTORS_PERMISSION = '15370';
export const INSTALLMENT_PLANS_PERMISSION = '15337';
// Point of Sale. The id is the same as the POS page entry added on the remote
// branch; one constant only, so the PAGE_PERMISSIONS key is unambiguous.
export const POS_PERMISSION = '15338';
export const BRAND_PERMISSION = '15309';
export const VENDOR_PERMISSION = '15310';
export const UNIT_TYPE_PERMISSION = '15311';
export const PRODUCT_PERMISSION = '15312';
export const PRODUCT_TYPE_PERMISSION = '15321';
export const VENDOR_INVOICE_PERMISSION = '15372';
// Collection pages. Each owns a Summary and a Search child.
export const SUBSCRIBER_COLLECTION_PERMISSION = '13304';
export const DEALER_COLLECTION_PERMISSION = '13321';
export const ALLOCATED_COLLECTION_PERMISSION = '13305';
export const BADDEBT_COLLECTION_PERMISSION = '13357';
export const TRANSACTION_TYPE_PERMISSION = '13324';
export const BILL_CREATOR_PERMISSION = '13320';
// My Dealer list (franchise) and its dashboard. Both parents already exist and
// already map to their routes, so existing grants keep working unchanged.
export const MY_DEALER_PERMISSION = '13318';
export const DEALER_DASHBOARD_PERMISSION = '15385';
// Dealer > Reports: Collections, Defaulters, New Dealers, Invoices. All four
// share one filters / summary / export child set.
export const REPORT_COLLECTION_PERMISSION = '13331';
export const REPORT_DEFAULTER_PERMISSION = '13332';
export const REPORT_NEW_DEALER_PERMISSION = '13333';
export const REPORT_INVOICE_PERMISSION = '13350';
export const REPORT_ABSTRACT_STOCK_PERMISSION = '15319';
export const REPORT_ABSTRACT_SALE_PERMISSION = '15320';

// --- Subscriber Reports ------------------------------------------------------
// PERMISSION_PAGES maps five different permission ids onto
// /subscriber-reports/collections, two onto month-defaulters and two onto
// monthly-collections. Any one of those ids independently unlocks its route, so
// each of them needs its own children, and each page must resolve its feature
// permissions against ALL of its ids. Passing the array to usePagePermissions
// makes `can` true when any one of them grants the child, so a user granted only
// one of the aliases keeps the controls.
export const SUBSCRIBER_REPORT_COLLECTIONS_PERMISSIONS = ['13326', '13330', '13356', '13358', '13306'];
export const SUBSCRIBER_REPORT_ALLOCATED_DEFAULTERS_PERMISSIONS = ['13307'];
export const SUBSCRIBER_REPORT_MONTH_DEFAULTERS_PERMISSIONS = ['13325', '13353'];
export const SUBSCRIBER_REPORT_PACKAGE_WISE_PERMISSIONS = ['13328'];
export const SUBSCRIBER_REPORT_PROMISE_DATES_PERMISSIONS = ['13329'];
export const SUBSCRIBER_REPORT_MONTHLY_COLLECTIONS_PERMISSIONS = ['13355', '13354'];
export const SUBSCRIBER_REPORT_EXPIRY_DEFAULTERS_PERMISSIONS = ['13349'];
export const SUBSCRIBER_REPORT_DEACTIVATED_USERS_PERMISSIONS = ['13327'];
export const SUBSCRIBER_REPORT_CREATOR_SUMMARY_PERMISSIONS = ['15327'];
export const SUBSCRIBER_REPORT_NEW_SUBSCRIBERS_PERMISSIONS = ['15329'];
export const SUBSCRIBER_REPORT_SUBSCRIBERS_DEFAULTERS_PERMISSIONS = ['15330'];
export const SUBSCRIBER_REPORT_ALLOCATED_COLLECTIONS_PERMISSIONS = ['15331'];
export const SUBSCRIBER_REPORT_MONTHWISE_COLLECTION_MONTHLY_PERMISSIONS = ['15332'];
export const SUBSCRIBER_REPORT_NOT_GENERATED_COLLECTIONS_PERMISSIONS = ['15382'];
export const SUBSCRIBER_REPORT_UNPAID_COLLECTIONS_PERMISSIONS = ['15383'];
export const SUBSCRIBER_REPORT_PENDING_SUBSCRIBERS_PERMISSIONS = ['15380'];
export const SUBSCRIBER_REPORT_ADVANCE_SUBSCRIBERS_PERMISSIONS = ['15381'];

// --- Pages that gained Create / Update / Delete children --------------------
// Each id below is a page that already had a top-level permission but no
// per-operation children, so its Add / Edit / Delete buttons used to be gated
// only by the app-wide CRUD switches. They now declare children so each page can
// be granted its own operations.

// Complain
export const COMPLAINT_SUBJECT_PERMISSION = '15323';
export const COMPLAINT_TYPE_PERMISSION = '15325';
export const COMPLAINTS_USER_PERMISSION = '13342';
export const COMPLAINTS_ALLOCATED_PERMISSION = '13343';

// Messages. Sent Messages (13348) is a read-only viewer and declares no
// children, matching the fact that it renders no Add / Edit / Delete control.
export const MESSAGE_DRAFT_PERMISSION = '13347';
export const MESSAGE_WHATSAPP_DRAFT_PERMISSION = '13359';
export const MESSAGE_OTHER_PERMISSION = '13346';
export const MESSAGE_EXPIRED_PERMISSION = '13345';
export const MESSAGE_NEW_PERMISSION = '13344';

// Accounts
export const ACCOUNT_HEAD_PERMISSION = '13322';
export const ACCOUNT_ENTRY_PERMISSION = '13323';
export const ONE_DAY_BALANCE_PERMISSION = '13341';

// Inventory / Sales. Inventory Status (15314) and Stock (15373) are read-only
// reports and declare no children.
export const PURCHASE_PERMISSION = '15313';
export const SALES_PERMISSION = '15315';
export const FIBER_JOINTING_PERMISSION = '15391';

// Human Resources. Attendance Report (15324) is read-only and declares no
// children.
export const STAFF_PERMISSION = '15316';
export const STAFF_SALARY_PERMISSION = '15318';
export const STAFF_ATTENDANCE_PERMISSION = '15322';
export const ADVANCE_LOAN_PERMISSION = '15317';

export type CrudAction = 'create' | 'update' | 'delete';

export type PageChildPermission = {
  key: string;
  label: string;
};

// The three CRUD children shared by most pages.
export const CRUD_CHILDREN: PageChildPermission[] = [
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
];

// Subset shapes for pages that only expose part of CRUD. A page must only
// declare an action it actually renders, otherwise the Roles page grows a
// checkbox that controls nothing and the operator cannot tell which pages
// support which operation at a glance.

// Update + Delete, no Add: Allocated Complains (an officer-assigned queue),
// One Day Balance Sheet (a ledger report with inline row edit/delete) and the
// Sales list (rows are created by Point of Sale, so the list has no Add button).
export const UPDATE_DELETE_CHILDREN: PageChildPermission[] = [
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
];

// Create + Delete, no Edit: the message lists, whose row action is a read-only
// preview, so there is nothing to update in place.
export const CREATE_DELETE_CHILDREN: PageChildPermission[] = [
  { key: 'create', label: 'Create' },
  { key: 'delete', label: 'Delete' },
];

// Create + Update, no Delete: Staff Attendance saves whole-day attendance
// upserts and never removes a record.
export const CREATE_UPDATE_CHILDREN: PageChildPermission[] = [
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Update' },
];

// Delete only: WhatsApp Draft, Other and Expiry Messages can only discard a
// queued message; sending is governed separately from creation.
export const DELETE_ONLY_CHILDREN: PageChildPermission[] = [
  { key: 'delete', label: 'Delete' },
];

// Create only: Staff Salary pays a salary and offers no edit or delete, since a
// paid salary is a financial record rather than a draft.
export const CREATE_ONLY_CHILDREN: PageChildPermission[] = [
  { key: 'create', label: 'Create' },
];

// Subscriber Detail exposes more than CRUD, so it declares its own set.
export const SUBSCRIBER_DETAIL_CHILDREN: PageChildPermission[] = [
  { key: 'cards', label: 'Cards' },
  { key: 'bulk-edit', label: 'Bulk Edit' },
  { key: 'import-export', label: 'Import / Export' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'status', label: 'Status' },
];

// New Inquiries adds a gate for the summary cards at the top of the page.
export const INQUIRIES_CHILDREN: PageChildPermission[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

// Corporate Clients follows the same shape as New Inquiries.
export const CORPORATE_CLIENTS_CHILDREN: PageChildPermission[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
];

// Packages gates its summary cards and CRUD buttons the same way.
export const PACKAGE_CHILDREN: PageChildPermission[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

// Recovery Officers gates its KPI cards and CRUD actions the same way.
export const RECOVERY_OFFICER_CHILDREN: PageChildPermission[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

// Area Assignment exposes a single feature: the "Select Recovery Officer"
// dropdown. Without it the whole transfer panel below is unreachable, so the
// dropdown is the permission boundary for this page.
export const AREA_ASSIGNMENT_CHILDREN: PageChildPermission[] = [
  { key: 'officer-select', label: 'Select Officer' },
];

// Sales > Customers gates its KPI cards and CRUD actions the same way.
export const SALES_CUSTOMERS_CHILDREN: PageChildPermission[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

// Guarantors and Installment Plans are CRUD-only: their stat cards are not
// exposed as a permission, so only these three children exist.
export const GUARANTORS_CHILDREN: PageChildPermission[] = [
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

export const INSTALLMENT_PLANS_CHILDREN: PageChildPermission[] = [
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

// Point of Sale splits the page into two independent panels. "Order Detail" owns
// the cart and the payment actions, so the payment buttons hang off it instead of
// the app-wide Create switch - taking the global switch away must not stop someone
// from taking money at the till.
export const POS_CHILDREN: PageChildPermission[] = [
  { key: 'products', label: 'Products' },
  { key: 'order-detail', label: 'Order Detail' },
];

// The inventory lookup pages (Brand, Unit Type, Product Type, Product, Vendor)
// all share the same plain CRUD surface, so they reuse one child definition.
export const INVENTORY_CATALOG_CHILDREN: PageChildPermission[] = [
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

// Vendor Invoice mixes the three CRUD actions with two page-only features: the
// print view (reached from the row action menu) and the summary cards at the
// top. "Buy a Product" is the page's create action, so it reuses the CRUD keys.
export const VENDOR_INVOICE_CHILDREN: PageChildPermission[] = [
  { key: 'create', label: 'Buy a Product' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'print', label: 'Print' },
  { key: 'summary', label: 'Summary' },
];

// The four collection pages all show the same pair of regions: a row of summary
// cards and a search bar. Both are gated independently so the numbers can be
// hidden while the search stays usable (and vice versa). The CRUD children below
// then differ per page, matching the row actions each one actually renders.
const COLLECTION_CHILDREN: PageChildPermission[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'search', label: 'Search' },
];

// Subscribers Collections and Dealers Collections both record a payment, edit
// that row and delete it. On Dealers Collections the paid/unpaid settlement is
// the same edit permission, so it needs nothing extra.
const COLLECTION_FULL_CRUD_CHILDREN: PageChildPermission[] = [
  ...COLLECTION_CHILDREN,
  ...CRUD_CHILDREN,
];

// Allocated Collection and Baddebt Collection only ever add a payment; a
// mis-keyed row is corrected from the page that owns the underlying bill, so
// neither page renders a row edit or delete.
const COLLECTION_CREATE_CHILDREN: PageChildPermission[] = [
  ...COLLECTION_CHILDREN,
  { key: 'create', label: 'Create' },
];

// Transaction Type is a plain CRUD lookup table.
export const TRANSACTION_TYPE_CHILDREN: PageChildPermission[] = [
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

// Bills Creator only creates and deletes generated bills; there is no per-bill
// edit because the sheet is regenerated rather than patched.
export const BILL_CREATOR_CHILDREN: PageChildPermission[] = [
  { key: 'create', label: 'Create' },
  { key: 'delete', label: 'Delete' },
];

// My Dealer list. "Change Status" is its own child rather than being folded into
// Edit, because it is a separate confirmation dialog that only writes `status`
// and admins often want to freeze a dealer without allowing field edits.
export const MY_DEALER_CHILDREN: PageChildPermission[] = [
  { key: 'create', label: 'Add' },
  { key: 'update', label: 'Edit' },
  { key: 'change-status', label: 'Change Status' },
  { key: 'delete', label: 'Delete' },
];

// Dealer Dashboard. The selector is a child in its own right because it also
// gates the dealer identity/commission card: hiding one without the other would
// either leak the dealer or strand the summary cards with nothing to describe.
export const DEALER_DASHBOARD_CHILDREN: PageChildPermission[] = [
  { key: 'dealer-select', label: 'Dealer Select' },
  { key: 'summary', label: 'Summary' },
];

// The Dealer > Reports pages and the two Abstract reports share one surface: a
// filter panel, a set of summary cards, and the combined Print / Excel export
// pair. Abstract Stock / Abstract Sales render exactly these three regions and
// no row-level controls, so they take the same child set.
const REPORT_CHILDREN: PageChildPermission[] = [
  { key: 'filters', label: 'Filters' },
  { key: 'summary', label: 'Summary' },
  { key: 'export', label: 'Print / Excel' },
];

export function childPermissionId(parentId: string, key: string): string {
  return `${parentId}:${key}`;
}

// The master (coarse) CRUD switches, used as an app-wide fallback when a page
// has no per-page child permission granted.
const GLOBAL_CRUD_PERMISSION: Record<CrudAction, string> = {
  create: CAN_CREATE_PERMISSION,
  update: CAN_UPDATE_PERMISSION,
  delete: CAN_DELETE_PERMISSION,
};

// Pages that expose their own children instead of relying solely on the global
// CRUD switches. Keyed by the parent page permission id. Adding a page here is
// all that is required to give it per-page control.
export const PAGE_PERMISSIONS: Record<string, { name: string; children: PageChildPermission[] }> = {
  [AREA_PERMISSION]: { name: 'Area', children: CRUD_CHILDREN },
  [POP_PERMISSION]: { name: 'POPs', children: CRUD_CHILDREN },
  [OLT_PERMISSION]: { name: 'OLTs', children: CRUD_CHILDREN },
  [SPLITTER_PERMISSION]: { name: 'Splitters', children: CRUD_CHILDREN },
  [BOX_MEDIA_PERMISSION]: { name: 'Box/Media', children: CRUD_CHILDREN },
  [SUBSCRIBER_DETAIL_PERMISSION]: { name: 'Subscribers Details', children: SUBSCRIBER_DETAIL_CHILDREN },
  [INQUIRIES_PERMISSION]: { name: 'New Inquiries', children: INQUIRIES_CHILDREN },
  [CORPORATE_CLIENTS_PERMISSION]: { name: 'Corporate Clients', children: CORPORATE_CLIENTS_CHILDREN },
  [PACKAGE_PERMISSION]: { name: 'Package', children: PACKAGE_CHILDREN },
  [RECOVERY_OFFICER_PERMISSION]: { name: 'Recovery Officer', children: RECOVERY_OFFICER_CHILDREN },
  [AREA_ASSIGNMENT_PERMISSION]: { name: 'Area Assignment', children: AREA_ASSIGNMENT_CHILDREN },
  [SALES_CUSTOMERS_PERMISSION]: { name: 'Customers', children: SALES_CUSTOMERS_CHILDREN },
  [GUARANTORS_PERMISSION]: { name: 'Guarantors', children: GUARANTORS_CHILDREN },
  [INSTALLMENT_PLANS_PERMISSION]: { name: 'Installment Plans', children: INSTALLMENT_PLANS_CHILDREN },
  [POS_PERMISSION]: { name: 'Point of Sale', children: POS_CHILDREN },
  [BRAND_PERMISSION]: { name: 'Brand', children: INVENTORY_CATALOG_CHILDREN },
  [VENDOR_PERMISSION]: { name: 'Vendor', children: INVENTORY_CATALOG_CHILDREN },
  [UNIT_TYPE_PERMISSION]: { name: 'Unit Type', children: INVENTORY_CATALOG_CHILDREN },
  [PRODUCT_PERMISSION]: { name: 'Products', children: INVENTORY_CATALOG_CHILDREN },
  [PRODUCT_TYPE_PERMISSION]: { name: 'Product Type', children: INVENTORY_CATALOG_CHILDREN },
  [VENDOR_INVOICE_PERMISSION]: { name: 'Vendor Invoice', children: VENDOR_INVOICE_CHILDREN },
  [SUBSCRIBER_COLLECTION_PERMISSION]: { name: 'Subscribers Collections', children: COLLECTION_FULL_CRUD_CHILDREN },
  [DEALER_COLLECTION_PERMISSION]: { name: 'Dealers Collections', children: COLLECTION_FULL_CRUD_CHILDREN },
  [ALLOCATED_COLLECTION_PERMISSION]: { name: 'Allocated Collection', children: COLLECTION_CREATE_CHILDREN },
  [BADDEBT_COLLECTION_PERMISSION]: { name: 'Baddebt Collection', children: COLLECTION_CREATE_CHILDREN },
  [TRANSACTION_TYPE_PERMISSION]: { name: 'Transaction Type', children: TRANSACTION_TYPE_CHILDREN },
  [BILL_CREATOR_PERMISSION]: { name: 'Bills Creator', children: BILL_CREATOR_CHILDREN },
  [MY_DEALER_PERMISSION]: { name: 'My Dealer', children: MY_DEALER_CHILDREN },
  [DEALER_DASHBOARD_PERMISSION]: { name: 'Dealer Dashboard', children: DEALER_DASHBOARD_CHILDREN },
  [REPORT_COLLECTION_PERMISSION]: { name: 'Collection Report', children: REPORT_CHILDREN },
  [REPORT_DEFAULTER_PERMISSION]: { name: 'Defaulter Report', children: REPORT_CHILDREN },
  [REPORT_NEW_DEALER_PERMISSION]: { name: 'New Dealer Report', children: REPORT_CHILDREN },
  [REPORT_INVOICE_PERMISSION]: { name: 'Invoice Report', children: REPORT_CHILDREN },
  [REPORT_ABSTRACT_STOCK_PERMISSION]: { name: 'Abstract Stock', children: REPORT_CHILDREN },
  [REPORT_ABSTRACT_SALE_PERMISSION]: { name: 'Abstract Sales', children: REPORT_CHILDREN },

  // Complain
  [COMPLAINT_SUBJECT_PERMISSION]: { name: 'Subject Type', children: CRUD_CHILDREN },
  [COMPLAINT_TYPE_PERMISSION]: { name: 'Complain Type', children: CRUD_CHILDREN },
  [COMPLAINTS_USER_PERMISSION]: { name: 'Subscribers Complain', children: CRUD_CHILDREN },
  [COMPLAINTS_ALLOCATED_PERMISSION]: { name: 'Allocated Complains', children: UPDATE_DELETE_CHILDREN },

  // Messages
  [MESSAGE_DRAFT_PERMISSION]: { name: 'Draft Messages', children: CREATE_DELETE_CHILDREN },
  [MESSAGE_WHATSAPP_DRAFT_PERMISSION]: { name: 'Whatsapp Draft Message', children: DELETE_ONLY_CHILDREN },
  [MESSAGE_OTHER_PERMISSION]: { name: 'Other Messages', children: DELETE_ONLY_CHILDREN },
  [MESSAGE_EXPIRED_PERMISSION]: { name: 'Expiry Messages', children: DELETE_ONLY_CHILDREN },
  [MESSAGE_NEW_PERMISSION]: { name: 'New Messages', children: CRUD_CHILDREN },

  // Accounts
  [ACCOUNT_HEAD_PERMISSION]: { name: 'Account Heads', children: CRUD_CHILDREN },
  [ACCOUNT_ENTRY_PERMISSION]: { name: 'Account Entry', children: CRUD_CHILDREN },
  [ONE_DAY_BALANCE_PERMISSION]: { name: 'One Day Accounts', children: UPDATE_DELETE_CHILDREN },

  // Inventory / Sales
  [PURCHASE_PERMISSION]: { name: 'Purchase', children: CRUD_CHILDREN },
  [SALES_PERMISSION]: { name: 'Sales', children: UPDATE_DELETE_CHILDREN },
  [FIBER_JOINTING_PERMISSION]: { name: 'Fiber Jointing', children: CRUD_CHILDREN },

  // Human Resources
  [STAFF_PERMISSION]: { name: 'Staff', children: CRUD_CHILDREN },
  [STAFF_SALARY_PERMISSION]: { name: 'Staff Salary', children: CREATE_ONLY_CHILDREN },
  [STAFF_ATTENDANCE_PERMISSION]: { name: 'Staff Attendance', children: CREATE_UPDATE_CHILDREN },
  [ADVANCE_LOAN_PERMISSION]: { name: 'Advance and Loans', children: CRUD_CHILDREN },

  // Subscriber Reports. Every page in this section renders the same three
  // regions: a filter card, a KPI summary grid, and a Print / Excel pair, so
  // they all share REPORT_CHILDREN. These are read-only reports that never
  // mutate a record, hence no CRUD keys. Where one route is unlocked by several
  // permission ids (see the SUBSCRIBER_REPORT_*_PERMISSIONS arrays), every id
  // gets the set so granting any single alias is enough.
  ['13326']: { name: 'New Subscribers List', children: REPORT_CHILDREN },
  ['13330']: { name: 'Allocated Collections', children: REPORT_CHILDREN },
  ['13356']: { name: 'Collection Not Generated', children: REPORT_CHILDREN },
  ['13358']: { name: 'Unpaid Collection', children: REPORT_CHILDREN },
  ['13306']: { name: 'Subscriber Collections', children: REPORT_CHILDREN },
  ['13307']: { name: 'Allocated Defualters', children: REPORT_CHILDREN },
  ['13325']: { name: 'Subscribers Defaulter', children: REPORT_CHILDREN },
  ['13353']: { name: 'Month Wise Defualter', children: REPORT_CHILDREN },
  ['13328']: { name: 'Package Wise List', children: REPORT_CHILDREN },
  ['13329']: { name: 'Promise Date Report', children: REPORT_CHILDREN },
  ['13355']: { name: 'Month Wise Collection', children: REPORT_CHILDREN },
  ['13354']: { name: 'Monthly Collection Month Wise', children: REPORT_CHILDREN },
  ['13349']: { name: 'Expiry Wise Defaulter', children: REPORT_CHILDREN },
  ['13327']: { name: 'Deactivate Subscriber List', children: REPORT_CHILDREN },
  ['15327']: { name: 'Subscribers Creator Summary', children: REPORT_CHILDREN },
  ['15329']: { name: 'New Subscribers List', children: REPORT_CHILDREN },
  ['15330']: { name: 'Subscribers Defaulters', children: REPORT_CHILDREN },
  ['15331']: { name: 'Allocated Collections', children: REPORT_CHILDREN },
  ['15332']: { name: 'Month Wise Collection Monthly', children: REPORT_CHILDREN },
  ['15382']: { name: 'Not Generated Collections', children: REPORT_CHILDREN },
  ['15383']: { name: 'Unpaid Collections', children: REPORT_CHILDREN },
  ['15380']: { name: 'Pending Subscribers', children: REPORT_CHILDREN },
  ['15381']: { name: 'Advance Subscribers', children: REPORT_CHILDREN },
};

// Child permission definitions, derived from PAGE_PERMISSIONS. These are
// stored in `user_permissions` exactly like the top-level ones, but they are
// never listed in PERMISSION_PAGES - reaching the page still requires the
// parent permission.
export const PERMISSION_CHILD_DEFS: (PermissionDef & { parentId: string; key: string; label: string })[] =
  Object.entries(PAGE_PERMISSIONS).flatMap(([parentId, { name, children }]) =>
    children.map(({ key, label }) => ({
      id: childPermissionId(parentId, key),
      name: `${name} - ${label}`,
      module: PERMISSION_DEFS.find(p => p.id === parentId)?.module ?? 'General',
      parentId,
      key,
      label,
    }))
  );

// Every permission id that can be stored for a user: the top-level definitions
// plus their per-page children.
export const ALL_PERMISSION_IDS: string[] = [
  ...PERMISSION_DEFS.map(p => p.id),
  ...PERMISSION_CHILD_DEFS.map(p => p.id),
];

// Children grouped by their parent page permission id.
export const CHILDREN_BY_PARENT: Record<string, typeof PERMISSION_CHILD_DEFS> =
  PERMISSION_CHILD_DEFS.reduce((acc, child) => {
    (acc[child.parentId] ||= []).push(child);
    return acc;
  }, {} as Record<string, typeof PERMISSION_CHILD_DEFS>);

// Resolve whether a page's own child permission is granted. Unlike the CRUD
// helpers there is no global fallback: a feature that only exists on a single
// page (cards, bulk edit, status, ...) is governed purely by that page's child
// permission. Admin/owner roles and users with no per-user configuration always
// pass, matching hasFeaturePermission.
//
// pagePermissionId may be an array when one route is unlocked by several
// permission ids (PERMISSION_PAGES maps five ids onto
// /subscriber-reports/collections, for example). The child is then granted if ANY
// of those parents grants it, so an operator who ticked the boxes under only one
// of the alias permissions still gets the controls.
export function hasPagePermission(
  grantedPermissions: string[],
  permissionsConfigured: boolean,
  isAdmin: boolean,
  pagePermissionId: string | string[],
  key: string,
): boolean {
  const parentIds = Array.isArray(pagePermissionId) ? pagePermissionId : [pagePermissionId];
  return parentIds.some(id =>
    hasFeaturePermission(grantedPermissions, permissionsConfigured, isAdmin, childPermissionId(id, key)),
  );
}

// Resolve whether a CRUD action is allowed on a page, honouring the page's own
// child permission and falling back to the global CRUD switch. Admin/owner
// roles and users with no per-user configuration always pass, matching
// hasFeaturePermission.
export function hasCrudPermission(
  grantedPermissions: string[],
  permissionsConfigured: boolean,
  isAdmin: boolean,
  pagePermissionId: string | undefined,
  action: CrudAction,
): boolean {
  if (pagePermissionId
    && hasFeaturePermission(grantedPermissions, permissionsConfigured, isAdmin, childPermissionId(pagePermissionId, action))) {
    return true;
  }
  return hasFeaturePermission(grantedPermissions, permissionsConfigured, isAdmin, GLOBAL_CRUD_PERMISSION[action]);
}
