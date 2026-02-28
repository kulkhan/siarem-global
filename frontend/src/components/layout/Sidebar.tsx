import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Building2, Wrench, FileText,
  Receipt, CalendarDays, FolderOpen, BarChart3, Settings,
  LogOut, Anchor, ChevronLeft, ChevronRight, Wallet, Globe, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { getOwnCompany } from '@/api/companies';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard },
  { key: 'customers', path: '/customers', icon: Building2 },
  { key: 'quotes', path: '/quotes', icon: FileText },
  { key: 'services', path: '/services', icon: Wrench },
  { key: 'invoices', path: '/invoices', icon: Receipt },
  { key: 'meetings', path: '/meetings', icon: CalendarDays },
  { key: 'complaints', path: '/complaints', icon: MessageSquare },
  { key: 'expenses', path: '/expenses', icon: Wallet, adminOnly: true },
  { key: 'documents', path: '/documents', icon: FolderOpen },
  { key: 'reports', path: '/reports', icon: BarChart3 },
  { key: 'settings', path: '/settings', icon: Settings, adminOnly: true },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { t } = useTranslation();
  const { user, clearAuth } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data: ownCompany } = useQuery({
    queryKey: ['own-company'],
    queryFn: getOwnCompany,
    enabled: !isSuperAdmin && !!user,
    staleTime: 5 * 60 * 1000,
  });

  function handleLogout() {
    qc.clear();
    clearAuth();
  }

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Top: Company logo or app brand */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border shrink-0">
        {!isSuperAdmin && ownCompany?.logoUrl ? (
          <img
            src={ownCompany.logoUrl}
            alt={ownCompany.name}
            className={cn(
              'object-contain rounded shrink-0',
              collapsed ? 'w-8 h-8' : 'h-9 max-w-[144px]'
            )}
          />
        ) : (
          <>
            <Anchor className="w-7 h-7 text-blue-400 shrink-0" />
            {!collapsed && (
              <span className="ml-2.5 text-lg font-bold text-white truncate">
                {!isSuperAdmin && ownCompany ? ownCompany.name : 'oddyCRM'}
              </span>
            )}
          </>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-sidebar-foreground/60 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-0.5 px-2">
          {visibleItems.map(({ key, path, icon: Icon }) => (
            <li key={key}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    'text-sidebar-foreground/70 hover:bg-white/10 hover:text-white',
                    isActive && 'bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active',
                    collapsed && 'justify-center px-2'
                  )
                }
                title={collapsed ? t(`nav.${key}`) : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="truncate">{t(`nav.${key}`)}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Platform Management — SUPER_ADMIN only */}
        {isSuperAdmin && (
          <div className="mt-4 px-2">
            {!collapsed && (
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/30">
                Platform
              </p>
            )}
            <ul className="space-y-0.5 mt-1">
              <li>
                <NavLink
                  to="/admin/companies"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      'text-sidebar-foreground/70 hover:bg-white/10 hover:text-white',
                      isActive && 'bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active',
                      collapsed && 'justify-center px-2'
                    )
                  }
                  title={collapsed ? 'Şirketler' : undefined}
                >
                  <Globe className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="truncate">Şirketler</span>}
                </NavLink>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="px-2 pb-2 border-t border-sidebar-border pt-3 shrink-0">
        {!collapsed && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
            {isSuperAdmin && (
              <p className="text-xs text-blue-400 truncate">Super Admin</p>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium',
            'text-sidebar-foreground/70 hover:bg-white/10 hover:text-white transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? t('common.logout') : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{t('common.logout')}</span>}
        </button>
      </div>

      {/* App branding strip */}
      <div
        className={cn(
          'shrink-0 border-t border-white/5 bg-gradient-to-r from-blue-950/60 to-indigo-950/60',
          collapsed ? 'py-3 flex justify-center' : 'px-4 py-3'
        )}
      >
        {collapsed ? (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Anchor className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40">
              <Anchor className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white/80 leading-none tracking-wide">oddyCRM</p>
              <p className="text-[10px] text-white/35 leading-none mt-0.5 tracking-widest uppercase">Maritime Suite</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
