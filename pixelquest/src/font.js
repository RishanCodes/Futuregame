/* PIXEL QUEST — original pixel font: canvas renderer + runtime TrueType generation for DOM text */
'use strict';
(function () {
  // Rows top->bottom; baseline sits under row 6; rows 7-8 are descenders.
  const G = {
    A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.', C: '.###.|#...#|#....|#....|#....|#...#|.###.',
    D: '####.|#...#|#...#|#...#|#...#|#...#|####.', E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
    G: '.###.|#...#|#....|#.###|#...#|#...#|.####', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#', I: '###|.#.|.#.|.#.|.#.|.#.|###',
    J: '..###|...#.|...#.|...#.|#..#.|#..#.|.##..', K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
    M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#', O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
    P: '####.|#...#|#...#|####.|#....|#....|#....', Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
    S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..', U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
    V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..', W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
    a: '.....|.....|.###.|....#|.####|#...#|.####', b: '#....|#....|####.|#...#|#...#|#...#|####.', c: '.....|.....|.###.|#....|#....|#....|.###.',
    d: '....#|....#|.####|#...#|#...#|#...#|.####', e: '.....|.....|.###.|#...#|#####|#....|.###.', f: '..##|.#..|####|.#..|.#..|.#..|.#..',
    g: '.....|.....|.####|#...#|#...#|#...#|.####|....#|.###.', h: '#....|#....|####.|#...#|#...#|#...#|#...#', i: '#|.|#|#|#|#|#',
    j: '..#|...|..#|..#|..#|..#|..#|#.#|.#.', k: '#...|#...|#..#|#.#.|##..|#.#.|#..#', l: '##|.#|.#|.#|.#|.#|.#',
    m: '.....|.....|##.#.|#.#.#|#.#.#|#.#.#|#...#', n: '.....|.....|####.|#...#|#...#|#...#|#...#', o: '.....|.....|.###.|#...#|#...#|#...#|.###.',
    p: '.....|.....|####.|#...#|#...#|#...#|####.|#....|#....', q: '.....|.....|.####|#...#|#...#|#...#|.####|....#|....#', r: '....|....|#.##|##..|#...|#...|#...',
    s: '.....|.....|.####|#....|.###.|....#|####.', t: '.#..|.#..|####|.#..|.#..|.#..|..##', u: '.....|.....|#...#|#...#|#...#|#...#|.####',
    v: '.....|.....|#...#|#...#|#...#|.#.#.|..#..', w: '.....|.....|#...#|#...#|#.#.#|#.#.#|.#.#.', x: '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#',
    y: '.....|.....|#...#|#...#|#...#|#...#|.####|....#|.###.', z: '.....|.....|#####|...#.|..#..|.#...|#####',
    0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.', 2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
    3: '#####|...#.|..#..|...#.|....#|#...#|.###.', 4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
    6: '..##.|.#...|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...', 8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
    9: '.###.|#...#|#...#|.####|....#|...#.|.##..',
    '!': '#|#|#|#|#|.|#', '"': '#.#|#.#', '#': '.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.', '$': '..#..|.####|#.#..|.###.|..#.#|####.|..#..',
    '%': '##..#|##.#.|...#.|..#..|.#...|.#.##|#..##', '&': '.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#', "'": '#|#', '(': '..#|.#.|#..|#..|#..|.#.|..#',
    ')': '#..|.#.|..#|..#|..#|.#.|#..', '*': '.....|..#..|#.#.#|.###.|#.#.#|..#..', '+': '.....|..#..|..#..|#####|..#..|..#..', ',': '..|..|..|..|..|.#|.#|#.',
    '-': '....|....|....|####', '.': '.|.|.|.|.|.|#', '/': '....#|....#|...#.|..#..|.#...|#....|#....', ':': '.|.|#|.|.|#|.', ';': '..|..|.#|..|..|.#|.#|#.',
    '<': '...#|..#.|.#..|#...|.#..|..#.|...#', '=': '....|....|####|....|####', '>': '#...|.#..|..#.|...#|..#.|.#..|#...', '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
    '@': '.###.|#...#|#.###|#.#.#|#.###|#....|.###.', '[': '###|#..|#..|#..|#..|#..|###', '\\': '#....|#....|.#...|..#..|...#.|....#|....#', ']': '###|..#|..#|..#|..#|..#|###',
    '^': '..#..|.#.#.|#...#', '_': '.....|.....|.....|.....|.....|.....|.....|#####', '`': '#.|.#', '{': '..##|.#..|.#..|#...|.#..|.#..|..##', '|': '#|#|#|#|#|#|#|#',
    '}': '##..|..#.|..#.|...#|..#.|..#.|##..', '~': '.....|.....|.#...|#.#.#|...#.',
  };
  const GLYPHS = {};
  for (const ch in G) {
    const rows = G[ch].split('|');
    GLYPHS[ch] = { rows, w: Math.max(...rows.map((r) => r.length)) };
  }
  GLYPHS[' '] = { rows: [], w: 3 };
  const CHARS = [];
  for (let c = 32; c < 127; c++) CHARS.push(String.fromCharCode(c));

  const Font = { GLYPHS, H: 9, cache: {} };
  PQ.Font = Font;

  Font.width = function (s) {
    let w = 0;
    for (const ch of s) { const g = GLYPHS[ch] || GLYPHS['?']; w += g.w + 1; }
    return Math.max(0, w - 1);
  };

  function atlas(color) {
    if (Font.cache[color]) return Font.cache[color];
    const [c, g] = PQ.canvas(CHARS.length * 6, 9);
    g.fillStyle = color;
    const pos = {};
    CHARS.forEach((ch, i) => {
      const gl = GLYPHS[ch]; pos[ch] = i * 6;
      gl.rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') g.fillRect(i * 6 + x, y, 1, 1); });
    });
    return (Font.cache[color] = { c, pos });
  }

  /* draw text on a 2D context at integer scale. align: 'left'|'center'|'right' */
  Font.draw = function (g, s, x, y, color = '#fff', scale = 1, align = 'left', shadow = null) {
    s = String(s);
    const w = Font.width(s) * scale;
    let cx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
    y = Math.round(y);
    if (shadow) { Font.draw(g, s, cx + scale, y + scale, shadow, scale, 'left'); }
    const a = atlas(color);
    for (const ch of s) {
      const gl = GLYPHS[ch] || GLYPHS['?'];
      const px = a.pos[ch] != null ? a.pos[ch] : a.pos['?'];
      if (gl.rows.length) g.drawImage(a.c, px, 0, gl.w, 9, cx, y, gl.w * scale, 9 * scale);
      cx += (gl.w + 1) * scale;
    }
    return w;
  };

  /* ---------- runtime TrueType generation so DOM text uses the same pixel font ---------- */
  Font.buildTTF = function () {
    const PX = 128, UPM = 1024, ASC = 7 * PX, DESC = 2 * PX;
    const glyphs = [{ contours: [], adv: 6 * PX }]; // .notdef
    for (const ch of CHARS) {
      const gl = GLYPHS[ch];
      // merge pixel runs into rectangles
      const rects = [];
      const rowsRuns = gl.rows.map((row) => { const runs = []; let s = -1; for (let x = 0; x <= row.length; x++) { const on = row[x] === '#'; if (on && s < 0) s = x; if (!on && s >= 0) { runs.push([s, x]); s = -1; } } return runs; });
      const open = [];
      for (let y = 0; y < rowsRuns.length; y++) {
        for (const [a, b] of rowsRuns[y]) {
          const r = open.find((o) => o.a === a && o.b === b && o.y1 === y);
          if (r) r.y1 = y + 1; else { const n = { a, b, y0: y, y1: y + 1 }; open.push(n); rects.push(n); }
        }
      }
      const contours = rects.map((r) => {
        const x0 = r.a * PX, x1 = r.b * PX, yt = (7 - r.y0) * PX, yb = (7 - r.y1) * PX;
        return [[x0, yt], [x1, yt], [x1, yb], [x0, yb]]; // clockwise (y up)
      });
      glyphs.push({ contours, adv: (gl.w + 1) * PX });
    }
    // ---- writer helpers ----
    function Buf() { this.a = []; }
    Buf.prototype = {
      u8(v) { this.a.push(v & 255); }, u16(v) { this.a.push((v >> 8) & 255, v & 255); }, i16(v) { this.u16(v < 0 ? v + 65536 : v); },
      u32(v) { this.a.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); }, tag(s) { for (let i = 0; i < 4; i++) this.u8(s.charCodeAt(i)); },
      pad() { while (this.a.length % 4) this.a.push(0); }, bytes(b) { for (const x of b) this.a.push(x); },
    };
    // glyf + loca
    const glyf = new Buf(), loca = [];
    let xMinAll = 0, yMinAll = 0, xMaxAll = 0, yMaxAll = 0, maxPts = 0, maxCont = 0;
    const hm = [];
    for (const gd of glyphs) {
      loca.push(glyf.a.length);
      if (!gd.contours.length) { hm.push([gd.adv, 0]); continue; }
      let xmin = 1e9, ymin = 1e9, xmax = -1e9, ymax = -1e9, pts = 0;
      for (const c of gd.contours) for (const [x, y] of c) { xmin = Math.min(xmin, x); ymin = Math.min(ymin, y); xmax = Math.max(xmax, x); ymax = Math.max(ymax, y); pts++; }
      xMinAll = Math.min(xMinAll, xmin); yMinAll = Math.min(yMinAll, ymin); xMaxAll = Math.max(xMaxAll, xmax); yMaxAll = Math.max(yMaxAll, ymax);
      maxPts = Math.max(maxPts, pts); maxCont = Math.max(maxCont, gd.contours.length);
      glyf.i16(gd.contours.length); glyf.i16(xmin); glyf.i16(ymin); glyf.i16(xmax); glyf.i16(ymax);
      let end = -1; for (const c of gd.contours) { end += c.length; glyf.u16(end); }
      glyf.u16(0); // no instructions
      for (let i = 0; i < pts; i++) glyf.u8(1); // on-curve, long coords
      let px = 0; for (const c of gd.contours) for (const [x] of c) { glyf.i16(x - px); px = x; }
      let py = 0; for (const c of gd.contours) for (const [, y] of c) { glyf.i16(y - py); py = y; }
      glyf.pad();
      hm.push([gd.adv, xmin]);
    }
    loca.push(glyf.a.length);
    const n = glyphs.length;
    const T = {};
    // head
    let b = new Buf();
    b.u32(0x00010000); b.u32(0x00010000); b.u32(0); b.u32(0x5f0f3cf5); b.u16(0x000b); b.u16(UPM);
    b.u32(0); b.u32(0); b.u32(0); b.u32(0);
    b.i16(xMinAll); b.i16(-DESC); b.i16(xMaxAll); b.i16(ASC); b.u16(0); b.u16(8); b.i16(2); b.i16(1); b.i16(0);
    T.head = b.a;
    // hhea
    b = new Buf();
    b.u32(0x00010000); b.i16(ASC); b.i16(-DESC); b.i16(PX); b.u16(Math.max(...hm.map((h) => h[0]))); b.i16(0); b.i16(0); b.i16(xMaxAll);
    b.i16(1); b.i16(0); b.i16(0); for (let i = 0; i < 4; i++) b.i16(0); b.i16(0); b.u16(n);
    T.hhea = b.a;
    // hmtx
    b = new Buf(); for (const [adv, lsb] of hm) { b.u16(adv); b.i16(lsb); } T.hmtx = b.a;
    // maxp
    b = new Buf(); b.u32(0x00010000); b.u16(n); b.u16(maxPts); b.u16(maxCont); b.u16(0); b.u16(0); b.u16(2);
    for (let i = 0; i < 8; i++) b.u16(0);
    T.maxp = b.a;
    // loca (long)
    b = new Buf(); for (const o of loca) b.u32(o); T.loca = b.a;
    T.glyf = glyf.a;
    // cmap format 4: 32..126 -> glyph 1..95
    b = new Buf();
    b.u16(0); b.u16(1); b.u16(3); b.u16(1); b.u32(12);
    const segX2 = 4;
    b.u16(4); b.u16(16 + segX2 * 4); b.u16(0); b.u16(segX2); b.u16(4); b.u16(1); b.u16(0);
    b.u16(126); b.u16(0xffff); b.u16(0); b.u16(32); b.u16(0xffff);
    b.i16(1 - 32); b.u16(1); b.u16(0); b.u16(0);
    T.cmap = b.a;
    // name
    const names = [[1, 'PQ Pixel'], [2, 'Regular'], [3, 'PQ Pixel Regular'], [4, 'PQ Pixel'], [5, 'Version 1.0'], [6, 'PQPixel-Regular']];
    b = new Buf(); b.u16(0); b.u16(names.length); b.u16(6 + names.length * 12);
    let off = 0; const strs = [];
    for (const [id, s] of names) { const enc = []; for (const ch of s) { enc.push(0, ch.charCodeAt(0)); } b.u16(3); b.u16(1); b.u16(0x409); b.u16(id); b.u16(enc.length); b.u16(off); off += enc.length; strs.push(enc); }
    for (const e of strs) b.bytes(e);
    T.name = b.a;
    // post v3
    b = new Buf(); b.u32(0x00030000); b.u32(0); b.i16(-PX); b.i16(PX); b.u32(0); for (let i = 0; i < 4; i++) b.u32(0); T.post = b.a;
    // OS/2 v4
    b = new Buf();
    b.u16(4); b.i16(6 * PX); b.u16(400); b.u16(5); b.u16(0);
    b.i16(400); b.i16(400); b.i16(0); b.i16(100); b.i16(400); b.i16(400); b.i16(0); b.i16(400); b.i16(PX); b.i16(3 * PX); b.i16(0);
    for (let i = 0; i < 10; i++) b.u8(0);
    b.u32(1); b.u32(0); b.u32(0); b.u32(0); b.tag('PQPX'); b.u16(0x40); b.u16(32); b.u16(126);
    b.i16(ASC); b.i16(-DESC); b.i16(PX); b.u16(ASC); b.u16(DESC); b.u32(1); b.u32(0);
    b.i16(5 * PX); b.i16(7 * PX); b.u16(0); b.u16(32); b.u16(1);
    T['OS/2'] = b.a;
    // assemble
    const tags = Object.keys(T).sort();
    const out = new Buf();
    const nt = tags.length;
    let es = 0; while ((1 << (es + 1)) <= nt) es++;
    out.u32(0x00010000); out.u16(nt); out.u16((1 << es) * 16); out.u16(es); out.u16(nt * 16 - (1 << es) * 16);
    let offset = 12 + nt * 16;
    const recs = [];
    for (const t of tags) { const len = T[t].length; recs.push({ t, off: offset, len }); offset += (len + 3) & ~3; }
    const sum = (arr) => { let s = 0; for (let i = 0; i < arr.length; i += 4) s = (s + ((arr[i] << 24) | ((arr[i + 1] || 0) << 16) | ((arr[i + 2] || 0) << 8) | (arr[i + 3] || 0))) >>> 0; return s; };
    for (const r of recs) { out.tag(r.t); out.u32(sum(T[r.t])); out.u32(r.off); out.u32(r.len); }
    for (const t of tags) { out.bytes(T[t]); out.pad(); }
    const bytes = new Uint8Array(out.a);
    const total = sum(out.a);
    const adj = (0xb1b0afba - total) >>> 0;
    const ho = recs.find((r) => r.t === 'head').off + 8;
    bytes[ho] = adj >>> 24; bytes[ho + 1] = (adj >>> 16) & 255; bytes[ho + 2] = (adj >>> 8) & 255; bytes[ho + 3] = adj & 255;
    return bytes.buffer;
  };

  Font.installDOM = function () {
    try {
      if (!window.FontFace) return Promise.resolve(false);
      const ff = new FontFace('PQPixel', Font.buildTTF());
      return ff.load().then((f) => { document.fonts.add(f); document.documentElement.classList.add('pqfont'); return true; }).catch(() => false);
    } catch (e) { return Promise.resolve(false); }
  };
})();
