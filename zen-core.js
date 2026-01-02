/**
 * DesignFlow Plus: Zen Mode (Clean SVG Edition)
 * Без теней, со встроенной иконкой и плавной логикой
 */

(function() {
    'use strict';

    const MAIN_KEY = 'grok_design_v5';
    const PREFS_KEY = 'designflow_ui_prefs';

    // SVG иконки (Глаз открыт / Глаз закрыт)
    const ICON_EYE = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const ICON_ZEN = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    function getZenStatus() {
        try {
            const prefs = JSON.parse(localStorage.getItem(PREFS_KEY));
            return prefs && prefs.zenMode === true;
        } catch(e) { return false; }
    }

    function saveZenStatus(isActive) {
        try {
            let prefs = JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
            prefs.zenMode = isActive;
            localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));

            let mainData = JSON.parse(localStorage.getItem(MAIN_KEY));
            if (mainData) {
                if (!mainData.uiPrefs) mainData.uiPrefs = {};
                mainData.uiPrefs.zenMode = isActive;
                localStorage.setItem(MAIN_KEY, JSON.stringify(mainData));
            }
        } catch(e) {}
    }

    const styleZen = document.createElement('style');
    styleZen.id = 'zen-clean-styles';
    document.documentElement.appendChild(styleZen);

    function applyZen(isActive) {
        if (isActive) {
            styleZen.textContent = `
                #analytics-dashboard, .stats-full, header, footer, .welcome-block,
                #efficiency-card, #record-banner, #reputation-card, #top-clients-card, .side-stack,
                [id^="tab-"]:not(#tab-active) {
                    display: none !important;
                }
                
                .main-container {
                    max-width: 98% !important;
                    width: 98% !important;
                    margin: 0 auto !important;
                    padding-top: 20px !important;
                    transition: all 0.3s ease;
                }

                #zen-btn {
                    background: var(--green) !important;
                    color: white !important;
                    border-color: var(--green) !important;
                }
            `;
            if (typeof window.switchTab === 'function') window.switchTab('active');
        } else {
            styleZen.textContent = '';
        }
    }

    function toggleZen() {
        const newState = !getZenStatus();
        saveZenStatus(newState);
        applyZen(newState);
        updateIcon(newState);
    }

    function updateIcon(isActive) {
        const btn = document.getElementById('zen-btn');
        if (btn) btn.innerHTML = isActive ? ICON_ZEN : ICON_EYE;
    }

    function injectButton() {
        if (document.getElementById('zen-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'zen-btn';
        
        btn.style = `
            position: fixed; bottom: 25px; left: 25px; z-index: 999999;
            width: 46px; height: 46px; border-radius: 50%;
            border: 1px solid var(--border);
            background: var(--card); color: var(--accent);
            cursor: pointer; 
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s ease-in-out;
            box-shadow: none;
            outline: none;
        `;

        document.body.appendChild(btn);
        btn.onclick = toggleZen;
        updateIcon(getZenStatus());
    }

    // Регулярная проверка (чтобы app.js не перетирал кнопку)
    setInterval(() => {
        injectButton();
        applyZen(getZenStatus());
    }, 1500);

    // Хоткей F
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyF' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            toggleZen();
        }
    }, true);

    // Старт
    if (document.readyState === 'complete') injectButton();
    else window.addEventListener('load', injectButton);
})();
