/* =========================================================
   OCTOPUS · интерактив
   ========================================================= */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Щупальца в hero ---------------- */
  const canvas = document.getElementById("tentacles");
  const hero = document.getElementById("hero");
  const media = document.querySelector(".hero-media .arch");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1, tentacles = [], running = true;
  const mouse = { x: -9999, y: -9999, on: false };
  const intro = { grow: reduce ? 1 : 0 };

  // Конфигурация относительно арки с фото: щупальца «выглядывают» из-за тарелки
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const hr = hero.getBoundingClientRect();
    const r = media.getBoundingClientRect();
    const L = r.left - hr.left, T = r.top - hr.top, RW = r.width, RH = r.height;
    const s = Math.max(.6, Math.min(1.25, RW / 460));
    const deg = Math.PI / 180;
    const mobile = W < 768;

    tentacles = [
      { x: L + RW * .18, y: T + RH * .86, a: -160 * deg, len: RH * .5,  w: 34 * s, curl: 1,  ph: 0 },
      { x: L + RW * .32, y: T + RH * .98, a: 172 * deg,  len: RH * .42, w: 28 * s, curl: -1, ph: 1.7 },
      { x: L + RW * .86, y: T + RH * .62, a: -18 * deg,  len: RH * .46, w: 30 * s, curl: -1, ph: 3.1 },
      { x: L + RW * .78, y: T + RH * .96, a: 28 * deg,   len: RH * .38, w: 26 * s, curl: 1,  ph: 4.4 },
      { x: L + RW * .62, y: T + RH * .08, a: -78 * deg,  len: RH * .34, w: 20 * s, curl: 1,  ph: 2.2 },
      { x: L + RW * .2,  y: T + RH * .2,  a: -122 * deg, len: RH * .3,  w: 18 * s, curl: -1, ph: 5.3 },
    ];
    if (mobile) tentacles = tentacles.filter((_, i) => i !== 5).map(t => ({ ...t, len: t.len * .8 }));
    tentacles.forEach(t => { t.steer = 0; t.segs = 46; });
  }

  function wrapAngle(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

  function drawTentacle(t, time) {
    const N = t.segs, seg = (t.len * intro.grow) / N;
    // Плавный поворот к курсору: щупальце «тянется», но не ломает свою форму
    let target = 0;
    if (mouse.on) {
      const d = wrapAngle(Math.atan2(mouse.y - t.y, mouse.x - t.x) - t.a);
      target = Math.max(-1.1, Math.min(1.1, d)) * .85;
    }
    t.steer += (target - t.steer) * .04;

    const pts = [{ x: t.x, y: t.y }];
    let ang = t.a;
    for (let i = 1; i <= N; i++) {
      const k = i / N;
      ang += t.steer / N * 1.6
          + Math.sin(time * 1.1 + t.ph - i * .2) * .045 * (.4 + k)
          + t.curl * Math.pow(k, 3) * .34;
      const p = pts[i - 1];
      pts.push({ x: p.x + Math.cos(ang) * seg, y: p.y + Math.sin(ang) * seg });
    }

    // Контур: ширина сужается к кончику
    const left = [], right = [], normals = [];
    for (let i = 0; i <= N; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
      let nx = -(b.y - a.y), ny = b.x - a.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const w = (t.w * Math.pow(1 - i / N, .85) + 1.2) / 2;
      normals.push({ nx, ny, w });
      left.push({ x: pts[i].x + nx * w, y: pts[i].y + ny * w });
      right.push({ x: pts[i].x - nx * w, y: pts[i].y - ny * w });
    }

    const g = ctx.createLinearGradient(t.x, t.y, pts[N].x, pts[N].y);
    g.addColorStop(0, "#8f2e1c");
    g.addColorStop(.45, "#e05a3c");
    g.addColorStop(1, "#ff9677");
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < N; i++) ctx.quadraticCurveTo(left[i].x, left[i].y, (left[i].x + left[i + 1].x) / 2, (left[i].y + left[i + 1].y) / 2);
    ctx.lineTo(pts[N].x, pts[N].y);
    for (let i = N - 1; i > 0; i--) ctx.quadraticCurveTo(right[i].x, right[i].y, (right[i].x + right[i - 1].x) / 2, (right[i].y + right[i - 1].y) / 2);
    ctx.lineTo(right[0].x, right[0].y);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    // Блик по спинке
    ctx.beginPath();
    for (let i = 2; i < N - 2; i++) {
      const n = normals[i], side = -t.curl;
      const x = pts[i].x + n.nx * n.w * .45 * side, y = pts[i].y + n.ny * n.w * .45 * side;
      i === 2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(255, 200, 180, .22)";
    ctx.lineWidth = Math.max(1, t.w * .12);
    ctx.lineCap = "round";
    ctx.stroke();

    // Присоски на внутренней стороне изгиба
    for (let i = 3; i < N * .9; i += 2) {
      const n = normals[i], side = t.curl;
      const r = n.w * .42;
      if (r < 1.2) break;
      const x = pts[i].x + n.nx * n.w * .62 * side, y = pts[i].y + n.ny * n.w * .62 * side;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffc2ae"; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r * .45, 0, Math.PI * 2);
      ctx.fillStyle = "#d4644a"; ctx.fill();
    }
  }

  function frame(ms) {
    if (!running) return;
    const time = reduce ? 0 : ms / 1000;
    ctx.clearRect(0, 0, W, H);
    tentacles.forEach(t => drawTentacle(t, time));
    if (!reduce) requestAnimationFrame(frame);
  }

  layout();
  let resizeT;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { layout(); if (reduce) frame(0); }, 120); });
  hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
  });
  hero.addEventListener("pointerleave", () => { mouse.on = false; });

  // Не рисуем, когда hero вне экрана
  new IntersectionObserver(([en]) => {
    const was = running; running = en.isIntersecting;
    if (running && !was && !reduce) requestAnimationFrame(frame);
  }).observe(hero);

  if (reduce) frame(0); else requestAnimationFrame(frame);
  // Картинка могла загрузиться позже и сдвинуть сетку
  document.querySelector(".hero-media img").addEventListener("load", layout);

  /* ---------------- Навигация ---------------- */
  const nav = document.getElementById("nav");
  new IntersectionObserver(([en]) => nav.classList.toggle("is-solid", !en.isIntersecting), { rootMargin: "-80px 0px 0px 0px", threshold: 0 })
    .observe(document.querySelector(".hero-copy"));

  const burger = document.getElementById("burger");
  const drawer = document.getElementById("drawer");
  const setDrawer = open => {
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", !open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setDrawer(burger.getAttribute("aria-expanded") !== "true"));
  drawer.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setDrawer(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setDrawer(false); });

  /* ---------------- Магнитные кнопки ---------------- */
  if (!reduce && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".magnetic").forEach(btn => {
      btn.addEventListener("pointermove", e => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty("--mx", ((e.clientX - r.left - r.width / 2) * .18).toFixed(1) + "px");
        btn.style.setProperty("--my", ((e.clientY - r.top - r.height / 2) * .28).toFixed(1) + "px");
      });
      btn.addEventListener("pointerleave", () => { btn.style.setProperty("--mx", "0px"); btn.style.setProperty("--my", "0px"); });
    });
  }

  /* ---------------- Манифест: слова на отдельные span ---------------- */
  const manifesto = document.getElementById("manifesto");
  [...manifesto.childNodes].forEach(node => {
    if (node.nodeType !== 3 || !node.textContent.trim()) return;
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
      const s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.appendChild(s);
    });
    manifesto.replaceChild(frag, node);
  });

  /* ---------------- Города: плавающее фото ---------------- */
  const cities = document.getElementById("cities");
  const float = document.getElementById("cityFloat");
  const floatImg = float.querySelector("img");
  cities.querySelectorAll(".city").forEach(c => { const i = new Image(); i.src = c.dataset.img; });
  let fx = 0, fy = 0;
  cities.addEventListener("pointermove", e => {
    const r = cities.getBoundingClientRect();
    fx = e.clientX - r.left - float.offsetWidth / 2; fy = e.clientY - r.top - float.offsetHeight / 2;
    if (hasGsap) { gsap.to(float, { x: fx, y: fy, duration: .6, ease: "power3.out", overwrite: "auto" }); }
    else float.style.translate = `${fx}px ${fy}px`;
  });
  cities.querySelectorAll(".city").forEach(c => {
    c.addEventListener("pointerenter", () => { floatImg.src = c.dataset.img; float.classList.add("is-on"); });
  });
  cities.addEventListener("pointerleave", () => float.classList.remove("is-on"));

  /* ---------------- GSAP: сцена ---------------- */
  if (hasGsap && !reduce) {
    // Hero: строки заголовка выезжают, щупальца вырастают
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(".hero-title .line > span", { yPercent: 110, duration: 1.4, stagger: .12 })
      .from(".hero .reveal-up", { y: 24, opacity: 0, duration: 1.1, stagger: .08 }, .25)
      .from(".hero-media .arch", { clipPath: "inset(100% 0 0 0 round 999px 999px 28px 28px)", duration: 1.6 }, .1)
      .from(".hero-media img", { scale: 1.35, duration: 2 }, .1)
      .to(intro, { grow: 1, duration: 2.4, ease: "elastic.out(1, .55)" }, .5)
      .from(".hero-orbit", { scale: 0, opacity: 0, duration: 1.4 }, .7)
      .from(".nav", { y: -30, opacity: 0, duration: 1 }, .3);

    gsap.to(".hero-orbit", { rotate: 360, duration: 60, repeat: -1, ease: "none" });

    // Hero уходит с лёгким параллаксом
    gsap.to(".hero-media", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

    // Манифест: слова проявляются по мере чтения
    const words = manifesto.querySelectorAll(".w");
    gsap.to(words, {
      opacity: 1, stagger: .1, ease: "none",
      scrollTrigger: { trigger: manifesto, start: "top 78%", end: "bottom 45%", scrub: .6 },
    });
    gsap.from(".pill-img", {
      width: 0, marginLeft: 0, marginRight: 0, ease: "power2.out", stagger: .2,
      scrollTrigger: { trigger: manifesto, start: "top 70%", end: "bottom 50%", scrub: .6 },
    });

    // Восемь рук: горизонтальный проезд на десктопе
    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px)", () => {
      const track = document.getElementById("armsTrack");
      const distance = () => track.scrollWidth - window.innerWidth;
      const pan = gsap.to(track, {
        x: () => -distance(), ease: "none",
        scrollTrigger: { trigger: ".arms", start: "top top", end: () => "+=" + distance(), pin: true, scrub: 1, invalidateOnRefresh: true },
      });
      // Карточки слегка «плывут» по волне во время проезда
      gsap.utils.toArray(".arm").forEach((arm, i) => {
        gsap.fromTo(arm.querySelector(".arm-img img"), { xPercent: -8 }, {
          xPercent: 8, ease: "none",
          scrollTrigger: { trigger: arm, containerAnimation: pan, start: "left right", end: "right left", scrub: true },
        });
      });
    });

    // Фирменное блюдо: слово на фоне едет навстречу
    gsap.fromTo(".sig-word", { xPercent: -38 }, { xPercent: -62, ease: "none", scrollTrigger: { trigger: ".signature", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.from(".arch-tall", { clipPath: "inset(100% 0 0 0 round 999px 999px 28px 28px)", duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: ".signature", start: "top 65%" } });
    gsap.from(".arch-tall img", { scale: 1.3, duration: 2, ease: "expo.out", scrollTrigger: { trigger: ".signature", start: "top 65%" } });

    // Общие появления
    // Начальное состояние ставим сразу, чтобы блоки не «мигали» перед анимацией
    const rise = (sel, { y = 60 } = {}) => {
      gsap.set(sel, { y, autoAlpha: 0 });
      ScrollTrigger.batch(sel, {
        start: "top 90%", once: true,
        onEnter: els => gsap.to(els, { y: 0, autoAlpha: 1, duration: 1.2, ease: "expo.out", stagger: .1, overwrite: true }),
      });
    };
    rise(".more-title, .places .h2, .reviews .h2, .booking-copy > *");
    rise(".tile");
    rise(".city");
    rise(".quote");
    rise(".form", { y: 80 });
    rise(".sig-left > *, .sig-right > *");
    gsap.from(".footer-word", { yPercent: 40, opacity: 0, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: ".footer", start: "top 80%" } });

    window.addEventListener("load", () => { ScrollTrigger.refresh(); layout(); });
  }

  /* ---------------- Бронирование ---------------- */
  const form = document.getElementById("bookingForm");
  const fields = document.getElementById("formFields");
  const success = document.getElementById("formSuccess");
  const phone = document.getElementById("f-phone");
  const date = document.getElementById("f-date");
  const guestsOut = document.getElementById("guests");
  const stepBtns = form.querySelectorAll("[data-step]");
  let guests = 2;

  const pad = n => String(n).padStart(2, "0");
  const today = new Date();
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  date.min = iso(today);
  date.value = iso(today);

  const renderGuests = () => {
    guestsOut.textContent = guests;
    stepBtns[0].disabled = guests <= 1;
    stepBtns[1].disabled = guests >= 30;
  };
  stepBtns.forEach(b => b.addEventListener("click", () => { guests = Math.min(30, Math.max(1, guests + +b.dataset.step)); renderGuests(); }));
  renderGuests();

  // Маска +7 (XXX) XXX XX XX
  phone.addEventListener("input", () => {
    let d = phone.value.replace(/\D/g, "");
    if (d.startsWith("7") || d.startsWith("8")) d = d.slice(1);
    d = d.slice(0, 10);
    let out = "+7";
    if (d.length) out += " (" + d.slice(0, 3);
    if (d.length >= 3) out += ")";
    if (d.length > 3) out += " " + d.slice(3, 6);
    if (d.length > 6) out += " " + d.slice(6, 8);
    if (d.length > 8) out += " " + d.slice(8, 10);
    phone.value = d.length ? out : "";
  });

  const rules = {
    "f-name": el => el.value.trim().length >= 2,
    "f-phone": el => el.value.replace(/\D/g, "").length === 11,
    "f-place": el => !!el.value,
    "f-date": el => !!el.value && el.value >= date.min,
    "f-time": el => !!el.value && el.value >= "12:00" && el.value <= "23:30",
  };
  const check = el => {
    const ok = rules[el.id](el);
    el.closest(".field").classList.toggle("is-error", !ok);
    el.setAttribute("aria-invalid", !ok);
    return ok;
  };
  Object.keys(rules).forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener("blur", () => { if (el.value) check(el); });
    el.addEventListener("input", () => { if (el.closest(".field").classList.contains("is-error")) check(el); });
    el.addEventListener("change", () => { if (el.closest(".field").classList.contains("is-error")) check(el); });
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const els = Object.keys(rules).map(id => document.getElementById(id));
    const bad = els.filter(el => !check(el));
    if (bad.length) { bad[0].focus(); return; }
    const btn = form.querySelector("[type=submit]");
    btn.classList.add("is-loading"); btn.textContent = "Отправляем…";
    // TODO: подключить отправку заявки (CRM, Telegram-бот или почта)
    setTimeout(() => {
      fields.hidden = true; success.hidden = false;
      btn.classList.remove("is-loading"); btn.textContent = "Забронировать стол";
    }, 900);
  });
  document.getElementById("formReset").addEventListener("click", () => {
    form.reset(); date.value = iso(today); guests = 2; renderGuests();
    success.hidden = true; fields.hidden = false;
  });
})();
