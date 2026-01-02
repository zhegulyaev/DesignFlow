/**
 * DesignFlow Plus: Zen Mode
 * С исправленным сохранением состояния
 */

(function() {
    // Функция применения стилей
    function applyZen(isActive, styleElement) {
        if (isActive) {
            styleElement.innerHTML = `
                #analytics-dashboard, .stats-full, header, footer, .welcome-block,
                #tab-all, #tab-potential, #tab-paused, #tab-archive, #tab-trash,
                #efficiency-card, #record-banner, #reputation-card, #top-clients-card, .side-stack {
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
                }
            `;
            // Переключаем вкладку, если мы в архиве
            if (document.querySelector('.tab.active')?.id === 'tab-archive') {
                if (typeof switchTab === 'function') switchTab('active');
            }
        } else {
            styleElement.innerHTML = '';
        }
    }

    function initZen() {
        const styleZen = document.createElement('style');
        styleZen.id = 'zen-mode-styles';
        document.head.appendChild(styleZen);

        // Читаем из localStorage (преобразуем строку 'true' в булево значение true)
        let isZen = localStorage.getItem('zenModeActive') === 'true';

        // Применяем состояние
        applyZen(isZen, styleZen);

        // Создаем кнопку
        const btn = document.createElement('button');
        btn.id = 'zen-btn';
        btn.innerHTML = '🧘';
        btn.style = `
            position: fixed; bottom: 20px; left: 20px; z-index: 10000;
            width: 44px; height: 44px; border-radius: 10px; border: 1px solid var(--border);
            background: var(--card); color: var(--text); cursor: pointer; font-size: 20px;
            display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
        `;
        document.body.appendChild(btn);

        // Логика клика
        btn.onclick = function() {
            isZen = !isZen;
            localStorage.setItem('zenModeActive', isZen); // Сохраняем
            applyZen(isZen, styleZen);
        };

        // Горячая клавиша F
        window.addEventListener('keydown', (e) => {
            const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
            if (e.code === 'KeyF' && !isInput) {
                e.preventDefault();
                btn.click(); // Имитируем клик по кнопке
            }
        }, true);
    }

    // Запускаем через небольшую паузу, чтобы app.js успел прогрузить данные
    if (document.readyState === 'complete') {
        setTimeout(initZen, 100);
    } else {
        window.addEventListener('load', () => setTimeout(initZen, 100));
    }
})();
