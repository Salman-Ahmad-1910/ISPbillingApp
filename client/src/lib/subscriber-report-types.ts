export const SUBSCRIBER_REPORT_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'collected', label: 'Collected' },
  { value: 'collected2', label: 'Collected 2' },
  { value: 'system-dates', label: 'Collected-2 System Dates' },
  { value: 'discount', label: 'Collected-3 Discount' },
  { value: 'internet-package-amount', label: 'Collected with internet package amount' },
  { value: 'with-package', label: 'Collected with package' },
  { value: 'sublocality-wise', label: 'Sublocality wise collection' },
  { value: 'package-wise', label: 'Collected Package Wise' },
  { value: 'transaction-wise', label: 'Transaction wise collection' },
  { value: 'balance', label: 'Collected-2 Balance' },
] as const;

export function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value || '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  const h = d.getHours() % 12 || 12;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${pad(d.getDate())}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(2)} ${pad(h)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

export function paymentChannel(method?: string | null): string {
  const m = String(method || '').toLowerCase();
  return m === 'mobile' ? 'Mobile' : 'Web';
}

export type ReportTypeConn = {
  remainingAmount?: number | string | null;
  installationDate?: string | null;
  rechargeDate?: string | null;
  discount?: string | number | null;
  sameDiscount?: string | number | null;
  sameAmount?: number | string | null;
  packageInternet?: string | null;
  packageCable?: string | null;
};

export function parseDateOnly(str?: string | null): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function inDateRange(date: Date | null, from: Date, to: Date): boolean {
  return !!date && date >= from && date <= to;
}

export function hasDiscount(c: ReportTypeConn | null | undefined): boolean {
  const d = String(c?.discount ?? '').trim();
  const sd = String(c?.sameDiscount ?? '').trim();
  return (d !== '' && d !== 'no_discount') || (sd !== '' && sd !== 'no_discount');
}

export function matchesReportType(opts: {
  reportType: string;
  itemDate: Date;
  conn?: ReportTypeConn | null;
  from: Date;
  to: Date;
}): boolean {
  const { reportType, itemDate, conn, from, to } = opts;
  switch (reportType) {
    case 'all':
    case 'collected2':
    case 'sublocality-wise':
    case 'transaction-wise':
      return inDateRange(itemDate, from, to);
    case 'collected':
      return inDateRange(itemDate, from, to) && !!conn && (Number(conn.remainingAmount) || 0) === 0;
    case 'balance':
      return inDateRange(itemDate, from, to) && !!conn && (Number(conn.remainingAmount) || 0) > 0;
    case 'system-dates':
      if (!conn) return false;
      return (
        inDateRange(parseDateOnly(conn.installationDate), from, to) ||
        inDateRange(parseDateOnly(conn.rechargeDate), from, to)
      );
    case 'discount':
      return inDateRange(itemDate, from, to) && !!conn && hasDiscount(conn);
    case 'internet-package-amount':
      return inDateRange(itemDate, from, to);
    case 'with-package':
      return inDateRange(itemDate, from, to) && !!conn && Boolean(conn.packageInternet || conn.packageCable);
    default:
      return inDateRange(itemDate, from, to);
  }
}
