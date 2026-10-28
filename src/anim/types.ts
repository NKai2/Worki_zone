export type Vec = [number, number];

/**
 * A single keyframe. All angles are in degrees, screen coordinates (0 = right, 90 = down).
 * Arms: `a` = [upperArm, forearm] relative to torso, `aw` = world angles, `ah` = hand IK target.
 * Legs: `l` = [thigh, shin] world angles, `lf` = ankle IK target.
 * Suffix `2` is the far limb (side view) — defaults to the near limb.
 */
export interface Frame {
  hip?: Vec;
  t?: number;
  h?: number;
  a?: Vec; aw?: Vec; ah?: Vec;
  a2?: Vec; aw2?: Vec; ah2?: Vec;
  l?: Vec; lf?: Vec;
  l2?: Vec; lf2?: Vec;
  f?: number; f2?: number;
}

export type Prop =
  | { k: 'bb'; at: 'hands' | 'back' }
  | { k: 'db' }
  | { k: 'bench'; from: Vec; to: Vec; legs?: boolean }
  | { k: 'bar'; at: Vec; post?: 1 | -1 }
  | { k: 'cable'; from: Vec; handle?: boolean }
  | { k: 'pad' }
  | { k: 'footplate'; angle: number }
  | { k: 'step'; x: number; y: number; w: number }
  | { k: 'mat'; x1: number; x2: number };

export type Seg = 'torso' | 'ua' | 'fa' | 'th' | 'sh' | 'hip' | 'shoulder';

export interface Anim {
  view?: 'side' | 'front';
  noGround?: boolean;
  /** Which joint stays fixed; its position is given in `at`. Default: frame.hip */
  anchor?: { joint: 'ankle' | 'hand'; at: Vec };
  frames: Frame[];
  props?: Prop[];
  armBend?: 1 | -1;
  legBend?: 1 | -1;
  /** seconds: [A→B, hold B, B→A, hold A] */
  tempo?: [number, number, number, number];
}
