import { useRef } from 'react';
import { EX } from '../data/exercises';
import { Icon } from '../Icons';
import { useT } from '../i18n';
import { connectStrava, redirectUri } from '../integrations/strava';
import { getState, replaceState, resetState, updateSettings, useStore, type State } from '../store';
import { Cell, Group, NavBar, Segmented, Switch } from '../ui';

function download(name: string, text: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function SettingsScreen({ toast, back }: { toast: (msg: string) => void; back: () => void }) {
  const { t } = useT();
  const settings = useStore((s) => s.settings);
  const bodyweight = useStore((s) => s.bodyweight);
  const file = useRef<HTMLInputElement>(null);
  const kg = bodyweight[bodyweight.length - 1]?.kg;

  const exportCsv = () => {
    const rows = [['date', 'workout', 'exercise', 'set', 'weight_kg', 'reps']];
    for (const h of getState().history)
      for (const e of h.exercises)
        e.sets.forEach((s, i) => rows.push([new Date(h.start).toISOString(), h.dayKey, EX[e.exId]?.name.en ?? e.exId, String(i + 1), String(s.w), String(s.r)]));
    download('worki-history.csv', rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
  };

  const exportJson = () => {
    const { settings: st, ...rest } = getState();
    // Keep the Strava secret and tokens out of backups
    const safe = { ...rest, settings: { ...st, stravaSecret: '', strava: undefined, anthropicKey: '' } };
    download(`worki-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(safe, null, 2), 'application/json');
  };

  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as State;
      if (!Array.isArray(data.history)) throw new Error('bad file');
      const keep = getState().settings;
      replaceState({ ...data, settings: { ...data.settings, stravaSecret: keep.stravaSecret, strava: keep.strava, anthropicKey: keep.anthropicKey } });
      toast(t('imported'));
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const field = { border: 0, background: 'transparent', outline: 'none', textAlign: 'end' as const, color: 'var(--label-2)' };

  return (
    <div>
      <NavBar title={t('settingsTitle')}
        leading={<button className="nav-text-btn" onClick={back}>‹ {t('navToday')}</button>} />

      <Group header={t('general')}>
        <div className="cell" style={{ ['--inset' as string]: '58px' }}>
          <span className="cell-icon" style={{ background: 'var(--tint)' }}><Icon.globe /></span>
          <div className="grow cell-title">{t('language')}</div>
          <div style={{ width: 150 }}><Segmented value={settings.lang} onChange={(lang) => updateSettings({ lang })} options={[['he', 'עברית'], ['en', 'English']]} /></div>
        </div>
        <div className="cell" style={{ ['--inset' as string]: '58px' }}>
          <span className="cell-icon" style={{ background: '#5e5ce6' }}><Icon.moon /></span>
          <div className="grow cell-title">{t('appearance')}</div>
          <div style={{ width: 170 }}><Segmented value={settings.theme} onChange={(theme) => updateSettings({ theme })} options={[['auto', t('auto')], ['light', t('light')], ['dark', t('dark')]]} /></div>
        </div>
        <Cell icon={<Icon.bell />} iconBg="var(--red)" title={t('restSound')}
          trailing={<Switch checked={settings.restSound} onChange={(restSound) => updateSettings({ restSound })} label={t('restSound')} />} />
      </Group>
      <div className="group-footer">{t('installHint')}</div>

      <Group header={t('nutrition')} footer={t('nutritionSub')}>
        {kg ? (
          <>
            <Cell icon={<Icon.leaf />} iconBg="var(--green)" title={t('protein')} detail={<span className="num">{Math.round(kg * 1.6)}–{Math.round(kg * 2.2)} {t('grams')}</span>} />
            <Cell icon={<Icon.flame />} iconBg="var(--orange)" title={t('calories')} detail={<span className="num">≈ {(Math.round((kg * 33 + 250) / 50) * 50).toLocaleString()}</span>} />
          </>
        ) : <Cell title={t('enterBw')} />}
      </Group>

      <Group header={t('aiCoachSettings')} footer={t('coachKeyFooter')}>
        <div className="cell" style={{ ['--inset' as string]: '58px' }}>
          <span className="cell-icon" style={{ background: '#5e5ce6' }}><Icon.key /></span>
          <div className="cell-title">{t('apiKey')}</div>
          <input className="grow" style={field} dir="ltr" type="password" autoComplete="off" placeholder="sk-ant-…" value={settings.anthropicKey} onChange={(e) => updateSettings({ anthropicKey: e.target.value })} />
        </div>
      </Group>

      <Group header="Strava" footer={settings.strava ? undefined : <>{t('stravaHelp')} <b dir="ltr">{location.hostname}</b></>}>
        {settings.strava ? (
          <>
            <Cell icon={<Icon.upload />} iconBg="var(--strava)" title={t('connected')} detail={settings.strava.athlete} />
            <Cell title={t('autoStrava')} trailing={<Switch checked={settings.autoStrava} onChange={(autoStrava) => updateSettings({ autoStrava })} label={t('autoStrava')} />} />
            <Cell title={t('disconnect')} danger onClick={() => updateSettings({ strava: undefined })} />
          </>
        ) : (
          <>
            <div className="cell">
              <div className="cell-title">Client ID</div>
              <input className="grow" style={field} dir="ltr" inputMode="numeric" placeholder="12345" value={settings.stravaClientId} onChange={(e) => updateSettings({ stravaClientId: e.target.value })} />
            </div>
            <div className="cell">
              <div className="cell-title">Client Secret</div>
              <input className="grow" style={field} dir="ltr" type="password" placeholder="••••••" value={settings.stravaSecret} onChange={(e) => updateSettings({ stravaSecret: e.target.value })} />
            </div>
            <Cell title={t('connect')} onClick={settings.stravaClientId && settings.stravaSecret ? connectStrava : undefined} />
          </>
        )}
      </Group>
      {!settings.strava && <div className="group-footer" dir="ltr" style={{ textAlign: 'start' }}>{redirectUri()}</div>}

      <Group header="Garmin Connect" footer={t('garminHelp')}>
        <Cell icon={<Icon.watch />} iconBg="#1c1c1e" title={t('garminFit')} />
      </Group>

      <Group header={t('data')}>
        <Cell icon={<Icon.download />} iconBg="var(--tint)" title={t('exportJson')} onClick={exportJson} chevron />
        <Cell icon={<Icon.doc />} iconBg="var(--green)" title={t('exportCsv')} onClick={exportCsv} chevron />
        <Cell icon={<Icon.upload />} iconBg="var(--orange)" title={t('importJson')} onClick={() => file.current?.click()} chevron />
      </Group>
      <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />

      <Group style={{ marginTop: 24 }}>
        <Cell title={t('resetAll')} danger onClick={() => { if (confirm(t('resetConfirm'))) resetState(); }} />
      </Group>
      <p className="center footnote tertiary mt24">Worki Zone · 2.0</p>
    </div>
  );
}
