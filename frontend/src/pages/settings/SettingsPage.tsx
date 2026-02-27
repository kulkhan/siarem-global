import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserPlus, Shield, ShieldCheck, ShieldAlert, Pencil, Trash2, KeyRound, Users, ClipboardList } from 'lucide-react';
import { usersApi } from '@/api/users';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import UserFormDialog from './UserFormDialog';
import ChangePasswordDialog from './ChangePasswordDialog';
import AuditLogTab from './AuditLogTab';
import type { User } from '@/types';

const ROLE_BADGE: Record<string, { label: string; className: string; icon: typeof Shield }> = {
  ADMIN: { label: 'Admin', className: 'bg-red-100 text-red-700', icon: ShieldAlert },
  MANAGER: { label: 'Manager', className: 'bg-blue-100 text-blue-700', icon: ShieldCheck },
  USER: { label: 'User', className: 'bg-gray-100 text-gray-600', icon: Shield },
};

type Tab = 'users' | 'audit';

export default function SettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const isAdmin = me?.role === 'ADMIN';

  const [tab, setTab] = useState<Tab>('users');
  const [dialog, setDialog] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [pwdTarget, setPwdTarget] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteTarget(null); },
  });

  function handleSaved() {
    qc.invalidateQueries({ queryKey: ['users'] });
    setDialog(null);
    setSelected(null);
  }

  function openEdit(u: User) {
    setSelected(u);
    setDialog('edit');
  }

  const users = data ?? [];

  const tabs: { id: Tab; label: string; icon: typeof Users; adminOnly?: boolean }[] = [
    { id: 'users', label: t('settings.tabs.users'), icon: Users },
    { id: 'audit', label: t('settings.tabs.audit'), icon: ClipboardList, adminOnly: true },
  ];

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('settings.subtitle')}</p>
        </div>
        {isAdmin && tab === 'users' && (
          <Button onClick={() => { setSelected(null); setDialog('add'); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            {t('settings.users.add')}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.filter((tb) => !tb.adminOnly || isAdmin).map((tb) => {
          const Icon = tb.icon;
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === tb.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tb.label}
            </button>
          );
        })}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-5xl">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">{t('settings.users.title')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('settings.users.subtitle')}</p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <colgroup>
                  <col className="w-56" />
                  <col className="w-56" />
                  <col className="w-28" />
                  <col className="w-24" />
                  {isAdmin && <col className="w-32" />}
                </colgroup>
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-medium">{t('settings.users.fields.name')}</th>
                    <th className="text-left px-5 py-3 font-medium">{t('settings.users.fields.email')}</th>
                    <th className="text-left px-5 py-3 font-medium">{t('settings.users.fields.role')}</th>
                    <th className="text-left px-5 py-3 font-medium">{t('settings.users.fields.isActive')}</th>
                    {isAdmin && <th className="px-5 py-3 text-right font-medium">{t('common.actions')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => {
                    const badge = ROLE_BADGE[u.role] ?? ROLE_BADGE.USER;
                    const BadgeIcon = badge.icon;
                    const isSelf = u.id === me?.id;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                              {u.name}
                              {isSelf && (
                                <span className="ml-2 text-xs text-gray-400 font-normal">({t('settings.users.you')})</span>
                              )}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                            {u.isActive ? t('settings.users.active') : t('settings.users.inactive')}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPwdTarget(u)}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                                title={t('settings.users.changePassword')}
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEdit(u)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                                title={t('common.edit')}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {!isSelf && (
                                <button
                                  onClick={() => setDeleteTarget(u)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                                  title={t('common.delete')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">{t('common.noData')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit Log tab */}
      {tab === 'audit' && isAdmin && <AuditLogTab />}

      {/* Form Dialog */}
      {dialog && (
        <UserFormDialog
          open={!!dialog}
          mode={dialog}
          user={selected}
          isSelf={selected?.id === me?.id}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Change Password Dialog */}
      {pwdTarget && (
        <ChangePasswordDialog
          open={!!pwdTarget}
          userId={pwdTarget.id}
          userName={pwdTarget.name}
          onClose={() => setPwdTarget(null)}
        />
      )}

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('common.delete')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
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
        <p className="text-sm text-gray-600">
          <strong>{deleteTarget?.name}</strong> {t('settings.users.deleteConfirm')}
        </p>
      </Modal>
    </div>
  );
}
