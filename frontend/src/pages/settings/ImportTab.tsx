import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Download, Upload, CheckCircle2, AlertCircle, AlertTriangle, ArrowLeft, FileUp, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { importApi, type ImportEntity, type PreviewResult, type PreviewRow } from '@/api/import';

type Stage = 'idle' | 'preview' | 'done';

const ENTITIES: ImportEntity[] = ['customers', 'products', 'quotes', 'invoices', 'services'];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface EntityPanelProps {
  entity: ImportEntity;
}

function EntityPanel({ entity }: EntityPanelProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [executeErrors, setExecuteErrors] = useState<Array<{ rowNum: number; reason: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);

  const downloadMutation = useMutation({
    mutationFn: () => importApi.downloadTemplate(entity),
    onSuccess: (res) => {
      downloadBlob(res.data as unknown as Blob, `${entity}.xlsx`);
    },
  });

  const previewMutation = useMutation({
    mutationFn: (file: File) => importApi.preview(entity, file),
    onSuccess: (res) => {
      setPreview(res.data.data);
      setStage('preview');
    },
  });

  const executeMutation = useMutation({
    mutationFn: (rows: PreviewRow[]) => importApi.execute(entity, rows),
    onSuccess: (res) => {
      setImportedCount(res.data.data.imported);
      setExecuteErrors(res.data.data.errors);
      setStage('done');
    },
  });

  function handleFileChange(file: File | null) {
    if (!file) return;
    setSelectedFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFileChange(e.target.files?.[0] ?? null);
    e.target.value = '';
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  }, []);

  function handlePreview() {
    if (!selectedFile) return;
    previewMutation.mutate(selectedFile);
  }

  function handleExecute() {
    if (!preview?.valid.length) return;
    executeMutation.mutate(preview.valid);
  }

  function reset() {
    setStage('idle');
    setSelectedFile(null);
    setPreview(null);
    setImportedCount(0);
    setExecuteErrors([]);
  }

  // --- IDLE STAGE ---
  if (stage === 'idle') {
    return (
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">{t('import.instructions.title')}</h3>
          <ol className="space-y-1.5">
            {(['step1', 'step2', 'step3', 'step4'] as const).map((step, i) => (
              <li key={step} className="flex items-start gap-2 text-sm text-blue-800">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                {t(`import.instructions.${step}`)}
              </li>
            ))}
          </ol>
        </div>

        {/* Download template */}
        <div>
          <Button
            variant="outline"
            onClick={() => downloadMutation.mutate()}
            disabled={downloadMutation.isPending}
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadMutation.isPending ? t('common.loading') : t('import.downloadTemplate')}
          </Button>
        </div>

        {/* File upload area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-primary hover:bg-gray-50'
          }`}
        >
          <FileUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            {selectedFile ? selectedFile.name : t('import.dropOrClick')}
          </p>
          {selectedFile && (
            <p className="text-xs text-gray-400 mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        {previewMutation.isError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {(previewMutation.error as Error)?.message ?? t('common.error')}
          </div>
        )}

        <Button
          onClick={handlePreview}
          disabled={!selectedFile || previewMutation.isPending}
        >
          <Upload className="w-4 h-4 mr-2" />
          {previewMutation.isPending ? t('import.processing') : t('import.preview')}
        </Button>
      </div>
    );
  }

  // --- PREVIEW STAGE ---
  if (stage === 'preview' && preview) {
    const { valid, skipped, errors, summary } = preview;
    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{summary.valid}</p>
            <p className="text-xs text-green-600">{t('import.validRows')}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-700">{summary.skipped}</p>
            <p className="text-xs text-amber-600">{t('import.skippedRows')}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-700">{summary.errors}</p>
            <p className="text-xs text-red-600">{t('import.errorRows')}</p>
          </div>
        </div>

        {/* Valid rows */}
        {valid.length > 0 && (
          <PreviewTable
            title={t('import.validRows')}
            rows={valid}
            colorClass="border-green-200 bg-green-50"
            headerClass="bg-green-100 text-green-800"
          />
        )}

        {/* Skipped rows */}
        {skipped.length > 0 && (
          <PreviewTable
            title={t('import.skippedRows')}
            rows={skipped}
            colorClass="border-amber-200 bg-amber-50"
            headerClass="bg-amber-100 text-amber-800"
            showReason
          />
        )}

        {/* Error rows */}
        {errors.length > 0 && (
          <PreviewTable
            title={t('import.errorRows')}
            rows={errors}
            colorClass="border-red-200 bg-red-50"
            headerClass="bg-red-100 text-red-800"
            showReason
          />
        )}

        {executeMutation.isError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {(executeMutation.error as Error)?.message ?? t('common.error')}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={reset}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('import.back')}
          </Button>
          <Button
            onClick={handleExecute}
            disabled={valid.length === 0 || executeMutation.isPending}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {executeMutation.isPending ? t('import.saving') : t('import.confirm')}
          </Button>
          {valid.length === 0 && (
            <span className="text-sm text-gray-500">{t('import.noValidRows')}</span>
          )}
        </div>
      </div>
    );
  }

  // --- DONE STAGE ---
  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <p className="text-lg font-semibold text-green-800">
          {importedCount} {t('import.importedCount')}
        </p>
      </div>

      {executeErrors.length > 0 && (
        <div className="border border-red-200 rounded-xl overflow-hidden">
          <div className="bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
            {t('import.errorRows')} ({executeErrors.length})
          </div>
          <div className="divide-y divide-red-100">
            {executeErrors.map((e, i) => (
              <div key={i} className="px-4 py-2 text-sm text-red-600 flex gap-2">
                <span className="font-medium">{t('import.rowNum')} {e.rowNum}:</span>
                <span>{e.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button variant="outline" onClick={reset}>
        <RotateCcw className="w-4 h-4 mr-2" />
        {t('import.newImport')}
      </Button>
    </div>
  );
}

interface PreviewTableProps {
  title: string;
  rows: Array<{ rowNum: number; data: Record<string, unknown>; reason?: string }>;
  colorClass: string;
  headerClass: string;
  showReason?: boolean;
}

function PreviewTable({ title, rows, colorClass, headerClass, showReason }: PreviewTableProps) {
  const { t } = useTranslation();
  const displayed = rows.slice(0, 50);
  const columns = rows.length > 0 ? Object.keys(rows[0].data) : [];

  return (
    <div className={`border rounded-xl overflow-hidden ${colorClass}`}>
      <div className={`px-4 py-2 text-sm font-semibold ${headerClass}`}>
        {title} ({rows.length})
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className={headerClass}>
              <th className="px-3 py-1.5 text-left font-medium">{t('import.rowNum')}</th>
              {columns.map((col) => (
                <th key={col} className="px-3 py-1.5 text-left font-medium">{col}</th>
              ))}
              {showReason && <th className="px-3 py-1.5 text-left font-medium">{t('import.reason')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {displayed.map((row, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5 text-gray-500">{row.rowNum}</td>
                {columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 text-gray-700 max-w-[160px] truncate">
                    {String(row.data[col] ?? '')}
                  </td>
                ))}
                {showReason && (
                  <td className="px-3 py-1.5 text-red-600">{'reason' in row ? row.reason : ''}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 50 && (
        <p className="px-4 py-2 text-xs text-gray-500">
          ... ve {rows.length - 50} satır daha
        </p>
      )}
    </div>
  );
}

export default function ImportTab() {
  const { t } = useTranslation();
  const [activeEntity, setActiveEntity] = useState<ImportEntity>('customers');

  return (
    <div className="max-w-4xl">
      {/* Entity sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {ENTITIES.map((entity) => (
          <button
            key={entity}
            onClick={() => setActiveEntity(entity)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeEntity === entity
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t(`import.entities.${entity}`)}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 mb-6">{t('import.subtitle')}</p>

      {/* Entity panel — key forces full reset when switching entity */}
      <EntityPanel key={activeEntity} entity={activeEntity} />
    </div>
  );
}
