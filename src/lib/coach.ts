import Anthropic from '@anthropic-ai/sdk';
import { EX, EXERCISES } from '../data/exercises';
import { getState, setState, type Stroke } from '../store';
import { patternOf, setsFor } from './plan';
import { logBodyweight, logSwim, sessionVolume, swimDistance } from './workout';

const MODEL = 'claude-opus-5-5';

/** Stable part of the system prompt — cached across turns. */
const INSTRUCTIONS = `You are "Worki", the personal training coach inside the Worki Zone app. The user trains for muscle growth (hypertrophy) and also swims.

How to answer:
- Reply in the language the user writes in (Hebrew or English). In Hebrew, use gender-neutral phrasing (infinitives or plural).
- The user reads on a phone: keep it short and practical — a few sentences or a short list. No tables.
- Be evidence-based (progressive overload, 10-20 weekly sets per muscle, 1.6-2.2 g/kg protein, sleep). Give concrete numbers.
- Use the training data in the next system block to personalise advice. Refer to exercises by name, not by id.
- For pain, injury or medical questions, give general guidance and recommend seeing a professional.

Logging and plan changes:
- When the user reports a measurement or a finished swim ("I weigh 72", "swam 1500 m in 32 min"), call the matching tool, then confirm in one short line.
- When the user asks to change the plan, use swap_exercise or set_sets with ids from the catalogue below. Only change what they asked for.
- Use web search only for questions that need current information.

Exercise catalogue (id: English name — main muscles):
${EXERCISES.map((e) => `${e.id}: ${e.name.en} — ${e.muscles.join(', ')}`).join('\n')}`;

function snapshot(): string {
  const s = getState();
  const lines: string[] = [`Today: ${new Date().toDateString()}`];
  if (s.profile) lines.push(`Profile: ${s.profile.experience}, ${s.profile.days} days/week, ${s.profile.minutes} min sessions, equipment: ${s.profile.equipment.join(', ') || 'bodyweight only'}`);
  if (s.plan) {
    lines.push(`Plan: ${s.plan.weeks}-week mesocycle (last week = deload). Current week ${s.pointer.week}, next workout = day ${s.pointer.dayIndex + 1}.`);
    s.plan.days.forEach((d, i) =>
      lines.push(`Day ${i + 1} (${d.key}): ${d.slots.map((x) => `${x.exId} ${setsFor(x, s.plan!, Math.min(s.pointer.week, s.plan!.weeks))}x${x.reps[0]}-${x.reps[1]}`).join(', ')}`),
    );
  }
  const recent = s.history.slice(-10);
  if (recent.length) {
    lines.push('Recent sessions (oldest first):');
    for (const h of recent) {
      const ex = h.exercises.map((e) => `${e.exId} ${e.sets.map((x) => (x.w ? `${x.w}kg×${x.r}` : `${x.r}`)).join(' ')}`).join('; ');
      const sw = (h.swims ?? []).map((w) => `swim ${w.distance}m ${w.stroke} ${Math.round(w.duration / 60)}min`).join('; ');
      lines.push(`- ${new Date(h.start).toDateString()} ${h.dayKey}: ${[ex, sw].filter(Boolean).join('; ')} (volume ${Math.round(sessionVolume(h))}kg, swim ${swimDistance(h)}m)`);
    }
  } else lines.push('No workouts logged yet.');
  const bw = s.bodyweight.slice(-6);
  if (bw.length) lines.push(`Bodyweight: ${bw.map((b) => `${new Date(b.date).toDateString()} ${b.kg}kg`).join(', ')}`);
  return lines.join('\n');
}

const TOOLS: Anthropic.Beta.BetaToolUnion[] = [
  {
    name: 'log_bodyweight',
    description: 'Save a bodyweight measurement for today.',
    input_schema: { type: 'object', properties: { kg: { type: 'number', description: 'Bodyweight in kilograms' } }, required: ['kg'], additionalProperties: false },
    strict: true,
    eager_input_streaming: true,
  },
  {
    name: 'log_swim',
    description: 'Save a finished swim as its own session (ended now).',
    input_schema: {
      type: 'object',
      properties: {
        distance_m: { type: 'integer', description: 'Total distance in metres' },
        duration_min: { type: 'number', description: 'Total time in minutes' },
        stroke: { type: 'string', enum: ['freestyle', 'breast', 'back', 'fly', 'mixed'] },
        pool_m: { type: 'integer', enum: [25, 50, 0], description: 'Pool length; 0 for open water' },
      },
      required: ['distance_m', 'duration_min', 'stroke', 'pool_m'],
      additionalProperties: false,
    },
    strict: true,
    eager_input_streaming: true,
  },
  {
    name: 'swap_exercise',
    description: 'Replace one exercise in the training plan with another from the catalogue.',
    input_schema: {
      type: 'object',
      properties: {
        day: { type: 'integer', description: 'Plan day number, starting at 1' },
        from_id: { type: 'string', description: 'Exercise id currently in that day' },
        to_id: { type: 'string', description: 'Catalogue id of the replacement' },
      },
      required: ['day', 'from_id', 'to_id'],
      additionalProperties: false,
    },
    strict: true,
    eager_input_streaming: true,
  },
  {
    name: 'set_sets',
    description: 'Change the base number of sets for an exercise on a plan day.',
    input_schema: {
      type: 'object',
      properties: {
        day: { type: 'integer', description: 'Plan day number, starting at 1' },
        exercise_id: { type: 'string' },
        sets: { type: 'integer', description: 'Base working sets, 1-8' },
      },
      required: ['day', 'exercise_id', 'sets'],
      additionalProperties: false,
    },
    strict: true,
    eager_input_streaming: true,
  },
  { type: 'web_search_20260209', name: 'web_search', max_uses: 3 },
];

type Input = Record<string, unknown>;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Runs a client tool. Returns [result text, short note for the UI]. Throws on invalid input. */
function runTool(name: string, input: Input): [string, string] {
  const s = getState();
  switch (name) {
    case 'log_bodyweight': {
      const kg = num(input.kg);
      if (kg === null || kg < 20 || kg > 300) throw new Error('kg must be a number between 20 and 300');
      logBodyweight(kg);
      return [`Saved ${kg} kg.`, `⚖️ ${kg} kg`];
    }
    case 'log_swim': {
      const d = num(input.distance_m), m = num(input.duration_min), pool = num(input.pool_m);
      const stroke = input.stroke as Stroke;
      if (!d || d <= 0 || !m || m <= 0) throw new Error('distance_m and duration_min must be positive numbers');
      if (!['freestyle', 'breast', 'back', 'fly', 'mixed'].includes(stroke)) throw new Error('invalid stroke');
      if (pool !== 25 && pool !== 50 && pool !== 0) throw new Error('pool_m must be 25, 50 or 0');
      logSwim({ distance: Math.round(d), duration: Math.round(m * 60), stroke, pool });
      return [`Saved swim: ${d} m in ${m} min.`, `🏊 ${d} m · ${m} min`];
    }
    case 'swap_exercise':
    case 'set_sets': {
      const day = num(input.day);
      if (!s.plan || day === null || day < 1 || day > s.plan.days.length) throw new Error(`day must be 1-${s.plan?.days.length ?? 0}`);
      const from = String(name === 'swap_exercise' ? input.from_id : input.exercise_id);
      const slots = s.plan.days[day - 1].slots;
      const idx = slots.findIndex((x) => x.exId === from);
      if (idx < 0) throw new Error(`${from} is not on day ${day}`);
      let next = slots[idx], note: string;
      if (name === 'swap_exercise') {
        const ex = EX[String(input.to_id)];
        if (!ex) throw new Error(`unknown exercise id ${String(input.to_id)}`);
        next = { ...next, exId: ex.id, pattern: patternOf(ex.id), reps: ex.reps, rest: ex.rest };
        note = `🔁 ${EX[from].name.en} → ${ex.name.en}`;
      } else {
        const sets = num(input.sets);
        if (sets === null || sets < 1 || sets > 8) throw new Error('sets must be 1-8');
        next = { ...next, sets: Math.round(sets) };
        note = `✏️ ${EX[from].name.en}: ${sets} sets`;
      }
      const days = s.plan.days.map((d, i) => (i === day - 1 ? { ...d, slots: d.slots.map((x, j) => (j === idx ? next : x)) } : d));
      setState({ plan: { ...s.plan, days } });
      return ['Plan updated.', note];
    }
  }
  throw new Error(`unknown tool ${name}`);
}

export interface CoachCallbacks {
  onText: (text: string) => void;
  onNote: (note: string) => void;
}

/**
 * One user turn: streams the reply, runs any tool calls and loops until the model is done.
 * `history` is append-only — assistant turns are stored with their full content (thinking blocks included).
 */
export async function ask(history: Anthropic.Beta.BetaMessageParam[], cb: CoachCallbacks) {
  const { anthropicKey } = getState().settings;
  const client = new Anthropic({ apiKey: anthropicKey.trim(), dangerouslyAllowBrowser: true });
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: 'text', text: INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Training data:\n${snapshot()}` },
  ];

  for (let step = 0; step < 8; step++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system,
      tools: TOOLS,
      messages: history,
    });
    stream.on('text', (delta) => cb.onText(delta));
    const msg = await stream.finalMessage();
    history.push({ role: 'assistant', content: msg.content });

    if (msg.stop_reason === 'refusal') return 'refusal' as const;
    if (msg.stop_reason === 'pause_turn') continue;
    if (msg.stop_reason !== 'tool_use') return 'done' as const;

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const block of msg.content) {
      if (block.type !== 'tool_use') continue;
      try {
        const input = (typeof block.input === 'object' && block.input ? block.input : {}) as Input;
        const [text, note] = runTool(block.name, input);
        cb.onNote(note);
        results.push({ type: 'tool_result', tool_use_id: block.id, content: text });
      } catch (e) {
        results.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${(e as Error).message}`, is_error: true });
      }
    }
    history.push({ role: 'user', content: results });
  }
  return 'done' as const;
}

export { Anthropic };
