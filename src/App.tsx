import { lazy, Suspense, useEffect, useState } from 'react';
import { Icon } from './Icons';
import { useT, type Key } from './i18n';
import { handleStravaRedirect } from './integrations/strava';
import Library from './screens/Library';
import Onboarding from './screens/Onboarding';
import PlanScreen from './screens/Plan';
import Progress from './screens/Progress';
import SettingsScreen from './screens/Settings';
import Today from './screens/Today';
import Workout from './screens/Workout';
import { updateSettings, useStore } from './store';
import SessionSummary from './screens/SessionSummary';
import { Sheet, Toast } from './ui';

type Tab = 'today' | 'plan' | 'coach' | 'library' | 'progress' | 'settings';
const Coach = lazy(() => import('./screens/Coach'));
const TABS: { id: Tab; label: Key; icon: () => React.ReactElement }[] = [
  { id: 'today', label: 'navToday', icon: Icon.today },
  { id: 'plan', label: 'navPlan', icon: Icon.plan },
  { id: 'coach', label: 'navCoach', icon: Icon.coach },
  { id: 'library', label: 'navLibrary', icon: Icon.library },
  { id: 'progress', label: 'navProgress', icon: Icon.progress },
  { id: 'settings', label: 'navSettings', icon: Icon.settings },
];

const readTab = (): Tab => {
  const h = location.hash.replace('#', '') as Tab;
  return TABS.some((t) => t.id === h) ? h : 'today';
};

export default function App() {
  const { t, lang } = useT();
  const plan = useStore((s) => s.plan);
  const active = useStore((s) => s.active);
  const [tab, setTab] = useState<Tab>(readTab);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState('');
  const [summary, setSummary] = useState<{ id: string; prs: string[] } | null>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const on = () => setTab(readTab());
    window.addEventListener('hashchange', on);
    handleStravaRedirect()
      .then((ok) => { if (ok) { location.hash = 'settings'; setToast('Strava ✓'); } })
      .catch((e: Error) => setToast(e.message));
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = (id: Tab) => { location.hash = id; setTab(id); window.scrollTo(0, 0); };

  const showOnboarding = !plan || editing;

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><i />{t('appName')}</div>
        <button className="lang" onClick={() => updateSettings({ lang: lang === 'he' ? 'en' : 'he' })} aria-label={t('language')}>
          {lang === 'he' ? 'EN' : 'עב'}
        </button>
      </header>

      {active ? (
        <Workout onFinish={(id, prs) => { setSummary({ id, prs }); go('today'); }} />
      ) : showOnboarding ? (
        <Onboarding onDone={() => { setEditing(false); go('today'); }} onCancel={plan ? () => setEditing(false) : undefined} />
      ) : (
        <main>
          {tab === 'today' && <Today go={go} />}
          {tab === 'plan' && <PlanScreen onRebuild={() => setEditing(true)} />}
          {tab === 'coach' && <Suspense fallback={null}><Coach /></Suspense>}
          {tab === 'library' && <Library />}
          {tab === 'progress' && <Progress />}
          {tab === 'settings' && <SettingsScreen toast={setToast} />}
        </main>
      )}

      {!active && plan && !editing && (
        <nav className="nav">
          <div className="nav-inner">
            {TABS.map((x) => (
              <button key={x.id} className={tab === x.id ? 'on' : ''} onClick={() => go(x.id)}>
                <x.icon />
                {t(x.label)}
              </button>
            ))}
          </div>
        </nav>
      )}
      {summary && (
        <Sheet onClose={() => setSummary(null)}>
          <h2 style={{ marginTop: 0, color: 'var(--accent)' }}>{t('workoutDone')} 🎉</h2>
          <SessionSummary sessionId={summary.id} prs={summary.prs} onClose={() => setSummary(null)} />
        </Sheet>
      )}
      {toast && <Toast text={toast} onDone={() => setToast('')} />}
    </div>
  );
}
