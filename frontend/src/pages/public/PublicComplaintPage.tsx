import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquare, CheckCircle } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { submitPublicComplaint, type ComplaintType } from '@/api/complaints';

// Google reCAPTCHA v2 — test site key (always passes). Replace via VITE_RECAPTCHA_SITE_KEY in production.
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MuLw16k3';

const schema = z.object({
  contactName: z.string().min(1, 'Ad Soyad zorunludur'),
  contactEmail: z.string().email('Geçerli bir e-posta adresi girin').optional().or(z.literal('')),
  type: z.enum(['COMPLAINT', 'FEEDBACK', 'SUGGESTION']),
  subject: z.string().min(1, 'Konu zorunludur'),
  description: z.string().min(10, 'Açıklama en az 10 karakter olmalıdır'),
});

type FormData = z.infer<typeof schema>;

export default function PublicComplaintPage() {
  const { slug } = useParams<{ slug: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'COMPLAINT' },
  });

  async function onSubmit(data: FormData) {
    setServerError('');
    setCaptchaError('');

    const recaptchaToken = recaptchaRef.current?.getValue();
    if (!recaptchaToken) {
      setCaptchaError('Lütfen CAPTCHA doğrulamasını tamamlayın.');
      return;
    }

    try {
      await submitPublicComplaint({
        companySlug: slug ?? '',
        subject: data.subject,
        description: data.description,
        type: data.type as ComplaintType,
        contactName: data.contactName || undefined,
        contactEmail: data.contactEmail || undefined,
        recaptchaToken,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      recaptchaRef.current?.reset();
      const apiError = err as { response?: { data?: { message?: string } } };
      setServerError(apiError?.response?.data?.message ?? 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gönderildi!</h2>
          <p className="text-gray-600">
            Bildiriminiz başarıyla alındı. En kısa sürede sizinle iletişime geçeceğiz.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="bg-blue-100 rounded-full p-3">
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Şikayet / Geri Bildirim</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Görüş ve şikayetlerinizi bize iletebilirsiniz.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Contact Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad Soyad <span className="text-red-500">*</span>
              </label>
              <input
                {...register('contactName')}
                type="text"
                placeholder="Adınız ve soyadınız"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              />
              {errors.contactName && (
                <p className="mt-1 text-xs text-red-500">{errors.contactName.message}</p>
              )}
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-posta <span className="text-gray-400 text-xs">(isteğe bağlı)</span>
              </label>
              <input
                {...register('contactEmail')}
                type="email"
                placeholder="ornek@email.com"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              />
              {errors.contactEmail && (
                <p className="mt-1 text-xs text-red-500">{errors.contactEmail.message}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bildirim Türü <span className="text-red-500">*</span>
              </label>
              <select
                {...register('type')}
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 bg-white"
              >
                <option value="COMPLAINT">Şikayet</option>
                <option value="FEEDBACK">Geri Bildirim</option>
                <option value="SUGGESTION">Öneri</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Konu <span className="text-red-500">*</span>
              </label>
              <input
                {...register('subject')}
                type="text"
                placeholder="Bildirimin konusu"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              />
              {errors.subject && (
                <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('description')}
                rows={5}
                placeholder="Lütfen detaylı açıklama yapınız..."
                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 resize-none"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* reCAPTCHA */}
            <div className="flex flex-col items-center gap-1">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={() => setCaptchaError('')}
              />
              {captchaError && (
                <p className="text-xs text-red-500 self-start">{captchaError}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-600">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-md text-sm transition-colors"
            >
              {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Bildiriminiz güvenle iletilecektir.
        </p>
      </div>
    </div>
  );
}
