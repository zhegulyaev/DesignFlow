/**
 * DesignFlow Journal: скрытые чек-листы по проектам
 * Комбинация: Ctrl + Shift + K
 */
(function() {
    'use strict';

    // 1. ОБЪЯВЛЯЕМ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
    if (typeof window.EXTRA_TASKS === 'undefined') {
        window.EXTRA_TASKS = {};
    }
    const EXTRA_TASKS = window.EXTRA_TASKS;

    const VISIBILITY_CLASS = 'journal-visible';
    const MODAL_OVERLAY_CLASS = 'df-modal-overlay';
    const HOTKEY_CODE = 'KeyK';

    // 2. БЕЗОПАСНЫЕ ОБЁРТКИ ДЛЯ ФУНКЦИЙ ИЗ app.js
    const calculate = (val) => {
        if (typeof window.toNumeric === 'function') {
            return window.toNumeric(val);
        }
        const num = parseFloat(String(val || '').replace(/\s/g, '').replace(',', '.'));
        return isNaN(num) ? 0 : num;
    };

    const formatMoney = (val) => {
        if (typeof window.formatCurrency === 'function') {
            return window.formatCurrency(val || 0);
        }
        return (val || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
    };

    const formatNumber = (val) => {
        if (typeof window.formatPlainNumber === 'function') {
            return window.formatPlainNumber(val);
        }
        return (val || '').toString();
    };

    const showToast = (msg) => {
        if (typeof window.showToast === 'function') {
            window.showToast(msg);
        } else {
            console.log('[Journal]', msg);
        }
    };

    // 3. БЕЗОПАСНЫЙ ДОСТУП К DATA
    const getData = () => {
        return (typeof window.DATA !== 'undefined' && window.DATA) ? window.DATA : {};
    };

    const saveData = () => {
        if (typeof window.save === 'function') {
            window.save();
        }
    };

    // 4. СТИЛИ
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
            grid-template-columns: 26px 34px 1fr 120px 125px minmax(230px, 260px) 28px;
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

    const strikeText = (text) => text.split('').map(char => char + '\u0336').join('');

    function getTasksMap() {
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
        saveData();
        renderJournalButtons();
    }

    function findProjectById(projectId) {
        const DATA = getData();
        const buckets = ['active', 'waiting', 'paused', 'potential', 'requests', 'archive', 'trash'];
        for (const type of buckets) {
            const list = DATA[type] || [];
            const idx = list.findIndex(p => String(p.id) === String(projectId));
            if (idx !== -1) return { item: list[idx], type, idx };
        }
        return null;
    }

    // ... ВЕСЬ ОСТАЛЬНОЙ КОД ДО КОНЦА (функции makeScreenshot, openJournal, renderJournalButtons, toggleVisibilityHotkey и т.д.) ...

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
            showToast('Режим журнала активирован');
        }
    }

    window.addEventListener('keydown', toggleVisibilityHotkey);

})();
