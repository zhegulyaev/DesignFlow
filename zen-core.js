/**
 * DesignFlow Plus: Zen Mode & Sharp Highlighting
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // 1. СТИЛИ ВЫДЕЛЕНИЯ (Критические задачи)
    const styleStatus = document.createElement('style');
    styleStatus.innerHTML = `
        tr:has(.days-critical) {
            background-color: rgba(218, 54, 51, 0.04) !important;
        }
        tr:has(.days-critical) td:first-child {
            border-left: 3px solid var(--red) !important;
        }
        .days-critical {
            color: var(--red) !important;
            font-weight: 600 !important;
            font-family: 'SF Mono', 'Cascadia Code', monospace;
            font-size: 12px !important;
        }
        .days-critical::before {
            content: "◆";
            margin-right: 6px;
            font-size: 10px;
        }
        tr:has(.days-critical):hover {
            background-color: rgba(218, 54, 51, 0.08) !important;
        }
    `;
    document.head.appendChild(styleStatus);


    // 2. ЛОГИКА ДЗЕН-РЕЖИМА
    let isZen = false;
    const styleZen = document.createElement('style');
    document.head.appendChild(styleZen);

    function toggleZen() {
        isZen = !isZen;
        if (isZen) {
            styleZen.innerHTML = `
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
                #zen-btn { background: var(--green) !important; color: white !important; }
            `;
            if (document.querySelector('.tab.active')?.id === 'tab-archive') {
                if (typeof switchTab === 'function') switchTab('active');
            }
        } else {
            styleZen.innerHTML = '';
        }
    }

    // Создание кнопки 🧘
    const btn = document.createElement('button');
    btn.id = 'zen-btn';
    btn.innerHTML = '🧘';
    btn.style = `
        position: fixed; bottom: 20px; left: 20px; z-index: 9999;
        width: 44px; height: 44px; border-radius: 10px; border: 1px solid var(--border);
        background: var(--card); color: var(--text); cursor: pointer; font-size: 20px;
        display: flex; align-items: center; justify-content: center; transition: 0.3s;
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
