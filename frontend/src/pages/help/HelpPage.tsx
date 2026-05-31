import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, Users, FileText, Wrench, Receipt,
  ChevronRight, CheckCircle, Info, AlertCircle,
  ArrowRight, LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabKey = 'overview' | 'customers' | 'quotes' | 'services' | 'invoices';

const TABS: { key: TabKey; icon: React.ElementType }[] = [
  { key: 'overview', icon: LayoutDashboard },
  { key: 'customers', icon: Users },
  { key: 'quotes', icon: FileText },
  { key: 'services', icon: Wrench },
  { key: 'invoices', icon: Receipt },
];

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2 mt-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span className="text-sm text-foreground/80 leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mt-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StatusBadges({ statuses }: { statuses: Record<string, string> }) {
  const colorMap: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    REVISED: 'bg-orange-100 text-orange-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    OPEN: 'bg-yellow-100 text-yellow-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    ON_HOLD: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-green-100 text-green-700',
    PARTIALLY_PAID: 'bg-orange-100 text-orange-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };

  return (
    <div className="mt-3 space-y-2">
      {Object.entries(statuses).map(([key, desc]) => (
        <div key={key} className="flex items-start gap-3">
          <span className={cn('shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full', colorMap[key] ?? 'bg-gray-100 text-gray-600')}>
            {key}
          </span>
          <span className="text-sm text-foreground/70">{desc}</span>
        </div>
      ))}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Tab: Overview ──────────────────────────────────────────────────────────

function OverviewTab() {
  const { t } = useTranslation();
  const steps = t('help.overview.steps', { returnObjects: true }) as string[];
  const moduleList = t('help.overview.moduleList', { returnObjects: true }) as Record<string, string>;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-primary/10 to-blue-500/5 border border-primary/20 rounded-xl p-5">
        <h2 className="text-base font-semibold text-foreground mb-2">{t('help.overview.title')}</h2>
        <p className="text-sm text-foreground/70 leading-relaxed">{t('help.overview.intro')}</p>
      </div>

      <Section title={t('help.overview.workflow')} icon={ArrowRight}>
        <div className="flex flex-col gap-2 mt-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              {i < steps.length - 1 && (
                <div className="absolute left-3.5 mt-7 h-6 w-px bg-border" />
              )}
              <span className="text-sm text-foreground/80">{step}</span>
              {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto" />}
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('help.overview.modules')} icon={BookOpen}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {Object.entries(moduleList).map(([key, desc]) => (
            <div key={key} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50">
              <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground capitalize">{key}</p>
                <p className="text-xs text-foreground/60 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── Tab: Customers ──────────────────────────────────────────────────────────

function CustomersTab() {
  const { t } = useTranslation();
  const addSteps = t('help.customers.addSteps', { returnObjects: true }) as string[];
  const detailItems = t('help.customers.detailItems', { returnObjects: true }) as string[];

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/70 leading-relaxed">{t('help.customers.intro')}</p>

      <Section title={t('help.customers.addTitle')} icon={Users}>
        <StepList steps={addSteps} />
      </Section>

      <Section title={t('help.customers.detailTitle')} icon={Info}>
        <p className="text-sm text-foreground/70">{t('help.customers.detailDesc')}</p>
        <BulletList items={detailItems} />
      </Section>

      <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-lg">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300">{t('help.customers.deleteNote')}</p>
      </div>
    </div>
  );
}

// ─── Tab: Quotes ─────────────────────────────────────────────────────────────

function QuotesTab() {
  const { t } = useTranslation();
  const addSteps = t('help.quotes.addSteps', { returnObjects: true }) as string[];
  const statuses = t('help.quotes.statuses', { returnObjects: true }) as Record<string, string>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/70 leading-relaxed">{t('help.quotes.intro')}</p>

      <Section title={t('help.quotes.addTitle')} icon={FileText}>
        <StepList steps={addSteps} />
      </Section>

      <Section title={t('help.quotes.statusTitle')} icon={Info}>
        <StatusBadges statuses={statuses} />
      </Section>

      <Section title={t('help.quotes.convertTitle')} icon={ArrowRight}>
        <p className="text-sm text-foreground/70 leading-relaxed">{t('help.quotes.convertDesc')}</p>
      </Section>
    </div>
  );
}

// ─── Tab: Services ───────────────────────────────────────────────────────────

function ServicesTab() {
  const { t } = useTranslation();
  const addSteps = t('help.services.addSteps', { returnObjects: true }) as string[];
  const statuses = t('help.services.statuses', { returnObjects: true }) as Record<string, string>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/70 leading-relaxed">{t('help.services.intro')}</p>

      <Section title={t('help.services.addTitle')} icon={Wrench}>
        <StepList steps={addSteps} />
      </Section>

      <Section title={t('help.services.statusTitle')} icon={Info}>
        <StatusBadges statuses={statuses} />
      </Section>

      <Section title={t('help.services.reportTitle')} icon={BookOpen}>
        <p className="text-sm text-foreground/70">{t('help.services.reportDesc')}</p>
      </Section>

      <Section title={t('help.services.invoiceTitle')} icon={Receipt}>
        <p className="text-sm text-foreground/70">{t('help.services.invoiceDesc')}</p>
      </Section>
    </div>
  );
}

// ─── Tab: Invoices ───────────────────────────────────────────────────────────

function InvoicesTab() {
  const { t } = useTranslation();
  const addSteps = t('help.invoices.addSteps', { returnObjects: true }) as string[];
  const statuses = t('help.invoices.statuses', { returnObjects: true }) as Record<string, string>;
  const notes = t('help.invoices.notes', { returnObjects: true }) as string[];

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/70 leading-relaxed">{t('help.invoices.intro')}</p>

      <Section title={t('help.invoices.addTitle')} icon={Receipt}>
        <StepList steps={addSteps} />
      </Section>

      <Section title={t('help.invoices.statusTitle')} icon={Info}>
        <StatusBadges statuses={statuses} />
      </Section>

      <Section title={t('help.invoices.paymentTitle')} icon={CheckCircle}>
        <p className="text-sm text-foreground/70">{t('help.invoices.paymentDesc')}</p>
      </Section>

      <Section title={t('help.invoices.noteTitle')} icon={AlertCircle}>
        <BulletList items={notes} />
      </Section>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HelpPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const TabContent: Record<TabKey, React.ReactNode> = {
    overview: <OverviewTab />,
    customers: <CustomersTab />,
    quotes: <QuotesTab />,
    services: <ServicesTab />,
    invoices: <InvoicesTab />,
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('help.title')}</h1>
          <p className="text-sm text-foreground/50">{t('help.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-muted/50 rounded-xl p-1">
        {TABS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-foreground/50 hover:text-foreground hover:bg-white/50 dark:hover:bg-white/5'
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{t(`help.tabs.${key}`)}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>{TabContent[activeTab]}</div>
    </div>
  );
}
