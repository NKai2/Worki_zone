import { lazy, Suspense, useEffect, useState } from 'react';
import { Icon } from './Icons';
import { translate, useT, type Key } from './i18n';
import { installProgram, PROGRAMS, type ProgramId } from './lib/programs';
import { handleStravaRedirect } from './integrations/strava';
import Library from './screens/Library';
import Onboarding from './screens/Onboarding';
import PlanScreen from './screens/Plan';
import Progress from './screens/Progress';
import SessionSummary from './screens/SessionSummary';
import SettingsScreen from './screens/Settings';
import Today from './screens/Today';
import Workout from './screens/Workout';
import { getState, useStore } from './store';
import { Sheet, Toast } from './ui';

const Coach = lazy(() => import('./screens/Coach'));

export type Tab = 'today' | 'plan' | 'coach' | 'library' | 'progress' | 'settings';
const TABS: { id: Tab; label: Key; icon: (p: { on?: boolean }) => React.ReactElement }[] = [
  { id: 'today', label: 'navToday', icon: Icon.today },
  { id: 'plan', label: 'navPlan', icon: Icon.plan },
  { id: 'coach', label: 'navCoach', icon: Icon.coach },
  { id: 'library', label: 'navLibrary', icon: Icon.library },
  { id: 'progress', label: 'navProgress', icon: Icon.progress },
];
const ALL: Tab[] = ['today', 'plan', 'coach', 'library', 'progress', 'settings'];

const readTab = (): Tab => {
  const h = location.hash.replace('#', '') as Tab;
  return ALL.includes(h) ? h : 'today';
};

export default function App() {
  const { t, lang } = useT();
  const plan = useStore((s) => s.plan);
  const active = useStore((s) => s.active);
  const theme = useStore((s) => s.settings.theme);
  const [tab, setTab] = useState<Tab>(readTab);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState('');
  const [summary, setSummary] = useState<{ id: string; prs: string[] } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f2f2f7');
  }, [theme]);

  useEffect(() => {
    const on = () => setTab(readTab());
    window.addEventListener('hashchange', on);
    const q = new URLSearchParams(location.search);
    const pid = q.get('program');
    if (pid && pid in PROGRAMS) {
      history.replaceState(null, '', location.pathname + location.hash);
      const cur = getState().plan;
      const tr = (k: Key) => translate(getState().settings.lang, k);
      if (cur?.program !== pid && (!cur || confirm(tr('programConfirm')))) {
        installProgram(pid as ProgramId).then(() => { setEditing(false); setToast(tr('programLoaded')); });
      }
    }
    handleStravaRedirect()
      .then((ok) => { if (ok) { location.hash = 'settings'; setToast('Strava ✓'); } })
      .catch((e: Error) => setToast(e.message));
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = (id: Tab) => {
    if (id === tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    location.hash = id;
    setTab(id);
    window.scrollTo(0, 0);
  };

  const showOnboarding = !plan || editing;
  const tabs = !active && !showOnboarding;

  return (
    <div className={`app ${tabs ? '' : 'no-tabs'}`}>
      {active ? (
        <Workout onFinish={(id, prs) => { setSummary({ id, prs }); go('today'); }} />
      ) : showOnboarding ? (
        <Onboarding onDone={() => { setEditing(false); go('today'); }} onCancel={plan ? () => setEditing(false) : undefined} />
      ) : (
        <main key={tab}>
          {tab === 'today' && <Today go={go} />}
          {tab === 'plan' && <PlanScreen onRebuild={() => setEditing(true)} />}
          {tab === 'coach' && <Suspense fallback={null}><Coach go={go} /></Suspense>}
          {tab === 'library' && <Library />}
          {tab === 'progress' && <Progress />}
          {tab === 'settings' && <SettingsScreen toast={setToast} back={() => go('today')} />}
        </main>
      )}

      {tabs && (
        <nav className="tabbar">
          <div className="tabbar-inner">
            {TABS.map((x) => {
              const on = tab === x.id || (x.id === 'today' && tab === 'settings');
              return (
                <button key={x.id} className={on ? 'on' : ''} onClick={() => go(x.id)} aria-current={on ? 'page' : undefined}>
                  <x.icon on={on} />
                  {t(x.label)}
                </button>
              );
            })}
          </div>
        </nav>
      )}
      {summary && (
        <Sheet onClose={() => setSummary(null)} title={t('workoutDone')}>
          <SessionSummary sessionId={summary.id} prs={summary.prs} onClose={() => setSummary(null)} celebrate />
        </Sheet>
      )}
      {toast && <Toast text={toast} onDone={() => setToast('')} />}
    </div>
  );
}
