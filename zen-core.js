/**
 * DesignFlow Plus: Zen Mode (Stable Edition)
 * Фикс мигания через CSS Injection + Увеличенная иконка
 */

(function() {
    'use strict';

    const K = 'grok_design_v5';
    const UI_PREFS_KEY = 'designflow_ui_prefs';

    // SVG Иконка Глаза (увеличен масштаб stroke и размеры)
    const ICON_EYE = `
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

    // Внедряем CSS в HEAD сразу, чтобы он работал мгновенно
    const style = document.createElement('style');
    style.id = 'zen-mode-logic-css';
    document.head.appendChild(style);

    function updateStyles(active) {
        if (active) {
            document.documentElement.classList.add('zen-mode-active');
            // !important гарантирует, что app.js не сможет вернуть видимость через style=""
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
        } else {
            document.documentElement.classList.remove('zen-mode-active');
            style.textContent = '';
        }
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

    function toggle() {
        const active = !isZenActive();
        saveStatus(active);
        updateStyles(active);
        const btn = document.getElementById('zen-btn');
        if (btn) btn.classList.toggle('active-zen', active);
    }

    function renderBtn() {
        let btn = document.getElementById('zen-btn');
        if (btn) return;
        
        btn = document.createElement('button');
        btn.id = 'zen-btn';
        btn.innerHTML = ICON_EYE;
        btn.style = `
            position: fixed; bottom: 25px; left: 25px; z-index: 9999999;
            width: 52px; height: 52px; border-radius: 50%;
            border: 1px solid var(--border); background: var(--card); color: var(--accent);
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: all 0.2s ease; outline: none; padding: 0;
        `;
        document.body.appendChild(btn);
        btn.onclick = toggle;
        
        if (isZenActive()) {
            btn.classList.add('active-zen');
            updateStyles(true);
        }
    }

    // Запускаем проверку чаще, чтобы кнопка не пропадала
    setInterval(renderBtn, 1000);

    window.addEventListener('keydown', e => {
        if (e.code === 'KeyF' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault(); toggle();
        }
    }, true);

    // Инициализация при старте
    renderBtn();
    updateStyles(isZenActive());

})();
