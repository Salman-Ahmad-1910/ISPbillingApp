'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CollectionPaginationProps {
  total: number;
  pageSize: string;
  setPageSize: (v: string) => void;
  currentPage: number;
  setCurrentPage: (n: number) => void;
}

const PAGE_SIZE_OPTIONS = ['10', '50', '100', 'all'];

// Entries-per-page selector + paged footer used on the subscriber collection
// pages. pageSize "all" shows every matching row without slicing.
export function CollectionPagination({
  total,
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
}: CollectionPaginationProps) {
  const isAll = pageSize === 'all';
  const size = isAll ? Math.max(total, 1) : parseInt(pageSize, 10);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const start = total === 0 ? 0 : (currentPage - 1) * (isAll ? 0 : size) + 1;
  const end = Math.min(currentPage * size, total);

  const windowSize = 5;
  let startPage = Math.max(1, currentPage - Math.floor(windowSize / 2));
  let endPage = Math.min(totalPages, startPage + windowSize - 1);
  startPage = Math.max(1, endPage - windowSize + 1);
  const pages: number[] = [];
  for (let p = startPage; p <= endPage; p++) pages.push(p);

  const go = (n: number) => setCurrentPage(Math.min(totalPages, Math.max(1, n)));

  return (
    <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show</span>
        <Select value={pageSize} onValueChange={(v) => { setPageSize(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">entries</span>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {start} to {end} of {total} entries
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => go(currentPage - 1)} disabled={currentPage === 1 || total === 0}>
          Previous
        </Button>
        {pages.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => go(page)}
            className="w-8 h-8 p-0"
          >
            {page}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={() => go(currentPage + 1)} disabled={currentPage === totalPages || total === 0}>
          Next
        </Button>
      </div>
    </div>
  );
}
