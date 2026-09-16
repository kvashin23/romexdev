/* ==========================================================
   Каталог квартир (flats.html) — фильтр по объекту и литеру.
   Работает только на flats.html (проверяем наличие #flatsGrid).
   Позволяет прийти по ссылке ?liter=N (с генплана/шахматки) и
   увидеть уже отфильтрованный каталог с выбранным литером.
   ========================================================== */
(function () {
  'use strict';

  var grid = document.getElementById('flatsGrid');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.flat-card'));
  var noteEl = document.getElementById('flatsFilterNote');

  var objectSelect = document.getElementById('objectSelect');
  var objectList = document.getElementById('objectSelectList');
  var literSelect = document.getElementById('literSelect');
  var literList = document.getElementById('literSelectList');
  var literLabel = literSelect ? literSelect.querySelector('.custom-select-label') : null;

  var roomButtons = Array.prototype.slice.call(document.querySelectorAll('#flatsRoomToggle button'));
  var areaInput = document.getElementById('flatsAreaInput');
  var showMoreBtn = document.querySelector('.show-more-wrap .btn-show-more');

  var OBJECT_LITERS = {
    all: [],
    neo: Array.from({ length: 22 }, function (_, i) { return String(i + 1); }),
    anapa: ['1']
  };

  var PAGE_SIZE = 12;
  var state = { object: 'all', liter: 'any', rooms: 'all', areaMin: null, areaMax: null, visibleCount: PAGE_SIZE };

  function parseAreaRange(value) {
    var nums = (value || '').match(/\d+/g);
    if (!nums || !nums.length) return { min: null, max: null };
    if (nums.length === 1) {
      var n = parseInt(nums[0], 10);
      return { min: n, max: n };
    }
    return { min: parseInt(nums[0], 10), max: parseInt(nums[1], 10) };
  }

  function selectOption(listEl, value) {
    if (!listEl) return null;
    var match = null;
    Array.prototype.forEach.call(listEl.querySelectorAll('.custom-select-option'), function (opt) {
      var isMatch = opt.getAttribute('data-value') === value;
      opt.classList.toggle('selected', isMatch);
      if (isMatch) match = opt;
    });
    return match;
  }

  function buildLiterOptions(objectValue, presetValue) {
    if (!literList) return;
    var liters = OBJECT_LITERS[objectValue] || [];
    var html = '<div class="custom-select-option" data-value="any">Любой</div>';
    liters.forEach(function (n) {
      html += '<div class="custom-select-option" data-value="' + n + '">Литер ' + n + '</div>';
    });
    literList.innerHTML = html;
    var toSelect = (presetValue && (presetValue === 'any' || liters.indexOf(presetValue) !== -1)) ? presetValue : 'any';
    var opt = selectOption(literList, toSelect);
    state.liter = toSelect;
    if (literLabel) literLabel.textContent = opt ? opt.textContent : 'Любой';
  }

  function applyFilters(resetPaging) {
    if (resetPaging !== false) state.visibleCount = PAGE_SIZE;
    var wantObject = state.object;
    var wantLiter = state.liter;
    var wantRooms = state.rooms;
    var wantAreaMin = state.areaMin;
    var wantAreaMax = state.areaMax;

    function cardArea(c) {
      var v = parseFloat(c.getAttribute('data-area'));
      return isNaN(v) ? null : v;
    }

    function matches(card, use) {
      var objOk = wantObject === 'all' || card.getAttribute('data-object') === wantObject;
      var literOk = !use.liter || wantLiter === 'any' || card.getAttribute('data-liter') === wantLiter;
      var roomsOk = !use.rooms || wantRooms === 'all' || card.getAttribute('data-rooms') === wantRooms;
      var area = cardArea(card);
      var areaOk = !use.area || (wantAreaMin == null && wantAreaMax == null) ||
        (area != null && area >= wantAreaMin && area <= wantAreaMax);
      return objOk && literOk && roomsOk && areaOk;
    }

    // От самого точного совпадения — к самому общему: сперва пробуем учесть
    // все выбранные параметры (литер, комнатность, площадь), и только если
    // подходящих лотов нет, постепенно ослабляем критерии.
    var tiers = [
      { liter: true, rooms: true, area: true },
      { liter: true, rooms: true, area: false },
      { liter: true, rooms: false, area: false },
      { liter: false, rooms: false, area: false }
    ];

    var shown = cards;
    var pickedIndex = tiers.length;
    for (var i = 0; i < tiers.length; i++) {
      var subset = cards.filter(function (c) { return matches(c, tiers[i]); });
      if (subset.length) {
        shown = subset;
        pickedIndex = i;
        break;
      }
    }

    cards.forEach(function (c) {
      c.classList.toggle('is-filtered-out', shown.indexOf(c) === -1);
    });

    /* ---------- пагинация «Показать ещё» (по 12 карточек внутри shown) ---------- */
    shown.forEach(function (c, i) {
      c.classList.toggle('is-paged-out', i >= state.visibleCount);
    });
    if (showMoreBtn) {
      if (shown.length > state.visibleCount) {
        showMoreBtn.style.display = '';
        showMoreBtn.textContent = 'Показать ещё';
      } else {
        showMoreBtn.style.display = 'none';
      }
    }

    var hasLiterFilter = wantLiter !== 'any';
    var hasParamsFilter = wantRooms !== 'all' || wantAreaMin != null || wantAreaMax != null;

    if (noteEl) {
      if (pickedIndex >= 3 && hasLiterFilter) {
        noteEl.textContent = 'Свободных лотов по данному литеру в каталоге сейчас нет — показаны другие доступные квартиры.';
        noteEl.style.display = 'block';
      } else if (pickedIndex >= 1 && pickedIndex <= 2 && hasParamsFilter) {
        noteEl.textContent = 'Квартир с такими параметрами в каталоге сейчас нет — показаны другие доступные варианты.';
        noteEl.style.display = 'block';
      } else if (pickedIndex >= 3 && !hasLiterFilter && hasParamsFilter) {
        noteEl.textContent = 'Квартир с такими параметрами в каталоге сейчас нет — показаны другие доступные варианты.';
        noteEl.style.display = 'block';
      } else {
        noteEl.style.display = 'none';
      }
    }
  }

  if (objectList) {
    objectList.addEventListener('click', function (e) {
      var opt = e.target.closest('.custom-select-option');
      if (!opt) return;
      state.object = opt.getAttribute('data-value');
      buildLiterOptions(state.object, 'any');
      applyFilters();
    });
  }

  if (literList) {
    literList.addEventListener('click', function (e) {
      var opt = e.target.closest('.custom-select-option');
      if (!opt) return;
      selectOption(literList, opt.getAttribute('data-value'));
      state.liter = opt.getAttribute('data-value');
      if (literLabel) literLabel.textContent = opt.textContent;
      if (literSelect) literSelect.classList.remove('open');
      applyFilters();
    });
  }

  roomButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.rooms = btn.getAttribute('data-rooms') || 'all';
      applyFilters();
    });
  });

  var submitBtn = document.getElementById('flatsSearchSubmit');
  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      if (areaInput) {
        var range = parseAreaRange(areaInput.value);
        state.areaMin = range.min;
        state.areaMax = range.max;
      }
      applyFilters();
    });
  }

  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', function () {
      state.visibleCount += PAGE_SIZE;
      applyFilters(false);
    });
  }

  /* ---------- инициализация из query-параметров (?liter=N&object=neo) ---------- */
  var params = new URLSearchParams(window.location.search);
  var literParam = params.get('liter');
  var objectParam = params.get('object') || (literParam ? 'neo' : 'all');

  state.object = OBJECT_LITERS.hasOwnProperty(objectParam) ? objectParam : 'all';
  selectOption(objectList, state.object);
  var objLabel = objectSelect ? objectSelect.querySelector('.custom-select-label') : null;
  if (objLabel) {
    var objOpt = objectList && objectList.querySelector('.custom-select-option[data-value="' + state.object + '"]');
    if (objOpt) objLabel.textContent = objOpt.textContent;
  }
  buildLiterOptions(state.object, literParam || 'any');
  applyFilters();
})();
