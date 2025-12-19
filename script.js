const K = 'DesignFlowData';
const TODAY_K = 'DesignFlowToday';
const SETTINGS_K = 'DesignFlowSettings';

let DATA = {
  active: [],
  waiting: [],
  potential: [],
  paused: [],
  archive: []
};

let SETTINGS = {
  currency: '₽',
  taxPrc: 0,
  percentPaid: 0,
  taxBase: 'p' // p or net
};

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

function loadData() {
  try {
    const data = JSON.parse(localStorage.getItem(K));
    if (data) {
      DATA = data;
    }
  } catch (e) {
    console.error('Error loading data:', e);
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
      DATA[key].splice(index, 1);
    }
  });

  saveData();
  closeModal();
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

  return `
    <div class="card" onclick="openModal(${JSON.stringify(item).replace(/"/g, '&quot;')})">
      <div class="c-row">
        <div class="c-client">${item.c || '—'}</div>
        <div class="c-price">${item.p || 0} ${SETTINGS.currency}</div>
      </div>
      <div class="c-row">
        <div class="c-name">${item.n || '—'}</div>
        <div class="c-tax">${tax ? `Налог: ${tax} ${SETTINGS.currency} (${item.taxPrc || 0}%)` : 'Без налога'}</div>
      </div>
      <div class="c-row">
        <div class="c-net">Чистыми: ${net} ${SETTINGS.currency}</div>
        <div class="c-paid ${paidClass}">Оплачено: ${item.paid || 0}%</div>
      </div>
      ${contractor ? `<div class="c-row"><div class="c-contractor">Расходы: ${contractor} ${SETTINGS.currency}</div></div>` : ''}
      <div class="c-dates">
        <span>Старт: ${item.start || '—'}</span>
        <span>Дедлайн: ${item.dl || item.date || '—'}</span>
      </div>
      ${item.link ? `<div class="c-link"><a href="${item.link}" target="_blank">Ссылка</a></div>` : ''}
    </div>
  `;
}

function renderList(list, containerId) {
  const container = document.querySelector(`#${containerId} .list`);
  container.innerHTML = '';
  list.forEach(item => {
    container.innerHTML += renderItem({ ...item, status: containerId });
  });
}

function renderAll() {
  Object.keys(DATA).forEach(key => {
    renderList(DATA[key], key);
  });
  updateTabCounts();
}

function updateTabCounts() {
  const counts = {
    active: DATA.active.length,
    waiting: DATA.waiting.length,
    potential: DATA.potential.length,
    paused: DATA.paused.length,
    archive: DATA.archive.length,
    all: DATA.active.length + DATA.waiting.length + DATA.potential.length + DATA.paused.length + DATA.archive.length,
    trash: 0
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

  Object.values(DATA).forEach(list => {
    list.forEach(item => {
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

  document.getElementById('all-sum').textContent = `${allSum} ${SETTINGS.currency}`;
  document.getElementById('all-net').textContent = `${allNet} ${SETTINGS.currency}`;
  document.getElementById('all-paid').textContent = `${allPaid} ${SETTINGS.currency}`;
  document.getElementById('all-tax').textContent = `${allTax} ${SETTINGS.currency}`;
  document.getElementById('all-contractor').textContent = `${allContractor} ${SETTINGS.currency}`;

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

function clearAll() {
  if (confirm('Вы уверены, что хотите полностью очистить все данные? Это действие необратимо.')) {
    DATA = {
      active: [],
      waiting: [],
      potential: [],
      paused: [],
      archive: []
    };
    saveData();
    closeModal();
  }
}

function exp() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([localStorage.getItem(K)], { type: 'application/json' }));
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
            DATA = { ...DATA, ...importedData };
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
  document.querySelector('.tab[data-tab="active"]').classList.add('active');
  updateStats();

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
