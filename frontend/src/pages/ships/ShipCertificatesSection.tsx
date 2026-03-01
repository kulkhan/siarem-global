import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Paperclip, Upload, ExternalLink, ChevronDown, ChevronRight, X } from 'lucide-react';
import { shipsApi, type ShipCertificate, type CertDocument } from '@/api/ships';
import ShipCertificateFormDialog from './ShipCertificateFormDialog';

interface Props {
  shipId: string;
}

function getDaysLeft(expiryDate: string) {
  const diff = new Date(expiryDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function StatusBadge({ expiryDate }: { expiryDate: string }) {
  const { t } = useTranslation();
  const days = getDaysLeft(expiryDate);

  if (days < 0) {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
        {t('shipCertificate.statusExpired')}
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
        {days}g
      </span>
    );
  }
  if (days <= 60) {
    return (
      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700">
        {days}g
      </span>
    );
  }
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
      {t('shipCertificate.statusActive')}
    </span>
  );
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocUrl(storedFilename: string) {
  return `/uploads/cert-docs/${storedFilename}`;
}

interface CertDocsPanelProps {
  shipId: string;
  certId: string;
}

function CertDocsPanel({ shipId, certId }: CertDocsPanelProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docsRes, isLoading } = useQuery({
    queryKey: ['cert-documents', certId],
    queryFn: () => shipsApi.listCertDocuments(shipId, certId),
  });

  const docs = docsRes?.data.data ?? [];

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => shipsApi.deleteCertDocument(shipId, certId, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cert-documents', certId] });
      setDeletingDocId(null);
    },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await shipsApi.uploadCertDocument(shipId, certId, file, file.name);
      qc.invalidateQueries({ queryKey: ['cert-documents', certId] });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {t('shipCertificate.documents')}
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
        >
          <Upload className="w-3 h-3" />
          {uploading ? t('common.uploading') : t('shipCertificate.uploadDocument')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
        />
      </div>

      {isLoading ? (
        <p className="text-[10px] text-gray-400">{t('common.loading')}</p>
      ) : docs.length === 0 ? (
        <p className="text-[10px] text-gray-400 italic">{t('shipCertificate.noDocuments')}</p>
      ) : (
        <ul className="space-y-1">
          {docs.map((doc: CertDocument) => (
            <li key={doc.id} className="flex items-center gap-2 group">
              <Paperclip className="w-3 h-3 text-gray-400 shrink-0" />
              <a
                href={getDocUrl(doc.storedFilename)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 text-[10px] text-blue-600 hover:underline truncate flex items-center gap-1"
              >
                {doc.displayName}
                <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
              </a>
              {doc.size && (
                <span className="text-[9px] text-gray-400 shrink-0">{formatFileSize(doc.size)}</span>
              )}
              {deletingDocId === doc.id ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => deleteDocMutation.mutate(doc.id)}
                    className="text-[9px] text-red-600 font-semibold hover:underline"
                  >
                    {t('common.yes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingDocId(null)}
                    className="text-[9px] text-gray-400 hover:underline"
                  >
                    {t('common.no')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeletingDocId(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ShipCertificatesSection({ shipId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ShipCertificate | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedDocsCertId, setExpandedDocsCertId] = useState<string | null>(null);

  const { data: certsRes, isLoading } = useQuery({
    queryKey: ['ship-certificates', shipId],
    queryFn: () => shipsApi.listCertificates(shipId),
    enabled: !!shipId,
  });

  const certs = certsRes?.data.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (certId: string) => shipsApi.deleteCertificate(shipId, certId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ship-certificates', shipId] });
      setConfirmDeleteId(null);
    },
  });

  function handleEdit(cert: ShipCertificate) {
    setEditing(cert);
    setFormOpen(true);
  }

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleDialogClose() {
    setFormOpen(false);
    setEditing(null);
  }

  function toggleDocs(certId: string) {
    setExpandedDocsCertId((prev) => (prev === certId ? null : certId));
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('shipCertificate.title')}
        </h3>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('shipCertificate.addCertificate')}
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-400">{t('common.loading')}</p>
      ) : certs.length === 0 ? (
        <p className="text-xs text-gray-400 italic">{t('shipCertificate.noRecords')}</p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {certs.map((cert) => (
            <div key={cert.id}>
              {/* Certificate row */}
              <div className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {t(`shipCertificate.certTypes.${cert.certType}`, cert.certType)}
                    </span>
                    {cert.certNo && (
                      <span className="text-[10px] font-mono text-gray-400">{cert.certNo}</span>
                    )}
                    <StatusBadge expiryDate={cert.expiryDate} />
                  </div>
                  <div className="flex gap-3 mt-0.5">
                    {cert.issuedBy && (
                      <span className="text-[10px] text-gray-400 truncate">{cert.issuedBy}</span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {cert.issueDate ? `${new Date(cert.issueDate).toLocaleDateString('tr-TR')} → ` : ''}
                      {new Date(cert.expiryDate).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                {confirmDeleteId === cert.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-gray-500">{t('common.deleteConfirm')}</span>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(cert.id)}
                      className="text-[10px] text-red-600 font-semibold hover:underline"
                    >
                      {t('common.yes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[10px] text-gray-500 font-semibold hover:underline"
                    >
                      {t('common.no')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleDocs(cert.id)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                      title={t('shipCertificate.documents')}
                    >
                      {expandedDocsCertId === cert.id
                        ? <ChevronDown className="w-3.5 h-3.5" />
                        : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(cert)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(cert.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Document panel — expanded */}
              {expandedDocsCertId === cert.id && (
                <CertDocsPanel shipId={shipId} certId={cert.id} />
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <ShipCertificateFormDialog
          shipId={shipId}
          existing={editing}
          onClose={handleDialogClose}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['ship-certificates', shipId] });
            handleDialogClose();
          }}
        />
      )}
    </div>
  );
}
