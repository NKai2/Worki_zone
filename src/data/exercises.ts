import type { Exercise } from './types';

const STAND = { joint: 'ankle' as const, at: [108, 207] as [number, number] };

export const EXERCISES: Exercise[] = [
  // ───────────── Legs ─────────────
  {
    id: 'squat',
    name: { he: 'סקוואט עם מוט', en: 'Barbell Back Squat' },
    muscles: ['quads', 'glutes'], secondary: ['hamstrings', 'abs'],
    equip: ['barbell'], load: 'barbell', kind: 'compound', reps: [6, 10], rest: 180,
    cues: {
      he: ['רגליים ברוחב כתפיים, אצבעות מעט החוצה', 'לנשום עמוק ולהדק את הבטן לפני הירידה', 'לרדת עד שהירכיים לפחות מקבילות לרצפה', 'הברכיים עוקבות אחרי כיוון האצבעות', 'לדחוף את הרצפה דרך כל כף הרגל בעלייה'],
      en: ['Feet shoulder-width, toes slightly out', 'Big breath and brace your core before descending', 'Sit down until thighs are at least parallel', 'Knees track over your toes', 'Drive up through the whole foot'],
    },
    mistakes: {
      he: ['עקבים שמתרוממים מהרצפה', 'ברכיים שקורסות פנימה', 'גב תחתון שמתעגל בתחתית'],
      en: ['Heels lifting off the floor', 'Knees caving inward', 'Lower back rounding at the bottom'],
    },
    hl: ['th', 'hip'],
    anim: {
      anchor: STAND, props: [{ k: 'bb', at: 'back' }],
      frames: [
        { t: -88, l: [90, 90], a: [125, -75] },
        { t: -52, l: [8, 112], a: [125, -75] },
      ],
      tempo: [1.6, 0.3, 1.1, 0.5],
    },
  },
  {
    id: 'leg_press',
    name: { he: 'לחיצת רגליים במכונה', en: 'Leg Press' },
    muscles: ['quads', 'glutes'], secondary: ['hamstrings'],
    equip: ['machine'], load: 'machine', kind: 'compound', reps: [8, 12], rest: 150,
    cues: {
      he: ['גב וישבן צמודים למושב לאורך כל התנועה', 'כפות רגליים באמצע הפלטה ברוחב כתפיים', 'לרדת עד שהברכיים קרובות לחזה בלי שהאגן יתרומם', 'לא לנעול את הברכיים בסוף'],
      en: ['Keep back and hips glued to the pad', 'Feet mid-platform, shoulder-width', 'Lower until knees approach the chest without hips curling up', "Don't lock the knees out hard at the top"],
    },
    mistakes: {
      he: ['אגן שמתרומם מהמושב בתחתית', 'טווח תנועה קצר מדי'],
      en: ['Hips peeling off the seat at the bottom', 'Cutting the range of motion short'],
    },
    hl: ['th', 'hip'],
    anim: {
      props: [{ k: 'bench', from: [36, 142], to: [81, 168] }, { k: 'footplate', angle: 55 }],
      frames: [
        { hip: [85, 160], t: -150, lf: [150, 114], aw: [70, 10], f: -125 },
        { hip: [85, 160], t: -150, lf: [122, 124], aw: [70, 10], f: -125 },
      ],
      tempo: [1.6, 0.3, 1.1, 0.5],
    },
  },
  {
    id: 'goblet_squat',
    name: { he: 'גובלט סקוואט', en: 'Goblet Squat' },
    muscles: ['quads', 'glutes'], secondary: ['abs'],
    equip: ['dumbbell'], load: 'dumbbell', kind: 'compound', reps: [8, 12], rest: 120,
    cues: {
      he: ['להחזיק את המשקולת צמוד לחזה, מרפקים למטה', 'חזה זקוף ומבט קדימה', 'לרדת עמוק בין הברכיים', 'לעלות בשליטה עד עמידה מלאה'],
      en: ['Hold the dumbbell tight to your chest, elbows down', 'Chest up, eyes forward', 'Sit deep between your knees', 'Stand all the way up with control'],
    },
    mistakes: {
      he: ['גוף שנופל קדימה', 'משקולת שמתרחקת מהגוף'],
      en: ['Torso collapsing forward', 'Letting the weight drift away from the body'],
    },
    hl: ['th', 'hip'],
    anim: {
      anchor: STAND, props: [{ k: 'db' }],
      frames: [
        { t: -88, l: [90, 90], a: [60, -110] },
        { t: -64, l: [5, 114], a: [60, -110] },
      ],
    },
  },
  {
    id: 'bw_squat',
    name: { he: 'סקוואט משקל גוף', en: 'Bodyweight Squat' },
    muscles: ['quads', 'glutes'], secondary: [],
    equip: [], load: 'bodyweight', kind: 'compound', reps: [15, 25], rest: 90,
    cues: {
      he: ['ידיים קדימה לאיזון', 'לשבת אחורה כאילו יש כיסא', 'לשמור על עקבים על הרצפה', 'להאט את הירידה (3 שניות) כדי להקשות'],
      en: ['Arms forward for balance', 'Sit back as if onto a chair', 'Keep your heels down', 'Slow the descent (3 s) to make it harder'],
    },
    mistakes: { he: ['ירידה חלקית בלבד', 'ברכיים שקורסות פנימה'], en: ['Half reps', 'Knees caving in'] },
    hl: ['th', 'hip'],
    anim: {
      anchor: STAND,
      frames: [
        { t: -88, l: [90, 90], aw: [0, 0] },
        { t: -55, l: [6, 113], aw: [0, 0] },
      ],
    },
  },
  {
    id: 'rdl',
    name: { he: 'דדליפט רומני', en: 'Romanian Deadlift' },
    muscles: ['hamstrings', 'glutes'], secondary: ['back'],
    equip: ['barbell'], load: 'barbell', kind: 'compound', reps: [6, 10], rest: 150,
    cues: {
      he: ['ברכיים מעט כפופות ונשארות קבועות', 'לדחוף את האגן אחורה כמו לסגור דלת עם הישבן', 'המוט מחליק צמוד לרגליים', 'לרדת עד מתיחה חזקה בירך האחורית, גב ישר'],
      en: ['Soft knees that stay fixed', 'Push the hips back like closing a door with your butt', 'Bar slides down close to your legs', 'Lower to a strong hamstring stretch with a flat back'],
    },
    mistakes: { he: ['עיגול הגב', 'הפיכת התרגיל לסקוואט (כפיפת ברכיים)'], en: ['Rounding the back', 'Turning it into a squat by bending the knees'] },
    hl: ['th', 'hip'],
    anim: {
      anchor: { joint: 'ankle', at: [100, 207] }, props: [{ k: 'bb', at: 'hands' }],
      frames: [
        { t: -88, l: [92, 88], aw: [92, 92] },
        { t: -15, l: [58, 95], aw: [100, 100] },
      ],
      tempo: [1.8, 0.3, 1.1, 0.5],
    },
  },
  {
    id: 'db_rdl',
    name: { he: 'דדליפט רומני עם משקולות', en: 'Dumbbell Romanian Deadlift' },
    muscles: ['hamstrings', 'glutes'], secondary: ['back'],
    equip: ['dumbbell'], load: 'dumbbell', kind: 'compound', reps: [8, 12], rest: 120,
    cues: {
      he: ['משקולות צמודות לירכיים', 'אגן אחורה, גב ישר', 'לעצור כשמרגישים מתיחה בירך האחורית', 'לכווץ את הישבן בעלייה'],
      en: ['Dumbbells close to your thighs', 'Hips back, flat back', 'Stop at a deep hamstring stretch', 'Squeeze your glutes to stand'],
    },
    mistakes: { he: ['גב מעוגל', 'משקולות שמתרחקות קדימה'], en: ['Rounded back', 'Weights drifting forward'] },
    hl: ['th', 'hip'],
    anim: {
      anchor: { joint: 'ankle', at: [100, 207] }, props: [{ k: 'db' }],
      frames: [
        { t: -88, l: [92, 88], aw: [92, 92] },
        { t: -18, l: [58, 95], aw: [98, 98] },
      ],
      tempo: [1.8, 0.3, 1.1, 0.5],
    },
  },
  {
    id: 'deadlift',
    name: { he: 'דדליפט', en: 'Deadlift' },
    muscles: ['back', 'glutes', 'hamstrings'], secondary: ['quads'],
    equip: ['barbell'], load: 'barbell', kind: 'compound', reps: [5, 8], rest: 180,
    cues: {
      he: ['המוט מעל אמצע כף הרגל', 'לאחוז במוט, להוריד אגן ולהדק את הגב העליון', 'לדחוף את הרצפה ולהשאיר את המוט צמוד לשוקיים', 'לסיים בעמידה זקופה עם כיווץ ישבן, בלי להתכופף אחורה'],
      en: ['Bar over mid-foot', 'Grip, drop the hips and set your upper back tight', 'Push the floor away, keep the bar against your shins', 'Finish tall with glutes, no leaning back'],
    },
    mistakes: { he: ['עיגול גב תחתון', 'אגן שעולה לפני הכתפיים'], en: ['Rounding the lower back', 'Hips shooting up before the shoulders'] },
    hl: ['torso', 'hip', 'th'],
    anim: {
      anchor: { joint: 'ankle', at: [100, 207] }, props: [{ k: 'bb', at: 'hands' }],
      frames: [
        { t: -25, l: [20, 105], ah: [108, 193] },
        { t: -88, l: [90, 90], ah: [104, 131] },
      ],
      tempo: [1.1, 0.4, 1.5, 0.6],
    },
  },
  {
    id: 'hip_thrust',
    name: { he: 'היפ תראסט', en: 'Barbell Hip Thrust' },
    muscles: ['glutes'], secondary: ['hamstrings'],
    equip: ['barbell', 'bench'], load: 'barbell', kind: 'compound', reps: [8, 12], rest: 120,
    cues: {
      he: ['גב עליון נשען על קצה הספסל', 'כפות רגליים כך שבחלק העליון השוקיים אנכיות', 'סנטר לחזה, לדחוף את האגן למעלה', 'לעצור שנייה למעלה בכיווץ ישבן חזק'],
      en: ['Upper back on the edge of the bench', 'Feet placed so shins are vertical at the top', 'Chin tucked, drive hips up', 'Pause one second with a hard glute squeeze'],
    },
    mistakes: { he: ['קשת בגב התחתון בחלק העליון', 'דחיפה דרך האצבעות במקום העקבים'], en: ['Arching the lower back at the top', 'Pushing through the toes instead of heels'] },
    hl: ['hip'],
    anim: {
      props: [{ k: 'bench', from: [24, 166], to: [66, 166] }, { k: 'bb', at: 'hands' }],
      frames: [
        { hip: [95, 194], t: -132, lf: [140, 207], ah: [99, 186], h: 20 },
        { hip: [111, 150], t: 174, lf: [140, 207], ah: [113, 143], h: 20 },
      ],
      tempo: [1.0, 0.8, 1.3, 0.4],
    },
  },
  {
    id: 'glute_bridge',
    name: { he: 'גשר ישבן', en: 'Glute Bridge' },
    muscles: ['glutes'], secondary: ['hamstrings'],
    equip: [], load: 'bodyweight', kind: 'isolation', reps: [12, 20], rest: 75,
    cues: {
      he: ['שכיבה על הגב, ברכיים כפופות', 'לדחוף דרך העקבים ולהרים את האגן', 'קו ישר מהכתפיים לברכיים', 'להחזיק 2 שניות למעלה'],
      en: ['Lie on your back, knees bent', 'Drive through your heels to lift the hips', 'Straight line from shoulders to knees', 'Hold 2 seconds at the top'],
    },
    mistakes: { he: ['קשת בגב במקום עבודת ישבן'], en: ['Arching the back instead of using the glutes'] },
    hl: ['hip'],
    anim: {
      props: [{ k: 'mat', x1: 30, x2: 160 }],
      frames: [
        { hip: [100, 201], t: 180, lf: [132, 205], aw: [5, 0] },
        { hip: [96, 180], t: 156, lf: [132, 205], aw: [20, 10] },
      ],
      tempo: [1.0, 1.0, 1.2, 0.4],
    },
  },
  {
    id: 'split_squat',
    name: { he: 'ספליט סקוואט', en: 'Split Squat' },
    muscles: ['quads', 'glutes'], secondary: ['hamstrings'],
    equip: [], load: 'dumbbell', kind: 'compound', reps: [8, 12], rest: 90,
    cues: {
      he: ['עמידת פסיעה ארוכה, משקל על הרגל הקדמית', 'לרדת ישר למטה עד שהברך האחורית כמעט נוגעת', 'גוף זקוף', 'אפשר להחזיק משקולות כדי להקשות'],
      en: ['Long split stance, weight on the front leg', 'Drop straight down until the back knee nearly touches', 'Torso upright', 'Hold dumbbells to make it harder'],
    },
    mistakes: { he: ['עמידה צרה מדי שמקשה על שיווי משקל', 'דחיפה עם הרגל האחורית'], en: ['Stance too narrow for balance', 'Pushing with the back leg'] },
    hl: ['th', 'hip'],
    anim: {
      props: [{ k: 'db' }],
      frames: [
        { hip: [103, 130], t: -86, lf: [128, 207], lf2: [68, 204], f2: 30, aw: [92, 92] },
        { hip: [100, 166], t: -86, lf: [128, 207], lf2: [68, 204], f2: 30, aw: [92, 92] },
      ],
    },
  },
  {
    id: 'bulgarian',
    name: { he: 'בולגרי ספליט סקוואט', en: 'Bulgarian Split Squat' },
    muscles: ['quads', 'glutes'], secondary: ['hamstrings'],
    equip: ['bench'], load: 'dumbbell', kind: 'compound', reps: [8, 12], rest: 120,
    cues: {
      he: ['כף הרגל האחורית על ספסל', 'רוב המשקל על הרגל הקדמית', 'לרדת בשליטה עד שהירך הקדמית מקבילה', 'הטיה קלה קדימה מגבירה עבודת ישבן'],
      en: ['Rear foot on a bench', 'Most of the weight on the front leg', 'Lower under control until the front thigh is parallel', 'A slight forward lean adds glute work'],
    },
    mistakes: { he: ['רגל קדמית קרובה מדי לספסל', 'ברך שקורסת פנימה'], en: ['Front foot too close to the bench', 'Knee caving inward'] },
    hl: ['th', 'hip'],
    anim: {
      props: [{ k: 'bench', from: [30, 172], to: [68, 172] }, { k: 'db' }],
      frames: [
        { hip: [100, 128], t: -84, lf: [136, 207], lf2: [56, 163], f2: -10, aw: [92, 92] },
        { hip: [96, 160], t: -80, lf: [136, 207], lf2: [56, 163], f2: -10, aw: [92, 92] },
      ],
    },
  },
  {
    id: 'leg_extension',
    name: { he: 'פשיטת ברכיים במכונה', en: 'Leg Extension' },
    muscles: ['quads'], secondary: [],
    equip: ['machine'], load: 'machine', kind: 'isolation', reps: [10, 15], rest: 75,
    cues: {
      he: ['הברך מיושרת עם ציר המכונה', 'להחזיק בידיות ולהישאר צמודים למושב', 'ליישר עד הסוף ולעצור שנייה', 'לרדת לאט (2-3 שניות)'],
      en: ['Line your knee up with the machine pivot', 'Hold the handles and stay in the seat', 'Extend fully and pause a second', 'Lower slowly (2-3 s)'],
    },
    mistakes: { he: ['תנופה וזריקת המשקל', 'ישבן שמתרומם מהמושב'], en: ['Swinging the weight', 'Butt lifting off the seat'] },
    hl: ['th'],
    anim: {
      props: [{ k: 'bench', from: [72, 159], to: [136, 159] }, { k: 'bench', from: [74, 150], to: [66, 96], legs: false }, { k: 'pad' }],
      frames: [
        { hip: [92, 150], t: -96, l: [0, 95], aw: [80, 80], f: 10 },
        { hip: [92, 150], t: -96, l: [0, 2], aw: [80, 80], f: -80 },
      ],
      tempo: [1.0, 0.6, 1.6, 0.4],
    },
  },
  {
    id: 'leg_curl',
    name: { he: 'כפיפת ברכיים במכונה', en: 'Seated Leg Curl' },
    muscles: ['hamstrings'], secondary: ['calves'],
    equip: ['machine'], load: 'machine', kind: 'isolation', reps: [10, 15], rest: 75,
    cues: {
      he: ['להטות את הגוף מעט קדימה למתיחה טובה יותר', 'לכופף עד הסוף ולעצור', 'לחזור לאט עד יישור כמעט מלא'],
      en: ['Lean slightly forward for a better stretch', 'Curl all the way and pause', 'Return slowly to almost straight'],
    },
    mistakes: { he: ['טווח חלקי', 'הרמת האגן מהמושב'], en: ['Partial range', 'Hips lifting from the seat'] },
    hl: ['th'],
    anim: {
      props: [{ k: 'bench', from: [72, 159], to: [136, 159] }, { k: 'bench', from: [74, 150], to: [66, 96], legs: false }, { k: 'pad' }],
      frames: [
        { hip: [92, 150], t: -84, l: [0, 4], aw: [80, 80], f: -80 },
        { hip: [92, 150], t: -84, l: [0, 112], aw: [80, 80], f: 20 },
      ],
      tempo: [1.0, 0.6, 1.6, 0.4],
    },
  },
  {
    id: 'calf_raise',
    name: { he: 'הרמות עקבים בעמידה', en: 'Standing Calf Raise' },
    muscles: ['calves'], secondary: [],
    equip: [], load: 'bodyweight', kind: 'isolation', reps: [12, 20], rest: 60,
    cues: {
      he: ['קדמת כף הרגל על קצה מדרגה', 'לרדת למתיחה מלאה ולעצור שנייה', 'לעלות גבוה ככל האפשר על האצבעות', 'אפשר להחזיק משקולת ביד אחת'],
      en: ['Balls of the feet on a step edge', 'Drop into a full stretch and pause', 'Rise as high as you can', 'Hold a dumbbell to add load'],
    },
    mistakes: { he: ['קפיצות מהירות בלי עצירה במתיחה'], en: ['Bouncing without pausing in the stretch'] },
    hl: ['sh'],
    anim: {
      props: [{ k: 'step', x: 110, y: 197, w: 50 }],
      frames: [
        { hip: [104, 116], t: -90, l: [90, 90], f: -20, aw: [92, 92] },
        { hip: [104, 101], t: -90, l: [90, 90], f: 52, aw: [92, 92] },
      ],
      tempo: [0.9, 0.8, 1.3, 0.8],
    },
  },

  // ───────────── Chest ─────────────
  {
    id: 'bench_press',
    name: { he: 'לחיצת חזה במוט', en: 'Barbell Bench Press' },
    muscles: ['chest'], secondary: ['triceps', 'shoulders'],
    equip: ['barbell', 'bench'], load: 'barbell', kind: 'compound', reps: [6, 10], rest: 180,
    cues: {
      he: ['שכמות מכווצות ולמטה, קשת קלה בגב', 'אחיזה מעט רחבה מהכתפיים', 'להוריד את המוט בשליטה לאמצע-תחתית החזה', 'מרפקים בזווית של כ-45° מהגוף', 'רגליים יציבות על הרצפה'],
      en: ['Shoulder blades pinched and down, slight arch', 'Grip slightly wider than shoulders', 'Lower the bar under control to the lower chest', 'Elbows about 45° from the body', 'Feet planted firmly'],
    },
    mistakes: { he: ['הקפצת המוט מהחזה', 'מרפקים פתוחים ל-90°', 'הרמת הישבן מהספסל'], en: ['Bouncing the bar off the chest', 'Elbows flared to 90°', 'Butt lifting off the bench'] },
    hl: ['torso', 'ua'],
    anim: {
      armBend: 1,
      props: [{ k: 'bench', from: [40, 174], to: [140, 174] }, { k: 'bb', at: 'hands' }],
      frames: [
        { hip: [125, 166], t: 180, lf: [160, 207], ah: [77, 105] },
        { hip: [125, 166], t: 180, lf: [160, 207], ah: [92, 140] },
      ],
      tempo: [1.6, 0.3, 1.0, 0.5],
    },
  },
  {
    id: 'db_bench',
    name: { he: 'לחיצת חזה במשקולות', en: 'Dumbbell Bench Press' },
    muscles: ['chest'], secondary: ['triceps', 'shoulders'],
    equip: ['dumbbell', 'bench'], load: 'dumbbell', kind: 'compound', reps: [8, 12], rest: 150,
    cues: {
      he: ['משקולות מעל החזה, כפות ידיים קדימה', 'להוריד לצדי החזה עד מתיחה טובה', 'ללחוץ למעלה ומעט פנימה', 'שכמות צמודות לספסל'],
      en: ['Dumbbells over the chest, palms forward', 'Lower to the sides of the chest for a deep stretch', 'Press up and slightly in', 'Shoulder blades pinned to the bench'],
    },
    mistakes: { he: ['ירידה חלקית', 'משקולות שמתנדנדות'], en: ['Shallow reps', 'Wobbly, uncontrolled dumbbells'] },
    hl: ['torso', 'ua'],
    anim: {
      armBend: 1,
      props: [{ k: 'bench', from: [40, 174], to: [140, 174] }, { k: 'db' }],
      frames: [
        { hip: [125, 166], t: 180, lf: [160, 207], ah: [77, 105] },
        { hip: [125, 166], t: 180, lf: [160, 207], ah: [92, 142] },
      ],
      tempo: [1.6, 0.3, 1.0, 0.5],
    },
  },
  {
    id: 'incline_db_press',
    name: { he: 'לחיצת חזה בשיפוע עם משקולות', en: 'Incline Dumbbell Press' },
    muscles: ['chest'], secondary: ['shoulders', 'triceps'],
    equip: ['dumbbell', 'bench'], load: 'dumbbell', kind: 'compound', reps: [8, 12], rest: 150,
    cues: {
      he: ['ספסל בשיפוע 30°-45°', 'להוריד את המשקולות לגובה החזה העליון', 'מרפקים מעט מתחת לקו הכתפיים', 'ללחוץ למעלה בלי להתנגש בין המשקולות'],
      en: ['Bench at 30-45°', 'Lower to upper-chest level', 'Elbows slightly below shoulder line', "Press up without clanking the bells"],
    },
    mistakes: { he: ['שיפוע גבוה מדי שהופך את התרגיל לכתפיים'], en: ['Bench too steep — it becomes a shoulder press'] },
    hl: ['torso', 'ua'],
    anim: {
      armBend: 1,
      props: [{ k: 'bench', from: [121, 182], to: [150, 182] }, { k: 'bench', from: [121, 180], to: [74, 153], legs: false }, { k: 'db' }],
      frames: [
        { hip: [125, 172], t: -150, lf: [165, 207], ah: [88, 86] },
        { hip: [125, 172], t: -150, lf: [165, 207], ah: [100, 124] },
      ],
      tempo: [1.6, 0.3, 1.0, 0.5],
    },
  },
  {
    id: 'chest_press',
    name: { he: 'לחיצת חזה במכונה', en: 'Machine Chest Press' },
    muscles: ['chest'], secondary: ['triceps', 'shoulders'],
    equip: ['machine'], load: 'machine', kind: 'compound', reps: [8, 12], rest: 120,
    cues: {
      he: ['ידיות בגובה אמצע החזה', 'גב צמוד למשענת, חזה פתוח', 'ללחוץ קדימה בלי לנעול מרפקים', 'לחזור לאט עד מתיחה בחזה'],
      en: ['Handles at mid-chest height', 'Back against the pad, chest proud', 'Press forward without locking the elbows', 'Return slowly into a chest stretch'],
    },
    mistakes: { he: ['כתפיים שעולות לאוזניים'], en: ['Shrugging the shoulders up'] },
    hl: ['torso', 'ua'],
    anim: {
      armBend: 1,
      props: [{ k: 'bench', from: [70, 158], to: [120, 158] }, { k: 'bench', from: [76, 150], to: [72, 92], legs: false }, { k: 'cable', from: [205, 104] }],
      frames: [
        { hip: [90, 150], t: -92, l: [0, 90], ah: [104, 106] },
        { hip: [90, 150], t: -92, l: [0, 90], ah: [150, 104] },
      ],
      tempo: [1.0, 0.3, 1.6, 0.4],
    },
  },
  {
    id: 'push_up',
    name: { he: 'שכיבות סמיכה', en: 'Push-Up' },
    muscles: ['chest'], secondary: ['triceps', 'shoulders', 'abs'],
    equip: [], load: 'bodyweight', kind: 'compound', reps: [8, 20], rest: 90,
    cues: {
      he: ['ידיים מעט רחבות מהכתפיים', 'גוף בקו ישר מהראש לעקבים, בטן מכווצת', 'לרדת עד שהחזה כמעט נוגע ברצפה', 'מרפקים בזווית של כ-45°'],
      en: ['Hands slightly wider than shoulders', 'Straight line head to heels, abs tight', 'Lower until the chest nearly touches the floor', 'Elbows around 45°'],
    },
    mistakes: { he: ['אגן שוקע', 'ראש שנופל קדימה'], en: ['Sagging hips', 'Dropping the head'] },
    hl: ['torso', 'ua'],
    anim: {
      armBend: -1,
      anchor: { joint: 'ankle', at: [18, 199] },
      frames: [
        { t: -23.3, l: [156.7, 156.7], ah: [146, 207], f: 115 },
        { t: -3.9, l: [176.1, 176.1], ah: [146, 207], f: 115 },
      ],
    },
  },
  {
    id: 'cable_fly',
    name: { he: 'פרפר בכבלים', en: 'Cable Fly' },
    muscles: ['chest'], secondary: ['shoulders'],
    equip: ['cable'], load: 'cable', kind: 'isolation', reps: [10, 15], rest: 75,
    cues: {
      he: ['פסיעה קדימה, חזה פתוח', 'מרפקים מעט כפופים ונשארים קבועים', 'לחבק עץ גדול ולחבר את הידיים מול החזה', 'לחזור לאט עד מתיחה בחזה'],
      en: ['Step forward, chest open', 'Slight elbow bend that stays fixed', 'Hug a big tree, bringing hands together in front', 'Return slowly into a stretch'],
    },
    mistakes: { he: ['הפיכת התנועה ללחיצה (כיפוף מרפקים)'], en: ['Turning it into a press by bending the elbows'] },
    hl: ['torso'],
    anim: {
      view: 'front', armBend: -1,
      props: [{ k: 'cable', from: [212, 36] }],
      frames: [
        { hip: [110, 124], t: -90, l: [90, 90], ah: [186, 72] },
        { hip: [110, 124], t: -90, l: [90, 90], ah: [118, 116] },
      ],
      tempo: [1.0, 0.6, 1.6, 0.4],
    },
  },
  {
    id: 'db_fly',
    name: { he: 'פרפר עם משקולות', en: 'Dumbbell Fly' },
    muscles: ['chest'], secondary: ['shoulders'],
    equip: ['dumbbell', 'bench'], load: 'dumbbell', kind: 'isolation', reps: [10, 15], rest: 75,
    cues: {
      he: ['שכיבה על ספסל, משקולות מעל החזה', 'מרפקים מעט כפופים', 'לפתוח את הידיים לצדדים בקשת רחבה עד מתיחה', 'לחזור בקשת לנקודת ההתחלה'],
      en: ['Lie on a bench, dumbbells over your chest', 'Slight bend in the elbows', 'Open wide in an arc to a deep stretch', 'Arc back up to the start'],
    },
    mistakes: { he: ['ירידה עמוקה מדי עם משקל כבד'], en: ['Going too deep with too much weight'] },
    hl: ['torso'],
    anim: {
      view: 'front', armBend: -1, noGround: true,
      props: [{ k: 'bench', from: [110, 58], to: [110, 150], legs: false }, { k: 'db' }],
      frames: [
        { hip: [110, 128], t: -90, l: [90, 90], ah: [120, 68] },
        { hip: [110, 128], t: -90, l: [90, 90], ah: [184, 84] },
      ],
    },
  },

  // ───────────── Back ─────────────
  {
    id: 'lat_pulldown',
    name: { he: 'פולי עליון', en: 'Lat Pulldown' },
    muscles: ['back'], secondary: ['biceps', 'rearDelts'],
    equip: ['cable'], load: 'cable', kind: 'compound', reps: [8, 12], rest: 120,
    cues: {
      he: ['אחיזה מעט רחבה מהכתפיים', 'חזה גבוה והטיה קלה לאחור', 'למשוך את המרפקים למטה אל הצלעות', 'לחזור לאט עד מתיחה מלאה למעלה'],
      en: ['Grip slightly wider than shoulders', 'Chest up, slight lean back', 'Drive the elbows down to your ribs', 'Return slowly to a full stretch overhead'],
    },
    mistakes: { he: ['משיכה עם תנופה של כל הגוף', 'משיכה מאחורי הראש'], en: ['Swinging the whole body', 'Pulling behind the neck'] },
    hl: ['torso', 'ua'],
    anim: {
      armBend: 1,
      props: [{ k: 'bench', from: [76, 158], to: [128, 158] }, { k: 'cable', from: [104, 2] }],
      frames: [
        { hip: [98, 150], t: -100, l: [0, 90], ah: [102, 40] },
        { hip: [98, 150], t: -104, l: [0, 90], ah: [104, 96] },
      ],
      tempo: [1.0, 0.4, 1.6, 0.5],
    },
  },
  {
    id: 'pull_up',
    name: { he: 'מתח', en: 'Pull-Up' },
    muscles: ['back'], secondary: ['biceps', 'rearDelts', 'abs'],
    equip: ['pullup'], load: 'bodyweight', kind: 'compound', reps: [5, 12], rest: 150,
    cues: {
      he: ['אחיזה מעט רחבה מהכתפיים', 'להתחיל מתלייה מלאה עם כתפיים פעילות', 'למשוך את החזה אל המוט', 'לרדת בשליטה עד יישור מלא', 'אם קשה: להשתמש בגומייה או לעשות רק ירידות איטיות'],
      en: ['Grip slightly wider than shoulders', 'Start from a dead hang with active shoulders', 'Pull your chest to the bar', 'Lower under control to full extension', 'Too hard? Use a band or do slow negatives'],
    },
    mistakes: { he: ['חצי חזרות', 'נדנוד ובעיטות'], en: ['Half reps', 'Kipping and kicking'] },
    hl: ['torso', 'ua'],
    anim: {
      view: 'front', armBend: 1,
      props: [{ k: 'bar', at: [110, 8] }],
      frames: [
        { hip: [110, 118], t: -90, l: [90, 90], ah: [148, 8] },
        { hip: [110, 82], t: -90, l: [90, 90], ah: [148, 8] },
      ],
      tempo: [1.2, 0.4, 1.6, 0.5],
    },
  },
  {
    id: 'barbell_row',
    name: { he: 'חתירה במוט', en: 'Barbell Row' },
    muscles: ['back'], secondary: ['biceps', 'rearDelts', 'hamstrings'],
    equip: ['barbell'], load: 'barbell', kind: 'compound', reps: [8, 12], rest: 150,
    cues: {
      he: ['הטיה קדימה של כ-45° עם גב ישר', 'למשוך את המוט לבטן התחתונה', 'לכווץ את השכמות למעלה', 'לרדת בשליטה בלי להזיז את הגוף'],
      en: ['Hinge to about 45° with a flat back', 'Row the bar to your lower stomach', 'Squeeze the shoulder blades at the top', 'Lower under control without moving the torso'],
    },
    mistakes: { he: ['שימוש בתנופה של הגב', 'גב מעוגל'], en: ['Heaving with the lower back', 'Rounded back'] },
    hl: ['torso', 'ua'],
    anim: {
      armBend: 1,
      anchor: { joint: 'ankle', at: [96, 207] }, props: [{ k: 'bb', at: 'hands' }],
      frames: [
        { t: -28, l: [70, 100], ah: [134, 168] },
        { t: -28, l: [70, 100], ah: [110, 134] },
      ],
      tempo: [1.4, 0.3, 0.9, 0.6],
    },
  },
  {
    id: 'db_row',
    name: { he: 'חתירה במשקולת', en: 'Dumbbell Row' },
    muscles: ['back'], secondary: ['biceps', 'rearDelts'],
    equip: ['dumbbell'], load: 'dumbbell', kind: 'compound', reps: [8, 12], rest: 120,
    cues: {
      he: ['יד וברך נשענות על ספסל, או הטיה עם שתי משקולות', 'למשוך את המשקולת אל הירך', 'מרפק צמוד לגוף', 'מתיחה מלאה בתחתית'],
      en: ['Hand and knee on a bench, or hinge with two dumbbells', 'Pull the dumbbell toward your hip', 'Elbow close to the body', 'Full stretch at the bottom'],
    },
    mistakes: { he: ['סיבוב של הגוף כדי להרים'], en: ['Twisting the torso to lift'] },
    hl: ['torso', 'ua'],
    anim: {
      armBend: 1,
      anchor: { joint: 'ankle', at: [96, 207] }, props: [{ k: 'db' }],
      frames: [
        { t: -26, l: [70, 100], ah: [134, 170] },
        { t: -26, l: [70, 100], ah: [108, 138] },
      ],
      tempo: [1.4, 0.3, 0.9, 0.6],
    },
  },
  {
    id: 'cable_row',
    name: { he: 'חתירה בכבל בישיבה', en: 'Seated Cable Row' },
    muscles: ['back'], secondary: ['biceps', 'rearDelts'],
    equip: ['cable'], load: 'cable', kind: 'compound', reps: [8, 12], rest: 120,
    cues: {
      he: ['ברכיים מעט כפופות, גב זקוף', 'למשוך את הידית לבטן', 'חזה קדימה ושכמות לאחור', 'לתת לשכמות להימתח קדימה בחזרה'],
      en: ['Knees soft, torso upright', 'Pull the handle to your stomach', 'Chest out, shoulder blades back', 'Let the shoulder blades stretch forward on the return'],
    },
    mistakes: { he: ['נדנוד הגוף קדימה ואחורה'], en: ['Rocking the torso back and forth'] },
    hl: ['torso', 'ua'],
    anim: {
      armBend: 1,
      props: [{ k: 'bench', from: [50, 184], to: [108, 184] }, { k: 'cable', from: [200, 176] }],
      frames: [
        { hip: [80, 176], t: -76, lf: [152, 190], ah: [138, 132], f: -60 },
        { hip: [80, 176], t: -94, lf: [152, 190], ah: [98, 140], f: -60 },
      ],
      tempo: [1.0, 0.4, 1.5, 0.4],
    },
  },

  {
    id: 'inverted_row',
    name: { he: 'חתירה הפוכה', en: 'Inverted Row' },
    muscles: ['back'], secondary: ['biceps', 'rearDelts'],
    equip: [], load: 'bodyweight', kind: 'compound', reps: [8, 15], rest: 90,
    cues: {
      he: ['שכיבה מתחת לשולחן יציב או מוט נמוך, אחיזה בקצה', 'גוף ישר מהעקבים לכתפיים', 'למשוך את החזה אל השולחן/המוט', 'קל יותר: לכופף ברכיים. קשה יותר: רגליים מוגבהות'],
      en: ['Lie under a sturdy table or low bar and grip the edge', 'Straight body from heels to shoulders', 'Pull your chest up to the edge', 'Easier: bend the knees. Harder: elevate the feet'],
    },
    mistakes: { he: ['אגן שצונח', 'משיכה עם הצוואר'], en: ['Hips sagging', 'Reaching with the neck'] },
    hl: ['torso', 'ua'],
    anim: {
      armBend: -1,
      props: [{ k: 'bar', at: [140, 118], post: 1 }],
      frames: [
        { hip: [92.5, 189], t: -11, lf: [10, 205], ah: [140, 118], f: -80 },
        { hip: [84.8, 166.9], t: -27, lf: [10, 205], ah: [140, 118], f: -80 },
      ],
      tempo: [1.0, 0.4, 1.5, 0.4],
    },
  },

  // ───────────── Shoulders ─────────────
  {
    id: 'ohp',
    name: { he: 'לחיצת כתפיים בעמידה', en: 'Overhead Press' },
    muscles: ['shoulders'], secondary: ['triceps', 'abs'],
    equip: ['barbell'], load: 'barbell', kind: 'compound', reps: [6, 10], rest: 150,
    cues: {
      he: ['מוט על הכתפיים, אחיזה ברוחב כתפיים', 'ישבן ובטן מכווצים', 'ללחוץ את המוט ישר למעלה ולהכניס את הראש מתחתיו', 'לנעול למעלה עם המוט מעל אמצע כף הרגל'],
      en: ['Bar on the front delts, shoulder-width grip', 'Squeeze glutes and abs', 'Press straight up and move your head through', 'Lock out with the bar over mid-foot'],
    },
    mistakes: { he: ['קשת מוגזמת בגב התחתון'], en: ['Excessive lower-back arch'] },
    hl: ['shoulder', 'ua'],
    anim: {
      armBend: -1,
      anchor: STAND, props: [{ k: 'bb', at: 'hands' }],
      frames: [
        { t: -90, l: [90, 90], ah: [120, 72] },
        { t: -90, l: [90, 90], ah: [110, 12] },
      ],
      tempo: [1.0, 0.4, 1.4, 0.4],
    },
  },
  {
    id: 'db_shoulder_press',
    name: { he: 'לחיצת כתפיים במשקולות', en: 'Dumbbell Shoulder Press' },
    muscles: ['shoulders'], secondary: ['triceps'],
    equip: ['dumbbell'], load: 'dumbbell', kind: 'compound', reps: [8, 12], rest: 120,
    cues: {
      he: ['משקולות בגובה הכתפיים, מרפקים מעט קדימה', 'ללחוץ למעלה עד יישור', 'לרדת עד גובה האוזניים לפחות', 'בישיבה עם משענת או בעמידה'],
      en: ['Dumbbells at shoulder height, elbows slightly forward', 'Press up to lockout', 'Lower to at least ear level', 'Seated with back support or standing'],
    },
    mistakes: { he: ['קשת בגב', 'טווח קצר'], en: ['Arching the back', 'Short range of motion'] },
    hl: ['shoulder', 'ua'],
    anim: {
      view: 'front', armBend: -1,
      props: [{ k: 'db' }],
      frames: [
        { hip: [110, 124], t: -90, l: [90, 90], ah: [150, 66] },
        { hip: [110, 124], t: -90, l: [90, 90], ah: [136, 12] },
      ],
      tempo: [1.0, 0.4, 1.4, 0.4],
    },
  },
  {
    id: 'pike_push_up',
    name: { he: 'שכיבות סמיכה בפייק', en: 'Pike Push-Up' },
    muscles: ['shoulders'], secondary: ['triceps'],
    equip: [], load: 'bodyweight', kind: 'compound', reps: [6, 15], rest: 90,
    cues: {
      he: ['אגן גבוה, גוף בצורת V הפוכה', 'להוריד את הראש לכיוון הרצפה בין הידיים', 'לדחוף חזרה למעלה', 'להקשות: רגליים על ספסל'],
      en: ['Hips high in an inverted V', 'Lower your head toward the floor between your hands', 'Press back up', 'Harder: feet on a bench'],
    },
    mistakes: { he: ['אגן נמוך שהופך את זה לשכיבת סמיכה רגילה'], en: ['Hips too low — it turns into a regular push-up'] },
    hl: ['shoulder', 'ua'],
    anim: {
      armBend: 1,
      frames: [
        { hip: [90, 126], t: 30, lf: [58, 205], ah: [140, 207], f: 115 },
        { hip: [92, 132], t: 45, lf: [58, 205], ah: [140, 207], f: 115 },
      ],
    },
  },
  {
    id: 'lateral_raise',
    name: { he: 'הרחקת כתפיים לצדדים', en: 'Lateral Raise' },
    muscles: ['shoulders'], secondary: [],
    equip: ['dumbbell'], load: 'dumbbell', kind: 'isolation', reps: [12, 20], rest: 60,
    cues: {
      he: ['הטיה קלה קדימה, מרפקים מעט כפופים', 'להרים לצדדים עד גובה הכתפיים', 'להוביל עם המרפקים, לא עם כפות הידיים', 'לרדת לאט'],
      en: ['Slight forward lean, soft elbows', 'Raise out to the sides to shoulder height', 'Lead with the elbows, not the hands', 'Lower slowly'],
    },
    mistakes: { he: ['תנופה ומשקל כבד מדי', 'כיווץ טרפזים'], en: ['Swinging with too much weight', 'Shrugging the traps'] },
    hl: ['shoulder'],
    anim: {
      view: 'front',
      props: [{ k: 'db' }],
      frames: [
        { hip: [110, 124], t: -90, l: [90, 90], aw: [84, 86] },
        { hip: [110, 124], t: -90, l: [90, 90], aw: [-4, 6] },
      ],
      tempo: [1.0, 0.4, 1.5, 0.4],
    },
  },
  {
    id: 'face_pull',
    name: { he: 'פייס פול', en: 'Face Pull' },
    muscles: ['rearDelts'], secondary: ['back'],
    equip: ['cable'], load: 'cable', kind: 'isolation', reps: [12, 20], rest: 60,
    cues: {
      he: ['כבל בגובה הפנים עם חבל', 'למשוך לכיוון המצח ולפתוח את החבל לצדדים', 'מרפקים גבוהים', 'לעצור שנייה בכיווץ'],
      en: ['Cable at face height with a rope', 'Pull toward your forehead, spreading the rope', 'Elbows high', 'Pause one second in the squeeze'],
    },
    mistakes: { he: ['הטיית הגוף לאחור', 'מרפקים נמוכים'], en: ['Leaning back', 'Elbows dropping low'] },
    hl: ['shoulder'],
    anim: {
      armBend: -1,
      anchor: { joint: 'ankle', at: [92, 207] }, props: [{ k: 'cable', from: [205, 64] }],
      frames: [
        { t: -90, l: [90, 90], ah: [152, 70] },
        { t: -90, l: [90, 90], ah: [110, 56] },
      ],
      tempo: [1.0, 0.6, 1.4, 0.4],
    },
  },

  // ───────────── Arms ─────────────
  {
    id: 'db_curl',
    name: { he: 'כפיפת מרפקים במשקולות', en: 'Dumbbell Curl' },
    muscles: ['biceps'], secondary: [],
    equip: ['dumbbell'], load: 'dumbbell', kind: 'isolation', reps: [10, 15], rest: 60,
    cues: {
      he: ['מרפקים צמודים לגוף ולא זזים', 'לסובב את כף היד כלפי מעלה בזמן ההרמה', 'לכווץ למעלה', 'לרדת לאט עד יישור מלא'],
      en: ['Elbows pinned to your sides', 'Turn palms up as you curl', 'Squeeze at the top', 'Lower slowly to full extension'],
    },
    mistakes: { he: ['נדנוד הגוף', 'מרפקים שזזים קדימה'], en: ['Swinging the body', 'Elbows drifting forward'] },
    hl: ['ua'],
    anim: {
      anchor: STAND, props: [{ k: 'db' }],
      frames: [
        { t: -90, l: [90, 90], a: [92, 92] },
        { t: -90, l: [90, 90], a: [86, -72] },
      ],
      tempo: [0.9, 0.4, 1.6, 0.4],
    },
  },
  {
    id: 'hammer_curl',
    name: { he: 'כפיפת פטיש', en: 'Hammer Curl' },
    muscles: ['biceps'], secondary: [],
    equip: ['dumbbell'], load: 'dumbbell', kind: 'isolation', reps: [10, 15], rest: 60,
    cues: {
      he: ['אחיזה ניטרלית (אגודלים למעלה)', 'מרפקים צמודים לגוף', 'להרים עד הכתף ולרדת לאט'],
      en: ['Neutral grip (thumbs up)', 'Elbows tight to the body', 'Curl to the shoulder, lower slowly'],
    },
    mistakes: { he: ['תנופה'], en: ['Using momentum'] },
    hl: ['ua', 'fa'],
    anim: {
      anchor: STAND, props: [{ k: 'db' }],
      frames: [
        { t: -90, l: [90, 90], a: [92, 92] },
        { t: -90, l: [90, 90], a: [84, -76] },
      ],
      tempo: [0.9, 0.4, 1.6, 0.4],
    },
  },
  {
    id: 'barbell_curl',
    name: { he: 'כפיפת מרפקים במוט', en: 'Barbell Curl' },
    muscles: ['biceps'], secondary: [],
    equip: ['barbell'], load: 'barbell', kind: 'isolation', reps: [8, 12], rest: 75,
    cues: {
      he: ['אחיזה ברוחב כתפיים, כפות ידיים קדימה', 'מרפקים קבועים בצד הגוף', 'להרים עד כיווץ מלא', 'לרדת לאט'],
      en: ['Shoulder-width underhand grip', 'Elbows fixed at your sides', 'Curl to a full squeeze', 'Lower slowly'],
    },
    mistakes: { he: ['הטיה לאחור כדי להרים'], en: ['Leaning back to lift the bar'] },
    hl: ['ua'],
    anim: {
      anchor: STAND, props: [{ k: 'bb', at: 'hands' }],
      frames: [
        { t: -90, l: [90, 90], a: [92, 92] },
        { t: -90, l: [90, 90], a: [84, -70] },
      ],
      tempo: [0.9, 0.4, 1.6, 0.4],
    },
  },
  {
    id: 'cable_curl',
    name: { he: 'כפיפת מרפקים בכבל', en: 'Cable Curl' },
    muscles: ['biceps'], secondary: [],
    equip: ['cable'], load: 'cable', kind: 'isolation', reps: [10, 15], rest: 60,
    cues: {
      he: ['כבל נמוך, פסיעה קטנה אחורה', 'מרפקים צמודים', 'מתח קבוע לאורך כל התנועה'],
      en: ['Low pulley, small step back', 'Elbows pinned', 'Constant tension throughout'],
    },
    mistakes: { he: ['שחרור המתח בתחתית'], en: ['Letting the stack rest at the bottom'] },
    hl: ['ua'],
    anim: {
      anchor: { joint: 'ankle', at: [96, 207] }, props: [{ k: 'cable', from: [160, 204] }],
      frames: [
        { t: -90, l: [90, 90], a: [90, 80] },
        { t: -90, l: [90, 90], a: [84, -70] },
      ],
      tempo: [0.9, 0.4, 1.6, 0.4],
    },
  },
  {
    id: 'pushdown',
    name: { he: 'פשיטת מרפקים בכבל', en: 'Triceps Pushdown' },
    muscles: ['triceps'], secondary: [],
    equip: ['cable'], load: 'cable', kind: 'isolation', reps: [10, 15], rest: 60,
    cues: {
      he: ['מרפקים צמודים לצלעות ולא זזים', 'ליישר את הידיים עד הסוף למטה', 'לעצור ולכווץ', 'לחזור בשליטה עד זווית של 90°'],
      en: ['Elbows locked to your ribs', 'Extend fully down', 'Pause and squeeze', 'Return under control to about 90°'],
    },
    mistakes: { he: ['מרפקים שזזים קדימה', 'רכינה מעל המשקל'], en: ['Elbows flaring forward', 'Leaning over the weight'] },
    hl: ['ua'],
    anim: {
      anchor: { joint: 'ankle', at: [100, 207] }, props: [{ k: 'cable', from: [142, 4] }],
      frames: [
        { t: -84, l: [90, 90], a: [92, -40] },
        { t: -84, l: [90, 90], a: [92, 94] },
      ],
      tempo: [0.9, 0.5, 1.5, 0.4],
    },
  },
  {
    id: 'overhead_ext',
    name: { he: 'פשיטת מרפקים מעל הראש', en: 'Overhead Triceps Extension' },
    muscles: ['triceps'], secondary: [],
    equip: ['dumbbell'], load: 'dumbbell', kind: 'isolation', reps: [10, 15], rest: 60,
    cues: {
      he: ['משקולת אחת בשתי ידיים מעל הראש', 'מרפקים מצביעים קדימה-למעלה', 'להוריד מאחורי הראש עד מתיחה עמוקה', 'ליישר עד הסוף'],
      en: ['One dumbbell in both hands overhead', 'Elbows point forward/up', 'Lower behind your head into a deep stretch', 'Extend fully'],
    },
    mistakes: { he: ['מרפקים שנפתחים לצדדים', 'קשת בגב'], en: ['Elbows flaring out', 'Arching the back'] },
    hl: ['ua'],
    anim: {
      anchor: STAND, props: [{ k: 'db' }],
      frames: [
        { t: -90, l: [90, 90], a: [-82, -86] },
        { t: -90, l: [90, 90], a: [-82, 120] },
      ],
      tempo: [1.4, 0.4, 1.0, 0.4],
    },
  },
  {
    id: 'skull_crusher',
    name: { he: 'פשיטת מרפקים בשכיבה', en: 'Skull Crusher' },
    muscles: ['triceps'], secondary: [],
    equip: ['barbell', 'bench'], load: 'barbell', kind: 'isolation', reps: [8, 12], rest: 75,
    cues: {
      he: ['זרועות מעט נטויות לכיוון הראש', 'להוריד את המוט אל המצח או מאחורי הראש', 'רק המרפקים זזים', 'ליישר עד הסוף'],
      en: ['Upper arms tilted slightly toward your head', 'Lower the bar to your forehead or just behind', 'Only the elbows move', 'Extend fully'],
    },
    mistakes: { he: ['מרפקים שנפתחים', 'משקל כבד מדי'], en: ['Elbows flaring', 'Too much weight'] },
    hl: ['ua'],
    anim: {
      props: [{ k: 'bench', from: [40, 174], to: [140, 174] }, { k: 'bb', at: 'hands' }],
      frames: [
        { hip: [125, 166], t: 180, lf: [160, 207], aw: [-100, -100] },
        { hip: [125, 166], t: 180, lf: [160, 207], aw: [-100, 152] },
      ],
      tempo: [1.4, 0.3, 1.0, 0.4],
    },
  },
  {
    id: 'bench_dip',
    name: { he: 'מקבילים על ספסל', en: 'Bench Dip' },
    muscles: ['triceps'], secondary: ['chest', 'shoulders'],
    equip: [], load: 'bodyweight', kind: 'compound', reps: [10, 20], rest: 75,
    cues: {
      he: ['ידיים על קצה ספסל או כיסא יציב מאחוריך', 'גב קרוב לספסל', 'לרדת עד זווית של 90° במרפקים', 'לדחוף חזרה למעלה'],
      en: ['Hands on the edge of a bench or sturdy chair behind you', 'Keep your back close to the bench', 'Lower to about 90° at the elbows', 'Press back up'],
    },
    mistakes: { he: ['ירידה עמוקה מדי שמעמיסה על הכתפיים'], en: ['Going too deep and straining the shoulders'] },
    hl: ['ua'],
    anim: {
      armBend: 1,
      props: [{ k: 'bench', from: [30, 165], to: [72, 165] }],
      frames: [
        { hip: [80, 155], t: -88, lf: [154, 207], ah: [70, 161], f: -60 },
        { hip: [80, 182], t: -86, lf: [154, 207], ah: [70, 161], f: -60 },
      ],
    },
  },

  // ───────────── Core ─────────────
  {
    id: 'hanging_leg_raise',
    name: { he: 'הרמת רגליים בתלייה', en: 'Hanging Leg Raise' },
    muscles: ['abs'], secondary: [],
    equip: ['pullup'], load: 'bodyweight', kind: 'isolation', reps: [8, 15], rest: 75,
    cues: {
      he: ['תלייה על מוט, כתפיים פעילות', 'להרים את הרגליים בלי תנופה', 'לגלגל את האגן למעלה בסוף', 'קל יותר: ברכיים כפופות'],
      en: ['Hang from a bar, shoulders active', 'Raise the legs without swinging', 'Curl the pelvis up at the top', 'Easier: bent knees'],
    },
    mistakes: { he: ['נדנוד של כל הגוף'], en: ['Swinging the whole body'] },
    hl: ['torso', 'hip'],
    anim: {
      props: [{ k: 'bar', at: [114, 8] }],
      frames: [
        { hip: [110, 118], t: -90, l: [92, 92], aw: [-87, -87] },
        { hip: [106, 118], t: -86, l: [-2, 2], aw: [-84, -84] },
      ],
      tempo: [1.0, 0.4, 1.4, 0.5],
    },
  },
  {
    id: 'leg_raise',
    name: { he: 'הרמת רגליים בשכיבה', en: 'Lying Leg Raise' },
    muscles: ['abs'], secondary: [],
    equip: [], load: 'bodyweight', kind: 'isolation', reps: [10, 20], rest: 60,
    cues: {
      he: ['גב תחתון צמוד לרצפה', 'להרים רגליים ישרות עד 90°', 'לרדת לאט בלי לגעת ברצפה'],
      en: ['Lower back pressed into the floor', 'Raise straight legs to 90°', 'Lower slowly without touching down'],
    },
    mistakes: { he: ['קשת בגב התחתון'], en: ['Lower back arching off the floor'] },
    hl: ['torso', 'hip'],
    anim: {
      props: [{ k: 'mat', x1: 40, x2: 200 }],
      frames: [
        { hip: [100, 201], t: 180, l: [-4, -4], aw: [4, 0] },
        { hip: [100, 201], t: 180, l: [-88, -88], aw: [4, 0] },
      ],
      tempo: [1.0, 0.4, 1.6, 0.4],
    },
  },
  {
    id: 'crunch',
    name: { he: 'כפיפות בטן', en: 'Crunch' },
    muscles: ['abs'], secondary: [],
    equip: [], load: 'bodyweight', kind: 'isolation', reps: [12, 25], rest: 60,
    cues: {
      he: ['שכיבה עם ברכיים כפופות', 'לגלגל את עמוד השדרה ולהרים את הכתפיים', 'לנשוף בעלייה', 'לא למשוך את הצוואר'],
      en: ['Lie with knees bent', 'Curl your spine to lift the shoulders', 'Exhale on the way up', "Don't yank your neck"],
    },
    mistakes: { he: ['משיכת הראש עם הידיים'], en: ['Pulling the head with the hands'] },
    hl: ['torso'],
    anim: {
      props: [{ k: 'mat', x1: 30, x2: 160 }],
      frames: [
        { hip: [100, 201], t: 180, lf: [138, 205], a: [90, 90], h: 0 },
        { hip: [100, 201], t: 208, lf: [138, 205], a: [90, 90], h: 10 },
      ],
      tempo: [0.9, 0.6, 1.2, 0.4],
    },
  },
  {
    id: 'plank',
    name: { he: 'פלאנק', en: 'Plank' },
    muscles: ['abs'], secondary: ['shoulders'],
    equip: [], load: 'bodyweight', kind: 'isolation', reps: [30, 60], rest: 60,
    cues: {
      he: ['מרפקים מתחת לכתפיים', 'גוף בקו ישר, בטן וישבן מכווצים', 'לנשום באופן רגיל', 'החזרות נמדדות בשניות'],
      en: ['Elbows under shoulders', 'Straight body, abs and glutes squeezed', 'Breathe normally', 'Reps are counted in seconds'],
    },
    mistakes: { he: ['אגן שוקע או גבוה מדי'], en: ['Hips sagging or piking up'] },
    hl: ['torso'],
    anim: {
      anchor: { joint: 'ankle', at: [22, 199] },
      frames: [
        { t: -9.5, l: [170.5, 170.5], aw: [92, 2], f: 115 },
        { t: -11, l: [169, 169], aw: [92, 2], f: 115 },
      ],
      tempo: [2, 0.5, 2, 0.5],
    },
  },
];

export const EX: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
