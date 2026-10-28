import type { Anim, Seg } from '../anim/types';

export type Lang = 'he' | 'en';
export type Text = Record<Lang, string>;
export type TextList = Record<Lang, string[]>;

export type Muscle =
  | 'chest' | 'back' | 'shoulders' | 'rearDelts' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'abs';

export type Equip = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bench' | 'pullup';
export type Load = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';

export type Pattern =
  | 'squat' | 'hinge' | 'glute' | 'lunge' | 'quadIso' | 'hamIso' | 'calf'
  | 'hPush' | 'iPush' | 'vPush' | 'chestIso' | 'vPull' | 'hPull'
  | 'latDelt' | 'rearDelt' | 'biceps' | 'triceps' | 'core';

export interface Exercise {
  id: string;
  name: Text;
  muscles: Muscle[];
  secondary: Muscle[];
  equip: Equip[];
  load: Load;
  kind: 'compound' | 'isolation';
  reps: [number, number];
  rest: number;
  cues: TextList;
  mistakes: TextList;
  anim: Anim;
  hl: Seg[];
}
