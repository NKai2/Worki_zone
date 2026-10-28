import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { Anthropic, ask } from '../lib/coach';
import { updateSettings, useStore } from '../store';

interface Bubble { role: 'user' | 'assistant'; text: string; notes: string[] }

// Kept at module level so the conversation survives switching tabs.
let apiHistory: Anthropic.Beta.BetaMessageParam[] = [];
let bubbles: Bubble[] = [];

export default function Coach() {
  const { t } = useT();
  const key = useStore((s) => s.settings.anthropicKey);
  const [items, setItems] = useState<Bubble[]>(bubbles);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { bubbles = items; end.current?.scrollIntoView({ behavior: 'smooth' }); }, [items]);

  const update = (fn: (b: Bubble) => Bubble) =>
    setItems((list) => [...list.slice(0, -1), fn(list[list.length - 1])]);

  const send = async (q: string) => {
    q = q.trim();
    if (!q || busy) return;
    setText('');
    setBusy(true);
    setItems((l) => [...l, { role: 'user', text: q, notes: [] }, { role: 'assistant', text: '', notes: [] }]);
    const mark = apiHistory.length;
    apiHistory.push({ role: 'user', content: q });
    try {
      const result = await ask(apiHistory, {
        onText: (d) => update((b) => ({ ...b, text: b.text + d })),
        onNote: (n) => update((b) => ({ ...b, notes: [...b.notes, n] })),
      });
      if (result === 'refusal') update((b) => ({ ...b, text: b.text || t('refused') }));
    } catch (e) {
      let msg = t('coachError');
      if (e instanceof Anthropic.AuthenticationError) msg = t('badKey');
      else if (e instanceof Anthropic.RateLimitError) msg = t('rateLimited');
      else if (e instanceof Anthropic.APIError) msg = `${t('coachError')} (${e.status ?? ''}) ${e.message}`;
      update((b) => ({ ...b, text: b.text ? `${b.text}\n\n⚠️ ${msg}` : `⚠️ ${msg}` }));
      // Drop the failed turn so the next question starts from the last complete exchange
      apiHistory = apiHistory.slice(0, mark);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { apiHistory = []; setItems([]); };

  if (!key) {
    return (
      <div>
        <h1>{t('coachTitle')}</h1>
        <div className="card" style={{ marginTop: 12 }}>
          <p className="small" style={{ marginTop: 0 }}>{t('coachNeedsKey')}</p>
          <label className="field"><span>{t('apiKey')}</span>
            <input className="input" dir="ltr" type="password" placeholder="sk-ant-…" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} />
          </label>
          <button className="btn primary block" style={{ marginTop: 12 }} disabled={!keyDraft.trim()} onClick={() => updateSettings({ anthropicKey: keyDraft.trim() })}>{t('save')}</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="row between">
        <h1>{t('coachTitle')}</h1>
        {items.length > 0 && <button className="btn sm ghost" onClick={reset} disabled={busy}>{t('newChat')}</button>}
      </div>

      <div className="chat" style={{ marginTop: 10 }}>
        {items.length === 0 && (
          <>
            <div className="bubble assistant">{t('coachIntro')}</div>
            <div className="chip-row">
              {t('suggestions').split('|').map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
            </div>
          </>
        )}
        {items.map((b, i) => (
          <div key={i} className={`bubble ${b.role}`} dir="auto">
            {b.text || (busy && i === items.length - 1 ? <span className="muted">{t('thinking')}</span> : '')}
            {b.notes.map((n) => <span key={n} className="note" dir="ltr">{n}</span>)}
          </div>
        ))}
        <div ref={end} />
      </div>

      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <div className="inner">
          <textarea rows={1} dir="auto" value={text} placeholder={t('coachPlaceholder')} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }} />
          <button className="btn primary" type="submit" disabled={busy || !text.trim()}>{t('send')}</button>
        </div>
      </form>
    </div>
  );
}
