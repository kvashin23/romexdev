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

  /* ---------- мобильное меню (бургер): единый плоский список без вложенных списков ---------- */
  const burger = document.querySelector('.burger');
  const headerEl = document.querySelector('header');
  if (burger && headerEl) {
    // строим плоский список один раз: верхнеуровневые пункты меню (без выпадающих подсписков с адресами) + пункты subnav, в том же порядке
    const flatNav = document.createElement('nav');
    flatNav.className = 'mobile-flat-nav';
    const links = [];
    headerEl.querySelectorAll('nav.mainnav > .navitem > a').forEach(a => {
      links.push({ href: a.getAttribute('href'), text: a.textContent.trim() });
    });
    headerEl.querySelectorAll('.subnav > a').forEach(a => {
      links.push({ href: a.getAttribute('href'), text: a.textContent.trim() });
    });
    flatNav.innerHTML = links.map(l => `<a href="${l.href}">${l.text}</a>`).join('');
    // Важно: список вставляется в <body>, а не внутрь <header>. У шапки есть
    // backdrop-filter (эффект «стекла»), а это CSS-свойство создаёт свой
    // containing block для потомков с position:fixed — внутри header фикс-меню
    // считало бы top/bottom не от экрана, а от рамки самой шапки (высотой
    // ~80px), и схлопывалось в узкую полоску вместо полноэкранного списка
    // (воспроизводится на внутренних страницах и на главной после скролла).
    document.body.appendChild(flatNav);

    burger.addEventListener('click', () => {
      const opening = !headerEl.classList.contains('nav-open');
      headerEl.classList.toggle('nav-open');
      flatNav.classList.toggle('open', opening);
      if (opening) {
        // высота хедера меняется, когда открывается subnav — считаем после переключения класса,
        // используем .bottom (а не .height), чтобы верно учесть текущее положение шапки на экране
        const bottom = headerEl.getBoundingClientRect().bottom;
        flatNav.style.setProperty('--mobile-nav-top', Math.max(bottom, 0) + 'px');
        document.body.classList.add('nav-locked');
      } else {
        document.body.classList.remove('nav-locked');
      }
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

  /* ---------- карусели со свайпом/перетаскиванием и точками-пагинацией ---------- */
  function initDraggableCarousel(track) {
    if (!track) return;
    const cards = Array.from(track.children);
    if (!cards.length) return;
    const dotsBox = document.querySelector(`[data-dots-for="${track.id}"]`);
    let dots = [];
    if (dotsBox) {
      cards.forEach((_, i) => {
        const d = document.createElement('button');
        if (i === 0) d.classList.add('active');
        d.addEventListener('click', () => {
          track.scrollTo({ left: cards[i].offsetLeft - track.offsetLeft, behavior: 'smooth' });
        });
        dotsBox.appendChild(d);
      });
      dots = Array.from(dotsBox.children);
    }
    let syncTimer;
    track.addEventListener('scroll', () => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        if (!dots.length) return;
        const maxScroll = track.scrollWidth - track.clientWidth;
        let closest = 0;
        if (track.scrollLeft <= 2) {
          closest = 0;
        } else if (track.scrollLeft >= maxScroll - 2) {
          closest = cards.length - 1;
        } else {
          let minDist = Infinity;
          cards.forEach((card, i) => {
            const dist = Math.abs((card.offsetLeft - track.offsetLeft) - track.scrollLeft);
            if (dist < minDist) { minDist = dist; closest = i; }
          });
        }
        dots.forEach(d => d.classList.remove('active'));
        if (dots[closest]) dots[closest].classList.add('active');
      }, 80);
    }, { passive: true });

    // drag-to-scroll мышью только при зажатой левой кнопке (touch работает нативно через overflow-x)
    let isDown = false, startX = 0, scrollStart = 0, moved = false;
    track.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDown = true; moved = false;
      startX = e.pageX; scrollStart = track.scrollLeft;
      track.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mouseup', () => { isDown = false; track.classList.remove('dragging'); });
    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      if (e.buttons !== 1) { isDown = false; track.classList.remove('dragging'); return; } // самовосстановление, если mouseup потерялся
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = scrollStart - dx;
    });
    // запрещаем нативное HTML5 drag&drop у ссылок/картинок — из-за него терялось событие mouseup
    track.querySelectorAll('a, img').forEach(el => { el.setAttribute('draggable', 'false'); });
    // не даём перетаскиванию превратиться в клик по ссылке-карточке
    track.addEventListener('click', (e) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
  }
  initDraggableCarousel(document.getElementById('promoTrack'));
  initDraggableCarousel(document.getElementById('newsTrack'));
  initDraggableCarousel(document.getElementById('advTrack'));

  /* ---------- зацикленная карусель (новости): в конце — переход в начало и обратно ---------- */
  document.querySelectorAll('[data-loop-prev]').forEach(btn => {
    btn.addEventListener('click', () => {
      const track = document.getElementById(btn.dataset.loopPrev);
      if (!track) return;
      if (track.scrollLeft <= 4) {
        track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: -320, behavior: 'smooth' });
      }
    });
  });
  document.querySelectorAll('[data-loop-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const track = document.getElementById(btn.dataset.loopNext);
      if (!track) return;
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 4) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: 320, behavior: 'smooth' });
      }
    });
  });

  /* ---------- стоимость и площадь автоматически меняются от выбранной комнатности ---------- */
  const roomTabsEl = document.getElementById('roomTabs');
  const areaRangeField = document.getElementById('areaRangeField');
  const priceRangeField = document.getElementById('priceRangeField');
  if (roomTabsEl) {
    roomTabsEl.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (priceRangeField && btn.dataset.min) {
          const fmtNum = n => Number(n).toLocaleString('ru-RU').replace(/,/g, ' ');
          priceRangeField.value = `${fmtNum(btn.dataset.min)} – ${fmtNum(btn.dataset.max)}`;
        }
        if (areaRangeField && btn.dataset.area) areaRangeField.value = btn.dataset.area;
      });
    });
  }

  /* ---------- то же самое для фильтров ЖК и каталога квартир (интервал цены, как на главной) ---------- */
  document.querySelectorAll('.room-toggle').forEach(group => {
    const buttons = group.querySelectorAll('button[data-min], button[data-price]');
    if (!buttons.length) return;
    const card = group.closest('.search-card');
    if (!card) return;
    const priceField = card.querySelector('.filter-locked input');
    const areaField = card.querySelector('.num-range-input');
    const fmtNum = n => Number(n).toLocaleString('ru-RU').replace(/,/g, ' ');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (priceField) {
          if (btn.dataset.min && btn.dataset.max) {
            priceField.value = `${fmtNum(btn.dataset.min)} – ${fmtNum(btn.dataset.max)}`;
          } else if (btn.dataset.price) {
            priceField.value = `от ${fmtNum(btn.dataset.price)}`;
          }
        }
        if (areaField && btn.dataset.area) areaField.value = btn.dataset.area;
      });
    });
  });

  /* ---------- лайтбокс для фото-мозаики (блок «О компании») и хода строительства (object.html) ---------- */
  document.querySelectorAll('.photo-mosaic, .timeline-photos').forEach(mosaic => {
    const imgs = Array.from(mosaic.querySelectorAll('img'));
    if (!imgs.length) return;
    imgs.forEach((img, i) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => openLightbox(imgs, i));
    });
  });
  let lightboxEl = null;
  function openLightbox(imgs, index) {
    if (!lightboxEl) {
      lightboxEl = document.createElement('div');
      lightboxEl.className = 'lightbox-overlay';
      lightboxEl.innerHTML = `
        <button class="lightbox-close" aria-label="Закрыть">✕</button>
        <button class="lightbox-nav lightbox-prev" aria-label="Назад"><svg width="10" height="16" viewBox="0 0 9 15" fill="none"><path d="M8 1.5 1.5 7.5 8 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <img class="lightbox-img" src="" alt="">
        <button class="lightbox-nav lightbox-next" aria-label="Вперёд"><svg width="10" height="16" viewBox="0 0 9 15" fill="none"><path d="M1 1.5 7.5 7.5 1 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      `;
      document.body.appendChild(lightboxEl);
      lightboxEl.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
      lightboxEl.addEventListener('click', e => { if (e.target === lightboxEl) closeLightbox(); });
      document.addEventListener('keydown', e => {
        if (!lightboxEl.classList.contains('show')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'ArrowRight') step(1);
      });
      lightboxEl.querySelector('.lightbox-prev').addEventListener('click', () => step(-1));
      lightboxEl.querySelector('.lightbox-next').addEventListener('click', () => step(1));
    }
    lightboxEl._imgs = imgs;
    lightboxEl._index = index;
    render();
    lightboxEl.classList.add('show');
    function render() {
      lightboxEl.querySelector('.lightbox-img').src = lightboxEl._imgs[lightboxEl._index].src;
    }
    function step(dir) {
      lightboxEl._index = (lightboxEl._index + dir + lightboxEl._imgs.length) % lightboxEl._imgs.length;
      render();
    }
  }
  function closeLightbox() { if (lightboxEl) lightboxEl.classList.remove('show'); }

  /* ---------- кастомный календарь (страница «Выдача ключей») ---------- */
  const dateField = document.getElementById('dateField');
  const miniCalendar = document.getElementById('miniCalendar');
  const dateFieldLabel = document.getElementById('dateFieldLabel');
  if (dateField && miniCalendar && dateFieldLabel) {
    const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    const weekDays = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    const today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();

    // демо-набор доступных дней: вт/чт/сб и не раньше сегодняшнего дня
    function isAvailable(date) {
      if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return false;
      const day = date.getDay(); // 0=вс..6=сб
      return day === 2 || day === 4 || day === 6;
    }

    function renderCalendar() {
      const first = new Date(viewYear, viewMonth, 1);
      const startOffset = (first.getDay() + 6) % 7; // понедельник = 0
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

      let cells = '';
      for (let i = startOffset; i > 0; i--) {
        cells += `<span class="cal-day muted">${daysInPrevMonth - i + 1}</span>`;
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(viewYear, viewMonth, d);
        const avail = isAvailable(date);
        cells += `<span class="cal-day${avail ? ' available' : ' disabled'}" data-day="${d}">${d}</span>`;
      }
      const totalCells = startOffset + daysInMonth;
      const trailing = (7 - (totalCells % 7)) % 7;
      for (let d = 1; d <= trailing; d++) {
        cells += `<span class="cal-day muted">${d}</span>`;
      }

      miniCalendar.innerHTML = `
        <div class="cal-head">
          <button type="button" class="cal-nav" data-cal-prev aria-label="Предыдущий месяц"><svg width="7" height="11" viewBox="0 0 9 15" fill="none"><path d="M8 1.5 1.5 7.5 8 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <span class="cal-title">${monthNames[viewMonth]} ${viewYear}</span>
          <button type="button" class="cal-nav" data-cal-next aria-label="Следующий месяц"><svg width="7" height="11" viewBox="0 0 9 15" fill="none"><path d="M1 1.5 7.5 7.5 1 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
        <div class="cal-weekdays">${weekDays.map(w => `<span>${w}</span>`).join('')}</div>
        <div class="cal-days">${cells}</div>
        <div class="cal-legend"><span class="cal-dot"></span> — доступные дни для визита</div>
      `;

      miniCalendar.querySelector('[data-cal-prev]').addEventListener('click', e => {
        e.stopPropagation();
        viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        renderCalendar();
      });
      miniCalendar.querySelector('[data-cal-next]').addEventListener('click', e => {
        e.stopPropagation();
        viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        renderCalendar();
      });
      miniCalendar.querySelectorAll('.cal-day.available').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          const d = el.dataset.day;
          dateFieldLabel.textContent = `${d} ${monthNames[viewMonth].toLowerCase()} ${viewYear}`;
          dateFieldLabel.classList.add('has-value');
          dateField.classList.remove('open');
        });
      });
    }
    renderCalendar();

    dateField.addEventListener('click', () => {
      dateField.classList.toggle('open');
    });
    document.addEventListener('click', e => {
      if (!dateField.contains(e.target)) dateField.classList.remove('open');
    });
  }

  /* ---------- клик по всему полю фильтра фокусирует инпут внутри ---------- */
  document.querySelectorAll('.filter').forEach(f => {
    const inp = f.querySelector('input, select');
    if (!inp) return;
    f.addEventListener('click', (e) => { if (e.target !== inp) inp.focus(); });
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

  /* ---------- магнитные кнопки ---------- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.magnetic').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.3}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- поочерёдная задержка для кирпичной кладки ---------- */
  document.querySelectorAll('.brick-viz i').forEach((brick, i) => {
    brick.style.animationDelay = (i * 45) + 'ms';
  });

  /* ---------- мини-сетка «живой» визуализации (статистика) ---------- */
  document.querySelectorAll('.mini-grid').forEach(grid => {
    const total = 36;
    for (let i = 0; i < total; i++) {
      const sq = document.createElement('i');
      sq.style.animationDelay = (i * 18) + 'ms';
      if (Math.random() < 0.3) sq.classList.add('on');
      grid.appendChild(sq);
    }
  });
  if ('IntersectionObserver' in window) {
    const gridObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
          gridObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5, rootMargin: '0px 0px -20% 0px' });
    document.querySelectorAll('.mini-grid, .brick-viz, .skyline-viz, .stat-with-viz').forEach(g => gridObs.observe(g));
  }

  /* ---------- анимированный счётчик статистики (запускается при появлении в зоне видимости) ---------- */
  const countEls = document.querySelectorAll('.count-up');
  if (countEls.length) {
    const fmt = (val, format) => {
      val = Math.round(val);
      if (format === 'area') return val.toLocaleString('ru-RU').replace(/,/g, ' ') + ' м²';
      if (format === 'plus') return val + '+';
      if (format === 'years') return val + ' лет';
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
      }, { threshold: 0.6, rootMargin: '0px 0px -20% 0px' });
      countEls.forEach(el => obs.observe(el));
    }
  }

  /* ---------- лёгкий параллакс фона слайдера + затемнение «глубины» ---------- */
  const heroParallaxEl = document.getElementById('hero');
  if (heroParallaxEl) {
    const scrimEl = heroParallaxEl.querySelector('.hero-scrim');
    const onParallax = () => {
      const rect = heroParallaxEl.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const shift = Math.round(window.scrollY * 0.18);
      heroParallaxEl.querySelectorAll('.slide .render').forEach(r => {
        r.style.transform = `translateY(${shift}px) scale(1.12)`;
      });
      if (scrimEl) {
        const progress = Math.min(Math.max(window.scrollY / heroParallaxEl.offsetHeight, 0), 1);
        scrimEl.style.opacity = (progress * 0.55).toFixed(2);
      }
    };
    window.addEventListener('scroll', onParallax, { passive: true });
    onParallax();
  }

  /* ---------- кастомный стилизованный дропдаун ---------- */
  document.querySelectorAll('.custom-select').forEach(sel => {
    const label = sel.querySelector('.custom-select-label');
    const list = sel.querySelector('.custom-select-list');
    const clickZone = sel.closest('.filter') || sel;
    clickZone.classList.add('filter-clickable');
    clickZone.addEventListener('click', e => {
      if (e.target.closest('.custom-select-list')) return; // клик по опции обрабатывается отдельно
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

  /* ---------- поле диапазона (площадь) — цифры и тире, с ограничением по метражу ---------- */
  document.querySelectorAll('.num-range-input').forEach(inp => {
    const min = parseInt(inp.dataset.min || '10', 10);
    const max = parseInt(inp.dataset.max || '300', 10);

    function sanitize(raw) {
      let v = raw.replace(/[^0-9\-–—]/g, '');
      v = v.replace(/[-–—]+/g, '–'); // несколько тире подряд — в одно
      const dashIndex = v.indexOf('–');
      if (dashIndex === -1) return v.slice(0, 3); // максимум 3 цифры (до 999 м²)
      const a = v.slice(0, dashIndex).slice(0, 3);
      const b = v.slice(dashIndex + 1).replace(/–/g, '').slice(0, 3);
      return a + '–' + b;
    }

    inp.addEventListener('input', () => {
      inp.value = sanitize(inp.value);
    });
    inp.addEventListener('keypress', e => {
      if (!/[0-9\-–—]/.test(e.key)) e.preventDefault();
    });
    inp.addEventListener('blur', () => {
      const parts = inp.value.split('–').map(s => s.trim()).filter(s => s !== '');
      if (parts.length === 0) { inp.value = min + '–' + max; return; }
      let a = parseInt(parts[0], 10);
      let b = parts.length > 1 ? parseInt(parts[1], 10) : max;
      if (isNaN(a)) a = min;
      if (isNaN(b)) b = max;
      a = Math.min(Math.max(a, min), max);
      b = Math.min(Math.max(b, min), max);
      if (a > b) { const t = a; a = b; b = t; }
      inp.value = a + '–' + b;
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
      const rounded = Number.isInteger(n) ? n : Math.round(n);
      return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
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

  /* ---------- маска телефона (+7 (000) 000-00-00) ---------- */
  function formatPhoneDigits(digits) {
    // digits — строка только из цифр, без ведущей 7/8 (максимум 10 знаков)
    let out = '+7';
    if (digits.length > 0) out += ' (' + digits.substring(0, 3);
    if (digits.length >= 3) out += ')';
    if (digits.length > 3) out += ' ' + digits.substring(3, 6);
    if (digits.length > 6) out += '-' + digits.substring(6, 8);
    if (digits.length > 8) out += '-' + digits.substring(8, 10);
    return out;
  }
  function digitsFromPhoneValue(value) {
    let d = (value || '').replace(/\D/g, '');
    if (d.startsWith('7') || d.startsWith('8')) d = d.substring(1);
    return d.substring(0, 10);
  }
  function applyPhoneMask(input) {
    const digits = digitsFromPhoneValue(input.value);
    input.value = digits ? formatPhoneDigits(digits) : '';
  }
  document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.setAttribute('inputmode', 'tel');
    if (!input.placeholder) input.placeholder = '+7 (000) 000-00-00';
    input.addEventListener('focus', () => { if (!input.value) input.value = '+7 '; });
    input.addEventListener('input', () => applyPhoneMask(input));
    input.addEventListener('blur', () => { if (input.value.trim() === '+7') input.value = ''; });
    input.addEventListener('keydown', e => {
      // Backspace на "+7 (" не должен застревать — просто очищаем поле
      if (e.key === 'Backspace' && digitsFromPhoneValue(input.value).length === 0) {
        input.value = '';
      }
    });
  });
  function isPhoneComplete(input) {
    return digitsFromPhoneValue(input.value).length === 10;
  }

  /* ---------- вывод ошибки под полем формы ---------- */
  function setFieldError(fieldEl, message) {
    if (!fieldEl) return;
    fieldEl.classList.add('has-error');
    let err = fieldEl.querySelector('.field-error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'field-error';
      fieldEl.appendChild(err);
    }
    err.textContent = message;
  }
  function clearFieldError(fieldEl) {
    if (!fieldEl) return;
    fieldEl.classList.remove('has-error');
    const err = fieldEl.querySelector('.field-error');
    if (err) err.remove();
  }

  /* ---------- формы: валидация + отправка через RomexAPI (fetch-заглушка) ---------- */
  document.querySelectorAll('form[data-form]').forEach(form => {
    form.setAttribute('novalidate', 'novalidate');

    const textFields = Array.from(form.querySelectorAll('.field input[type="text"]'));
    const telFields = Array.from(form.querySelectorAll('.field input[type="tel"]'));
    const nameField = textFields[0] || null; // первое текстовое поле формы считаем обязательным «Имя»
    const consentBox = form.querySelector('.consent input[type="checkbox"]');

    // снимаем ошибку по мере исправления поля
    if (nameField) {
      nameField.addEventListener('input', () => clearFieldError(nameField.closest('.field')));
    }
    telFields.forEach(tel => {
      tel.addEventListener('input', () => { if (isPhoneComplete(tel)) clearFieldError(tel.closest('.field')); });
    });
    if (consentBox) {
      consentBox.addEventListener('change', () => {
        if (consentBox.checked) consentBox.closest('.consent')?.classList.remove('consent-error');
      });
    }

    function validate() {
      let valid = true;
      if (nameField) {
        const val = nameField.value.trim();
        if (val.length < 2 || !/^[a-zA-Zа-яёА-ЯЁ\s\-]+$/.test(val)) {
          setFieldError(nameField.closest('.field'), 'Введите имя');
          valid = false;
        } else {
          clearFieldError(nameField.closest('.field'));
        }
      }
      telFields.forEach(tel => {
        if (!isPhoneComplete(tel)) {
          setFieldError(tel.closest('.field'), 'Введите корректный номер телефона');
          valid = false;
        } else {
          clearFieldError(tel.closest('.field'));
        }
      });
      if (consentBox && !consentBox.checked) {
        const label = consentBox.closest('.consent');
        if (label) {
          label.classList.add('consent-error');
          setTimeout(() => label.classList.remove('consent-error'), 1600);
        }
        valid = false;
      }
      return valid;
    }

    function getSubmitError() {
      let el = form.querySelector('.form-submit-error');
      if (!el) {
        el = document.createElement('div');
        el.className = 'form-submit-error';
        const btn = form.querySelector('button[type="submit"]');
        if (btn) btn.insertAdjacentElement('beforebegin', el); else form.appendChild(el);
      }
      return el;
    }

    form.addEventListener('submit', e => {
      e.preventDefault();

      if (!validate()) {
        const firstError = form.querySelector('.has-error input, .consent-error input');
        if (firstError) firstError.focus();
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const submitError = getSubmitError();
      submitError.classList.remove('show');

      const payload = {};
      if (nameField) payload.name = nameField.value.trim();
      telFields.forEach((tel, i) => { payload['phone' + (i ? i + 1 : '')] = tel.value; });
      const textarea = form.querySelector('.field textarea');
      if (textarea) payload.message = textarea.value.trim();

      const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.loading = '1';
        submitBtn.innerHTML = 'Отправляем&hellip;';
      }

      RomexAPI.submitForm(payload).then(() => {
        const card = form.closest('.form-card') || form.parentElement;
        const success = card ? card.querySelector('.form-success') : null;
        form.style.display = 'none';
        if (success) success.classList.add('show');
      }).catch(() => {
        submitError.textContent = 'Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.';
        submitError.classList.add('show');
      }).finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          delete submitBtn.dataset.loading;
          submitBtn.innerHTML = originalBtnHTML;
        }
      });
    });
  });

  /* ---------- интерактивный генплан (страница объекта) ---------- */
  const genplanFigure = document.getElementById('genplanFigure');
  if (genplanFigure) {
    const pins = Array.from(genplanFigure.querySelectorAll('.gp-pin'));
    const polys = {};
    genplanFigure.querySelectorAll('.gp-poly').forEach(p => { polys[p.dataset.liter] = p; });

    // Единая всплывающая карточка вынесена в <body> и позиционируется через
    // position:fixed. Так она никогда не обрезается overflow:hidden контейнера
    // генплана и не перекрывается соседними литерами (у неё один z-index на всю страницу),
    // а JS всегда удерживает её полностью в границах экрана.
    const popupEl = document.createElement('div');
    popupEl.className = 'gp-popup';
    document.body.appendChild(popupEl);

    let activePin = null;
    let hideTimer = null;

    function clearHideTimer() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } }

    function hidePopup() {
      popupEl.classList.remove('gp-popup--visible');
      activePin = null;
    }

    function deactivatePin(pin) {
      pin.classList.remove('active', 'tap-locked');
      const poly = polys[pin.dataset.liter];
      if (poly) poly.classList.remove('active');
      if (activePin === pin) hidePopup();
    }

    function closeAllPins(except) {
      pins.forEach(p => {
        if (p !== except) deactivatePin(p);
      });
      if (!except) hidePopup();
    }

    function positionPopup(pin) {
      const dataCard = pin.querySelector('.gp-card');
      if (!dataCard) return;
      popupEl.innerHTML = dataCard.innerHTML;
      activePin = pin;

      const margin = 12;
      const pinRect = pin.getBoundingClientRect();
      const popRect = popupEl.getBoundingClientRect();

      let left = pinRect.left + pinRect.width / 2 - popRect.width / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - popRect.width - margin));

      let below = false;
      let top = pinRect.top - popRect.height - 14;
      if (top < margin) {
        top = pinRect.bottom + 14;
        below = true;
      }
      top = Math.max(margin, Math.min(top, window.innerHeight - popRect.height - margin));

      const arrowLeft = Math.max(14, Math.min(pinRect.left + pinRect.width / 2 - left, popRect.width - 14));

      popupEl.style.left = left + 'px';
      popupEl.style.top = top + 'px';
      popupEl.style.setProperty('--gp-arrow-left', arrowLeft + 'px');
      popupEl.classList.toggle('gp-popup--below', below);
      popupEl.classList.add('gp-popup--visible');
    }

    pins.forEach(pin => {
      const liter = pin.dataset.liter;
      const poly = polys[liter];

      const activate = () => {
        clearHideTimer();
        // закрываем все остальные литеры перед активацией этого — иначе при быстром
        // перемещении курсора между пинами их общий hideTimer постоянно отменяется
        // соседним mouseenter, и несколько литеров остаются подсвеченными одновременно
        closeAllPins(pin);
        pin.classList.add('active');
        if (poly) poly.classList.add('active');
        positionPopup(pin);
      };
      const scheduleDeactivate = () => {
        clearHideTimer();
        hideTimer = setTimeout(() => {
          if (!pin.classList.contains('tap-locked')) deactivatePin(pin);
        }, 150);
      };

      pin.addEventListener('mouseenter', activate);
      pin.addEventListener('mouseleave', scheduleDeactivate);
      pin.addEventListener('focus', activate);
      pin.addEventListener('blur', () => {
        if (!pin.classList.contains('tap-locked')) deactivatePin(pin);
      });

      pin.addEventListener('click', e => {
        e.preventDefault();
        // состояние "закреплён кликом/тапом" храним отдельно от .active,
        // которое также включает чистый :hover — иначе на touch-устройствах,
        // синтезирующих mouseenter перед click, попап открывался бы и тут же закрывался
        const wasLocked = pin.classList.contains('tap-locked');
        pins.forEach(p => p.classList.remove('tap-locked'));
        if (wasLocked) {
          closeAllPins(null);
        } else {
          closeAllPins(pin);
          pin.classList.add('tap-locked');
          activate();
        }
      });
    });

    // Пока курсор находится над самой всплывающей карточкой (уже вне пина),
    // не закрываем её — иначе до ссылок внутри невозможно было бы дотянуться мышью.
    popupEl.addEventListener('mouseenter', clearHideTimer);
    popupEl.addEventListener('mouseleave', () => {
      if (activePin && !activePin.classList.contains('tap-locked')) scheduleDeactivateFor(activePin);
    });
    function scheduleDeactivateFor(pin) {
      clearHideTimer();
      hideTimer = setTimeout(() => {
        if (!pin.classList.contains('tap-locked')) deactivatePin(pin);
      }, 150);
    }

    document.addEventListener('click', e => {
      if (!genplanFigure.contains(e.target) && !popupEl.contains(e.target)) {
        pins.forEach(p => p.classList.remove('tap-locked'));
        closeAllPins(null);
      }
    });

    // при скролле/ресайзе положение пина относительно вьюпорта меняется —
    // пересчитываем позицию открытого попапа, а не закрываем его (иначе клик,
    // из-за которого браузер сам подскроллил только что сфокусированную кнопку,
    // тут же закрывал бы только что открытый попап)
    function repositionActivePopup() {
      if (activePin) positionPopup(activePin);
    }
    window.addEventListener('scroll', repositionActivePopup, { passive: true });
    window.addEventListener('resize', repositionActivePopup);
  }

  /* ---------- «Скачать КП»: печатная версия страницы лота ---------- */
  document.querySelectorAll('[data-print-kp]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dateEl = document.querySelector('.print-letterhead .print-date');
      if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      window.print();
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
