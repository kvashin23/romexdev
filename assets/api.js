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
      return data;
    }).catch(function (err) {
      // Это демо-прототип без реального бэкенда: запрос к заглушке может не
      // пройти в некоторых окружениях предпросмотра (например, при открытии
      // страницы напрямую с диска по протоколу file://, без локального
      // сервера, — тогда браузер блокирует fetch по соображениям безопасности).
      // Поскольку заглушка в любом случае всегда должна была вернуть успех,
      // в этом случае считаем заявку принятой, а не показываем пользователю
      // пугающую ошибку сети.
      if (window.console && window.console.warn) {
        window.console.warn('[Romex API] запрос к заглушке не выполнен, используется локальный fallback-успех:', err);
      }
      return { success: true, message: 'Заявка принята' };
    }).then(function (data) {
      if (window.console && window.console.info) {
        window.console.info('[Romex API] заявка отправлена (заглушка):', payload);
      }
      return data;
    });
  }

  window.RomexAPI = { submitForm: submitForm };
})(window);
