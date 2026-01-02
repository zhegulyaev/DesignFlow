/**
 * DesignFlow Plus: Zen Mode (PRO Integration)
 * Внедрение в UI_PREFS и SVG иконки
 */

(function() {
    'use strict';

    // Ключи из твоего app.js
    const K = 'grok_design_v5';
    const UI_PREFS_KEY = 'designflow_ui_prefs';

    // Иконки SVG (Глаз открыт / Глаз перечеркнут)
    const ICON_OFF = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const ICON_ON = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

    // Функция получения статуса из памяти или хранилища
    function isZenActive() {
        if (window.UI_PREFS && typeof window.UI_PREFS.zenMode !== 'undefined') {
            return window.UI_PREFS.zenMode;
        }
        try {
            const prefs = JSON.parse(localStorage.getItem(UI_PREFS_KEY));
            return prefs && prefs.zenMode === true;
        } catch(e) { return false; }
    }

    // Принудительное сохранение в структуру app.js
    function saveStatus(active) {
        // 1. Обновляем глобальную переменную сайта
        if (window.UI_PREFS) {
            window.UI_PREFS.zenMode = active;
        }

        // 2. Пишем в localStorage для обоих ключей
        try {
            const prefs = JSON.parse(localStorage.getItem(UI_PREFS_KEY)) || {};
            prefs.zenMode = active;
            localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));

            const mainData = JSON.parse(localStorage.getItem(K));
            if (mainData) {
                if (!mainData.uiPrefs) mainData.uiPrefs = {};
                mainData.uiPrefs.zenMode = active;
                localStorage.setItem(K, JSON.stringify(mainData));
            }

            // 3. Вызываем родной метод сохранения сайта (если он доступен)
            if (typeof window.save === 'function') window.save();
        } catch(e) {}
    }

    // Создаем стили (без теней)
    const style = document.createElement('style');
    style.id = 'zen-pro-logic';
    document.documentElement.appendChild(style);

    function applyStyles(active) {
        if (active) {
            style.textContent = `
                #analytics-dashboard, .stats-full, header, footer, .welcome-block,
                #efficiency-card, #record-banner, #reputation-card, #top-clients-card, .side-stack,
                [id^="tab-"]:not(#tab-active) { display: none !important; }
                .main-container { max-width: 98% !important; width: 98% !important; margin: 0 auto !important; padding-top: 20px !important; }
                #zen-btn { background: var(--green) !important; color: white !important; border-color: var(--green) !important; }
            `;
            // Переключение вкладок через движок сайта
            if (typeof window.switchTab === 'function') {
                const cur = document.querySelector('.tab.active');
                if (cur && cur.id !== 'tab-active') window.switchTab('active');
            }
        } else {
            style.textContent = '';
        }
    }

    function toggle() {
        const active = !isZenActive();
        saveStatus(active);
        applyStyles(active);
        updateBtn(active);
    }

    function updateBtn(active) {
        const btn = document.getElementById('zen-btn');
        if (btn) {
            btn.innerHTML = active ? ICON_ON : ICON_OFF;
        }
    }

    function renderBtn() {
        if (document.getElementById('zen-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'zen-btn';
        btn.style = `
            position: fixed; bottom: 25px; left: 25px; z-index: 999999;
            width: 46px; height: 46px; border-radius: 50%;
            border: 1px solid var(--border); background: var(--card); color: var(--accent);
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: all 0.2s ease; box-shadow: none; outline: none;
        `;
        document.body.appendChild(btn);
        btn.onclick = toggle;
        updateBtn(isZenActive());
    }

    // Интервал для проверки (защита от перерисовки app.js)
    setInterval(() => {
        const active = isZenActive();
        renderBtn();
        applyStyles(active);
        updateBtn(active);
    }, 1000);

    // Хоткей F
    window.addEventListener('keydown', e => {
        if (e.code === 'KeyF' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault(); toggle();
        }
    }, true);

    window.addEventListener('load', renderBtn);
})();
