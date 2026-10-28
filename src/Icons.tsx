const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const Icon = {
  today: () => <svg viewBox="0 0 24 24" {...P}><path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" /></svg>,
  plan: () => <svg viewBox="0 0 24 24" {...P}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>,
  library: () => <svg viewBox="0 0 24 24" {...P}><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg>,
  progress: () => <svg viewBox="0 0 24 24" {...P}><path d="M3 20h18M5 16l4-5 4 3 6-8" /></svg>,
  settings: () => <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  coach: () => <svg viewBox="0 0 24 24" {...P}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M9 10h.01M12 10h.01M15 10h.01" /></svg>,
  check: () => <svg viewBox="0 0 24 24" width="18" height="18" {...P} strokeWidth={3}><path d="M5 12l5 5L20 7" /></svg>,
  swap: () => <svg viewBox="0 0 24 24" width="16" height="16" {...P}><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>,
  play: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 4l13 8-13 8z" /></svg>,
  pause: () => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>,
  close: () => <svg viewBox="0 0 24 24" width="18" height="18" {...P}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  info: () => <svg viewBox="0 0 24 24" width="18" height="18" {...P}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>,
  trash: () => <svg viewBox="0 0 24 24" width="16" height="16" {...P}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>,
};
