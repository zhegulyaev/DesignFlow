const K = 'DesignFlowData';
const TODAY_K = 'DesignFlowToday';
const SETTINGS_K = 'DesignFlowSettings';
const STATUS_KEYS = ['active', 'waiting', 'potential', 'paused', 'archive', 'requests', 'trash'];

function escapeHTML(value) {
  return (value ?? '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createEmptyData() {
  return STATUS_KEYS.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, {});
}

let DATA = createEmptyData();

let SETTINGS = {
  currency: '₽',
  taxPrc: 0,
  percentPaid: 0,
  taxBase: 'p' // p or net
};

function formatCurrency(value) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${amount.toLocaleString('ru-RU')} ${SETTINGS.currency}`;
}

// Унифицированное форматирование валюты для новых представлений
const fmtCurrency = (value) => formatCurrency(value);

function parseAmount(value) {
  const normalized = (value || '').toString().trim().replace(/\s+/g, '').toLowerCase();
  if (!normalized) return 0;

  const match = normalized.match(/^([\d.,]+)([kк])?$/i);
  if (match) {
    const base = parseFloat(match[1].replace(',', '.'));
    const multiplier = match[2] ? 1000 : 1;
    return Number.isFinite(base) ? Math.round(base * multiplier) : 0;
  }

  const fallback = parseInt(normalized, 10);
  return Number.isFinite(fallback) ? fallback : 0;
}

let today = new Date().toISOString().slice(0, 10);

function normalizeData(data) {
  const normalized = createEmptyData();

  if (!data || typeof data !== 'object') {
    return { normalized, migrated: !!data };
  }

  let migrated = false;

  STATUS_KEYS.forEach(status => {
    if (Array.isArray(data[status])) {
      normalized[status] = data[status];
    } else {
      migrated = true;
    }
  });

  return { normalized, migrated };
}

function loadData() {
  try {
    const stored = localStorage.getItem(K);

    if (!stored) return;

    const data = JSON.parse(stored);
    const { normalized, migrated } = normalizeData(data);

    DATA = normalized;

    if (migrated) {
      console.warn('DesignFlow: stored data has invalid structure. Missing lists reset to defaults.');
      localStorage.setItem(K, JSON.stringify(DATA));
    }
  } catch (e) {
    console.warn('Error loading data. Resetting to defaults.', e);
    DATA = createEmptyData();
    localStorage.setItem(K, JSON.stringify(DATA));
  }
}

function saveData() {
  localStorage.setItem(K, JSON.stringify(DATA));
  renderAll();
  updateStats();
}

function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_K));
    if (settings) {
      SETTINGS = { ...SETTINGS, ...settings };
    }
    document.getElementById('currency').value = SETTINGS.currency;
    document.getElementById('tax').value = SETTINGS.taxPrc;
    document.getElementById('percentPaid').value = SETTINGS.percentPaid;
    document.getElementById('taxBase').value = SETTINGS.taxBase;
  } catch (e) {
    console.error('Error loading settings:', e);
  }
}

function saveSettings() {
  SETTINGS.currency = document.getElementById('currency').value;
  SETTINGS.taxPrc = parseInt(document.getElementById('tax').value) || 0;
  SETTINGS.percentPaid = parseInt(document.getElementById('percentPaid').value) || 0;
  SETTINGS.taxBase = document.getElementById('taxBase').value;
  localStorage.setItem(SETTINGS_K, JSON.stringify(SETTINGS));
  saveData(); // Rerender to apply new settings
}

function getToday() {
  const t = localStorage.getItem(TODAY_K);
  if (t) {
    today = t;
  }
  document.getElementById('today').value = today;
}

function setToday(date) {
  today = date;
  localStorage.setItem(TODAY_K, today);
}

document.getElementById('today').addEventListener('change', (e) => setToday(e.target.value));

function getNewId() {
  let maxId = 0;
  Object.values(DATA).forEach(list => {
    list.forEach(item => {
      maxId = Math.max(maxId, item.id || 0);
    });
  });
  return maxId + 1;
}

function openModal(item = null, status = 'active') {
  const modal = document.querySelector('.modal-bg');
  const deleteBtn = document.querySelector('.btn-del');
  document.getElementById('item-id').value = '';
  document.getElementById('client').value = '';
  document.getElementById('name').value = '';
  document.getElementById('price').value = 0;
  document.getElementById('taxPrc').value = SETTINGS.taxPrc;
  document.getElementById('contractorAmount').value = 0;
  document.getElementById('paid').value = SETTINGS.percentPaid;
  document.getElementById('start').value = '';
  document.getElementById('dl').value = '';
  document.getElementById('link').value = '';
  document.getElementById('status').value = status;
  deleteBtn.style.display = 'none';
  document.querySelector('.m-title').textContent = 'Добавить проект';

  if (item) {
    document.getElementById('item-id').value = item.id;
    document.getElementById('client').value = item.c || '';
    document.getElementById('name').value = item.n || '';
    document.getElementById('price').value = item.p || 0;
    document.getElementById('taxPrc').value = item.taxPrc === undefined ? SETTINGS.taxPrc : item.taxPrc;
    document.getElementById('contractorAmount').value = item.contractorAmount || 0;
    document.getElementById('paid').value = item.paid === undefined ? SETTINGS.percentPaid : item.paid;
    document.getElementById('start').value = item.start || '';
    document.getElementById('dl').value = item.dl || item.date || '';
    document.getElementById('link').value = item.link || '';
    document.getElementById('status').value = item.status;
    deleteBtn.style.display = 'inline-block';
    document.querySelector('.m-title').textContent = 'Редактировать проект';
  }

  modal.classList.remove('hidden');
}

function closeModal() {
  document.querySelector('.modal-bg').classList.add('hidden');
}

function addItem() {
  const id = document.getElementById('item-id').value;
  const c = document.getElementById('client').value;
  const n = document.getElementById('name').value;
  const p = parseAmount(document.getElementById('price').value);
  const taxPrc = parseInt(document.getElementById('taxPrc').value) || 0;
  const contractorAmount = parseAmount(document.getElementById('contractorAmount').value);
  const paid = parseInt(document.getElementById('paid').value) || 0;
  const start = document.getElementById('start').value;
  const dl = document.getElementById('dl').value;
  const link = document.getElementById('link').value;
  const status = document.getElementById('status').value;

  if (!n) {
    alert('Название проекта обязательно!');
    return;
  }

  const newItem = {
    id: id ? parseInt(id) : getNewId(),
    c,
    n,
    p,
    taxPrc,
    contractorAmount,
    paid,
    start,
    dl,
    link,
    status
  };

  let oldStatus = null;
  let itemIndex = -1;

  Object.keys(DATA).forEach(key => {
    const index = DATA[key].findIndex(i => i.id === newItem.id);
    if (index !== -1) {
      oldStatus = key;
      itemIndex = index;
    }
  });

  if (oldStatus) {
    DATA[oldStatus].splice(itemIndex, 1);
  }

  DATA[status].push(newItem);
  saveData();
  closeModal();
}

function deleteItem() {
  const id = parseInt(document.getElementById('item-id').value);

  if (!confirm('Вы уверены, что хотите удалить этот проект?')) {
    return;
  }

  Object.keys(DATA).forEach(key => {
    const index = DATA[key].findIndex(i => i.id === id);
    if (index !== -1) {
      const [item] = DATA[key].splice(index, 1);
      if (key !== 'trash') {
        moveToTrash(item, key);
      }
    }
  });

  saveData();
  closeModal();
}

function addRequest() {
  const name = document.getElementById('req-name')?.value?.trim();
  const source = document.getElementById('req-source')?.value?.trim();
  const note = document.getElementById('req-note')?.value?.trim();
  const link = document.getElementById('req-link')?.value?.trim();
  const budgetRaw = document.getElementById('req-budget')?.value;
  const budget = parseAmount(budgetRaw);

  if (!name && !note) {
    alert('Заполните хотя бы имя или описание заявки');
    return;
  }

  const request = {
    id: getNewId(),
    name,
    source,
    note,
    link,
    budget,
    created: new Date().toISOString()
  };

  DATA.requests.push(request);

  ['req-name', 'req-source', 'req-note', 'req-link', 'req-budget'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  saveData();
  renderRequests();
}

function switchTab(el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const tabId = el.getAttribute('data-tab');

  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
  document.getElementById(tabId).classList.remove('hidden');
}

function renderItem(item) {
  const net = calcNet(item);
  const tax = calcTax(item);
  const contractor = calcContractorAmount(item);

  let paidClass = '';
  if (item.paid > 0 && item.paid < 100) {
    paidClass = 'warn';
  } else if (item.paid === 100) {
    paidClass = 'success';
  }

  const card = document.createElement('div');
  card.className = 'card';
  card.addEventListener('click', () => openModal(item));

  const rowClient = document.createElement('div');
  rowClient.className = 'c-row';
  const clientEl = document.createElement('div');
  clientEl.className = 'c-client';
  clientEl.innerHTML = escapeHTML(item.c || '—');
  const priceEl = document.createElement('div');
  priceEl.className = 'c-price';
  priceEl.textContent = formatCurrency(item.p);
  rowClient.append(clientEl, priceEl);

  const rowName = document.createElement('div');
  rowName.className = 'c-row';
  const nameEl = document.createElement('div');
  nameEl.className = 'c-name';
  nameEl.innerHTML = escapeHTML(item.n || '—');
  const taxEl = document.createElement('div');
  taxEl.className = 'c-tax';
  taxEl.textContent = tax ? `Налог: ${formatCurrency(tax)} (${item.taxPrc || 0}%)` : 'Без налога';
  rowName.append(nameEl, taxEl);

  const rowAmounts = document.createElement('div');
  rowAmounts.className = 'c-row';
  const netEl = document.createElement('div');
  netEl.className = 'c-net';
  netEl.textContent = `Чистыми: ${formatCurrency(net)}`;
  const paidEl = document.createElement('div');
  paidEl.className = `c-paid ${paidClass}`.trim();
  paidEl.textContent = `Оплачено: ${item.paid || 0}%`;
  rowAmounts.append(netEl, paidEl);

  const datesEl = document.createElement('div');
  datesEl.className = 'c-dates';
  const startSpan = document.createElement('span');
  startSpan.innerHTML = `Старт: ${escapeHTML(item.start || '—')}`;
  const deadlineSpan = document.createElement('span');
  deadlineSpan.innerHTML = `Дедлайн: ${escapeHTML(item.dl || item.date || '—')}`;
  datesEl.append(startSpan, deadlineSpan);

  card.append(rowClient, rowName, rowAmounts);

  if (contractor) {
    const contractorRow = document.createElement('div');
    contractorRow.className = 'c-row';
    const contractorEl = document.createElement('div');
    contractorEl.className = 'c-contractor';
    contractorEl.textContent = `Расходы: ${formatCurrency(contractor)}`;
    contractorRow.appendChild(contractorEl);
    card.appendChild(contractorRow);
  }

  card.appendChild(datesEl);

  if (item.link) {
    const linkContainer = document.createElement('div');
    linkContainer.className = 'c-link';
    const linkEl = document.createElement('a');
    linkEl.href = item.link;
    linkEl.target = '_blank';
    linkEl.rel = 'noopener noreferrer';
    linkEl.textContent = 'Ссылка';
    linkContainer.appendChild(linkEl);
    card.appendChild(linkContainer);
  }

  return card;
}

function renderList(list, containerId) {
  const container = document.querySelector(`#${containerId} .list`);
  if (!container) return;
  container.innerHTML = '';
  list.forEach(item => {
    const safeItem = { ...item, status: containerId };
    const card = renderItem(safeItem);
    container.appendChild(card);
  });
}

function renderRequests() {
  const tbody = document.querySelector('#t-requests tbody');
  const totalRow = document.querySelector('#total-row-requests td:nth-child(2)');
  const totalBudgetCell = document.querySelector('#total-row-requests td:nth-child(6)');
  if (!tbody) return;

  tbody.innerHTML = '';
  let totalBudget = 0;

  (DATA.requests || []).forEach((req, idx) => {
    const budget = parseAmount(req.budget) || 0;
    totalBudget += budget;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="select-col">${idx + 1}</td>
      <td>${escapeHTML(req.name || '—')}</td>
      <td>${escapeHTML(req.source || '—')}</td>
      <td>${escapeHTML(req.note || '—')}</td>
      <td>${req.link ? `<a href="${escapeHTML(req.link)}" target="_blank">Ссылка</a>` : '—'}</td>
      <td class="mono">${fmtCurrency(budget)}</td>
      <td>
        <button class="table-btn" onclick="convertRequestToProject(${req.id})">В работу</button>
        <button class="table-btn danger" onclick="deleteRequest(${req.id})">Удалить</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (totalRow) totalRow.textContent = DATA.requests.length;
  if (totalBudgetCell) totalBudgetCell.textContent = fmtCurrency(totalBudget);
}

function renderTrash() {
  const tbody = document.querySelector('#t-trash tbody');
  const totalRow = document.querySelector('#total-row-trash td:last-child');
  if (!tbody) return;

  tbody.innerHTML = '';
  let totalNet = 0;

  (DATA.trash || []).forEach((item, idx) => {
    const deletedAt = item.deletedAt ? new Date(item.deletedAt) : null;
    const deletedText = deletedAt
      ? deletedAt.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '—';

    const price = item.p ?? parseAmount(item.budget) ?? 0;
    const net = item.priceClean ?? calcNet(item) ?? price;
    const paid = item.paid ?? 0;
    totalNet += net || 0;

    const title = item.title || item.n || item.note || 'Без названия';
    const client = item.c || item.name || 'Неизвестно';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="select-col">${idx + 1}</td>
      <td>${deletedText}</td>
      <td>${escapeHTML(client)}</td>
      <td>${escapeHTML(title)}</td>
      <td class="mono">${fmtCurrency(price)}</td>
      <td class="mono">${fmtCurrency(net)}</td>
      <td>${paid || 0}%</td>
      <td>
        <button class="table-btn" onclick="restoreFromTrash(${item.id})">Восстановить</button>
        <button class="table-btn danger" onclick="deleteProject(${item.id}, 'trash')">Удалить навсегда</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (totalRow) totalRow.textContent = `Итого: ${fmtCurrency(totalNet)}`;
}

function renderArchive() {
  const el = document.getElementById('col-archive');
  if (!el) return;

  const list = el.querySelector('.list');
  if (!list) return;

  list.innerHTML = '';

  const archiveItems = Array.isArray(DATA.archive) ? DATA.archive : [];
  const total = archiveItems.reduce((sum, p) => sum + (calcNet(p) || parseFloat(p.priceClean) || 0), 0);

  const countEl = el.querySelector('.count');
  const totalEl = el.querySelector('.total');
  if (countEl) countEl.textContent = archiveItems.length;
  if (totalEl) totalEl.textContent = fmtCurrency(total);

  archiveItems.forEach(p => {
    const doneDate = p.date ? new Date(p.date) : new Date();
    const deadline = p.dl ? new Date(p.dl) : null;

    let isLate = false;
    if (deadline) {
      isLate = doneDate.getTime() > deadline.getTime();
    }

    const doneTimeStr = doneDate.toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });

    const badgeClass = isLate
      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';

    const dlDisplay = deadline
      ? deadline.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Без срока';

    const priceValue = p.priceClean ?? calcNet(p) ?? p.p ?? 0;
    const title = p.title || p.n || 'Без названия';

    const card = document.createElement('div');
    card.className = 'card-item p-3 mb-2 rounded-lg border border-white/5 hover:border-white/10 transition-all group';
    card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="font-medium text-white/90 select-all">${title}</div>
                <div class="text-xs font-mono text-white/40">${fmtCurrency(priceValue)}</div>
            </div>
            
            <div class="flex justify-between items-center text-xs">
                <div class="flex flex-col">
                    <span class="text-white/30 text-[10px]">Дедлайн</span>
                    <span class="text-white/60">${dlDisplay}</span>
                </div>

                <div class="flex flex-col items-end" title="Сдано: ${doneTimeStr}">
                    <span class="text-white/30 text-[10px] mb-0.5">Сдано</span>
                    <span class="${badgeClass} px-2 py-0.5 rounded text-[10px] font-medium cursor-help">
                        ${doneDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                </div>
            </div>
            
            <div class="mt-3 pt-2 border-t border-white/5 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="restoreFromArchive('${p.id ?? ''}')" class="text-[10px] text-blue-400 hover:text-blue-300">Вернуть</button>
                <button onclick="deleteProject('${p.id ?? ''}', 'archive')" class="text-[10px] text-red-400 hover:text-red-300">Удалить</button>
            </div>
        `;
    list.appendChild(card);
  });
}

function renderAllProjects() {
  const list = document.getElementById('allProjectsList');
  if (!list) return;

  list.innerHTML = '';
  const all = [
    ...(DATA.active || []).map(i => ({ ...i, st: 'active', stName: 'В работе' })),
    ...(DATA.waiting || []).map(i => ({ ...i, st: 'waiting', stName: 'Ожидает' })),
    ...(DATA.potential || []).map(i => ({ ...i, st: 'potential', stName: 'Потенциал' })),
    ...(DATA.paused || []).map(i => ({ ...i, st: 'paused', stName: 'На паузе' })),
    ...(DATA.archive || []).map(i => ({ ...i, st: 'archive', stName: 'Выполнено' }))
  ];

  all.sort((a, b) => (Number(b.created) || 0) - (Number(a.created) || 0));

  const header = document.createElement('div');
  const gridStyle = 'grid-template-columns: 1fr 130px 100px 100px 110px; display: grid; gap: 1rem; align-items: center;';
  header.className = 'px-4 py-3 border-b border-white/10 text-xs text-white/40 uppercase font-bold tracking-wider';
  header.style.cssText = gridStyle;
  header.innerHTML = `
        <div>Проект</div>
        <div>Дедлайн</div>
        <div class="text-right">Сумма</div>
        <div class="text-right">Чистыми</div>
        <div class="text-right">Статус</div>
    `;
  list.appendChild(header);

  all.forEach(p => {
    const row = document.createElement('div');
    row.className = 'px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm text-white/80';
    row.style.cssText = gridStyle;

    let dlHtml = `<span class="text-white/30">—</span>`;
    let statusHtml = `<span class="text-white/50">${p.stName}</span>`;

    if (p.st === 'archive') {
      const doneDate = p.date ? new Date(p.date) : new Date();
      const dlDate = p.dl ? new Date(p.dl) : null;
      const isLate = dlDate && doneDate > dlDate;

      if (dlDate) {
        dlHtml = `<span>${dlDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>`;
      }

      const badgeClass = isLate
        ? 'bg-red-500/20 text-red-400 border-red-500/30'
        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

      statusHtml = `<span class="${badgeClass} border px-2 py-0.5 rounded text-[10px] whitespace-nowrap" title="Сдано: ${doneDate.toLocaleString()}">
                ${isLate ? 'Просрочено' : 'Сдано'}
            </span>`;
    } else {
      if (p.dl) {
        const d = new Date(p.dl);
        const isOverdue = d < new Date();
        const color = isOverdue ? 'text-red-400 font-bold' : '';
        dlHtml = `<span class="${color}">${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>`;
      }
    }

    const title = p.title || p.n || 'Без названия';
    const price = p.price ?? p.p ?? 0;
    const priceClean = p.priceClean ?? calcNet(p);

    row.innerHTML = `
            <div class="truncate font-medium pr-2" title="${title}">${title}</div>
            <div class="text-xs">${dlHtml}</div>
            <div class="text-right font-mono opacity-70">${fmtCurrency(price)}</div>
            <div class="text-right font-mono text-emerald-400/80">${fmtCurrency(priceClean)}</div>
            <div class="text-right flex justify-end">${statusHtml}</div>
        `;
    list.appendChild(row);
  });
}

function renderAll() {
  renderList(DATA.active, 'active');
  renderList(DATA.waiting, 'waiting');
  renderList(DATA.potential, 'potential');
  renderList(DATA.paused, 'paused');
  renderArchive();
  renderRequests();
  renderTrash();
  updateTabCounts();
  renderAllProjects();
}

function updateTabCounts() {
  const counts = {
    active: DATA.active.length,
    waiting: DATA.waiting.length,
    potential: DATA.potential.length,
    paused: DATA.paused.length,
    archive: DATA.archive.length,
    requests: DATA.requests.length,
    trash: DATA.trash.length,
    all: DATA.active.length + DATA.waiting.length + DATA.potential.length + DATA.paused.length + DATA.archive.length + DATA.requests.length
  };

  Object.entries(counts).forEach(([key, value]) => {
    const el = document.getElementById(`count-${key}`);
    if (el) {
      el.textContent = value;
    }
  });
}

function calcTax(item) {
  if (item.taxPrc === 0 || item.p === 0) return 0;
  const base = SETTINGS.taxBase === 'net' ? calcGross(item) : (item.p || 0);
  return Math.round(base * (item.taxPrc / 100));
}

function calcGross(item) {
  return (item.p || 0) - (item.contractorAmount || 0);
}

function calcNet(item) {
  return calcGross(item) - calcTax(item);
}

function calcContractorAmount(item) {
    return item.contractorAmount || 0;
}


function updateStats() {
  let allSum = 0;
  let allNet = 0;
  let allPaid = 0;
  let allTax = 0;
  let allContractor = 0;

  Object.entries(DATA).forEach(([status, list]) => {
    if (status === 'trash' || status === 'requests') return;

    (list || []).forEach(item => {
      allSum += item.p || 0;
      allNet += calcNet(item);
      allTax += calcTax(item);
      allContractor += calcContractorAmount(item);

      if (item.paid === 100) {
        allPaid += item.p || 0;
      } else if (item.paid > 0) {
        allPaid += Math.round((item.p || 0) * (item.paid / 100));
      }
    });
  });

  document.getElementById('all-sum').textContent = formatCurrency(allSum);
  document.getElementById('all-net').textContent = formatCurrency(allNet);
  document.getElementById('all-paid').textContent = formatCurrency(allPaid);
  document.getElementById('all-tax').textContent = formatCurrency(allTax);
  document.getElementById('all-contractor').textContent = formatCurrency(allContractor);

  updateChart(allSum, allPaid, allNet, allTax, allContractor);
}

let chartInstance = null;

function updateChart(allSum, allPaid, allNet, allTax, allContractor) {
  const ctx = document.getElementById('chart').getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Чистыми', 'Оплачено', 'Налог', 'Расходы', 'Остальное'],
      datasets: [{
        data: [
          allNet,
          allPaid - allNet - allTax - allContractor, // Оплачено, не учтенное в других
          allTax,
          allContractor,
          allSum - allPaid // Не оплачено
        ].map(v => v > 0 ? v : 0),
        backgroundColor: [
          '#2ea043', // success
          '#58a6ff', // link
          '#f85149', // error
          '#8b949e', // muted (Contractor)
          '#facc15' // warn (Remaining / Unpaid)
        ],
        borderColor: 'transparent',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { display: false } },
        y: { display: false, ticks: { beginAtZero: true } }
      }
    }
  });
}

function toggleMenu() {
  document.querySelector('.menu').classList.toggle('hidden');
}

function toggleInfo() {
  document.querySelector('.info').classList.toggle('open');
  document.querySelector('.menu').classList.add('hidden');
}

function toggleDonate() {
  document.querySelector('.donate').classList.toggle('open');
  document.querySelector('.menu').classList.add('hidden');
}

function toggleSettings() {
  document.querySelector('.settings').classList.toggle('open');
  document.querySelector('.menu').classList.add('hidden');
}

function moveToTrash(item, fromStatus = 'active') {
  if (!item) return;
  const entry = { ...item, deletedAt: new Date().toISOString(), _fromStatus: fromStatus };
  if (!Array.isArray(DATA.trash)) {
    DATA.trash = [];
  }

  const exists = DATA.trash.some(p => String(p.id) === String(item.id));
  if (!exists) {
    DATA.trash.push(entry);
  }
}

function deleteRequest(id) {
  const idx = (DATA.requests || []).findIndex(r => String(r.id) === String(id));
  if (idx === -1) return;

  const [item] = DATA.requests.splice(idx, 1);
  moveToTrash(item, 'requests');
  saveData();
}

function convertRequestToProject(id) {
  const idx = (DATA.requests || []).findIndex(r => String(r.id) === String(id));
  if (idx === -1) return;

  const [req] = DATA.requests.splice(idx, 1);
  const project = {
    id: req.id,
    c: req.name || 'Клиент',
    n: req.note || 'Новая заявка',
    p: parseAmount(req.budget) || 0,
    paid: 0,
    taxPrc: SETTINGS.taxPrc,
    contractorAmount: 0,
    start: today,
    dl: '',
    link: req.link,
    source: req.source,
    status: 'active',
    created: Date.now()
  };

  DATA.active.push(project);
  saveData();
}

function restoreFromArchive(id) {
  const idx = (DATA.archive || []).findIndex(p => String(p.id) === String(id));
  if (idx === -1) return;

  const [item] = DATA.archive.splice(idx, 1);
  DATA.active.push(item);
  saveData();
}

function deleteProject(id, scope = 'archive') {
  const list = DATA[scope];
  if (!Array.isArray(list)) return;

  const idx = list.findIndex(p => String(p.id) === String(id));
  if (idx === -1) return;

  const [item] = list.splice(idx, 1);
  if (scope !== 'trash') {
    moveToTrash(item, scope);
  }
  saveData();
}

function restoreFromTrash(id) {
  const idx = (DATA.trash || []).findIndex(p => String(p.id) === String(id));
  if (idx === -1) return;

  const [item] = DATA.trash.splice(idx, 1);
  const target = STATUS_KEYS.includes(item._fromStatus) && item._fromStatus !== 'trash'
    ? item._fromStatus
    : 'active';

  if (!Array.isArray(DATA[target])) {
    DATA[target] = [];
  }

  const cleaned = { ...item };
  delete cleaned._fromStatus;
  delete cleaned.deletedAt;

  DATA[target].push(cleaned);
  saveData();
}

function clearTrashForever() {
  if (!confirm('Очистить корзину без возможности восстановления?')) return;
  DATA.trash = [];
  saveData();
}

function clearAll() {
  if (confirm('Вы уверены, что хотите полностью очистить все данные? Это действие необратимо.')) {
    DATA = createEmptyData();
    saveData();
    closeModal();
  }
}

function exp() {
  const a = document.createElement('a');
  const snapshot = JSON.stringify(DATA || createEmptyData());
  a.href = URL.createObjectURL(new Blob([snapshot], { type: 'application/json' }));
  a.download = `DesignFlow-Backup-${today}.json`;
  a.click();
}

function expCSV() {
  const escape = v => `"${(v || '').toString().replace(/"/g, '""')}"`;
  let csv = ['Статус', 'Клиент', 'Проект', 'Сумма', 'Чистыми', 'Оплачено (%)', 'Налог (%)', 'Расходы', 'Дата Старта', 'Дедлайн/Сдачи', 'Ссылка'].map(escape).join(';') + '\n';
  
  const addRows = (list, status) => list.forEach(i => csv += [
    status,
    i.c,
    i.n,
    i.p,
    calcNet(i),
    i.paid || 0,
    i.taxPrc || 0,
    calcContractorAmount(i),
    i.start || '',
    i.dl || i.date || '',
    i.link || ''
  ].map(escape).join(';') + '\n');
  
  addRows(DATA.active, 'В работе');
  addRows(DATA.waiting, 'Ожидает');
  addRows(DATA.potential, 'Потенциал');
  addRows(DATA.paused, 'На паузе');
  addRows(DATA.archive, 'Выполнено');
  
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' }); // Добавление BOM для корректного отображения кириллицы в Excel
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `DesignFlow-Export-${today}.csv`;
  a.click();
}

function imp() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const importedData = JSON.parse(e.target.result);
          if (importedData && typeof importedData === 'object') {
            const { normalized } = normalizeData(importedData);
            DATA = normalized;
            saveData();
            alert('Данные успешно импортированы!');
          } else {
            throw new Error('Неверный формат данных');
          }
        } catch (error) {
          alert(`Ошибка импорта: ${error.message}`);
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}


document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadData();
  getToday();
  renderAll();
  document.querySelector('.tab[data-tab="active"]').classList.add('active');
  updateStats();

  (function runXssSmokeTest() {
    const malicious = {
      id: -1,
      c: '<script>window.__designFlowXSS = true;</script>',
      n: '<script>alert("XSS")</script>',
      p: 0,
      taxPrc: 0,
      contractorAmount: 0,
      paid: 0,
      start: '<script>alert(1)</script>',
      dl: '<img src=x onerror=alert(1)>',
      link: 'javascript:alert(1)',
      status: 'active'
    };

    const container = document.createElement('div');
    container.appendChild(renderItem(malicious));
    const hasScriptTag = container.querySelector('script');
    const textContainsScript = container.textContent.includes('<script>');

    console.assert(!hasScriptTag && textContainsScript, 'XSS guard failed: script tag detected');
  })();

  flatpickr('#start', {
    "locale": "ru",
    dateFormat: "Y-m-d",
    allowInput: true
  });
  flatpickr('#dl', {
    "locale": "ru",
    dateFormat: "Y-m-d",
    allowInput: true
  });
});
