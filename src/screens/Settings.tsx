import { useRef } from 'react';
import { EX } from '../data/exercises';
import { useT } from '../i18n';
import { connectStrava, redirectUri } from '../integrations/strava';
import { getState, replaceState, resetState, updateSettings, useStore, type State } from '../store';

function download(name: string, text: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function SettingsScreen({ toast }: { toast: (msg: string) => void }) {
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
    const safe = { ...rest, settings: { ...st, stravaSecret: '', strava: undefined } };
    download(`worki-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(safe, null, 2), 'application/json');
  };

  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as State;
      if (!Array.isArray(data.history)) throw new Error('bad file');
      const keep = getState().settings;
      replaceState({ ...data, settings: { ...data.settings, stravaSecret: keep.stravaSecret, strava: keep.strava } });
      toast(t('imported'));
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <div>
      <h1>{t('settingsTitle')}</h1>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row between">
          <b>{t('language')}</b>
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn sm ${settings.lang === 'he' ? 'primary' : 'ghost'}`} onClick={() => updateSettings({ lang: 'he' })}>עברית</button>
            <button className={`btn sm ${settings.lang === 'en' ? 'primary' : 'ghost'}`} onClick={() => updateSettings({ lang: 'en' })}>English</button>
          </div>
        </div>
        <label className="row between" style={{ marginTop: 14 }}>
          <span>{t('restSound')}</span>
          <input type="checkbox" checked={settings.restSound} onChange={(e) => updateSettings({ restSound: e.target.checked })} />
        </label>
        <div className="muted small" style={{ marginTop: 12 }}>{t('installHint')}</div>
      </div>

      <h2>{t('nutrition')}</h2>
      <div className="card">
        <div className="muted small">{t('nutritionSub')}</div>
        {kg ? (
          <div className="stats" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
            <div className="stat"><b>{Math.round(kg * 1.6)}-{Math.round(kg * 2.2)}</b><span>{t('protein')} ({t('grams')})</span></div>
            <div className="stat"><b>{Math.round((kg * 33 + 250) / 50) * 50}</b><span>{t('calories')} ≈</span></div>
          </div>
        ) : <div className="small" style={{ marginTop: 8 }}>{t('enterBw')}</div>}
      </div>

      <h2>{t('integrations')}</h2>
      <div className="card">
        <div className="row between">
          <b style={{ color: 'var(--strava)' }}>Strava</b>
          {settings.strava && <span className="pill accent">{t('connected')}{settings.strava.athlete ? ` · ${settings.strava.athlete}` : ''}</span>}
        </div>
        {settings.strava ? (
          <>
            <label className="row between" style={{ marginTop: 12 }}>
              <span>{t('autoStrava')}</span>
              <input type="checkbox" checked={settings.autoStrava} onChange={(e) => updateSettings({ autoStrava: e.target.checked })} />
            </label>
            <button className="btn ghost block" style={{ marginTop: 12 }} onClick={() => updateSettings({ strava: undefined })}>{t('disconnect')}</button>
          </>
        ) : (
          <>
            <p className="muted small">{t('stravaHelp')} <code dir="ltr">{location.hostname}</code></p>
            <label className="field"><span>Client ID</span>
              <input className="input" dir="ltr" inputMode="numeric" value={settings.stravaClientId} onChange={(e) => updateSettings({ stravaClientId: e.target.value })} />
            </label>
            <label className="field"><span>Client Secret</span>
              <input className="input" dir="ltr" type="password" value={settings.stravaSecret} onChange={(e) => updateSettings({ stravaSecret: e.target.value })} />
            </label>
            <button className="btn strava block" style={{ marginTop: 12 }} disabled={!settings.stravaClientId || !settings.stravaSecret} onClick={connectStrava}>
              {t('connect')}
            </button>
            <div className="muted small" style={{ marginTop: 6 }} dir="ltr">{redirectUri()}</div>
          </>
        )}
      </div>
      <div className="card">
        <b>Garmin Connect</b>
        <p className="muted small" style={{ marginBottom: 0 }}>{t('garminHelp')}</p>
      </div>

      <h2>{t('data')}</h2>
      <div className="stack">
        <button className="btn ghost block" onClick={exportJson}>{t('exportJson')}</button>
        <button className="btn ghost block" onClick={exportCsv}>{t('exportCsv')}</button>
        <button className="btn ghost block" onClick={() => file.current?.click()}>{t('importJson')}</button>
        <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        <button className="btn danger block" onClick={() => { if (confirm(t('resetConfirm'))) resetState(); }}>{t('resetAll')}</button>
      </div>
      <p className="muted small" style={{ textAlign: 'center', marginTop: 24 }}>Worki Zone · v0.1</p>
    </div>
  );
}
