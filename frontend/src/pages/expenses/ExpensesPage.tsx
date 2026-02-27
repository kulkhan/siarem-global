import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DataGrid, type Column } from '@/components/shared/DataGrid';
import { PageHeader } from '@/components/shared/PageHeader';
import { expensesApi, type Expense, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_TR } from '@/api/expenses';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import ExpenseFormDialog from './ExpenseFormDialog';

function fmt(v: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' ' + currency;
}

type DialogMode = 'add' | 'edit' | null;

export default function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t);
    (handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 350);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page, debouncedSearch, typeFilter, categoryFilter, currencyFilter, sortBy, sortOrder],
    queryFn: () =>
      expensesApi.list({
        page, pageSize: 20,
        search: debouncedSearch || undefined,
        type: typeFilter || undefined,
        category: categoryFilter || undefined,
        currency: currencyFilter || undefined,
        sortBy, sortOrder,
      }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      setSelectedId(null);
      setDeleteTarget(null);
    },
  });

  function handleRowClick(row: Expense) {
    setSelectedId((prev) => (prev === row.id ? null : row.id));
  }

  function handleSortChange(key: string, order: 'asc' | 'desc') {
    setSortBy(key);
    setSortOrder(order);
    setPage(1);
  }

  function handleEdit() {
    if (selectedId) setDialog('edit');
  }

  function handleDeleteClick() {
    const row = data?.data.find((e) => e.id === selectedId);
    if (row) setDeleteTarget(row);
  }

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['expenses'] });
    setDialog(null);
    setSelectedId(null);
  }

  const columns: Column<Expense>[] = [
    {
      key: 'date',
      label: t('expenses.fields.date'),
      sortable: true,
      width: 'w-28',
      render: (row) => (
        <span className="text-sm text-gray-700">{new Date(row.date).toLocaleDateString('tr-TR')}</span>
      ),
    },
    {
      key: 'type',
      label: t('expenses.fields.type'),
      sortable: true,
      width: 'w-28',
      render: (row) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          row.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {row.type === 'INCOME'
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />
          }
          {t(`expenses.type.${row.type}`)}
        </span>
      ),
    },
    {
      key: 'category',
      label: t('expenses.fields.category'),
      sortable: true,
      width: 'w-32',
      render: (row) => row.category
        ? <span className="text-xs text-gray-600">{lang === 'tr' ? (EXPENSE_CATEGORY_TR[row.category] ?? row.category) : row.category}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      key: 'description',
      label: t('expenses.fields.description'),
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-sm text-gray-800">{row.description}</div>
          {row.customer && (
            <div className="text-xs text-gray-400">
              {row.customer.shortCode} — {row.customer.name}
              {row.ship && ` · ${row.ship.name}`}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: t('expenses.fields.amount'),
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className={`font-mono text-sm font-semibold ${row.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
          {row.type === 'INCOME' ? '+' : '−'} {fmt(row.amount, row.currency)}
        </span>
      ),
    },
  ];

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const incomeTotal = data?.incomeTotal ?? 0;
  const expenseTotal = data?.expenseTotal ?? 0;
  const net = data?.net ?? 0;

  return (
    <div className="flex flex-col h-full p-6">
      <PageHeader
        title={t('expenses.title')}
        selectedId={selectedId}
        onAdd={() => setDialog('add')}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <div className="text-xs text-green-600 font-medium">{t('expenses.summary.income')}</div>
            <div className="text-base font-bold text-green-700">{fmt(incomeTotal)}</div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-center gap-3">
          <TrendingDown className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <div className="text-xs text-red-600 font-medium">{t('expenses.summary.expense')}</div>
            <div className="text-base font-bold text-red-700">{fmt(expenseTotal)}</div>
          </div>
        </div>
        <div className={`border rounded-lg px-4 py-3 flex items-center gap-3 ${
          net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'
        }`}>
          <Minus className={`w-5 h-5 shrink-0 ${net >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
          <div>
            <div className={`text-xs font-medium ${net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {t('expenses.summary.net')}
            </div>
            <div className={`text-base font-bold ${net >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              {net >= 0 ? '+' : ''}{fmt(net)}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('expenses.filter.search')}
            className="h-9 pl-3 pr-8 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 w-56"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">{t('expenses.fields.type')}: {t('common.all')}</option>
          <option value="INCOME">{t('expenses.type.INCOME')}</option>
          <option value="EXPENSE">{t('expenses.type.EXPENSE')}</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">{t('expenses.fields.category')}: {t('common.all')}</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {lang === 'tr' ? (EXPENSE_CATEGORY_TR[c] ?? c) : c}
            </option>
          ))}
        </select>

        <select
          value={currencyFilter}
          onChange={(e) => { setCurrencyFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
        >
          <option value="">{t('expenses.fields.currency')}: {t('common.all')}</option>
          <option value="TRY">TRY</option>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
        </select>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0">
        <DataGrid<Expense>
          columns={columns}
          rows={rows}
          total={total}
          page={page}
          pageSize={20}
          sortBy={sortBy}
          sortOrder={sortOrder}
          loading={isLoading}
          selectedId={selectedId}
          onRowClick={handleRowClick}
          onSortChange={handleSortChange}
          onPageChange={setPage}
        />
      </div>

      {dialog && (
        <ExpenseFormDialog
          open={!!dialog}
          mode={dialog}
          expenseId={dialog === 'edit' ? selectedId : null}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('common.delete')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">{t('expenses.deleteConfirm')}</p>
      </Modal>
    </div>
  );
}
