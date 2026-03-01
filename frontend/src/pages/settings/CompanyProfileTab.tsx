import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Upload, ImageOff, Zap, CheckCircle, Globe, Mail, Phone, MapPin, Building2, Hash, Sparkles, Link2, Copy, Check } from 'lucide-react';
import { getOwnCompany, uploadLogo, updateOwnCompany } from '@/api/companies';
import type { CompanySelfUpdate } from '@/api/companies';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PLAN_META: Record<string, { label: string; color: string; features: string[] }> = {
  free: {
    label: 'Ücretsiz',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    features: ['5 kullanıcı', '100 müşteri', '50 servis/ay', 'Temel raporlar'],
  },
  starter: {
    label: 'Starter',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    features: ['15 kullanıcı', 'Sınırsız müşteri', '500 servis/ay', 'PDF export', 'E-posta bildirimleri'],
  },
  pro: {
    label: 'Pro',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    features: ['Sınırsız kullanıcı', 'Sınırsız her şey', 'API erişimi', 'Öncelikli destek', 'Özel raporlar'],
  },
  enterprise: {
    label: 'Enterprise',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    features: ['Özel SLA', 'Dedicated sunucu', 'SSO entegrasyonu', '7/24 destek', 'Özel geliştirme'],
  },
};

export default function CompanyProfileTab() {
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ['own-company'],
    queryFn: getOwnCompany,
    enabled: !!me?.companyId,
  });

  const complaintUrl = company?.slug
    ? `${window.location.origin}/complaint/${company.slug}`
    : null;

  function copyComplaintUrl() {
    if (!complaintUrl) return;
    navigator.clipboard.writeText(complaintUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  const { register, handleSubmit, reset, formState: { isDirty, isSubmitting } } = useForm<CompanySelfUpdate>();

  useEffect(() => {
    if (company) {
      reset({
        name: company.name ?? '',
        email: company.email ?? '',
        phone: company.phone ?? '',
        address: company.address ?? '',
        city: company.city ?? '',
        country: company.country ?? '',
        taxNumber: company.taxNumber ?? '',
        website: company.website ?? '',
      });
    }
  }, [company, reset]);

  const infoMutation = useMutation({
    mutationFn: updateOwnCompany,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['own-company'] });
    },
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) => uploadLogo(me!.companyId!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['own-company'] });
      if (logoFileRef.current) logoFileRef.current.value = '';
    },
  });

  const plan = company?.plan ?? 'free';
  const planMeta = PLAN_META[plan] ?? PLAN_META.free;

  if (isLoading) {
    return <div className="text-sm text-gray-400 p-4">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Logo & Plan Cards ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Logo Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Firma Logosu</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <ImageOff className="w-7 h-7 text-gray-300" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{company?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{company?.slug}.siarem.com</p>
              <p className="text-xs text-gray-400 mt-1">
                {company?.logoUrl ? 'Logo yüklendi' : 'Henüz logo yok'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logoFileRef.current?.click()}
            disabled={logoMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            {logoMutation.isPending ? 'Yükleniyor...' : 'Logo Yükle / Değiştir'}
          </button>
          {logoMutation.isError && <p className="text-xs text-red-500 mt-1.5">Yükleme başarısız.</p>}
          {logoMutation.isSuccess && <p className="text-xs text-green-600 mt-1.5">Logo güncellendi.</p>}
          <p className="text-xs text-gray-400 mt-1.5">PNG, JPG veya SVG · maks 2MB</p>
          <input ref={logoFileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) logoMutation.mutate(f); }} />
        </div>

        {/* Plan Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Abonelik Planı</h3>
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${planMeta.color}`}>
              <Sparkles className="w-3.5 h-3.5" />
              {planMeta.label}
            </span>
          </div>
          <ul className="space-y-1.5 mb-4 flex-1">
            {planMeta.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {plan !== 'enterprise' && (
            <button
              type="button"
              onClick={() => setUpgradeOpen(true)}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Zap className="w-3.5 h-3.5" />
              Planı Yükselt
            </button>
          )}
        </div>
      </div>

      {/* ── Müşteri Şikayet Formu Linki ──────────────────── */}
      {complaintUrl && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-blue-500" />
            Müşteri Şikayet / Geri Bildirim Formu
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            Bu linki müşterilerinizle paylaşın — giriş yapmadan şikayet ve geri bildirim gönderebilirler.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-w-0">
              <p className="text-xs text-gray-700 font-mono truncate">{complaintUrl}</p>
            </div>
            <button
              type="button"
              onClick={copyComplaintUrl}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shrink-0"
            >
              {urlCopied
                ? <><Check className="w-3.5 h-3.5" /> Kopyalandı</>
                : <><Copy className="w-3.5 h-3.5" /> Kopyala</>
              }
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            <a
              href={complaintUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Önizleme için tıklayın →
            </a>
          </p>
        </div>
      )}

      {/* ── Company Info Form ────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Firma Bilgileri</h3>
        <form onSubmit={handleSubmit((d) => infoMutation.mutate(d))} className="space-y-4">

          {/* Name */}
          <div>
            <Label htmlFor="co-name" className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
              <Building2 className="w-3.5 h-3.5" /> Firma Adı *
            </Label>
            <Input id="co-name" {...register('name')} placeholder="Acme Denizcilik A.Ş." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <Label htmlFor="co-email" className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                <Mail className="w-3.5 h-3.5" /> E-posta
              </Label>
              <Input id="co-email" type="email" {...register('email')} placeholder="info@firma.com" />
            </div>
            {/* Phone */}
            <div>
              <Label htmlFor="co-phone" className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                <Phone className="w-3.5 h-3.5" /> Telefon
              </Label>
              <Input id="co-phone" {...register('phone')} placeholder="+90 212 000 00 00" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tax number */}
            <div>
              <Label htmlFor="co-tax" className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                <Hash className="w-3.5 h-3.5" /> Vergi No
              </Label>
              <Input id="co-tax" {...register('taxNumber')} placeholder="1234567890" className="font-mono" />
            </div>
            {/* Website */}
            <div>
              <Label htmlFor="co-web" className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                <Globe className="w-3.5 h-3.5" /> Web Sitesi
              </Label>
              <Input id="co-web" {...register('website')} placeholder="https://firma.com" />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="co-address" className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
              <MapPin className="w-3.5 h-3.5" /> Adres
            </Label>
            <Input id="co-address" {...register('address')} placeholder="Liman Cad. No:1 Kat:3" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="co-city" className="text-xs font-medium text-gray-600 mb-1 block">Şehir</Label>
              <Input id="co-city" {...register('city')} placeholder="İstanbul" />
            </div>
            <div>
              <Label htmlFor="co-country" className="text-xs font-medium text-gray-600 mb-1 block">Ülke</Label>
              <Input id="co-country" {...register('country')} placeholder="Türkiye" />
            </div>
          </div>

          {infoMutation.isError && (
            <p className="text-xs text-red-500">Kayıt başarısız. Lütfen tekrar deneyin.</p>
          )}
          {infoMutation.isSuccess && (
            <p className="text-xs text-green-600">Firma bilgileri güncellendi.</p>
          )}

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={!isDirty || isSubmitting || infoMutation.isPending}>
              {infoMutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </Button>
          </div>
        </form>
      </div>

      {/* ── Upgrade Modal ───────────────────────────────── */}
      {upgradeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Plan Yükseltme</h2>
            <p className="text-gray-500 text-sm mb-6">
              Plan yükseltme özelliği yakında aktif olacak. Bizimle iletişime geçerek özel teklif alabilirsiniz.
            </p>
            <a
              href="mailto:info@siarem.com"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors mb-3"
            >
              <Mail className="w-4 h-4" />
              info@siarem.com
            </a>
            <br />
            <button
              onClick={() => setUpgradeOpen(false)}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-2"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
