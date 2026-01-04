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
            border-radius: 18px;
            width: 980px;
            max-height: 88vh;
            display: flex;
            flex-direction: column;
            color: var(--text);
            box-shadow: 0 25px 60px rgba(0,0,0,0.55);
        }
        .df-modal-header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .df-modal-body { padding: 20px; overflow-y: auto; flex-grow: 1; }
        .task-row {
            display: grid;
            grid-template-columns: 26px 34px 1fr 120px 125px 210px 28px;
            align-items: center;
            gap: 12px;
            margin-bottom: 10px;
            background: linear-gradient(120deg, rgba(88,166,255,0.06), rgba(163,113,247,0.05)), var(--card);
            padding: 8px 14px;
            border-radius: 14px;
            border: 1px solid var(--border);
            position: relative;
            box-shadow: 0 12px 30px rgba(0,0,0,0.12);
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
        .hours-wrapper { display: flex; align-items: center; gap: 6px; background: rgba(46, 160, 67, 0.05); padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(46, 160, 67, 0.2); }
        .hours-wrapper span { color: var(--muted); font-size: 12px; }
        .hours-input { text-align: right; font-weight: 600; }
        .date-input-wrapper { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 12px; position: relative; border: 1px solid var(--border); min-height: 48px; }
        .deadline-copy { display: grid; gap: 2px; min-width: 120px; }
        .deadline-copy .title { font-size: 12px; font-weight: 800; letter-spacing: 0.3px; color: var(--muted); text-transform: uppercase; }
        .deadline-copy .hint { font-size: 12px; color: var(--muted); opacity: 0.85; }
        .deadline-btn { display: inline-flex; align-items: center; gap: 10px; background: transparent; border: none; color: var(--muted); padding: 6px 10px; cursor: pointer; width: 100%; text-align: left; font-weight: 700; border-radius: 10px; transition: .15s; }
        .deadline-btn:hover { border: 1px dashed var(--accent); color: var(--text); }
        .deadline-btn svg { width: 18px; height: 18px; color: var(--muted); }
        .deadline-btn .deadline-text { color: var(--text); }
        .deadline-btn.is-empty .deadline-text { color: var(--muted); font-weight: 600; }
        .btn-del { cursor: pointer; opacity: 0.3; text-align: right; color: var(--muted); padding: 5px; }
        .btn-del:hover { opacity: 1; color: #ff7b72; }
        .drag-handle { cursor: grab; display: flex; align-items: center; justify-content: center; color: var(--muted); width: 28px; height: 28px; border-radius: 10px; border: 1px dashed var(--border); background: rgba(255,255,255,0.02); transition: .15s; }
        .drag-handle svg { width: 14px; height: 14px; opacity: 0.8; }
        .drag-handle:hover { color: var(--text); border-color: var(--accent); background: rgba(88,166,255,0.08); }
        .task-row.drag-over { outline: 1px dashed var(--accent); }
        .df-modal-footer { padding: 18px 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .total-val { color: var(--accent); font-weight: bold; }
        .hours-total { color: var(--muted); font-weight: 600; margin-left: 12px; }
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
        .deadline-dialog { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 1000001; background: rgba(0,0,0,0.35); padding: 16px; }
        .deadline-dialog-inner { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 18px; width: 380px; box-shadow: 0 20px 40px rgba(0,0,0,0.35); }
        .deadline-dialog h4 { margin: 0 0 6px; }
        .deadline-dialog .preset-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 10px 0; }
        .deadline-dialog .preset-btn { padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); cursor: pointer; text-align: left; }
        .deadline-dialog .preset-btn:hover { border-color: var(--accent); color: var(--accent); }
        .deadline-dialog .inputs { display: grid; gap: 10px; margin: 10px 0; }
        .deadline-dialog .inputs label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--muted); }
        .deadline-dialog .inputs input { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); color: var(--text); }
        .deadline-dialog .actions { display: flex; justify-content: space-between; gap: 8px; margin-top: 8px; }
        .deadline-dialog .actions button { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); color: var(--text); cursor: pointer; }
        .deadline-dialog .actions .primary { background: var(--btn-blue, #316dca); border-color: var(--btn-blue, #316dca); color: white; }
        .deadline-dialog .actions .danger { color: #ff7b72; border-color: #ff7b72; }
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

        const normalizeDeadline = (task = {}) => {
            const dl = typeof task.deadline === 'object' && task.deadline !== null
                ? { ...task.deadline }
                : {};

            if (!dl.date && typeof task.date === 'string' && task.date.trim()) {
                const raw = task.date.trim();
                const parts = raw.split('.');
                if (parts.length >= 2) {
                    const [d, m, y] = parts;
                    const year = y ? (y.length === 2 ? `20${y}` : y) : String(new Date().getFullYear());
                    dl.date = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                } else {
                    dl.legacyLabel = raw;
                }
            }

            return {
                date: typeof dl.date === 'string' ? dl.date : '',
                time: typeof dl.time === 'string' ? dl.time : '',
                legacyLabel: typeof dl.legacyLabel === 'string' ? dl.legacyLabel : ''
            };
        };

        const formatDeadlineLabel = (deadline = {}) => {
            if (!deadline.date) {
                return deadline.legacyLabel || 'Без дедлайна';
            }
            const dt = new Date(`${deadline.date}T${deadline.time || '12:00'}`);
            if (Number.isNaN(dt.getTime())) {
                return deadline.legacyLabel || 'Без дедлайна';
            }
            const dateText = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(dt);
            return deadline.time ? `${dateText} ${deadline.time}` : dateText;
        };

        const normalizeTask = (raw = {}) => {
            const hoursVal = Number.isFinite(Number(raw.hours)) ? Number(raw.hours) : (calculate(raw.time || 0) || 0);
            const priceVal = calculate(raw.price);
            const deadline = normalizeDeadline(raw);
            return {
                ...raw,
                text: raw.text || '',
                done: !!raw.done,
                hours: hoursVal,
                hours_view: raw.hours_view || formatNumber(hoursVal || ''),
                time: String(hoursVal || ''),
                price: priceVal,
                price_view: raw.price_view || formatNumber(priceVal),
                deadline,
                date: raw.date || ''
            };
        };

        const normalizeTasks = () => {
            tasks = tasks.map(normalizeTask);
        };

        const presetISODate = (daysFromNow = 0) => {
            const d = new Date();
            d.setDate(d.getDate() + daysFromNow);
            return d.toISOString().slice(0, 10);
        };

        const applyDeadline = (idx, nextDeadline) => {
            tasks[idx].deadline = nextDeadline;
            tasks[idx].date = nextDeadline.date ? formatDeadlineLabel(nextDeadline) : '';
            persist();
            render();
            if (typeof showToast === 'function') {
                showToast(nextDeadline.date ? 'Срок сохранён' : 'Без дедлайна');
            }
        };

        const openDeadlineDialog = (idx) => {
            const existing = document.querySelector('.deadline-dialog');
            if (existing) existing.remove();

            const targetTask = tasks[idx];
            const dialog = document.createElement('div');
            dialog.className = 'deadline-dialog';
            const dateId = `deadline-date-${idx}`;
            const timeId = `deadline-time-${idx}`;
            dialog.innerHTML = `
                <div class="deadline-dialog-inner">
                    <h4>Дедлайн</h4>
                    <p class="helper-note">Выберите готовый срок или задайте свой.</p>
                    <div class="preset-grid">
                        <button type="button" class="preset-btn" data-preset="0">Сегодня</button>
                        <button type="button" class="preset-btn" data-preset="1">Завтра</button>
                        <button type="button" class="preset-btn" data-preset="3">Через 3 дня</button>
                        <button type="button" class="preset-btn" data-preset="7">Неделя</button>
                        <button type="button" class="preset-btn" data-preset="custom">Свой срок</button>
                        <button type="button" class="preset-btn" data-preset="clear">Без дедлайна</button>
                    </div>
                    <div class="inputs">
                        <label>Дата
                            <input type="date" id="${dateId}" value="${targetTask.deadline?.date || ''}">
                        </label>
                        <label>Время (опционально)
                            <input type="time" id="${timeId}" value="${targetTask.deadline?.time || ''}" step="300">
                        </label>
                    </div>
                    <div class="actions">
                        <button type="button" class="danger" data-action="clear">Без дедлайна</button>
                        <button type="button" class="primary" data-action="save">Сохранить</button>
                    </div>
                </div>
            `;

            const dateInput = dialog.querySelector(`#${dateId}`);
            const timeInput = dialog.querySelector(`#${timeId}`);

            dialog.querySelectorAll('.preset-btn').forEach(btn => {
                btn.onclick = () => {
                    const preset = btn.dataset.preset;
                    if (preset === 'custom') {
                        dateInput.focus();
                        return;
                    }
                    if (preset === 'clear') {
                        dateInput.value = '';
                        timeInput.value = '';
                        applyDeadline(idx, { date: '', time: '', legacyLabel: '' });
                        dialog.remove();
                        return;
                    }
                    const days = Number(preset);
                    if (!Number.isNaN(days)) {
                        dateInput.value = presetISODate(days);
                        timeInput.value = '';
                    }
                };
            });

            dialog.querySelector('[data-action="save"]').onclick = () => {
                applyDeadline(idx, { date: dateInput.value, time: timeInput.value, legacyLabel: '' });
                dialog.remove();
            };

            dialog.querySelector('[data-action="clear"]').onclick = () => {
                applyDeadline(idx, { date: '', time: '', legacyLabel: '' });
                dialog.remove();
            };

            dialog.onclick = (e) => { if (e.target === dialog) dialog.remove(); };

            document.body.appendChild(dialog);
        };

        let dragIndex = null;
        const removeDeadlineDialog = () => {
            const dlg = document.querySelector('.deadline-dialog');
            if (dlg) dlg.remove();
        };
        const closeModal = () => {
            removeDeadlineDialog();
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        };

        const render = () => {
            normalizeTasks();
            const totalCash = tasks.reduce((s, t) => s + calculate(t.price), 0);
            const totalHours = tasks.reduce((s, t) => s + (Number(t.hours) || 0), 0);
            const rowsHTML = tasks.map((t, i) => {
                const deadlineText = formatDeadlineLabel(t.deadline);
                const priceDisplay = t.price_view || formatNumber(calculate(t.price));
                const hoursDisplay = t.hours_view || formatNumber(t.hours || '');
                return `
                    <div class="task-row ${t.done ? 'is-done' : ''}" data-idx="${i}">
                        <div class="drag-handle" data-drag="${i}" title="Перетащите, чтобы изменить порядок">
                            <svg><use href="#icon-grip"/></svg>
                        </div>
                        <div class="check-wrapper">
                            <input type="checkbox" ${t.done ? 'checked' : ''} data-idx="${i}" class="c-input">
                            <div class="check-mark"></div>
                        </div>
                        <input type="text" value="${t.text || ''}" placeholder="Название этапа..." data-idx="${i}" class="txt">
                        <div class="hours-wrapper">
                            <input type="text" value="${hoursDisplay}" class="hours-input" data-idx="${i}" placeholder="0">
                            <span>ч</span>
                        </div>
                        <div class="price-wrapper">
                            <input type="text" value="${priceDisplay}" class="t-price" data-idx="${i}" placeholder="0">
                            <span>₽</span>
                        </div>
                        <div class="date-input-wrapper">
                            <div class="deadline-copy">
                                <span class="title">Срок</span>
                                <span class="hint">Выбери пресет или поставь свой</span>
                            </div>
                            <button type="button" class="deadline-btn ${t.deadline?.date ? '' : 'is-empty'}" data-idx="${i}">
                                <svg class="date-icon"><use href="#icon-calendar"/></svg>
                                <span class="deadline-text">${deadlineText}</span>
                            </button>
                        </div>
                        <span class="btn-del" data-del="${i}"><i class="fa fa-trash"></i></span>
                    </div>`;
            }).join('');

            modal.innerHTML = `
                <div class="df-modal-header">
                    <strong>${projectLabel}</strong>
                    <span class="close-modal" style="cursor:pointer; font-size:24px">&times;</span>
                </div>
                <div class="df-modal-body">
                    <div id="tasks-root">${rowsHTML}</div>
                    <button class="add-task"><i class="fa fa-plus-circle"></i> Добавить этап</button>
                </div>
                <div class="df-modal-footer">
                    <span>Бюджет: <span class="total-val">${formatMoney(totalCash)}</span><span class="hours-total"> · Часы: ${formatNumber(totalHours)}</span></span>
                    <div style="display:flex; gap:10px">
                        <button class="snap-btn"><i class="fa fa-camera"></i> Скриншот</button>
                        <button class="copy-btn"><i class="fa fa-copy"></i> Текст</button>
                    </div>
                </div>`;

            const applyCalcFormatting = (el) => {
                if (typeof formatNumberInput === 'function') {
                    formatNumberInput(el);
                }
            };

            modal.querySelector('.close-modal').onclick = closeModal;
            modal.querySelector('.snap-btn').onclick = () => makeScreenshot(projectLabel, projectId, tasks);
            modal.querySelector('.copy-btn').onclick = () => {
                const textStr = tasks.map(t => {
                    let name = t.text || 'Без названия';
                    if (t.done) name = strikeText(name);
                    return `${t.done ? '🔵' : '⚪'} ${name}`;
                }).join('\n');
                navigator.clipboard?.writeText(`Проект ${projectLabel}\n${textStr}\nИтого: ${formatMoney(totalCash)}`);
                if (typeof showToast === 'function') showToast('Чек-лист скопирован');
            };

            modal.querySelector('.add-task').onclick = () => {
                tasks.push(normalizeTask({ text: '', done: false, hours: 1, price: 0, price_view: '0', deadline: { date: '', time: '' } }));
                persist();
                render();
            };

            modal.querySelectorAll('.t-price').forEach(el => {
                el.oninput = () => applyCalcFormatting(el);
                el.onblur = (e) => {
                    const idx = Number(e.target.dataset.idx);
                    const val = calculate(e.target.value);
                    tasks[idx].price = val;
                    tasks[idx].price_view = formatNumber(val);
                    persist();
                    render();
                };
            });

            modal.querySelectorAll('.hours-input').forEach(el => {
                el.oninput = () => applyCalcFormatting(el);
                el.onkeydown = (e) => { if (e.key === 'Enter') e.target.blur(); };
                el.onblur = (e) => {
                    const idx = Number(e.target.dataset.idx);
                    const val = calculate(e.target.value);
                    tasks[idx].hours = val;
                    tasks[idx].hours_view = formatNumber(val);
                    tasks[idx].time = String(val || '');
                    persist();
                    render();
                };
            });

            modal.querySelectorAll('.txt').forEach(el => {
                el.oninput = (e) => {
                    const idx = Number(e.target.dataset.idx);
                    tasks[idx].text = e.target.value;
                    persist();
                };
            });

            modal.querySelectorAll('.c-input').forEach(el => {
                el.onchange = (e) => {
                    const idx = Number(e.target.dataset.idx);
                    tasks[idx].done = e.target.checked;
                    persist();
                    render();
                };
            });

            modal.querySelectorAll('.deadline-btn').forEach(btn => {
                btn.onclick = () => openDeadlineDialog(Number(btn.dataset.idx));
            });

            modal.querySelectorAll('[data-del]').forEach(btn => {
                btn.onclick = () => {
                    tasks.splice(btn.dataset.del, 1);
                    persist();
                    render();
                };
            });

            modal.querySelectorAll('.drag-handle').forEach(handle => {
                handle.draggable = true;
                handle.addEventListener('dragstart', (e) => {
                    dragIndex = Number(handle.dataset.drag);
                    e.dataTransfer.effectAllowed = 'move';
                });
                handle.addEventListener('dragend', () => { dragIndex = null; });
            });

            modal.querySelectorAll('.task-row').forEach(row => {
                row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drag-over'); });
                row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
                row.addEventListener('drop', (e) => {
                    e.preventDefault();
                    row.classList.remove('drag-over');
                    const targetIdx = Number(row.dataset.idx);
                    if (dragIndex === null || dragIndex === targetIdx) return;
                    const [moved] = tasks.splice(dragIndex, 1);
                    tasks.splice(targetIdx, 0, moved);
                    dragIndex = null;
                    persist();
                    render();
                });
            });
        };

        render();
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        overlay.onmousedown = (e) => { if (e.target === overlay) closeModal(); };
    }

    function renderJournalButtons() {
        const isVisible = document.documentElement.classList.contains(VISIBILITY_CLASS);
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
            link.style.display = isVisible ? 'inline-flex' : 'none';
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
        if (activate && typeof renderJournalButtons === 'function') {
            renderJournalButtons();
        }
        if (activate) {
            if (typeof showToast === 'function') showToast('Режим журнала активирован');
            else alert('Режим разработчика активирован');
        }
    }

    window.addEventListener('keydown', toggleVisibilityHotkey);
})();
