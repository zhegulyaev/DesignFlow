/**
 * DesignFlow Plus: Ultimate Zen Mode
 * С защитой от перехвата и MutationObserver
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'zenModeActive';
    let isZen = localStorage.getItem(STORAGE_KEY) === 'true';

    // 1. Создаем стиль один раз
    const styleZen = document.createElement('style');
    styleZen.id = 'zen-mode-permanent-css';
    document.head.appendChild(styleZen);

    function getZenStyles() {
        return `
            #analytics-dashboard, .stats-full, header, footer, .welcome-block,
            #efficiency-card, #record-banner, #reputation-card, #top-clients-card, .side-stack,
            #tab-all, #tab-potential, #tab-paused, #tab-archive, #tab-trash {
                display: none !important;
            }
            .main-container {
                max-width: 98% !important;
                width: 98% !important;
                margin: 0 auto !important;
                padding-top: 15px !important;
            }
            #zen-btn { 
                background: var(--green) !important; 
                color: white !important; 
                border-color: var(--green) !important;
                box-shadow: 0 0 10px rgba(46, 160, 67, 0.4);
            }
        `;
    }

    function updateUI() {
        if (isZen) {
            styleZen.innerHTML = getZenStyles();
            // Проверка вкладок (переключаем, если в Архиве)
            const activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.id === 'tab-archive') {
                if (typeof window.switchTab === 'function') window.switchTab('active');
            }
        } else {
            styleZen.innerHTML = '';
        }
    }

    // 2. Наблюдатель: если app.js изменит DOM, мы вернем Дзен на место
    const observer = new MutationObserver(() => {
        if (isZen && styleZen.innerHTML === '') {
            updateUI();
        }
    });

    function init() {
        // Создаем кнопку
        if (!document.getElementById('zen-btn')) {
            const btn = document.createElement('button');
            btn.id = 'zen-btn';
            btn.innerHTML = '🧘';
            btn.style = `
                position: fixed; bottom: 20px; left: 20px; z-index: 999999;
                width: 44px; height: 44px; border-radius: 10px; border: 1px solid var(--border);
                background: var(--card); color: var(--text); cursor: pointer; font-size: 20px;
                display: flex; align-items: center; justify-content: center; transition: 0.3s;
            `;
            document.body.appendChild(btn);

            btn.onclick = () => {
                isZen = !isZen;
                localStorage.setItem(STORAGE_KEY, isZen);
                updateUI();
            };
        }

        updateUI();
        
        // Запускаем слежку за изменениями в head и body
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Слушаем горячую клавишу F
    window.addEventListener('keydown', (e) => {
        const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
        if (e.code === 'KeyF' && !isInput) {
            e.preventDefault();
            const btn = document.getElementById('zen-btn');
            if (btn) btn.click();
        }
    }, true);

    // Запуск
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();
