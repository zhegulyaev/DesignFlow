
const K = 'grok_design_v5';
const THEME_KEY = 'designflow_theme';
const now = new Date();
const today = now.toISOString().slice(0, 10);
let currentMonth = today.slice(0,7);
let currentTab = 'active';
const TAB_DESCRIPTIONS = {
    active: "Проекты в работе. Следите за дедлайнами и фиксируйте предоплату.",
    waiting: "Ожидают реакции клиента или материалов.",
    potential: "Лиды и переговоры. Ещё не начаты.",
    paused: "Замороженные проекты.",
    archive: "Успешно завершенные заказы.",
    all: "Все проекты и архив в одном месте.",
    trash: "Удаленные объекты. Хранятся 7 дней."
};

const STATUS_META = {
    active: { label: 'В работе', cls: 'active' },
    waiting: { label: 'Ожидает', cls: 'waiting' },
    potential: { label: 'Потенциал', cls: 'potential' },
    paused: { label: 'На паузе', cls: 'paused' },
    archive: { label: 'Выполнено', cls: 'archive' },
};

const toNumeric = (val) => {
    const cleaned = String(val || '').replace(/\s+/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
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

function applyTheme(theme) {
    const isLight = theme === 'light';
    document.body.classList.toggle('light', isLight);
    const icon = document.getElementById('themeToggleIcon');
    const label = document.getElementById('themeToggleLabel');
    if (icon) icon.textContent = isLight ? '🌙' : '🌞';
    if (label) label.textContent = isLight ? 'Тёмная тема' : 'Светлая тема';
}

function toggleTheme() {
    const current = localStorage.getItem(THEME_KEY) || 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    if (typeof calcStats === 'function') {
        calcStats();
    }
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(saved);
}

function formatNumberInput(inputEl) {
    if (!inputEl) return;
    inputEl.value = formatPlainNumber(inputEl.value);
}

let DATA = {
    settings: { record: 0 },
    monthlyGoals: { [currentMonth]: 250000 },
    active: [], archive: [], paused: [], waiting: [], potential: [], trash: []
};

let SORT = { active: 'dl', archive: 'date', potential: 'p', waiting: 'dl', paused: 'dl' };
let queue = { type: null, idx: null, field: null, targetId: null };
let previousDeadlineValue = '';
let toastTimeout = null;
let lastPermanentDeletion = null;
let datePicker = null;
let timePicker = null;

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
    if (!lastPermanentDeletion || !Array.isArray(lastPermanentDeletion.items)) return;

    const { type, items } = lastPermanentDeletion;
    const targetList = DATA[type];
    if (!Array.isArray(targetList)) return;

    items
        .slice()
        .sort((a, b) => a.index - b.index)
        .forEach(({ item, index }) => {
            targetList.splice(index, 0, item);
        });

    lastPermanentDeletion = null;
    save();
    upd();
    showToast('Удаление отменено');
}

// --- BULK ACTIONS ---
let selectedRows = {}; // {active: Set(), waiting: Set(), ...}

function renderLinkControls(item, idx, type) {
    const hasLink = !!item.link;
    const editBtn = `<button class="link-btn ${hasLink ? 'link-btn-active' : ''}" onclick="openLink('${type}',${idx})" title="${hasLink ? 'Изменить ссылку' : 'Добавить ссылку'}">🔗</button>`;
    const goBtn = hasLink ? `<button class="link-btn link-btn-go" onclick="openProjectLink(${idx}, '${type}')" title="Открыть ссылку">↗</button>` : '';
    return editBtn + goBtn;
}

function getClientNameClass(item) {
    return `client-name${item.link ? ' has-link' : ''}`;
}

function toggleSelect(type, idx, checkbox) {
    if (!selectedRows[type]) selectedRows[type] = new Set();
    const indexStr = idx.toString();
    const row = checkbox.closest('tr');

    if (checkbox.checked) {
        selectedRows[type].add(indexStr);
        if (row) row.classList.add('row-selected');
    } else {
        selectedRows[type].delete(indexStr);
        if (row) row.classList.remove('row-selected');
    }
    updateBulkToolbar(type);
    
    const allChecked = selectedRows[type].size === DATA[type].length && DATA[type].length > 0;
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
        if (row && row.dataset.index) {
            const indexStr = row.dataset.index;
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
            const indexStr = row.dataset.index;
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
    if (type === 'all') {
        const toolbar = document.getElementById('bulkToolbar');
        if (toolbar) toolbar.style.display = 'none';
        return;
    }
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

function askBulkDelete(type = currentTab) {
    const count = selectedRows[type] ? selectedRows[type].size : 0;
    if (count === 0) return;

    const isTrash = type === 'trash';
    document.getElementById('del-modal-title').innerText = isTrash ? `Удалить ${count} элементов навсегда?` : `Удалить ${count} элементов в корзину?`;
    document.getElementById('del-modal-desc').innerText = isTrash ? "Элементы будут удалены безвозвратно." : "Объекты будут храниться 7 дней.";
    document.getElementById('deleteConfirmModal').style.display = 'flex';
    document.getElementById('finalDeleteBtn').style.backgroundColor = 'var(--red)';
    document.getElementById('finalDeleteBtn').style.borderColor = 'var(--red)';
    document.getElementById('finalDeleteBtn').innerText = isTrash ? 'Удалить навсегда' : 'Удалить';
    document.getElementById('finalDeleteBtn').onclick = () => bulkDelete(type, isTrash);
}

function bulkDelete(type = currentTab, deleteForever = false) {
    if (!selectedRows[type] || selectedRows[type].size === 0) return;

    const indicesToDelete = Array.from(selectedRows[type])
        .map(Number)
        .sort((a, b) => b - a);

    const deletedItems = [];

    indicesToDelete.forEach(idx => {
        const itemIndex = DATA[type].findIndex((_, i) => i === idx);
        if (itemIndex > -1) {
            const item = DATA[type].splice(itemIndex, 1)[0];
            if (deleteForever) {
                deletedItems.push({ item, index: itemIndex });
            } else {
                item.deletedAt = Date.now();
                DATA.trash.unshift(item);
            }
        }
    });

    lastPermanentDeletion = deleteForever ? { type, items: deletedItems } : null;

    selectedRows[type].clear();
    document.getElementById('deleteConfirmModal').style.display = 'none';
    save(); upd();
    if (deleteForever) {
        showToast('Удалено навсегда', 'Отмена', undoPermanentDelete);
    } else {
        showToast(`Перемещено в корзину: ${indicesToDelete.length}`, 'Перейти', () => switchTab('trash'));
    }
}

function bulkDuplicate(type = currentTab) {
    if (!selectedRows[type] || selectedRows[type].size === 0) return;
    
    const indicesToDuplicate = Array.from(selectedRows[type])
        .map(Number)
        .sort((a, b) => a - b);
    
    const newItems = [];
    
    indicesToDuplicate.forEach(idx => {
        const item = JSON.parse(JSON.stringify(DATA[type].find((_, i) => i === idx)));
        if(item) {
             item.n = item.n + " (Копия)";
             newItems.push(item);
        }
    });
    
    DATA[type].unshift(...newItems);
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
    
    document.getElementById('del-modal-title').innerText = `Перенести ${count} элементов в "${targetName}"?`;
    document.getElementById('del-modal-desc').innerText = `Проекты будут перемещены из раздела "${document.getElementById(`tab-${currentType}`).textContent.trim()}".`;
    document.getElementById('deleteConfirmModal').style.display = 'flex';
    document.getElementById('finalDeleteBtn').style.backgroundColor = 'var(--accent)';
    document.getElementById('finalDeleteBtn').style.borderColor = 'var(--accent)';
    document.getElementById('finalDeleteBtn').innerText = 'Перенести';
    
    document.getElementById('finalDeleteBtn').onclick = () => bulkMove(currentType, targetType);
}

function bulkMove(from, to) {
    if (!selectedRows[from] || selectedRows[from].size === 0) return;

    const indicesToMove = Array.from(selectedRows[from])
        .map(Number)
        .sort((a, b) => b - a);
    
    indicesToMove.forEach(idx => {
        const itemIndex = DATA[from].findIndex((_, i) => i === idx);
        if (itemIndex > -1) {
            const item = DATA[from].splice(itemIndex, 1)[0];
            if(to === 'active') { item.start = item.start || today; item.dl = item.dl || today; item.paid = item.paid || 50; delete item.date; }
            if(to === 'archive') { item.date = today; item.paid = 100; delete item.start; delete item.dl; }
            if(to === 'potential' || to === 'waiting' || to === 'paused') { delete item.date; delete item.start; delete item.dl; item.paid = 0; }
            DATA[to].unshift(item);
        }
    });
    
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
            DATA = { ...DATA, ...parsed };
            if(!DATA.trash) DATA.trash = [];
            ['active', 'archive', 'paused', 'waiting', 'potential'].forEach(type => {
                 DATA[type].forEach(i => {
                    if(i.contractor === undefined) i.contractor = 0;
                    if(i.taxPrc === undefined) i.taxPrc = 0;
                    if(!i.contractorMode) i.contractorMode = 'amount';
                 });
            });
        } catch(e) { console.error("Data load error", e); }
    }

    initTheme();
    cleanupTrash();
    renderMonthSelect();
    setupModalsBackgroundCheck();
    setupDatePickers();
    document.getElementById('saveLinkBtn').onclick = saveLink;
    document.getElementById('add-proj-start-val').value = today;
    document.getElementById('add-proj-dl-val').value = today;
    sortData('active', 'dl', 'date', true);
    ['active','waiting','potential','paused','archive'].forEach(t => {
        DATA[t].sortDirection = DATA[t].sortDirection || 1;
        updateSortIndicators(t);
    });
    upd();
}

function save(){ localStorage.setItem(K, JSON.stringify(DATA)); }

function cleanupTrash(){
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const initLen = DATA.trash.length;
    DATA.trash = DATA.trash.filter(i => (nowMs - (i.deletedAt || 0)) < sevenDays);
    if(DATA.trash.length !== initLen) save();
}

function formatCurrency(n) { return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽'; }

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

function calcContractorAmount(item) {
    const gross = toNumeric(item.p);
    const mode = item.contractorMode || 'amount';
    const raw = toNumeric(item.contractor);
    return mode === 'percent' ? gross * (raw / 100) : raw;
}

function calcNet(item){
    const gross = toNumeric(item.p);
    const contr = calcContractorAmount(item);
    const tax = toNumeric(item.taxPrc);
    const taxAmt = gross * (tax / 100);
    return Math.round(gross - taxAmt - contr);
}
function calcMarginPrc(item) {
    const gross = toNumeric(item.p);
    if (gross === 0) return 0;
    const net = calcNet(item);
    return Math.round((net / gross) * 100);
}

function setupModalsBackgroundCheck() {
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }
}

function switchTab(t){
    currentTab = t;
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${t}`).classList.add('active');
    ['active','waiting','potential','paused','archive','all','trash'].forEach(k => {
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
    renderArchive();
    renderAll();
    renderTrash();
    calcStats();
    const desc = document.getElementById('tab-description');
    if (desc) desc.innerHTML = getTabSummary(currentTab, TAB_DESCRIPTIONS[currentTab]);
    updateBulkToolbar(currentTab);
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

        const isSelected = selectedRows.active?.has(i.toString());
        if (isSelected) tr.classList.add('row-selected');

        const linkIcon = renderLinkControls(item, i, 'active');
        const paidAmount = Math.round(gross * ((toNumeric(item.paid) || 0) / 100));
        totalPaidGross += paidAmount;
        const contractorSymbol = item.contractorMode === 'percent' ? '%' : '₽';

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
            <td class="date-cell"><div class="date-input-wrap ${rem.cls}" onclick="openDate('active',${i},'dl')"><svg class="date-icon"><use href="#icon-calendar"/></svg><span class="date-text-display">${formatDateDisplay(item.dl)}</span></div></td>
            
            <td class="mono"><div class="${rem.cls}">${rem.txt}</div></td>
            
            <td><select class="tax-select" onchange="updVal('active',${i},'taxPrc',this.value)">
                <option value="0" ${+item.taxPrc===0?'selected':''}>0%</option>
                <option value="4" ${+item.taxPrc===4?'selected':''}>4%</option>
                <option value="6" ${+item.taxPrc===6?'selected':''}>6%</option>
                <option value="13" ${+item.taxPrc===13?'selected':''}>13%</option>
            </select></td>
            
            <td style="text-align:right;">
                <div class="price-cell-wrap expense-cell">
                    <input type="text" value="${formatPlainNumber(item.contractor ?? 0)}" oninput="formatNumberInput(this)" onblur="updateContractorValue('active',${i},this.value)">
                    <span class="currency-symbol">${contractorSymbol}</span>
                    <select class="expense-mode" onchange="updateContractorMode('active',${i},this.value)">
                        <option value="amount" ${item.contractorMode!=='percent'?'selected':''}>₽</option>
                        <option value="percent" ${item.contractorMode==='percent'?'selected':''}>%</option>
                    </select>
                </div>
                <div class="expense-helper">≈ ${formatCurrency(contractorAmount)}</div>
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
                <div class="done-btn action-btn-base" onclick="mv(${i},'active','archive')" title="Выполнено">✓</div>
                <div class="wait-active-btn action-btn-base" onclick="mv(${i},'active','waiting')" title="В ожидании">...</div>
                <div class="pause-active-btn action-btn-base" onclick="mv(${i},'active','paused')" title="На паузе">||</div>
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
    DATA[type].forEach((item, i) => {
        tot += toNumeric(item.p);
        const tr = document.createElement('tr');
        tr.dataset.index = i;

        const isSelected = selectedRows[type]?.has(i.toString());
        if (isSelected) tr.classList.add('row-selected');
        
        const linkIcon = renderLinkControls(item, i, type);
                                      
        const rem = getTimeRemaining(item.dl);
        
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
            <td class="date-cell"><div class="date-input-wrap ${rem.cls}" onclick="openDate('${type}',${i},'dl')"><svg class="date-icon"><use href="#icon-calendar"/></svg><span class="date-text-display">${formatDateDisplay(item.dl)} (${rem.txt})</span></div></td>
            <td><div class="price-cell-wrap"><input type="text" value="${formatPlainNumber(item.p || 0)}" oninput="formatNumberInput(this)" onblur="updVal('${type}',${i},'p',this.value)"><span class="currency-symbol">₽</span></div></td>
            <td><div class="action-btns" style="justify-content:flex-end">
                <div class="action-btn-base" onclick="mv(${i},'${type}','active')" title="В работу">▶️</div>
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
        <td colspan="4" class="footer-total-toggle" onclick="toggleFooterSelection('${type}')">Всего ${DATA[type].length} проектов</td>
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
                <div class="done-btn action-btn-base" onclick="mv(${i},'potential','active')" title="В работу">✅ В работу</div>
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

function renderArchive(){
    const tbody = document.querySelector('#t-archive tbody');
    tbody.innerHTML = '';
    let tP = 0, tPr = 0, tContr = 0, tTax = 0;
    const visibleItems = DATA.archive.filter(i => (i.date||'').startsWith(currentMonth));
    visibleItems.forEach((item, i) => {
        const realIdx = DATA.archive.indexOf(item);
        item.pr = calcNet(item);
        tP += toNumeric(item.p); tPr += +item.pr || 0;
        const contractorAmount = calcContractorAmount(item);
        tContr += contractorAmount;
        tTax += toNumeric(item.p) * ((toNumeric(item.taxPrc) || 0) / 100);
        const tr = document.createElement('tr');
        tr.dataset.index = realIdx;

        const isSelected = selectedRows.archive?.has(realIdx.toString());
        if (isSelected) tr.classList.add('row-selected');
        
        const linkIcon = renderLinkControls(item, realIdx, 'archive');
                                      
        const contractorSymbol = item.contractorMode === 'percent' ? '%' : '₽';

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
            <td class="date-cell"><div class="date-input-wrap" onclick="openDate('archive',${realIdx},'date')"><svg class="date-icon"><use href="#icon-calendar"/></svg><span class="date-text-display">${formatDateDisplay(item.date)}</span></div></td>
            <td><div class="price-cell-wrap"><input type="text" value="${formatPlainNumber(item.p || 0)}" oninput="formatNumberInput(this)" onblur="updVal('archive',${realIdx},'p',this.value)"><span class="currency-symbol">₽</span></div></td>
            <td>
                <div class="price-cell-wrap expense-cell">
                    <input type="text" value="${formatPlainNumber(item.contractor ?? 0)}" oninput="formatNumberInput(this)" onblur="updateContractorValue('archive',${realIdx},this.value)">
                    <span class="currency-symbol">${contractorSymbol}</span>
                    <select class="expense-mode" onchange="updateContractorMode('archive',${realIdx},this.value)">
                        <option value="amount" ${item.contractorMode!=='percent'?'selected':''}>₽</option>
                        <option value="percent" ${item.contractorMode==='percent'?'selected':''}>%</option>
                    </select>
                </div>
                <div class="expense-helper">≈ ${formatCurrency(contractorAmount)}</div>
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
    ['active','waiting','paused','archive'].forEach(type => {
        DATA[type].forEach((item, idx) => allItems.push({ item, __type: type, idx }));
    });

    let totalGross = 0, totalNet = 0, totalExp = 0, totalTax = 0;

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

        const tr = document.createElement('tr');
        const deadlineValue = wrap.__type === 'archive' ? item.date : (item.dl || item.date || item.start);
        const rem = wrap.__type === 'archive' ? { cls: '', txt: '' } : getTimeRemaining(deadlineValue);
        const remText = wrap.__type === 'archive' || rem.txt === '—' ? '' : ` (${rem.txt})`;
        const dateDisplay = deadlineValue ? formatDateDisplay(deadlineValue) : '—';
        const dateCls = wrap.__type === 'archive' ? '' : rem.cls;

        tr.innerHTML = `
            <td class="select-col"><div class="row-index">${i + 1}</div></td>
            <td><span class="status-pill ${status.cls}">${status.label}</span></td>
            <td><div class="client-wrap">${item.c || '—'}</div></td>
            <td class="project-name-wrap">${item.n || '—'}</td>
            <td class="date-cell"><div class="date-input-wrap ${dateCls}"><svg class="date-icon"><use href="#icon-calendar"/></svg><span class="date-text-display">${dateDisplay}${remText}</span></div></td>
            <td style="text-align:right;"><div class="price-cell-wrap"><input type="text" value="${formatPlainNumber(gross)}" oninput="formatNumberInput(this)" onblur="updVal('${wrap.__type}',${wrap.idx},'p',this.value)"><span class="currency-symbol">₽</span></div></td>
            <td style="text-align:right;">
                <div class="price-cell-wrap expense-cell">
                    <input type="text" value="${formatPlainNumber(item.contractor ?? 0)}" oninput="formatNumberInput(this)" onblur="updateContractorValue('${wrap.__type}',${wrap.idx},this.value)">
                    <span class="currency-symbol">${item.contractorMode==='percent'?'%':'₽'}</span>
                </div>
                <div class="expense-helper">≈ ${formatCurrency(contractorAmount)}</div>
            </td>
            <td style="text-align:right;">${item.taxPrc || 0}%</td>
            <td style="text-align:right;"><div class="net-display-wrap">${formatCurrency(net)}</div></td>
        `;
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
        </tr>`;
    }
}

function renderTrash(){
    const tbody = document.querySelector('#t-trash tbody');
    tbody.innerHTML = '';
    DATA.trash.forEach((item, i) => {
        const tr = document.createElement('tr');
        tr.dataset.index = i;

        const isSelected = selectedRows.trash?.has(i.toString());
        if (isSelected) tr.classList.add('row-selected');
        const delDate = item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : '?';
        tr.innerHTML = `
            <td class="select-col">
                <div class="row-index">${i + 1}</div>
                <div class="row-controls">
                    <svg class="dup-icon" onclick="duplicateRow('trash',${i})" title="Дублировать"><use href="#icon-duplicate"/></svg>
                    <input type="checkbox" class="bulk-checkbox" id="check-trash-${i}" onchange="toggleSelect('trash', ${i}, this)" ${selectedRows.trash?.has(i.toString()) ? 'checked' : ''}>
                    <label for="check-trash-${i}" style="display:none;"></label>
                </div>
            </td>
            <td style="color:var(--red); font-size:12px">${delDate}</td>
            <td>${item.c}</td>
            <td>${item.n}</td>
            <td>${formatCurrency(item.p)}</td>
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
    sortData('active', 'dl', 'date', true);
    save(); upd();
}

function mv(idx, from, to){
    const item = DATA[from][idx];
    DATA[from].splice(idx, 1);
    if(to === 'active') { item.start = item.start || today; item.dl = item.dl || today; item.paid = item.paid || 50; delete item.date; }
    if(to === 'archive') { item.date = today; item.paid = 100; delete item.start; delete item.dl; }
    if(to === 'potential' || to === 'waiting' || to === 'paused') { delete item.date; delete item.start; delete item.dl; item.paid = 0; }
    
    DATA[to].unshift(item);
    sortData('active', 'dl', 'date', true);
    save(); 
    setTimeout(() => { switchTab(to); }, 10);
}

function duplicateRow(type, idx){
    const item = JSON.parse(JSON.stringify(DATA[type].find((_, i) => i === idx)));
    if(!item) return;
    item.n = item.n + " (Копия)";
    DATA[type].unshift(item);
    save(); upd();
}

function askDel(type, idx){
    const itemIndex = DATA[type].findIndex((_, i) => i === idx);
    if (itemIndex > -1) {
        const item = DATA[type].splice(itemIndex, 1)[0];
        item.deletedAt = Date.now();
        DATA.trash.unshift(item);
        lastPermanentDeletion = null;
        save(); upd();
        showToast('Перемещено в корзину', 'Перейти', () => switchTab('trash'));
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

function restoreFromTrash(idx){
    const item = DATA.trash.splice(idx, 1)[0];
    delete item.deletedAt;
    DATA.active.unshift(item);
    save(); switchTab('active');
}

function openAddModal(){
    ['name','client','price','contractor'].forEach(id => document.getElementById(`add-proj-${id}`).value = '');
    document.getElementById('add-proj-tax').value = '0';
    document.getElementById('add-proj-contractor-mode').value = 'amount';
    document.getElementById('add-proj-start-val').value = today;
    document.getElementById('add-proj-dl-val').value = today;
    previousDeadlineValue = today;
    document.getElementById('add-proj-dl-days').value = '';
    document.getElementById('add-proj-dl-custom').value = '';
    document.getElementById('add-proj-start-display').querySelector('.date-text-display').innerHTML = formatDateDisplay(today);
    document.getElementById('add-proj-dl-display').querySelector('.date-text-display').innerHTML = formatDateDisplay(today);
    document.getElementById('addProjectModal').style.display = 'flex';
}
function saveNewProject(){
    const name = document.getElementById('add-proj-name').value;
    const client = document.getElementById('add-proj-client').value;
    const price = toNumeric(document.getElementById('add-proj-price').value);
    const contr = toNumeric(document.getElementById('add-proj-contractor').value);
    const contrMode = document.getElementById('add-proj-contractor-mode').value || 'amount';
    const tax = +document.getElementById('add-proj-tax').value || 0;
    const type = document.getElementById('add-proj-type').value;
    const start = document.getElementById('add-proj-start-val').value || today;
    const dl = document.getElementById('add-proj-dl-val').value || today;
    
    const item = {
        n: name, c: client, p: price, contractor: contr, contractorMode: contrMode, taxPrc: tax, link: '',
        start: type==='active'? start : undefined,
        dl: type==='active' || type==='waiting' || type==='paused' ? dl : undefined, 
        paid: (type==='active'||type==='archive'? (type==='archive'?100:50) : 0),
        date: type==='archive' ? today : undefined
    };
    
    DATA[type].unshift(item);
    document.getElementById('addProjectModal').style.display = 'none';
    sortData('active', 'dl', 'date', true);
    save(); switchTab(type);
}

function applyDeadlinePreset() {
    const select = document.getElementById('add-proj-dl-days');
    const customInput = document.getElementById('add-proj-dl-custom');
    const currentDl = document.getElementById('add-proj-dl-val').value || document.getElementById('add-proj-start-val').value || today;

    if (!previousDeadlineValue) {
        previousDeadlineValue = currentDl;
    }

    if (document.activeElement === customInput && select.value !== 'custom') {
        select.value = 'custom';
    }

    if (select.value === '') {
        const restoreVal = previousDeadlineValue || currentDl;
        document.getElementById('add-proj-dl-val').value = restoreVal;
        document.getElementById('add-proj-dl-display').querySelector('.date-text-display').innerHTML = formatDateDisplay(restoreVal);
        customInput.value = '';
        previousDeadlineValue = '';
        return;
    }

    if (select.value === 'custom' && customInput.value.trim() === '') {
        select.value = '';
        document.getElementById('add-proj-dl-val').value = previousDeadlineValue || currentDl;
        const restoredDl = document.getElementById('add-proj-dl-val').value || currentDl;
        document.getElementById('add-proj-dl-display').querySelector('.date-text-display').innerHTML = formatDateDisplay(restoredDl);
        previousDeadlineValue = '';
        return;
    }

    let days = parseInt(select.value, 10);
    if (select.value === 'custom') {
        days = parseInt(customInput.value, 10);
    }

    if (!days || days <= 0) return;
    const startRaw = document.getElementById('add-proj-start-val').value || today;
    const baseDate = new Date(startRaw);
    if (isNaN(baseDate)) return;
    const dlDate = new Date(baseDate);
    dlDate.setDate(dlDate.getDate() + days);
    const iso = dlDate.toISOString().slice(0, 10);
    document.getElementById('add-proj-dl-val').value = iso;
    document.getElementById('add-proj-dl-display').querySelector('.date-text-display').innerHTML = formatDateDisplay(iso);
}

function openDate(type, idx, field){
    queue = {type, idx, field, targetId: null};
    const val = DATA[type][idx][field];
    openDateBase(val);
}
function openDateInModal(targetInputId){
    const val = document.getElementById(targetInputId).value;
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

    if (datePicker) datePicker.setDate(dateVal, true);
    else document.getElementById('date-input-val').value = dateVal;

    if (timePicker) timePicker.setDate(timeVal, true, 'H:i');
    else document.getElementById('time-input-val').value = timeVal;

    toggleTimeInput();
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
        document.getElementById(displayId).querySelector('.date-text-display').innerHTML = formatDateDisplay(result);
        if (queue.targetId === 'add-proj-start-val') {
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
    const currentLink = DATA[type][idx].link || '';
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
    let url = document.getElementById('link-input').value.trim().replace(/^@+/, '');

    if (isTelegram) {
        url = url.replace(/^https?:\/\/t\.me\//, '').replace(/^@+/, '');
        url = url ? `https://t.me/${url}` : '';
    } else if (url && !url.match(/^(https?:\/\/|mailto:)/)) {
        url = 'https://' + url;
    }

    DATA[queue.type][queue.idx].link = url;
    closeLinkModal(); save(); upd();
}

function openSettings(){
    document.getElementById('stg-goal').value = formatPlainNumber(DATA.monthlyGoals[currentMonth] || 250000);
    document.getElementById('stg-rec').value = formatPlainNumber(DATA.settings.record || 0);
    document.getElementById('settingsModal').style.display = 'flex';
}
function openGoalSettings(){
    openSettings();
    const goalInput = document.getElementById('stg-goal');
    if (goalInput) {
        goalInput.focus();
        goalInput.select();
    }
}
function openRecordSettings(){
    openSettings();
    const recordInput = document.getElementById('stg-rec');
    if (recordInput) {
        recordInput.focus();
        recordInput.select();
    }
}
function saveSettings(){
    DATA.monthlyGoals[currentMonth] = toNumeric(document.getElementById('stg-goal').value);
    DATA.settings.record = toNumeric(document.getElementById('stg-rec').value);
    document.getElementById('settingsModal').style.display = 'none';
    save(); upd();
}

function pluralize(num, forms){
    const n = Math.abs(num) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
}

function getTimeRemaining(dl){
    if(!dl) return {txt:'—', cls:'days-normal', days: Infinity};
    const end = new Date(dl.slice(0, 10) + 'T00:00:00').getTime();
    const todayNormalized = new Date(today + 'T00:00:00').getTime();
    
    const diff = end - todayNormalized;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if(days < 0) return {txt:'Просрочено', cls:'days-critical', days: -1};
    if(days === 0) return {txt:'Сегодня', cls:'days-critical', days: 0};
    if(days <= 3) return {txt: days + ' дн.', cls:'days-warning', days: days};
    return {txt: days + ' дн.', cls:'days-normal', days: days};
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
    let chip = '🔥 Всё ок';
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
            chip = '⚠ Поднажми';
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
            chip = '🤯 Жесть';
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

    const chip = document.getElementById('reputation-chip');
    if (chip) {
        chip.classList.remove('good', 'warn', 'bad');
        chip.classList.add(state.level);
        chip.innerText = state.chip;
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

    const repDelay = document.getElementById('rep-delay');
    if (repDelay) repDelay.innerText = state.total ? `Макс ${state.worst} дн. · Ср ${state.avg} дн.` : 'Просрочек нет';

    const tipsEl = document.getElementById('reputation-tips');
    if (tipsEl) {
        tipsEl.innerHTML = state.tips.map(tip => `
            <div class="rep-tip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 3v4"/><path d="M6.5 7.5l2.5 2.5"/><path d="M17.5 7.5L15 10"/><path d="M12 17v4"/><path d="M6 13l-2 2"/><path d="M18 13l2 2"/><circle cx="12" cy="12" r="4"/>
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
                maintainAspectRatio: false,
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

    if (chip) {
        chip.classList.remove('good', 'warn', 'bad');
        chip.classList.add(state.level);
    }

    if (text) text.innerText = `${state.score} / 100`;
    if (dot) dot.className = `rep-dot ${state.level}`;
}

function scrollToReputation(){
    const card = document.getElementById('reputation-card');
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function getScopedDataForStats() {
    return {
        active: DATA.active,
        archive: DATA.archive,
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

    const archiveThisMonth = scope.archive.filter(i=>(i.date||'').startsWith(currentMonth));
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
}

let chL = null, chP = null, chB = null, chRep = null;
function updateCharts(fact, plan, scope){
    const ctxL = document.getElementById('lineChart').getContext('2d');
    const ctxP = document.getElementById('pieChart').getContext('2d');
    const ctxB = document.getElementById('barChart').getContext('2d');
    const daysInM = new Date(currentMonth.split('-')[0], currentMonth.split('-')[1], 0).getDate();
    const labelsL = Array.from({length:daysInM},(_,i)=>i+1);

    const dataL = new Array(daysInM).fill(0);

    scope.archive.filter(i=>(i.date||'').startsWith(currentMonth)).forEach(i => {
        const d = parseInt(i.date.split('-')[2]) - 1;
        if(d>=0 && d<daysInM) dataL[d] += calcNet(i);
    });
    
    let acc = 0; 
    const dataAcc = dataL.map(v => acc+=v);
    
    if(chL) chL.destroy();
    chL = new Chart(ctxL, {
        type: 'line',
        data: { labels: labelsL, datasets: [{label:'Факт', data:dataAcc, borderColor:'#2ea043', backgroundColor:'rgba(46,160,67,0.1)', fill:true, tension:0.3, pointRadius:0}] },
        options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{display:false}, y:{grid:{color:'#30363d'}}}}
    });
    
    if(chP) chP.destroy();
    chP = new Chart(ctxP, {
        type: 'doughnut',
        data: { labels: ['Факт (Оплачено)', 'План (Остаток/Лиды)'], datasets: [{data:[fact, plan], backgroundColor:['#2ea043','#d29922'], borderWidth:0}] },
        options: {responsive:true, maintainAspectRatio:false, cutout:'75%', plugins:{legend:{position:'bottom', labels:{color:'#8b949e'}}}}
    });
    
    const h = {};
    scope.archive.forEach(i => { const m = (i.date||'').slice(0,7); if(m) h[m] = (h[m]||0) + calcNet(i); });
    const allMonths = Object.keys(h);
    allMonths.sort();
    const keys = allMonths.slice(-6); 

    if(chB) chB.destroy();
    chB = new Chart(ctxB, {
        type: 'bar',
        data: { labels: keys.map(m => new Date(m + '-01').toLocaleString('ru', {month:'short'})), datasets: [{data: keys.map(k=>h[k]), backgroundColor: keys.map(k=>k===currentMonth?'#58a6ff':getCssVar('--chart-bar-bg')||'#21262d'), borderRadius:4}] },
        options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}}, y:{display:false, ticks:{beginAtZero:true}}}}
    });
}

function exp(){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([localStorage.getItem(K)],{type:'application/json'}));
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
  r.onload=e=>{ localStorage.setItem(K,e.target.result); location.reload(); };
  r.readAsText(f);
}

window.onload = init;
