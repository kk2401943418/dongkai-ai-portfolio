/* 回弧 Huí Hú — main.js（无构建，依赖 vendor/ 下的 GSAP + ScrollTrigger + Lenis，缺失时降级） */
(function () {
  const doc = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (hasGSAP && !reduce) doc.classList.add('js');

  /* ---------- 1. 真实素材自动替换占位 ----------
     <figure class="ph" data-src="assets/xxx/name"> 依次尝试 .webp/.jpg/.jpeg/.png，
     找到就插入 <img> 并隐藏占位标注。视频用 data-video（.mp4/.webm）。 */
  const IMG_EXT = ['.webp', '.jpg', '.jpeg', '.png'];
  function loadFigure(fig) {
    const base = fig.dataset.src;
    (function tryExt(i) {
      if (i >= IMG_EXT.length) return;
      const img = new Image(); img.decoding = 'async';
      img.onload = () => { img.alt = fig.querySelector('.ph__tag')?.textContent.replace(/占位 · 待替换：/, '').split('应来自')[0].trim() || ''; fig.prepend(img); fig.classList.add('is-real'); };
      img.onerror = () => tryExt(i + 1); img.src = base + IMG_EXT[i];
    })(0);
  }
  const figureObserver = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { figureObserver.unobserve(e.target); loadFigure(e.target); }
  }), { rootMargin: '600px' });
  document.querySelectorAll('.ph[data-src]').forEach((fig) => figureObserver.observe(fig));
  document.querySelectorAll('.ph[data-video]').forEach((fig) => {
    const base = fig.dataset.video;
    ['.mp4', '.webm'].forEach((ext) => {
      if (fig.classList.contains('is-real')) return;
      const v = document.createElement('video');
      v.preload = 'metadata'; v.controls = true; v.playsInline = true;
      v.onloadedmetadata = () => { if (fig.classList.contains('is-real')) return; fig.prepend(v); fig.classList.add('is-real'); const p = fig.querySelector('.film__play'); if (p) p.remove(); };
      v.src = base + ext;
    });
  });

  /* ---------- 2. HMI Demo 嵌入（07_hmi/index.html） ---------- */
  const DEMO_CANDIDATES = ['assets/hmi/index.html', 'assets/hmi/demo/index.html'];
  const frame = document.getElementById('demoFrame');
  const status = document.getElementById('demoStatus');
  const openA = document.getElementById('demoOpen');
  const ph = document.getElementById('demoPh');
  function demoMissing(why) { status.textContent = 'Demo 待接入' + (why ? '（' + why + '）' : ''); }
  function tryDemo(i) {
    if (i >= DEMO_CANDIDATES.length) return demoMissing();
    const url = DEMO_CANDIDATES[i];
    fetch(url, { method: 'HEAD', cache: 'no-store' }).then((r) => {
      if (!r.ok) return tryDemo(i + 1);
      frame.src = url; openA.href = url; frame.hidden = false; ph.hidden = true; openA.hidden = false;
      status.textContent = '已嵌入 ' + url.replace('assets/hmi/', '07_hmi/'); const pend = document.getElementById('demoPend'); if (pend) pend.hidden = true;
    }).catch(() => tryDemo(i + 1));
  }
  if (location.protocol === 'file:') {
    demoMissing('file:// 下无法检测，请用本地 http 服务预览');
  } else {
    tryDemo(0);
  }

  /* ---------- 3. 72 任务：读取 07_hmi/tasks.json，否则占位 ----------
     字段（交互 Demo 助手约定）：{"id":"T01","name":"任务名","location":"实体键区/左门板/右门板","zone":"左/中/右","feedback":"反馈说明","category":"分类"}；旧数据只有 door（左/右）时自动回退
     旧格式 {"name","zone"} 也兼容。矩阵按反馈分区（zone 左→中→右）排列；索引可按 门板 / 分区 / 分类 筛选，点条目展开 feedback。 */
  const grid = document.getElementById('taskGrid');
  const list = document.getElementById('taskList');
  const note = document.getElementById('taskNote');
  const cap = document.getElementById('taskCap');
  const filterBox = document.getElementById('taskFilter');
  const countEl = document.getElementById('taskCount');
  const ZONE_ORDER = { '左': 0, '中': 1, '右': 2 };
  const ZONE_CLS = { '左': 'z-left', '中': 'z-center', '右': 'z-right' };
  const norm = (v) => (v == null ? '' : String(v).trim().replace(/区$/, '').replace(/门板$/, ''));
  const filters = { location: '', zone: '', category: '' };
  // 操作位置：优先读 location（实体键区 / 左门板 / 右门板）；缺失时回退旧的 door 字段（左 / 右 → 左门板 / 右门板）
  const LOC_ORDER = { '实体键区': 0, '左门板': 1, '右门板': 2 };
  const toLoc = (raw) => {
    const v = raw.location != null && String(raw.location).trim() !== '' ? String(raw.location).trim() : '';
    if (v) return /^(左|右)$/.test(v) ? v + '门板' : v;
    const d = norm(raw.door); return d ? (/门板$|键区$/.test(d) ? d : d + '门板') : '';
  };
  let all = [];

  function applyFilters() {
    let n = 0;
    all.forEach((t) => {
      const ok = (!filters.location || t.location === filters.location) && (!filters.zone || t.zone === filters.zone) && (!filters.category || t.category === filters.category);
      t._li.classList.toggle('is-hidden', !ok); t._cell.classList.toggle('is-dim', !ok); if (ok) n++;
    });
    if (countEl) countEl.textContent = n + ' / ' + all.length;
  }
  function buildFilters() {
    const groups = [['location', '操作位置'], ['zone', '反馈分区'], ['category', '分类']];
    filterBox.innerHTML = '';
    groups.forEach(([key, label]) => {
      const vals = [...new Set(all.map((t) => t[key]).filter(Boolean))];
      if (key === 'zone') vals.sort((a, b) => (ZONE_ORDER[a] ?? 9) - (ZONE_ORDER[b] ?? 9));
      if (key === 'location') vals.sort((a, b) => (LOC_ORDER[a] ?? 9) - (LOC_ORDER[b] ?? 9));
      if (!vals.length) return;
      const g = document.createElement('div'); g.className = 'tfilter__g';
      g.innerHTML = '<span>' + label + '</span>';
      ['', ...vals].forEach((v) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = v || '全部'; if (!v) b.classList.add('is-on');
        b.addEventListener('click', () => { filters[key] = v; g.querySelectorAll('button').forEach((x) => x.classList.toggle('is-on', x === b)); applyFilters(); });
        g.appendChild(b);
      });
      filterBox.appendChild(g);
    });
    filterBox.hidden = !filterBox.children.length;
  }
  function renderTasks(tasks, isPh) {
    grid.innerHTML = ''; list.innerHTML = '';
    all = [];
    const src = isPh ? Array.from({ length: 72 }, () => ({})) : tasks;
    src.forEach((raw, i) => {
      all.push({
        id: raw.id || ('T' + String(i + 1).padStart(2, '0')),
        name: raw.name || '', location: toLoc(raw), zone: norm(raw.zone),
        feedback: raw.feedback || '', category: raw.category ? String(raw.category).trim() : '', _i: i
      });
    });
    // 矩阵按反馈分区排列（稳定排序）
    const byZone = isPh ? all : [...all].sort((a, b) => ((LOC_ORDER[a.location] ?? 9) - (LOC_ORDER[b.location] ?? 9)) || ((ZONE_ORDER[a.zone] ?? 9) - (ZONE_ORDER[b.zone] ?? 9)) || (a._i - b._i));
    byZone.forEach((t) => {
      const c = document.createElement('div'); c.className = 'tcell' + (ZONE_CLS[t.zone] ? ' ' + ZONE_CLS[t.zone] : '');
      c.textContent = t.id.replace(/^T/, ''); if (t.location === '实体键区') c.classList.add('is-key');
      c.title = t.id + ' · ' + (t.name || '任务名称待导入') + (t.zone ? ' · 反馈：' + t.zone + '区' : '') + (t.location ? ' · ' + t.location : '');
      grid.appendChild(c); t._cell = c;
    });
    all.forEach((t) => {
      const li = document.createElement('li'); if (!t.name) li.className = 'is-ph';
      li.innerHTML = '<b></b><span class="tname"></span><span class="ttags"></span><span class="tfb"></span>';
      li.querySelector('b').textContent = t.id;
      li.querySelector('.tname').textContent = t.name || '任务名称待导入';
      const tags = li.querySelector('.ttags');
      [t.location, t.zone && t.zone + '区', t.category].forEach((v) => { if (v) { const k = document.createElement('i'); k.textContent = v; if (v === '实体键区') k.className = 'tkey'; tags.appendChild(k); } });
      if (t.feedback) { li.dataset.hasFb = '1'; li.querySelector('.tfb').textContent = '反馈：' + t.feedback; li.title = '点击展开反馈说明'; li.addEventListener('click', () => li.classList.toggle('is-open')); }
      list.appendChild(li); t._li = li;
    });
    if (!isPh) {
      note.textContent = '已从 07_hmi/tasks.json 导入 ' + tasks.length + ' 项' + (tasks.length !== 72 ? '（⚠ 数量不是 72，请核对）' : '');
      if (cap) cap.hidden = false;
      buildFilters();
    }
    applyFilters();
  }
  renderTasks([], true);
  if (location.protocol !== 'file:') {
    fetch('assets/hmi/tasks.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((d) => {
      const arr = Array.isArray(d) ? d : (d && Array.isArray(d.tasks) ? d.tasks : null);
      if (arr && arr.length) renderTasks(arr, false);
    }).catch(() => {});
  }

  /* ---------- 4. 设计定义交互示意 ---------- */
  const cockpit = document.querySelector('.cockpit');
  if (cockpit) {
    cockpit.dataset.mode = 'l4';
    cockpit.querySelectorAll('.mode__btn').forEach((b) => b.addEventListener('click', () => {
      cockpit.querySelectorAll('.mode__btn').forEach((x) => x.classList.toggle('is-on', x === b));
      cockpit.dataset.mode = b.dataset.mode;
    }));
    let timer;
    cockpit.querySelectorAll('[data-hit]').forEach((r) => r.addEventListener('click', () => {
      const side = r.dataset.hit;
      const zone = cockpit.querySelector('.zone[data-zone="' + side + '"]');
      const flow = cockpit.querySelector('.flow-' + (side === 'left' ? 'l' : 'r'));
      cockpit.querySelectorAll('.zone,.flow').forEach((z) => z.classList.remove('is-hit', 'is-on'));
      zone.classList.add('is-hit'); flow.classList.add('is-on');
      clearTimeout(timer); timer = setTimeout(() => { zone.classList.remove('is-hit'); flow.classList.remove('is-on'); }, 1800);
    }));
  }

  /* ---------- 5. 对比滑块 ---------- */
  const cmp = document.getElementById('compare');
  if (cmp) {
    let drag = false;
    const set = (x) => { const r = cmp.getBoundingClientRect(); const p = Math.min(96, Math.max(4, (x - r.left) / r.width * 100)); cmp.style.setProperty('--x', p + '%'); };
    cmp.addEventListener('pointerdown', (e) => { drag = true; set(e.clientX); cmp.setPointerCapture(e.pointerId); });
    cmp.addEventListener('pointermove', (e) => { if (drag) set(e.clientX); });
    cmp.addEventListener('pointerup', () => { drag = false; });
    cmp.addEventListener('pointercancel', () => { drag = false; });
  }

  /* ---------- 0. 理念句候选组：<html data-tagline-set> 选择，见 js/taglines.js ---------- */
  (() => {
    const sets = window.HUIHU_TAGLINES, n = document.documentElement.dataset.taglineSet;
    if (!sets || !sets[n]) return;
    const put = (key, txt, br) => { const el = document.querySelector(`[data-tl="${key}"]`); if (!el) return; if (br) { el.textContent = ''; txt.split('；').forEach((p, i, a) => { el.append(p + (i < a.length - 1 ? '；' : '')); if (i < a.length - 1) el.append(document.createElement('br')); }); } else el.textContent = txt; };
    put('prologue-zh', sets[n].prologue[0]); put('prologue-en', sets[n].prologue[1]);
    put('epilogue-zh', sets[n].epilogue[0], true); put('epilogue-en', sets[n].epilogue[1]);
  })();

  /* ---------- 5a. 方向盘同机位三态查看器：展开 / 过渡 / 收起交叉淡化，滑块对比展开与收起；线稿 / 上色 ---------- */
  const wv = document.getElementById('wheelview');
  if (wv) {
    const stage = document.getElementById('wheelStage');
    let drag = false;
    const setView = (v) => { wv.dataset.view = v; wv.querySelectorAll('.seg [data-view]').forEach((b) => b.classList.toggle('is-on', b.dataset.view === v)); };
    const setX = (e) => { const r = stage.getBoundingClientRect(); stage.style.setProperty('--x', Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)) + '%'); };
    stage.addEventListener('pointerdown', (e) => { if (wv.dataset.view !== 'split') return; drag = true; setX(e); stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', (e) => { if (drag) setX(e); });
    stage.addEventListener('pointerup', () => { drag = false; });
    stage.addEventListener('pointercancel', () => { drag = false; });
    wv.querySelectorAll('.seg [data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
    wv.querySelectorAll('.seg [data-layer]').forEach((b) => b.addEventListener('click', () => { wv.dataset.layer = b.dataset.layer; wv.querySelectorAll('.seg [data-layer]').forEach((x) => x.classList.toggle('is-on', x === b)); }));
  }

  /* ---------- 5c. 样片视频：静音循环，进入视口才播放；竖屏手机用 9:16 ---------- */
  const tall = window.matchMedia('(max-width: 720px) and (orientation: portrait)');
  document.querySelectorAll('video.autovid').forEach((v) => {
    const pick = () => { const src = (tall.matches && v.dataset.srcTall) || v.dataset.srcWide; if (src && v.getAttribute('src') !== src) { const isTall = !!(tall.matches && v.dataset.srcTall); const poster = isTall ? v.dataset.posterTall : v.dataset.posterWide; if (poster) v.poster = poster; v.src = src; v.closest('.vid')?.classList.toggle('is-tall', isTall); } };
    if (!v.dataset.posterWide && v.getAttribute('poster')) v.dataset.posterWide = v.getAttribute('poster');
    pick(); tall.addEventListener?.('change', pick);
    v.muted = true; v.controls = true;
    if (reduce) { v.controls = true; return; }
    new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) v.play().catch((err) => { if (err.name === 'NotAllowedError') v.controls = true; }); else v.pause(); }), { threshold: 0.25 }).observe(v);
  });

  /* Shared image viewer: native modal, fit/native size, focus return. */
  const lb = document.createElement('dialog'); lb.className = 'lightbox';
  lb.setAttribute('aria-label', '图片大图'); lb.setAttribute('aria-describedby','lightboxCaption');
  lb.innerHTML = '<div class="lightbox__toolbar"><span>IMAGE VIEWER</span><button type="button" class="lightbox__scale" aria-pressed="false">原尺寸查看</button></div><button type="button" class="lightbox__close" aria-label="关闭大图">×</button><div class="lightbox__viewport" data-lenis-prevent><img alt=""></div><p class="lightbox__caption" id="lightboxCaption"></p>';
  document.body.appendChild(lb);
  let lbOpener;
  const lbImage = lb.querySelector('img'), scaleButton = lb.querySelector('.lightbox__scale');
  function closeLightbox() { lb.close(); lb.classList.remove('is-open','is-magnified'); document.body.style.overflow = ''; window.__huihu?.lenis?.start(); lbOpener?.focus({preventScroll:true}); }
  document.querySelectorAll('[data-full]').forEach((b) => b.addEventListener('click', () => {
    lbOpener = b; lbImage.onload = () => lb.style.setProperty('--native-width', lbImage.naturalWidth + 'px'); lbImage.src = b.dataset.full;
    lbImage.alt = b.querySelector('img')?.alt || b.getAttribute('aria-label') || b.textContent.trim();
    lb.querySelector('.lightbox__caption').textContent = b.dataset.caption || lbImage.alt;
    scaleButton.textContent = '原尺寸查看'; scaleButton.setAttribute('aria-pressed','false');
    lb.showModal(); lb.classList.add('is-open'); document.body.style.overflow = 'hidden'; window.__huihu?.lenis?.stop();
  }));
  scaleButton.addEventListener('click', () => { const zoomed = lb.classList.toggle('is-magnified'); scaleButton.setAttribute('aria-pressed',String(zoomed)); scaleButton.textContent = zoomed ? '适应屏幕' : '原尺寸查看'; });
  lb.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  lb.addEventListener('cancel', (e) => { e.preventDefault(); closeLightbox(); });

  const studyImage = document.getElementById('studyImage'), studyZoom = document.getElementById('studyZoom');
  document.querySelectorAll('[data-study-layer]').forEach((button) => button.addEventListener('click', () => {
    const layer = button.dataset.studyLayer, isLine = layer === 'line';
    const src = isLine ? 'assets/web/sketches/candidate_v12_line.webp' : 'assets/web/sketches/candidate_v12_color.webp';
    document.querySelectorAll('[data-study-layer]').forEach((b) => b.setAttribute('aria-pressed',String(b === button)));
    studyImage.src = src; studyZoom.dataset.full = src;
    studyImage.alt = 'v12 结构修订候选' + (isLine ? '线稿，供检查结构边界与线面衔接' : '上色稿，供观察体块、明暗与衔接');
    document.getElementById('studyCaption').textContent = isLine ? '线稿 · 检查结构边界与线面衔接；非终稿。' : '上色稿 · 观察体块、明暗与衔接；不代表最终材质与结构。';
  }));

  /* ---------- 6. 导航：当前章节 / 主题 / 进度 ---------- */
  const nav = document.querySelector('.nav');
  const navNum = nav.querySelector('.nav__num');
  const navLabel = nav.querySelector('.nav__label');
  const links = [...nav.querySelectorAll('.nav__list a')];
  const secs = [...document.querySelectorAll('.sec[data-chapter]')];
  const railFill = document.querySelector('.rail__bar i');
  function onScroll() {
    const y = window.scrollY; const probe = 40;
    nav.classList.toggle('is-scrolled', y > 40);
    // 导航条下方的颜色决定导航主题
    const el = document.elementsFromPoint(window.innerWidth / 2, probe + 30).find((n) => n.closest && n.closest('[data-theme], .seam'));
    if (el) {
      const host = el.closest('[data-theme], .seam');
      let theme = host.dataset.theme;
      if (!theme) { const r = host.getBoundingClientRect(); const t = (probe - r.top) / r.height; theme = host.classList.contains('seam--d2l') ? (t > .55 ? 'light' : 'dark') : (t > .45 ? 'dark' : 'light'); }
      nav.dataset.navTheme = theme;
    }
    let cur = secs[0];
    secs.forEach((s) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.4) cur = s; });
    navNum.textContent = cur.dataset.chapter; navLabel.textContent = cur.dataset.title;
    links.forEach((a) => { const active = a.getAttribute('href') === '#' + cur.id; a.classList.toggle('is-active', active); if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    const max = document.documentElement.scrollHeight - window.innerHeight;
    railFill.style.height = (max > 0 ? y / max * 100 : 0) + '%';
  }

  /* 可访问章节目录：手机可跳章，返回焦点不丢失。 */
  const menuToggle = nav.querySelector('.nav__toggle');
  links.forEach((a) => {
    const target = document.querySelector(a.getAttribute('href'));
    const label = document.createElement('span'); label.className = 'nav__chapter-title';
    label.textContent = target?.dataset.title || ''; a.appendChild(label);
    a.setAttribute('aria-label', a.textContent);
    a.addEventListener('click', () => {
      nav.classList.remove('is-menu-open'); menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-menu-open'); menuToggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-menu-open')) {
      nav.classList.remove('is-menu-open'); menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.focus();
    }
  });
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) { nav.classList.remove('is-menu-open'); menuToggle.setAttribute('aria-expanded', 'false'); } });

  /* 对比图支持键盘；竖向手势仍交给页面滚动。 */
  function keyboardSlider(el, label, enabled = () => true) {
    if (!el) return;
    el.tabIndex = 0; el.setAttribute('role', 'slider'); el.setAttribute('aria-label', label);
    el.setAttribute('aria-valuemin', '0'); el.setAttribute('aria-valuemax', '100');
    el.setAttribute('aria-valuenow', '50');
    const readX = () => { const n = parseFloat(getComputedStyle(el).getPropertyValue('--x')); return Number.isFinite(n) ? n : 50; };
    const updateAria = () => el.setAttribute('aria-valuenow', String(Math.round(readX())));
    el.addEventListener('pointerup', updateAria); el.addEventListener('pointercancel', updateAria);
    el.addEventListener('keydown', (e) => {
      if (!enabled() || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      e.preventDefault(); let v = readX();
      v = e.key === 'Home' ? 0 : e.key === 'End' ? 100 : Math.max(0, Math.min(100, v + (e.key === 'ArrowRight' ? 5 : -5)));
      el.style.setProperty('--x', v + '%'); updateAria();
    });
  }
  keyboardSlider(cmp, '人工驾驶与 L4 图像比较');
  keyboardSlider(document.getElementById('wheelStage'), '展开与收起图像比较', () => wv.dataset.view === 'split');
  document.querySelectorAll('.seg button,.mode__btn').forEach((b) => {
    const group = b.closest('.seg') || b.parentElement;
    const sync = () => group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.classList.contains('is-on'))));
    sync(); b.addEventListener('click', sync);
  });

  /* ---------- 7. 动效 ---------- */
  // 标题拆字
  document.querySelectorAll('[data-split]').forEach((h) => { h.setAttribute('aria-label', h.textContent); h.innerHTML = [...h.textContent].map((c) => '<span class="ch" aria-hidden="true">' + c + '</span>').join(''); });

  let lenis = null;
  if (hasGSAP && !reduce) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      lenis.on('scroll', () => { ScrollTrigger.update(); });
      gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
      document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
        const t = document.querySelector(a.getAttribute('href')); if (!t) return;
        e.preventDefault();
        const isFn = !!a.closest('sup.fn, .fnotes');
        lenis.scrollTo(t, { offset: isFn ? -window.innerHeight * 0.35 : 0 });
        if (isFn) { document.querySelectorAll('.is-target').forEach((x) => x.classList.remove('is-target')); (t.closest('li') || t).classList.add('is-target'); history.replaceState(null, '', a.getAttribute('href')); }
      }));
    }

    // 封面入场
    gsap.to('.display .ch', { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12 });

    // 分段入场
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true })
    });
    // 章节号视差
    document.querySelectorAll('.sec__num').forEach((n) => gsap.fromTo(n, { y: 40 }, { y: -40, ease: 'none', scrollTrigger: { trigger: n, start: 'top bottom', end: 'bottom top', scrub: true } }));
    // 过渡带弧线
    document.querySelectorAll('.seam').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 80%', once: true, onEnter: () => s.classList.add('is-in') }));
    // 72 计数
    const big = document.querySelector('[data-count]');
    if (big) { const o = { v: 0 }; gsap.to(o, { v: 72, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: big, start: 'top 80%', once: true }, onUpdate: () => { big.textContent = Math.round(o.v); } }); }
    gsap.from('.tcell', { opacity: 0, scale: .6, duration: .5, stagger: { each: .012, from: 'start' }, ease: 'power2.out', scrollTrigger: { trigger: '#taskGrid', start: 'top 85%', once: true } });

    // 爆炸分层
    gsap.fromTo('#explode', { '--gap': '14px' }, { '--gap': '74px', ease: 'none', scrollTrigger: { trigger: '#explode', start: 'top 85%', end: 'center 40%', scrub: true } });
    // 通用视差
    document.querySelectorAll('.details .ph, .scenes3 .ph').forEach((el, i) => gsap.fromTo(el.querySelector('.ph__art') || el, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } }));
  } else {
    document.querySelectorAll('.seam').forEach((s) => s.classList.add('is-in'));
  }

  let navFrame = 0;
  window.addEventListener('scroll', () => { if (!navFrame) navFrame = requestAnimationFrame(() => { navFrame = 0; onScroll(); }); }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  document.body.classList.remove('is-loading');
  window.__huihu = { lenis };
})();
