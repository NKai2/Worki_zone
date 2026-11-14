// Pre-renders public/thumbs/<id>.webp for every exercise (dev server must be running on :5173).
//   node tools/render_thumbs.cjs
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
(async () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/data/exercises.ts'), 'utf8');
  const ids = [...src.matchAll(/^    id: '([a-z_]+)'/gm)].map((m) => m[1]);
  const out = path.join(__dirname, '../public/thumbs');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 320, height: 320 }, deviceScaleFactor: 1.5 });
  for (const id of ids) {
    await p.goto(`http://localhost:5173/test/thumb.html?id=${id}`);
    await p.waitForSelector('.figure3d.ready', { timeout: 30000 });
    await p.waitForTimeout(700);
    const png = path.join(out, `${id}.png`);
    await p.locator('#shot').screenshot({ path: png });
    execFileSync('python3', ['-c', `from PIL import Image; im=Image.open('${png}').convert('RGB').resize((240,240), Image.LANCZOS); im.save('${png.replace('.png', '.webp')}', 'WEBP', quality=82, method=6)`]);
    fs.unlinkSync(png);
    process.stdout.write(id + ' ');
  }
  await b.close();
  console.log('\n' + ids.length + ' thumbs');
})();
