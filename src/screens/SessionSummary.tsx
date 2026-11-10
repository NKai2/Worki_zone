import { useState } from 'react';
import { EX } from '../data/exercises';
import { Icon } from '../Icons';
import { useT, type Key } from '../i18n';
import { uploadToStrava } from '../integrations/strava';
import { increment } from '../lib/plan';
import { fmtPace, pace, sessionSets, sessionVolume, swimDistance, updateSession } from '../lib/workout';
import { setState, useStore, type Session } from '../store';
import { Cell, Group, Stepper } from '../ui';

export function fmtDuration(ms: number) {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` : `${m}′`;
}

export default function SessionSummary({ sessionId, onClose, prs = [], celebrate }: { sessionId: string; onClose?: () => void; prs?: string[]; celebrate?: boolean }) {
  const { t, tx, lang } = useT();
  const session = useStore((s) => s.history.find((h) => h.id === sessionId));
  const stravaOn = useStore((s) => !!s.settings.strava);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Session['exercises']>([]);
  if (!session) return null;

  const isSwim = session.exercises.length === 0;
  const title = isSwim ? t('day_swim') : t(`day_${session.dayKey}` as Key);

  const editSet = (ei: number, si: number, patch: Partial<{ w: number; r: number }>) =>
    setDraft(draft.map((d, i) => (i === ei ? { ...d, sets: d.sets.map((x, j) => (j === si ? { ...x, ...patch } : x)) } : d)));
  const saveEdit = () => {
    updateSession(session.id, { exercises: draft.filter((d) => d.sets.length) });
    setEditing(false);
  };

  const send = async (s: Session) => {
    setBusy(true); setErr('');
    try {
      const id = await uploadToStrava(s, `Worki Zone · ${title}`);
      updateSession(s.id, { stravaId: id });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!confirm(`${t('delete')}?`)) return;
    setState((s) => ({ history: s.history.filter((h) => h.id !== session.id) }));
    onClose?.();
  };

  return (
    <div>
      {celebrate && (
        <div className="center" style={{ marginBottom: 6 }}>
          <div className="ob-hero" style={{ width: 76, height: 76, borderRadius: 22, background: 'linear-gradient(145deg,#30d158,#00c7be)' }}><Icon.check /></div>
        </div>
      )}
      <div className="center">
        <div className="footnote secondary">{new Date(session.start).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
        <div className="title3 mt8" style={{ fontSize: 26, fontWeight: 700 }}>{title}</div>
        {!isSwim && <div className="subhead secondary">{t('week')} {session.week}</div>}
      </div>

      <div className="tiles mt16">
        <div className="tile"><div className="k">{t('duration')}</div><div className="v">{fmtDuration(session.end - session.start)}</div></div>
        {isSwim ? (
          <>
            <div className="tile"><div className="k">{t('distanceShort')}</div><div className="v">{swimDistance(session)}<small> m</small></div></div>
            <div className="tile"><div className="k">{t('pace100')}</div><div className="v" dir="ltr">{fmtPace(pace(session.swims![0]))}</div></div>
          </>
        ) : (
          <>
            <div className="tile"><div className="k">{t('totalSets')}</div><div className="v">{sessionSets(session)}</div></div>
            <div className="tile"><div className="k">{t('volume')}</div><div className="v">{Math.round(sessionVolume(session)).toLocaleString()}</div></div>
          </>
        )}
      </div>

      {prs.length > 0 && (
        <Group header={t('prs')}>
          {prs.map((id) => <Cell key={id} icon={<Icon.trophy />} iconBg="#ff9f0a" title={tx(EX[id].name)} />)}
        </Group>
      )}

      {!isSwim && (editing ? (
        <>
          {draft.map((e, ei) => (
            <Group key={ei} header={tx(EX[e.exId].name)}>
              {e.sets.map((x, si) => (
                <div key={si} className="cell" style={{ gap: 8 }}>
                  <span className="set-num">{si + 1}</span>
                  <div className="grow"><Stepper value={x.w} step={increment(EX[e.exId]) || 1} decimal label={t('kg')} onChange={(w) => editSet(ei, si, { w })} /></div>
                  <div className="grow"><Stepper value={x.r} step={1} label={t('reps')} onChange={(r) => editSet(ei, si, { r: Math.round(r) })} /></div>
                  <button className="icon-btn" aria-label={t('remove')} onClick={() => setDraft(draft.map((d, i) => (i === ei ? { ...d, sets: d.sets.filter((_, j) => j !== si) } : d)))}><Icon.trash /></button>
                </div>
              ))}
            </Group>
          ))}
          <div className="row mt16">
            <button className="btn gray grow" onClick={() => setEditing(false)}>{t('cancel')}</button>
            <button className="btn filled grow" onClick={saveEdit}>{t('save')}</button>
          </div>
        </>
      ) : (
        <Group header={<div className="row between"><span>{t('exercisesTitle')}</span><button className="tint" style={{ textTransform: 'none', fontSize: 15 }} onClick={() => { setDraft(session.exercises); setEditing(true); }}>{t('edit')}</button></div>}>
          {session.exercises.map((e) => (
            <Cell key={e.exId} title={tx(EX[e.exId].name)} sub={<span className="num" dir="ltr">{e.sets.map((s) => (s.w ? `${s.w}×${s.r}` : `${s.r}`)).join('   ')}</span>} />
          ))}
        </Group>
      ))}

      {(session.swims ?? []).length > 0 && (
        <Group header={t('swim')}>
          {session.swims!.map((sw, i) => (
            <Cell key={i} icon={<Icon.swim />} iconBg="var(--cyan)"
              title={<span dir="ltr" className="num">{sw.distance} m · {Math.round(sw.duration / 60)} min</span>}
              sub={<>{t(`st_${sw.stroke}` as Key)} · {sw.pool ? `${sw.pool} m` : t('openWater')} · <span dir="ltr">{fmtPace(pace(sw))}</span>/100m</>} />
          ))}
        </Group>
      )}

      <Group header={t('share')}>
        {stravaOn && (session.stravaId
          ? <Cell title={t('sentStrava')} href={`https://www.strava.com/activities/${session.stravaId}`} icon={<Icon.upload />} iconBg="var(--strava)" chevron />
          : <Cell title={busy ? '…' : t('sendStrava')} onClick={() => send(session)} icon={<Icon.upload />} iconBg="var(--strava)" chevron />)}
        <Cell title={t('exportFit')} onClick={() => import('../integrations/fit').then((m) => m.downloadFit(session))} icon={<Icon.watch />} iconBg="#1c1c1e" chevron />
      </Group>
      {err && <div className="group-footer" style={{ color: 'var(--red)' }}>{err}</div>}

      <Group style={{ marginTop: 24 }}>
        <Cell title={t('deleteWorkout')} onClick={remove} danger />
      </Group>
      {onClose && <button className="btn filled block mt24" onClick={onClose}>{t('done')}</button>}
    </div>
  );
}
