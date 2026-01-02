/**
 * DesignFlow Plus: Status Highlighting Only
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // === 1. ЭЛЕГАНТНОЕ ВЫДЕЛЕНИЕ ДЕДЛАЙНОВ ===
    const styleStatus = document.createElement('style');
    styleStatus.innerHTML = `
        /* Подсветка строки с критическим дедлайном */
        tr:has(.days-critical) {
            background: linear-gradient(90deg, rgba(218, 54, 51, 0.05) 0%, transparent 100%) !important;
        }
        
        /* Красный индикатор слева в первой ячейке */
        tr:has(.days-critical) td:first-child {
            border-left: 3px solid var(--red) !important;
        }
        
        /* Стилизация самого текста счетчика дней */
        .days-critical {
            color: var(--red) !important;
            font-weight: 600 !important;
            font-family: monospace;
            font-size: 12px !important;
        }
        
        /* Иконка ромба перед текстом */
        .days-critical::before {
            content: "◆";
            margin-right: 6px;
        }
    `;
    document.head.appendChild(styleStatus);

});
