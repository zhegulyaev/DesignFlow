(function() {
    'use strict';

    // Используем максимально странное имя, которое app.js точно не тронет
    const ZEN_STORAGE_KEY = 'DEBUG_ZEN_MODE_999';
    
    // Функция получения статуса
    const getZenStatus = () => localStorage.getItem(ZEN_STORAGE_KEY) === 'true';

    // Создаем стиль
    const styleZen = document.createElement('style');
    styleZen.id = 'zen-force-styles';
    document.documentElement.appendChild(styleZen);

    function applyZen() {
        const isZen = getZenStatus();
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
                }
            `;
            // Если мы в Архиве - переключаем (switchTab должна быть глобальной)
            const activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.id === 'tab-archive') {
                if (typeof window.switchTab === 'function') window.switchTab('active');
            }
        } else {
            styleZen.textContent = '';
        }
    }

    function toggleZen() {
        const current = getZenStatus();
        localStorage.setItem(ZEN_STORAGE_KEY, !current);
        applyZen();
        console.log("Zen Status Switched to:", !current);
    }

    function injectButton() {
        if (document.getElementById('zen-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'zen-btn';
        btn.innerHTML = '🧘';
        btn.style = `
            position: fixed; bottom: 20px; left: 20px; z-index: 999999;
            width: 44px; height: 44px; border-radius: 10px; border: 1px solid #30363d;
            background: #21262d; color: #c9d1d9; cursor: pointer; font-size: 20px;
            display: flex; align-items: center; justify-content: center;
        `;
        document.body.appendChild(btn);
        btn.onclick = toggleZen;
    }

    // 1. Немедленный запуск
    applyZen();

    // 2. "Вечный" цикл (проверка каждые 1.5 сек)
    // Это лечит проблему, когда app.js загружает данные и перерисовывает экран
    setInterval(() => {
        applyZen();
        injectButton();
    }, 1500);

    // 3. Горячая клавиша
    window.addEventListener('keydown', (e) => {
        const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
        if (e.code === 'KeyF' && !isInput) {
            e.preventDefault();
            toggleZen();
        }
    }, true);

})();
