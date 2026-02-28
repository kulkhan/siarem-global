import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Anchor, ArrowLeft, CheckCircle, Building2 } from 'lucide-react';
import api from '@/lib/api';

const schema = z.object({
  companyName: z.string().min(2, 'Firma adı en az 2 karakter olmalı').max(100),
  slug: z
    .string()
    .min(2, 'Firma kodu en az 2 karakter olmalı')
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Sadece küçük harf, rakam ve tire kullanın'),
  adminName: z.string().min(2, 'Ad en az 2 karakter olmalı').max(80),
  adminEmail: z.string().email('Geçerli bir e-posta girin'),
  adminPassword: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  confirmPassword: z.string(),
}).refine((d) => d.adminPassword === d.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

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
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');
  const [registeredSlug, setRegisteredSlug] = useState('');

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
    try {
      await api.post('/auth/register', {
        companyName: data.companyName,
        slug: data.slug,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword,
      });
      setRegisteredSlug(data.slug);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setServerError(msg ?? 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hesabınız Oluşturuldu!</h2>
          <p className="text-gray-500 mb-2">
            Firma kodu: <span className="font-mono font-semibold text-blue-700">{registeredSlug}</span>
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Artık giriş sayfasında firma kodunuzu kullanarak sisteme girebilirsiniz.
          </p>
          <button
            onClick={() => navigate('/login', { state: { tenantSlug: registeredSlug } })}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  const field = (label: string, id: keyof FormData, type = 'text', placeholder = '', hint?: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        {...register(id)}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[id] ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
      />
      {hint && !errors[id] && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {errors[id] && <p className="text-xs text-red-500 mt-1">{errors[id]?.message}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Back link */}
        <Link to="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm mb-6">
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfa
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Anchor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Ücretsiz Hesap Oluştur</h1>
              <p className="text-xs text-gray-400">oddyCRM — Denizcilik CRM Platformu</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Company info */}
            <div className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                <Building2 className="w-3.5 h-3.5" />
                Firma Bilgileri
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firma Adı *</label>
                  <input
                    type="text"
                    placeholder="Acme Denizcilik A.Ş."
                    {...register('companyName')}
                    onBlur={handleCompanyNameBlur}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.companyName ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firma Kodu *</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-xs text-gray-500 whitespace-nowrap">siarem.com/</span>
                    <input
                      type="text"
                      placeholder="acme"
                      {...register('slug')}
                      className={`flex-1 px-3 py-2.5 border rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${errors.slug ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    />
                  </div>
                  {!errors.slug && <p className="text-xs text-gray-400 mt-1">Küçük harf, rakam ve tire. Bu kod değiştirilemez.</p>}
                  {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>}
                </div>
              </div>
            </div>

            {/* Admin user info */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Yönetici Hesabı
              </div>
              <div className="space-y-3">
                {field('Ad Soyad *', 'adminName', 'text', 'Ahmet Yılmaz')}
                {field('E-posta *', 'adminEmail', 'email', 'ahmet@acme.com')}
                {field('Şifre *', 'adminPassword', 'password', 'En az 8 karakter')}
                {field('Şifre Tekrar *', 'confirmPassword', 'password', 'Şifreyi tekrar girin')}
              </div>
            </div>

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
              {isSubmitting ? 'Hesap Oluşturuluyor...' : 'Ücretsiz Hesap Oluştur'}
            </button>

            <p className="text-center text-xs text-gray-400">
              Zaten hesabınız var mı?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">Giriş Yap</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
