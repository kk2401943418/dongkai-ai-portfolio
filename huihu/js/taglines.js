/* 序章理念句 / 结语收束句候选组（据 08_copy/ch01_prologue.md、ch10_epilogue.md）
   切换方法：改 index.html 第 2 行 <html data-tagline-set="2"> 为 1 / 2 / 3 即可。
   当前定用第 2 组（2026-11-01 拍板）。index.html 里静态写的是第 2 组，JS 失效时也显示第 2 组。
   未选中的组只存在本文件里，不渲染到页面。改组后需重跑 tools/build_fonts.py（本文件已在字体取字范围内）。 */
window.HUIHU_TAGLINES = {
  1: { prologue: ['一道弧线，去而复回。', 'An arc that leaves, and returns.'],
       epilogue: ['去而复回，弧线仍是那一道。', 'It leaves and returns; the arc is still the same line.'] },
  2: { prologue: ['驾驶离开时，空间回到人。', 'When driving steps away, the space returns to the person.'],
       epilogue: ['需要时，方向盘回来；不需要时，空间留给人。', 'When needed, the wheel returns; when not, the space is yours.'] },
  3: { prologue: ['弧线收回，秩序留下。', 'The arc draws back; the order remains.'],
       epilogue: ['收放之间，秩序不变。', 'Between stowed and deployed, the order holds.'] }
};
