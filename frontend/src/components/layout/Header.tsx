import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';

const routeTitles: Record<string, string> = {
  '/dashboard': 'nav.dashboard',
  '/customers': 'nav.customers',
  '/ships': 'nav.ships',
  '/services': 'nav.services',
  '/quotes': 'nav.quotes',
  '/invoices': 'nav.invoices',
  '/meetings': 'nav.meetings',
  '/documents': 'nav.documents',
  '/reports': 'nav.reports',
  '/settings': 'nav.settings',
};

export default function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user } = useAuthStore();

  const currentKey = routeTitles[location.pathname] || 'nav.dashboard';

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr');
  };

  return (
    <header className="flex items-center h-16 px-6 bg-white border-b shrink-0 gap-4">
      <h1 className="text-lg font-semibold text-gray-900 flex-1">{t(currentKey)}</h1>

      <Button variant="ghost" size="sm" onClick={toggleLang} className="gap-2 text-gray-600">
        <Globe className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase">{i18n.language === 'tr' ? 'EN' : 'TR'}</span>
      </Button>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
        {user && (
          <span className="text-sm text-gray-700 hidden md:block">{user.name}</span>
        )}
      </div>
    </header>
  );
}
