/**
 * DesignFlow Plus: Iron Zen Mode
 * Самый надежный метод сохранения
 */

(function() {
    'use strict';

    const KEY = 'zenMode_status';
    
    // Проверка сохраненного статуса (с доп. проверкой на тип данных)
    let isZen = localStorage.getItem(KEY) === 'true';

    // Создаем стиль и добавляем в самый низ head, чтобы он имел приоритет
    const styleZen = document.createElement('style');
    styleZen.id = 'zen-iron-logic';
    document.documentElement.appendChild(styleZen); 

    function applyZenStyles() {
        if (isZen) {
            styleZen.textContent = `
                #analytics-dashboard, .stats-full, header, footer, .welcome-block,
                #efficiency-card, #record-banner, #reputation-card, #top-clients-card, .side-stack,
                #tab-all, #tab-potential, #tab-paused, #tab-archive, #tab-trash {
                    display: none !important;
                }
                .main-container {
                    max-width: 98% !important;
                    width: 98% !important;
                    margin: 0 auto !important;
                    padding-top: 20px !important;
                }
                #zen-btn { 
                    background: #2ea043 !important; 
                    color: white !important; 
                    border-color: #2ea043 !important;
                    box-shadow: 0 0 12px rgba(46, 160, 67, 0.5);
                }
            `;
            // Переключение вкладок
            const archiveTab = document.getElementById('tab-archive');
            if (archiveTab && archiveTab.classList.contains('active')) {
                if (typeof window.switchTab === 'function') window.switchTab('active');
            }
        } else {
            styleZen.textContent = '';
        }
    }

    function toggleZen() {
        isZen = !isZen;
        localStorage.setItem(KEY, isZen);
        applyZenStyles();
        console.log("Zen Mode saved:", isZen);
    }

    function injectButton() {
        if (document.getElementById('zen-btn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'zen-btn';
        btn.innerHTML = '🧘';
        btn.style = `
            position: fixed; bottom: 20px; left: 20px; z-index: 2147483647;
            width: 44px; height: 44px; border-radius: 10px; border: 1px solid #30363d;
            background: #21262d; color: #c9d1d9; cursor: pointer; font-size: 20px;
            display: flex; align-items: center; justify-content: center;
        `;
        document.body.appendChild(btn);
        btn.onclick = toggleZen;
    }

    // 1. Применяем стили немедленно (еще до загрузки body)
    applyZenStyles();

    // 2. Повторяем применение несколько раз после загрузки (борьба с app.js)
    let checks = 0;
    const interval = setInterval(() => {
        applyZenStyles();
        injectButton();
        checks++;
        if (checks > 10) clearInterval(interval); // Проверяем 5 секунд
    }, 500);

    // 3. Горячая клавиша
    window.addEventListener('keydown', (e) => {
        const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
        if (e.code === 'KeyF' && !isInput) {
            e.preventDefault();
            toggleZen();
        }
    }, true);

    // 4. На всякий случай слушаем событие загрузки
    window.addEventListener('load', () => {
        applyZenStyles();
        injectButton();
    });

})();
