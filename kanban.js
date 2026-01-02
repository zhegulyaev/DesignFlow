/**
 * DesignFlow Plus: Kanban Module
 * Интеграция с DATA и системой вкладок
 */

(function() {
    'use strict';

    // Добавляем стили для Канбана
    const style = document.createElement('style');
    style.textContent = `
        .kanban-board {
            display: none; /* По умолчанию скрыт */
            gap: 20px;
            padding: 20px 0;
            align-items: flex-start;
            overflow-x: auto;
        }
        .kanban-column {
            background: var(--card-alt);
            border: 1px solid var(--border);
            border-radius: 12px;
            min-width: 300px;
            flex: 1;
            padding: 15px;
        }
        .kanban-column h3 {
            font-size: 14px;
            text-transform: uppercase;
            color: var(--muted);
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
        }
        .kanban-cards {
            min-height: 500px;
        }
        .kanban-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
            cursor: grab;
            transition: 0.2s;
        }
        .kanban-card:hover { border-color: var(--accent); }
        .kanban-card .title { font-weight: 600; display: block; margin-bottom: 5px; }
        .kanban-card .price { color: var(--green); font-family: monospace; font-size: 13px; }
        
        /* Кнопка переключения */
        .view-switcher {
            position: fixed; top: 20px; right: 200px; z-index: 1000;
            display: flex; background: var(--card); border: 1px solid var(--border);
            border-radius: 8px; overflow: hidden;
        }
        .view-switcher button {
            padding: 8px 15px; border: none; background: none; color: var(--text);
            cursor: pointer; font-size: 13px;
        }
        .view-switcher button.active { background: var(--accent); color: white; }
    `;
    document.head.appendChild(style);

    function createCard(project, category) {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.innerHTML = `
            <span class="title">${project.name}</span>
            <div class="price">${project.amount || 0} ₽</div>
        `;
        
        card.ondragstart = (e) => {
            e.dataTransfer.setData('projectId', project.id);
            e.dataTransfer.setData('fromCategory', category);
            card.style.opacity = '0.5';
        };
        card.ondragend = () => card.style.opacity = '1';
        
        return card;
    }

    window.renderKanban = function() {
        const board = document.getElementById('kanban-board') || document.createElement('div');
        board.id = 'kanban-board';
        board.className = 'kanban-board';
        
        // Очищаем и создаем колонки
        board.innerHTML = '';
        const columns = [
            { id: 'waiting', title: 'Ожидают', data: window.DATA.waiting },
            { id: 'active', title: 'В работе', data: window.DATA.active },
            { id: 'archive', title: 'Готово', data: window.DATA.archive.slice(0, 10) } // последние 10
        ];

        columns.forEach(col => {
            const colEl = document.createElement('div');
            colEl.className = 'kanban-column';
            colEl.innerHTML = `<h3>${col.title} <span>${col.data.length}</span></h3>`;
            
            const cardsCont = document.createElement('div');
            cardsCont.className = 'kanban-cards';
            
            col.data.forEach(p => cardsCont.appendChild(createCard(p, col.id)));
            
            // Логика Drop
            cardsCont.ondragover = (e) => e.preventDefault();
            cardsCont.ondrop = (e) => {
                const id = e.dataTransfer.getData('projectId');
                const from = e.dataTransfer.getData('fromCategory');
                if (from !== col.id) {
                    // Здесь вызываем встроенную функцию передвижения из app.js
                    // Например, moveProject(id, from, col.id);
                    console.log(`Переносим ${id} из ${from} в ${col.id}`);
                    // После переноса - save() и renderKanban()
                }
            };

            colEl.appendChild(cardsCont);
            board.appendChild(colEl);
        });

        if (!document.getElementById('kanban-board')) {
            document.querySelector('.main-container').appendChild(board);
        }
    };

    // Добавляем кнопку переключения в интерфейс
    window.addEventListener('load', () => {
        const switcher = document.createElement('div');
        switcher.className = 'view-switcher';
        switcher.innerHTML = `
            <button id="view-table" class="active">Таблица</button>
            <button id="view-kanban">Канбан</button>
        `;
        document.body.appendChild(switcher);

        document.getElementById('view-kanban').onclick = function() {
            document.querySelectorAll('table, .stats-grid').forEach(el => el.style.display = 'none');
            document.getElementById('kanban-board').style.display = 'flex';
            this.classList.add('active');
            document.getElementById('view-table').classList.remove('active');
            window.renderKanban();
        };

        document.getElementById('view-table').onclick = function() {
            location.reload(); // Проще всего вернуть таблицу через релоад или скрыть доску
        };
    });

})();
