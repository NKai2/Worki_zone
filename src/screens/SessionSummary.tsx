import { useState } from 'react';
import { EX } from '../data/exercises';
import { useT, type Key } from '../i18n';
import { uploadToStrava } from '../integrations/strava';
import { sessionSets, sessionVolume, updateSession } from '../lib/workout';
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
  if (!session) return null;

  const title = `${t(`day_${session.dayKey}` as Key)} · ${t('week')} ${session.week}`;

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
        <div className="stat"><b>{sessionSets(session)}</b><span>{t('totalSets')}</span></div>
        <div className="stat"><b>{Math.round(sessionVolume(session)).toLocaleString()}</b><span>{t('volume')}</span></div>
      </div>

      {prs.length > 0 && (
        <div className="card" style={{ marginTop: 12, borderColor: 'var(--accent)' }}>
          <h3>🏆 {t('prs')}</h3>
          <div className="small">{prs.map((id) => tx(EX[id].name)).join(' · ')}</div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {session.exercises.map((e) => (
          <div key={e.exId} className="row between small" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span>{tx(EX[e.exId].name)}</span>
            <span className="muted" dir="ltr">{e.sets.map((s) => (s.w ? `${s.w}×${s.r}` : `${s.r}`)).join('  ')}</span>
          </div>
        ))}
      </div>

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
