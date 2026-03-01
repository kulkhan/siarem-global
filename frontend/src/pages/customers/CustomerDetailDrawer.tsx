import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, Plus, Pencil, Trash2, Star, Phone, Mail, User, UserPlus, UserMinus, Building2, MessageSquare } from 'lucide-react';
import { customersApi, type BankAccount } from '@/api/customers';
import { contactsApi, type Contact } from '@/api/contacts';
import { usersApi } from '@/api/users';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BankFormState {
  bankName: string;
  iban: string;
  accountNo: string;
  currency: string;
  notes: string;
}
const emptyBankForm: BankFormState = { bankName: '', iban: '', accountNo: '', currency: '', notes: '' };

interface ContactFormState {
  name: string;
  title: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  notes: string;
}

const emptyForm: ContactFormState = { name: '', title: '', email: '', phone: '', isPrimary: false, notes: '' };

interface Props {
  customerId: string;
  onClose: () => void;
  onEdit: () => void;
}

export default function CustomerDetailDrawer({ customerId, onClose, onEdit }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { user: currentUser } = useAuthStore();
  const canManageAssignees = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const [noteContent, setNoteContent] = useState('');
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [contactForm, setContactForm] = useState<ContactFormState | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [bankForm, setBankForm] = useState<BankFormState | null>(null);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: () => customersApi.getOne(customerId).then((r) => r.data.data),
    enabled: !!customerId,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', customerId],
    queryFn: () => contactsApi.list(customerId).then((r) => r.data.data),
    enabled: !!customerId,
  });

  const { data: assignees = [] } = useQuery({
    queryKey: ['assignees', customerId],
    queryFn: () => customersApi.getAssignees(customerId).then((r) => r.data.data),
    enabled: !!customerId,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', customerId],
    queryFn: () => customersApi.listBankAccounts(customerId).then((r) => r.data.data),
    enabled: !!customerId,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data.data),
    enabled: canManageAssignees,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['customer-notes', customerId],
    queryFn: () => customersApi.listNotes(customerId).then((r) => r.data.data),
    enabled: !!customerId,
  });

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => customersApi.createNote(customerId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-notes', customerId] });
      setNoteContent('');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => customersApi.deleteNote(customerId, noteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-notes', customerId] });
      setDeleteNoteId(null);
    },
  });

  const addAssigneeMutation = useMutation({
    mutationFn: (userId: string) => customersApi.addAssignee(customerId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignees', customerId] });
      setSelectedUserId('');
    },
  });

  const removeAssigneeMutation = useMutation({
    mutationFn: (userId: string) => customersApi.removeAssignee(customerId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignees', customerId] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (form: ContactFormState) => {
      if (editingContactId) {
        return contactsApi.update(customerId, editingContactId, form);
      }
      return contactsApi.create(customerId, form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts', customerId] });
      setContactForm(null);
      setEditingContactId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsApi.delete(customerId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts', customerId] });
      setDeleteContactId(null);
    },
  });

  const saveBankMutation = useMutation({
    mutationFn: (form: BankFormState) => {
      const payload = { bankName: form.bankName, iban: form.iban || undefined, accountNo: form.accountNo || undefined, currency: form.currency || undefined, notes: form.notes || undefined };
      if (editingBankId) return customersApi.updateBankAccount(customerId, editingBankId, payload);
      return customersApi.createBankAccount(customerId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-accounts', customerId] });
      setBankForm(null);
      setEditingBankId(null);
    },
  });

  const deleteBankMutation = useMutation({
    mutationFn: (id: string) => customersApi.deleteBankAccount(customerId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-accounts', customerId] });
      setDeleteBankId(null);
    },
  });

  function startAdd() {
    setEditingContactId(null);
    setContactForm({ ...emptyForm });
  }

  function startEdit(c: Contact) {
    setEditingContactId(c.id);
    setContactForm({
      name: c.name,
      title: c.title ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      isPrimary: c.isPrimary,
      notes: c.notes ?? '',
    });
  }

  function cancelForm() {
    setContactForm(null);
    setEditingContactId(null);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={onClose} />

      <div className="relative w-[500px] max-w-full h-full bg-white shadow-2xl flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">{t('customers.detail')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-medium text-gray-700"
            >
              {t('common.edit')}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading || !customer ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            {t('common.loading')}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Customer info */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded inline-block mb-1">
                    {customer.shortCode}
                  </div>
                  <div className="text-lg font-bold text-gray-900">{customer.name}</div>
                  {(customer.city || customer.country) && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {[customer.city, customer.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${customer.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {customer.isActive ? t('status.active') : t('status.passive')}
                </span>
              </div>
            </div>

            {/* Contact info */}
            <div className="px-5 py-3 border-b border-gray-100 space-y-2">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline text-xs">{customer.email}</a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-700">{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="text-xs text-gray-500 leading-relaxed">{customer.address}</div>
              )}
              {customer.taxNumber && (
                <div className="text-xs text-gray-400">VKN: {customer.taxNumber}</div>
              )}
            </div>

            {/* Notes */}
            {customer.notes && (
              <div className="px-5 py-3 border-b border-gray-100">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  {t('customers.fields.notes')}
                </div>
                <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{customer.notes}</div>
              </div>
            )}

            {/* Assignees section */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {t('customers.assignees.title')} ({assignees.length})
                </div>
              </div>

              {/* Add assignee */}
              {canManageAssignees && (
                <div className="flex gap-2 mb-3">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">{t('customers.assignees.select')}</option>
                    {allUsers
                      .filter((u) => u.isActive && !assignees.some((a) => a.userId === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                  </select>
                  <Button
                    size="sm"
                    className="h-8 text-xs px-2"
                    disabled={!selectedUserId || addAssigneeMutation.isPending}
                    onClick={() => selectedUserId && addAssigneeMutation.mutate(selectedUserId)}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {assignees.length === 0 ? (
                <div className="text-xs text-gray-400 py-2 text-center">{t('customers.assignees.none')}</div>
              ) : (
                <div className="space-y-1.5">
                  {assignees.map((a) => (
                    <div key={a.userId} className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-100 hover:bg-gray-50">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-800">{a.user.name}</div>
                        <div className="text-[10px] text-gray-400">{a.user.role}</div>
                      </div>
                      {canManageAssignees && (
                        <button
                          onClick={() => removeAssigneeMutation.mutate(a.userId)}
                          disabled={removeAssigneeMutation.isPending}
                          className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400"
                          title={t('customers.assignees.remove')}
                        >
                          <UserMinus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bank Accounts section */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {t('customers.bankAccounts.title')} ({bankAccounts.length})
                </div>
                {!bankForm && (
                  <button
                    onClick={() => { setBankForm({ ...emptyBankForm }); setEditingBankId(null); }}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('customers.bankAccounts.add')}
                  </button>
                )}
              </div>

              {/* Bank form */}
              {bankForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] text-gray-500 mb-0.5 block">{t('customers.bankAccounts.bankName')} *</label>
                      <Input value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="Ziraat Bankası, HSBC..." className="h-7 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-0.5 block">{t('customers.bankAccounts.iban')}</label>
                      <Input value={bankForm.iban} onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value })} placeholder="TR00 0000 0000..." className="h-7 text-xs font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-0.5 block">{t('customers.bankAccounts.accountNo')}</label>
                      <Input value={bankForm.accountNo} onChange={(e) => setBankForm({ ...bankForm, accountNo: e.target.value })} placeholder="12345678" className="h-7 text-xs font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-0.5 block">{t('customers.bankAccounts.currency')}</label>
                      <Input value={bankForm.currency} onChange={(e) => setBankForm({ ...bankForm, currency: e.target.value })} placeholder="EUR, USD, TRY" className="h-7 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-0.5 block">{t('customers.bankAccounts.notes')}</label>
                      <Input value={bankForm.notes} onChange={(e) => setBankForm({ ...bankForm, notes: e.target.value })} placeholder="Not..." className="h-7 text-xs" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => bankForm.bankName.trim() && saveBankMutation.mutate(bankForm)} disabled={saveBankMutation.isPending || !bankForm.bankName.trim()} className="h-7 text-xs">
                      {saveBankMutation.isPending ? t('common.saving') : t('common.save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setBankForm(null); setEditingBankId(null); }} className="h-7 text-xs">
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}

              {bankAccounts.length === 0 && !bankForm ? (
                <div className="text-xs text-gray-400 py-2 text-center">{t('customers.bankAccounts.noAccounts')}</div>
              ) : (
                <div className="space-y-2">
                  {bankAccounts.map((ba: BankAccount) => (
                    <div key={ba.id} className="group flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50">
                      <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800">{ba.bankName}</div>
                        {ba.iban && <div className="text-xs font-mono text-gray-500 mt-0.5">{ba.iban}</div>}
                        <div className="flex gap-3 mt-0.5">
                          {ba.accountNo && <span className="text-xs font-mono text-gray-400">{ba.accountNo}</span>}
                          {ba.currency && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{ba.currency}</span>}
                        </div>
                        {ba.notes && <div className="text-xs text-gray-400 italic mt-0.5">{ba.notes}</div>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {deleteBankId === ba.id ? (
                          <>
                            <button onClick={() => deleteBankMutation.mutate(ba.id)} className="text-[10px] text-red-600 font-medium hover:text-red-700 px-1.5 py-0.5 bg-red-50 rounded">{t('common.confirm')}</button>
                            <button onClick={() => setDeleteBankId(null)} className="text-[10px] text-gray-500 px-1.5 py-0.5">{t('common.cancel')}</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingBankId(ba.id); setBankForm({ bankName: ba.bankName, iban: ba.iban ?? '', accountNo: ba.accountNo ?? '', currency: ba.currency ?? '', notes: ba.notes ?? '' }); }} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => setDeleteBankId(ba.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contacts section */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {t('contacts.title')} ({contacts.length})
                </div>
                {!contactForm && (
                  <button
                    onClick={startAdd}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('contacts.add')}
                  </button>
                )}
              </div>

              {/* Inline form */}
              {contactForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 space-y-2">
                  <div className="text-xs font-semibold text-blue-700 mb-2">
                    {editingContactId ? t('contacts.edit') : t('contacts.add')}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 mb-0.5 block">{t('contacts.fields.name')} *</label>
                      <Input
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="Ad Soyad"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-0.5 block">{t('contacts.fields.title')}</label>
                      <Input
                        value={contactForm.title}
                        onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                        placeholder="Direktör, Kaptan..."
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-0.5 block">{t('contacts.fields.email')}</label>
                      <Input
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="ornek@firma.com"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-0.5 block">{t('contacts.fields.phone')}</label>
                      <Input
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        placeholder="+90 212..."
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">{t('contacts.fields.notes')}</label>
                    <Input
                      value={contactForm.notes}
                      onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                      placeholder="Not..."
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPrimaryContact"
                      checked={contactForm.isPrimary}
                      onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <label htmlFor="isPrimaryContact" className="text-xs text-gray-600 cursor-pointer">
                      {t('contacts.fields.isPrimary')}
                    </label>
                  </div>
                  {saveMutation.isError && (
                    <div className="text-xs text-red-600">
                      {(saveMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('common.error')}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => contactForm.name.trim() && saveMutation.mutate(contactForm)}
                      disabled={saveMutation.isPending || !contactForm.name.trim()}
                      className="h-7 text-xs"
                    >
                      {saveMutation.isPending ? t('common.saving') : t('common.save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelForm} className="h-7 text-xs">
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Contact list */}
              {contacts.length === 0 && !contactForm ? (
                <div className="text-xs text-gray-400 py-4 text-center">{t('contacts.noContacts')}</div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <div key={c.id} className="group flex items-start gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-800">{c.name}</span>
                          {c.isPrimary && (
                            <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                          )}
                        </div>
                        {c.title && <div className="text-xs text-gray-500">{c.title}</div>}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                              <Mail className="w-2.5 h-2.5" />{c.email}
                            </a>
                          )}
                          {c.phone && (
                            <span className="text-xs text-gray-500 flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5" />{c.phone}
                            </span>
                          )}
                        </div>
                        {c.notes && <div className="text-xs text-gray-400 mt-0.5 italic">{c.notes}</div>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {deleteContactId === c.id ? (
                          <>
                            <button
                              onClick={() => deleteMutation.mutate(c.id)}
                              className="text-[10px] text-red-600 font-medium hover:text-red-700 px-1.5 py-0.5 bg-red-50 rounded"
                            >
                              {t('common.confirm')}
                            </button>
                            <button
                              onClick={() => setDeleteContactId(null)}
                              className="text-[10px] text-gray-500 px-1.5 py-0.5"
                            >
                              {t('common.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(c)}
                              className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteContactId(c.id)}
                              className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes section */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {t('customerNote.title')} ({notes.length})
                </div>
              </div>

              {/* Add note */}
              <div className="flex gap-2 mb-3">
                <textarea
                  ref={noteTextareaRef}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && noteContent.trim()) {
                      addNoteMutation.mutate(noteContent.trim());
                    }
                  }}
                  rows={2}
                  placeholder={t('customerNote.placeholder')}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={() => noteContent.trim() && addNoteMutation.mutate(noteContent.trim())}
                  disabled={!noteContent.trim() || addNoteMutation.isPending}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors self-end"
                >
                  {t('customerNote.addNote')}
                </button>
              </div>

              {/* Notes list */}
              {notes.length === 0 ? (
                <div className="text-xs text-gray-400 py-2 text-center">{t('customerNote.noNotes')}</div>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="group flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50/50">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3 h-3 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-semibold text-gray-700">{note.user?.name}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(note.createdAt).toLocaleDateString('tr-TR')}
                            {' '}
                            {new Date(note.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</div>
                      </div>
                      {(isAdmin || note.userId === currentUser?.id) && (
                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {deleteNoteId === note.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteNoteMutation.mutate(note.id)}
                                className="text-[10px] text-red-600 font-semibold hover:underline"
                              >
                                {t('common.yes')}
                              </button>
                              <button
                                onClick={() => setDeleteNoteId(null)}
                                className="text-[10px] text-gray-500 font-semibold hover:underline"
                              >
                                {t('common.no')}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteNoteId(note.id)}
                              className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
