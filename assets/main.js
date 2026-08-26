/* =========================================================
   Romex Development — общий JS для всех страниц прототипа
   Подключается на каждой странице перед закрывающим </body>
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- прозрачная шапка поверх слайдера: делаем непрозрачной при скролле ---------- */
  if (document.body.classList.contains('transparent-header') && headerElForScroll()) {
    const hEl = headerElForScroll();
    const onScroll = () => {
      if (window.scrollY > 40) hEl.classList.add('scrolled');
      else hEl.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  function headerElForScroll(){ return document.querySelector('header'); }

  /* ---------- мобильное меню (бургер) ---------- */
  const burger = document.querySelector('.burger');
  const headerEl = document.querySelector('header');
  if (burger && headerEl) {
    burger.addEventListener('click', () => {
      headerEl.classList.toggle('nav-open');
    });
  }

  /* ---------- слайдер в хиро-блоке (если есть на странице) ---------- */
  const heroEl = document.getElementById('hero');
  if (heroEl) {
    const slides = heroEl.querySelectorAll('.slide');
    const dotsWrap = document.getElementById('heroDots');
    let slideIndex = 0;

    if (dotsWrap) {
      slides.forEach((_, i) => {
        const d = document.createElement('button');
        if (i === 0) d.classList.add('active');
        d.addEventListener('click', () => showSlide(i));
        dotsWrap.appendChild(d);
      });
    }

    function showSlide(i) {
      slides.forEach(s => s.classList.remove('active'));
      if (dotsWrap) dotsWrap.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      slideIndex = (i + slides.length) % slides.length;
      slides[slideIndex].classList.add('active');
      if (dotsWrap) dotsWrap.children[slideIndex].classList.add('active');
    }
    window.moveSlide = (dir) => showSlide(slideIndex + dir);

    if (slides.length > 1) {
      setInterval(() => window.moveSlide(1), 6000);
      let touchStartX = 0;
      heroEl.addEventListener('touchstart', e => touchStartX = e.touches[0].clientX);
      heroEl.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 40) window.moveSlide(dx < 0 ? 1 : -1);
      });
    }
  }

  /* ---------- горизонтальные карусели (акции, галереи, планировки) ---------- */
  document.querySelectorAll('[data-scroll-prev]').forEach(btn => {
    btn.addEventListener('click', () => {
      const track = document.getElementById(btn.dataset.scrollPrev);
      if (track) track.scrollBy({ left: -340, behavior: 'smooth' });
    });
  });
  document.querySelectorAll('[data-scroll-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const track = document.getElementById(btn.dataset.scrollNext);
      if (track) track.scrollBy({ left: 340, behavior: 'smooth' });
    });
  });

  /* ---------- умная шапка: прячется при скролле вниз, показывается при скролле вверх ---------- */
  const smartHeader = document.querySelector('header');
  if (smartHeader) {
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > lastY && y > 140) {
        smartHeader.classList.add('header-hidden');
      } else {
        smartHeader.classList.remove('header-hidden');
      }
      lastY = y;
    }, { passive: true });
  }

  /* ---------- анимированный счётчик статистики (запускается при появлении в зоне видимости) ---------- */
  const countEls = document.querySelectorAll('.count-up');
  if (countEls.length) {
    const fmt = (val, format) => {
      val = Math.round(val);
      if (format === 'area') return val.toLocaleString('ru-RU').replace(/,/g, ' ') + ' м²';
      if (format === 'plus') return val + '+';
      return String(val);
    };
    const animateCount = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const format = el.dataset.format || 'plain';
      const duration = 1400;
      const start = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased, format);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      countEls.forEach(el => obs.observe(el));
    }
  }

  /* ---------- лёгкий параллакс фона слайдера ---------- */
  const heroParallaxEl = document.getElementById('hero');
  if (heroParallaxEl) {
    const onParallax = () => {
      const rect = heroParallaxEl.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const shift = Math.round(window.scrollY * 0.18);
      heroParallaxEl.querySelectorAll('.slide .render').forEach(r => {
        r.style.transform = `translateY(${shift}px) scale(1.12)`;
      });
    };
    window.addEventListener('scroll', onParallax, { passive: true });
    onParallax();
  }

  /* ---------- кастомный стилизованный дропдаун ---------- */
  document.querySelectorAll('.custom-select').forEach(sel => {
    const trigger = sel.querySelector('.custom-select-trigger');
    const label = sel.querySelector('.custom-select-label');
    const list = sel.querySelector('.custom-select-list');
    trigger?.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select.open').forEach(s => { if (s !== sel) s.classList.remove('open'); });
      sel.classList.toggle('open');
    });
    list?.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.addEventListener('click', () => {
        list.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        if (label) label.textContent = opt.textContent;
        sel.classList.remove('open');
      });
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
  });

  /* ---------- числовое поле с форматированием (пробел между разрядами) ---------- */
  document.querySelectorAll('.num-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const digits = inp.value.replace(/\D/g, '');
      inp.value = digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '';
    });
  });

  /* ---------- модальные окна ---------- */
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById(btn.dataset.modalOpen);
      if (modal) modal.classList.add('open');
    });
  });
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay')?.classList.remove('open');
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  });

  /* ---------- двойной слайдер диапазона (стоимость/площадь) ---------- */
  document.querySelectorAll('.range-pair').forEach(pair => {
    const minInput = pair.querySelector('.range-min');
    const maxInput = pair.querySelector('.range-max');
    const out = document.getElementById(pair.dataset.output);
    const unit = pair.dataset.unit || '';
    function fmt(v){
      const n = parseFloat(v);
      return Number.isInteger(n) ? n : n.toFixed(1).replace('.', ',');
    }
    function update(){
      let a = parseFloat(minInput.value), b = parseFloat(maxInput.value);
      if (a > b) { const t = minInput.value; minInput.value = maxInput.value; maxInput.value = t; }
      a = parseFloat(minInput.value); b = parseFloat(maxInput.value);
      if (out) out.textContent = `${fmt(a)} – ${fmt(b)}${unit}`;
    }
    minInput?.addEventListener('input', update);
    maxInput?.addEventListener('input', update);
  });

  /* ---------- переключатели-чипы (комнатность, фильтры, табы-кнопки) ---------- */
  document.querySelectorAll('.toggle-group, .room-toggle').forEach(group => {
    group.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  /* ---------- аккордеоны (литеры генплана, ход строительства, FAQ) ---------- */
  document.querySelectorAll('.accordion-head').forEach(head => {
    head.addEventListener('click', () => {
      head.closest('.accordion-item')?.classList.toggle('open');
    });
  });

  /* ---------- табы (год/месяц, разделы) ---------- */
  document.querySelectorAll('.tabs').forEach(tabs => {
    const buttons = tabs.querySelectorAll('.tab-btn');
    const panels = tabs.querySelectorAll('.tab-panel');
    buttons.forEach((b, i) => {
      b.addEventListener('click', () => {
        buttons.forEach(x => x.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        b.classList.add('active');
        if (panels[i]) panels[i].classList.add('active');
      });
    });
  });

  /* ---------- формы: имитация успешной отправки ---------- */
  document.querySelectorAll('form[data-form]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const card = form.closest('.form-card') || form.parentElement;
      const success = card ? card.querySelector('.form-success') : null;
      form.style.display = 'none';
      if (success) success.classList.add('show');
    });
  });

});

/* ---------- баннер cookies ---------- */
function dismissCookie() {
  const el = document.getElementById('cookieBanner');
  if (el) el.classList.add('hide');
}

/* ---------- «Показать ещё» / «Свернуть» ---------- */
function toggleShowMore(btn) {
  const target = document.getElementById(btn.dataset.target);
  if (!target) return;
  target.classList.toggle('show');
  btn.textContent = target.classList.contains('show')
    ? (btn.dataset.less || 'Свернуть')
    : (btn.dataset.more || 'Показать ещё');
}
