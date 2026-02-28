import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Anchor, BarChart3, FileText, Users, Ship, Globe, ArrowRight, CheckCircle } from 'lucide-react';

const FEATURE_ICONS = [Users, FileText, Ship, BarChart3];

const FEATURE_KEYS = [
  { titleKey: 'feat1Title', descKey: 'feat1Desc' },
  { titleKey: 'feat2Title', descKey: 'feat2Desc' },
  { titleKey: 'feat3Title', descKey: 'feat3Desc' },
  { titleKey: 'feat4Title', descKey: 'feat4Desc' },
];

const HIGHLIGHT_KEYS = ['hl1', 'hl2', 'hl3', 'hl4', 'hl5', 'hl6'];

export default function LandingPage() {
  const { t, i18n } = useTranslation();

  // Default to English on public pages if user has no saved preference
  useEffect(() => {
    if (!localStorage.getItem('oddycrm-lang')) {
      i18n.changeLanguage('en');
    }
  }, [i18n]);

  function toggleLang() {
    i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr');
  }

  const heroTitle2 = t('landing.heroTitle2');

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Anchor className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">oddyCRM</span>
          </div>

          {/* Nav actions */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-800"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold uppercase">{i18n.language === 'tr' ? 'EN' : 'TR'}</span>
            </button>
            <Link
              to="/login"
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800"
            >
              {t('landing.navLogin')}
            </Link>
            <Link
              to="/subscribe"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {t('landing.navStart')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 text-sm text-blue-300 font-medium mb-6">
            <Ship className="w-4 h-4" />
            {t('landing.badge')}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5 tracking-tight">
            {t('landing.heroTitle1')}<br />
            <span className="text-blue-400">{t('landing.heroHighlight')}</span>
            {heroTitle2 ? ` ${heroTitle2}` : ''}
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('landing.heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/subscribe"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
            >
              {t('landing.heroStartFree')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-colors"
            >
              {t('landing.heroSignIn')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('landing.featuresTitle')}</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              {t('landing.featuresSubtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURE_KEYS.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <div key={f.titleKey} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t(`landing.${f.titleKey}`)}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{t(`landing.${f.descKey}`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('landing.whyTitle')}
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              {t('landing.whyDesc')}
            </p>
            <ul className="space-y-3">
              {HIGHLIGHT_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  {t(`landing.${key}`)}
                </li>
              ))}
            </ul>
          </div>
          {/* Visual card */}
          <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white min-w-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Anchor className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">oddyCRM Dashboard</div>
                <div className="text-xs text-slate-400">{t('landing.dashWelcome')}</div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { labelKey: 'dashOpen', val: '12', color: 'bg-blue-500' },
                { labelKey: 'dashPending', val: '€ 48.500', color: 'bg-orange-500' },
                { labelKey: 'dashMonth', val: '€ 122.000', color: 'bg-green-500' },
              ].map((item) => (
                <div key={item.labelKey} className="bg-slate-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm text-slate-300">{t(`landing.${item.labelKey}`)}</span>
                  </div>
                  <span className="text-sm font-bold">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t('landing.ctaTitle')}</h2>
          <p className="text-blue-100 mb-8 text-lg">
            {t('landing.ctaDesc')}
          </p>
          <Link
            to="/subscribe"
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-8 py-4 rounded-xl text-base hover:bg-blue-50 transition-colors"
          >
            {t('landing.ctaButton')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-6 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Anchor className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-white">oddyCRM</span>
            <span>— {t('landing.footerTagline')}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-white transition-colors">{t('landing.footerLogin')}</Link>
            <Link to="/subscribe" className="hover:text-white transition-colors">{t('landing.footerRegister')}</Link>
            <a href="mailto:info@siarem.com" className="hover:text-white transition-colors flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              siarem.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
