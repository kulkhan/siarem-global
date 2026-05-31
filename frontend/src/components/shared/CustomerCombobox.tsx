import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/api/customers';

interface Props {
  value: string;
  onChange: (id: string) => void;
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function CustomerCombobox({ value, onChange, error, disabled, placeholder = 'Müşteri ara...' }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () =>
      customersApi.list({ pageSize: 5000, sortBy: 'name', sortOrder: 'asc' }).then((r) => r.data.data),
    staleTime: 60_000,
  });

  const selected = customers.find((c) => c.id === value);

  const filtered = query.trim()
    ? customers.filter((c) =>
        `${c.shortCode} ${c.name}`.toLowerCase().includes(query.toLowerCase())
      )
    : customers;

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={open ? query : (selected ? `${selected.shortCode} — ${selected.name}` : '')}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange('');
        }}
        onFocus={() => { setOpen(true); setQuery(''); }}
        placeholder={placeholder}
        className={`w-full text-sm border rounded px-2 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
      />
      {open && !disabled && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-52 overflow-auto dark:bg-gray-800 dark:border-gray-600">
          {filtered.map((c) => (
            <div
              key={c.id}
              onMouseDown={() => { onChange(c.id); setOpen(false); setQuery(''); }}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 ${c.id === value ? 'bg-blue-50 dark:bg-gray-700 font-medium' : ''}`}
            >
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400 mr-2">{c.shortCode}</span>
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
