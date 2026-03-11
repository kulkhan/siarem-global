import { useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Anchor, ArrowLeft, CheckCircle, Building2, Globe } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import api from '@/lib/api';

// Google reCAPTCHA v2 — test site key (always passes). Replace via VITE_RECAPTCHA_SITE_KEY in production.
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MuLw16k3';
const IS_DEV = import.meta.env.DEV;

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

export default function SubscribePage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');
  const [registeredSlug, setRegisteredSlug] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Rebuild Zod schema when language changes so validation messages are translated
  const schema = useMemo(() => z.object({
    companyName: z.string()
      .min(2, t('subscribe.errors.companyNameMin'))
      .max(100, t('subscribe.errors.companyNameMax')),
    slug: z.string()
      .min(2, t('subscribe.errors.slugMin'))
      .max(30, t('subscribe.errors.slugMax'))
      .regex(/^[a-z0-9-]+$/, t('subscribe.errors.slugPattern')),
    adminName: z.string()
      .min(2, t('subscribe.errors.adminNameMin'))
      .max(80, t('subscribe.errors.adminNameMax')),
    adminEmail: z.string().email(t('subscribe.errors.emailInvalid')),
    adminPassword: z.string().min(8, t('subscribe.errors.passwordMin')),
    confirmPassword: z.string(),
  }).refine((d) => d.adminPassword === d.confirmPassword, {
    message: t('subscribe.errors.passwordMismatch'),
    path: ['confirmPassword'],
  }), [t]);

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function handleCompanyNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    const current = watch('slug');
    if (!current) {
      setValue('slug', slugify(e.target.value), { shouldValidate: false });
    }
  }

  async function onSubmit(data: FormData) {
    setServerError('');
    setCaptchaError('');

    const recaptchaToken = IS_DEV ? 'dev-bypass' : recaptchaRef.current?.getValue();
    if (!IS_DEV && !recaptchaToken) {
      setCaptchaError(t('subscribe.captchaError'));
      return;
    }

    try {
      await api.post('/auth/register', {
        companyName: data.companyName,
        slug: data.slug,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword,
        recaptchaToken,
      });
      setRegisteredSlug(data.slug);
      setSuccess(true);
    } catch (err: unknown) {
      recaptchaRef.current?.reset();
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setServerError(msg ?? t('subscribe.errors.serverDefault'));
    }
  }

  function toggleLang() {
    i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr');
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('subscribe.successTitle')}</h2>
          <p className="text-gray-500 mb-2">
            {t('subscribe.successSlugLabel')}{' '}
            <span className="font-mono font-semibold text-blue-700">{registeredSlug}</span>
          </p>
          <p className="text-gray-500 text-sm mb-8">
            {t('subscribe.successDesc')}
          </p>
          <button
            onClick={() => navigate('/login', { state: { tenantSlug: registeredSlug } })}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {t('subscribe.successSignIn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Back link + lang toggle */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            {t('subscribe.backHome')}
          </Link>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm px-2 py-1 rounded"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold uppercase">{i18n.language === 'tr' ? 'EN' : 'TR'}</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Anchor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('subscribe.pageTitle')}</h1>
              <p className="text-xs text-gray-400">{t('subscribe.pageSubtitle')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Company info */}
            <div className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                <Building2 className="w-3.5 h-3.5" />
                {t('subscribe.companySection')}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('subscribe.companyName')} *</label>
                  <input
                    type="text"
                    placeholder={t('subscribe.companyNamePlaceholder')}
                    {...register('companyName')}
                    onBlur={handleCompanyNameBlur}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.companyName ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('subscribe.companySlug')} *</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-xs text-gray-500 whitespace-nowrap">siarem.com/</span>
                    <input
                      type="text"
                      placeholder="acme"
                      {...register('slug')}
                      className={`flex-1 px-3 py-2.5 border rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${errors.slug ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    />
                  </div>
                  {!errors.slug && <p className="text-xs text-gray-400 mt-1">{t('subscribe.companySlugHint')}</p>}
                  {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>}
                </div>
              </div>
            </div>

            {/* Admin user info */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t('subscribe.adminSection')}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('subscribe.adminName')} *</label>
                  <input
                    type="text"
                    placeholder={t('subscribe.adminNamePlaceholder')}
                    {...register('adminName')}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.adminName ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.adminName && <p className="text-xs text-red-500 mt-1">{errors.adminName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('subscribe.adminEmail')} *</label>
                  <input
                    type="email"
                    placeholder={t('subscribe.adminEmailPlaceholder')}
                    {...register('adminEmail')}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.adminEmail ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.adminEmail && <p className="text-xs text-red-500 mt-1">{errors.adminEmail.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('subscribe.adminPassword')} *</label>
                  <input
                    type="password"
                    placeholder={t('subscribe.adminPasswordPlaceholder')}
                    {...register('adminPassword')}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.adminPassword ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.adminPassword && <p className="text-xs text-red-500 mt-1">{errors.adminPassword.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('subscribe.confirmPassword')} *</label>
                  <input
                    type="password"
                    placeholder={t('subscribe.confirmPasswordPlaceholder')}
                    {...register('confirmPassword')}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
                </div>
              </div>
            </div>

            {/* reCAPTCHA — hidden in dev */}
            {!IS_DEV && (
              <div className="flex flex-col items-center gap-1 py-1">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={() => setCaptchaError('')}
                />
                {captchaError && (
                  <p className="text-xs text-red-500 self-start">{captchaError}</p>
                )}
              </div>
            )}

            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {isSubmitting ? t('subscribe.submitting') : t('subscribe.submit')}
            </button>

            <p className="text-center text-xs text-gray-400">
              {t('subscribe.alreadyHaveAccount')}{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">{t('subscribe.signIn')}</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
