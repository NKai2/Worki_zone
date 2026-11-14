#!/usr/bin/env python3
"""
Builds public/models/human.glb from MakeHuman's CC0 assets.

  python3 tools/build_human.py <makehuman/data dir> public/models/human.glb

- base mesh + macro targets for an athletic young male
- the 163-bone default rig collapsed to 20 animation bones (weights merged)
- per-vertex muscle region ids (attribute _MUSCLE) for highlighting target muscles
- per-vertex cavity shading (COLOR_0) so muscle separations read like a sculpture
"""
import json
import struct
import sys
from pathlib import Path

import numpy as np

DATA = Path(sys.argv[1])
OUT = Path(sys.argv[2])

# ───────────── mesh ─────────────
verts, faces, cur = [], [], None
KEEP = {'body', 'helper-l-eye', 'helper-r-eye'}
for line in open(DATA / '3dobjs/base.obj'):
    if line.startswith('v '):
        verts.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('g '):
        cur = line.split()[1]
    elif line.startswith('f ') and cur in KEEP:
        faces.append([int(p.split('/')[0]) - 1 for p in line.split()[1:]])
V = np.array(verts, dtype=np.float64)


def apply_target(path: Path, w: float):
    if w == 0:
        return
    for line in open(path):
        if line[0] in '#\n':
            continue
        i, x, y, z = line.split()
        V[int(i)] += w * np.array([float(x), float(y), float(z)])


T = DATA / 'targets/macrodetails'
# Athletic build: mostly max muscle, slightly lean, ideal proportions
for muscle, mw in (('maxmuscle', 0.85), ('averagemuscle', 0.15)):
    for weight, ww in (('averageweight', 0.75), ('minweight', 0.25)):
        apply_target(T / f'universal-male-young-{muscle}-{weight}.target', mw * ww)
        apply_target(T / f'proportions/male-young-{muscle}-{weight}-idealproportions.target', mw * ww)
        apply_target(T / f'height/male-young-{muscle}-{weight}-maxheight.target', mw * ww * 0.35)
apply_target(T / 'caucasian-male-young.target', 0.6)
apply_target(T / 'african-male-young.target', 0.2)
apply_target(T / 'asian-male-young.target', 0.2)
for t, w in (('torso/torso-muscle-dorsi-incr.target', 0.6), ('torso/torso-muscle-pectoral-incr.target', 0.5),
             ('armslegs/l-upperarm-shoulder-muscle-incr.target', 0.5), ('armslegs/r-upperarm-shoulder-muscle-incr.target', 0.5),
             ('armslegs/l-upperarm-muscle-incr.target', 0.4), ('armslegs/r-upperarm-muscle-incr.target', 0.4),
             ('armslegs/l-lowerleg-muscle-incr.target', 0.4), ('armslegs/r-lowerleg-muscle-incr.target', 0.4),
             ('stomach/stomach-pregnant-decr.target', 0.3)):
    p = DATA / 'targets' / t
    if p.exists():
        apply_target(p, w)

# ───────────── skeleton ─────────────
sk = json.load(open(DATA / 'rigs/default.mhskel'))
joints = {k: V[v].mean(axis=0) for k, v in sk['joints'].items()}
bones = sk['bones']
head_of = lambda b: joints[bones[b]['head']]
tail_of = lambda b: joints[bones[b]['tail']]

# reduced bone: (head bone, tail bone, parent)
R = {
    'hips': ('root', 'spine05', None),
    'spine': ('spine04', 'spine03', 'hips'),
    'chest': ('spine02', 'spine01', 'spine'),
    'neck': ('neck01', 'neck03', 'chest'),
    'head': ('head', 'head', 'neck'),
}
for s in 'LR':
    R.update({
        f'clavicle.{s}': (f'clavicle.{s}', f'shoulder01.{s}', 'chest'),
        f'upperarm.{s}': (f'upperarm01.{s}', f'upperarm02.{s}', f'clavicle.{s}'),
        f'forearm.{s}': (f'lowerarm01.{s}', f'lowerarm02.{s}', f'upperarm.{s}'),
        f'hand.{s}': (f'wrist.{s}', f'wrist.{s}', f'forearm.{s}'),
        f'thigh.{s}': (f'upperleg01.{s}', f'upperleg02.{s}', 'hips'),
        f'shin.{s}': (f'lowerleg01.{s}', f'lowerleg02.{s}', f'thigh.{s}'),
        f'foot.{s}': (f'foot.{s}', f'foot.{s}', f'shin.{s}'),
    })
NAMES = list(R)
idx = {n: i for i, n in enumerate(NAMES)}

# map each original bone to its reduced bone (walk up the parent chain)
direct = {}
for n, (h, t, _) in R.items():
    chain = [h]
    b = t
    while b != h and b is not None:
        chain.append(b)
        b = bones[b]['parent']
    for c in chain:
        direct[c] = n
direct.update({'pelvis.L': 'hips', 'pelvis.R': 'hips', 'breast.L': 'chest', 'breast.R': 'chest'})


def reduced(b):
    while b not in direct:
        b = bones[b]['parent']
    return direct[b]


heads = np.array([head_of(R[n][0]) for n in NAMES])
tails = np.array([tail_of(R[n][1]) for n in NAMES])

# ───────────── weights ─────────────
W = np.zeros((len(V), len(NAMES)))
for b, lst in json.load(open(DATA / 'rigs/default_weights.mhw'))['weights'].items():
    j = idx[reduced(b)]
    for vi, w in lst:
        W[vi, j] += w

# ───────────── keep used vertices, triangulate ─────────────
used = sorted({i for f in faces for i in f})
remap = {o: n for n, o in enumerate(used)}
P = V[used]
Wu = W[used]
tris = []
for f in faces:
    f = [remap[i] for i in f]
    tris.append([f[0], f[1], f[2]])
    if len(f) == 4:
        tris.append([f[0], f[2], f[3]])
tris = np.array(tris, dtype=np.uint32)

# top-4 weights
order = np.argsort(-Wu, axis=1)[:, :4]
top = np.take_along_axis(Wu, order, axis=1)
top[top.sum(1) == 0, 0] = 1
top /= top.sum(1, keepdims=True)
J4 = order.astype(np.uint8)
W4 = np.round(top * 255).astype(np.int32)
W4[:, 0] += 255 - W4.sum(1)  # exact sum for normalized ubyte weights
W4 = W4.astype(np.uint8)

# ───────────── normals & cavity shading ─────────────
def vertex_normals(P, tris):
    n = np.zeros_like(P)
    fn = np.cross(P[tris[:, 1]] - P[tris[:, 0]], P[tris[:, 2]] - P[tris[:, 0]])
    for k in range(3):
        np.add.at(n, tris[:, k], fn)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)


N = vertex_normals(P, tris)
nbr_sum = np.zeros_like(P)
nbr_cnt = np.zeros(len(P))
for a, b in ((0, 1), (1, 2), (2, 0), (1, 0), (2, 1), (0, 2)):
    np.add.at(nbr_sum, tris[:, a], P[tris[:, b]])
    np.add.at(nbr_cnt, tris[:, a], 1)
lap = nbr_sum / nbr_cnt[:, None] - P
concave = np.sum(lap * N, axis=1)  # >0 where the surface dips
# smooth the signal a little, then scale to a gentle darkening
for _ in range(2):
    acc = np.zeros(len(P))
    np.add.at(acc, tris[:, 0], concave[tris[:, 1]] + concave[tris[:, 2]])
    np.add.at(acc, tris[:, 1], concave[tris[:, 0]] + concave[tris[:, 2]])
    np.add.at(acc, tris[:, 2], concave[tris[:, 0]] + concave[tris[:, 1]])
    concave = 0.5 * concave + 0.5 * acc / np.maximum(nbr_cnt, 1)
c = np.clip(concave / np.percentile(np.abs(concave), 97), -1, 1)
shade = np.clip(1.0 - 0.38 * np.maximum(c, 0) + 0.06 * np.maximum(-c, 0), 0.55, 1.0)
C = np.stack([shade, shade, shade, np.ones_like(shade)], 1)
C8 = np.round(C * 255).astype(np.uint8)

# ───────────── muscle regions ─────────────
MUSCLE = ['none', 'chest', 'back', 'shoulders', 'rearDelts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes',
          'calves', 'abs', 'forearms', 'traps', 'obliques', 'shorts']
mid = {m: i for i, m in enumerate(MUSCLE)}
dom = np.array([NAMES[i] for i in np.argmax(Wu, axis=1)])
M = np.zeros(len(P), dtype=np.uint8)

hipY = heads[idx['hips']][1]
chestY = heads[idx['chest']][1]
neckY = heads[idx['neck']][1]
shoulderX = abs(heads[idx['upperarm.L']][0])
spineTopY = tails[idx['chest']][1]


def along(i, name):
    h, t = heads[idx[name]], tails[idx[name]]
    ax = t - h
    L = np.dot(ax, ax)
    s = np.dot(P[i] - h, ax) / L
    r = P[i] - (h + s * ax)
    rn = r / max(np.linalg.norm(r), 1e-9)
    return s, rn


for i in range(len(P)):
    x, y, z = P[i]
    d = dom[i]
    nz = N[i][2]
    side = d.split('.')[0]
    if side in ('hips', 'spine', 'chest', 'neck', 'clavicle'):
        if y < hipY + 0.25 and (side in ('hips',) or y < hipY):
            M[i] = mid['glutes'] if nz < -0.15 else mid['shorts']
        elif nz > 0.25:
            if y > chestY + 0.15 and abs(x) < shoulderX * 0.95 and y < spineTopY + 0.1:
                M[i] = mid['chest']
            elif abs(x) < shoulderX * 0.42 and y <= chestY + 0.15:
                M[i] = mid['abs']
            elif y <= chestY + 0.15:
                M[i] = mid['obliques']
            else:
                M[i] = mid['traps'] if side in ('neck', 'clavicle') else mid['chest']
        elif nz < -0.2:
            M[i] = mid['traps'] if y > spineTopY - 0.35 else mid['back']
        else:
            M[i] = mid['obliques'] if y < chestY + 0.2 else mid['back']
    elif side == 'upperarm':
        s, rn = along(i, d)
        if s < 0.28:
            M[i] = mid['rearDelts'] if rn[2] < -0.35 else mid['shoulders']
        else:
            M[i] = mid['biceps'] if rn[2] > 0 else mid['triceps']
    elif side == 'forearm':
        M[i] = mid['forearms']
    elif side == 'thigh':
        s, rn = along(i, d)
        if s < 0.2:
            M[i] = mid['shorts'] if rn[2] > -0.3 else mid['glutes']
        elif rn[2] < -0.25:
            M[i] = mid['hamstrings']
        else:
            M[i] = mid['quads']
    elif side == 'shin':
        s, rn = along(i, d)
        M[i] = mid['calves'] if rn[2] < 0.1 and s < 0.62 else 0

# ───────────── write GLB ─────────────
P32 = P.astype(np.float32)
N32 = N.astype(np.float32)
buf = bytearray()
views, accessors = [], []


def add(arr: np.ndarray, ctype: int, typ: str, target=None, normalized=False, minmax=False):
    while len(buf) % 4:
        buf.append(0)
    off = len(buf)
    data = arr.tobytes()
    buf.extend(data)
    v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
    if target:
        v['target'] = target
    views.append(v)
    a = {'bufferView': len(views) - 1, 'componentType': ctype, 'count': int(arr.shape[0]), 'type': typ}
    if normalized:
        a['normalized'] = True
    if minmax:
        a['min'] = arr.min(0).tolist()
        a['max'] = arr.max(0).tolist()
    accessors.append(a)
    return len(accessors) - 1


FLOAT, UBYTE, UINT = 5126, 5121, 5125
a_pos = add(P32, FLOAT, 'VEC3', 34962, minmax=True)
a_nrm = add(N32, FLOAT, 'VEC3', 34962)
a_jnt = add(J4, UBYTE, 'VEC4', 34962)
a_wgt = add(W4, UBYTE, 'VEC4', 34962, normalized=True)
a_col = add(C8, UBYTE, 'VEC4', 34962, normalized=True)
a_mus = add(M.astype(np.float32).reshape(-1, 1)[:, 0], FLOAT, 'SCALAR', 34962)
a_idx = add(tris.reshape(-1), UINT, 'SCALAR', 34963)

# bone nodes: identity rotations, translations relative to the parent head
nodes = []
for n in NAMES:
    parent = R[n][2]
    rel = heads[idx[n]] - (heads[idx[parent]] if parent else 0)
    nodes.append({'name': n, 'translation': rel.astype(float).tolist(),
                  'extras': {'bone': n, 'tail': tails[idx[n]].astype(float).tolist(), 'head': heads[idx[n]].astype(float).tolist()}})
for n in NAMES:
    kids = [idx[c] for c in NAMES if R[c][2] == n]
    if kids:
        nodes[idx[n]]['children'] = kids
ibm = np.zeros((len(NAMES), 16), dtype=np.float32)
for i, n in enumerate(NAMES):
    m = np.eye(4)
    m[:3, 3] = -heads[i]
    ibm[i] = m.T.reshape(-1)  # column-major
a_ibm = add(ibm, FLOAT, 'MAT4')

mesh_node = len(nodes)
nodes.append({'name': 'body', 'mesh': 0, 'skin': 0})
gltf = {
    'asset': {'version': '2.0', 'generator': 'worki build_human.py', 'copyright': 'MakeHuman assets, CC0 1.0'},
    'scene': 0,
    'scenes': [{'nodes': [idx['hips'], mesh_node]}],
    'nodes': nodes,
    'skins': [{'joints': list(range(len(NAMES))), 'inverseBindMatrices': a_ibm, 'skeleton': idx['hips']}],
    'meshes': [{'name': 'body', 'primitives': [{
        'attributes': {'POSITION': a_pos, 'NORMAL': a_nrm, 'JOINTS_0': a_jnt, 'WEIGHTS_0': a_wgt, 'COLOR_0': a_col, '_MUSCLE': a_mus},
        'indices': a_idx, 'material': 0}]}],
    'materials': [{'name': 'skin', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 0.6}}],
    'buffers': [{'byteLength': len(buf)}],
    'bufferViews': views,
    'accessors': accessors,
    'extras': {'muscles': MUSCLE},
}
js = json.dumps(gltf, separators=(',', ':')).encode()
js += b' ' * ((4 - len(js) % 4) % 4)
while len(buf) % 4:
    buf.append(0)
OUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUT, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(buf)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
    f.write(struct.pack('<II', len(buf), 0x004E4942) + bytes(buf))
print(f'{OUT}: {len(P)} verts, {len(tris)} tris, {len(NAMES)} bones, {OUT.stat().st_size // 1024} KB')
print('height', P[:, 1].max() - P[:, 1].min(), 'nose z', P[np.argmax(P[:, 2])], 'L upperarm head', heads[idx['upperarm.L']])
print({m: int((M == i).sum()) for i, m in enumerate(MUSCLE)})
