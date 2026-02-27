import type { ReactNode } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  selectedId: string | null;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  addLabel?: string;
  extra?: ReactNode;
  className?: string;
}

export function PageHeader({
  title, selectedId, onAdd, onEdit, onDelete,
  addLabel, extra, className,
}: PageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      <div className="flex items-center gap-2">
        {extra}
        <Button size="sm" onClick={onAdd} className="gap-1.5">
          <Plus className="w-4 h-4" />
          {addLabel ?? t('common.add')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          disabled={!selectedId}
          className="gap-1.5"
        >
          <Pencil className="w-4 h-4" />
          {t('common.edit')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDelete}
          disabled={!selectedId}
          className={cn(
            'gap-1.5',
            selectedId && 'text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400'
          )}
        >
          <Trash2 className="w-4 h-4" />
          {t('common.delete')}
        </Button>
      </div>
    </div>
  );
}
