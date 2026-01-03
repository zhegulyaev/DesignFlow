const K = 'grok_design_v5';
const THEME_KEY = 'designflow_theme';
const THEME_OVERRIDE_KEY = 'designflow_theme_override';
const NAME_TEMPLATES_KEY = 'designflow_name_templates';
const UI_PREFS_KEY = 'designflow_ui_prefs';
const STAT_KEYS = ['fact','active-fact','paid-gross','total-gross','plan','forecast','expenses','taxes'];
const SIDE_BLOCK_KEYS = ['efficiency','record','reputation'];
const LAYOUT_BLOCK_KEYS = ['topClients','efficiency','record','reputation'];
const BLOCK_CONTAINERS = ['main','side'];
const DEFAULT_BLOCK_ORDER = {
    main: ['topClients'],
    side: ['efficiency','record','reputation']
};
let EXTRA_TASKS = {};
const DEFAULT_UI_PREFS = {
    themeMode: 'dark',
    blockVisibility: {
        backup: true,
        pace: true,
        dashboard: true,
        efficiency: true,
        topClients: true,
        record: true,
        reputation: true
    },
    blockOrder: { ...DEFAULT_BLOCK_ORDER },
    tableVisibility: {
        waiting: true,
        requests: true,
        paused: true
    },
    statVisibility: {
        goal: true,
        fact: true,
        activeFact: true,
        paidGross: true,
        totalGross: true,
        plan: true,
        forecast: true,
        expenses: true,
        taxes: true
    },
    statOrder: [...STAT_KEYS],
    sideOrder: [...SIDE_BLOCK_KEYS]
};
let UI_PREFS = JSON.parse(JSON.stringify(DEFAULT_UI_PREFS));
let autoThemeInterval = null;
const now = new Date();
const today = now.toISOString().slice(0, 10);
let currentMonth = today.slice(0,7);
let currentTab = 'active';
let settingsSnapshot = null;
let settingsInitialState = null;
const TAB_DESCRIPTIONS = {
    active: "Проекты в работе. Следите за дедлайнами и фиксируйте предоплату.",
    waiting: "Ожидают реакции клиента или материалов.",
    potential: "Лиды и переговоры. Ещё не начаты.",
    requests: "Новые заявки и обращения с каналов.",
    paused: "Замороженные проекты.",
    archive: "Успешно завершенные заказы.",
    all: "Все статусы и архив в одном месте.",
    trash: "Удаленные объекты. Хранятся 30 дней."
};

const STATUS_META = {
    active: { label: 'В работе', cls: 'active', icon: 'icon-active' },
    waiting: { label: 'Ожидает', cls: 'waiting', icon: 'icon-waiting' },
    potential: { label: 'Потенциал', cls: 'potential', icon: 'icon-potential' },
    paused: { label: 'На паузе', cls: 'paused', icon: 'icon-paused' },
    archive: { label: 'Выполнено', cls: 'archive', icon: 'icon-check' },
};

const toNumeric = (val) => {
    const cleaned = String(val || '').replace(/\s+/g, '').replace(/,/g, '.');
    if (!cleaned) return 0;

    // Поддержка короткой записи "10k/10к" для тысяч
    const normalized = cleaned.replace(/(\d*\.?\d+)[kк]/gi, '($1*1000)');

    // Разрешаем простые математические выражения (+ - * / и скобки)
    if (/[^0-9+\-*/().]/.test(normalized)) return 0;

    try {
        const result = new Function('return ' + normalized)();
        const num = typeof result === 'number' ? result : parseFloat(result);
        return isFinite(num) ? num : 0;
    } catch {
        return 0;
    }
};

function formatPlainNumber(val) {
    const raw = String(val ?? '').replace(/\s+/g, '').trim();
    if (raw === '') return '';
    const isNegative = raw.startsWith('-');
    const normalized = raw.replace(/[^\d.,]/g, '').replace(/^-/, '');
    const [intPartRaw, fracRaw] = normalized.split(/[.,]/);
    const intPart = (intPartRaw || '0').replace(/\D/g, '');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const frac = fracRaw ? fracRaw.replace(/\D/g, '') : '';
    const formatted = frac ? `${formattedInt},${frac}` : formattedInt;
    return isNegative ? `-${formatted}` : formatted;
}

function getCssVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function normalizeOrder(order, defaults) {
    const fallback = Array.isArray(defaults) ? defaults : [];
    const incoming = Array.isArray(order) ? order.filter(Boolean) : [];
    const seen = new Set();
    const result = [];
    [...incoming, ...fallback].forEach(key => {
        if (!key || seen.has(key)) return;
        seen.add(key);
        result.push(key);
    });
    return result;
}

function normalizeBlockOrder(orderMap, fallback = DEFAULT_BLOCK_ORDER) {
    const result = {};
    const seen = new Set();
    Object.keys(fallback).forEach(zone => result[zone] = []);
    Object.entries({ ...fallback, ...(orderMap || {}) }).forEach(([zone, list]) => {
        if (!result[zone]) result[zone] = [];
        (list || []).forEach(key => {
            if (!LAYOUT_BLOCK_KEYS.includes(key) || seen.has(key)) return;
            result[zone].push(key);
            seen.add(key);
        });
    });
    LAYOUT_BLOCK_KEYS.forEach(key => {
        if (seen.has(key)) return;
        const fallbackZone = fallback.main.includes(key) ? 'main' : fallback.side.includes(key) ? 'side' : Object.keys(fallback)[0];
        result[fallbackZone] = result[fallbackZone] || [];
        result[fallbackZone].push(key);
    });
    return result;
}

function generateProjectId() {
    return `p-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function ensureProjectIds() {
    const buckets = ['active', 'waiting', 'potential', 'requests', 'paused', 'archive', 'trash'];
    let changed = false;
    buckets.forEach(type => {
        DATA[type] = DATA[type] || [];
        DATA[type].forEach(item => {
            if (!item.id) {
                item.id = generateProjectId();
                changed = true;
            }
        });
    });
    return changed;
}

function loadUiPrefs() {
    try {
        const storedTheme = localStorage.getItem(THEME_KEY);
        let stored = JSON.parse(localStorage.getItem(UI_PREFS_KEY));
        if (!stored) {
            const snapshot = JSON.parse(localStorage.getItem(K) || 'null');
            stored = snapshot?.uiPrefs || null;
        }
        if (stored) {
            UI_PREFS = {
                ...DEFAULT_UI_PREFS,
                ...stored,
                blockVisibility: {
                    ...DEFAULT_UI_PREFS.blockVisibility,
                    ...(stored.blockVisibility || {})
                },
                tableVisibility: {
                    ...DEFAULT_UI_PREFS.tableVisibility,
                    ...(stored.tableVisibility || {})
                },
                statVisibility: {
                    ...DEFAULT_UI_PREFS.statVisibility,
                    ...(stored.statVisibility || {})
                },
                statOrder: normalizeOrder(stored.statOrder, STAT_KEYS),
                sideOrder: normalizeOrder(stored.sideOrder, SIDE_BLOCK_KEYS),
                blockOrder: normalizeBlockOrder(stored.blockOrder, DEFAULT_BLOCK_ORDER)
            };
            if (stored?.blockVisibility?.reputation === false && stored?.blockVisibility?.record === undefined) {
                UI_PREFS.blockVisibility.record = false;
            }
        } else {
            UI_PREFS = { ...DEFAULT_UI_PREFS };
            // FIX: Если тема не выбрана, ставим LIGHT по умолчанию
            if (!storedTheme) UI_PREFS.themeMode = 'light';
            else if (storedTheme === 'light' || storedTheme === 'dark') {
                UI_PREFS.themeMode = storedTheme;
            }
        }
    } catch (e) {
        console.warn('UI prefs load failed', e);
    }
    UI_PREFS.statOrder = normalizeOrder(UI_PREFS.statOrder, STAT_KEYS);
    UI_PREFS.sideOrder = normalizeOrder(UI_PREFS.sideOrder, SIDE_BLOCK_KEYS);
    UI_PREFS.blockOrder = normalizeBlockOrder(UI_PREFS.blockOrder, DEFAULT_BLOCK_ORDER);
    if (!UI_PREFS.themeMode) UI_PREFS.themeMode = 'light'; // FIX: страхуемся здесь тоже
    persistUiPrefs();
}

function persistUiPrefs() {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(UI_PREFS));
}

function resolveTheme(mode = UI_PREFS.themeMode, { respectOverride = true } = {}) {
    if (mode === 'light' || mode === 'dark') return mode;
    if (respectOverride) {
        const override = localStorage.getItem(THEME_OVERRIDE_KEY);
        if (override === 'light' || override === 'dark') return override;
    }
    const hour = new Date().getHours();
    return hour >= 7 && hour < 20 ? 'light' : 'dark';
}

function startAutoThemeWatcher() {
    stopAutoThemeWatcher();
    autoThemeInterval = setInterval(() => applyThemeMode('auto', { silent: true, skipSave: true, respectOverride: false }), 5 * 60 * 1000);
}

function stopAutoThemeWatcher() {
    if (autoThemeInterval) {
        clearInterval(autoThemeInterval);
        autoThemeInterval = null;
    }
}

function applyTheme(theme) {
    const isLight = theme === 'light';
    document.body.classList.toggle('light', isLight);
    const icon = document.getElementById('themeToggleIcon');
    const label = document.getElementById('themeToggleLabel');
    if (icon) {
        const use = icon.querySelector('use');
        if (use) use.setAttribute('href', isLight ? '#icon-moon' : '#icon-sun');
    }
    if (label) {
        const mode = UI_PREFS.themeMode || 'dark';
        label.textContent = mode === 'auto'
            ? (isLight ? 'Авто · Светлая' : 'Авто · Тёмная')
            : (isLight ? 'Тёмная тема' : 'Светлая тема');
    }
}

function applyThemeMode(mode, { silent = false, skipSave = false, respectOverride = true, overrideTheme } = {}) {
    UI_PREFS.themeMode = mode || 'dark';
    if (UI_PREFS.themeMode !== 'auto') {
        localStorage.removeItem(THEME_OVERRIDE_KEY);
    } else {
        if (!respectOverride) localStorage.removeItem(THEME_OVERRIDE_KEY);
        if (overrideTheme === 'light' || overrideTheme === 'dark') {
            localStorage.setItem(THEME_OVERRIDE_KEY, overrideTheme);
        }
    }
    const actual = resolveTheme(UI_PREFS.themeMode, { respectOverride });
    localStorage.setItem(THEME_KEY, actual);
    if (!skipSave) persistUiPrefs();
    applyTheme(actual);
    document.querySelectorAll('input[name="theme-mode"]').forEach(r => r.checked = r.value === UI_PREFS.themeMode);
    if (UI_PREFS.themeMode === 'auto') {
        startAutoThemeWatcher();
    } else {
        stopAutoThemeWatcher();
    }
    if (!silent && typeof calcStats === 'function') {
        calcStats();
    }
}

function toggleTheme() {
    if (UI_PREFS.themeMode === 'auto') {
        const current = resolveTheme('auto');
        const nextActual = current === 'light' ? 'dark' : 'light';
        applyThemeMode('auto', { overrideTheme: nextActual });
        return;
    }
    const next = UI_PREFS.themeMode === 'light' ? 'dark' : 'light';
    applyThemeMode(next);
}

function initTheme() {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (!localStorage.getItem(UI_PREFS_KEY) && (storedTheme === 'light' || storedTheme === 'dark')) {
        UI_PREFS.themeMode = storedTheme;
    }
    applyThemeMode(UI_PREFS.themeMode || storedTheme || 'dark', { silent: true });
    if (UI_PREFS.themeMode === 'auto') startAutoThemeWatcher();
}

function applyBlockVisibility() {
    const visibility = UI_PREFS.blockVisibility || {};
    const backup = document.getElementById('backup-panel');
    const pace = document.getElementById('pace-indicator');
    const dashboard = document.getElementById('analytics-dashboard');
    const record = document.getElementById('record-banner');
    const reputation = document.getElementById('reputation-card');
    const efficiency = document.getElementById('efficiency-card');
    const topClients = document.getElementById('top-clients-card');
    const paceDetails = document.getElementById('pace-details-btn');

    if (backup) backup.classList.toggle('is-hidden', visibility.backup === false);
    if (pace) pace.classList.toggle('is-hidden', visibility.pace === false);
    if (dashboard) dashboard.classList.toggle('is-hidden', visibility.dashboard === false);
    const hideAnalytics = visibility.dashboard === false;
    if (efficiency) efficiency.classList.toggle('is-hidden', hideAnalytics || visibility.efficiency === false);
    if (topClients) topClients.classList.toggle('is-hidden', hideAnalytics || visibility.topClients === false);
    if (record) record.classList.toggle('is-hidden', hideAnalytics || visibility.record === false);
    if (reputation) reputation.classList.toggle('is-hidden', hideAnalytics || visibility.reputation === false);
    if (paceDetails) paceDetails.classList.toggle('is-hidden', visibility.reputation === false || hideAnalytics);
}

function updateSettingsPreviewStates() {
    document.querySelectorAll('.block-setting').forEach(block => {
        const toggle = block.querySelector('input[type="checkbox"]');
        const enabled = toggle ? toggle.checked !== false : true;
        block.classList.toggle('is-off', !enabled);
    });
}

function applyStatVisibility() {
    const visibility = UI_PREFS.statVisibility || {};
    document.querySelectorAll('[data-stat]').forEach(el => {
        const key = el.getAttribute('data-stat');
        const camelKey = key.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
        const enabled = (visibility[key] ?? visibility[camelKey] ?? true) !== false;
        el.classList.toggle('is-hidden', !enabled);
    });
    const goal = document.getElementById('goal-progress');
    const goalPill = document.getElementById('goal-pill');
    if (goal) goal.classList.toggle('is-hidden', visibility.goal === false);
    if (goalPill) goalPill.classList.toggle('is-hidden', visibility.goal === false);
}

function applyStatOrder() {
    const grid = document.querySelector('.stats-grid');
    if (!grid) return;
    UI_PREFS.statOrder = normalizeOrder(UI_PREFS.statOrder, STAT_KEYS);
    const map = Object.fromEntries([...grid.children].map(el => [el.getAttribute('data-stat'), el]));
    UI_PREFS.statOrder.forEach(key => {
        if (map[key]) grid.appendChild(map[key]);
    });
}

function applyBlockOrder() {
    const containers = Object.fromEntries([...document.querySelectorAll('[data-block-container]')]
        .map(el => [el.getAttribute('data-block-container'), el]));
    UI_PREFS.blockOrder = normalizeBlockOrder(UI_PREFS.blockOrder, DEFAULT_BLOCK_ORDER);
    const lookup = Object.fromEntries([...document.querySelectorAll('[data-block-key]')]
        .map(el => [el.getAttribute('data-block-key'), el]));
    BLOCK_CONTAINERS.forEach(zone => {
        const container = containers[zone];
        if (!container) return;
        UI_PREFS.blockOrder[zone].forEach(key => {
            if (lookup[key]) {
                container.appendChild(lookup[key]);
            }
        });
    });
}

let layoutEditMode = false;
let draggingStat = null;
let draggingBlock = null;
let dragPreview = null;
let layoutEditSnapshot = null;

function createEditControls(type, key) {
    const wrap = document.createElement('div');
    wrap.className = 'edit-controls';
    const handle = document.createElement('span');
    handle.className = 'edit-handle';
    handle.innerHTML = '<svg class="btn-icon lg"><use href="#icon-grip"/></svg>';
    handle.title = 'Переместить блок';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'edit-remove';
    remove.title = 'Скрыть блок';
    remove.innerHTML = '<svg aria-hidden="true" class="btn-icon"><use href="#icon-trash"/></svg>';
    remove.onclick = (e) => {
        e.stopPropagation();
        hideEditableBlock(type, key);
    };
    wrap.appendChild(handle);
    wrap.appendChild(remove);
    return wrap;
}

function hideEditableBlock(type, key) {
    if (type === 'stat') {
        UI_PREFS.statVisibility[key] = false;
        applyStatVisibility();
    } else {
        UI_PREFS.blockVisibility[key] = false;
        applyBlockVisibility();
    }
    persistUiPrefs();
}

function setupEditableBlocks() {
    document.querySelectorAll('[data-stat]').forEach(el => {
        const key = el.getAttribute('data-stat');
        el.setAttribute('draggable', layoutEditMode ? 'true' : 'false');
        el.removeEventListener('dragstart', onStatDragStart);
        el.removeEventListener('dragover', onStatDragOver);
        el.removeEventListener('dragleave', onStatDragLeave);
        el.removeEventListener('drop', onStatDrop);
        if (layoutEditMode) {
            el.addEventListener('dragstart', onStatDragStart);
            el.addEventListener('dragover', onStatDragOver);
            el.addEventListener('dragleave', onStatDragLeave);
            el.addEventListener('drop', onStatDrop);
        }
        if (!el.dataset.controlsReady) {
            const controls = createEditControls('stat', key);
            el.appendChild(controls);
            const hint = document.createElement('div');
            hint.className = 'edit-hint';
            hint.textContent = 'Тяни, чтобы переставить';
            el.appendChild(hint);
            el.dataset.controlsReady = '1';
        }
    });

    document.querySelectorAll('[data-block-key]').forEach(el => {
        const key = el.getAttribute('data-block-key');
        el.dataset.editable = el.dataset.editable || 'block';
        const canDragBlock = LAYOUT_BLOCK_KEYS.includes(key);
        el.setAttribute('draggable', layoutEditMode && canDragBlock ? 'true' : 'false');
        const handle = el.querySelector('.edit-handle');
        if (handle) handle.style.display = canDragBlock && layoutEditMode ? 'inline-flex' : 'none';
        el.removeEventListener('dragstart', onBlockDragStart);
        el.removeEventListener('dragend', onBlockDragEnd);
        el.removeEventListener('dragover', onBlockDragOverBlock);
        el.removeEventListener('dragleave', onBlockDragLeaveBlock);
        el.removeEventListener('drop', onBlockDropOnBlock);
        if (!el.dataset.controlsReady) {
            const controls = createEditControls('block', key);
            el.appendChild(controls);
            el.dataset.controlsReady = '1';
        }
        if (layoutEditMode && canDragBlock) {
            el.addEventListener('dragstart', onBlockDragStart);
            el.addEventListener('dragend', onBlockDragEnd);
            el.addEventListener('dragover', onBlockDragOverBlock);
            el.addEventListener('dragleave', onBlockDragLeaveBlock);
            el.addEventListener('drop', onBlockDropOnBlock);
        }
    });

    document.querySelectorAll('[data-block-container]').forEach(container => {
        container.removeEventListener('dragover', onBlockDragOverContainer);
        container.removeEventListener('dragleave', onBlockDragLeaveContainer);
        container.removeEventListener('drop', onBlockDropOnContainer);
        if (layoutEditMode) {
            container.addEventListener('dragover', onBlockDragOverContainer);
            container.addEventListener('dragleave', onBlockDragLeaveContainer);
            container.addEventListener('drop', onBlockDropOnContainer);
        }
    });

    document.body.classList.toggle('layout-edit', layoutEditMode);
    updateLayoutEditButton();
}

function onStatDragStart(e) {
    if (!layoutEditMode) return e.preventDefault();
    draggingStat = e.currentTarget.getAttribute('data-stat');
    e.dataTransfer.effectAllowed = 'move';
}

function onStatDragOver(e) {
    if (!layoutEditMode || !draggingStat) return;
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function onStatDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function onStatDrop(e) {
    if (!layoutEditMode || !draggingStat) return;
    e.preventDefault();
    const targetKey = e.currentTarget.getAttribute('data-stat');
    e.currentTarget.classList.remove('drag-over');
    if (draggingStat === targetKey) return;
    const order = normalizeOrder(UI_PREFS.statOrder, STAT_KEYS);
    const fromIdx = order.indexOf(draggingStat);
    const toIdx = order.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, draggingStat);
    UI_PREFS.statOrder = order;
    applyStatOrder();
    persistUiPrefs();
}

function getBlockContainerKey(el) {
    const container = el ? el.closest('[data-block-container]') : null;
    return container ? container.getAttribute('data-block-container') : null;
}

function createDragPreview(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.edit-controls, .edit-hint').forEach(n => n.remove());
    const rect = el.getBoundingClientRect();
    clone.style.width = `${rect.width}px`;
    clone.style.maxWidth = `${rect.width}px`;
    clone.style.height = `${Math.min(rect.height, 260)}px`;
    clone.style.maxHeight = `${Math.min(rect.height, 260)}px`;
    clone.style.margin = '0';
    clone.style.overflow = 'hidden';
    clone.style.borderRadius = '14px';
    clone.classList.add('drag-ghost');
    document.body.appendChild(clone);
    return clone;
}

function clearBlockDragState() {
    document.querySelectorAll('.drag-over, .block-drop-target').forEach(el => {
        el.classList.remove('drag-over');
        el.classList.remove('block-drop-target');
    });
    if (dragPreview?.parentNode) dragPreview.remove();
    if (draggingBlock?.el) draggingBlock.el.classList.remove('dragging');
    draggingBlock = null;
    dragPreview = null;
}

function onBlockDragStart(e) {
    if (!layoutEditMode) return e.preventDefault();
    const block = e.currentTarget;
    const key = block.getAttribute('data-block-key');
    draggingBlock = { key, el: block, from: getBlockContainerKey(block) };
    block.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
    dragPreview = createDragPreview(block);
    e.dataTransfer.setDragImage(dragPreview, dragPreview.offsetWidth / 2, dragPreview.offsetHeight / 2);
}

function onBlockDragEnd() {
    clearBlockDragState();
}

function onBlockDragOverBlock(e) {
    if (!layoutEditMode || !draggingBlock) return;
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function onBlockDragLeaveBlock(e) {
    e.currentTarget.classList.remove('drag-over');
}

function onBlockDragOverContainer(e) {
    if (!layoutEditMode || !draggingBlock) return;
    e.preventDefault();
    e.currentTarget.classList.add('block-drop-target');
}

function onBlockDragLeaveContainer(e) {
    e.currentTarget.classList.remove('block-drop-target');
}

function moveBlockTo(zone, beforeKey = null) {
    if (!draggingBlock || !zone || !BLOCK_CONTAINERS.includes(zone)) return;
    const key = draggingBlock.key;
    const order = normalizeBlockOrder(UI_PREFS.blockOrder, DEFAULT_BLOCK_ORDER);
    Object.keys(order).forEach(k => {
        order[k] = order[k].filter(item => item !== key);
    });
    order[zone] = order[zone] || [];
    if (beforeKey && order[zone].includes(beforeKey)) {
        const idx = order[zone].indexOf(beforeKey);
        order[zone].splice(idx, 0, key);
    } else {
        order[zone].push(key);
    }
    UI_PREFS.blockOrder = normalizeBlockOrder(order, DEFAULT_BLOCK_ORDER);
    applyBlockOrder();
    persistUiPrefs();
}

function onBlockDropOnBlock(e) {
    if (!layoutEditMode || !draggingBlock) return;
    e.preventDefault();
    const target = e.currentTarget;
    const targetKey = target.getAttribute('data-block-key');
    const zone = getBlockContainerKey(target);
    target.classList.remove('drag-over');
    if (zone && draggingBlock.key !== targetKey) {
        moveBlockTo(zone, targetKey);
    }
    clearBlockDragState();
}

function onBlockDropOnContainer(e) {
    if (!layoutEditMode || !draggingBlock) return;
    e.preventDefault();
    const zone = e.currentTarget.getAttribute('data-block-container');
    e.currentTarget.classList.remove('block-drop-target');
    if (zone) moveBlockTo(zone, null);
    clearBlockDragState();
}

function toggleLayoutEditMode() {
    layoutEditMode = !layoutEditMode;
    layoutEditSnapshot = layoutEditMode ? JSON.parse(JSON.stringify(UI_PREFS)) : null;
    setupEditableBlocks();
    if (!layoutEditMode) {
        clearBlockDragState();
    }
}

function updateLayoutEditButton() {
    const iconUse = document.querySelector('#layoutEditIcon use');
    const label = document.getElementById('layoutEditLabel');
    const cancelBtn = document.getElementById('layoutEditCancel');
    if (iconUse) iconUse.setAttribute('href', layoutEditMode ? '#icon-check' : '#icon-pen');
    if (label) label.textContent = layoutEditMode ? 'Готово' : 'Редактировать блоки';
    if (cancelBtn) cancelBtn.style.display = layoutEditMode ? 'flex' : 'none';
}

function cancelLayoutEditMode() {
    if (!layoutEditMode) return;
    if (layoutEditSnapshot) {
        UI_PREFS = JSON.parse(JSON.stringify(layoutEditSnapshot));
        persistUiPrefs();
        applyBlockOrder();
        applyBlockVisibility();
        applyTableVisibility();
        applyStatOrder();
        applyStatVisibility();
    }
    layoutEditMode = false;
    clearBlockDragState();
    setupEditableBlocks();
    layoutEditSnapshot = null;
}

function activateSettingsPane(pane) {
    document.querySelectorAll('.settings-nav-btn').forEach(btn => {
        const target = btn.getAttribute('data-target');
        btn.classList.toggle('active', target === pane);
    });
    document.querySelectorAll('.settings-pane').forEach(p => {
        const target = p.getAttribute('data-pane');
        p.classList.toggle('active', target === pane);
    });
}

function isTableEnabled(key) {
    const visibility = UI_PREFS.tableVisibility || {};
    return visibility[key] !== false;
}

function getEnabledTabs() {
    return ['all','active','waiting','potential','requests','paused','archive','trash'].filter(tab => {
        if (['waiting','requests','paused'].includes(tab)) return isTableEnabled(tab);
        return true;
    });
}

function applyTableVisibility() {
    ['waiting','requests','paused'].forEach(key => {
        const tabEl = document.getElementById(`tab-${key}`);
        const viewEl = document.getElementById(`view-${key}`);
        const enabled = isTableEnabled(key);
        if (tabEl) tabEl.classList.toggle('is-hidden', !enabled);
        if (viewEl) viewEl.style.display = enabled ? (currentTab === key ? 'block' : 'none') : 'none';
    });
    updateBulkMoveOptions();
    updateStatusSelectOptions();
    const available = getEnabledTabs();
    if (!available.includes(currentTab) && available.length) {
        const fallback = available.includes('active') ? 'active' : available[0];
        if (fallback !== currentTab) switchTab(fallback);
    }
}

function updateBulkMoveOptions() {
    const select = document.getElementById('bulkMoveSelect');
    if (!select) return;
    const visibility = UI_PREFS.tableVisibility || {};
    Array.from(select.options).forEach(opt => {
        if (['waiting','paused','requests'].includes(opt.value)) {
            const enabled = visibility[opt.value] !== false;
            opt.hidden = !enabled;
        }
    });
    if (select.selectedOptions.length && select.selectedOptions[0].hidden) {
        select.value = '';
    }
}

function updateStatusSelectOptions() {
    const visibility = UI_PREFS.tableVisibility || {};
    const select = document.getElementById('add-proj-type');
    if (select) {
        Array.from(select.options).forEach(opt => {
            if (['waiting','paused','requests'].includes(opt.value)) {
                opt.hidden = visibility[opt.value] === false;
            }
        });
        if (select.selectedOptions.length && select.selectedOptions[0].hidden) {
            select.value = 'active';
            handleStatusChange('active');
        }
    }
}

function toggleScrollDirection() {
    const btn = document.getElementById('scrollToggle');
    if (!btn) return;
    const dir = btn.dataset.dir || 'down';
    if (dir === 'down') {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateScrollToggle() {
    const btn = document.getElementById('scrollToggle');
    if (!btn) return;
    const nearTop = window.scrollY < 120;
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 160;
    const iconId = nearTop ? '#icon-arrow-down' : '#icon-arrow-up';
    btn.innerHTML = `<svg><use href="${iconId}"/></svg>`;
    btn.dataset.dir = nearTop ? 'down' : 'up';
    btn.setAttribute('aria-label', nearTop ? 'Прокрутить вниз' : 'Вернуться наверх');
    btn.style.display = nearTop && nearBottom ? 'none' : 'grid';
}

let scrollbarVisibilityTimer = null;
function showScrollbarsTemporarily() {
    document.body.classList.add('show-scrollbars');
    clearTimeout(scrollbarVisibilityTimer);
    scrollbarVisibilityTimer = setTimeout(() => document.body.classList.remove('show-scrollbars'), 900);
}

function setupScrollbarAutoHide() {
    document.addEventListener('scroll', showScrollbarsTemporarily, true);
    document.addEventListener('wheel', showScrollbarsTemporarily, { passive: true });
}

function formatNumberInput(inputEl) {
    if (!inputEl) return;

    // Инициализация состояния для таймера калькулятора
    if (!inputEl.__calcState) {
        inputEl.__calcState = { timeout: null };

        const applyCalculation = () => {
            const raw = String(inputEl.value || '').replace(/\s+/g, '').replace(/,/g, '.');
            if (!raw || /[^0-9+\-*/().kк]/i.test(raw)) return;
            const result = toNumeric(raw);
            if (result !== undefined && isFinite(result)) {
                inputEl.value = formatPlainNumber(result);
            }
        };

        inputEl.addEventListener('blur', applyCalculation);
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                applyCalculation();
                inputEl.blur();
            }
        });
    }

    const val = String(inputEl.value || '');
    const state = inputEl.__calcState;

    // Если пользователь вводит выражение, оставляем операторы и считаем позже
    if (/[+\-*/]/.test(val)) {
        const cleaned = val.replace(/[^0-9+\-*/().,kк]/gi, '');
        inputEl.value = cleaned;
        clearTimeout(state.timeout);
        state.timeout = setTimeout(() => {
            if (document.activeElement === inputEl) return;
            state.timeout = null;
            inputEl.dispatchEvent(new Event('blur'));
        }, 1000);
        return;
    }

    const numeric = toNumeric(val.replace(/\s+/g, '').replace(/,/g, '.'));
    inputEl.value = val ? formatPlainNumber(numeric) : '';
}

const DEFAULT_NAME_TEMPLATES = [
    'Оформление группы ВКонтакте',
    'Дизайн баннеров',
    'Дизайн карточки ВБ',
    'Дизайн логотипа',
    'Дизайн лендинга'
];
const TEMPLATE_HELPER_DEFAULT = 'Введите название проекта, затем сохраните как шаблон.';

let NAME_TEMPLATES = [...DEFAULT_NAME_TEMPLATES];
let draggedTemplate = null;
let draggedTemplateIndex = null;
let activeTemplateSelection = '';

function loadNameTemplates() {
    try {
        const raw = localStorage.getItem(NAME_TEMPLATES_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) NAME_TEMPLATES = parsed;
        }
    } catch(e) { console.warn('Template load failed', e); }
    refreshTemplateSelects();
}

function refreshTemplateSelects() {
    const list = document.getElementById('project-name-templates');
    if (!list) return;
    list.innerHTML = NAME_TEMPLATES.map(t=>`<option value="${t}">`).join('');
    renderTemplatePills();
    renderTemplateManagerList();
}

function persistNameTemplates() {
    localStorage.setItem(NAME_TEMPLATES_KEY, JSON.stringify(NAME_TEMPLATES.slice(0, 20)));
    save();
}

function setTemplateHelper(message, state = '', autoReset = false) {
    const helper = document.getElementById('template-helper');
    if (!helper) return;
    if (templateHelperTimeout) { clearTimeout(templateHelperTimeout); templateHelperTimeout = null; }
    helper.textContent = message;
    helper.classList.remove('error', 'success');
    if (state) helper.classList.add(state);
    if (autoReset) {
        templateHelperTimeout = setTimeout(() => {
            helper.textContent = TEMPLATE_HELPER_DEFAULT;
            helper.classList.remove('error', 'success');
        }, 3200);
    }
}

function setTemplateManagerHelper(message, state = '') {
    const helper = document.getElementById('template-manager-helper');
    if (!helper) return;
    helper.textContent = message;
    helper.classList.remove('error', 'success');
    if (state) helper.classList.add(state);
}

function renderTemplatePills() {
    const pills = document.getElementById('saved-template-pills');
    if (!pills) return;
    if (!NAME_TEMPLATES.length) {
        pills.innerHTML = '<span style="color: var(--muted);">Шаблонов пока нет</span>';
        pills.classList.remove('can-scroll', 'scrolled', 'scroll-end');
        return;
    }
    pills.innerHTML = NAME_TEMPLATES.map(t => {
        const safe = t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const safeArg = t.replace(/'/g,"\\'");
        return `
        <span class="template-pill" draggable="true"
            ondragstart="onTemplateDragStart('${safeArg}')"
            ondragover="onTemplateDragOver(event, '${safeArg}')"
            ondragleave="onTemplateDragLeave(event)"
            ondrop="onTemplateDrop(event, '${safeArg}')"
            ondragend="onTemplateDragEnd()">
            <button class="template-fill-btn" type="button" onclick="applyNameTemplate('${safeArg}')">${safe}</button>
            <button aria-label="Удалить шаблон" class="template-delete-btn" onclick="deleteNameTemplate('${safeArg}')">×</button>
        </span>`;
    }).join('');
    attachTemplateScrollHandler(pills);
    updateTemplateScrollState(pills);
}

function renderTemplateManagerList() {
    const list = document.getElementById('template-manager-list');
    if (!list) return;
    if (!NAME_TEMPLATES.length) {
        list.innerHTML = '<div class="template-empty">Шаблонов пока нет. Создайте первый через кнопку «Создать шаблон».</div>';
        return;
    }
    const currentName = (document.getElementById('add-proj-name')?.value || '').trim();
    list.innerHTML = NAME_TEMPLATES.map((t, idx) => {
        const safe = t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        const safeArg = t.replace(/'/g,"\\'");
        const isSelected = currentName === t || activeTemplateSelection === t;
        const rowClass = isSelected ? 'template-row selected' : 'template-row';
        const selectBtnClass = isSelected ? 'template-select-btn is-active' : 'template-select-btn';
        return `
        <div class="${rowClass}" draggable="true"
            ondragstart="templateRowDragStart(${idx})"
            ondragover="templateRowDragOver(event, ${idx})"
            ondragleave="templateRowDragLeave(event)"
            ondrop="templateRowDrop(event, ${idx})"
            ondragend="templateRowDragEnd()">
            <span class="template-drag-handle">≡</span>
            <button class="${selectBtnClass}" type="button" onclick="selectTemplateFromManager('${safeArg}')">✓</button>
            <input type="text" value="${safe}" onblur="commitTemplateEdit(${idx}, this)" aria-label="Название шаблона">
            <button aria-label="Удалить шаблон" class="template-delete-btn" onclick="deleteNameTemplate('${safeArg}')">×</button>
        </div>`;
    }).join('');
}

function toggleProjectNameClear() {
    const input = document.getElementById('add-proj-name');
    const btn = document.getElementById('project-name-clear');
    if (!input || !btn) return;
    const hasValue = !!input.value.trim();
    btn.classList.toggle('hidden', !hasValue);
}

function clearProjectName() {
    const input = document.getElementById('add-proj-name');
    if (!input) return;
    input.value = '';
    toggleProjectNameClear();
    input.focus();
}

function applyNameTemplate(val) {
    if (!val) return;
    const input = document.getElementById('add-proj-name');
    if (input) {
        input.value = val;
        input.focus();
        toggleProjectNameClear();
        activeTemplateSelection = val;
        setTemplateHelper('Шаблон подставлен в поле.', 'success', true);
    }
}

function saveNameTemplate() {
    const input = document.getElementById('add-proj-name');
    if (!input) return;
    const val = input.value.trim();
    if (!val) {
        input.classList.add('input-error');
        setTemplateHelper('Введите название, чтобы сохранить шаблон.', 'error');
        input.focus();
        return;
    }
    if (!NAME_TEMPLATES.includes(val)) {
        NAME_TEMPLATES.unshift(val);
        persistNameTemplates();
        refreshTemplateSelects();
        showToast('Шаблон сохранен');
        setTemplateHelper('Шаблон сохранен и добавлен в список.', 'success', true);
        setTemplateManagerHelper('Шаблон добавлен в список.', 'success');
    } else {
        setTemplateHelper('Такой шаблон уже есть в списке.', '');
    }
}

function addTemplateFromModal() {
    const input = document.getElementById('template-manager-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) {
        setTemplateManagerHelper('Введите название, чтобы сохранить шаблон.', 'error');
        input.focus();
        return;
    }
    if (!NAME_TEMPLATES.includes(val)) {
        NAME_TEMPLATES.unshift(val);
        persistNameTemplates();
        refreshTemplateSelects();
        setTemplateManagerHelper('Шаблон сохранен и добавлен в список.', 'success');
    } else {
        setTemplateManagerHelper('Такой шаблон уже есть в списке.', 'error');
    }
    applyNameTemplate(val);
    renderTemplateManagerList();
    input.value = '';
}

function deleteNameTemplate(val) {
    NAME_TEMPLATES = NAME_TEMPLATES.filter(t => t !== val);
    if (activeTemplateSelection === val) activeTemplateSelection = '';
    persistNameTemplates();
    refreshTemplateSelects();
}

function onTemplateDragStart(val) {
    draggedTemplate = val;
}

function onTemplateDragOver(event, targetVal) {
    event.preventDefault();
    if (!draggedTemplate || draggedTemplate === targetVal) return;
    event.currentTarget.classList.add('drag-over');
}

function onTemplateDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

function onTemplateDrop(event, targetVal) {
    event.preventDefault();
    const fromIdx = NAME_TEMPLATES.indexOf(draggedTemplate);
    const toIdx = NAME_TEMPLATES.indexOf(targetVal);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    NAME_TEMPLATES.splice(fromIdx, 1);
    NAME_TEMPLATES.splice(toIdx, 0, draggedTemplate);
    persistNameTemplates();
    refreshTemplateSelects();
}

function onTemplateDragEnd() {
    draggedTemplate = null;
    document.querySelectorAll('.template-pill.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function templateRowDragStart(idx) {
    draggedTemplateIndex = idx;
}

function templateRowDragOver(event, idx) {
    if (draggedTemplateIndex === null || draggedTemplateIndex === idx) return;
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function templateRowDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

function templateRowDrop(event, idx) {
    event.preventDefault();
    if (draggedTemplateIndex === null || draggedTemplateIndex === idx) return;
    const [moved] = NAME_TEMPLATES.splice(draggedTemplateIndex, 1);
    NAME_TEMPLATES.splice(idx, 0, moved);
    draggedTemplateIndex = null;
    persistNameTemplates();
    refreshTemplateSelects();
    renderTemplateManagerList();
}

function templateRowDragEnd() {
    draggedTemplateIndex = null;
    document.querySelectorAll('.template-row.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function commitTemplateEdit(idx, inputEl) {
    if (!inputEl || idx < 0 || idx >= NAME_TEMPLATES.length) return;
    const val = inputEl.value.trim();
    if (!val) {
        inputEl.value = NAME_TEMPLATES[idx];
        return;
    }
    const duplicateIdx = NAME_TEMPLATES.findIndex((t, i) => t === val && i !== idx);
    if (duplicateIdx !== -1) {
        inputEl.value = NAME_TEMPLATES[idx];
        setTemplateHelper('Такой шаблон уже есть в списке.', '');
        return;
    }
    NAME_TEMPLATES[idx] = val;
    persistNameTemplates();
    refreshTemplateSelects();
    renderTemplateManagerList();
}

function openTemplateManagerModal() {
    const modal = document.getElementById('templateManagerModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const inlineInput = document.getElementById('add-proj-name');
    const modalInput = document.getElementById('template-manager-input');
    if (modalInput && inlineInput) modalInput.value = inlineInput.value.trim();
    setTemplateManagerHelper('Добавьте новый шаблон или выберите его ниже.');
    renderTemplateManagerList();
}

function closeTemplateManagerModal() {
    document.getElementById('templateManagerModal').style.display = 'none';
}

function selectTemplateFromManager(val) {
    applyNameTemplate(val);
    closeTemplateManagerModal();
    renderTemplateManagerList();
    setTemplateManagerHelper('Шаблон выбран.', 'success');
}

function attachTemplateScrollHandler(pills) {
    if (!pills || pills.dataset.scrollBound) return;
    const handler = () => updateTemplateScrollState(pills);
    pills.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    pills.dataset.scrollBound = '1';
}

function updateTemplateScrollState(pills) {
    if (!pills) return;
    const hasOverflow = pills.scrollWidth > pills.clientWidth + 2;
    const atStart = pills.scrollLeft <= 4;
    const atEnd = pills.scrollLeft + pills.clientWidth >= pills.scrollWidth - 4;
    pills.classList.toggle('can-scroll', hasOverflow);
    pills.classList.toggle('scrolled', hasOverflow && !atStart);
    pills.classList.toggle('scroll-end', hasOverflow && atEnd);
}

function handleNewContractorModeChange(mode) {
    const input = document.getElementById('add-proj-contractor');
    const helper = document.getElementById('add-contractor-helper');
    const wrapper = document.getElementById('contractor-amount-wrap');
    const suffix = document.getElementById('contractor-suffix');
    if (!input || !helper || !wrapper || !suffix) return;
    const showInput = mode !== 'none';
    wrapper.classList.toggle('is-hidden', !showInput);
    helper.textContent = '';
    helper.classList.add('is-hidden');
    input.disabled = !showInput;
    if (!showInput) {
        input.value = '';
        suffix.textContent = '';
        return;
    }
    const isPercent = mode === 'percent';
    input.placeholder = isPercent ? 'Например, 20' : 'Например, 30 000';
    suffix.textContent = isPercent ? '%' : '₽';
    input.focus();
}

let DATA = {
    settings: { record: 0 },
    monthlyGoals: { [currentMonth]: 250000 },
    active: [], archive: [], paused: [], waiting: [], potential: [], requests: [], trash: []
};

let SORT = { active: 'dl', archive: 'date', potential: 'p', waiting: 'p', paused: 'dl', requests: 'created' };
let queue = { type: null, idx: null, field: null, targetId: null };
let previousDeadlineValue = '';
let deadlineUnset = false;
let editContext = null;
let toastTimeout = null;
let templateHelperTimeout = null;
let lastPermanentDeletion = null;
let lastTrashMove = null;
let completionContext = null;
let projectFormSnapshot = null;
let newProjectLink = '';
let newProjectLinkTitle = '';
let lastFetchedLinkForTitle = '';
let datePicker = null;
let timePicker = null;

function buildBackupSnapshot() {
    return {
        version: 2,
        data: DATA,
        extraTasks: EXTRA_TASKS,
        uiPrefs: UI_PREFS,
        nameTemplates: NAME_TEMPLATES,
        theme: UI_PREFS.themeMode
    };
}

function showToast(message, actionText = '', actionHandler = null, duration = 3500) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    const actionBtn = document.getElementById('toast-action');

    msgEl.textContent = message;

    if (actionText && actionHandler) {
        actionBtn.textContent = actionText;
        actionBtn.style.display = 'inline-flex';
        actionBtn.onclick = () => { actionHandler(); hideToast(); };
    } else {
        actionBtn.style.display = 'none';
        actionBtn.onclick = null;
    }

    toast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => hideToast(), duration);
}

function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = null;
}

function undoPermanentDelete() {
    if (!lastPermanentDeletion) return;

    const entries = Array.isArray(lastPermanentDeletion) ? lastPermanentDeletion : [lastPermanentDeletion];

    entries.forEach(({ type, items }) => {
        const targetList = DATA[type];
        if (!Array.isArray(targetList) || !Array.isArray(items)) return;

        items
            .slice()
            .sort((a, b) => a.index - b.index)
            .forEach(({ item, index }) => {
                targetList.splice(index, 0, item);
            });
    });

    lastPermanentDeletion = null;
    save();
    upd();
    showToast('Удаление отменено');
}

function undoMoveToTrash() {
    if (!lastTrashMove) return;

    const entries = Array.isArray(lastTrashMove) ? lastTrashMove : [lastTrashMove];

    entries.forEach(({ type, items }) => {
        if (!Array.isArray(DATA[type]) || !Array.isArray(items)) return;

        items
            .slice()
            .sort((a, b) => a.index - b.index)
            .forEach(({ item, index }) => {
                const trashIndex = DATA.trash.indexOf(item);
                if (trashIndex > -1) DATA.trash.splice(trashIndex, 1);
                delete item.deletedAt;
                DATA[type].splice(Math.max(0, Math.min(index, DATA[type].length)), 0, item);
            });
    });

    lastTrashMove = null;
    save();
    upd();
    showToast('Удаление отменено');
}

// --- BULK ACTIONS ---
let selectedRows = {}; // {active: Set(), waiting: Set(), ...}
const TRASH_RETENTION_DAYS = 30;

function renderLinkControls(item, idx, type) {
    const hasLink = !!item.link;
    const editBtn = `<button class="link-btn ${hasLink ? 'link-btn-active' : ''}" onclick="openLink('${type}',${idx})" title="${hasLink ? 'Изменить ссылку' : 'Добавить ссылку'}"><svg><use href="#icon-link"/></svg></button>`;
    const goBtn = hasLink ? `<button class="link-btn link-btn-go" onclick="openProjectLink(${idx}, '${type}')" title="Открыть ссылку"><svg><use href="#icon-external"/></svg></button>` : '';
    return editBtn + goBtn;
}

function normalizeLinkValue(raw, isTelegram = false) {
    let url = (raw || '').trim();
    const isTg = isTelegram || url.startsWith('@') || url.match(/t\.me\//);

    if (isTg) {
        url = url.replace(/^https?:\/\/t\.me\//, '').replace(/^@+/, '');
        return url ? `https://t.me/${url}` : '';
    }

    if (url && !url.match(/^(https?:\/\/|mailto:)/)) {
        url = 'https://' + url;
    }

    return url;
}

function getClientNameClass(item) {
    return `client-name${item.link ? ' has-link' : ''}`;
}

function toggleSelect(type, idx, checkbox) {
    if (!selectedRows[type]) selectedRows[type] = new Set();
    const row = checkbox.closest('tr');
    const indexStr = type === 'all' ? (checkbox.dataset.key || idx.toString()) : idx.toString();

    if (checkbox.checked) {
        selectedRows[type].add(indexStr);
        if (row) row.classList.add('row-selected');
    } else {
        selectedRows[type].delete(indexStr);
        if (row) row.classList.remove('row-selected');
    }
    updateBulkToolbar(type);

    const totalRows = type === 'all' ? document.querySelectorAll('#t-all tbody tr').length : DATA[type].length;
    const allChecked = selectedRows[type].size === totalRows && totalRows > 0;
    const selectAllCheckbox = document.getElementById(`selectAll${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if(selectAllCheckbox) selectAllCheckbox.checked = allChecked;
}

function toggleSelectAll(type) {
    const selectAllCheckbox = document.getElementById(`selectAll${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (!selectAllCheckbox) return;

    const isChecked = selectAllCheckbox.checked;
    const checkboxes = document.querySelectorAll(`#t-${type} tbody .bulk-checkbox`);

    if (!selectedRows[type]) selectedRows[type] = new Set();
    
    checkboxes.forEach((cb, i) => {
        cb.checked = isChecked;
        const row = cb.closest('tr');
        const indexStr = type === 'all' ? (cb.dataset.key || row?.dataset.index) : row?.dataset.index;
        if (row && indexStr) {
            row.classList.toggle('row-selected', isChecked);
            if (isChecked) {
                selectedRows[type].add(indexStr);
            } else {
                selectedRows[type].delete(indexStr);
            }
        }
    });
    updateBulkToolbar(type);
}

function toggleFooterSelection(type) {
    if (type !== 'all' && !DATA[type]) return;
    const rows = document.querySelectorAll(`#t-${type} tbody tr`);
    const totalRows = rows.length;
    if (!selectedRows[type]) selectedRows[type] = new Set();
    if (totalRows === 0) { clearSelection(type); return; }

    const shouldSelectAll = selectedRows[type].size !== totalRows;
    const checkboxes = document.querySelectorAll(`#t-${type} tbody .bulk-checkbox`);

    if (checkboxes.length > 0) {
        checkboxes.forEach(cb => {
            cb.checked = shouldSelectAll;
            const row = cb.closest('tr');
            if (row && row.dataset.index) {
                const indexStr = row.dataset.index;
                row.classList.toggle('row-selected', shouldSelectAll);
                if (shouldSelectAll) {
                    selectedRows[type].add(indexStr);
                } else {
                    selectedRows[type].delete(indexStr);
                }
            }
        });
    } else {
        rows.forEach(row => {
            const indexStr = type === 'all' ? row.dataset.index : row.dataset.index;
            row.classList.toggle('row-selected', shouldSelectAll);
            if (indexStr) {
                if (shouldSelectAll) {
                    selectedRows[type].add(indexStr);
                } else {
                    selectedRows[type].delete(indexStr);
                }
            }
        });
    }

    const selectAllCheckbox = document.getElementById(`selectAll${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (selectAllCheckbox) selectAllCheckbox.checked = shouldSelectAll;
    updateBulkToolbar(type);
}

function updateBulkToolbar(type) {
    const count = selectedRows[type] ? selectedRows[type].size : 0;
    const toolbar = document.getElementById('bulkToolbar');
    
    document.getElementById('bulkCount').textContent = `${count} выбрано`;
    document.getElementById('bulkMoveSelect').value = ''; 

    toolbar.style.display = count > 0 ? 'flex' : 'none';
}

function attachRowSelection(tr, type, idx, checkboxId) {
    tr.addEventListener('click', (e) => {
        if (e.target.closest('input, select, button, .action-btn-base, .del-btn, .date-input-wrap, .dup-icon, [contenteditable], .trash-action-btns, .link-btn, .inline-link-btn')) return;
        const checkbox = document.getElementById(checkboxId);
        if (!checkbox) return;
        checkbox.checked = !checkbox.checked;
        toggleSelect(type, idx, checkbox);
    });
}

function clearSelection(type = currentTab) {
    if (!selectedRows[type]) selectedRows[type] = new Set();
    selectedRows[type].clear();

    document.querySelectorAll(`#t-${type} tbody .bulk-checkbox`).forEach(cb => cb.checked = false);
    document.querySelectorAll(`#t-${type} tbody tr`).forEach(tr => tr.classList.remove('row-selected'));

    const selectAllCheckbox = document.getElementById(`selectAll${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (selectAllCheckbox) selectAllCheckbox.checked = false;

    updateBulkToolbar(type);
}

function getAllSelectionEntries() {
    if (!selectedRows.all || selectedRows.all.size === 0) return [];
    return Array.from(selectedRows.all).map(key => {
        const [srcType, idxStr] = key.split(':');
        return { type: srcType, idx: Number(idxStr) };
    }).filter(entry => DATA[entry.type] && Number.isInteger(entry.idx) && entry.idx >= 0 && entry.idx < DATA[entry.type].length);
}

function formatItemsWord(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'элемент';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'элемента';
    return 'элементов';
}

function askBulkDelete(type = currentTab) {
    const count = selectedRows[type] ? selectedRows[type].size : 0;
    if (count === 0) return;

    const isTrash = type === 'trash';
    const word = formatItemsWord(count);
    document.getElementById('del-modal-title').innerText = isTrash ? `Удалить ${count} ${word} навсегда?` : `Удалить ${count} ${word} в корзину?`;
    document.getElementById('del-modal-desc').innerText = isTrash ? "Элементы будут удалены безвозвратно." : `Объекты будут храниться ${TRASH_RETENTION_DAYS} дней.`;
    document.getElementById('deleteConfirmModal').style.display = 'flex';
    document.getElementById('finalDeleteBtn').style.backgroundColor = 'var(--red)';
    document.getElementById('finalDeleteBtn').style.borderColor = 'var(--red)';
    document.getElementById('finalDeleteBtn').innerText = isTrash ? 'Удалить навсегда' : 'Удалить';
    document.getElementById('finalDeleteBtn').onclick = () => bulkDelete(type, isTrash);
}

function bulkDelete(type = currentTab, deleteForever = false) {
    if (!selectedRows[type] || selectedRows[type].size === 0) return;

    const processDeletion = (sourceType, indices) => {
        const deletedItems = [];
        indices.sort((a, b) => b - a).forEach(idx => {
            const itemIndex = DATA[sourceType].findIndex((_, i) => i === idx);
            if (itemIndex > -1) {
                const item = DATA[sourceType].splice(itemIndex, 1)[0];
                deletedItems.push({ item, index: itemIndex });
                if (!deleteForever) {
                    item.deletedAt = Date.now();
                    DATA.trash.unshift(item);
                }
            }
        });
        return deletedItems;
    };

    const deletionsLog = [];
    if (type === 'all') {
        const grouped = {};
        getAllSelectionEntries().forEach(({ type: src, idx }) => {
            if (!grouped[src]) grouped[src] = [];
            grouped[src].push(idx);
        });
        Object.entries(grouped).forEach(([src, list]) => {
            const removed = processDeletion(src, list);
            if (removed.length) deletionsLog.push({ type: src, items: removed });
        });
    } else {
        const indicesToDelete = Array.from(selectedRows[type]).map(Number);
        const removed = processDeletion(type, indicesToDelete);
        if (removed.length) deletionsLog.push({ type, items: removed });
    }

    lastPermanentDeletion = deleteForever ? deletionsLog : null;
    lastTrashMove = deleteForever ? null : deletionsLog;

    selectedRows[type].clear();
    document.getElementById('deleteConfirmModal').style.display = 'none';
    save(); upd();
    if (deleteForever) {
        showToast('Удалено навсегда', 'Отмена', undoPermanentDelete);
    } else {
        const movedCount = deletionsLog.reduce((acc, entry) => acc + entry.items.length, 0);
        showToast(`Перемещено в корзину: ${movedCount}`, 'Отменить', undoMoveToTrash);
    }
}

function bulkDuplicate(type = currentTab) {
    if (!selectedRows[type] || selectedRows[type].size === 0) return;

    const addCopies = (sourceType, indices) => {
        const newItems = [];
        indices.sort((a, b) => a - b).forEach(idx => {
            const item = JSON.parse(JSON.stringify(DATA[sourceType].find((_, i) => i === idx)));
            if(item) {
                 item.n = item.n + " (Копия)";
                 newItems.push(item);
            }
        });
        if (newItems.length) {
            DATA[sourceType].unshift(...newItems);
        }
    };

    if (type === 'all') {
        const grouped = {};
        getAllSelectionEntries().forEach(({ type: src, idx }) => {
            if (!grouped[src]) grouped[src] = [];
            grouped[src].push(idx);
        });
        Object.entries(grouped).forEach(([src, list]) => addCopies(src, list));
    } else {
        const indicesToDuplicate = Array.from(selectedRows[type]).map(Number);
        addCopies(type, indicesToDuplicate);
    }

    selectedRows[type].clear();
    save(); upd();
}

function askBulkMove(targetType) {
    const currentType = currentTab;
    const count = selectedRows[currentType] ? selectedRows[currentType].size : 0;
    
    if (count === 0 || !targetType) {
        document.getElementById('bulkMoveSelect').value = '';
        return;
    }
    
    const targetName = document.querySelector(`#bulkMoveSelect option[value="${targetType}"]`).text;
    const tabNames = {
        active: 'В работе',
        waiting: 'Ожидает',
        potential: 'Потенциал',
        paused: 'На паузе',
        archive: 'Выполнено',
        requests: 'В заявки',
        all: 'Все',
        trash: 'Корзина'
    };
    const sourceName = tabNames[currentType] || document.getElementById(`tab-${currentType}`)?.textContent.replace(/\s+\d+$/, '').trim();

    const word = formatItemsWord(count);
    document.getElementById('del-modal-title').innerText = `Перенести ${count} ${word} в "${targetName}"?`;
    document.getElementById('del-modal-desc').innerText = `Проекты будут перемещены из раздела "${sourceName || ''}".`;
    document.getElementById('deleteConfirmModal').style.display = 'flex';
    document.getElementById('finalDeleteBtn').style.backgroundColor = 'var(--accent)';
    document.getElementById('finalDeleteBtn').style.borderColor = 'var(--accent)';
    document.getElementById('finalDeleteBtn').innerText = 'Перенести';
    
    document.getElementById('finalDeleteBtn').onclick = () => bulkMove(currentType, targetType);
}

function bulkMove(from, to) {
    if (!selectedRows[from] || selectedRows[from].size === 0) return;

    const moveItemToTarget = (item) => {
        if (to === 'requests') {
            DATA.requests.unshift({
                name: item.c || item.n || 'Новая заявка',
                source: item.n ? `Проект: ${item.n}` : 'Проект',
                note: item.n || '—',
                link: normalizeLinkValue(item.link || ''),
                budget: toNumeric(item.p),
                created: new Date().toISOString()
            });
            return null;
        }
        if(to === 'active') { item.start = item.start || today; item.dl = item.dl || today; item.paid = item.paid || 50; delete item.date; }
        if(to === 'archive') { item.date = today; item.paid = 100; delete item.start; delete item.dl; }
        if(to === 'potential' || to === 'waiting' || to === 'paused') { delete item.date; delete item.start; delete item.dl; item.paid = 0; }
        return item;
    };

    const processMoves = (sourceType, indices) => {
        indices.sort((a, b) => b - a).forEach(idx => {
            const itemIndex = DATA[sourceType].findIndex((_, i) => i === idx);
            if (itemIndex > -1) {
                const item = DATA[sourceType].splice(itemIndex, 1)[0];
                const prepared = moveItemToTarget(item);
                if (prepared) {
                    DATA[to].unshift(prepared);
                }
            }
        });
    };

    if (from === 'all') {
        const grouped = {};
        getAllSelectionEntries().forEach(({ type: src, idx }) => {
            if (!grouped[src]) grouped[src] = [];
            grouped[src].push(idx);
        });
        Object.entries(grouped).forEach(([src, list]) => processMoves(src, list));
    } else {
        const indicesToMove = Array.from(selectedRows[from]).map(Number);
        processMoves(from, indicesToMove);
    }

    selectedRows[from].clear();
    document.getElementById('deleteConfirmModal').style.display = 'none';
    document.getElementById('bulkMoveSelect').value = '';
    save();
    if(from === to) {
        upd();
    } else {
        switchTab(to);
    }
}

function init(){
    let exist = localStorage.getItem(K);
    if(!exist) { const v4 = localStorage.getItem('grok_design_v4'); if(v4) exist = v4; }

    if (exist) {
        try {
            const parsed = JSON.parse(exist);
            const payload = parsed?.data ? parsed : { data: parsed };
            DATA = { ...DATA, ...(payload.data || {}) };
            if(!DATA.trash) DATA.trash = [];
            if(!DATA.requests) DATA.requests = [];
            EXTRA_TASKS = { ...(payload.extraTasks || payload.extra_tasks || {}) };
            ['active', 'archive', 'paused', 'waiting', 'potential'].forEach(type => {
                 DATA[type].forEach(i => {
                    if(i.contractor === undefined) i.contractor = 0;
                    if(i.taxPrc === undefined) i.taxPrc = 0;
                    if(!i.contractorMode) i.contractorMode = i.contractor ? 'amount' : 'none';
                 });
            });
            if (payload.uiPrefs) {
                localStorage.setItem(UI_PREFS_KEY, JSON.stringify(payload.uiPrefs));
            }
            if (Array.isArray(payload.nameTemplates)) {
                NAME_TEMPLATES = payload.nameTemplates;
                localStorage.setItem(NAME_TEMPLATES_KEY, JSON.stringify(NAME_TEMPLATES));
            }
            if (!payload.uiPrefs && payload.theme) {
                const themed = { ...UI_PREFS, themeMode: payload.theme };
                localStorage.setItem(UI_PREFS_KEY, JSON.stringify(themed));
            }
        } catch(e) { console.error("Data load error", e); }
    }

    const idsAdded = ensureProjectIds();

    hydrateArchiveCompletionMeta();
    loadUiPrefs();
    initTheme();
    loadNameTemplates();
    setTemplateHelper(TEMPLATE_HELPER_DEFAULT);
    const nameInput = document.getElementById('add-proj-name');
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            nameInput.classList.remove('input-error');
            setTemplateHelper(TEMPLATE_HELPER_DEFAULT);
            toggleProjectNameClear();
        });
        toggleProjectNameClear();
    }
    cleanupTrash();
    applyBlockVisibility();
    updateSettingsPreviewStates();
    applyStatVisibility();
    applyStatOrder();
    applyBlockOrder();
    applyTableVisibility();
    setupEditableBlocks();
    renderMonthSelect();
    setupModalsBackgroundCheck();
    setupDatePickers();
    document.getElementById('saveLinkBtn').onclick = saveLink;
    document.getElementById('add-proj-start-val').value = today;
    document.getElementById('add-proj-dl-val').value = '';
    sortData('active', 'dl', 'date', true);
    ['active','waiting','potential','paused','archive'].forEach(t => {
        DATA[t].sortDirection = DATA[t].sortDirection || 1;
        updateSortIndicators(t);
    });
    const scrollBtn = document.getElementById('scrollToggle');
    if (scrollBtn) scrollBtn.addEventListener('click', toggleScrollDirection);
    setupScrollbarAutoHide();
    showScrollbarsTemporarily();
    updateScrollToggle();
    window.addEventListener('scroll', updateScrollToggle);
    window.addEventListener('resize', updateScrollToggle);
    if (idsAdded) save();
    upd();
}

function save(){
    persistUiPrefs();
    localStorage.setItem(K, JSON.stringify(buildBackupSnapshot()));
}

function cleanupTrash(){
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const initLen = DATA.trash.length;
    DATA.trash = DATA.trash.filter(i => (nowMs - (i.deletedAt || 0)) < sevenDays);
    if(DATA.trash.length !== initLen) save();
}

function formatCurrency(n) { return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽'; }

function formatPrice(value) {
    return formatCurrency(value || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}.${month}.${year}`;
}

function formatDateDisplay(str) {
    if (!str || str.startsWith('0000')) return '—';
    const hasTime = str.includes('T') && str.length > 10;
    const dateObj = new Date(str.replace(' ', 'T'));
    if(isNaN(dateObj.getTime())) return '—';
    const d = dateObj.toLocaleDateString('ru', { day: 'numeric', month: 'short' }).replace('.', '');
    if(hasTime) {
        const t = dateObj.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
        return `${d} <span class="time-text">${t}</span>`;
    }
    return d;
}

function formatDeadlineDisplay(str) {
    if (!str) return '<span class="deadline-infinity">∞ Нет срока</span>';
    const dateObj = new Date(str.replace(' ', 'T'));
    if (isNaN(dateObj.getTime())) return '—';
    const delta = formatDeadlineDelta(dateObj);
    const dateText = formatDateDisplay(str);
    const overdue = dateObj.getTime() < Date.now();
    if (!delta || overdue) return `<div class="deadline-display"><span class="date-text">${dateText}</span></div>`;
    return `<div class="deadline-display"><span class="date-text">${dateText}</span><span class="deadline-delta ${overdue ? 'overdue' : ''}">${delta}</span></div>`;
}

function formatDeadlineDelta(dateObj) {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
    const now = new Date();
    let diffMs = dateObj.getTime() - now.getTime();
    const overdue = diffMs < 0;
    diffMs = Math.abs(diffMs);

    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (!days && !hours) return overdue ? 'просрочено' : 'сегодня';

    const parts = [];
    if (days) parts.push(`${days} д`);
    if (hours) parts.push(`${hours} ч`);

    const sign = overdue ? '−' : '';
    return `${sign}${parts.join(' ')}`.trim();
}

function formatDateWithTime(dateObj, timeStr) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const base = `${y}-${m}-${d}`;
    return timeStr ? `${base}T${timeStr}` : base;
}

// 1. Обновленная функция рендера карточки (улучшен Архив)
const getProjectCard = (item, type, index) => {
    // Логика подсчета дней (для прогресса или архива)
    const today = new Date();
    today.setHours(0,0,0,0);
    const dlDate = item.dl ? new Date(item.dl) : null;
    let daysLeftText = '';
    let daysClass = '';

    if (type !== 'archive' && dlDate) {
        const diff = Math.ceil((dlDate - today) / (1000 * 60 * 60 * 24));
        if (diff < 0) { daysLeftText = `Просрочено: ${Math.abs(diff)} дн.`; daysClass = 'text-red'; }
        else if (diff === 0) { daysLeftText = 'Сдача сегодня'; daysClass = 'text-orange'; }
        else { daysLeftText = `${diff} дн.`; daysClass = 'text-green'; }
    }

    // Логика специально для АРХИВА (Новая)
    let archiveHtml = '';
    if (type === 'archive') {
        const doneDateStr = item.date || formatDate(today); // Дата завершения
        const doneDateObj = new Date(doneDateStr.split('.').reverse().join('-')); // Преобразуем для сравнения
        
        let statusDot = '';
        
        if (dlDate) {
            // Считаем разницу между Дедлайном и Сдачей
            const diffTime = dlDate - doneDateObj;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            // Если diffDays >= 0 -> Сдали вовремя или заранее. Если < 0 -> Просрочили
            if (diffDays >= 0) {
                const tip = diffDays === 0 ? "Сдано ровно в срок" : `В запасе было: ${diffDays} дн.`;
                statusDot = `<span class="archive-status-dot status-ok" data-tooltip="${tip}"></span>`;
            } else {
                const overdue = Math.abs(diffDays);
                const tip = `Просрочка: ${overdue} дн.`;
                statusDot = `<span class="archive-status-dot status-late" data-tooltip="${tip}"></span>`;
            }
        }
        
        archiveHtml = `
            <div class="archive-date-wrapper">
                <span>Сдано: ${doneDateStr}</span>
                ${statusDot}
            </div>
        `;
    }

    // Стандартные блоки (прогресс, даты для активных)
    const showProgress = (type === 'active' || type === 'active_pinned');
    const progressHtml = showProgress ? 
        `<div class="progress-bar"><div class="fill" style="width:${item.progress||0}%"></div></div>` : '';
    
    const dateHtml = (type !== 'archive' && item.dl) ? 
        `<div class="card-meta">
           <span><i class="fa-regular fa-clock"></i> ${formatDate(item.dl)}</span>
           <span class="${daysClass}" style="font-weight:600">${daysLeftText}</span>
         </div>` : '';

    // Блок кнопок (оставляем как есть, чуть компактнее код)
    let btns = '';
    if(type === 'waiting') btns = `<button onclick="moveItem('waiting','active',${index})" title="В работу">▶</button>`;
    if(type.startsWith('active')) btns = `<button onclick="completeProject('${type}',${index})" title="Завершить">✔</button>`;
    if(type === 'paused') btns = `<button onclick="moveItem('paused','active',${index})" title="Возобновить">▶</button>`;
    if(type === 'potential') btns = `<button onclick="moveItem('potential','active',${index})" title="Принять">✚</button>`;
    if(type === 'archive') btns = `<button onclick="moveItem('archive','active',${index})" title="Вернуть">↺</button>`;

    // Иконка приоритета
    const prioIcon = item.prio ? `<span class="prio-star">★</span>` : '';
    const pinIcon = (item.pinned) ? `<span style="color:var(--accent);margin-right:5px">📌</span>` : '';

    return `
    <div class="card" draggable="true" 
         ondragstart="drag(event, '${type}', ${index})" 
         ondblclick="editItem('${type}', ${index})">
      <div class="card-header">
        <span class="card-title">${pinIcon}${prioIcon}${item.name}</span>
        <div class="card-actions">
            ${btns}
            <button class="danger" onclick="delItem('${type}',${index})" title="Удалить">×</button>
        </div>
      </div>
      <div class="card-client">${item.client || ''}</div>
      <div class="card-price">${formatPrice(item.price)}</div>
      ${progressHtml}
      ${dateHtml}
      ${archiveHtml} </div>
    `;
};

// 2. Обновленная функция "Все проекты" (Редизайн с Grid)
function renderAllProjectsModal() {
  const modal = document.getElementById('allProjectsModal');
  const list = document.getElementById('allProjectsList');
  if(!modal || !list) return;

  const all = [];
  // Собираем все проекты в один массив
  ['active','active_pinned','waiting','paused','potential','archive'].forEach(k => {
    const src = (k === 'active_pinned') ? DATA.active.filter(x=>x.pinned) : 
                (k === 'active') ? DATA.active.filter(x=>!x.pinned) : DATA[k];
    if(src) src.forEach(i => all.push({...i, _status: k}));
  });

  // Сортировка по дате (свежие сверху)
  all.sort((a,b) => new Date(b.date||b.dl||0) - new Date(a.date||a.dl||0));

  let html = `
    <div class="all-projects-table all-projects-header">
        <div class="apt-status">СТАТУС</div>
        <div>ПРОЕКТ / КЛИЕНТ</div>
        <div style="text-align:right">ДАТА</div>
        <div style="text-align:right">СУММА</div>
    </div>
  `;

  let total = 0;

  all.forEach(p => {
    total += (parseInt(p.price) || 0);
    
    // Иконка статуса
    let stIcon = '•';
    let stColor = 'var(--muted)';
    if(p._status.includes('active')) { stIcon = '▶'; stColor = '#3fb950'; }
    if(p._status === 'archive') { stIcon = '✔'; stColor = 'var(--accent)'; }
    if(p._status === 'waiting') { stIcon = 'clock'; stColor = '#e3b341'; }
    if(p._status === 'paused') { stIcon = '||'; stColor = '#f85149'; }

    // Дата: для архива - завершение, для остальных - дедлайн
    let dLabel = p.dl ? formatDate(p.dl) : '-';
    if(p._status === 'archive' && p.date) dLabel = p.date;

    html += `
    <div class="all-projects-table">
        <div class="apt-status" style="color:${stColor}; font-size:16px;">${stIcon}</div>
        <div class="apt-name">
            <strong title="${p.name}">${p.name}</strong>
            <span>${p.client || 'Без клиента'}</span>
        </div>
        <div class="apt-date">${dLabel}</div>
        <div class="apt-price">${formatPrice(p.price)}</div>
    </div>
    `;
  });

  document.getElementById('allProjectsTotal').innerText = formatPrice(total);
  list.innerHTML = html;
  modal.style.display = 'flex';
}

function calcContractorAmount(item) {
    const gross = toNumeric(item.p);
    const mode = item.contractorMode || 'amount';
    const raw = toNumeric(item.contractor);
    if (mode === 'none') return 0;
    return mode === 'percent' ? gross * (raw / 100) : raw;
}

function calcNet(item){
    const gross = toNumeric(item.p);
    const contr = calcContractorAmount(item);
    const tax = toNumeric(item.taxPrc);
    const taxAmt = gross * (tax / 100);
    return Math.round(gross - taxAmt - contr);
}

function calcGross(item) {
    return toNumeric(item.p);
}
function calcMarginPrc(item) {
    const gross = toNumeric(item.p);
    if (gross === 0) return 0;
    const net = calcNet(item);
    return Math.round((net / gross) * 100);
}

function setupModalsBackgroundCheck() {
    window.onclick = function(event) {
        if (!event.target.classList.contains('modal')) return;
        if (event.target.id === 'addProjectModal') {
            attemptCloseProjectModal();
            return;
        }
        if (event.target.id === 'settingsModal') {
            attemptCloseSettings();
            return;
        }
        event.target.style.display = 'none';
    }
}

function switchTab(t){
    const enabledTabs = getEnabledTabs();
    if (!enabledTabs.includes(t)) {
        const fallback = enabledTabs.includes('active') ? 'active' : enabledTabs[0];
        if (fallback && fallback !== t) {
            return switchTab(fallback);
        }
        return;
    }
    currentTab = t;
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${t}`).classList.add('active');
    ['active','waiting','potential','requests','paused','archive','all','trash'].forEach(k => {
        const el = document.getElementById(`view-${k}`);
        if(el) el.style.display = (k === t) ? 'block' : 'none';
        const cb = document.getElementById(`selectAll${k.charAt(0).toUpperCase() + k.slice(1)}`);
        if(cb) cb.checked = false;
        if(selectedRows[k]) selectedRows[k].clear();
    });

    const desc = document.getElementById('tab-description');
    desc.innerHTML = getTabSummary(t, TAB_DESCRIPTIONS[t]);
    const dashboard = document.querySelector('.dashboard');
    if (dashboard) dashboard.style.display = t === 'trash' ? 'none' : 'block';
    updateSortIndicators(t);
    updateBulkToolbar(t);
    upd();
}

function getTabSummary(type, baseText) {
    if (type === 'trash') {
        return `${baseText} · Статистика скрыта в корзине.`;
    }
    return baseText;
}

function updateTabCounts() {
    const counts = {
        active: DATA.active.length,
        waiting: DATA.waiting.length,
        potential: DATA.potential.length,
        requests: DATA.requests.length,
        paused: DATA.paused.length,
        archive: DATA.archive.length,
        all: DATA.active.length + DATA.waiting.length + DATA.potential.length + DATA.paused.length + DATA.archive.length,
        trash: DATA.trash.length
    };
    Object.entries(counts).forEach(([key, val]) => {
        const el = document.getElementById(`count-${key}`);
        if (el) el.innerText = val;
    });
}

function sortData(type, key, dataType, initial = false) {
    if (!DATA[type]) return;
    let direction = 1;
    if (SORT[type] === key && !initial) {
        direction = DATA[type].sortDirection === 1 ? -1 : 1; 
    }
    DATA[type].sort((a, b) => {
        let va = a[key], vb = b[key];
        if (type === 'active' && (key === 'dl' || initial)) {
             const remA = getTimeRemaining(a.dl).days || Infinity;
             const remB = getTimeRemaining(b.dl).days || Infinity;
             if (remA !== remB) return direction * (remA - remB);
        }
        if (dataType === 'date') return direction * (new Date((va || '9999').replace(' ', 'T')) - new Date((vb || '9999').replace(' ', 'T')));
        if (dataType === 'number') return direction * (toNumeric(va) - toNumeric(vb));
        return direction * String(va).localeCompare(String(vb));
    });
    DATA[type].sortDirection = direction;
    SORT[type] = key;
    save();
    updateSortIndicators(type);
    if(!initial) upd();
}

function updateSortIndicators(type) {
    const activeKey = SORT[type];
    const dir = DATA[type].sortDirection || 1;
    document.querySelectorAll(`th[data-type="${type}"]`).forEach(th => th.classList.remove('sorted', 'asc', 'desc'));
    const activeTh = document.querySelector(`th[data-type="${type}"][data-key="${activeKey}"]`);
    if (activeTh) {
        activeTh.classList.add('sorted');
        activeTh.classList.add(dir === 1 ? 'asc' : 'desc');
    }
}

function upd(){
    renderActive();
    renderSimple('waiting');
    renderSimple('paused');
    renderPotential();
    renderRequests();
    renderArchive();
    renderAll();
    renderTrash();
    calcStats();
    const desc = document.getElementById('tab-description');
    if (desc) desc.innerHTML = getTabSummary(currentTab, TAB_DESCRIPTIONS[currentTab]);
    updateBulkToolbar(currentTab);
    updateTabCounts();
    if (typeof window.renderJournalButtons === 'function') window.renderJournalButtons();
}

function renderActive(){
    const tbody = document.querySelector('#t-active tbody');
    tbody.innerHTML = '';
    let totalP = 0, totalPr = 0, totalContr = 0, totalTax = 0, totalPaidGross = 0;
    
    DATA.active.forEach((item, i) => {
        item.pr = calcNet(item);
        const gross = toNumeric(item.p);
        totalP += gross; totalPr += item.pr || 0;
        const contractorAmount = calcContractorAmount(item);
        totalContr += contractorAmount;
        totalTax += gross * ((toNumeric(item.taxPrc) || 0) / 100);

        const rem = getTimeRemaining(item.dl);
        const tr = document.createElement('tr');
        tr.dataset.index = i;
        tr.dataset.type = 'active';
        tr.dataset.projectId = item.id;

        const isSelected = selectedRows.active?.has(i.toString());
        if (isSelected) tr.classList.add('row-selected');

        const linkIcon = renderLinkControls(item, i, 'active');
        const paidAmount = Math.round(gross * ((toNumeric(item.paid) || 0) / 100));
        totalPaidGross += paidAmount;
        const contractorMode = item.contractorMode || 'none';
        const contractorSymbol = contractorMode === 'percent' ? '%' : contractorMode === 'none' ? '' : '₽';
        const contractorSymbolClass = contractorSymbol ? '' : 'symbol-empty';
        const contractorValue = contractorMode === 'none' ? '' : formatPlainNumber(item.contractor ?? 0);
        const contractorHelper = contractorMode === 'none' ? 'Расходы не учитываются' : `≈ ${formatCurrency(contractorAmount)}`;
        const actionButtons = [
            `<div class="done-btn action-btn-base" onclick="mv(${i},'active','archive')" title="Выполнено"><svg class="btn-icon"><use href="#icon-check"/></svg></div>`
        ];
        actionButtons.push(`<div class="edit-active-btn action-btn-base" onclick="startProjectEdit('active',${i})" title="Редактировать"><svg class="btn-icon"><use href="#icon-pen"/></svg></div>`);
        if (isTableEnabled('waiting')) actionButtons.push(`<div class="wait-active-btn action-btn-base" onclick="mv(${i},'active','waiting')" title="В ожидании"><svg class="btn-icon"><use href="#icon-waiting"/></svg></div>`);
        const overdueIcon = rem && rem.days < 0 ? `<span class="deadline-warning-icon" title="${rem.overdueTooltip}">●</span>` : '';

        tr.innerHTML = `
            <td class="select-col">
                <div class="row-index">${i + 1}</div>
                <div class="row-controls">
                    <svg class="dup-icon" onclick="duplicateRow('active',${i})" title="Дублировать"><use href="#icon-duplicate"/></svg>
                    <input type="checkbox" class="bulk-checkbox" id="check-active-${i}" onchange="toggleSelect('active', ${i}, this)" ${selectedRows.active?.has(i.toString()) ? 'checked' : ''}>
                    <label for="check-active-${i}" style="display:none;"></label>
                </div>
            </td>
            <td><div class="client-wrap">
                <span contenteditable onblur="updVal('active',${i},'c',this.innerText)" class="${getClientNameClass(item)}">${item.c}</span>
                ${linkIcon}
            </div></td>
            <td class="project-name-wrap">
                <span class="project-name" contenteditable onblur="updVal('active',${i},'n',this.innerText)">${item.n}</span>
            </td>
            
            <td class="date-cell"><div class="date-input-wrap" onclick="openDate('active',${i},'start')"><svg class="date-icon"><use href="#icon-calendar"/></svg><span class="date-text-display">${formatDateDisplay(item.start)}</span></div></td>
            <td class="date-cell"><div class="date-input-wrap ${rem.cls}" onclick="openDate('active',${i},'dl')"><svg class="date-icon"><use href="#icon-calendar"/></svg><span class="date-text-display">${formatDeadlineDisplay(item.dl)}</span></div></td>

            <td class="mono"><div class="${rem.cls}">${rem.txt} ${overdueIcon}</div></td>
            
            <td><select class="tax-select" onchange="updVal('active',${i},'taxPrc',this.value)">
                <option value="0" ${+item.taxPrc===0?'selected':''}>0%</option>
                <option value="4" ${+item.taxPrc===4?'selected':''}>4%</option>
                <option value="6" ${+item.taxPrc===6?'selected':''}>6%</option>
                <option value="13" ${+item.taxPrc===13?'selected':''}>13%</option>
            </select></td>
            
            <td style="text-align:right;">
                <div class="price-cell-wrap expense-cell">
                    <input type="text" value="${contractorValue}" ${contractorMode === 'none' ? 'disabled' : ''} oninput="formatNumberInput(this)" onblur="updateContractorValue('active',${i},this.value)">
                    <span class="currency-symbol ${contractorSymbolClass}">${contractorSymbol || 'нет'}</span>
                    <select class="expense-mode" onchange="updateContractorMode('active',${i},this.value)">
                        <option value="none" ${contractorMode==='none'?'selected':''}>Нет</option>
                        <option value="amount" ${contractorMode==='amount'?'selected':''}>₽</option>
                        <option value="percent" ${contractorMode==='percent'?'selected':''}>%</option>
                    </select>
                </div>
                <div class="expense-helper">${contractorHelper}</div>
            </td>

            <td style="text-align:right;"><div class="price-cell-wrap"><input type="text" value="${formatPlainNumber(item.p || 0)}" oninput="formatNumberInput(this)" onblur="updVal('active',${i},'p',this.value)"><span class="currency-symbol">₽</span></div></td>
            <td style="text-align:right;"><div class="net-display-wrap">${formatCurrency(item.pr)}<span class="net-prc-val">(${calcMarginPrc(item)}%)</span></div></td>
            
            <td class="paid-cell">
                <select class="paid-select" onchange="updVal('active',${i},'paid',this.value)">
                    <option value="0" ${+item.paid===0?'selected':''}>0%</option>
                    <option value="50" ${+item.paid===50?'selected':''}>50%</option>
                    <option value="100" ${+item.paid===100?'selected':''}>100%</option>
                </select>
                <div class="paid-amount">${formatCurrency(paidAmount)}</div>
            </td>
            
            <td><div class="action-btns">
                ${actionButtons.join('')}
                <button class="del-btn" onclick="askDel('active',${i})" title="Удалить" aria-label="Удалить в корзину">
                    <svg><use href="#icon-trash"/></svg>
                </button>
            </div></td>
        `;
        attachRowSelection(tr, 'active', i, `check-active-${i}`);
        tbody.appendChild(tr);
    });
    
    const footer = document.querySelector('#total-row-active');
    const repState = analyzeReputation();
    footer.innerHTML = `<tr>
        <td colspan="6" class="footer-total-toggle" onclick="toggleFooterSelection('active')">Всего ${DATA.active.length} проектов</td>
        <td style="text-align:right;">
            <div class="footer-note">Налоги</div>
            <div>${formatCurrency(totalTax)}</div>
        </td>
        <td style="text-align:right;">
            <div class="footer-note">Расходы</div>
            <div>${formatCurrency(totalContr)}</div>
        </td>
        <td style="text-align:right;">
            <div class="footer-note">Сумма</div>
            <div>${formatCurrency(totalP)}</div>
        </td>
        <td style="text-align:right;">
            <div class="footer-note">Чистыми</div>
            <div>${formatCurrency(totalPr)}</div>
        </td>
        <td style="text-align:right;">
            <div class="footer-note">Оплачено</div>
            <div>${formatCurrency(totalPaidGross)}</div>
        </td>
        <td></td>
    </tr>`;

    updatePaceReputation(repState);

    const paceBlock = document.getElementById('pace-indicator');
    const urgent = DATA.active.filter(x => getTimeRemaining(x.dl).cls.includes('critical')).length;
    
    if (currentTab === 'active') {
        if (urgent > 0) {
            paceBlock.style.display = 'flex';
            paceBlock.classList.add('critical');
            document.getElementById('pace-icon').innerHTML = '🔥';
            document.getElementById('pace-title').innerText = 'Нужно ускориться!';
            document.getElementById('pace-desc').innerText = `Горит дедлайнов: ${urgent}. Поднажми, чтобы успеть!`;
            document.getElementById('pace-status').className='pace-status pace-hurry'; 
            document.getElementById('pace-status').innerText='Критично';
        } else if (DATA.active.length > 0) {
            paceBlock.style.display = 'flex';
            paceBlock.classList.remove('critical');
            document.getElementById('pace-icon').innerHTML = '🚦';
            document.getElementById('pace-title').innerText = 'Анализ';
            document.getElementById('pace-desc').innerText = `Все спокойно.`;
            document.getElementById('pace-status').className='pace-status pace-chill'; 
            document.getElementById('pace-status').innerText='Норма';
        } else {
            paceBlock.style.display = 'none';
        }
    } else {
        paceBlock.style.display = 'none';
    }
}

function renderSimple(type){
    const tbody = document.querySelector(`#t-${type} tbody`);
    tbody.innerHTML = '';
    let tot = 0;
    const hasDeadline = type !== 'waiting';
    DATA[type].forEach((item, i) => {
        tot += toNumeric(item.p);
        const tr = document.createElement('tr');
        tr.dataset.index = i;
        tr.dataset.type = type;
        tr.dataset.projectId = item.id;

        const isSelected = selectedRows[type]?.has(i.toString());
        if (isSelected) tr.classList.add('row-selected');

        const linkIcon = renderLinkControls(item, i, type);
        const rem = hasDeadline ? getTimeRemaining(item.dl) : null;
        const deadlineText = hasDeadline ? formatDeadlineDisplay(item.dl) : '';
        const remSuffix = hasDeadline && rem && !rem.isInfinite ? ` (${rem.txt})` : '';

        tr.innerHTML = `
            <td class="select-col">
                <div class="row-index">${i + 1}</div>
                <div class="row-controls">
                    <svg class="dup-icon" onclick="duplicateRow('${type}',${i})" title="Дублировать"><use href="#icon-duplicate"/></svg>
                    <input type="checkbox" class="bulk-checkbox" id="check-${type}-${i}" onchange="toggleSelect('${type}', ${i}, this)" ${selectedRows[type]?.has(i.toString()) ? 'checked' : ''}>
                    <label for="check-${type}-${i}" style="display:none;"></label>
                </div>
            </td>
            <td><div class="client-wrap">
                <span contenteditable onblur="updVal('${type}',${i},'c',this.innerText)" class="${getClientNameClass(item)}">${item.c}</span>
                ${linkIcon}
            </div></td>
            <td class="project-name-wrap">
                <span class="project-name" contenteditable onblur="updVal('${type}',${i},'n',this.innerText)">${item.n}</span>
            </td>
            ${hasDeadline ? `<td class="date-cell"><div class="date-input-wrap ${rem.cls}" onclick="openDate('${type}',${i},'dl')"><svg class="date-icon"><use href="#icon-calendar"/></svg><span class="date-text-display">${deadlineText}${remSuffix}</span></div></td>` : ''}
            <td><div class="price-cell-wrap"><input type="text" value="${formatPlainNumber(item.p || 0)}" oninput="formatNumberInput(this)" onblur="updVal('${type}',${i},'p',this.value)"><span class="currency-symbol">₽</span></div></td>
            <td><div class="action-btns" style="justify-content:flex-end">
                <div class="action-btn-base" onclick="startProjectEdit('${type}',${i})" title="Редактировать"><svg class="btn-icon"><use href="#icon-pen"/></svg></div>
                <div class="action-btn-base" onclick="mv(${i},'${type}','active')" title="В работу"><svg class="btn-icon"><use href="#icon-arrow-right"/></svg></div>
                <button class="del-btn" onclick="askDel('${type}',${i})" aria-label="Удалить в корзину">
                    <svg><use href="#icon-trash"/></svg>
                </button>
            </div></td>
        `;
        attachRowSelection(tr, type, i, `check-${type}-${i}`);
        tbody.appendChild(tr);
    });
    const footer = document.querySelector(`#total-row-${type}`);
    footer.innerHTML = `<tr>
        <td colspan="${hasDeadline ? 4 : 3}" class="footer-total-toggle" onclick="toggleFooterSelection('${type}')">Всего ${DATA[type].length} проектов</td>
        <td>
            <div class="footer-note">Сумма</div>
            <div>${formatCurrency(tot)}</div>
        </td>
        <td></td>
    </tr>`;
}

function renderPotential(){
    const tbody = document.querySelector('#t-potential tbody');
    tbody.innerHTML = '';
    let tot = 0;
    DATA.potential.forEach((item, i) => {
        tot += toNumeric(item.p);
        const tr = document.createElement('tr');
        tr.dataset.index = i;
        tr.dataset.type = 'potential';
        tr.dataset.projectId = item.id;

        const isSelected = selectedRows.potential?.has(i.toString());
        if (isSelected) tr.classList.add('row-selected');
        
        const linkIcon = renderLinkControls(item, i, 'potential');
                                      
        tr.innerHTML = `
            <td class="select-col">
                <div class="row-index">${i + 1}</div>
                <div class="row-controls">
                    <svg class="dup-icon" onclick="duplicateRow('potential',${i})" title="Дублировать"><use href="#icon-duplicate"/></svg>
                    <input type="checkbox" class="bulk-checkbox" id="check-potential-${i}" onchange="toggleSelect('potential', ${i}, this)" ${selectedRows.potential?.has(i.toString()) ? 'checked' : ''}>
                    <label for="check-potential-${i}" style="display:none;"></label>
                </div>
            </td>
            <td><div class="client-wrap">
                <span contenteditable onblur="updVal('potential',${i},'c',this.innerText)" class="${getClientNameClass(item)}">${item.c}</span>
                ${linkIcon}
            </div></td>
            <td class="project-name-wrap">
                <span class="project-name" contenteditable onblur="updVal('potential',${i},'n',this.innerText)">${item.n}</span>
            </td>
            <td><div class="price-cell-wrap"><input type="text" value="${formatPlainNumber(item.p || 0)}" oninput="formatNumberInput(this)" onblur="updVal('potential',${i},'p',this.value)"><span class="currency-symbol">₽</span></div></td>
            <td><div class="action-btns" style="justify-content:flex-end">
                <div class="action-btn-base" onclick="startProjectEdit('potential',${i})" title="Редактировать"><svg class="btn-icon"><use href="#icon-pen"/></svg></div>
                <div class="done-btn action-btn-base" onclick="mv(${i},'potential','active')" title="В работу"><svg class="btn-icon"><use href="#icon-arrow-right"/></svg><span class="btn-label">В работу</span></div>
                <button class="del-btn" onclick="askDel('potential',${i})" aria-label="Удалить в корзину">
                    <svg><use href="#icon-trash"/></svg>
                </button>
            </div></td>
        `;
        attachRowSelection(tr, 'potential', i, `check-potential-${i}`);
        tbody.appendChild(tr);
    });
    const footer = document.querySelector('#total-row-potential');
    footer.innerHTML = `<tr>
        <td colspan="3" class="footer-total-toggle" onclick="toggleFooterSelection('potential')">Всего ${DATA.potential.length} лидов</td>
        <td>
            <div class="footer-note">Сумма</div>
            <div>${formatCurrency(tot)}</div>
        </td>
        <td></td>
    </tr>`;
}

function renderRequests(){
    const tbody = document.querySelector('#t-requests tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let total = 0;
    DATA.requests.forEach((item, i) => {
        const budget = toNumeric(item.budget);
        total += budget;
        const tr = document.createElement('tr');
        tr.dataset.index = i;
        tr.dataset.type = 'requests';
        tr.dataset.projectId = item.id;
        const linkBtns = renderLinkControls(item, i, 'requests');
        tr.innerHTML = `
            <td class="select-col"><div class="row-index">${i + 1}</div></td>
            <td><span contenteditable onblur="updateRequestField(${i},'name',this.innerText)">${item.name || '—'}</span></td>
            <td><span contenteditable onblur="updateRequestField(${i},'source',this.innerText)">${item.source || '—'}</span></td>
            <td><span contenteditable onblur="updateRequestField(${i},'note',this.innerText)">${item.note || '—'}</span></td>
            <td><div class="trash-action-btns">${linkBtns}</div></td>
            <td style="text-align:right;"><div class="price-cell-wrap"><input type="text" value="${formatPlainNumber(budget)}" oninput="formatNumberInput(this)" onblur="updateRequestField(${i},'budget',this.value)"><span class="currency-symbol">₽</span></div></td>
            <td>
                <div class="trash-action-btns">
                    <div class="restore-trash-btn" onclick="convertRequestToPotential(${i})">В потенциал</div>
                    <div class="delete-forever-text" onclick="deleteRequest(${i})" title="Удалить">Удалить</div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    const footer = document.querySelector('#total-row-requests');
    if (footer) {
        footer.innerHTML = `<tr><td colspan="5" class="footer-total-toggle">Всего ${DATA.requests.length} заявок</td><td style="text-align:right;">${formatCurrency(total)}</td><td></td></tr>`;
    }
}

function addRequest() {
    const name = document.getElementById('req-name').value.trim();
    const source = document.getElementById('req-source').value.trim();
    const note = document.getElementById('req-note').value.trim();
    const link = document.getElementById('req-link').value.trim();
    const budget = toNumeric(document.getElementById('req-budget').value);
    if (!name && !note) return;
    DATA.requests.unshift({ name, source, note, link: normalizeLinkValue(link), budget, created: new Date().toISOString(), id: generateProjectId() });
    ['req-name','req-source','req-note','req-link','req-budget'].forEach(id => document.getElementById(id).value = '');
    save(); upd();
    showToast('Заявка добавлена');
}

function updateRequestField(idx, key, val) {
    if (!DATA.requests[idx]) return;
    DATA.requests[idx][key] = key === 'budget'
        ? toNumeric(val)
        : key === 'link'
            ? normalizeLinkValue(val)
            : val;
    save(); upd();
}

function deleteRequest(idx) {
    DATA.requests.splice(idx, 1);
    save(); upd();
}

function convertRequestToPotential(idx) {
    const req = DATA.requests.splice(idx, 1)[0];
    if (!req) return;
    const targetId = req.id || generateProjectId();
    DATA.potential.unshift({ n: req.note || req.name || 'Новый лид', c: req.name || '—', p: req.budget || 0, contractor: 0, contractorMode: 'none', taxPrc: 0, paid: 0, link: req.link || '', id: targetId });
    if (req.id && EXTRA_TASKS[req.id]) {
        EXTRA_TASKS[targetId] = EXTRA_TASKS[req.id];
    }
    save();
    showToast('Перенесено в потенциал');
    switchTab('potential');
}

function renderArchive(){
    const tbody = document.querySelector('#t-archive tbody');
    tbody.innerHTML = '';
    let tP = 0, tPr = 0, tContr = 0, tTax = 0;
    const visibleItems = getArchiveByMonth();
    visibleItems.forEach((item, i) => {
        const realIdx = DATA.archive.indexOf(item);
        item.pr = calcNet(item);
        tP += toNumeric(item.p); tPr += +item.pr || 0;
        const contractorAmount = calcContractorAmount(item);
        tContr += contractorAmount;
        tTax += toNumeric(item.p) * ((toNumeric(item.taxPrc) || 0) / 100);
        const tr = document.createElement('tr');
        tr.dataset.index = realIdx;
        tr.dataset.type = 'archive';
        tr.dataset.projectId = item.id;

        const isSelected = selectedRows.archive?.has(realIdx.toString());
        if (isSelected) tr.classList.add('row-selected');

        const linkIcon = renderLinkControls(item, realIdx, 'archive');

        const completionStatus = analyzeCompletionStatus(item);
        const completionText = formatDateDisplay(item.date);
        const completionBadge = completionStatus.onTime
            ? `<span class="deadline-success-badge" title="Сдано в срок">${completionText}</span>`
            : `<span class="date-text-display">${completionText}</span>`;
        const overdueIcon = completionStatus.delayDays > 0
            ? `<span class="deadline-warning-icon" title="Просрочено на ${completionStatus.delayDays} ${pluralize(completionStatus.delayDays, ['день','дня','дней'])}">●</span>`
            : '';
        const dateCls = completionStatus.onTime ? 'days-normal' : '';
        const deadlineSnapshot = item.deadlineSnapshot || item.dl || null;
        const deadlineBadge = deadlineSnapshot
            ? `<span class="date-text-display">${formatDateDisplay(deadlineSnapshot)}</span>`
            : `<span class="date-text-display">—</span>`;

        const contractorMode = item.contractorMode || 'none';
        const contractorSymbol = contractorMode === 'percent' ? '%' : contractorMode === 'none' ? '' : '₽';
        const contractorSymbolClass = contractorSymbol ? '' : 'symbol-empty';
        const contractorValue = contractorMode === 'none' ? '' : formatPlainNumber(item.contractor ?? 0);
        const contractorHelper = contractorMode === 'none' ? 'Расходы не учитываются' : `≈ ${formatCurrency(contractorAmount)}`;

        tr.innerHTML = `
            <td class="select-col">
                <div class="row-index">${i + 1}</div>
                <div class="row-controls">
                    <svg class="dup-icon" onclick="duplicateRow('archive',${realIdx})" title="Дублировать"><use href="#icon-duplicate"/></svg>
                    <input type="checkbox" class="bulk-checkbox" id="check-archive-${realIdx}" onchange="toggleSelect('archive', ${realIdx}, this)" ${selectedRows.archive?.has(realIdx.toString()) ? 'checked' : ''}>
                    <label for="check-archive-${realIdx}" style="display:none;"></label>
                </div>
            </td>
            <td><div class="client-wrap">
                <span contenteditable onblur="updVal('archive',${realIdx},'c',this.innerText)" class="${getClientNameClass(item)}">${item.c}</span>
                ${linkIcon}
            </div></td>
            <td class="project-name-wrap">
                <span class="project-name" contenteditable onblur="updVal('archive',${realIdx},'n',this.innerText)">${item.n}</span>
            </td>
            <td class="date-cell archive-date-cell">
                <div class="deadline-block">
                    <div class="deadline-row">
                        <div class="deadline-label">Дедлайн</div>
                        <div class="deadline-value ${deadlineSnapshot ? '' : 'muted'}">${deadlineBadge}</div>
                    </div>
                    <div class="deadline-row">
                        <div class="deadline-label">Сдано</div>
                        <div class="date-input-wrap ${dateCls}" onclick="openDate('archive',${realIdx},'date')">
                            <svg class="date-icon"><use href="#icon-calendar"/></svg>${completionBadge}${overdueIcon}
                        </div>
                    </div>
                </div>
            </td>
            <td><div class="price-cell-wrap"><input type="text" value="${formatPlainNumber(item.p || 0)}" oninput="formatNumberInput(this)" onblur="updVal('archive',${realIdx},'p',this.value)"><span class="currency-symbol">₽</span></div></td>
            <td>
                <div class="price-cell-wrap expense-cell">
                    <input type="text" value="${contractorValue}" ${contractorMode === 'none' ? 'disabled' : ''} oninput="formatNumberInput(this)" onblur="updateContractorValue('archive',${realIdx},this.value)">
                    <span class="currency-symbol ${contractorSymbolClass}">${contractorSymbol || 'нет'}</span>
                    <select class="expense-mode" onchange="updateContractorMode('archive',${realIdx},this.value)">
                        <option value="none" ${contractorMode==='none'?'selected':''}>Нет</option>
                        <option value="amount" ${contractorMode==='amount'?'selected':''}>₽</option>
                        <option value="percent" ${contractorMode==='percent'?'selected':''}>%</option>
                    </select>
                </div>
                <div class="expense-helper">${contractorHelper}</div>
            </td>
            <td><div class="net-display-wrap">${formatCurrency(item.pr)}<span class="net-prc-val">(${calcMarginPrc(item)}%)</span></div></td>
            <td><div class="action-btns" style="justify-content:flex-end">
                <div class="action-btn-base" title="Вернуть" onclick="mv(${realIdx},'archive','active')">
                    <svg style="width:16px;height:16px;"><use href="#icon-undo"/></svg>
                </div>
                <button class="del-btn" onclick="askDel('archive',${realIdx})" aria-label="Удалить в корзину">
                    <svg><use href="#icon-trash"/></svg>
                </button>
            </div></td>
        `;
        attachRowSelection(tr, 'archive', realIdx, `check-archive-${realIdx}`);
        tbody.appendChild(tr);
    });
    const footer = document.querySelector('#total-row-archive');
    footer.innerHTML = `<tr>
        <td colspan="4" class="footer-total-toggle" onclick="toggleFooterSelection('archive')">Всего ${visibleItems.length} проектов</td>
        <td style="text-align:right;">
            <div class="footer-note">Сумма</div>
            <div>${formatCurrency(tP)}</div>
        </td>
        <td style="text-align:right;">
            <div class="footer-note">Расходы</div>
            <div>${formatCurrency(tContr)}</div>
        </td>
        <td style="text-align:right;">
            <div class="footer-note">Чистыми</div>
            <div>${formatCurrency(tPr)}</div>
            <div class="footer-note">Налоги: ${formatCurrency(tTax)}</div>
        </td>
        <td></td>
    </tr>`;
}

function renderAll(){
    const tbody = document.querySelector('#t-all tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const allItems = [];
    ['active','waiting','paused'].forEach(type => {
        DATA[type].forEach((item, idx) => allItems.push({ item, __type: type, idx }));
    });
    getArchiveByMonth().forEach(item => allItems.push({ item, __type: 'archive', idx: DATA.archive.indexOf(item) }));

    let totalGross = 0, totalNet = 0, totalExp = 0, totalTax = 0, totalPaid = 0;

    allItems.forEach((wrap, i) => {
        const item = wrap.item;
        const status = STATUS_META[wrap.__type] || { label: wrap.__type, cls: '' };
        const contractorAmount = calcContractorAmount(item);
        const net = calcNet(item);
        const gross = toNumeric(item.p);
        const taxAmount = gross * ((toNumeric(item.taxPrc) || 0) / 100);
        totalGross += gross;
        totalNet += net;
        totalExp += contractorAmount;
        totalTax += taxAmount;
        const paidPct = toNumeric(item.paid) || 0;
        const paidAmount = Math.round(gross * (paidPct / 100));
        totalPaid += paidAmount;

        const tr = document.createElement('tr');
        const isArchiveRow = wrap.__type === 'archive';
        const deadlineValue = isArchiveRow ? item.date : (item.dl || item.date || item.start);
        const dateField = isArchiveRow ? 'date' : 'dl';
        const rem = isArchiveRow ? null : getTimeRemaining(deadlineValue);
        const remText = (!rem || (rem && rem.isInfinite) || (rem && rem.days < 0)) ? '' : ` (${rem.txt})`;
        const dateDisplay = isArchiveRow
            ? (deadlineValue ? formatDateDisplay(deadlineValue) : '—')
            : formatDeadlineDisplay(deadlineValue);
        const completionStatus = isArchiveRow ? analyzeCompletionStatus(item) : null;
        const dateCls = isArchiveRow ? (completionStatus?.onTime ? 'days-normal' : '') : (rem?.cls || '');
        let dateBadge = `<span class="date-text-display">${dateDisplay}${remText}</span>`;
        if (isArchiveRow && deadlineValue) {
            dateBadge = completionStatus?.onTime
                ? `<span class="deadline-success-badge" title="Сдано в срок">${dateDisplay}</span>`
                : `<span class="date-text-display">${dateDisplay}</span>`;
        }
        const linkIcon = renderLinkControls(item, wrap.idx, wrap.__type);

        const contractorMode = item.contractorMode || 'none';
        const contractorSymbol = contractorMode === 'percent' ? '%' : contractorMode === 'none' ? '' : '₽';
        const contractorSymbolClass = contractorSymbol ? '' : 'symbol-empty';
        const contractorValue = contractorMode === 'none' ? '' : formatPlainNumber(item.contractor ?? 0);
        const contractorHelper = contractorMode === 'none' ? 'Расходы не учитываются' : `≈ ${formatCurrency(contractorAmount)}`;

        const overdueIcon = isArchiveRow
            ? (completionStatus?.delayDays ? `<span class="deadline-warning-icon" title="Просрочено на ${completionStatus.delayDays} ${pluralize(completionStatus.delayDays, ['день','дня','дней'])}">●</span>` : '')
            : (!rem || !rem.overdueTooltip) ? '' : `<span class="deadline-warning-icon" title="${rem.overdueTooltip}">●</span>`;
        const selectionKey = `${wrap.__type}:${wrap.idx}`;
        const isSelected = selectedRows.all?.has(selectionKey);
        tr.dataset.index = selectionKey;
        tr.dataset.type = wrap.__type;
        tr.dataset.sourceIndex = wrap.idx;
        tr.dataset.projectId = item.id;
        if (isSelected) tr.classList.add('row-selected');

        const statusIcon = status.icon ? `<svg class="status-pill-icon"><use href="#${status.icon}"/></svg>` : '';

        tr.innerHTML = `
            <td class="select-col">
                <div class="row-index">${i + 1}</div>
                <div class="row-controls">
                    <svg class="dup-icon" onclick="duplicateRow('${wrap.__type}',${wrap.idx})" title="Дублировать"><use href="#icon-duplicate"/></svg>
                    <input type="checkbox" class="bulk-checkbox" id="check-all-${i}" data-key="${selectionKey}" onchange="toggleSelect('all', '${selectionKey}', this)" ${isSelected ? 'checked' : ''}>
                    <label for="check-all-${i}" style="display:none;"></label>
                </div>
            </td>
            <td><span class="status-pill ${status.cls}" title="${status.label}">${statusIcon}</span></td>
            <td><div class="client-wrap">
                <span contenteditable onblur="updVal('${wrap.__type}',${wrap.idx},'c',this.innerText)" class="${getClientNameClass(item)}">${item.c || ''}</span>
                ${linkIcon}
            </div></td>
            <td class="project-name-wrap"><span class="project-name" contenteditable onblur="updVal('${wrap.__type}',${wrap.idx},'n',this.innerText)">${item.n || ''}</span></td>
            <td class="date-cell"><div class="date-input-wrap ${dateCls}" onclick="openDate('${wrap.__type}',${wrap.idx},'${dateField}')"><svg class="date-icon"><use href="#icon-calendar"/></svg>${dateBadge}${overdueIcon}</div></td>
            <td style="text-align:right;"><div class="price-cell-wrap"><input type="text" value="${formatPlainNumber(gross)}" oninput="formatNumberInput(this)" onblur="updVal('${wrap.__type}',${wrap.idx},'p',this.value)"><span class="currency-symbol">₽</span></div></td>
            <td style="text-align:right;">
                <div class="price-cell-wrap expense-cell">
                    <input type="text" value="${contractorValue}" ${contractorMode === 'none' ? 'disabled' : ''} oninput="formatNumberInput(this)" onblur="updateContractorValue('${wrap.__type}',${wrap.idx},this.value)">
                    <span class="currency-symbol ${contractorSymbolClass}">${contractorSymbol || 'нет'}</span>
                    <select class="expense-mode" onchange="updateContractorMode('${wrap.__type}',${wrap.idx},this.value)">
                        <option value="none" ${contractorMode==='none'?'selected':''}>Нет</option>
                        <option value="amount" ${contractorMode==='amount'?'selected':''}>₽</option>
                        <option value="percent" ${contractorMode==='percent'?'selected':''}>%</option>
                    </select>
                </div>
                <div class="expense-helper">${contractorHelper}</div>
            </td>
            <td style="text-align:right;">
                <select class="tax-select" onchange="updVal('${wrap.__type}',${wrap.idx},'taxPrc',this.value)">
                    <option value="0" ${+item.taxPrc===0?'selected':''}>0%</option>
                    <option value="4" ${+item.taxPrc===4?'selected':''}>4%</option>
                    <option value="6" ${+item.taxPrc===6?'selected':''}>6%</option>
                    <option value="13" ${+item.taxPrc===13?'selected':''}>13%</option>
                </select>
            </td>
            <td style="text-align:right;"><div class="net-display-wrap">${formatCurrency(net)}<span class="net-prc-val">(${calcMarginPrc(item)}%)</span></div></td>
            <td style="text-align:right;">
                <div class="paid-summary">
                    <span class="paid-chip">${paidPct}%</span>
                    <span class="paid-amount">${formatCurrency(paidAmount)}</span>
                </div>
            </td>
            <td class="actions-cell" style="text-align:right;">
                <button class="link-btn" onclick="startProjectEdit('${wrap.__type}', ${wrap.idx})" title="Редактировать">
                    <svg class="btn-icon"><use href="#icon-pen"/></svg>
                </button>
                <button class="del-btn" onclick="askDel('${wrap.__type}',${wrap.idx})" title="Удалить" aria-label="Удалить в корзину">
                    <svg><use href="#icon-trash"/></svg>
                </button>
            </td>
        `;
        attachRowSelection(tr, 'all', selectionKey, `check-all-${i}`);
        tbody.appendChild(tr);
    });

    const footer = document.querySelector('#total-row-all');
    if (footer) {
        footer.innerHTML = `<tr>
            <td colspan="5" class="footer-total-toggle" onclick="toggleFooterSelection('all')">Всего ${allItems.length} проектов</td>
            <td style="text-align:right;">
                <div class="footer-note">Сумма</div>
                <div>${formatCurrency(totalGross)}</div>
            </td>
            <td style="text-align:right;">
                <div class="footer-note">Расходы</div>
                <div>${formatCurrency(totalExp)}</div>
            </td>
            <td style="text-align:right;">
                <div class="footer-note">Налоги</div>
                <div>${formatCurrency(totalTax)}</div>
            </td>
            <td style="text-align:right;">
                <div class="footer-note">Чистыми</div>
                <div>${formatCurrency(totalNet)}</div>
            </td>
            <td style="text-align:right;">
                <div class="footer-note">Оплачено</div>
                <div>${formatCurrency(totalPaid)}</div>
            </td>
            <td></td>
        </tr>`;
    }
}

function formatTrashExpire(item) {
    const fallback = { text: 'Будет удалено в течение часа', tone: 'danger' };
    if (!item.deletedAt) return fallback;
    const retentionMs = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(item.deletedAt + retentionMs);
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) return fallback;
    const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hours = Math.ceil((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const plural = (n, one, few, many) => {
        const mod10 = n % 10, mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
    };
    const relative = days > 0
        ? `Будет удалено через ${days} ${plural(days, 'день', 'дня', 'дней')}`
        : `Будет удалено через ${Math.max(hours, 1)} ${plural(Math.max(hours, 1), 'час', 'часа', 'часов')}`;
    const tone = remainingMs <= 24 * 60 * 60 * 1000 ? 'danger' : remainingMs <= 3 * 24 * 60 * 60 * 1000 ? 'warn' : 'neutral';
    return { text: relative, tone };
}

function formatTrashDate(ts) {
    if (!ts) return '?';
    const d = new Date(ts);
    const day = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }).replace('.', '');
    const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day}, ${time}`;
}

function renderTrash(){
    const tbody = document.querySelector('#t-trash tbody');
    tbody.innerHTML = '';
    DATA.trash.forEach((item, i) => {
        const tr = document.createElement('tr');
        tr.classList.add('trash-row');
        tr.dataset.index = i;
        tr.dataset.type = 'trash';
        tr.dataset.projectId = item.id;

        const isSelected = selectedRows.trash?.has(i.toString());
        if (isSelected) tr.classList.add('row-selected');
        const delDate = formatTrashDate(item.deletedAt);
        const expireInfo = formatTrashExpire(item);
        const linkBtns = renderLinkControls(item, i, 'trash');
        const gross = toNumeric(item.p);
        const net = calcNet(item);
        const paidPct = toNumeric(item.paid) || 0;
        const paidAmount = Math.round(gross * (paidPct / 100));
        tr.innerHTML = `
            <td class="select-col">
                <div class="row-index">${i + 1}</div>
                <div class="row-controls">
                    <svg class="dup-icon" onclick="duplicateRow('trash',${i})" title="Дублировать"><use href="#icon-duplicate"/></svg>
                    <input type="checkbox" class="bulk-checkbox" id="check-trash-${i}" onchange="toggleSelect('trash', ${i}, this)" ${selectedRows.trash?.has(i.toString()) ? 'checked' : ''}>
                    <label for="check-trash-${i}" style="display:none;"></label>
                </div>
            </td>
            <td class="trash-date-cell">
                <div class="trash-deleted-label">Удалено: ${delDate}</div>
                <div class="trash-expire ${expireInfo.tone}">${expireInfo.text}</div>
            </td>
            <td><div class="trash-text">${item.c || '—'}</div></td>
            <td>
                <div class="trash-text">${item.n || '—'}</div>
                <div class="trash-action-btns" style="justify-content:flex-start;">${linkBtns}</div>
            </td>
            <td><div class="trash-amount">${formatCurrency(gross)}</div></td>
            <td><div class="trash-amount">${formatCurrency(net)}</div></td>
            <td>
                <div class="paid-summary">
                    <span class="paid-chip">${paidPct}%</span>
                    <span class="paid-amount">${formatCurrency(paidAmount)}</span>
                </div>
            </td>
            <td>
                <div class="trash-action-btns">
                    <div class="restore-trash-btn" onclick="restoreFromTrash(${i})">Восстановить</div>
                    <div class="delete-forever-text" onclick="deleteForeverCheck(${i})" title="Удалить навсегда">Удалить</div>
                </div>
            </td>
        `;
        attachRowSelection(tr, 'trash', i, `check-trash-${i}`);
        tbody.appendChild(tr);
    });
    const footer = document.querySelector('#t-trash tfoot td:first-child');
    if (footer) {
        footer.className = 'footer-total-toggle';
        footer.onclick = () => toggleFooterSelection('trash');
        footer.innerText = `Всего ${DATA.trash.length} элементов`;
    }
}

function updVal(type, idx, key, val){
    if(key==='p' || key==='contractor' || key==='paid' || key==='taxPrc') val = toNumeric(val);
    DATA[type][idx][key] = val;
    sortData('active', 'dl', 'date', true);
    save(); upd();
}

function updateContractorValue(type, idx, val) {
    DATA[type][idx].contractor = toNumeric(val);
    sortData('active', 'dl', 'date', true);
    save(); upd();
}

function updateContractorMode(type, idx, mode) {
    DATA[type][idx].contractorMode = mode;
    if (mode === 'none') DATA[type][idx].contractor = 0;
    sortData('active', 'dl', 'date', true);
    save(); upd();
}

function mv(idx, from, to){
    if (to === 'archive') {
        openCompleteModal(idx, from);
        return;
    }
    const item = DATA[from][idx];
    if (!item) return;
    DATA[from].splice(idx, 1);
    if(to === 'active') {
        if (!item.start) item.start = item.start || today;
        if (!item.dl) item.dl = item.dl || today;
        if (item.paid === undefined || item.paid === null) item.paid = 50;
    }
    if(to === 'potential') { if (item.paid === undefined || item.paid === null) item.paid = 0; }
    if(to === 'waiting' || to === 'paused') { if (item.paid === undefined || item.paid === null) item.paid = 0; }

    DATA[to].unshift(item);
    sortData('active', 'dl', 'date', true);
    save();
    setTimeout(() => { switchTab(to); }, 10);
}

function openCompleteModal(idx, from) {
    const item = DATA[from]?.[idx];
    if (!item) return;
    completionContext = { idx, from };
    const dateInput = document.getElementById('completeDateInput');
    const timeInput = document.getElementById('completeTimeInput');
    const now = new Date();
    const isoNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
    if (dateInput) dateInput.value = isoNow.slice(0, 10);
    if (timeInput) timeInput.value = isoNow.slice(11, 16);

    const sourceLabel = STATUS_META[from]?.label || 'Текущий раздел';
    const sourcePill = document.getElementById('completeSourcePill');
    if (sourcePill) sourcePill.innerText = sourceLabel;
    updateCompleteHint();
    document.getElementById('completeModal').style.display = 'flex';
}

function closeCompleteModal() {
    completionContext = null;
    document.getElementById('completeModal').style.display = 'none';
}

function getCompletionDateTime() {
    const dateVal = document.getElementById('completeDateInput')?.value || today;
    const timeVal = document.getElementById('completeTimeInput')?.value || '00:00';
    return `${dateVal}T${timeVal}`;
}

function parseLocalDateTime(value, fallbackToEndOfDay = false) {
    if (!value) return null;
    const normalized = value.replace(' ', 'T');
    const [datePart, timePartRaw = ''] = normalized.split('T');
    const [year, month, day] = (datePart || '').split('-').map(Number);
    if (![year, month, day].every(Number.isFinite)) return null;

    const [hoursRaw, minutesRaw] = timePartRaw.split(':').map(Number);
    const hours = Number.isFinite(hoursRaw) ? hoursRaw : (fallbackToEndOfDay ? 23 : 0);
    const minutes = Number.isFinite(minutesRaw) ? minutesRaw : (fallbackToEndOfDay ? 59 : 0);
    const seconds = fallbackToEndOfDay ? 59 : 0;

    return new Date(year, month - 1, day, hours, minutes, seconds, fallbackToEndOfDay ? 999 : 0);
}

  function buildCompletionMessage(item, completedAt) {
      // Используем только явный дедлайн или заранее сохранённый снимок, чтобы
      // проекты без срока не считались просроченными из-за других дат
      const deadline = item.dl || item.deadlineSnapshot;
      if (!deadline) {
          return { status: 'info', message: 'Дедлайн не был указан — отметка сохранит правильную историю.' };
      }

      const deadlineDate = normalizeDateTimeValue(deadline, { endOfDayIfDateOnly: true });
      const doneDate = normalizeDateTimeValue(completedAt, { endOfDayIfDateOnly: true });
      if (!deadlineDate || !doneDate) {
          return { status: 'warning', message: 'Проверь дату — если все ок, сохраняем.' };
      }

      return doneDate.getTime() <= deadlineDate.getTime()
          ? { status: 'success', message: 'Срок соблюдён — отлично сработано!' }
          : { status: 'warning', message: 'Есть просрочка. Зафиксируй дату и постарайся не повторять.' };
  }

function updateCompleteHint() {
    if (!completionContext) return;
    const { idx, from } = completionContext;
    const item = DATA[from]?.[idx];
    if (!item) return;
    const val = getCompletionDateTime();
    const { status, message } = buildCompletionMessage(item, val);
    const hint = document.getElementById('completeHint');
    const feedback = document.getElementById('completeFeedback');
    const icon = document.getElementById('completeFeedbackIcon');
    const title = document.getElementById('completeHintTitle');
    if (hint) hint.innerText = message;
    if (title) {
        const titles = {
            success: 'Отлично сработано!',
            warning: 'Есть просрочка',
            info: 'Нет дедлайна'
        };
        title.innerText = titles[status] || 'Обновление статуса';
    }
    if (feedback) {
        feedback.classList.remove('success', 'warning', 'info');
        feedback.classList.add(status || 'info');
    }
    if (icon) {
        const iconId = status === 'success' ? '#icon-check' : status === 'warning' ? '#icon-alert' : '#icon-info';
        icon.innerHTML = `<svg class="feedback-icon"><use href="${iconId}"/></svg>`;
    }
}

function confirmCompletion() {
    if (!completionContext) return;
    const { idx, from } = completionContext;
    const item = DATA[from]?.[idx];
    if (!item) { closeCompleteModal(); return; }

    const completedAt = getCompletionDateTime();
    const deadlineSnapshot = item.dl || item.date || null;
    const normalizedCompletion = normalizeDateTimeValue(completedAt, { endOfDayIfDateOnly: true });
    const normalizedDeadline = normalizeDateTimeValue(deadlineSnapshot, { endOfDayIfDateOnly: true });
    const completedOnTime = (normalizedCompletion && normalizedDeadline)
        ? normalizedCompletion.getTime() <= normalizedDeadline.getTime()
        : null;
    item.deadlineSnapshot = deadlineSnapshot;
    item.completedOnTime = completedOnTime;
    DATA[from].splice(idx, 1);
    item.date = completedAt;
    item.paid = 100;
    delete item.start;
    delete item.dl;

    DATA.archive.unshift(item);
    completionContext = null;
    closeCompleteModal();
    sortData('active', 'dl', 'date', true);
    save();
    setTimeout(() => { switchTab('archive'); }, 10);
    showToast('Проект перенесен в выполнено');
}

function duplicateRow(type, idx){
    const item = JSON.parse(JSON.stringify(DATA[type].find((_, i) => i === idx)));
    if(!item) return;
    item.n = item.n + " (Копия)";
    item.id = generateProjectId();
    DATA[type].unshift(item);
    if (item.id) EXTRA_TASKS[item.id] = [];
    save(); upd();
}

function askDel(type, idx){
    const itemIndex = DATA[type].findIndex((_, i) => i === idx);
    if (itemIndex > -1) {
        const item = DATA[type].splice(itemIndex, 1)[0];
        item.deletedAt = Date.now();
        DATA.trash.unshift(item);
        lastPermanentDeletion = null;
        lastTrashMove = { type, items: [{ item, index: itemIndex }] };
        save(); upd();
        showToast('Перемещено в корзину', 'Отменить', undoMoveToTrash);
    }
}

function deleteForeverCheck(idx) {
    document.getElementById('del-modal-title').innerText = "Подтвердите действие";
    document.getElementById('del-modal-desc').innerText = "Удалить навсегда?";
    document.getElementById('deleteConfirmModal').style.display = 'flex';
    document.getElementById('finalDeleteBtn').style.backgroundColor = 'var(--red)';
    document.getElementById('finalDeleteBtn').style.borderColor = 'var(--red)';
        document.getElementById('finalDeleteBtn').innerText = 'Удалить навсегда';

    document.getElementById('finalDeleteBtn').onclick = () => {
        const item = DATA.trash.splice(idx, 1)[0];
        lastPermanentDeletion = item ? { type: 'trash', items: [{ item, index: idx }] } : null;
        document.getElementById('deleteConfirmModal').style.display = 'none';
        save(); upd();
        showToast('Удалено навсегда', 'Отмена', undoPermanentDelete);
    };
}

function clearTrashForever() {
    if (!DATA.trash.length) return;
    document.getElementById('del-modal-title').innerText = "Очистить корзину";
    document.getElementById('del-modal-desc').innerText = `Удалить ${DATA.trash.length} проектов без возможности восстановления?`;
    document.getElementById('deleteConfirmModal').style.display = 'flex';
    document.getElementById('finalDeleteBtn').style.backgroundColor = 'var(--red)';
    document.getElementById('finalDeleteBtn').style.borderColor = 'var(--red)';
    document.getElementById('finalDeleteBtn').innerText = 'Очистить корзину';

    document.getElementById('finalDeleteBtn').onclick = () => {
        lastPermanentDeletion = { type: 'trash', items: DATA.trash.map((item, index) => ({ item, index })) };
        DATA.trash = [];
        document.getElementById('deleteConfirmModal').style.display = 'none';
        save(); upd();
        showToast('Корзина очищена', 'Отмена', undoPermanentDelete);
    };
}

function formatLinkDisplay(url) {
    if (!url) return '';

    return (url || '').replace(/^https?:\/\//, '');
}

function buildFallbackLinkTitle(url) {
    try {
        const parsed = new URL(url);
        const cleanPath = parsed.pathname.replace(/\/+$/, '').replace(/^\//, '');
        return cleanPath ? `${parsed.hostname} • ${cleanPath}` : parsed.hostname;
    } catch (e) {
        return formatLinkDisplay(url);
    }
}

function setLinkPreviewTitle(titleText) {
    const titleEl = document.getElementById('new-project-link-title');
    if (!titleEl) return;
    titleEl.textContent = titleText;
    titleEl.style.display = titleText ? 'block' : 'none';
}

async function fetchPageTitle(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) return '';
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) return '';
        const html = await response.text();
        const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        return match ? match[1].trim() : '';
    } catch (e) {
        return '';
    }
}

async function refreshNewProjectLinkTitle() {
    if (!newProjectLink) {
        newProjectLinkTitle = '';
        lastFetchedLinkForTitle = '';
        setLinkPreviewTitle('');
        return;
    }

    const fallback = buildFallbackLinkTitle(newProjectLink);

    if (newProjectLink === lastFetchedLinkForTitle && newProjectLinkTitle) {
        setLinkPreviewTitle(newProjectLinkTitle || fallback);
        return;
    }

    lastFetchedLinkForTitle = newProjectLink;
    const resolvedTitle = await fetchPageTitle(newProjectLink);
    newProjectLinkTitle = resolvedTitle || fallback;

    if (newProjectLink === lastFetchedLinkForTitle) {
        const anchor = document.getElementById('new-project-link-text');
        if (anchor) anchor.title = newProjectLinkTitle || fallback;
        setLinkPreviewTitle(newProjectLinkTitle);
    }
}

function updateNewProjectLinkButton() {
    const btn = document.getElementById('new-project-link-btn');
    const preview = document.getElementById('new-project-link-preview');
    const text = document.getElementById('new-project-link-text');
    const previewLabel = document.getElementById('new-project-link-label');
    if (!btn) return;
    const hasLink = !!newProjectLink;
    btn.classList.toggle('link-active', hasLink);
    btn.style.display = hasLink ? 'none' : 'inline-flex';
    const label = btn.querySelector('span');
    if (label) label.textContent = 'Ссылка на чат/материалы';
    if (previewLabel) previewLabel.textContent = hasLink ? 'Ссылка добавлена' : 'Ссылка на чат/материалы';
    if (preview && text) {
        const displayText = hasLink ? formatLinkDisplay(newProjectLink) : '';
        preview.style.display = hasLink ? 'flex' : 'none';
        text.textContent = displayText;
        text.href = hasLink ? newProjectLink : '#';
        text.title = hasLink ? (newProjectLinkTitle || buildFallbackLinkTitle(newProjectLink)) : '';
        setLinkPreviewTitle(hasLink ? (newProjectLinkTitle || buildFallbackLinkTitle(newProjectLink)) : '');
        if (hasLink) refreshNewProjectLinkTitle();
    }
}

function clearNewProjectLink() {
    newProjectLink = '';
    newProjectLinkTitle = '';
    lastFetchedLinkForTitle = '';
    updateNewProjectLinkButton();
}

function wipeAllData() {
    const ok = confirm('Стереть всю базу, включая шаблоны? Отменить действие нельзя.');
    if (!ok) return;
    localStorage.removeItem(K);
    localStorage.removeItem(NAME_TEMPLATES_KEY);
    location.reload();
}

function collectProjectFormState() {
    return {
        type: document.getElementById('add-proj-type')?.value,
        name: document.getElementById('add-proj-name')?.value,
        client: document.getElementById('add-proj-client')?.value,
        price: document.getElementById('add-proj-price')?.value,
        contractorMode: document.getElementById('add-proj-contractor-mode')?.value,
        contractor: document.getElementById('add-proj-contractor')?.value,
        tax: document.getElementById('add-proj-tax')?.value,
        paid: document.getElementById('add-proj-paid')?.value,
        start: document.getElementById('add-proj-start-val')?.value,
        deadline: document.getElementById('add-proj-dl-val')?.value,
        link: newProjectLink || ''
    };
}

function captureProjectFormSnapshot() {
    projectFormSnapshot = JSON.stringify(collectProjectFormState());
}

function hasProjectFormChanges() {
    if (!projectFormSnapshot) return false;
    return JSON.stringify(collectProjectFormState()) !== projectFormSnapshot;
}

function closeProjectModal() {
    document.getElementById('addProjectModal').style.display = 'none';
    projectFormSnapshot = null;
}

function attemptCloseProjectModal(force = false) {
    if (force || !hasProjectFormChanges()) {
        closeProjectModal();
        return;
    }
    const ok = confirm('Вы уверены, что хотите закрыть окно? Внесённые изменения не будут сохранены.');
    if (ok) closeProjectModal();
}

function restoreFromTrash(idx){
    const item = DATA.trash.splice(idx, 1)[0];
    delete item.deletedAt;
    DATA.active.unshift(item);
    save(); switchTab('active');
}

function openAddModal(type = null, idx = null){
    const isEdit = typeof type === 'string' && typeof idx === 'number';
    editContext = isEdit ? { type, idx } : null;
    const titleEl = document.querySelector('#addProjectModal h2');
    const saveBtn = document.querySelector('.add-modal-actions .save-stg');

    updateStatusSelectOptions();

    if (titleEl) titleEl.textContent = isEdit ? 'Редактировать проект' : 'Новый проект';
    if (saveBtn) saveBtn.textContent = isEdit ? 'Сохранить изменения' : 'Создать новый проект';

    const presetTimeInput = document.getElementById('add-proj-dl-time');

    if (isEdit) {
        const item = DATA[type][idx];
        document.getElementById('add-proj-name').value = item.n || '';
        document.getElementById('add-proj-client').value = item.c || '';
        document.getElementById('add-proj-price').value = formatPlainNumber(item.p || 0);
        const mode = item.contractorMode || 'none';
        document.getElementById('add-proj-contractor-mode').value = mode;
        handleNewContractorModeChange(mode);
        document.getElementById('add-proj-contractor').value = formatPlainNumber(item.contractor || 0);
        document.getElementById('add-proj-tax').value = String(item.taxPrc ?? 0);
        document.getElementById('add-proj-paid').value = String(item.paid ?? (type === 'archive' ? 100 : type === 'active' ? 50 : 0));
        document.getElementById('add-proj-type').value = type;
        document.getElementById('add-proj-start-val').value = item.start || '';
        document.getElementById('add-proj-dl-val').value = item.dl || '';
        previousDeadlineValue = item.dl || '';
        deadlineUnset = !item.dl;
        document.getElementById('add-proj-start-display').querySelector('.date-text-display').innerHTML = formatDateDisplay(item.start || today);
        document.getElementById('add-proj-dl-display').querySelector('.date-text-display').innerHTML = formatDeadlineDisplay(item.dl);
        document.getElementById('add-proj-dl-days').value = '';
        document.getElementById('add-proj-dl-custom').value = '';
        if (presetTimeInput) presetTimeInput.value = item.dl && item.dl.includes('T') ? item.dl.slice(11, 16) : '';
        newProjectLink = item.link || '';
        newProjectLinkTitle = item.linkTitle || '';
        lastFetchedLinkForTitle = newProjectLinkTitle && newProjectLink ? newProjectLink : '';
        toggleProjectNameClear();
        handleStatusChange(type, { preservePaid: true });
    } else {
        ['name','client','price','contractor'].forEach(id => document.getElementById(`add-proj-${id}`).value = '');
        toggleProjectNameClear();
        document.getElementById('add-proj-tax').value = '0';
        document.getElementById('add-proj-contractor-mode').value = 'none';
        handleNewContractorModeChange('none');
        document.getElementById('add-proj-paid').value = '50';
        document.getElementById('add-proj-type').value = 'active';
        document.getElementById('add-proj-start-val').value = today;
        document.getElementById('add-proj-dl-val').value = '';
        previousDeadlineValue = '';
        deadlineUnset = true;
        document.getElementById('add-proj-dl-days').value = '';
        document.getElementById('add-proj-dl-custom').value = '';
        if (presetTimeInput) presetTimeInput.value = '';
        document.getElementById('add-proj-start-display').querySelector('.date-text-display').innerHTML = formatDateDisplay(today);
        document.getElementById('add-proj-dl-display').querySelector('.date-text-display').innerHTML = formatDeadlineDisplay('');
        handleStatusChange('active');
        newProjectLink = '';
        newProjectLinkTitle = '';
        lastFetchedLinkForTitle = '';
    }
    updateNewProjectLinkButton();
    captureProjectFormSnapshot();
    document.getElementById('addProjectModal').style.display = 'flex';
}
function saveNewProject(){
    const nameInput = document.getElementById('add-proj-name');
    const clientInput = document.getElementById('add-proj-client');
    const name = (nameInput?.value || '').trim();
    const client = (clientInput?.value || '').trim();
    [nameInput, clientInput].forEach(el => el?.classList.remove('input-error'));
    if (!name || !client) {
        nameInput?.classList.toggle('input-error', !name);
        clientInput?.classList.toggle('input-error', !client);
        alert('Укажите клиента и название проекта.');
        return;
    }
    const price = toNumeric(document.getElementById('add-proj-price').value);
    const contrMode = document.getElementById('add-proj-contractor-mode').value || 'none';
    const contr = contrMode === 'none' ? 0 : toNumeric(document.getElementById('add-proj-contractor').value);
    const tax = +document.getElementById('add-proj-tax').value || 0;
    const paid = +document.getElementById('add-proj-paid').value || 0;
    const type = document.getElementById('add-proj-type').value;
    const start = document.getElementById('add-proj-start-val').value || today;
    const rawDeadline = (document.getElementById('add-proj-dl-val').value || '').trim();
    const isDeadlineCleared = deadlineUnset || rawDeadline === '';
    const finalDeadline = isDeadlineCleared ? '' : rawDeadline;

    const isEdit = !!editContext;
    const base = isEdit ? { ...DATA[editContext.type][editContext.idx] } : {};

    const item = {
        ...base,
        n: name, c: client, p: price, contractor: contr, contractorMode: contrMode, taxPrc: tax, link: newProjectLink,
        linkTitle: newProjectLink ? (newProjectLinkTitle || buildFallbackLinkTitle(newProjectLink)) : undefined,
        start: type==='active'? start : base.start,
        dl: type==='active' || type==='waiting' || type==='paused'
            ? (isDeadlineCleared ? '' : (finalDeadline || base.dl || ''))
            : undefined,
        paid: type==='archive' ? 100 : paid,
        date: type==='archive' ? today : base.date,
        id: base.id || generateProjectId()
    };

    if (type === 'potential') {
        delete item.start;
        delete item.dl;
    }

    if (isEdit) {
        const fromType = editContext.type;
        DATA[fromType].splice(editContext.idx, 1);
        if (fromType === type) {
            DATA[type].splice(editContext.idx, 0, item);
        } else {
            DATA[type].unshift(item);
        }
        editContext = null;
    } else {
        DATA[type].unshift(item);
    }
    closeProjectModal();
    showToast(isEdit ? 'Проект обновлён' : 'Проект создан');
    sortData('active', 'dl', 'date', true);
    save(); switchTab(type);
}

function applyDeadlinePreset() {
    const select = document.getElementById('add-proj-dl-days');
    const customInput = document.getElementById('add-proj-dl-custom');
    const timeInput = document.getElementById('add-proj-dl-time');

    const isCustomPreset = select.value === 'custom';
    // Логика отображения: если выбрано 'custom' ИЛИ уже введено значение в custom, показываем поле
    if (isCustomPreset) {
        customInput.style.display = 'block';
        // Не делаем focus каждый раз, иначе сбивается ввод
    } else {
        customInput.style.display = customInput.value ? 'block' : 'none';
    }

    deadlineUnset = false;
    const currentStart = document.getElementById('add-proj-start-val').value || today;
    const currentDl = document.getElementById('add-proj-dl-val').value || currentStart || today;
    const startTime = currentStart && currentStart.includes('T') ? currentStart.slice(11, 16) : '';
    const manualTime = (timeInput?.value || '').trim();
    const finalTime = manualTime || startTime;

    // Сохраняем предыдущее значение, если еще не сохранили
    if (!previousDeadlineValue) {
        previousDeadlineValue = currentDl;
    }

    // Если пользователь пишет в инпут, но селект не custom (бывает редко), переключаем
    if (document.activeElement === customInput && select.value !== 'custom') {
        select.value = 'custom';
    }

    // Если "Быстрый срок" (пусто), восстанавливаем старое или текущее
    if (select.value === '') {
        customInput.value = '';
        customInput.style.display = 'none';
        const restoreValue = previousDeadlineValue || '';
        document.getElementById('add-proj-dl-val').value = restoreValue;
        document.getElementById('add-proj-dl-display').querySelector('.date-text-display').innerHTML = formatDeadlineDisplay(restoreValue);
        deadlineUnset = !restoreValue;
        return;
    }

    let days = 0;
    if (isCustomPreset) {
        days = parseInt(customInput.value, 10);
    } else {
        days = parseInt(select.value, 10);
        // Если выбрали пресет, очищаем кастомное поле визуально, но не скрываем его насильно, если логика требует
        customInput.value = '';
    }

    if (!days || isNaN(days) || days <= 0) return; // Ждем валидного числа

    const startRaw = document.getElementById('add-proj-start-val').value || today;
    const baseDate = new Date(startRaw.replace(' ', 'T'));
    if (isNaN(baseDate)) return;
    
    const dlDate = new Date(baseDate);
    dlDate.setDate(dlDate.getDate() + days);
    
    const deadlineValue = formatDateWithTime(dlDate, finalTime);
    document.getElementById('add-proj-dl-val').value = deadlineValue;
    document.getElementById('add-proj-dl-display').querySelector('.date-text-display').innerHTML = formatDeadlineDisplay(deadlineValue);
}

function clearNewProjectDeadline() {
    deadlineUnset = true;
    document.getElementById('add-proj-dl-val').value = '';
    document.getElementById('add-proj-dl-display').querySelector('.date-text-display').innerHTML = formatDeadlineDisplay('');
    document.getElementById('add-proj-dl-days').value = '';
    document.getElementById('add-proj-dl-custom').value = '';
    previousDeadlineValue = '';
    const presetTimeInput = document.getElementById('add-proj-dl-time');
    if (presetTimeInput) presetTimeInput.value = '';
}

function handleStatusChange(status, options = {}) {
    const { preservePaid = false } = options;
    const dateBlocks = document.querySelectorAll('.status-dates');
    dateBlocks.forEach(block => block.style.display = status === 'potential' ? 'none' : '');
    if (status === 'potential') {
        document.getElementById('add-proj-dl-days').value = '';
        document.getElementById('add-proj-dl-custom').value = '';
    }

    const paidSelect = document.getElementById('add-proj-paid');
    if (paidSelect && status === 'archive') {
        paidSelect.value = '100';
    } else if (paidSelect && !preservePaid) {
        const defaultPaid = status === 'archive' ? 100 : status === 'active' ? 50 : 0;
        paidSelect.value = String(defaultPaid);
    }
}

function getPresetBaseDate() {
    if (queue.targetId) {
        if (queue.targetId === 'add-proj-dl-val') {
            return document.getElementById('add-proj-start-val').value || today;
        }
        return document.getElementById(queue.targetId)?.value || today;
    }
    if (queue.type && typeof queue.idx === 'number') {
        const item = DATA[queue.type][queue.idx] || {};
        if (queue.field === 'dl') return item.start || item.dl || item.date || today;
        return item[queue.field] || item.start || today;
    }
    return today;
}

function applyDateModalPreset() {
    const select = document.getElementById('date-modal-preset');
    const customInput = document.getElementById('date-modal-custom');
    if (!select) return;

    const isCustom = select.value === 'custom';
    customInput.style.display = isCustom ? 'block' : 'none';

    if (document.activeElement === customInput && select.value !== 'custom') {
        select.value = 'custom';
    }

    if (select.value === '') {
        customInput.value = '';
        return;
    }

    let days = parseInt(select.value, 10);
    if (select.value === 'custom') {
        days = parseInt(customInput.value, 10);
    }
    if (!days || days <= 0) return;

    const baseRaw = (getPresetBaseDate() || today).slice(0, 10);
    const baseDate = new Date(baseRaw + 'T00:00:00');
    if (isNaN(baseDate)) return;
    baseDate.setDate(baseDate.getDate() + days);
    const nextDate = baseDate.toISOString().slice(0, 10);

    if (datePicker) datePicker.setDate(nextDate, true);
    else document.getElementById('date-input-val').value = nextDate;
}

function openDate(type, idx, field){
    queue = {type, idx, field, targetId: null};
    const val = DATA[type][idx][field];
    openDateBase(val);
}
function openDateInModal(targetInputId){
    const val = document.getElementById(targetInputId).value;
    if (targetInputId === 'add-proj-dl-val') deadlineUnset = false;
    queue = {type: null, idx: null, field: null, targetId: targetInputId};
    openDateBase(val);
}
function setupDatePickers(){
    if (typeof flatpickr !== 'function') return;

    datePicker = flatpickr('#date-input-val', {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'j M',
        defaultDate: today,
        locale: flatpickr.l10ns.ru,
        disableMobile: true,
    });

    timePicker = flatpickr('#time-input-val', {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        defaultDate: '12:00',
        time_24hr: true,
        minuteIncrement: 5,
        disableMobile: true,
    });
}
function openDateBase(val) {
    const hasTime = val && val.includes('T') && val.length > 10;
    document.getElementById('date-has-time').checked = hasTime;

    const dateVal = val ? val.slice(0, 10) : today;
    const timeVal = hasTime ? val.slice(11, 16) : '12:00';

    const modalPreset = document.getElementById('date-modal-preset');
    const modalCustom = document.getElementById('date-modal-custom');
    if (modalPreset) modalPreset.value = '';
    if (modalCustom) modalCustom.value = '';

    if (datePicker) datePicker.setDate(dateVal, true);
    else document.getElementById('date-input-val').value = dateVal;

    if (timePicker) timePicker.setDate(timeVal, true, 'H:i');
    else document.getElementById('time-input-val').value = timeVal;

    toggleTimeInput();

    const clearBtn = document.getElementById('date-modal-clear');
    const isDeadlineContext = (queue?.targetId && queue.targetId.includes('dl')) || queue?.field === 'dl';
    const presetBlock = document.querySelector('.modal-deadline-presets');
    if (clearBtn) {
        clearBtn.style.display = isDeadlineContext ? 'inline-flex' : 'none';
    }
    if (presetBlock) {
        presetBlock.style.display = isDeadlineContext ? 'flex' : 'none';
    }
    document.getElementById('dateModal').style.display = 'flex';
}
function toggleTimeInput(){
    const chk = document.getElementById('date-has-time');
    const baseInput = document.getElementById('time-input-val');
    const inputs = [baseInput, timePicker?.input, timePicker?.altInput].filter(Boolean);

    inputs.forEach(inp => {
        inp.disabled = !chk.checked;
        inp.style.opacity = chk.checked ? '1' : '0.3';
    });

    if (timePicker) {
        timePicker.set('clickOpens', chk.checked);
    }
}
function clearDateModalDeadline() {
    const dateInput = document.getElementById('date-input-val');
    const timeInput = document.getElementById('time-input-val');
    const isDeadlineContext = (queue?.targetId && queue.targetId.includes('dl')) || queue?.field === 'dl';
    if (!isDeadlineContext) return;

    if (datePicker) datePicker.clear();
    else if (dateInput) dateInput.value = '';
    if (timePicker) timePicker.clear();
    if (timeInput) timeInput.value = '';

    const timeToggle = document.getElementById('date-has-time');
    if (timeToggle) {
        timeToggle.checked = false;
        toggleTimeInput();
    }

    if (queue?.targetId) {
        const displayId = queue.targetId.replace('-val', '-display');
        const displayNode = document.getElementById(displayId)?.querySelector('.date-text-display');
        document.getElementById(queue.targetId).value = '';
        if (displayNode) displayNode.innerHTML = formatDeadlineDisplay('');
        if (queue.targetId === 'add-proj-dl-val') deadlineUnset = true;
        closeDateModal();
        return;
    }

    if (queue?.type && typeof queue.idx === 'number') {
        DATA[queue.type][queue.idx].dl = '';
        closeDateModal();
        save();
        upd();
    }
}
function closeDateModal(){ document.getElementById('dateModal').style.display = 'none'; }
function saveDate(){
    const d = document.getElementById('date-input-val').value;
    const t = document.getElementById('time-input-val').value;
    const useTime = document.getElementById('date-has-time').checked;
    if(!d) return;
    const result = useTime ? `${d}T${t}` : d;

    if (queue.targetId) {
        document.getElementById(queue.targetId).value = result;
        const displayId = queue.targetId.replace('-val', '-display');
        const formatter = queue.targetId.includes('dl') ? formatDeadlineDisplay : formatDateDisplay;
        document.getElementById(displayId).querySelector('.date-text-display').innerHTML = formatter(result);
        if (queue.targetId === 'add-proj-dl-val') { previousDeadlineValue = result; deadlineUnset = false; }
        if (queue.targetId === 'add-proj-start-val') {
            const presetTimeInput = document.getElementById('add-proj-dl-time');
            if (presetTimeInput && result.includes('T')) {
                presetTimeInput.value = result.slice(11, 16);
            }
            const presetDays = parseInt(document.getElementById('add-proj-dl-days').value, 10);
            if (presetDays) applyDeadlinePreset();
        }
    } else {
        DATA[queue.type][queue.idx][queue.field] = result;
        sortData('active', 'dl', 'date', true);
    }
    
    closeDateModal(); save(); upd();
}

function openProjectLink(idx, type) {
    const link = DATA[type][idx].link;
    if (link) {
        window.open(link, '_blank');
    } else {
        openLink(type, idx);
    }
}
function openLink(type, idx){
    queue = {type, idx};
    const currentLink = type === 'new' ? newProjectLink : (DATA[type][idx]?.link || '');
    const tgCheckbox = document.getElementById('link-is-telegram');
    let displayValue = currentLink;

    if (currentLink.match(/t\.me\//)) {
        tgCheckbox.checked = true;
        displayValue = currentLink.replace(/^https?:\/\/t\.me\//, '').replace(/^@+/, '');
    } else {
        tgCheckbox.checked = false;
    }

    document.getElementById('link-input').value = displayValue;
    document.getElementById('linkModal').style.display = 'flex';
}
function closeLinkModal(){ document.getElementById('linkModal').style.display = 'none'; }
function saveLink(){
    const isTelegram = document.getElementById('link-is-telegram').checked;
    const raw = document.getElementById('link-input').value;
    const normalized = normalizeLinkValue(raw, isTelegram);
    const fallbackTitle = normalized ? buildFallbackLinkTitle(normalized) : '';

    lastFetchedLinkForTitle = '';

    if (queue.type === 'new') {
        newProjectLink = normalized;
        newProjectLinkTitle = fallbackTitle;
        updateNewProjectLinkButton();
        queue = { type: null, idx: null, field: null, targetId: null };
        closeLinkModal();
        return;
    }

    const queueType = queue.type;
    const queueIdx = queue.idx;
    const targetItem = DATA[queueType][queueIdx];
    if (targetItem) {
        targetItem.link = normalized;
        targetItem.linkTitle = normalized ? fallbackTitle : undefined;

        if (normalized) {
            fetchPageTitle(normalized).then(title => {
                const updatedItem = DATA[queueType]?.[queueIdx];
                if (!title || !updatedItem || updatedItem.link !== normalized) return;
                updatedItem.linkTitle = title;
                save();
            });
        }
    }
    closeLinkModal(); save(); upd();
}

function startProjectEdit(type, idx) {
    openAddModal(type, idx);
}

function collectSettingsFormState() {
    const selectedMode = document.querySelector('input[name="theme-mode"]:checked');
    const readToggle = (id) => document.getElementById(id)?.checked !== false;
    return {
        mode: selectedMode ? selectedMode.value : (UI_PREFS.themeMode || 'dark'),
        blockVisibility: {
            backup: readToggle('block-toggle-backup'),
            pace: readToggle('block-toggle-pace'),
            dashboard: readToggle('block-toggle-dashboard'),
            efficiency: readToggle('block-toggle-efficiency'),
            topClients: readToggle('block-toggle-top-clients'),
            record: readToggle('block-toggle-record'),
            reputation: readToggle('block-toggle-reputation'),
        },
        tableVisibility: {
            requests: readToggle('table-toggle-requests'),
            waiting: readToggle('table-toggle-waiting'),
            paused: readToggle('table-toggle-paused'),
        },
        statVisibility: {
            goal: readToggle('stat-toggle-goal'),
            fact: readToggle('stat-toggle-fact'),
            activeFact: readToggle('stat-toggle-active-fact'),
            paidGross: readToggle('stat-toggle-paid-gross'),
            totalGross: readToggle('stat-toggle-total-gross'),
            plan: readToggle('stat-toggle-plan'),
            forecast: readToggle('stat-toggle-forecast'),
            expenses: readToggle('stat-toggle-expenses'),
            taxes: readToggle('stat-toggle-taxes'),
        },
        goal: toNumeric(document.getElementById('stg-goal')?.value),
        record: toNumeric(document.getElementById('stg-rec')?.value)
    };
}

function captureSettingsSnapshot() {
    settingsSnapshot = collectSettingsFormState();
    settingsInitialState = {
        prefs: JSON.parse(JSON.stringify(UI_PREFS)),
        mode: UI_PREFS.themeMode,
        storedTheme: localStorage.getItem(THEME_KEY),
        overrideTheme: localStorage.getItem(THEME_OVERRIDE_KEY),
    };
}

function hasSettingsChanges() {
    if (!settingsSnapshot) return false;
    return JSON.stringify(collectSettingsFormState()) !== JSON.stringify(settingsSnapshot);
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
    document.getElementById('settingsUnsavedModal').style.display = 'none';
    settingsSnapshot = null;
    settingsInitialState = null;
}

function attemptCloseSettings(force = false) {
    if (force || !hasSettingsChanges()) {
        closeSettingsModal();
        return;
    }
    const ok = confirm('Вы уверены, что хотите закрыть окно? Внесённые изменения не будут сохранены.');
    if (ok) discardSettingsChanges();
}

function discardSettingsChanges() {
    if (settingsInitialState) {
        UI_PREFS = JSON.parse(JSON.stringify(settingsInitialState.prefs));
        persistUiPrefs();
        if (settingsInitialState.storedTheme) localStorage.setItem(THEME_KEY, settingsInitialState.storedTheme); else localStorage.removeItem(THEME_KEY);
        if (settingsInitialState.overrideTheme) localStorage.setItem(THEME_OVERRIDE_KEY, settingsInitialState.overrideTheme); else localStorage.removeItem(THEME_OVERRIDE_KEY);
        applyThemeMode(settingsInitialState.mode || 'dark', { silent: true, skipSave: true, respectOverride: false });
        applyBlockVisibility();
        applyTableVisibility();
        applyStatVisibility();
        applyStatOrder();
        applyBlockOrder();
    }
    closeSettingsModal();
}

function previewThemeMode(mode) {
    applyThemeMode(mode || UI_PREFS.themeMode || 'dark', { skipSave: true });
}

function openSettings(){
    activateSettingsPane('appearance');
    document.getElementById('stg-goal').value = formatPlainNumber(DATA.monthlyGoals[currentMonth] || 250000);
    document.getElementById('stg-rec').value = formatPlainNumber(DATA.settings.record || 0);
    const mode = UI_PREFS.themeMode || 'dark';
    ['auto', 'light', 'dark'].forEach(m => {
        const radio = document.getElementById(`theme-mode-${m}`);
        if (radio) radio.checked = mode === m;
        if (radio && !radio.dataset.previewBound) {
            radio.addEventListener('change', (e) => previewThemeMode(e.target.value));
            radio.dataset.previewBound = '1';
        }
    });
    const visibility = UI_PREFS.blockVisibility || {};
    const toggleMap = [
        ['block-toggle-backup', 'backup'],
        ['block-toggle-pace', 'pace'],
        ['block-toggle-dashboard', 'dashboard'],
        ['block-toggle-efficiency', 'efficiency'],
        ['block-toggle-top-clients', 'topClients'],
        ['block-toggle-record', 'record'],
        ['block-toggle-reputation', 'reputation']
    ];
    toggleMap.forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) {
            el.checked = visibility[key] !== false;
            if (!el.dataset.previewBound) {
                el.addEventListener('change', updateSettingsPreviewStates);
                el.dataset.previewBound = '1';
            }
        }
    });
    const tableVisibility = UI_PREFS.tableVisibility || {};
    [
        ['table-toggle-requests', 'requests'],
        ['table-toggle-waiting', 'waiting'],
        ['table-toggle-paused', 'paused'],
    ].forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.checked = tableVisibility[key] !== false;
    });
    const statVisibility = UI_PREFS.statVisibility || {};
    [
        ['stat-toggle-goal', 'goal'],
        ['stat-toggle-fact', 'fact'],
        ['stat-toggle-active-fact', 'activeFact'],
        ['stat-toggle-paid-gross', 'paidGross'],
        ['stat-toggle-total-gross', 'totalGross'],
        ['stat-toggle-plan', 'plan'],
        ['stat-toggle-forecast', 'forecast'],
        ['stat-toggle-expenses', 'expenses'],
        ['stat-toggle-taxes', 'taxes'],
    ].forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el) el.checked = statVisibility[key] !== false;
    });
    updateSettingsPreviewStates();
    captureSettingsSnapshot();
    document.getElementById('settingsModal').style.display = 'flex';
}
function openGoalSettings(){
    openSettings();
    activateSettingsPane('data');
    const goalInput = document.getElementById('stg-goal');
    if (goalInput) {
        goalInput.focus();
        goalInput.select();
    }
}
function openRecordSettings(){
    openSettings();
    activateSettingsPane('data');
    const recordInput = document.getElementById('stg-rec');
    if (recordInput) {
        recordInput.focus();
        recordInput.select();
    }
}
function saveSettings(){
    const selectedMode = document.querySelector('input[name="theme-mode"]:checked');
    UI_PREFS.blockVisibility = {
        backup: document.getElementById('block-toggle-backup')?.checked !== false,
        pace: document.getElementById('block-toggle-pace')?.checked !== false,
        dashboard: document.getElementById('block-toggle-dashboard')?.checked !== false,
        efficiency: document.getElementById('block-toggle-efficiency')?.checked !== false,
        topClients: document.getElementById('block-toggle-top-clients')?.checked !== false,
        record: document.getElementById('block-toggle-record')?.checked !== false,
        reputation: document.getElementById('block-toggle-reputation')?.checked !== false,
    };
    UI_PREFS.tableVisibility = {
        requests: document.getElementById('table-toggle-requests')?.checked !== false,
        waiting: document.getElementById('table-toggle-waiting')?.checked !== false,
        paused: document.getElementById('table-toggle-paused')?.checked !== false,
    };
    UI_PREFS.statVisibility = {
        goal: document.getElementById('stat-toggle-goal')?.checked !== false,
        fact: document.getElementById('stat-toggle-fact')?.checked !== false,
        activeFact: document.getElementById('stat-toggle-active-fact')?.checked !== false,
        paidGross: document.getElementById('stat-toggle-paid-gross')?.checked !== false,
        totalGross: document.getElementById('stat-toggle-total-gross')?.checked !== false,
        plan: document.getElementById('stat-toggle-plan')?.checked !== false,
        forecast: document.getElementById('stat-toggle-forecast')?.checked !== false,
        expenses: document.getElementById('stat-toggle-expenses')?.checked !== false,
        taxes: document.getElementById('stat-toggle-taxes')?.checked !== false,
    };
    if (selectedMode) {
        applyThemeMode(selectedMode.value);
    } else {
        persistUiPrefs();
    }
    applyBlockVisibility();
    applyTableVisibility();
    applyStatVisibility();
    DATA.monthlyGoals[currentMonth] = toNumeric(document.getElementById('stg-goal').value);
    DATA.settings.record = toNumeric(document.getElementById('stg-rec').value);
    closeSettingsModal();
    save(); upd();
}

function resetInterface() {
    const ok = confirm('Вернуть интерфейс к заводским настройкам? Настройки отображения и темы будут сброшены, на базу данных это не повлияет — проекты останутся.');
    if (!ok) return;
    UI_PREFS = JSON.parse(JSON.stringify(DEFAULT_UI_PREFS));
    persistUiPrefs();
    applyThemeMode(UI_PREFS.themeMode || 'dark', { silent: true });
    applyBlockVisibility();
    applyBlockOrder();
    applyTableVisibility();
    applyStatVisibility();
    applyStatOrder();
    layoutEditMode = false;
    updateLayoutEditButton();
    setupEditableBlocks();
    upd();
    openSettings();
    showToast('Интерфейс сброшен');
}

function pluralize(num, forms){
    const n = Math.abs(num) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
}

  function normalizeDateTimeValue(val, { endOfDayIfDateOnly = true } = {}) {
      if (!val) return null;
      const normalized = val.replace(' ', 'T');
      const hasTime = normalized.includes('T') && normalized.length > 10;
      const base = normalized.slice(0, 10);
      if (!base) return null;
      const dateString = hasTime ? normalized : `${base}T${endOfDayIfDateOnly ? '23:59:59' : '00:00:00'}`;
      const parsed = new Date(dateString);
      return isNaN(parsed.getTime()) ? null : parsed;
  }

  function normalizeToMidnight(dateObj) {
      return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  }

  function getTimeRemaining(dl){
      const targetExact = normalizeDateTimeValue(dl, { endOfDayIfDateOnly: true });
      if(!targetExact) return {txt:'∞', cls:'days-infinite', days: Infinity, isInfinite: true};
      const now = new Date();
      const dayMs = 1000 * 60 * 60 * 24;
      const hourMs = 1000 * 60 * 60;
      const dayDiff = Math.ceil((normalizeToMidnight(targetExact).getTime() - normalizeToMidnight(now).getTime()) / dayMs);
      const msLeft = targetExact.getTime() - now.getTime();
      const hoursRemainder = Math.max(0, Math.floor((msLeft % dayMs) / hourMs));
      const shortHours = Math.max(1, hoursRemainder);

      if(msLeft < 0) {
          const overdueDays = Math.floor(Math.abs(msLeft) / dayMs);
          const overdueHours = Math.floor((Math.abs(msLeft) % dayMs) / hourMs);
          const overdueText = `${overdueDays} ${pluralize(overdueDays, ['день','дня','дней'])} ${overdueHours} ${pluralize(overdueHours || 1, ['час','часа','часов'])}`.trim();
          return {
              txt:'Срок вышел',
              cls:'days-critical',
              days: -1,
              overdue: true,
              overdueTooltip: `Срок вышел: просрочка ${overdueText}`
          };
      }
      const hoursText = dayDiff === 0 ? shortHours : hoursRemainder;
      const text = `${Math.max(0, dayDiff)}д ${hoursText}ч`;

      if(dayDiff === 0) return {txt: text, cls:'days-critical', days: dayDiff};
      if(dayDiff <= 3) return {txt: text, cls:'days-warning', days: dayDiff};
      return {txt: text, cls:'days-normal', days: dayDiff};
  }

  function hydrateArchiveCompletionMeta() {
      if (!Array.isArray(DATA.archive)) return;
      DATA.archive.forEach((item = {}) => {
          if (!item.deadlineSnapshot && item.dl) {
              item.deadlineSnapshot = item.dl;
          }
          if (item.completedOnTime === undefined) {
              const status = analyzeCompletionStatus(item);
              if (status.onTime !== null) item.completedOnTime = status.onTime;
          }
      });
  }

  function analyzeCompletionStatus(item) {
      if (!item) return { completionDate: null };

      const completionDate = normalizeDateTimeValue(item.date, { endOfDayIfDateOnly: true });
      const deadlineRaw = item.deadlineSnapshot || item.dl || null;
      const deadlineDate = normalizeDateTimeValue(deadlineRaw, { endOfDayIfDateOnly: true });

      let onTime = null;
      if (typeof item.completedOnTime === 'boolean') {
          onTime = item.completedOnTime;
      } else if (completionDate && deadlineDate) {
          onTime = completionDate.getTime() <= deadlineDate.getTime();
      }

      const delayMs = (completionDate && deadlineDate) ? completionDate.getTime() - deadlineDate.getTime() : 0;
      const delayDays = delayMs > 0 ? Math.ceil(delayMs / (1000 * 60 * 60 * 24)) : 0;

      return {
          completionDate,
          deadlineDate,
          onTime,
          delayDays
      };
  }

function getArchiveByMonth(month = currentMonth) {
    return DATA.archive.filter(i => (i.date || '').startsWith(month));
}

function changeMonth(m){ 
    currentMonth = m; 
    if (!DATA.monthlyGoals[currentMonth]) {
        DATA.monthlyGoals[currentMonth] = 250000;
        save();
    }
    upd();
}
function renderMonthSelect(){
    const sel = document.getElementById('monthSelect');
    const months = new Set([today.slice(0,7)]);
    [...DATA.archive, ...DATA.active].forEach(i => {
        if(i.date) months.add(i.date.slice(0,7));
        if(i.start) months.add(i.start.slice(0,7));
    });
    Object.keys(DATA.monthlyGoals).forEach(m => months.add(m));

    sel.innerHTML = '';
    Array.from(months).sort().reverse().forEach(m => {
        const d = new Date(m + '-01');
        const name = d.toLocaleString('ru', {month:'long', year:'numeric'});
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        if(m===currentMonth) opt.selected = true;
        sel.appendChild(opt);
    });
}

const repCenterText = {
    id: 'repCenterText',
    afterDraw(chart, args, opts) {
        const { ctx, chartArea: { width, height } } = chart;
        const styles = getComputedStyle(document.body);
        const textColor = (styles.getPropertyValue('--text') || '#f0f6fc').trim();
        const mutedColor = (styles.getPropertyValue('--muted') || '#8b949e').trim();
        ctx.save();
        ctx.font = '900 22px -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText(opts.text || '', width / 2, height / 2 + 6);
        ctx.font = '600 12px -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
        ctx.fillStyle = mutedColor;
        ctx.fillText(opts.subText || '', width / 2, height / 2 + 22);
        ctx.restore();
    }
};

function analyzeReputation(){
    const projectTypes = ['active', 'waiting', 'paused', 'potential'];
    const overdue = [];
    projectTypes.forEach(type => {
        DATA[type].forEach(item => {
            const rem = getTimeRemaining(item.dl);
            if (rem.days < 0) {
                overdue.push({
                    name: item.n || 'Без названия',
                    client: item.c || 'Без клиента',
                    days: Math.abs(rem.days)
                });
            }
        });
    });

    const total = overdue.length;
    const worst = overdue.reduce((acc, cur) => Math.max(acc, cur.days), 0);
    const avg = total ? Math.round(overdue.reduce((acc, cur) => acc + cur.days, 0) / total) : 0;
    const activeCount = DATA.active.length;
    const nearDeadline = DATA.active.filter(item => {
        const rem = getTimeRemaining(item.dl);
        return rem.days >= 0 && rem.days <= 2;
    }).length;
    const onTime = Math.max(activeCount - total - nearDeadline, 0);
    const score = Math.max(0, Math.min(100, 100 - total * 12 - Math.max(0, worst - 2) * 3 - nearDeadline * 2));

    let level = 'good';
    let headline = 'Всё ок — ты держишь сроки';
    let hint = 'Просроченных дедлайнов нет, продолжай в том же духе.';
    let chip = 'Стабильно';
    let detail = 'Отсутствие просрочек усиливает доверие клиентов. Держи темп и фиксируй успехи в архиве.';
    let fallout = 'Сохраняй привычку опережать дедлайны — это личный бренд и поток рекомендаций.';
    let tips = [
        'Фиксируй дедлайны при постановке задач, чтобы контролировать загрузку.',
        'Закрывай готовые проекты в архив — это повышает итоговый рейтинг.',
    ];

    if (total > 0) {
        const overdueWord = `${total} ${pluralize(total, ['просрочка', 'просрочки', 'просрочек'])}`;
        const daysWord = `${worst} ${pluralize(worst, ['день', 'дня', 'дней'])}`;
        if (total <= 2 && worst <= 5) {
            level = 'warn';
            headline = 'Есть просрочки — поправь сроки';
            hint = `${overdueWord} до ${daysWord}. Обнови план и предупреди клиентов.`;
            chip = 'Нужно ускориться';
            detail = 'Пара задержек ещё поправима: договорись о новых сроках и закрой задачи, чтобы не терять доверие.';
            fallout = 'Если так тянуть и дальше, клиенты начнут замораживать платежи и уйдут к тем, кто держит сроки.';
            tips = [
                'Договорись с клиентами о новых сроках и отметь их в таблице.',
                'Сконцентрируйся на задачах с максимальной просрочкой, чтобы снять красные индикаторы.',
                'Отложи новые брони до закрытия текущих хвостов.',
            ];
        } else {
            level = 'bad';
            headline = 'Репутация проседает';
            hint = `${overdueWord} до ${daysWord} — пора спасать ситуацию.`;
            chip = 'Критично';
            detail = 'Множественные просрочки уже бьют по имени. Наведи порядок в приоритетах и верни сроки под контроль.';
            fallout = 'Продолжение срывов = штрафы, возвраты и жёсткие отзывы. Лиды будут обходить тебя стороной.';
            tips = [
                'Составь антикризисный список: сначала закрывай самые старые и дорогие проекты.',
                'Разбей объём на краткие чекпоинты и ежедневно отмечай прогресс.',
                'Оповести клиентов о статусе — прозрачность снижает негатив по просрочкам.',
            ];
        }
    } else if (nearDeadline > 0) {
        fallout = 'Если проморгать задачи на ближайшие 2 дня — они уйдут в красную зону и потянут рейтинг вниз.';
        tips.push('На радаре есть задачи с дедлайном в ближайшие 2 дня — выдели под них фиксированные слоты.');
    }

    return { level, headline, hint, chip, detail, fallout, score, total, worst, avg, activeCount, nearDeadline, tips, onTime };
}

function openReputationTasks() {
    if (isTableEnabled('active')) {
        switchTab('active');
        const tabBtn = document.getElementById('tab-active');
        if (tabBtn) tabBtn.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        openSettings();
        activateSettingsPane('tables');
    }
}

function updateReputationUI(){
    const state = analyzeReputation();
    const strip = document.getElementById('reputation-strip');
    if (strip) {
        strip.classList.remove('good', 'warn', 'bad');
        strip.classList.add(state.level);
    }

    const headline = document.getElementById('reputation-headline');
    if (headline) headline.innerText = state.headline;

    const hint = document.getElementById('reputation-hint');
    if (hint) hint.innerText = state.hint;

    const severity = document.getElementById('reputation-severity');
    if (severity) {
        severity.classList.remove('good', 'warn', 'bad');
        severity.classList.add(state.level);
        severity.innerText = state.chip;
    }

    const score = document.getElementById('reputation-score');
    if (score) score.innerText = `${state.score} / 100`;
    const scoreLabel = document.getElementById('rep-score-label');
    if (scoreLabel) scoreLabel.innerText = state.score;

    const grade = document.getElementById('reputation-grade');
    if (grade) {
        grade.innerText = state.total
            ? `${state.total} ${pluralize(state.total, ['просрочка', 'просрочки', 'просрочек'])} (до ${state.worst} ${pluralize(state.worst, ['дня', 'дней', 'дней'])})`
            : 'Просроченных дедлайнов нет';
    }

    const detail = document.getElementById('reputation-detail');
    if (detail) detail.innerText = state.detail;

    const fallout = document.getElementById('reputation-fallout');
    if (fallout) {
        fallout.style.display = state.level === 'good' ? 'none' : 'block';
        fallout.innerText = state.level === 'good' ? '' : state.fallout;
    }

    const activeCount = document.getElementById('rep-active-count');
    if (activeCount) activeCount.innerText = state.activeCount;

    const repOnTime = document.getElementById('rep-on-time');
    if (repOnTime) {
        const onTime = Math.max(state.onTime, 0);
        repOnTime.innerText = onTime > 0 ? `${onTime} без просрочек` : 'Все задачи просрочены';
    }

    const repOverdue = document.getElementById('rep-overdue');
    if (repOverdue) repOverdue.innerText = state.total;

    const repDelayMax = document.getElementById('rep-delay-max');
    const repDelayAvg = document.getElementById('rep-delay-avg');

    if (repDelayMax) repDelayMax.innerText = state.worst > 0 ? state.worst : '0';
    if (repDelayAvg) repDelayAvg.innerText = state.avg > 0 ? state.avg : '0';

    const tipsEl = document.getElementById('reputation-tips');
    if (tipsEl) {
        // Мы меняем class="rep-tip" на class="rep-tip-card" чтобы подхватились новые стили
        tipsEl.innerHTML = state.tips.map(tip => `
            <div class="rep-tip-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>${tip}</span>
            </div>
        `).join('');
    }

    updatePaceReputation(state);

    const repOnTimePill = document.getElementById('rep-on-time-pill');
    if (repOnTimePill) repOnTimePill.innerText = Math.max(state.onTime, 0);

    const repNearPill = document.getElementById('rep-near-pill');
    if (repNearPill) repNearPill.innerText = state.nearDeadline;

    const repOverduePill = document.getElementById('rep-overdue-pill');
    if (repOverduePill) repOverduePill.innerText = state.total;

    const repChartEl = document.getElementById('reputationChart');
    if (repChartEl) {
        if (chRep) chRep.destroy();
        const onTimeVal = Math.max(state.onTime, 0);
        const nearVal = state.nearDeadline;
        const overdueVal = state.total;
        const totalVal = onTimeVal + nearVal + overdueVal;
        const hasData = totalVal > 0;
        const labels = hasData ? ['В срок', 'На грани', 'Просрочки'] : ['Репутация'];
        const data = hasData ? [onTimeVal, nearVal, overdueVal] : [1];
        const colors = hasData ? ['#2ea043', '#d29922', '#f85149'] : ['#2ea043'];
        chRep = new Chart(repChartEl.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.1,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.label}: ${hasData ? ctx.parsed : 0}`
                        }
                    },
                    repCenterText: {
                        text: `${state.score} / 100`,
                        subText: state.level === 'good' ? 'Доверие стабильно' : 'Нужно ускориться'
                    }
                }
            },
            plugins: [repCenterText]
        });
    }
}

function updatePaceReputation(state){
    const chip = document.getElementById('pace-rep-chip');
    const text = document.getElementById('pace-rep-text');
    const dot = document.getElementById('pace-rep-dot');
    const caption = document.getElementById('pace-rep-caption');

    if (chip) {
        chip.classList.remove('good', 'warn', 'bad');
        chip.classList.add(state.level);
    }

    if (text) text.innerText = `${state.score} / 100`;
    if (dot) dot.className = `rep-dot ${state.level}`;
    if (caption) caption.innerText = state.level === 'good' ? 'Доверие стабильно' : 'Нужно ускориться';
}

function scrollToReputation(){
    const card = document.getElementById('reputation-card');
    if (card && !card.classList.contains('is-hidden')) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        openSettings();
        activateSettingsPane('blocks');
        const toggle = document.getElementById('block-toggle-reputation');
        if (toggle) toggle.focus();
    }
}

function getScopedDataForStats() {
    return {
        active: DATA.active,
        archive: getArchiveByMonth(),
        paused: DATA.paused,
        waiting: DATA.waiting,
        potential: DATA.potential,
    };
}

function calcStats(){
    const scope = getScopedDataForStats();
    const goal = toNumeric(DATA.monthlyGoals[currentMonth]) || 250000;
    let fact = 0, activeFact = 0, plan = 0, totalGross = 0, totalNet = 0;
    let totalExpenses = 0, totalTaxes = 0, totalPaidGross = 0;

    ['active','archive','paused','waiting','potential'].forEach(type => {
        scope[type].forEach(i => {
            totalExpenses += calcContractorAmount(i);
            totalTaxes += toNumeric(i.p) * ((toNumeric(i.taxPrc) || 0) / 100);
        });
    });

    const archiveThisMonth = scope.archive;
    archiveThisMonth.forEach(i => {
        const net = calcNet(i);
        fact += net;
        totalGross += toNumeric(i.p);
        totalNet += net;
        totalPaidGross += toNumeric(i.p);
    });

    scope.active.forEach(i => {
        const net = calcNet(i);
        const gross = toNumeric(i.p);
        const paidPrc = (toNumeric(i.paid)||0)/100;
        const paidGross = gross * paidPrc;
        activeFact += net * paidPrc;
        plan += net * (1 - paidPrc);
        totalGross += gross;
        totalNet += net;
        totalPaidGross += paidGross;
    });

    scope.paused.forEach(i => plan += calcNet(i));
    scope.waiting.forEach(i => plan += calcNet(i));
    scope.potential.forEach(i => plan += calcNet(i));

    const totalFact = fact + activeFact;
    const forecast = totalFact + plan;
    
    const totalMargin = totalNet;
    const totalGrossCombined = totalGross;
    const goalProgress = goal ? Math.round((totalFact/goal)*100) : 0;

    document.getElementById('val-fact').innerText = formatCurrency(totalFact);
    document.getElementById('val-fact-prc').innerText = `${goalProgress}% от цели`;
    document.getElementById('val-active-fact').innerText = formatCurrency(activeFact);
    document.getElementById('val-margin').innerText = formatCurrency(totalMargin);
    document.getElementById('val-margin-prc').innerText = `${totalGrossCombined > 0 ? Math.round((totalMargin/totalGrossCombined)*100) : 0}%`;
    document.getElementById('val-plan').innerText = formatCurrency(plan);
    document.getElementById('val-total').innerText = formatCurrency(forecast);
    document.getElementById('val-total-gross').innerText = formatCurrency(totalGrossCombined);
    document.getElementById('val-expenses').innerText = formatCurrency(totalExpenses);
    document.getElementById('val-taxes').innerText = formatCurrency(totalTaxes);
    document.getElementById('val-paid-gross').innerText = formatCurrency(totalPaidGross);
    document.getElementById('goal-text').innerText = `${formatCurrency(totalFact)} / ${formatCurrency(goal)}`;
    document.getElementById('goal-pill').innerText = `Цель: ${formatCurrency(goal)}`;

    const record = DATA.settings.record || 0;
    const recordProgress = record > 0 ? Math.min(100, (totalFact/record)*100) : 0;
    const recordRemaining = Math.max(0, record - totalFact);
    let motivText = 'Обновим цифры!';
    if (!record) motivText = 'Задай цель и забери рекорд.';
    else if (recordRemaining <= 0) motivText = 'Новый рекорд! Так держать.';
    else if (recordProgress >= 70) motivText = 'Чуть-чуть до рекорда!';
    else motivText = 'Движемся к рекорду каждый день.';

    document.getElementById('record-motiv').innerText = motivText;
    document.getElementById('record-remaining').innerText = record ? (recordRemaining > 0 ? `До рекорда ${formatCurrency(recordRemaining)}` : 'Рекорд побит!') : 'Задайте рекорд в настройках';
    document.getElementById('record-amount').innerText = formatCurrency(record);
    const recCurrentFact = document.getElementById('rec-current-fact');
    if (recCurrentFact) recCurrentFact.innerText = formatCurrency(totalFact);
    document.getElementById('record-progress').style.width = record ? Math.min(100, (totalFact/record)*100) + '%' : '0%';

    document.getElementById('p-bar').style.width = goal > 0 ? Math.min(100, (totalFact/goal)*100) + '%' : '0%';
    document.getElementById('dash-month-name').innerText = document.getElementById('monthSelect').options[document.getElementById('monthSelect').selectedIndex]?.text || '';
    const scopeNote = 'Срез: все проекты';
    const scopeHint = 'Статистика собирается по всем разделам вне зависимости от выбранной вкладки';
    const scopeEl = document.getElementById('stat-scope-note');
    if (scopeEl) {
        scopeEl.innerText = scopeNote;
        scopeEl.title = scopeHint;
    }
    updateReputationUI();
    updateCharts(totalFact, plan, scope);
    updateTopClientsChart(scope);
}

let chL = null, chP = null, chB = null, chRep = null, chTopClients = null;
let topClientsMode = 'net';
let lastTopClientsScope = null;
function updateCharts(fact, plan, scope){
    const ctxL = document.getElementById('lineChart').getContext('2d');
    const ctxP = document.getElementById('pieChart').getContext('2d');
    const ctxB = document.getElementById('barChart').getContext('2d');

    // Line Chart (оставляем логику)
    const daysInM = new Date(currentMonth.split('-')[0], currentMonth.split('-')[1], 0).getDate();
    const labelsL = Array.from({length:daysInM},(_,i)=>i+1);
    const dataL = new Array(daysInM).fill(0);
    scope.archive.forEach(i => {
        const d = parseInt(i.date.split('-')[2]) - 1;
        if(d>=0 && d<daysInM) dataL[d] += calcNet(i);
    });
    let acc = 0; 
    const dataAcc = dataL.map(v => acc+=v);
    
    if(chL) chL.destroy();
    chL = new Chart(ctxL, {
        type: 'line',
        data: { labels: labelsL, datasets: [{label:'Факт', data:dataAcc, borderColor:'#2ea043', backgroundColor:'rgba(46,160,67,0.1)', fill:true, tension:0.4, pointRadius:0}] },
        options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{display:false}, y:{grid:{color: getCssVar('--border')}}}}
    });
    
    // PIE CHART - Новый стильный вид (Gradient Ring)
    if(chP) chP.destroy();
    chP = new Chart(ctxP, {
        type: 'doughnut',
        data: { 
            labels: ['Получено', 'Потенциал/Остаток'], 
            datasets: [{
                data: [fact, plan],
                backgroundColor: [getCssVar('--green'), getCssVar('--efficiency-potential')],
                borderWidth: 0,
                borderRadius: 20, // Закругленные края сегментов
                hoverOffset: 4
            }] 
        },
        options: {
            responsive:true, 
            maintainAspectRatio:false, 
            cutout:'85%', // Очень тонкое кольцо
            plugins:{
                legend:{display:false},
                tooltip: {
                    backgroundColor: getCssVar('--card'),
                    titleColor: getCssVar('--text'),
                    bodyColor: getCssVar('--muted'),
                    borderColor: getCssVar('--border'),
                    borderWidth: 1,
                    displayColors: true,
                    boxPadding: 4
                }
            }
        }
    });
    
    // BAR CHART - Исправленная динамика (последние 6 месяцев от текущего)
    const h = {};
    // Собираем данные из архива
    scope.archive.forEach(i => { const m = (i.date||'').slice(0,7); if(m) h[m] = (h[m]||0) + calcNet(i); });

    // Генерируем последние 6 месяцев корректно
    const barLabels = [];
    const barData = [];
    const barColors = [];
    
    // Берем текущий месяц как точку отсчета или выбранный месяц
    const anchorDate = new Date(); 
    anchorDate.setDate(1); // Первое число, чтобы избежать проблем с 31-м числом
    
    // Цикл для генерации 6 месяцев назад
    for (let i = 5; i >= 0; i--) {
        const d = new Date(anchorDate);
        d.setMonth(d.getMonth() - i);
        
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;
        
        // Форматируем название месяца
        const monthName = d.toLocaleString('ru', {month:'short'});
        barLabels.push(monthName);
        barData.push(h[key] || 0);
        
        // Подсветка текущего месяца
        const isCurrent = key === currentMonth;
        barColors.push(isCurrent ? getCssVar('--accent') : getCssVar('--chart-bar-bg'));
    }

    if(chB) chB.destroy();
    chB = new Chart(ctxB, {
        type: 'bar',
        data: { 
            labels: barLabels, 
            datasets: [{
                data: barData, 
                backgroundColor: barColors, 
                borderRadius: 4,
                barPercentage: 0.6
            }] 
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false, 
            plugins:{legend:{display:false}}, 
            scales:{
                x:{
                    grid:{display:false},
                    ticks: { color: getCssVar('--muted'), font: {size: 11}, autoSkip: false } 
                }, 
                y:{display:false}
            }
        }
    });
}

function updateTopClientsChart(scope) {
    const canvas = document.getElementById('topClientsChart');
    if (!canvas) return;

    lastTopClientsScope = scope;

    const modeLabel = document.getElementById('top-clients-mode-label');
    const sub = document.getElementById('top-clients-sub');
    const isGross = topClientsMode === 'gross';
    if (modeLabel) modeLabel.innerText = isGross ? 'Грязная прибыль' : 'Чистая прибыль';
    if (sub) sub.innerText = isGross
        ? 'Без учёта расходов и налогов — все статусы'
        : 'Маржа по активным, архивным, на паузе и в ожидании';

    const valueGetter = isGross ? calcGross : calcNet;
    const datasetLabel = isGross ? 'Грязная прибыль' : 'Чистая прибыль';

    const totals = {};
    ['active','archive','paused','waiting'].forEach(type => {
        (scope[type] || []).forEach(item => {
            const client = (item.c || 'Без имени').trim() || 'Без имени';
            const value = valueGetter(item);
            totals[client] = (totals[client] || 0) + value;
        });
    });

    const entries = Object.entries(totals)
        .filter(([,val]) => val > 0)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 5);

    const labels = entries.length ? entries.map(([name]) => name) : ['Нет данных'];
    const data = entries.length ? entries.map(([,val]) => val) : [0];

    if (chTopClients) chTopClients.destroy();

    chTopClients = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: getCssVar('--purple') || '#a371f7',
                borderRadius: 10,
                barThickness: 18,
                hoverBackgroundColor: '#c084fc'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `${datasetLabel}: ${formatCurrency(ctx.parsed.x)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    ticks: {
                        color: getCssVar('--muted') || '#8b949e',
                        callback: value => formatCurrency(value)
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: getCssVar('--text') || '#c9d1d9' }
                }
            }
        }
    });
}

function toggleTopClientsMode() {
    topClientsMode = topClientsMode === 'net' ? 'gross' : 'net';
    if (lastTopClientsScope) {
        updateTopClientsChart(lastTopClientsScope);
    }
}

function exp(){
  const payload = buildBackupSnapshot();
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)],{type:'application/json'}));
  a.download=`DesignFlow-Backup-${today}.json`;
  a.click();
}
function expCSV(){
    const escape = v => `"${(v || '').toString().replace(/"/g, '""')}"`;
    let csv = ['Статус', 'Клиент', 'Проект', 'Сумма', 'Чистыми', 'Оплачено (%)', 'Налог (%)', 'Расходы', 'Дата Старта', 'Дедлайн/Сдачи', 'Ссылка'].map(escape).join(';') + '\n';
    const addRows = (list, status) => list.forEach(i => csv += [status, i.c, i.n, i.p, calcNet(i), i.paid||0, i.taxPrc||0, calcContractorAmount(i), i.start||'', i.dl||i.date||'', i.link||''].map(escape).join(';') + '\n');
    addRows(DATA.active, 'В работе'); addRows(DATA.waiting, 'Ожидает'); addRows(DATA.potential, 'Потенциал');
    addRows(DATA.paused, 'На паузе'); addRows(DATA.archive, 'Выполнено');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], {type: 'text/csv;charset=utf-8;'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `DesignFlow-Export-${today}.csv`; a.click();
}
function imp(f){
  if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    try {
      const parsed = JSON.parse(e.target.result);
      const payload = parsed?.data ? parsed : { data: parsed };
      const normalized = {
        version: payload.version || 2,
        data: { ...DATA, ...(payload.data || {}) },
        extraTasks: payload.extraTasks || payload.extra_tasks || EXTRA_TASKS,
        uiPrefs: payload.uiPrefs || UI_PREFS,
        nameTemplates: Array.isArray(payload.nameTemplates) ? payload.nameTemplates : NAME_TEMPLATES,
        theme: (payload.uiPrefs || UI_PREFS).themeMode || payload.theme
      };
      localStorage.setItem(K, JSON.stringify(normalized));
      if (payload.uiPrefs) localStorage.setItem(UI_PREFS_KEY, JSON.stringify(payload.uiPrefs));
      if (Array.isArray(normalized.nameTemplates)) localStorage.setItem(NAME_TEMPLATES_KEY, JSON.stringify(normalized.nameTemplates));
    } catch(err) {
      localStorage.setItem(K, e.target.result);
    }
    location.reload();
  };
  r.readAsText(f);
}

window.onload = init;
