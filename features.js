/* DesignFlow: Pack (Zen Mode + Status Highlighting) 
*/

document.addEventListener('DOMContentLoaded', function() {
    
    // === 1. ЭЛЕГАНТНОЕ ВЫДЕЛЕНИЕ ДЕДЛАЙНОВ ===
    const styleStatus = document.createElement('style');
    styleStatus.innerHTML = `
        tr:has(.days-critical) {
            background: linear-gradient(90deg, rgba(218, 54, 51, 0.05) 0%, transparent 100%) !important;
        }
        tr:has(.days-critical) td:first-child {
            border-left: 3px solid var(--red) !important;
        }
        .days-critical {
            color: var(--red) !important;
            font-weight: 600 !important;
            font-family: monospace;
            font-size: 12px !important;
        }
        .days-critical::before {
            content: "◆";
            margin-right: 6px;
        }
    `;
    document.head.appendChild(styleStatus);


    // === 2. ДЗЕН-РЕЖИМ (ФОКУСИРОВКА) ===
    let isZen = false;
    const styleZen = document.createElement('style');
    document.head.appendChild(styleZen);

    function toggleZen() {
        isZen = !isZen;
        if (isZen) {
            styleZen.innerHTML = `
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
                #zen-btn { background: var(--green) !important; color: white !important; }
            `;
            // Переключаем на активные проекты, если пользователь был в архиве
            if (document.querySelector('.tab.active')?.id === 'tab-archive') {
                if (typeof switchTab === 'function') switchTab('active');
            }
        } else {
            styleZen.innerHTML = '';
        }
    }

    // Создаем кнопку 🧘
    const btn = document.createElement('button');
    btn.id = 'zen-btn';
    btn.innerHTML = '🧘';
    btn.style = `
        position: fixed; bottom: 20px; left: 20px; z-index: 10000;
        width: 44px; height: 44px; border-radius: 10px; border: 1px solid var(--border);
        background: var(--card); color: var(--text); cursor: pointer; font-size: 20px;
        display: flex; align-items: center; justify-content: center;
    `;
    document.body.appendChild(btn);
    btn.onclick = toggleZen;

    // Горячая клавиша F
    window.addEventListener('keydown', (e) => {
        const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
        if (e.code === 'KeyF' && !isInput) {
            e.preventDefault();
            toggleZen();
        }
    }, true);
});
