(function() {
    'use strict';

    // 1. СТИЛИ (улучшенные)
    const style = document.createElement('style');
    style.textContent = `
        .kanban-board {
            display: none;
            gap: 16px;
            padding: 20px;
            background: var(--bg);
            min-height: 80vh;
            width: 100%;
            box-sizing: border-box;
            position: relative;
            z-index: 10;
        }
        .kanban-column {
            background: var(--card-alt);
            border: 1px solid var(--border);
            border-radius: 12px;
            min-width: 300px;
            flex: 1;
            padding: 15px;
            display: flex;
            flex-direction: column;
        }
        .kanban-column h3 {
            font-size: 12px;
            text-transform: uppercase;
            color: var(--muted);
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
        }
        .kanban-cards {
            flex-grow: 1;
            min-height: 200px;
        }
        .kanban-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
            cursor: grab;
        }
        .kanban-card:hover { border-color: var(--accent); }
        .kanban-card .name { font-weight: 600; font-size: 14px; margin-bottom: 5px; display: block; }
        .kanban-card .price { color: var(--green); font-family: monospace; font-size: 13px; }

        /* Кнопка переключателя */
        .view-toggle-container {
            display: inline-flex;
            background: var(--button-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 2px;
            margin-left: 10px;
        }
        .view-toggle-btn {
            padding: 6px 12px;
            border: none;
            background: none;
            color: var(--muted);
            cursor: pointer;
            border-radius: 6px;
        }
        .view-toggle-btn.active {
            background: var(--accent);
            color: white;
        }
    `;
    document.head.appendChild(style);

    // 2. ФУНКЦИЯ РЕНДЕРА
    window.renderKanban = function() {
        let board = document.getElementById('kanban-board');
        
        // Если доски еще нет, создаем её и вставляем ПОСЛЕ основной таблицы
        if (!board) {
            board = document.createElement('div');
            board.id = 'kanban-board';
            board.className = 'kanban-board';
            const container = document.querySelector('.main-container') || document.body;
            container.appendChild(board);
        }

        board.innerHTML = '';
        board.style.display = 'flex'; // Принудительно показываем

        const cols = [
            { id: 'waiting', title: 'Ожидают', data: window.DATA.waiting },
            { id: 'active', title: 'В работе', data: window.DATA.active },
            { id: 'archive', title: 'Готово', data: window.DATA.archive.slice(0, 10) }
        ];

        cols.forEach(col => {
            const colEl = document.createElement('div');
            colEl.className = 'kanban-column';
            colEl.innerHTML = `<h3>${col.title} <span>${col.data.length}</span></h3>`;
            
            const cardsCont = document.createElement('div');
            cardsCont.className = 'kanban-cards';
            
            col.data.forEach(p => {
                const card = document.createElement('div');
                card.className = 'kanban-card';
                card.innerHTML = `<span class="name">${p.name}</span><span class="price">${p.amount || 0} ₽</span>`;
                cardsCont.appendChild(card);
            });
            
            colEl.appendChild(cardsCont);
            board.appendChild(colEl);
        });
    };

    // 3. ИНЪЕКЦИЯ КНОПКИ
    function injectToggle() {
        if (document.getElementById('view-toggle-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'view-toggle-wrapper';
        wrapper.className = 'view-toggle-container';
        wrapper.innerHTML = `
            <button id="btn-table-view" class="view-toggle-btn active"><i class="fa-solid fa-table-list"></i></button>
            <button id="btn-kanban-view" class="view-toggle-btn"><i class="fa-solid fa-grip-vertical"></i></button>
        `;

        // Ищем место для кнопки (в твоем хедере)
        const header = document.querySelector('.header-actions') || document.querySelector('header');
        if (header) header.appendChild(wrapper);

        document.getElementById('btn-kanban-view').onclick = function() {
            this.classList.add('active');
            document.getElementById('btn-table-view').classList.remove('active');
            
            // Прячем всё, кроме нашего Канбана
            document.querySelectorAll('.table-container, .stats-grid, #analytics-dashboard, .welcome-block').forEach(el => {
                el.style.display = 'none';
            });
            
            window.renderKanban();
        };

        document.getElementById('btn-table-view').onclick = () => location.reload();
    }

    setInterval(injectToggle, 1000);
})();
