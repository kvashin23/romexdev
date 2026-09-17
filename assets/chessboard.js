/* ==========================================================
   Шахматка квартир — рендер плитки/списка по данным CHESS_DATA
   Работает только на chessboard.html (проверяем наличие #chessBoard)
   ========================================================== */
(function () {
  'use strict';

  var boardEl = document.getElementById('chessBoard');
  if (!boardEl || !window.CHESS_DATA) return;

  var DATA = window.CHESS_DATA;

  var params = new URLSearchParams(window.location.search);
  var literNum = parseInt(params.get('liter'), 10);
  if (!literNum || literNum < 1) literNum = 11;

  var isSoldOutLiter = DATA.soldOutLiters.indexOf(literNum) !== -1;
  var dataset = DATA.unique[String(literNum)] || DATA.soldOut;

  var isTouchPrimary = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);

  var state = {
    view: 'full',
    entrance: dataset.entrances[0].e,
    roomFilter: 'all'
  };

  /* ---------- заголовок ---------- */
  var titleEl = document.getElementById('chessTitle');
  if (titleEl) {
    titleEl.textContent = 'Литер ' + literNum + ' — квартиры по этажам';
  }
  var headbar = document.querySelector('.chess-headbar > div');
  if (headbar) {
    var statusLine = document.createElement('p');
    statusLine.style.color = 'var(--slate)';
    statusLine.style.fontSize = '14px';
    statusLine.style.marginTop = '6px';
    statusLine.textContent = 'НЕО-квартал «Красная площадь», Краснодар · ' +
      (isSoldOutLiter ? 'дом сдан, все квартиры проданы' : 'дом сдан, отдельные лоты в продаже');
    headbar.appendChild(statusLine);
  }

  /* ---------- утилиты ---------- */
  function fmtPrice(n) { return n.toLocaleString('ru-RU') + ' ₽'; }
  function fmtPricePerM2(n) { return n.toLocaleString('ru-RU') + ' ₽/м²'; }
  function unitHref(u) { return 'flat.html?liter=' + literNum + '&unit=' + u.n; }

  function forEachUnit(fn) {
    dataset.entrances.forEach(function (ent) {
      ent.floors.forEach(function (fl) {
        fl.u.forEach(function (u) { fn(u, ent, fl); });
      });
    });
  }

  /* ---------- сводка ---------- */
  function renderSummary() {
    var total = 0, free = 0;
    forEachUnit(function (u) { total++; if (u.s === 'free') free++; });
    var sold = total - free;
    var el = document.getElementById('chessSummary');
    if (!el) return;
    el.innerHTML =
      '<span><b>' + total + '</b> квартир в литере</span>' +
      '<span><span class="chess-dot chess-dot--free"></span>Свободно — <b>' + free + '</b></span>' +
      '<span><span class="chess-dot chess-dot--sold"></span>Продано — <b>' + sold + '</b></span>';
  }

  /* ---------- фильтр по комнатности ---------- */
  function collectRoomTypes() {
    var set = {};
    forEachUnit(function (u) { set[u.b] = true; });
    return Object.keys(set).sort();
  }

  function renderRoomFilter() {
    var wrap = document.getElementById('chessRoomFilter');
    if (!wrap) return;
    var html = '<button type="button" class="active" data-room="all">Все</button>';
    collectRoomTypes().forEach(function (t) {
      html += '<button type="button" data-room="' + t + '">' + t + '</button>';
    });
    wrap.innerHTML = html;
    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-room]');
      if (!btn) return;
      Array.prototype.forEach.call(wrap.querySelectorAll('button'), function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.roomFilter = btn.getAttribute('data-room');
      applyRoomFilter();
    });
  }

  function applyRoomFilter() {
    Array.prototype.forEach.call(boardEl.querySelectorAll('[data-badge]'), function (el) {
      var show = state.roomFilter === 'all' || el.getAttribute('data-badge') === state.roomFilter;
      el.classList.toggle('is-filtered-out', !show);
    });
  }

  /* ---------- переключатель подъездов ---------- */
  function renderEntranceSwitch() {
    var wrap = document.getElementById('chessEntranceSwitch');
    if (!wrap) return;
    var html = '';
    dataset.entrances.forEach(function (ent, i) {
      html += '<button type="button" class="tab-btn' + (i === 0 ? ' active' : '') + '" data-entrance-btn="' + ent.e + '">Подъезд ' + ent.e + '</button>';
    });
    wrap.innerHTML = html;
    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-entrance-btn]');
      if (!btn) return;
      Array.prototype.forEach.call(wrap.querySelectorAll('button'), function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.entrance = parseInt(btn.getAttribute('data-entrance-btn'), 10);
      showActiveEntrance();
    });
  }

  function showActiveEntrance() {
    Array.prototype.forEach.call(boardEl.querySelectorAll('.chess-entrance-panel'), function (panel) {
      panel.classList.toggle('chess-hidden', parseInt(panel.getAttribute('data-entrance'), 10) !== state.entrance);
    });
    updateScrollHints();
  }

  /* ---------- переключатель вида ---------- */
  function initViewSwitch() {
    var wrap = document.getElementById('chessViewSwitch');
    if (!wrap) return;
    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-chess-view-btn]');
      if (!btn) return;
      Array.prototype.forEach.call(wrap.querySelectorAll('button'), function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.view = btn.getAttribute('data-chess-view-btn');
      boardEl.setAttribute('data-chess-view', state.view);
      closeAllPopups();
      Array.prototype.forEach.call(boardEl.querySelectorAll('.chess-tiles-view'), function (v) { v.classList.toggle('chess-hidden', state.view === 'list'); });
      Array.prototype.forEach.call(boardEl.querySelectorAll('.chess-list-view'), function (v) { v.classList.toggle('chess-hidden', state.view !== 'list'); });
      updateScrollHints();
    });
  }

  /* ---------- единая всплывашка карточки (вынесена в <body>) ---------- */
  var popupEl = document.createElement('div');
  popupEl.className = 'chess-popup';
  document.body.appendChild(popupEl);

  var activeTile = null;
  var hidePopupTimer = null;

  function clearHidePopupTimer() { if (hidePopupTimer) { clearTimeout(hidePopupTimer); hidePopupTimer = null; } }

  function hidePopup() {
    popupEl.classList.remove('chess-popup--visible');
    activeTile = null;
  }

  function closeAllPopups() {
    Array.prototype.forEach.call(document.querySelectorAll('.chess-tile.chess-popup-open'), function (t) {
      t.classList.remove('chess-popup-open');
    });
    hidePopup();
  }

  /* ---------- позиционирование попапа ---------- */
  function positionPopup(tile) {
    var dataEl = tile.querySelector('.chess-popup-data');
    if (!dataEl) return;
    popupEl.innerHTML = dataEl.innerHTML;
    activeTile = tile;

    var margin = 12;
    var tileRect = tile.getBoundingClientRect();
    var popRect = popupEl.getBoundingClientRect();

    var left = tileRect.left + tileRect.width / 2 - popRect.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - popRect.width - margin));

    var top = tileRect.top - popRect.height - 9;
    if (top < margin) top = tileRect.bottom + 9;
    top = Math.max(margin, Math.min(top, window.innerHeight - popRect.height - margin));

    popupEl.style.left = left + 'px';
    popupEl.style.top = top + 'px';
    popupEl.classList.add('chess-popup--visible');
  }

  function scheduleHidePopup(tile) {
    clearHidePopupTimer();
    hidePopupTimer = setTimeout(function () {
      if (!tile.classList.contains('chess-popup-open')) hidePopup();
    }, 150);
  }

  popupEl.addEventListener('mouseenter', clearHidePopupTimer);
  popupEl.addEventListener('mouseleave', function () {
    if (activeTile && !activeTile.classList.contains('chess-popup-open')) scheduleHidePopup(activeTile);
  });

  function repositionActivePopup() {
    if (activeTile) positionPopup(activeTile);
  }
  window.addEventListener('scroll', repositionActivePopup, { passive: true });
  window.addEventListener('resize', repositionActivePopup);

  /* ---------- плитка ---------- */
  function renderTile(u) {
    var tile = document.createElement('div');
    tile.className = 'chess-tile';
    tile.setAttribute('data-status', u.s);
    tile.setAttribute('data-badge', u.b);
    tile.setAttribute('tabindex', '0');
    tile.setAttribute('role', 'button');

    var priceBlockHtml, popupBodyHtml;
    if (u.s === 'free') {
      tile.setAttribute('data-href', unitHref(u));
      tile.setAttribute('aria-label', 'Квартира №' + u.n + ', свободна, ' + fmtPrice(u.p));
      priceBlockHtml =
        '<span class="chess-tile-price">' + fmtPrice(u.p) + '</span>' +
        '<span class="chess-tile-area">' + u.a + ' м²</span>';
      popupBodyHtml =
        '<div class="chess-popup-title">№' + u.n + ' · ' + u.b + '</div>' +
        '<div class="chess-popup-row"><span>Площадь</span><span>' + u.a + ' м²</span></div>' +
        '<div class="chess-popup-row"><span>Цена</span><span class="chess-popup-price">' + fmtPrice(u.p) + '</span></div>' +
        '<div class="chess-popup-row"><span>Цена за м²</span><span>' + fmtPricePerM2(u.m) + '</span></div>' +
        '<a class="chess-popup-link" href="' + unitHref(u) + '">Смотреть квартиру &rarr;</a>';
    } else {
      tile.setAttribute('aria-label', 'Квартира №' + u.n + ', продана');
      priceBlockHtml =
        '<span class="chess-tile-price">Продано</span>' +
        '<span class="chess-tile-area">' + u.a + ' м²</span>';
      popupBodyHtml =
        '<div class="chess-popup-title">№' + u.n + ' · ' + u.b + '</div>' +
        '<div class="chess-popup-row"><span>Площадь</span><span>' + u.a + ' м²</span></div>' +
        '<div class="chess-popup-row"><span>Статус</span><span class="chess-popup-sold">Продано</span></div>';
    }

    tile.innerHTML =
      '<div class="chess-tile__full">' +
        '<span class="chess-tile-badge">' + u.b + '</span>' +
        '<span class="chess-tile-main"><span class="chess-tile-num">№' + u.n + '</span>' + priceBlockHtml + '</span>' +
      '</div>' +
      '<div class="chess-tile__compact">' + u.b + '</div>' +
      '<div class="chess-popup-data">' + popupBodyHtml + '</div>';

    tile.addEventListener('mouseenter', function () {
      clearHidePopupTimer();
      if (!isTouchPrimary && state.view === 'compact') positionPopup(tile);
    });
    tile.addEventListener('mouseleave', function () {
      if (!isTouchPrimary && state.view === 'compact') scheduleHidePopup(tile);
    });

    tile.addEventListener('click', function () {
      if (state.view === 'compact' && isTouchPrimary) {
        if (!tile.classList.contains('chess-popup-open')) {
          closeAllPopups();
          positionPopup(tile);
          tile.classList.add('chess-popup-open');
          return;
        }
      }
      if (u.s === 'free') {
        window.location.href = tile.getAttribute('data-href');
      }
    });
    tile.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        tile.click();
      }
    });

    return tile;
  }

  /* ---------- строка списка ---------- */
  function renderListRow(u) {
    var row = document.createElement('div');
    row.className = 'chess-list-row';
    row.setAttribute('data-status', u.s);
    row.setAttribute('data-badge', u.b);

    var statusLabel = u.s === 'free' ? 'Свободна' : 'Продано';
    var priceLabel = u.s === 'free' ? fmtPrice(u.p) : 'Продано';

    var head = document.createElement('button');
    head.type = 'button';
    head.className = 'chess-list-head';
    head.innerHTML =
      '<span class="chess-list-badge">' + u.b + '</span>' +
      '<span class="chess-list-num">№' + u.n + '</span>' +
      '<span class="chess-list-floor">' + u.f + ' этаж</span>' +
      '<span class="chess-list-area">' + u.a + ' м²</span>' +
      '<span class="chess-list-price">' + priceLabel + '</span>' +
      '<span class="chess-list-status">' + statusLabel + '</span>' +
      '<svg class="chess-list-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

    var body = document.createElement('div');
    body.className = 'chess-list-body';
    var detailsHtml = '<div class="chess-list-details">' +
      '<div class="chess-list-detail"><span class="chess-list-detail-label">Тип</span><span class="chess-list-detail-value">' + u.l + '</span></div>' +
      '<div class="chess-list-detail"><span class="chess-list-detail-label">Площадь</span><span class="chess-list-detail-value">' + u.a + ' м²</span></div>';
    if (u.s === 'free') {
      detailsHtml += '<div class="chess-list-detail"><span class="chess-list-detail-label">Цена за м²</span><span class="chess-list-detail-value">' + fmtPricePerM2(u.m) + '</span></div>';
    }
    detailsHtml += '</div>';
    if (u.s === 'free') {
      detailsHtml += '<a class="chess-list-link" href="' + unitHref(u) + '">Смотреть карточку квартиры &rarr;</a>';
    }
    body.innerHTML = detailsHtml;

    head.addEventListener('click', function () {
      row.classList.toggle('open');
    });

    row.appendChild(head);
    row.appendChild(body);
    return row;
  }

  /* ---------- панель подъезда ---------- */
  function renderEntrancePanel(ent) {
    var panel = document.createElement('div');
    panel.className = 'chess-entrance-panel';
    panel.setAttribute('data-entrance', ent.e);
    if (ent.e !== state.entrance) panel.classList.add('chess-hidden');

    var tilesView = document.createElement('div');
    tilesView.className = 'chess-tiles-view';

    var body = document.createElement('div');
    body.className = 'chess-entrance-body';
    var numsCol = document.createElement('div');
    numsCol.className = 'chess-floor-nums';
    var scrollWrap = document.createElement('div');
    scrollWrap.className = 'chess-scroll-wrap';
    var rowsWrap = document.createElement('div');
    rowsWrap.className = 'chess-floor-rows';

    ent.floors.forEach(function (fl) {
      var numEl = document.createElement('div');
      numEl.className = 'chess-floor-num';
      numEl.textContent = fl.f;
      numsCol.appendChild(numEl);

      var row = document.createElement('div');
      row.className = 'chess-floor-row';
      fl.u.forEach(function (u) { row.appendChild(renderTile(u)); });
      rowsWrap.appendChild(row);
    });

    scrollWrap.appendChild(rowsWrap);
    body.appendChild(numsCol);
    body.appendChild(scrollWrap);
    tilesView.appendChild(body);

    var listView = document.createElement('div');
    listView.className = 'chess-list-view chess-list';
    listView.classList.add('chess-hidden');
    ent.floors.forEach(function (fl) {
      fl.u.forEach(function (u) { listView.appendChild(renderListRow(u)); });
    });

    panel.appendChild(tilesView);
    panel.appendChild(listView);
    return panel;
  }

  /* ---------- закрытие попапов вне плитки (для тача) ---------- */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.chess-tile') && !popupEl.contains(e.target)) closeAllPopups();
  });

  /* ---------- подсказка о горизонтальной прокрутке (затемнение справа) ---------- */
  function updateScrollHints() {
    Array.prototype.forEach.call(boardEl.querySelectorAll('.chess-scroll-wrap'), function (el) {
      el.classList.toggle('chess-is-scrollable', el.scrollWidth > el.clientWidth + 2);
    });
  }
  window.addEventListener('resize', updateScrollHints);

  /* ---------- инициализация ---------- */
  function init() {
    renderSummary();
    renderRoomFilter();
    renderEntranceSwitch();
    initViewSwitch();
    dataset.entrances.forEach(function (ent) {
      boardEl.appendChild(renderEntrancePanel(ent));
    });
    applyRoomFilter();
    updateScrollHints();
  }

  init();
})();
