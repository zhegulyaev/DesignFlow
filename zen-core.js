/**
 * DesignFlow Plus: Pro Zen Mode
 * С иконками Font Awesome и плавной анимацией
 */

(function() {
    'use strict';

    const MAIN_KEY = 'grok_design_v5';
    const PREFS_KEY = 'designflow_ui_prefs';

    // 1. Получаем статус
    function getZenStatus() {
        try {
            const prefs = JSON.parse(localStorage.getItem(PREFS_KEY));
            return prefs && prefs.zenMode === true;
        } catch(e) { return false; }
    }

    // 2. Сохраняем статус
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

    // 3. Стили с анимацией
    const styleZen = document.createElement('style');
    styleZen.id = 'zen-pro-styles';
    document.documentElement.appendChild(styleZen);

    function applyZen(isActive) {
        if (isActive) {
            styleZen.textContent = `
                /* Плавное скрытие */
                #analytics-dashboard, .stats-full, header, footer, .welcome-block,
                #efficiency-card, #record-banner, #reputation-card, #top-clients-card, .side-stack,
                [id^="tab-"]:not(#tab-active) {
                    opacity: 0;
                    pointer-events: none;
                    display: none !important;
                    transition: opacity 0.3s ease;
                }
                
                .main-container {
                    max-width: 98% !important;
                    width: 98% !important;
                    margin: 0 auto !important;
                    padding-top: 20px !important;
                    animation: slideUp 0.4s ease forwards;
                }

                #zen-btn {
                    background: var(--green) !important;
                    color: white !important;
                    border-color: var(--green) !important;
                    transform: scale(1.1);
                    box-shadow: 0 0 20px rgba(46, 160, 67, 0.4);
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
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
        const icon = document.querySelector('#zen-btn i');
        if (icon) {
            // Меняем иконку: глаз или зачеркнутый глаз
            icon.className = isActive ? 'fa-solid fa-eye-low-vision' : 'fa-solid fa-eye';
        }
    }

    function injectButton() {
        if (document.getElementById('zen-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'zen-btn';
        // Вставляем иконку Font Awesome
        btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
        
        btn.style = `
            position: fixed; bottom: 25px; left: 25px; z-index: 999999;
            width: 48px; height: 48px; border-radius: 50%;
            border: 1px solid var(--border);
            background: var(--card); color: var(--accent);
            cursor: pointer; font-size: 18px;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        `;

        document.body.appendChild(btn);
        btn.onclick = toggleZen;
        
        updateIcon(getZenStatus());
    }

    // Цикл проверки
    setInterval(() => {
        injectButton();
        applyZen(getZenStatus());
    }, 2000);

    // Хоткей F
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyF' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            toggleZen();
        }
    }, true);

    window.addEventListener('load', () => {
        injectButton();
        applyZen(getZenStatus());
    });
})();
