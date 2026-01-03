/**
 * DesignFlow Journal: скрытые чек-листы по проектам
 * Комбинация: Ctrl + Shift + J
 */
(function() {
    'use strict';

    const VISIBILITY_CLASS = 'journal-visible';
    const MODAL_OVERLAY_CLASS = 'df-modal-overlay';
    const HOTKEY_CODE = 'KeyJ';

    const style = document.createElement('style');
    style.textContent = `
        .journal-link {
            display: none;
            align-items: center;
            justify-content: center;
            gap: 6px;
            min-width: 55px;
            height: 32px;
            background: var(--pill-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            cursor: pointer !important;
            color: var(--muted);
            font-size: 13px;
            transition: 0.2s;
            margin: 4px 0 0;
            vertical-align: middle;
            position: relative;
            z-index: 10;
        }
        html.${VISIBILITY_CLASS} .journal-link { display: inline-flex; }
        .journal-link:hover { color: var(--text); border-color: var(--accent); }

        .df-modal-overlay {
            position: fixed;
            inset: 0;
            background: var(--modal-overlay, rgba(0,0,0,0.6));
            backdrop-filter: blur(10px);
            z-index: 1000000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .df-modal {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            width: 820px;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            color: var(--text);
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        }
        .df-modal-header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .df-modal-body { padding: 20px; overflow-y: auto; flex-grow: 1; }
        .task-row {
            display: grid;
            grid-template-columns: 35px 1fr 115px 130px 140px 35px;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
            background: var(--bg);
            padding: 10px 14px;
            border-radius: 10px;
            border: 1px solid var(--border);
        }
        .task-row.is-done { opacity: 0.6; }
        .task-row.is-done input, .task-row.is-done select { text-decoration: line-through !important; }
        .check-wrapper { position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }
        .c-input {
            appearance: none; -webkit-appearance: none; width: 22px; height: 22px; border-radius: 6px;
            background: #21262d; border: 2px solid #444c56; cursor: pointer; transition: 0.2s; margin: 0; position: absolute;
        }
        .c-input:checked { background: #316dca !important; border-color: #316dca !important; }
        .check-mark {
            position: absolute; width: 10px; height: 5px; border-left: 2px solid #444c56; border-bottom: 2px solid #444c56;
            transform: rotate(-45deg) translate(1px, -1px); pointer-events: none; display: block !important;
        }
        .c-input:checked + .check-mark { border-left: 3px solid white !important; border-bottom: 3px solid white !important; }
        .task-row input, .task-row select { background: transparent; border: none !important; color: inherit; outline: none; font-size: 14px; width: 100%; }
        .price-wrapper { display: flex; align-items: center; color: var(--gold); font-weight: bold; background: rgba(255, 215, 0, 0.05); padding: 4px 10px; border-radius: 6px; }
        .t-price { text-align: right; padding-right: 5px !important; }
        .date-input-wrapper { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.03); padding: 4px 8px; border-radius: 6px; position: relative; }
        .t-date-txt { font-size: 13px !important; color: var(--muted); }
        .calendar-trigger { cursor: pointer; color: var(--muted); font-size: 14px; transition: 0.2s; }
        .calendar-trigger:hover { color: var(--accent); }
        .t-date-picker { position: absolute; right: 0; top: 0; width: 30px !important; opacity: 0; cursor: pointer; }
        .btn-del { cursor: pointer; opacity: 0.3; text-align: right; color: var(--muted); padding: 5px; }
        .btn-del:hover { opacity: 1; color: #ff7b72; }
        .df-modal-footer { padding: 18px 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .total-val { color: var(--accent); font-weight: bold; }
        .copy-btn, .snap-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            background: transparent;
            border: 1px solid var(--border);
            color: var(--muted);
            padding: 8px 14px;
            border-radius: 8px;
            cursor: pointer;
        }
        .add-task { width: 100%; padding: 12px; background: transparent; border: 1px dashed var(--border); color: var(--muted); border-radius: 10px; cursor: pointer; margin-top: 10px; }
    `;
    document.head.appendChild(style);

    const calculate = (val) => typeof toNumeric === 'function'
        ? toNumeric(val)
        : (parseFloat(String(val || '').replace(/\s/g, '')) || 0);
    const formatMoney = (val) => typeof formatCurrency === 'function'
        ? formatCurrency(val || 0)
        : (val || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
    const formatNumber = (val) => typeof formatPlainNumber === 'function'
        ? formatPlainNumber(val)
        : (val || '').toString();

    const strikeText = (text) => text.split('').map(char => char + '\u0336').join('');

    function getTasksMap() {
        if (!EXTRA_TASKS || typeof EXTRA_TASKS !== 'object') EXTRA_TASKS = {};
        return EXTRA_TASKS;
    }

    function getTasks(projectId) {
        const map = getTasksMap();
        if (!map[projectId]) map[projectId] = [];
        return map[projectId];
    }

    function setTasks(projectId, tasks) {
        const map = getTasksMap();
        map[projectId] = tasks;
        if (typeof save === 'function') save();
        renderJournalButtons();
    }

    function findProjectById(projectId) {
        const buckets = ['active', 'waiting', 'paused', 'potential', 'requests', 'archive', 'trash'];
        for (const type of buckets) {
            const list = DATA?.[type] || [];
            const idx = list.findIndex(p => p.id === projectId);
            if (idx !== -1) return { item: list[idx], type, idx };
        }
        return null;
    }

    function makeScreenshot(projectTitle, projectId, tasks) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = 650; const rowH = 50; const headerH = 110; const footerH = 90;
        canvas.width = width;
        canvas.height = headerH + (tasks.length * rowH) + footerH;
        ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, width, canvas.height);
        ctx.fillStyle = '#58a6ff'; ctx.font = 'bold 24px Arial';
        ctx.fillText(projectTitle || `Проект #${projectId}`, 35, 55);
        ctx.fillStyle = '#8b949e'; ctx.font = '14px Arial';
        ctx.fillText(`Отчет: ${new Date().toLocaleDateString()}`, 35, 85);
        tasks.forEach((t, i) => {
            const y = headerH + (i * rowH);
            ctx.fillStyle = t.done ? '#58a6ff' : '#30363d';
            ctx.font = '18px Arial'; ctx.fillText(t.done ? '☑' : '☐', 40, y - 5);
            ctx.font = '16px Arial'; ctx.fillStyle = t.done ? '#484f58' : '#c9d1d9';
            ctx.fillText(t.text || 'Без названия', 80, y - 5);
        });
        const totalCash = tasks.reduce((s, t) => s + calculate(t.price), 0);
        ctx.fillStyle = '#c9d1d9'; ctx.font = 'bold 18px Arial';
        ctx.fillText(`Итого: ${formatMoney(totalCash)}`, 35, canvas.height - 35);
        const link = document.createElement('a');
        link.download = `Project_${projectId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    function openJournal(projectId, typeHint) {
        const project = findProjectById(projectId);
        const projectTitle = project?.item?.n || 'Проект';
        const projectLabel = project?.item?.c ? `${project?.item?.c} — ${projectTitle}` : `${projectTitle}`;
        let tasks = [...getTasks(projectId)];

        const overlay = document.createElement('div');
        overlay.className = MODAL_OVERLAY_CLASS;
        const modal = document.createElement('div');
        modal.className = 'df-modal';

        const persist = () => setTasks(projectId, tasks);

        const render = () => {
            const totalCash = tasks.reduce((s, t) => s + calculate(t.price), 0);
            modal.innerHTML = `
                <div class="df-modal-header">
                    <strong>${projectLabel}</strong>
                    <span class="close-modal" style="cursor:pointer; font-size:24px">&times;</span>
                </div>
                <div class="df-modal-body">
                    <div id="tasks-root">${tasks.map((t, i) => `
                        <div class="task-row ${t.done ? 'is-done' : ''}">
                            <div class="check-wrapper">
                                <input type="checkbox" ${t.done ? 'checked' : ''} data-idx="${i}" class="c-input">
                                <div class="check-mark"></div>
                            </div>
                            <input type="text" value="${t.text || ''}" placeholder="Название этапа..." data-idx="${i}" class="txt">
                            <select class="t-time-select" style="color: var(--green)" data-idx="${i}">
                                <option value="0.5" ${t.time === '0.5' ? 'selected' : ''}>30 мин</option>
                                <option value="1" ${t.time === '1' || !t.time ? 'selected' : ''}>1 час</option>
                                <option value="2" ${t.time === '2' ? 'selected' : ''}>2 часа</option>
                                <option value="4" ${t.time === '4' ? 'selected' : ''}>4 часа</option>
                                <option value="8" ${t.time === '8' ? 'selected' : ''}>8 часов</option>
                            </select>
                            <div class="price-wrapper">
                                <input type="text" value="${t.price_view || formatNumber(calculate(t.price))}" class="t-price" data-idx="${i}" placeholder="0">
                                <span>₽</span>
                            </div>
                            <div class="date-input-wrapper">
                                <input type="text" value="${t.date || ''}" placeholder="Срок" class="t-date-txt" data-idx="${i}">
                                <i class="fa fa-calendar-alt calendar-trigger"></i>
                                <input type="date" class="t-date-picker" data-idx="${i}">
                            </div>
                            <span class="btn-del" data-del="${i}"><i class="fa fa-trash"></i></span>
                        </div>`).join('')}</div>
                    <button class="add-task"><i class="fa fa-plus-circle"></i> Добавить этап</button>
                </div>
                <div class="df-modal-footer">
                    <span>Бюджет: <span class="total-val">${formatMoney(totalCash)}</span></span>
                    <div style="display:flex; gap:10px">
                        <button class="snap-btn"><i class="fa fa-camera"></i> Скриншот</button>
                        <button class="copy-btn"><i class="fa fa-copy"></i> Текст</button>
                    </div>
                </div>`;

            modal.querySelector('.close-modal').onclick = () => document.body.removeChild(overlay);
            modal.querySelector('.snap-btn').onclick = () => makeScreenshot(projectLabel, projectId, tasks);
            modal.querySelector('.copy-btn').onclick = () => {
                const textStr = tasks.map(t => {
                    let name = t.text || 'Без названия';
                    if (t.done) name = strikeText(name);
                    return `${t.done ? '🔵' : '⚪'} ${name}`;
                }).join('\n');
                navigator.clipboard?.writeText(`Проект ${projectLabel}\n${textStr}\nИтого: ${formatMoney(totalCash)}`);
            };

            modal.querySelector('.add-task').onclick = () => {
                tasks.push({ text:'', done:false, time:'1', price:'0', price_view:'0', date:'' });
                persist();
                render();
            };

            modal.querySelectorAll('.t-price').forEach(el => {
                el.onblur = (e) => {
                    const idx = e.target.dataset.idx;
                    const val = calculate(e.target.value);
                    tasks[idx].price = val;
                    tasks[idx].price_view = formatNumber(val);
                    persist();
                    render();
                };
            });

            modal.querySelectorAll('input, select').forEach(el => {
                el.oninput = (e) => {
                    const idx = e.target.dataset.idx;
                    if (e.target.classList.contains('c-input')) {
                        tasks[idx].done = e.target.checked;
                        persist();
                        render();
                        return;
                    }
                    if (e.target.classList.contains('txt')) tasks[idx].text = e.target.value;
                    else if (e.target.classList.contains('t-time-select')) tasks[idx].time = e.target.value;
                    else if (e.target.classList.contains('t-date-txt')) tasks[idx].date = e.target.value;
                    else if (e.target.classList.contains('t-date-picker')) {
                        const val = e.target.value;
                        if (val) {
                            const [y, m, d] = val.split('-');
                            tasks[idx].date = `${d}.${m}`;
                        }
                        render();
                        return;
                    }
                    persist();
                };
            });

            modal.querySelectorAll('[data-del]').forEach(btn => {
                btn.onclick = () => {
                    tasks.splice(btn.dataset.del, 1);
                    persist();
                    render();
                };
            });
        };

        render();
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        overlay.onmousedown = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
    }

    function renderJournalButtons() {
        const rows = document.querySelectorAll('table tbody tr[data-project-id]');
        rows.forEach(row => {
            const pid = row.dataset.projectId;
            if (!pid) return;
            const targetCell = row.querySelector('.action-btns')?.parentElement || row.querySelector('td:last-child');
            if (!targetCell) return;
            const tasks = getTasks(pid);
            const done = tasks.filter(t => t.done).length;
            const total = tasks.length;
            let link = targetCell.querySelector('.journal-link');
            if (!link) {
                link = document.createElement('div');
                link.className = 'journal-link';
                targetCell.appendChild(link);
            }
            link.dataset.projectId = pid;
            link.dataset.projectType = row.dataset.type || '';
            link.innerHTML = `<i class="fa fa-plus-circle"></i> <b>${done}/${total}</b>`;
        });
    }

    window.renderJournalButtons = renderJournalButtons;

    document.addEventListener('click', (e) => {
        const link = e.target.closest('.journal-link');
        if (!link) return;
        e.preventDefault();
        e.stopPropagation();
        openJournal(link.dataset.projectId, link.dataset.projectType);
    }, true);

    function toggleVisibilityHotkey(e) {
        if (!e.ctrlKey || !e.shiftKey || e.code !== HOTKEY_CODE) return;
        const root = document.documentElement;
        const activate = !root.classList.contains(VISIBILITY_CLASS);
        root.classList.toggle(VISIBILITY_CLASS, activate);
        if (activate) {
            if (typeof showToast === 'function') showToast('Режим журнала активирован');
            else alert('Режим разработчика активирован');
        }
    }

    window.addEventListener('keydown', toggleVisibilityHotkey);
})();
