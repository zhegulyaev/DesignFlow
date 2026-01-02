/**
 * DesignFlow Plus: Zen Mode (Lotus Icon Edition)
 * Чистый SVG, без теней, полная интеграция
 */

(function() {
    'use strict';

    const K = 'grok_design_v5';
    const UI_PREFS_KEY = 'designflow_ui_prefs';

    // SVG Иконка Лотоса (Дзен)
    const ICON_LOTUS = `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
        <path d="M12 22s8-4.5 8-11.8c0-2-1-3.8-2.5-4.8"/>
        <path d="M12 22s-8-4.5-8-11.8c0-2 1-3.8 2.5-4.8"/>
        <circle cx="12" cy="10" r="2"/>
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

    const style = document.createElement('style');
    style.id = 'zen-lotus-logic';
    document.documentElement.appendChild(style);

    function applyStyles(active) {
        if (active) {
            style.textContent = `
                #analytics-dashboard, .stats-full, header, footer, .welcome-block,
                #efficiency-card, #record-banner, #reputation-card, #top-clients-card, .side-stack,
                [id^="tab-"]:not(#tab-active) { display: none !important; }
                .main-container { max-width: 98% !important; width: 98% !important; margin: 0 auto !important; padding-top: 20px !important; }
                #zen-btn { 
                    background: var(--green) !important; 
                    color: white !important; 
                    border-color: var(--green) !important;
                    transform: rotate(360deg);
                }
            `;
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
        const btn = document.getElementById('zen-btn');
        if (btn) btn.style.transform = active ? 'rotate(360deg)' : 'rotate(0deg)';
    }

    function renderBtn() {
        if (document.getElementById('zen-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'zen-btn';
        btn.innerHTML = ICON_LOTUS;
        btn.style = `
            position: fixed; bottom: 25px; left: 25px; z-index: 999999;
            width: 48px; height: 48px; border-radius: 50%;
            border: 1px solid var(--border); background: var(--card); color: var(--accent);
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); 
            box-shadow: none; outline: none;
        `;
        document.body.appendChild(btn);
        btn.onclick = toggle;
        
        if (isZenActive()) btn.style.transform = 'rotate(360deg)';
    }

    // Постоянный мониторинг состояния
    setInterval(() => {
        const active = isZenActive();
        renderBtn();
        applyStyles(active);
    }, 1000);

    // Хоткей F
    window.addEventListener('keydown', e => {
        if (e.code === 'KeyF' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault(); toggle();
        }
    }, true);

    window.addEventListener('load', renderBtn);
})();
