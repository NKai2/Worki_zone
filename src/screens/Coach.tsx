import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { Anthropic, ask } from '../lib/coach';
import type { Tab } from '../App';
import { Icon } from '../Icons';
import { updateSettings, useStore } from '../store';
import { Group, NavBar } from '../ui';

interface Bubble { role: 'user' | 'assistant'; text: string; notes: string[] }

// Kept at module level so the conversation survives switching tabs.
let apiHistory: Anthropic.Beta.BetaMessageParam[] = [];
let bubbles: Bubble[] = [];

export default function Coach(_props: { go?: (tab: Tab) => void }) {
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
        <NavBar title={t('coachTitle')} />
        <div className="center mt16">
          <div className="ob-hero" style={{ background: 'linear-gradient(145deg,#5e5ce6,#007aff)' }}><Icon.sparkle /></div>
          <p className="secondary" style={{ margin: '16px 8px', lineHeight: 1.45 }}>{t('coachNeedsKey')}</p>
        </div>
        <Group header={t('apiKey')}>
          <div className="cell">
            <Icon.key />
            <input className="grow" style={{ border: 0, background: 'transparent', outline: 'none' }} dir="ltr" type="password" autoComplete="off"
              placeholder="sk-ant-…" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} />
          </div>
        </Group>
        <button className="btn filled block mt16" disabled={!keyDraft.trim()} onClick={() => updateSettings({ anthropicKey: keyDraft.trim() })}>{t('save')}</button>
        <a className="btn plain block mt8" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">{t('getKey')}</a>
      </div>
    );
  }

  const last = items[items.length - 1];
  return (
    <div>
      <NavBar title={t('coachTitle')} actions={<>
        {items.length > 0 && <button className="nav-btn" onClick={reset} disabled={busy} aria-label={t('newChat')}><Icon.edit /></button>}
      </>} />

      <div className="chat">
        {items.length === 0 && (
          <>
            <div className="bubble assistant">{t('coachIntro')}</div>
            <div className="suggest-list">
              {t('suggestions').split('|').map((s) => (
                <button key={s} className="press" onClick={() => send(s)}><Icon.sparkle />{s}</button>
              ))}
            </div>
          </>
        )}
        {items.map((b, i) => (b.text || b.notes.length || b.role === 'user') ? (
          <div key={i} className={`bubble ${b.role}`} dir="auto">
            {b.text}
            {b.notes.map((n) => <span key={n} className="note" dir="ltr"><Icon.check />{n}</span>)}
          </div>
        ) : null)}
        {busy && last && !last.text && (
          <div className="bubble assistant" aria-label={t('thinking')}><span className="typing"><i /><i /><i /></span></div>
        )}
        <div ref={end} />
      </div>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <div className="inner">
          <textarea rows={1} dir="auto" value={text} placeholder={t('coachPlaceholder')} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }} />
          <button className="send-btn" type="submit" disabled={busy || !text.trim()} aria-label={t('send')}><Icon.arrowUp /></button>
        </div>
      </form>
    </div>
  );
}
