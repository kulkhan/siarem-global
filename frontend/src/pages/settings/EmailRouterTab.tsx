import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail, Plus, Trash2, Pencil, CheckCircle, XCircle, Loader2,
  RefreshCw, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { emailConfigApi, type EmailRule } from '@/api/emailConfig';
import { usersApi } from '@/api/users';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';

// ── Schemas ───────────────────────────────────────────────────────────────────

const configSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().min(1),
  password: z.string().optional(),
  useTls: z.boolean(),
  pollIntervalMinutes: z.coerce.number().int().min(1).max(1440),
  isActive: z.boolean(),
});
type ConfigForm = z.infer<typeof configSchema>;

const ruleSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  assignedUserId: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});
type RuleForm = z.infer<typeof ruleSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', URGENT: 'Acil',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500', MEDIUM: 'text-blue-600', HIGH: 'text-orange-600', URGENT: 'text-red-600 font-bold',
};
const STATUS_COLORS: Record<string, string> = {
  PROCESSED: 'bg-green-100 text-green-700',
  UNMATCHED: 'bg-yellow-100 text-yellow-700',
  ERROR: 'bg-red-100 text-red-700',
};
const STATUS_LABELS: Record<string, string> = {
  PROCESSED: 'Eşleşti', UNMATCHED: 'Eşleşmedi', ERROR: 'Hata',
};

const inputCls = (err?: unknown) =>
  `w-full border rounded px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary ${err ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`;

// ── Rule Form Dialog ──────────────────────────────────────────────────────────

function RuleDialog({
  rule,
  configId,
  onClose,
}: {
  rule: EmailRule | null;
  configId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: usersRes } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.data.data),
  });
  const users = usersRes ?? [];

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
    defaultValues: rule ? {
      name: rule.name,
      description: rule.description,
      assignedUserId: rule.assignedUserId,
      priority: rule.priority as RuleForm['priority'],
    } : { priority: 'MEDIUM', assignedUserId: '', name: '', description: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: RuleForm) =>
      rule
        ? emailConfigApi.updateRule(rule.id, data)
        : emailConfigApi.createRule({ ...data, emailConfigId: configId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-config'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {rule ? t('emailRouter.rules.edit') : t('emailRouter.rules.add')}
        </h2>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('emailRouter.rules.name')} *
            </label>
            <input {...register('name')} className={inputCls(errors.name)}
              placeholder="MRV / DCS İşlemleri" />
            {errors.name && <p className="text-xs text-red-500 mt-0.5">{t('common.required')}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('emailRouter.rules.description')} *
              <span className="text-gray-400 font-normal ml-1">({t('emailRouter.rules.descriptionHint')})</span>
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className={`${inputCls(errors.description)} resize-none`}
              placeholder="EU MRV, IMO DCS, emisyon raporlaması, denizcilik mevzuatı ile ilgili e-postalar"
            />
            {errors.description && <p className="text-xs text-red-500 mt-0.5">{t('common.required')}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('emailRouter.rules.assignedTo')} *
              </label>
              <select {...register('assignedUserId')} className={inputCls(errors.assignedUserId)}>
                <option value="">{t('common.select')}</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {errors.assignedUserId && <p className="text-xs text-red-500 mt-0.5">{t('common.required')}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('emailRouter.rules.priority')}
              </label>
              <select {...register('priority')} className={inputCls()}>
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-500">{t('common.error')}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" size="sm" disabled={isSubmitting || mutation.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function EmailRouterTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const { selectedCompanyId } = useTenantStore();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';
  const [section, setSection] = useState<'config' | 'logs'>('config');
  const [ruleDialog, setRuleDialog] = useState<EmailRule | null | 'new'>(null);
  const [confirmDeleteRuleId, setConfirmDeleteRuleId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { data: configRes, isLoading } = useQuery({
    queryKey: ['email-config', selectedCompanyId],
    queryFn: () => emailConfigApi.get().then(r => r.data.data),
    enabled: !isSuperAdmin || !!selectedCompanyId,
  });
  const config = configRes ?? null;

  const { data: logsRes } = useQuery({
    queryKey: ['email-logs', selectedCompanyId],
    queryFn: () => emailConfigApi.getLogs().then(r => r.data.data),
    enabled: section === 'logs' && (!isSuperAdmin || !!selectedCompanyId),
  });
  const logs = logsRes ?? [];

  const { register, handleSubmit, getValues, formState: { errors, isDirty, isSubmitting } } = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: config ? {
      host: config.host,
      port: config.port,
      username: config.username,
      password: '',
      useTls: config.useTls,
      pollIntervalMinutes: config.pollIntervalMinutes,
      isActive: config.isActive,
    } : {
      host: '',
      port: 995,
      username: '',
      password: '',
      useTls: true,
      pollIntervalMinutes: 5,
      isActive: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: ConfigForm) => emailConfigApi.save(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-config'] }),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => emailConfigApi.deleteRule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-config'] }); setConfirmDeleteRuleId(null); },
  });

  async function handleTest() {
    const vals = getValues();
    if (!vals.host || !vals.username || !vals.password) {
      setTestResult({ ok: false, msg: t('emailRouter.config.testFillRequired') });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      await emailConfigApi.test({
        host: vals.host,
        port: vals.port,
        username: vals.username,
        password: vals.password!,
        useTls: vals.useTls,
      });
      setTestResult({ ok: true, msg: t('emailRouter.config.testSuccess') });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? t('emailRouter.config.testFailed');
      setTestResult({ ok: false, msg });
    } finally {
      setIsTesting(false);
    }
  }

  if (isSuperAdmin && !selectedCompanyId) {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl max-w-xl">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Tenant seçilmedi</p>
          <p className="text-sm text-amber-700 mt-0.5">E-posta yönlendirmeyi yapılandırmak için üst menüden bir şirket seçin.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />{t('common.loading')}</div>;
  }

  const rules = config?.rules ?? [];

  return (
    <div className="space-y-6">
      {/* Section tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(['config', 'logs'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              section === s
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {t(`emailRouter.sections.${s}`)}
          </button>
        ))}
      </div>

      {/* ── Config section ── */}
      {section === 'config' && (
        <div className="space-y-6">
          {/* POP3 Config form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {t('emailRouter.config.title')}
              </h3>
              {config?.lastPolledAt && (
                <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  {t('emailRouter.config.lastPolled')}: {new Date(config.lastPolledAt).toLocaleString('tr-TR')}
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('emailRouter.config.host')} *
                  </label>
                  <input {...register('host')} className={inputCls(errors.host)}
                    placeholder="mail.ornek.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('emailRouter.config.port')}
                  </label>
                  <input {...register('port')} type="number" className={inputCls(errors.port)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('emailRouter.config.username')} *
                  </label>
                  <input {...register('username')} className={inputCls(errors.username)}
                    placeholder="info@sirem.com" autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('emailRouter.config.password')}
                    {config && <span className="text-gray-400 font-normal ml-1">({t('emailRouter.config.passwordHint')})</span>}
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className={inputCls(errors.password)}
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                      {showPassword ? t('common.hide') : t('common.show')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" {...register('useTls')} className="rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">TLS/SSL</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" {...register('isActive')} className="rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('emailRouter.config.active')}</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">{t('emailRouter.config.pollInterval')}</label>
                  <input
                    {...register('pollIntervalMinutes')}
                    type="number"
                    min={1}
                    max={1440}
                    className="w-20 border rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary border-gray-300"
                  />
                  <span className="text-sm text-gray-500">{t('emailRouter.config.minutes')}</span>
                </div>
              </div>

              {testResult && (
                <div className={`flex items-center gap-2 text-sm p-2 rounded ${testResult.ok ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                  {testResult.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  {testResult.msg}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={isTesting}>
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                  {t('emailRouter.config.test')}
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting || saveMutation.isPending}>
                  {t('common.save')}
                </Button>
                {saveMutation.isSuccess && (
                  <span className="text-xs text-green-600 dark:text-green-400">{t('common.saved')}</span>
                )}
              </div>
            </form>
          </div>

          {/* Rules list */}
          {config && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {t('emailRouter.rules.title')}
                </h3>
                <Button size="sm" onClick={() => setRuleDialog('new')}>
                  <Plus className="w-3.5 h-3.5 mr-1" />{t('emailRouter.rules.add')}
                </Button>
              </div>

              {rules.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  {t('emailRouter.rules.empty')}
                </div>
              ) : (
                <div className="space-y-2">
                  {rules.map((rule, idx) => (
                    <div
                      key={rule.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        rule.isActive
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30'
                          : 'border-dashed border-gray-200 dark:border-gray-700 opacity-60'
                      }`}
                    >
                      <span className="text-xs font-mono text-gray-400 mt-0.5 w-4 shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{rule.name}</span>
                          <span className={`text-xs ${PRIORITY_COLORS[rule.priority] ?? ''}`}>
                            {PRIORITY_LABELS[rule.priority]}
                          </span>
                          {!rule.isActive && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">
                              {t('emailRouter.rules.inactive')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{rule.description}</p>
                        {rule.assignedUser && (
                          <p className="text-xs text-primary mt-0.5">→ {rule.assignedUser.name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {confirmDeleteRuleId === rule.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500">{t('common.deleteConfirm')}</span>
                            <button onClick={() => deleteRuleMutation.mutate(rule.id)}
                              className="text-[10px] text-red-600 font-semibold hover:underline">{t('common.yes')}</button>
                            <button onClick={() => setConfirmDeleteRuleId(null)}
                              className="text-[10px] text-gray-500 font-semibold hover:underline">{t('common.no')}</button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => setRuleDialog(rule)}
                              className="p-1 text-gray-400 hover:text-primary rounded transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirmDeleteRuleId(rule.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Logs section ── */}
      {section === 'logs' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-36">{t('emailRouter.logs.date')}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">{t('emailRouter.logs.subject')}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-32">{t('emailRouter.logs.from')}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-28">{t('emailRouter.logs.rule')}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-24">{t('emailRouter.logs.status')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-sm text-gray-400">{t('emailRouter.logs.empty')}</td>
                </tr>
              )}
              {logs.map(log => (
                <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate max-w-xs">{log.subject || '—'}</p>
                    {log.aiReason && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{log.aiReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 truncate max-w-[8rem]">
                    {log.fromAddress || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300">
                    {log.matchedRule?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[log.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[log.status] ?? log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rule dialog */}
      {ruleDialog !== null && config && (
        <RuleDialog
          rule={ruleDialog === 'new' ? null : ruleDialog}
          configId={config.id}
          onClose={() => setRuleDialog(null)}
        />
      )}
    </div>
  );
}
