/* =========================================================
   Romex Development — слой отправки форм (заглушка API)
   ---------------------------------------------------------
   Реального бэкенда у прототипа пока нет, поэтому вызов идёт
   через fetch на статический json — это позволяет держать
   настоящий сетевой запрос (с задержкой, ошибками сети и т.д.),
   а когда появится боевой эндпоинт — достаточно поменять
   ROMEX_API_ENDPOINT ниже на реальный URL, интерфейс submitForm()
   менять не придётся.
   ========================================================= */
(function (window) {
  'use strict';

  var ROMEX_API_ENDPOINT = 'assets/mock-success.json';
  var MIN_DELAY = 600;   // имитация сетевой задержки, мс
  var MAX_DELAY = 1100;

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /**
   * Отправляет данные лид-формы.
   * @param {Object} payload — произвольные поля формы (имя, телефон и т.п.)
   * @returns {Promise<Object>} резолвится, если сервер вернул {success:true}
   */
  function submitForm(payload) {
    var delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    return wait(delay).then(function () {
      return fetch(ROMEX_API_ENDPOINT, {
        method: 'GET', // ЗАГЛУШКА: реальный бэкенд должен принимать POST с payload
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
    }).then(function (res) {
      if (!res.ok) throw new Error('Сервер вернул ошибку ' + res.status);
      return res.json();
    }).then(function (data) {
      if (!data || data.success !== true) throw new Error('Сервер не подтвердил приём заявки');
      if (window.console && window.console.info) {
        window.console.info('[Romex API] заявка отправлена (заглушка):', payload);
      }
      return data;
    });
  }

  window.RomexAPI = { submitForm: submitForm };
})(window);
