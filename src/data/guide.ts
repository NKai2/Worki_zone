import type { Text } from './types';

/* The program guide — the content of the printed program, shown in the app. */

export const BLOCKS: { weeks: Text; name: Text; rir: string; scheme: string; what: Text; color: string }[] = [
  {
    weeks: { he: 'שבועות 1-4', en: 'Weeks 1-4' }, name: { he: 'בסיס וטכניקה', en: 'Foundation' }, rir: 'RIR 3', scheme: '3×10-12',
    what: { he: 'לומדים את התנועות ובונים בסיס. משקלים בינוניים, הרבה שליטה.', en: 'Learn the movements and build a base. Moderate loads, lots of control.' },
    color: '#30d158',
  },
  {
    weeks: { he: 'שבועות 5-8', en: 'Weeks 5-8' }, name: { he: 'היפרטרופיה', en: 'Hypertrophy' }, rir: 'RIR 2', scheme: '3×8-12',
    what: { he: 'עיקר בניית המסה: יותר סטים, טווח חזרות בינוני.', en: 'The main growth phase: more sets in the classic hypertrophy range.' },
    color: '#0a84ff',
  },
  {
    weeks: { he: 'שבועות 9-12', en: 'Weeks 9-12' }, name: { he: 'כוח-מסה', en: 'Strength-size' }, rir: 'RIR 1-2', scheme: '4×6-8',
    what: { he: 'עומסים כבדים יותר בתרגילים המרכזיים — הבסיס לגדילה הבאה.', en: 'Heavier main lifts — the base for the next round of growth.' },
    color: '#bf5af2',
  },
  {
    weeks: { he: 'שבועות 13-16', en: 'Weeks 13-16' }, name: { he: 'שיא נפח', en: 'Peak volume' }, rir: 'RIR 0-1', scheme: '3×8-10 +1',
    what: { he: 'נפח מקסימלי. סט אחרון קרוב לכשל — רק בתרגילי בידוד.', en: 'Maximum volume. Last set close to failure — isolation only.' },
    color: '#ff9f0a',
  },
];

export interface GuideSection { id: string; icon: 'progress' | 'flame' | 'leaf' | 'shield' | 'warn' | 'ruler'; color: string; title: Text; lead: Text; points: Text[] }

export const GUIDE: GuideSection[] = [
  {
    id: 'progression', icon: 'progress', color: '#0a84ff',
    title: { he: 'איך מתקדמים', en: 'How you progress' },
    lead: { he: 'העמסה הדרגתית — האפליקציה מחשבת בשבילך.', en: 'Progressive overload — the app does the maths.' },
    points: [
      { he: 'לכל תרגיל יש טווח חזרות, למשל 8-12.', en: 'Every exercise has a rep range, e.g. 8-12.' },
      { he: 'השלמת את כל הסטים בקצה העליון? המשקל עולה: 2.5 ק״ג במוט, 1-2 ק״ג במשקולות.', en: 'Hit the top of the range on every set? Add 2.5 kg on a bar, 1-2 kg on dumbbells.' },
      { he: 'אחרי העלאה מתחילים מהקצה התחתון ומטפסים שוב.', en: 'After a jump, start at the bottom of the range and climb again.' },
      { he: 'RIR = כמה חזרות נשארו "במיכל". בסקוואט, דדליפט וגב תחתון — אף פעם לא לכשל.', en: 'RIR = reps left in the tank. Never go to failure on squats, hinges or lower-back work.' },
      { he: 'שבוע דילואד (4, 8, 12, 16): חצי סטים, משקל ‎-10%. כאן הגוף בונה.', en: 'Deload weeks (4, 8, 12, 16): half the sets, 10% lighter. This is when you build.' },
    ],
  },
  {
    id: 'warmup', icon: 'flame', color: '#ff9f0a',
    title: { he: 'חימום — 8 דקות', en: 'Warm-up — 8 minutes' },
    lead: { he: 'לפני כל אימון, בלי לדלג.', en: 'Before every session, no skipping.' },
    points: [
      { he: '3-5 דק׳ אופניים או הליכה מהירה.', en: '3-5 min bike or brisk walk.' },
      { he: 'חתול-גמל ×8 · 90/90 לירכיים ×5 לכל צד · גשר ישבן ×10.', en: 'Cat-camel ×8 · 90/90 hips ×5 per side · glute bridge ×10.' },
      { he: 'מתיחת כופפי ירך 30 ש׳ לכל צד.', en: 'Hip-flexor stretch 30 s per side.' },
      { he: '5 חזרות קלות של בירד דוג לכל צד — מלמד את הבטן להתייצב.', en: '5 easy bird dogs per side — teaches the trunk to brace.' },
      { he: 'בתרגיל הראשון: 2-3 סטי חימום הדרגתיים.', en: 'First exercise: 2-3 ramp-up sets.' },
    ],
  },
  {
    id: 'pelvis', icon: 'shield', color: '#30d158',
    title: { he: 'אגן וגב תחתון', en: 'Pelvis & lower back' },
    lead: { he: 'ארבעה עקרונות שבנויים לתוך כל אימון.', en: 'Four principles built into every session.' },
    points: [
      { he: 'יציבות: כל אימון נסגר בבירד דוג, דד באג או פלאנק — כשהשרירים המייצבים כבר לא נדרשים לסקוואט.', en: 'Stability: every session ends with a bird dog, dead bug or plank — once the stabilisers are no longer needed for squats.' },
      { he: 'ישבן חזק = אגן יציב: היפ תראסט, גשר ישבן ופשיטת גב בכל אימון.', en: 'Strong glutes = a stable pelvis: hip thrust, bridge or back extension every session.' },
      { he: 'רגל אחת: בולגרי ודדליפט על רגל אחת מאזנים בין הצדדים.', en: 'Single-leg work: Bulgarians and single-leg RDLs balance the sides.' },
      { he: 'עומס מבוקר: הינג׳ כבד פעם בשבוע, ושני תרגילי גב תחתון אף פעם לא צמודים.', en: 'Managed load: one heavy hinge a week, never two lower-back exercises in a row.' },
    ],
  },
  {
    id: 'nutrition', icon: 'leaf', color: '#64d2ff',
    title: { he: 'תזונה למסה', en: 'Eating for size' },
    lead: { he: 'מחושב לפי משקל הגוף האחרון שרשמת.', en: 'Calculated from your latest bodyweight.' },
    points: [
      { he: 'שוקלים 3 בקרים בשבוע ומסתכלים על הממוצע.', en: 'Weigh in 3 mornings a week and track the average.' },
      { he: 'אין עלייה שבועיים ברצף? מוסיפים 150-200 קק״ל.', en: 'No gain for two weeks? Add 150-200 kcal.' },
      { he: 'עולים מעל 0.75% בשבוע? מורידים 150 קק״ל.', en: 'Gaining more than 0.75% a week? Drop 150 kcal.' },
      { he: 'שינה של 7-9 שעות — בלעדיה המסה לא נבנית.', en: 'Sleep 7-9 hours — without it, size does not come.' },
    ],
  },
  {
    id: 'track', icon: 'ruler', color: '#bf5af2',
    title: { he: 'מדידה', en: 'Measuring progress' },
    lead: { he: 'מה בודקים, ומתי.', en: 'What to check, and when.' },
    points: [
      { he: 'כוח: כל סט נרשם — העלייה במשקלים היא הסימן הכי טוב לשריר.', en: 'Strength: every set is logged — rising loads are the best sign of muscle.' },
      { he: 'גוף: בכל שבוע דילואד — משקל ממוצע, היקפים ותמונה באותה תאורה.', en: 'Body: every deload week — average weight, girths and a photo in the same light.' },
      { he: 'תרגיל שלא זז 3 אימונים? מחליפים לגרסה מאותה משפחה.', en: 'Stuck for 3 sessions? Swap to another exercise from the same family.' },
    ],
  },
  {
    id: 'stop', icon: 'warn', color: '#ff453a',
    title: { he: 'מתי לעצור', en: 'When to stop' },
    lead: { he: 'ולפנות לפיזיותרפיסט/ית.', en: 'And see a physiotherapist.' },
    points: [
      { he: 'כאב חד בגב, כאב שמקרין לרגל, נימול או חולשה — מפסיקים את התרגיל.', en: 'Sharp back pain, pain down the leg, numbness or weakness — stop the exercise.' },
      { he: 'כאב שנמשך יותר מ-48 שעות או מחמיר משבוע לשבוע.', en: 'Pain lasting over 48 hours or worsening week to week.' },
      { he: 'חיזוק רצפת האגן (אחרי לידה, דליפה, כאבי אגן) — להתחיל עם פיזיותרפיסט/ית לרצפת האגן.', en: 'Pelvic-floor concerns (after birth, leaks, pelvic pain) — start with a pelvic-floor physio.' },
    ],
  },
];
