/**
 * DesignFlow Plus: Zen Mode (Persistence Edition)
 * Фикс сброса при обновлении + уменьшенная иконка на подложке
 */

(function() {
    'use strict';

    const K = 'grok_design_v5';
    const PREFS_KEY = 'designflow_ui_prefs';

    // SVG Иконка (уменьшена, 20px)
    const ICON_EYE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

    // 1. ПРИНУДИТЕЛЬНОЕ ЧТЕНИЕ СТАТУСА (игнорируя сбои app.js)
    function getStoredZen() {
        return localStorage.getItem('force_zen_state') === 'true';
    }

    // 2. СТИЛИ (активация через класс на HTML)
    const zenStyle = document.createElement('style');
    zenStyle.id = 'zen-permanent-v3';
    document.documentElement.appendChild(zenStyle);

    function applyZenUI(active) {
        if (active) {
            document.documentElement.classList.add('zen-mode-active');
            zenStyle.textContent = `
                html.zen-mode-active #analytics-dashboard, 
                html.zen-mode-active .stats-full, 
                html.zen-mode-active header, 
                html.zen-mode-active footer, 
                html.zen-mode-active .welcome-block,
                html.zen-mode-active .stats-grid,
                html.zen-mode-active .side-stack,
                html.zen-mode-active [id^="tab-"]:not(#tab-active):not(#tab-waiting) { 
                    display: none !important; 
                }
                html.zen-mode-active.zen-hide-waiting #tab-waiting {
                    display: none !important;
                }
                html.zen-mode-active.zen-show-archive #tab-archive {
                    display: flex !important;
                }
                html.zen-mode-active .main-container { 
                    max-width: 96% !important; width: 96% !important; 
                    margin: 0 auto !important; padding-top: 30px !important; 
                }
                #zen-btn.active-zen .zen-icon-bg { background: var(--green) !important; color: white !important; }
            `;
        } else {
            document.documentElement.classList.remove('zen-mode-active');
            zenStyle.textContent = '';
        }
        if (typeof window.updateZenTabVisibility === 'function') {
            window.updateZenTabVisibility();
        }
    }

    // 3. СОХРАНЕНИЕ (с защитой от перезаписи)
    function setZenState(active) {
        localStorage.setItem('force_zen_state', active); // Наш независимый ключ
        
        // Пытаемся синхронизироваться с app.js
        try {
            if (window.UI_PREFS) window.UI_PREFS.zenMode = active;
            let prefs = JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
            prefs.zenMode = active;
            localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
            if (typeof window.save === 'function') window.save();
        } catch(e) {}
        
        applyZenUI(active);
    }

    // 4. КНОПКА С ПОДЛОЖКОЙ
    function renderBtn() {
        if (document.getElementById('zen-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'zen-btn';
        btn.style = `
            position: fixed; bottom: 25px; left: 25px; z-index: 1000000;
            width: 50px; height: 50px; border-radius: 50%;
            border: 1px solid var(--border); background: var(--card);
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: 0.3s; padding: 0; outline: none;
        `;

        // Внутренняя подложка
        btn.innerHTML = `
            <div class="zen-icon-bg" style="
                width: 36px; height: 36px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                transition: 0.2s; color: var(--accent); background: var(--button-bg);
            ">${ICON_EYE}</div>
        `;

        document.body.appendChild(btn);
        btn.onclick = () => {
            const newState = !getStoredZen();
            setZenState(newState);
            btn.classList.toggle('active-zen', newState);
        };

        if (getStoredZen()) btn.classList.add('active-zen');
    }

    // 5. "СТОРОЖ" (проверяет состояние каждые 500мс)
    // Это решит проблему, если app.js сбросит класс при загрузке
    setInterval(() => {
        const shouldBeActive = getStoredZen();
        const isCurrentlyActive = document.documentElement.classList.contains('zen-mode-active');
        
        if (shouldBeActive !== isCurrentlyActive) {
            applyZenUI(shouldBeActive);
        }
        renderBtn();
    }, 500);

    // Запуск мгновенно
    applyZenUI(getStoredZen());
})();
