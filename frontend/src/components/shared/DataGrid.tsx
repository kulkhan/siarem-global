import type { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => ReactNode;
}

interface DataGridProps<T extends { id: string }> {
  columns: Column<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize?: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  loading?: boolean;
  selectedId: string | null;
  onRowClick: (row: T) => void;
  onSortChange: (key: string, order: 'asc' | 'desc') => void;
  onPageChange: (page: number) => void;
}

export function DataGrid<T extends { id: string }>({
  columns,
  rows,
  total,
  page,
  pageSize = 20,
  sortBy,
  sortOrder,
  loading = false,
  selectedId,
  onRowClick,
  onSortChange,
  onPageChange,
}: DataGridProps<T>) {
  const { t } = useTranslation();
  const totalPages = Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function handleSort(key: string) {
    if (sortBy === key) {
      onSortChange(key, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(key, 'asc');
    }
  }

  function getPageNumbers(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-border bg-card">
        <table className="w-full text-[0.9375rem]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3.5 font-semibold text-foreground whitespace-nowrap select-none',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    !col.align && 'text-left',
                    col.width,
                    col.sortable && 'cursor-pointer hover:bg-accent transition-colors'
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="text-muted-foreground">
                        {sortBy === col.key ? (
                          sortOrder === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-primary" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>{t('common.loading')}</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-muted-foreground">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row)}
                  className={cn(
                    'border-b cursor-pointer transition-colors',
                    selectedId === row.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 ring-1 ring-inset ring-blue-300'
                      : 'border-border hover:bg-accent/50'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3.5',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        selectedId === row.id ? 'text-blue-900 dark:text-blue-200 font-medium' : 'text-foreground'
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between pt-3 shrink-0">
          <span className="text-sm text-muted-foreground">
            {from}–{to} / {total}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {getPageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`dot-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'min-w-[2rem] h-8 px-2 rounded-md text-sm font-medium transition-colors',
                    p === page
                      ? 'bg-primary text-white'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
