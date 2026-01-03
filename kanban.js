(function() {
    'use strict';

    // 1. СТИЛИ, АДАПТИРОВАННЫЕ ПОД ТВОЙ ДИЗАЙН
    const style = document.createElement('style');
    style.textContent = `
        .kanban-board {
            display: none;
            gap: 20px;
            width: 100%;
            margin-top: 20px;
            align-items: flex-start;
            justify-content: flex-start;
            overflow-x: auto;
            padding-bottom: 20px;
        }
        
        /* Колонки в стиле твоих карточек */
        .kanban-column {
            background: var(--card-alt);
            border: 1px solid var(--border);
            border-radius: 12px / calc(12px * 1.35);
            min-width: 320px;
            max-width: 320px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            max-height: 80vh;
        }

        .kanban-header {
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
        }

        .kanban-header h3 {
            margin: 0;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--muted);
        }

        .kanban-count {
            background: var(--button-bg);
            padding: 2px 8px;
            border-radius: 10px / calc(10px * 1.35);
            font-size: 11px;
            color: var(--accent);
        }

        .kanban-cards {
            padding: 10px;
            overflow-y: auto;
            flex-grow: 1;
            min-height: 150px;
        }

        /* Карточки как в твоем списке */
        .kanban-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 8px / calc(8px * 1.35);
            padding: 12px;
            margin-bottom: 12px;
            cursor: grab;
            transition: 0.2s ease;
        }

        .kanban-card:hover {
            border-color: var(--accent);
            background: var(--row-hover);
        }

        .kanban-card .proj-name {
            display: block;
            font-weight: 600;
            color: var(--text);
            margin-bottom: 8px;
            font-size: 14px;
        }

        .kanban-card .proj-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .kanban-card .proj-price {
            color: var(--green);
            font-family: monospace;
            font-weight: bold;
            font-size: 13px;
        }

        .kanban-card .proj-date {
            color: var(--muted);
            font-size: 11px;
        }

        /* Кнопка переключения */
        .view-switcher-wrap {
            display: inline-flex;
            background: var(--button-bg);
            border: 1px solid var(--border);
            border-radius: 8px / calc(8px * 1.35);
            padding: 3px;
            margin-right: 15px;
        }

        .view-btn {
            background: none;
            border: none;
            color: var(--muted);
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 6px / calc(6px * 1.35);
            transition: 0.2s;
        }

        .view-btn.active {
            background: var(--accent);
            color: white;
        }
    `;
    document.head.appendChild(style);

    // 2. ФУНКЦИЯ ОТРИСОВКИ
    window.renderKanban = function() {
        // Находим главный контейнер, где лежат таблицы
        const mainContent = document.querySelector('.main-content') || document.querySelector('.main-container');
        
        let board = document.getElementById('kanban-board');
        if (!board) {
            board = document.createElement('div');
            board.id = 'kanban-board';
            board.className = 'kanban-board';
            mainContent.appendChild(board);
        }

        board.innerHTML = '';
        board.style.display = 'flex';

        const sections = [
            { id: 'waiting', title: 'Ожидают', data: window.DATA.waiting },
            { id: 'active', title: 'В работе', data: window.DATA.active },
            { id: 'archive', title: 'Выполнено', data: window.DATA.archive.slice(0, 10) }
        ];

        sections.forEach(sec => {
            const col = document.createElement('div');
            col.className = 'kanban-column';
            col.innerHTML = `
                <div class="kanban-header">
                    <h3>${sec.title}</h3>
                    <span class="kanban-count">${sec.data.length}</span>
                </div>
                <div class="kanban-cards" data-cat="${sec.id}"></div>
            `;

            const cardsContainer = col.querySelector('.kanban-cards');
            
            sec.data.forEach(proj => {
                const card = document.createElement('div');
                card.className = 'kanban-card';
                card.innerHTML = `
                    <span class="proj-name">${proj.name}</span>
                    <div class="proj-meta">
                        <span class="proj-price">${proj.amount ? proj.amount.toLocaleString() : 0} ₽</span>
                        <span class="proj-date">${proj.dl || ''}</span>
                    </div>
                `;
                cardsContainer.appendChild(card);
            });

            board.appendChild(col);
        });
    };

    // 3. ПЕРЕКЛЮЧАТЕЛЬ
    function initSwitcher() {
        if (document.getElementById('view-switcher')) return;

        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;

        const wrap = document.createElement('div');
        wrap.id = 'view-switcher';
        wrap.className = 'view-switcher-wrap';
        wrap.innerHTML = `
            <button id="show-table" class="view-btn active"><i class="fa-solid fa-table"></i></button>
            <button id="show-kanban" class="view-btn"><i class="fa-solid fa-columns-gap"></i></button>
        `;
        headerActions.prepend(wrap);

        const bTable = document.getElementById('show-table');
        const bKanban = document.getElementById('show-kanban');

        bKanban.onclick = () => {
            bKanban.classList.add('active');
            bTable.classList.remove('active');
            
            // Скрываем все элементы, которые мешают Канбану
            document.querySelectorAll('.table-container, #analytics-dashboard, .welcome-block, .stats-grid').forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });

            window.renderKanban();
        };

        bTable.onclick = () => {
            location.reload(); // Возвращаемся к таблице
        };
    }

    // Запускаем инициализацию кнопки
    setInterval(initSwitcher, 1000);
})();
