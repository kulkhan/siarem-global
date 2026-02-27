import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Globe, Building2, Moon, Sun } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';
import { getCompanies } from '@/api/companies';
import { useDarkMode } from '@/hooks/useDarkMode';

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
  const { selectedCompanyId, setSelectedCompanyId } = useTenantStore();
  const qc = useQueryClient();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { isDark, toggle: toggleDark } = useDarkMode();

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: getCompanies,
    enabled: isSuperAdmin,
  });

  const currentKey = routeTitles[location.pathname] || 'nav.dashboard';

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr');
  };

  function handleCompanyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedCompanyId(e.target.value || null);
    // Invalidate all data queries so they reload with new tenant filter
    qc.invalidateQueries();
  }

  return (
    <header className="flex items-center h-16 px-6 bg-card border-b border-border shrink-0 gap-4">
      <h1 className="text-lg font-semibold text-foreground flex-1">{t(currentKey)}</h1>

      {/* SUPER_ADMIN tenant selector */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
          <select
            value={selectedCompanyId ?? ''}
            onChange={handleCompanyChange}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-blue-50 text-blue-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          >
            <option value="">Tüm Tenantlar</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={toggleDark} className="text-gray-600" title={isDark ? 'Aydınlık tema' : 'Gece teması'}>
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>

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
