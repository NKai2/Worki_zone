const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const F = { fill: 'currentColor' };

/** SF Symbols–style icons. Tab icons take `on` to switch to the filled variant. */
export const Icon = {
  today: ({ on }: { on?: boolean }) => (
    <svg viewBox="0 0 28 28" {...P} strokeWidth={on ? 2.4 : 1.9}>
      <path d="M7 9.5v9M21 9.5v9M3.5 12v4M24.5 12v4M7 14h14" />
    </svg>
  ),
  plan: ({ on }: { on?: boolean }) => (
    <svg viewBox="0 0 28 28" {...P}>
      <rect x="4" y="5.5" width="20" height="18" rx="4" {...(on ? { fill: 'currentColor' } : {})} />
      <path d="M4 11h20M9.5 3.5v4M18.5 3.5v4" stroke={on ? 'var(--bg-elev)' : 'currentColor'} />
    </svg>
  ),
  coach: ({ on }: { on?: boolean }) => (
    <svg viewBox="0 0 28 28" {...P}>
      <path d="M14 4.5c5.8 0 10 3.8 10 8.6s-4.2 8.6-10 8.6c-1.1 0-2.2-.1-3.2-.4L5.5 23.5l1.3-4.4C5 17.5 4 15.4 4 13.1 4 8.3 8.2 4.5 14 4.5z" {...(on ? { fill: 'currentColor' } : {})} />
      <path d="M14 9.3l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" fill={on ? 'var(--bg-elev)' : 'currentColor'} stroke="none" />
    </svg>
  ),
  library: ({ on }: { on?: boolean }) => (
    <svg viewBox="0 0 28 28" {...P}>
      {[[4.5, 4.5], [15.5, 4.5], [4.5, 15.5], [15.5, 15.5]].map(([x, y]) => (
        <rect key={`${x}${y}`} x={x} y={y} width="8" height="8" rx="2.4" {...(on ? { fill: 'currentColor' } : {})} />
      ))}
    </svg>
  ),
  progress: ({ on }: { on?: boolean }) => (
    <svg viewBox="0 0 28 28" {...P} strokeWidth={on ? 2.4 : 1.9}>
      <path d="M4 21.5l6-7 4.5 3.5L24 7" />
      <path d="M18.5 7H24v5.5" />
    </svg>
  ),
  gear: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5" />
      <circle cx="12" cy="12" r="6.6" />
    </svg>
  ),
  globe: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </svg>
  ),
  chevron: () => <svg viewBox="0 0 10 16" {...P} strokeWidth={2.4}><path d="M2 2l6 6-6 6" /></svg>,
  check: () => <svg viewBox="0 0 24 24" {...P} strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  swap: () => <svg viewBox="0 0 24 24" {...P}><path d="M7 4L3.5 7.5 7 11M3.5 7.5H17M17 20l3.5-3.5L17 13M20.5 16.5H7" /></svg>,
  play: () => <svg viewBox="0 0 24 24" {...F}><path d="M7.5 4.8v14.4a1 1 0 0 0 1.5.9l11.3-7.2a1 1 0 0 0 0-1.7L9 4a1 1 0 0 0-1.5.8z" /></svg>,
  pause: () => <svg viewBox="0 0 24 24" {...F}><rect x="6" y="4.5" width="4" height="15" rx="1.2" /><rect x="14" y="4.5" width="4" height="15" rx="1.2" /></svg>,
  close: () => <svg viewBox="0 0 24 24" {...P} strokeWidth={2.6}><path d="M7 7l10 10M17 7L7 17" /></svg>,
  info: () => <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.6v.2" strokeWidth={2.4} /></svg>,
  trash: () => <svg viewBox="0 0 24 24" {...P}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" /></svg>,
  plus: () => <svg viewBox="0 0 24 24" {...P} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>,
  search: () => <svg viewBox="0 0 24 24" {...P} strokeWidth={2.2}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L20 20" /></svg>,
  arrowUp: () => <svg viewBox="0 0 24 24" {...P} strokeWidth={2.6}><path d="M12 19V5M6 11l6-6 6 6" /></svg>,
  swim: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <circle cx="16.5" cy="6.5" r="2" />
      <path d="M4 12.5l5-3.2 3 2.7 2.6-1.8M3 17c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0 3-1.2 4.5 0" />
    </svg>
  ),
  scale: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M8.5 9.5a5 5 0 0 1 7 0M12 12.2l1.6-2.4" />
    </svg>
  ),
  dumbbell: () => <svg viewBox="0 0 24 24" {...P} strokeWidth={2.2}><path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11" /></svg>,
  flame: () => <svg viewBox="0 0 24 24" {...P}><path d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-4.5-4-6.3-4.5-10.3-2.7 1.5-4.4 4-4.2 6.8-1.2-.6-2-1.8-2.2-3C6.3 9.900 5.500 12.200 5.500 14.800 5.5 18.4 8.1 21 12 21z" /></svg>,
  sparkle: () => <svg viewBox="0 0 24 24" {...F}><path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6-5.6-1.9 5.6-1.9zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" /></svg>,
  edit: () => <svg viewBox="0 0 24 24" {...P}><path d="M15.5 4.5l4 4L8.5 19.5H4.5v-4z" /></svg>,
  watch: () => <svg viewBox="0 0 24 24" {...P}><rect x="6" y="6" width="12" height="12" rx="3.5" /><path d="M8.5 6l.7-3h5.6l.7 3M8.5 18l.7 3h5.6l.7-3M12 9.5V12l1.6 1" /></svg>,
  video: () => <svg viewBox="0 0 24 24" {...P}><rect x="3" y="6" width="13" height="12" rx="3" /><path d="M16 10.5l5-3v9l-5-3" /></svg>,
  moon: () => <svg viewBox="0 0 24 24" {...P}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>,
  bell: () => <svg viewBox="0 0 24 24" {...P}><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" /></svg>,
  key: () => <svg viewBox="0 0 24 24" {...P}><circle cx="8" cy="15" r="4.5" /><path d="M11.2 11.8L20 3M16.5 6.5l2.5 2.5M14 9l2 2" /></svg>,
  doc: () => <svg viewBox="0 0 24 24" {...P}><path d="M6 3.5h8l4 4V20.5H6zM14 3.5V8h4" /></svg>,
  upload: () => <svg viewBox="0 0 24 24" {...P}><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 14.5v5h14v-5" /></svg>,
  download: () => <svg viewBox="0 0 24 24" {...P}><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 14.5v5h14v-5" /></svg>,
  leaf: () => <svg viewBox="0 0 24 24" {...P}><path d="M5 19c0-8 5-13.500 14-14 .5 9-4.500 14-12 14M5 19c3-4 6-6.500 9-8" /></svg>,
  trophy: () => <svg viewBox="0 0 24 24" {...P}><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z" /></svg>,
};
