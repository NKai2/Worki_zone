# Worki Zone 🏋️

אפליקציית אימונים לבניית מסת שריר — עובדת בדפדפן ומותקנת על הטלפון (PWA), גם בלי אינטרנט.
A hypertrophy training app that runs in the browser and installs on your phone (PWA), fully offline.

## מה יש בפנים / Features

| | |
|---|---|
| **בונה תוכניות** | שאלון קצר (ניסיון, ימים בשבוע, משך אימון, ציוד) → חלוקה אוטומטית: Full Body / Upper-Lower / PPL |
| **מחזור אימון (מזוציקל)** | 4 שבועות עם עלייה בנפח וירידה ב-RIR, ושבוע 5 דילואד |
| **עומס פרוגרסיבי** | Double progression: השלמת את כל החזרות בטווח העליון → המשקל עולה אוטומטית |
| **מסך אימון** | ביצועים קודמים לכל סט, טיימר מנוחה אוטומטי עם צליל ורטט, הוספה/הסרה של סטים |
| **44 תרגילים עם אנימציה** | אנימציות SVG שנבנו במיוחד (חינם, בלי זכויות יוצרים), דגשים, טעויות נפוצות, קישור לסרטון ביוטיוב |
| **התקדמות** | גרף 1RM משוער, סטים לשריר בשבוע, שיאים אישיים, משקל גוף |
| **Strava** | התחברות OAuth והעלאת כל אימון כ-Weight Training (ידני או אוטומטי) |
| **Garmin** | ייצוא קובץ FIT (סטים, חזרות ומשקלים) לייבוא ב-Garmin Connect |
| **מאמן AI (Claude)** | צ׳אט לשאלות על אימונים ותזונה, מכיר את התוכנית וההיסטוריה שלך. אפשר לכתוב "שקלתי 72" או "שחיתי 1500 מ׳ ב-32 דק׳" והוא רושם, וגם להחליף תרגילים בתוכנית |
| **שחייה** | רישום שחייה עצמאי או בתוך אימון כוח: מרחק, זמן, סגנון, בריכה. קצב ל-100 מ׳, גרף קצב, ק״מ שבועי. נשלח ל-Strava כ-Swim ולקובץ FIT של Garmin |
| **עדכון מהיר** | כפתורי ± למשקל ולחזרות, עריכת אימונים שכבר נשמרו, רישום משקל גוף מהמסך הראשי |
| **עברית / English** | כפתור אחד למעבר שפה, כולל RTL מלא |
| **גיבוי** | ייצוא/ייבוא JSON, ייצוא CSV. כל הנתונים נשמרים מקומית במכשיר |

## הרצה מקומית / Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## פרסום ל-GitHub Pages / Deploy

1. ב-GitHub: **Settings → Pages → Source: GitHub Actions**.
2. כל push ל-`main` בונה ומפרסם אוטומטית ל-`https://<user>.github.io/worki_zone/`.
3. בטלפון: לפתוח את הכתובת → "הוסף למסך הבית".

## חיבור Strava

1. ליצור אפליקציה אישית ב-<https://www.strava.com/settings/api>.
2. ב-**Authorization Callback Domain** לרשום את הדומיין של האפליקציה (למשל `nkai2.github.io`, או `localhost` לפיתוח).
3. בהגדרות האפליקציה להדביק Client ID + Client Secret וללחוץ "התחבר".

ה-Secret נשמר רק במכשיר שלך ולא נכלל בגיבויים.

## מאמן AI

1. ליצור מפתח ב-<https://console.anthropic.com> ← API Keys.
2. בהגדרות (או בלשונית "מאמן AI") להדביק את המפתח.

המפתח נשמר רק במכשיר ולא נכלל בגיבויים. השימוש מחויב בחשבון Anthropic שלך. האפליקציה פונה ל-Claude ישירות מהדפדפן, בלי שרת ביניים.

## Garmin

Garmin לא פותחת API לאפליקציות פרטיות, לכן יש שתי דרכים:
- לחבר Strava ↔ Garmin Connect, או
- בסיכום אימון: **"הורד קובץ FIT"** → Garmin Connect (באתר) → ייבוא נתונים.

## מבנה הקוד / Structure

```
src/
  anim/         SVG stick-figure engine (forward + inverse kinematics)
  data/         exercise library (bilingual cues, animations)
  lib/plan.ts   plan generator, periodisation, double progression
  lib/workout.ts  workout session actions
  integrations/ Strava OAuth/upload, Garmin FIT encoder
  screens/      Today, Plan, Workout, Library, Progress, Settings
test/gallery.html  dev page that renders every animation (npm run dev → /test/gallery.html)
```
