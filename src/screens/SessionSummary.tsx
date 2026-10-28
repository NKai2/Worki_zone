import { useState } from 'react';
import { EX } from '../data/exercises';
import { useT, type Key } from '../i18n';
import { uploadToStrava } from '../integrations/strava';
import { increment } from '../lib/plan';
import { fmtPace, pace, sessionSets, sessionVolume, swimDistance, updateSession } from '../lib/workout';
import { Stepper } from '../ui';
import { setState, useStore, type Session } from '../store';
import { Icon } from '../Icons';

export function fmtDuration(ms: number) {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` : `${m}′`;
}

export default function SessionSummary({ sessionId, onClose, prs = [] }: { sessionId: string; onClose?: () => void; prs?: string[] }) {
  const { t, tx, lang } = useT();
  const session = useStore((s) => s.history.find((h) => h.id === sessionId));
  const stravaOn = useStore((s) => !!s.settings.strava);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Session['exercises']>([]);
  if (!session) return null;

  const editSet = (ei: number, si: number, patch: Partial<{ w: number; r: number }>) =>
    setDraft(draft.map((d, i) => (i === ei ? { ...d, sets: d.sets.map((x, j) => (j === si ? { ...x, ...patch } : x)) } : d)));
  const saveEdit = () => {
    updateSession(session.id, { exercises: draft.filter((d) => d.sets.length) });
    setEditing(false);
  };

  const title = session.dayKey === 'swim' ? `🏊 ${t('day_swim')}` : `${t(`day_${session.dayKey}` as Key)} · ${t('week')} ${session.week}`;
  const dist = swimDistance(session);

  const send = async (s: Session) => {
    setBusy(true); setErr('');
    try {
      const id = await uploadToStrava(s, `Worki Zone · ${t(`day_${s.dayKey}` as Key)}`);
      updateSession(s.id, { stravaId: id });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!confirm(t('delete') + '?')) return;
    setState((s) => ({ history: s.history.filter((h) => h.id !== session.id) }));
    onClose?.();
  };

  return (
    <div>
      <div className="muted small">{new Date(session.start).toLocaleString(lang === 'he' ? 'he-IL' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>
      <h1>{title}</h1>
      <div className="stats" style={{ marginTop: 12 }}>
        <div className="stat"><b>{fmtDuration(session.end - session.start)}</b><span>{t('duration')}</span></div>
        {session.exercises.length > 0 ? (
          <>
            <div className="stat"><b>{sessionSets(session)}</b><span>{t('totalSets')}</span></div>
            <div className="stat"><b>{Math.round(sessionVolume(session)).toLocaleString()}</b><span>{t('volume')}</span></div>
          </>
        ) : (
          <>
            <div className="stat"><b>{dist}</b><span>{t('distance')}</span></div>
            <div className="stat"><b dir="ltr">{fmtPace(pace(session.swims![0]))}</b><span>{t('pace100')}</span></div>
          </>
        )}
      </div>

      {prs.length > 0 && (
        <div className="card" style={{ marginTop: 12, borderColor: 'var(--accent)' }}>
          <h3>🏆 {t('prs')}</h3>
          <div className="small">{prs.map((id) => tx(EX[id].name)).join(' · ')}</div>
        </div>
      )}

      {editing ? (
        <div style={{ marginTop: 12 }}>
          {draft.map((e, ei) => (
            <div key={ei} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <b className="small">{tx(EX[e.exId].name)}</b>
              {e.sets.map((x, si) => (
                <div key={si} className="row" style={{ gap: 6, marginTop: 6 }}>
                  <span className="muted small" style={{ width: 18 }}>{si + 1}</span>
                  <div className="grow"><Stepper value={x.w} step={increment(EX[e.exId]) || 1} decimal onChange={(w) => editSet(ei, si, { w })} /></div>
                  <div className="grow"><Stepper value={x.r} step={1} onChange={(r) => editSet(ei, si, { r: Math.round(r) })} /></div>
                  <button className="icon-btn" aria-label={t('remove')} onClick={() => setDraft(draft.map((d, i) => (i === ei ? { ...d, sets: d.sets.filter((_, j) => j !== si) } : d)))}><Icon.trash /></button>
                </div>
              ))}
            </div>
          ))}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn ghost" onClick={() => setEditing(false)}>{t('cancel')}</button>
            <button className="btn primary grow" onClick={saveEdit}>{t('save')}</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {session.exercises.map((e) => (
            <div key={e.exId} className="row between small" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{tx(EX[e.exId].name)}</span>
              <span className="muted" dir="ltr">{e.sets.map((s) => (s.w ? `${s.w}×${s.r}` : `${s.r}`)).join('  ')}</span>
            </div>
          ))}
          {(session.swims ?? []).map((sw, i) => (
            <div key={i} className="swim-row">
              <span style={{ fontSize: 22 }}>🏊</span>
              <div className="grow">
                <b dir="ltr">{sw.distance} m · {Math.round(sw.duration / 60)} min</b>
                <div className="muted small">{t(`st_${sw.stroke}` as Key)} · {sw.pool ? `${sw.pool} m` : t('openWater')} · {t('pace100')} <span dir="ltr">{fmtPace(pace(sw))}</span></div>
              </div>
            </div>
          ))}
          {session.exercises.length > 0 && (
            <button className="btn sm ghost" style={{ marginTop: 10 }} onClick={() => { setDraft(session.exercises); setEditing(true); }}>✎ {t('edit')}</button>
          )}
        </div>
      )}

      <div className="stack" style={{ marginTop: 16 }}>
        {stravaOn && (
          session.stravaId ? (
            <a className="btn strava block" style={{ textDecoration: 'none' }} href={`https://www.strava.com/activities/${session.stravaId}`} target="_blank" rel="noreferrer">{t('sentStrava')}</a>
          ) : (
            <button className="btn strava block" disabled={busy} onClick={() => send(session)}>{busy ? '…' : t('sendStrava')}</button>
          )
        )}
        {err && <div className="small" style={{ color: 'var(--danger)' }}>{err}</div>}
        <button className="btn ghost block" onClick={() => import('../integrations/fit').then((m) => m.downloadFit(session))}>⌚ {t('exportFit')}</button>
        <div className="row">
          {onClose && <button className="btn primary grow" onClick={onClose}>{t('close')}</button>}
          <button className="btn danger" onClick={remove} aria-label={t('delete')}><Icon.trash /></button>
        </div>
      </div>
    </div>
  );
}
