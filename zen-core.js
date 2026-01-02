/**
 * DesignFlow Plus: Zen Mode Only
 * С сохранением состояния (localStorage)
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // === ДЗЕН-РЕЖИМ (ФОКУСИРОВКА) ===
    const styleZen = document.createElement('style');
    document.head.appendChild(styleZen);

    /**
     * Функция применения или удаления стилей Дзена
     * @param {boolean} isActive - включен ли режим
     */
    function applyZen(isActive) {
        if (isActive) {
            styleZen.innerHTML = `
                /* Скрываем аналитику, дашборд и боковые блоки */
                #analytics-dashboard, .stats-full, header, footer, .welcome-block,
                #efficiency-card, #record-banner, #reputation-card, #top-clients-card, .side-stack,
                /* Скрываем второстепенные вкладки */
                #tab-all, #tab-potential, #tab-paused, #tab-archive, #tab-trash {
                    display: none !important;
                }

                /* Растягиваем контейнер с таблицами на всю ширину */
                .main-container {
                    max-width: 98% !important;
                    width: 98% !important;
                    margin: 0 auto !important;
                    padding-top: 15px !important;
                }

                /* Подсвечиваем кнопку, когда режим активен */
                #zen-btn { 
                    background: var(--green) !important; 
                    color: white !important; 
                    border-color: var(--green) !important;
                    box-shadow: 0 0 10px rgba(46, 160, 67, 0.4);
                }
            `;
            
            // Если пользователь находится во вкладке "Архив", переключаем на "В работе"
            if (document.querySelector('.tab.active')?.id === 'tab-archive') {
                if (typeof switchTab === 'function') switchTab('active');
            }
        } else {
            styleZen.innerHTML = '';
        }
    }

    // 1. Извлекаем сохраненное состояние из памяти (localStorage)
    let isZen = localStorage.getItem('zenModeActive') === 'true';
    
    // 2. Сразу применяем его при загрузке
    applyZen(isZen);

    // 3. Функция переключения
    function toggleZen() {
        isZen = !isZen;
        localStorage.setItem('zenModeActive', isZen); // Запоминаем выбор
        applyZen(isZen);
    }

    // 4. Создаем кнопку 🧘 на странице
    const btn = document.createElement('button');
    btn.id = 'zen-btn';
    btn.innerHTML = '🧘';
    btn.title = 'Zen Mode (F)';
    btn.style = `
        position: fixed; bottom: 20px; left: 20px; z-index: 10000;
        width: 44px; height: 44px; border-radius: 10px; border: 1px solid var(--border);
        background: var(--card); color: var(--text); cursor: pointer; font-size: 20px;
        display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
    `;
    document.body.appendChild(btn);
    btn.onclick = toggleZen;

    // 5. Обработка горячей клавиши "F"
    window.addEventListener('keydown', (e) => {
        // Проверяем, не пишет ли пользователь текст в этот момент
        const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
        
        if (e.code === 'KeyF' && !isInput) {
            e.preventDefault();
            toggleZen();
        }
    }, true);
});
