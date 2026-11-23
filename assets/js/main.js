/* ==========================================================================
   MAIN.JS — поведение главной страницы
   Модули независимы: каждый проверяет наличие своих элементов,
   поэтому файл можно подключать и на будущих страницах проекта.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Toast ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  const toast = (text) => {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-show'), 2200);
  };

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Mobile menu ---------- */
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  const setMenu = (open) => {
    if (!burger || !menu) return;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('is-locked', open);
  };
  burger?.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu || document.createElement('div')).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 1181px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Scroll-driven: pipeline-навигация, тема хедера, параллакс, таймлайн ---------- */
  const header = $('[data-header]');
  const stages = $$('[data-stage]');
  const navLinks = new Map($$('[data-pipeline] a').map((a) => [a.hash.slice(1), a]));
  const themed = $$('[data-theme]');
  const parallax = $$('[data-parallax]');
  const steps = $('[data-steps]');
  const stepItems = steps ? $$('.step', steps) : [];
  const hero = $('.hero');

  let ticking = false;
  const onScroll = () => {
    const vh = window.innerHeight;
    const headH = header ? header.offsetHeight : 0;
    const line = vh * 0.4;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

    // 1. Прогресс каждого этапа воронки
    stages.forEach((sec, i) => {
      const link = navLinks.get(sec.id);
      if (!link) return;
      const r = sec.getBoundingClientRect();
      let p = clamp((line - r.top) / r.height);
      if (atBottom) p = 1;
      link.style.setProperty('--p', p.toFixed(3));
      const active = atBottom ? i === stages.length - 1 : r.top <= line && r.bottom > line;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current');
    });

    // 2. Тема хедера по секции под ним
    if (header) {
      let theme = '';
      themed.forEach((sec) => {
        const r = sec.getBoundingClientRect();
        if (r.top <= headH && r.bottom > headH) theme = sec.dataset.theme;
      });
      header.classList.toggle('is-dark', theme === 'dark');
      header.classList.toggle('is-wine', theme === 'wine');
    }

    // 3. Параллакс имени (только пока hero в зоне видимости)
    if (!reduceMotion && hero && window.scrollY < hero.offsetHeight) {
      parallax.forEach((el) => {
        el.style.transform = `translate3d(0, ${(window.scrollY * parseFloat(el.dataset.parallax)).toFixed(1)}px, 0)`;
      });
    }

    // 4. Линия таймлайна «Как я работаю»
    if (steps) {
      const r = steps.getBoundingClientRect();
      const vertical = window.innerWidth <= 960;
      const span = vertical ? r.height : vh * 0.45;
      const sp = reduceMotion ? 1 : clamp((vh * 0.85 - r.top) / span);
      steps.style.setProperty('--sp', sp.toFixed(3));
      stepItems.forEach((el, i) => {
        const threshold = vertical
          ? (el.offsetTop) / r.height
          : i / stepItems.length;
        el.classList.toggle('is-on', sp > threshold + 0.001 || sp === 1);
      });
    }

    ticking = false;
  };

  const requestTick = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  };
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);
  onScroll();

  /* ---------- Services: аккордеон — открыт один пункт ---------- */
  const svcs = $$('[data-accordion] details');
  svcs.forEach((d) => {
    d.addEventListener('toggle', () => {
      if (d.open) svcs.forEach((o) => { if (o !== d) o.open = false; });
    });
  });

  /* ---------- Skills: фильтр по этапу сделки ---------- */
  const tabs = $$('[data-tabs] [data-filter]');
  const board = $('[data-board]');
  const countEl = $('[data-count]');
  const descEl = $('[data-desc]');
  const skillItems = board ? $$('li[data-s]', board) : [];

  const stageCopy = {
    all: 'в арсенале. Каждый работает на конкретном этапе — от поиска компании до подписанного договора.',
    lead: 'для поиска: определить, кому продукт действительно нужен, и найти людей, которые принимают решения.',
    contact: 'для первого контакта: написать так, чтобы ответили, и не сдаться после первого «нет».',
    discovery: 'для discovery: задать правильные вопросы и услышать, что на самом деле нужно клиенту.',
    pitch: 'для презентации: показать продукт через задачи клиента, а не через список функций.',
    deal: 'для сделки: зафиксировать договорённости, вести воронку и не потерять ни одного follow-up.',
  };

  const plural = (n) => {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'навык';
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'навыка';
    return 'навыков';
  };

  const animateCount = (to) => {
    if (!countEl) return;
    const from = parseInt(countEl.textContent, 10) || 0;
    if (reduceMotion || from === to) { countEl.textContent = to; return; }
    const t0 = performance.now();
    const dur = 420;
    const step = (t) => {
      const k = clamp((t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      countEl.textContent = Math.round(from + (to - from) * eased);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const applyFilter = (f) => {
    let n = 0;
    skillItems.forEach((li) => {
      const match = f === 'all' || li.dataset.s.split(' ').includes(f);
      li.classList.toggle('is-match', match && f !== 'all');
      if (match) n += 1;
    });
    board?.classList.toggle('is-filtered', f !== 'all');
    animateCount(n);
    if (descEl) {
      const text = stageCopy[f] || '';
      descEl.textContent = `${plural(n)} ${text}`;
    }
  };

  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      applyFilter(tab.dataset.filter);
    });
    // навигация стрелками по табам
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
    tab.tabIndex = tab.classList.contains('is-active') ? 0 : -1;
  });
  if (skillItems.length) applyFilter('all');

  /* ---------- Discovery-звонок: сообщения появляются по очереди ---------- */
  const call = $('[data-call]');
  if (call) {
    const msgs = $$('.msg', call);
    const timeEl = $('[data-call-time]', call);
    if (reduceMotion || !('IntersectionObserver' in window)) {
      call.classList.add('is-static');
      if (timeEl) timeEl.textContent = '04:12';
    } else {
      let started = false;
      const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      const play = () => {
        started = true;
        let sec = 0;
        const timer = setInterval(() => {
          sec += 1;
          if (timeEl) timeEl.textContent = fmt(sec);
        }, 1000);
        let i = 0;
        const next = () => {
          if (i >= msgs.length) {
            call.classList.remove('is-typing');
            setTimeout(() => clearInterval(timer), 4000);
            return;
          }
          const isMe = msgs[i].classList.contains('msg--me');
          call.classList.toggle('is-me', isMe);
          call.classList.add('is-typing');
          setTimeout(() => {
            call.classList.remove('is-typing');
            msgs[i].classList.add('is-shown');
            i += 1;
            setTimeout(next, 500);
          }, isMe ? 1200 : 800);
        };
        next();
      };
      const cio = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !started) {
          play();
          cio.disconnect();
        }
      }, { threshold: 0.45 });
      cio.observe(call);
    }
  }

  /* ---------- Копирование email ---------- */
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.copy;
      const label = $('[data-copy-label]', btn);
      try {
        await navigator.clipboard.writeText(value);
        toast('Email скопирован ✓');
        if (label) {
          const prev = label.textContent;
          label.textContent = 'Скопировано ✓';
          setTimeout(() => { label.textContent = prev; }, 2000);
        }
      } catch {
        window.location.href = `mailto:${value}`;
      }
    });
  });

  /* ---------- Локальное время в Минске ---------- */
  const clockEl = $('[data-clock]');
  const noteEl = $('[data-clock-note]');
  if (clockEl) {
    const fmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Minsk' });
    const hourFmt = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/Minsk' });
    const tick = () => {
      const now = new Date();
      clockEl.textContent = fmt.format(now);
      const h = parseInt(hourFmt.format(now), 10);
      if (noteEl) noteEl.textContent = h >= 9 && h < 21 ? 'сейчас на связи' : 'отвечу утром';
    };
    tick();
    setInterval(tick, 30000);
  }
})();
