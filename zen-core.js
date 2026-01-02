/**
 * DesignFlow Plus: Zen Mode (Visual Eye Edition)
 * Исправлена проблема мигания блоков + иконка Глаза
 */

(function() {
    'use strict';

    const K = 'grok_design_v5';
    const UI_PREFS_KEY = 'designflow_ui_prefs';

    // SVG Иконка Глаза
    const ICON_EYE = `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>`;

    function isZenActive() {
        if (window.UI_PREFS && typeof window.UI_PREFS.zenMode !== 'undefined') {
            return window.UI_PREFS.zenMode;
        }
        try {
            const prefs = JSON.parse(localStorage.getItem(UI_PREFS_KEY));
            return prefs && prefs.zenMode === true;
        } catch(e) { return false; }
    }

    function saveStatus(active) {
        if (window.UI_PREFS) window.UI_PREFS.zenMode = active;
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
            if (typeof window.save === 'function') window.save();
        } catch(e) {}
    }

    // 1. Создаем постоянные CSS правила
    const style = document.createElement('style');
    style.id = 'zen-mode-permanent-css';
    // Эти правила будут работать только когда у тега <html> есть класс .zen-mode-active
    style.textContent = `
        html.zen-mode-active #analytics-dashboard, 
        html.zen-mode-active .stats-full, 
        html.zen-mode-active header, 
        html.zen-mode-active footer, 
        html.zen-mode-active .welcome-block,
        html.zen-mode-active #efficiency-card, 
        html.zen-mode-active #record-banner, 
        html.zen-mode-active #reputation-card, 
        html.zen-mode-active #top-clients-card, 
        html.zen-mode-active .side-stack,
        html.zen-mode-active [id^="tab-"]:not(#tab-active) { 
            display: none !important; 
        }

        html.zen-mode-active .main-container { 
            max-width: 98% !important; 
            width: 98% !important; 
            margin: 0 auto !important; 
            padding-top: 20px !important; 
        }

        #zen-btn.active-zen {
            background: var(--green) !important;
            color: white !important;
            border-color: var(--green) !important;
        }
    `;
    document.documentElement.appendChild(style);

    function updateUI(active) {
        // Просто переключаем класс на самом верхнем уровне страницы
        if (active) {
            document.documentElement.classList.add('zen-mode-active');
            document.getElementById('zen-btn')?.classList.add('active-zen');
        } else {
            document.documentElement.classList.remove('zen-mode-active');
            document.getElementById('zen-btn')?.classList.remove('active-zen');
        }

        // Принудительное переключение на вкладку "В работе" если мы в дзене
        if (active && typeof window.switchTab === 'function') {
            const cur = document.querySelector('.tab.active');
            if (cur && cur.id !== 'tab-active') window.switchTab('active');
        }
    }

    function toggle() {
        const active = !isZenActive();
        saveStatus(active);
        updateUI(active);
    }

    function renderBtn() {
        if (document.getElementById('zen-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'zen-btn';
        btn.innerHTML = ICON_EYE;
        btn.style = `
            position: fixed; bottom: 25px; left: 25px; z-index: 999999;
            width: 48px; height: 48px; border-radius: 50%;
            border: 1px solid var(--border); background: var(--card); color: var(--accent);
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: all 0.3s ease; box-shadow: none; outline: none;
        `;
        document.body.appendChild(btn);
        btn.onclick = toggle;
        
        // Сразу синхронизируем состояние
        updateUI(isZenActive());
    }

    // Один раз запускаем мониторинг кнопки (если вдруг app.js её удалит)
    setInterval(renderBtn, 2000);

    // Хоткей F
    window.addEventListener('keydown', e => {
        if (e.code === 'KeyF' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault(); toggle();
        }
    }, true);

    // Старт
    if (document.readyState === 'complete') renderBtn();
    else window.addEventListener('load', renderBtn);

})();
