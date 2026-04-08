// Полифиллы для GM_ функций
if (typeof GM_getValue === 'undefined') {
    window.GM_getValue = function(key, defaultValue) {
        try { return JSON.parse(localStorage.getItem(key) || defaultValue); } 
        catch { return defaultValue; }
    };
    window.GM_setValue = function(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    };
    window.GM_addStyle = function(css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    };
    window.GM_xmlhttpRequest = function(options) {
        fetch(options.url, {
            method: options.method || 'GET',
            headers: options.headers || {},
            body: options.data || null
        })
        .then(r => r.json())
        .then(data => options.onload({ responseText: JSON.stringify(data) }))
        .catch(e => options.onerror && options.onerror(e));
    };
}


// ==UserScript==
// @name         DesignFlow Journal PRO v5.2
// @namespace    http://tampermonkey.net/
// @version      5.2
// @description  Умный помощник: подзадачи, AI-планировщик, таймер Pomodoro, прогнозы
// @author       You
// @match        *://*/*DesignFlow*/*
// @match        *://*/*designflow*/*
// @match        file://*/*DesignFlow*/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      openrouter.ai
// ==/UserScript==

(function() {
    'use strict';

    // ========== КОНФИГУРАЦИЯ ==========
    const OPENROUTER_API_KEY = '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';
    const AI_MODEL = 'google/gemini-2.0-flash-001';
    const STORAGE_KEY = 'designflow_journal_tasks';
    const HISTORY_KEY = 'designflow_task_history';
    const TEMPLATES_KEY = 'designflow_custom_templates';
    const TIMER_KEY = 'designflow_timer_state';
    const WORKLOG_KEY = 'designflow_worklog';
    const CATEGORIES_KEY = 'designflow_categories';

    // ========== ИКОНКИ SVG ==========
    const ICONS = {
        calendar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
        clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
        dollar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
        check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        circle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>',
        trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
        upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',
        sparkles: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"></path><path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z"></path></svg>',
        history: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
        file: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
        share: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
        flame: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.54 2-6 .5 2.5 2 4.5 4 6 2 2.5 2 5 0 7-1.5 1.5-3.5 1.5-5 0s-2-2.5-2.5-1.5z"></path></svg>',
        alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
        info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
        journal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
        save: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>',
        play: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
        pause: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>',
        stop: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>',
        target: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
        brain: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2a4 4 0 0 1 4-4z"></path><path d="M8 8v2a4 4 0 0 0 8 0V8"></path><path d="M6 12a6 6 0 0 0 12 0"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>',
        chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
        list: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
        chevronDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>',
        chevronRight: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>',
        coffee: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
        zap: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
        split: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5"></path><path d="M8 3H3v5"></path><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"></path><path d="m15 9 6-6"></path></svg>',
        folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
        template: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>',
        category: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7h-4.5L15 4h-4l-.5 3H8v13h12V7z"></path><path d="M4 7h13v13H4V7z"></path></svg>',
        copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
    };

    // ========== ХРАНЕНИЕ ДАННЫХ ==========
    function loadTasks() {
        try { return JSON.parse(GM_getValue(STORAGE_KEY, '{}')); }
        catch { return {}; }
    }

    function saveTasks(tasks) {
        GM_setValue(STORAGE_KEY, JSON.stringify(tasks));
    }

    function loadWorklog() {
        try { return JSON.parse(GM_getValue(WORKLOG_KEY, '{}')); }
        catch { return {}; }
    }

    function saveWorklog(worklog) {
        GM_setValue(WORKLOG_KEY, JSON.stringify(worklog));
    }

    function loadTimerState() {
        try { return JSON.parse(GM_getValue(TIMER_KEY, 'null')); }
        catch { return null; }
    }

    function saveTimerState(state) {
        GM_setValue(TIMER_KEY, JSON.stringify(state));
    }

    function loadCategories() {
        try { return JSON.parse(GM_getValue(CATEGORIES_KEY, '[]')); }
        catch { return []; }
    }

    function saveCategories(cats) {
        GM_setValue(CATEGORIES_KEY, JSON.stringify(cats));
    }

    let TASKS = loadTasks();
    let CATEGORIES = loadCategories();

    function getTasks(projectId) {
        return TASKS[projectId] || [];
    }

    function setTasks(projectId, tasks) {
        TASKS[projectId] = tasks;
        saveTasks(TASKS);
        updateAllButtons();
    }

    // ========== ИСТОРИЯ ИЗМЕНЕНИЙ ==========
    function logTaskChange(projectId, action, details) {
        const history = JSON.parse(GM_getValue(HISTORY_KEY, '{}'));
        if (!history[projectId]) history[projectId] = [];
        history[projectId].push({
            timestamp: new Date().toISOString(),
            action,
            details
        });
        if (history[projectId].length > 100) {
            history[projectId] = history[projectId].slice(-100);
        }
        GM_setValue(HISTORY_KEY, JSON.stringify(history));
    }

    // ========== WORKLOG (ЛОГ АКТИВНОСТИ) ==========
    function addWorklogEntry(projectId, taskText, duration, type = 'work') {
        const worklog = loadWorklog();
        if (!worklog[projectId]) worklog[projectId] = [];

        worklog[projectId].push({
            id: `wl_${Date.now()}`,
            taskText,
            duration,
            type,
            startTime: new Date(Date.now() - duration * 1000).toISOString(),
            endTime: new Date().toISOString(),
            date: new Date().toLocaleDateString('ru-RU')
        });

        saveWorklog(worklog);
    }

    function getWorklogForProject(projectId) {
        const worklog = loadWorklog();
        return worklog[projectId] || [];
    }

    function getTodayWorklog(projectId) {
        const today = new Date().toLocaleDateString('ru-RU');
        return getWorklogForProject(projectId).filter(e => e.date === today);
    }

    // ========== ТАЙМЕР POMODORO ==========
    let timerInterval = null;
    let currentTimerState = loadTimerState();

    function startTimer(projectId, taskIndex, taskText) {
        if (timerInterval) clearInterval(timerInterval);

        currentTimerState = {
            projectId,
            taskIndex,
            taskText,
            startTime: Date.now(),
            elapsed: 0,
            isPaused: false,
            pomodoroCount: currentTimerState?.pomodoroCount || 0,
            pomodoroPhase: 'work',
            pomodoroWorkTime: 25 * 60,
            pomodoroBreakTime: 5 * 60
        };

        saveTimerState(currentTimerState);
        runTimer();
    }

    function runTimer() {
        if (timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            if (!currentTimerState || currentTimerState.isPaused) return;

            currentTimerState.elapsed = Math.floor((Date.now() - currentTimerState.startTime) / 1000);
            saveTimerState(currentTimerState);

            const phaseTime = currentTimerState.pomodoroPhase === 'work'
                ? currentTimerState.pomodoroWorkTime
                : currentTimerState.pomodoroBreakTime;

            if (currentTimerState.elapsed >= phaseTime) {
                if (currentTimerState.pomodoroPhase === 'work') {
                    currentTimerState.pomodoroCount++;
                    showToast(`🍅 Pomodoro #${currentTimerState.pomodoroCount} завершён! Перерыв 5 минут`, 'success');
                    addWorklogEntry(
                        currentTimerState.projectId,
                        currentTimerState.taskText,
                        currentTimerState.elapsed,
                        'pomodoro'
                    );
                    currentTimerState.pomodoroPhase = 'break';
                } else {
                    showToast('☕ Перерыв окончен! Продолжаем работу', 'info');
                    currentTimerState.pomodoroPhase = 'work';
                }
                currentTimerState.startTime = Date.now();
                currentTimerState.elapsed = 0;
                saveTimerState(currentTimerState);
            }

            updateTimerDisplay();
        }, 1000);
    }

    function pauseTimer() {
        if (!currentTimerState) return;
        currentTimerState.isPaused = !currentTimerState.isPaused;
        if (!currentTimerState.isPaused) {
            currentTimerState.startTime = Date.now() - (currentTimerState.elapsed * 1000);
        }
        saveTimerState(currentTimerState);
    }

    function stopTimer() {
        if (!currentTimerState) return;

        if (currentTimerState.elapsed > 60) {
            addWorklogEntry(
                currentTimerState.projectId,
                currentTimerState.taskText,
                currentTimerState.elapsed,
                currentTimerState.pomodoroPhase
            );
        }

        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        currentTimerState = null;
        saveTimerState(null);
    }

    function formatTimerTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        const timerEl = document.querySelector('.tm-timer-display');
        if (timerEl && currentTimerState) {
            timerEl.textContent = formatTimerTime(currentTimerState.elapsed);
        }
        const pomodoroIcon = document.querySelector(`.tm-pomodoro-icon[data-task-index="${currentTimerState?.taskIndex}"]`);
        if (pomodoroIcon) {
            pomodoroIcon.style.display = 'inline-flex';
        }
    }

    // ========== УТИЛИТЫ ==========
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function parseNumber(val) {
        const num = parseFloat(String(val || '').replace(/\s/g, '').replace(',', '.'));
        return isNaN(num) ? 0 : num;
    }

    function formatMoney(val) {
        return val.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
    }

    function parseTime(hours, minutes) {
        return parseNumber(hours) + parseNumber(minutes) / 60;
    }

    function formatTotalTime(decimalHours) {
        const hours = Math.floor(decimalHours);
        const minutes = Math.round((decimalHours - hours) * 60);
        if (minutes === 0) return `${hours}ч`;
        return `${hours}ч ${minutes}м`;
    }

    function generateId() {
        return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `tm-toast tm-toast-${type}`;
        toast.innerHTML = `<span>${type === 'error' ? ICONS.alert : type === 'success' ? ICONS.check : ICONS.info}</span><span>${message}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('tm-toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ========== МЕТРИКИ ==========
    function calculateMetrics(tasks) {
        const total = tasks.length;
        const done = tasks.filter(t => t.done).length;

        let totalHours = 0;
        let totalPrice = 0;

        tasks.forEach(t => {
            if (t.subtasks && t.subtasks.length > 0) {
                t.subtasks.forEach(sub => {
                    totalHours += parseTime(sub.hours, sub.minutes);
                });
            } else {
                totalHours += parseTime(t.hours, t.minutes);
            }
            totalPrice += parseNumber(t.price);
        });

        const progress = total ? (done / total) * 100 : 0;
        return { progress, totalHours, totalPrice, done, total };
    }

    function calculateSubtaskProgress(task) {
        if (!task.subtasks || task.subtasks.length === 0) return null;
        const done = task.subtasks.filter(s => s.done).length;
        const total = task.subtasks.length;
        return { done, total, percent: (done / total) * 100 };
    }

    // ========== СОРТИРОВКА ==========
    function sortTasksByPriority(tasks) {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        return [...tasks].sort((a, b) => {
            if (a.done !== b.done) return a.done ? 1 : -1;
            return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
        });
    }

    // ========== AI ФУНКЦИИ ==========

    // AI: Распознавание задач из текста
    async function analyzeTextWithAI(text, projectContext = {}) {
        const prompt = `Ты — профессиональный project-менеджер. Извлеки из текста список задач.

${projectContext.client ? `Клиент: ${projectContext.client}` : ''}
${projectContext.budget ? `Бюджет: ${formatMoney(projectContext.budget)}` : ''}

Верни ТОЛЬКО JSON:
{
  "tasks": [
    {"text": "Название", "hours": "2", "minutes": "30", "price": "5000", "priority": "high"}
  ]
}

Приоритеты: high (срочное), medium (обычное), low (может подождать).
Если часов/минут/цены нет — оставь "0".
Цены с "к" = тысячи (5к = 5000).

Текст:
${text}`;

        try {
            const response = await callOpenRouter(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                return data.tasks || [];
            }
        } catch (e) {
            console.error('Ошибка AI:', e);
            showToast('Ошибка AI при распознавании текста: ' + e.message, 'error');
        }
        return [];
    }

    // AI: Разбить задачу на подзадачи
    async function splitTaskWithAI(task, projectContext = {}) {
        const prompt = `Ты — профессиональный project-менеджер. Разбей задачу на подзадачи.

Задача: "${task.text}"
Время: ${task.hours || 0}ч ${task.minutes || 0}м
Бюджет: ${formatMoney(parseNumber(task.price))}

Разбей на 3-7 логичных подзадач. Сумма времени подзадач = общему времени.

Верни ТОЛЬКО JSON:
{
  "subtasks": [
    {"text": "Название подзадачи", "hours": "2", "minutes": "0"},
    {"text": "Ещё подзадача", "hours": "1", "minutes": "30"}
  ]
}`;

        try {
            const response = await callOpenRouter(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                return data.subtasks || [];
            }
        } catch (e) {
            console.error('Ошибка AI:', e);
            showToast('Ошибка AI при разбиении задачи: ' + e.message, 'error');
        }
        return [];
    }

    // AI: С чего начать? (Планировщик)
    async function getAIPlannerAdvice(tasks, projectContext = {}) {
        const activeTasks = tasks.filter(t => !t.done);
        if (activeTasks.length === 0) return null;

        const tasksDescription = activeTasks.map((t, i) =>
            `${i + 1}. "${t.text}" (${t.hours || 0}ч ${t.minutes || 0}м, ${formatMoney(parseNumber(t.price))}, приоритет: ${t.priority || 'medium'})`
        ).join('\n');

        const prompt = `Ты — эксперт по продуктивности и project-менеджменту.

Проект: ${projectContext.project || 'Без названия'}
Клиент: ${projectContext.client || 'Не указан'}
${projectContext.deadline ? `Дедлайн: ${projectContext.deadline}` : ''}

Активные задачи:
${tasksDescription}

Проанализируй задачи и дай рекомендации:
1. С какой задачи лучше начать и почему?
2. Какие задачи можно сделать быстро (быстрые победы)?
3. Какие задачи критичны для проекта?
4. Есть ли риски или проблемы?

Верни JSON:
{
  "startWith": {
    "taskIndex": 0,
    "reason": "Почему начать с этой задачи"
  },
  "quickWins": [
    {"taskIndex": 1, "reason": "Занимает мало времени"}
  ],
  "critical": [
    {"taskIndex": 2, "reason": "Блокирует другие задачи"}
  ],
  "risks": ["Описание риска если есть"],
  "summary": "Краткий совет в 1-2 предложения"
}`;

        try {
            const response = await callOpenRouter(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Ошибка AI Planner:', e);
            showToast('Ошибка AI планировщика: ' + e.message, 'error');
        }
        return null;
    }

    // AI: Прогноз завершения проекта
    async function getProjectForecast(tasks, projectContext = {}) {
        const activeTasks = tasks.filter(t => !t.done);
        const doneTasks = tasks.filter(t => t.done);

        const totalRemainingHours = activeTasks.reduce((sum, t) => {
            if (t.subtasks && t.subtasks.length > 0) {
                return sum + t.subtasks.filter(s => !s.done).reduce((s, sub) =>
                    s + parseTime(sub.hours, sub.minutes), 0);
            }
            return sum + parseTime(t.hours, t.minutes);
        }, 0);

        const worklog = getWorklogForProject(projectContext.projectId || '');
        const last7Days = worklog.filter(w => {
            const date = new Date(w.endTime);
            return (Date.now() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
        });

        const avgHoursPerDay = last7Days.length > 0
            ? last7Days.reduce((s, w) => s + w.duration, 0) / (7 * 3600)
            : 4;

        const prompt = `Ты — эксперт по project-менеджменту.

Проект: ${projectContext.project || 'Без названия'}
${projectContext.deadline ? `Дедлайн: ${projectContext.deadline}` : 'Дедлайн не указан'}

Статистика:
- Выполнено задач: ${doneTasks.length} из ${tasks.length}
- Осталось часов работы: ${totalRemainingHours.toFixed(1)}ч
- Средняя скорость: ~${avgHoursPerDay.toFixed(1)}ч в день

Сделай прогноз:
1. Когда проект будет завершён?
2. Успеваем ли к дедлайну?
3. Рекомендации по ускорению

Верни JSON:
{
  "estimatedDays": 5,
  "estimatedDate": "25 января 2024",
  "onTrack": true,
  "delayDays": 0,
  "recommendations": ["Рекомендация 1", "Рекомендация 2"],
  "summary": "Краткий прогноз"
}`;

        try {
            const response = await callOpenRouter(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('Ошибка AI Forecast:', e);
        }

        const daysNeeded = Math.ceil(totalRemainingHours / avgHoursPerDay);
        const estimatedDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000);

        return {
            estimatedDays: daysNeeded,
            estimatedDate: estimatedDate.toLocaleDateString('ru-RU'),
            onTrack: true,
            delayDays: 0,
            recommendations: [],
            summary: `При текущей скорости (${avgHoursPerDay.toFixed(1)}ч/день) проект будет готов через ${daysNeeded} дней`
        };
    }

    // AI: Распознавание изображений
    async function analyzeImageWithAI(base64Image) {
        const prompt = `Извлеки все задачи из скриншота переписки/ТЗ. Верни ТОЛЬКО JSON: {"tasks": [{"text": "...", "hours": "2", "minutes": "0", "price": "5000", "priority": "medium"}]}`;

        try {
            const response = await callOpenRouterVision(prompt, base64Image);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                return data.tasks || [];
            }
        } catch (e) {
            console.error('Ошибка AI Vision:', e);
            showToast('Ошибка AI при распознавании изображения: ' + e.message, 'error');
        }
        return [];
    }

    // API вызов
    function callOpenRouter(prompt) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://openrouter.ai/api/v1/chat/completions',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'DesignFlow Journal PRO'
                },
                data: JSON.stringify({
                    model: AI_MODEL,
                    messages: [
                        { role: 'system', content: 'Ты — ассистент для управления проектами. Отвечай только валидным JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 2000
                }),
                onload: (resp) => {
                    try {
                        const data = JSON.parse(resp.responseText);
                        resolve(data.choices[0].message.content);
                    } catch (e) { reject(e); }
                },
                onerror: reject
            });
        });
    }

    function callOpenRouterVision(prompt, base64Image) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://openrouter.ai/api/v1/chat/completions',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'DesignFlow Journal PRO'
                },
                data: JSON.stringify({
                    model: AI_MODEL,
                    messages: [
                        { role: 'system', content: 'Отвечай только валидным JSON.' },
                        { role: 'user', content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: base64Image } }
                        ]}
                    ],
                    temperature: 0.3,
                    max_tokens: 2000
                }),
                onload: (resp) => {
                    try {
                        const data = JSON.parse(resp.responseText);
                        resolve(data.choices[0].message.content);
                    } catch (e) { reject(e); }
                },
                onerror: reject
            });
        });
    }

    // ========== ПОЛУЧЕНИЕ ДАННЫХ ПРОЕКТА ==========
    function getProjectIdFromRow(row) {
        let id = row.dataset.projectId;
        if (!id) {
            const client = row.querySelector('[data-key="c"]')?.textContent?.trim() || '';
            const project = row.querySelector('[data-key="n"]')?.textContent?.trim() || '';
            id = btoa(encodeURIComponent(client + '|' + project)).replace(/=/g, '');
            row.dataset.projectId = id;
        }
        return id;
    }

    function getProjectContext(row) {
        const client = row.querySelector('[data-key="c"]')?.textContent?.trim() || '';
        const project = row.querySelector('[data-key="n"]')?.textContent?.trim() || '';
        const priceCell = row.querySelector('[data-key="p"]');
        const budget = priceCell ? parseNumber(priceCell.textContent) : 0;
        const dlCell = row.querySelector('[data-key="dl"]');
        const deadline = dlCell?.textContent?.trim() || '';
        return { client, project, budget, deadline };
    }

    function getProjectTitle(row) {
        const ctx = getProjectContext(row);
        return ctx.client && ctx.project ? `${ctx.client} — ${ctx.project}` : ctx.client || ctx.project || 'Проект';
    }

    // ========== ОБНОВЛЕНИЕ КНОПОК ==========
    function updateAllButtons() {
        document.querySelectorAll('table tbody tr').forEach(row => addJournalButton(row));
    }

    function addJournalButton(row) {
        if (row.querySelector('.tm-journal-btn')) return;

        const projectId = getProjectIdFromRow(row);
        const tasks = getTasks(projectId);
        const done = tasks.filter(t => t.done).length;
        const total = tasks.length;

        const actionCell = row.querySelector('td:last-child');
        if (!actionCell) return;

        const btn = document.createElement('button');
        btn.className = 'tm-journal-btn';
        btn.innerHTML = `${ICONS.check} ${done}/${total}`;
        btn.title = 'Открыть журнал задач';
        btn.onclick = (e) => {
            e.stopPropagation();
            openJournal(projectId, row);
        };
        actionCell.appendChild(btn);
    }

    // ========== ПОКАЗ МОДАЛЬНЫХ ОКОН ==========

    function showHistory(projectId, projectTitle) {
        const history = JSON.parse(GM_getValue(HISTORY_KEY, '{}'))[projectId] || [];

        const overlay = document.createElement('div');
        overlay.className = 'tm-modal-overlay tm-sub-overlay';

        const modal = document.createElement('div');
        modal.className = 'tm-modal tm-modal-small';

        modal.innerHTML = `
            <div class="tm-modal-header">
                <div class="tm-header-left">
                    ${ICONS.history}
                    <h3>История изменений</h3>
                </div>
                <button class="tm-close-btn">${ICONS.x}</button>
            </div>
            <div class="tm-project-subtitle">${escapeHtml(projectTitle)}</div>
            <div class="tm-modal-body tm-scrollable">
                ${history.length ? [...history].reverse().map(entry => `
                    <div class="tm-history-item">
                        <div class="tm-history-icon">${ICONS.circle}</div>
                        <div class="tm-history-content">
                            <div class="tm-history-action">${escapeHtml(entry.action)}</div>
                            <div class="tm-history-details">${escapeHtml(entry.details)}</div>
                            <div class="tm-history-time">${new Date(entry.timestamp).toLocaleString('ru-RU')}</div>
                        </div>
                    </div>
                `).join('') : '<div class="tm-empty">История пуста</div>'}
            </div>
        `;

        modal.querySelector('.tm-close-btn').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    function showWorklog(projectId, projectTitle) {
        const worklog = getWorklogForProject(projectId);
        const today = new Date().toLocaleDateString('ru-RU');

        const grouped = {};
        worklog.forEach(entry => {
            if (!grouped[entry.date]) grouped[entry.date] = [];
            grouped[entry.date].push(entry);
        });

        const overlay = document.createElement('div');
        overlay.className = 'tm-modal-overlay tm-sub-overlay';

        const modal = document.createElement('div');
        modal.className = 'tm-modal tm-modal-small';

        const todayTotal = getTodayWorklog(projectId).reduce((s, w) => s + w.duration, 0);

        modal.innerHTML = `
            <div class="tm-modal-header">
                <div class="tm-header-left">
                    ${ICONS.list}
                    <h3>Лог активности</h3>
                </div>
                <button class="tm-close-btn">${ICONS.x}</button>
            </div>
            <div class="tm-project-subtitle">
                ${escapeHtml(projectTitle)}
                <span class="tm-today-total">Сегодня: ${formatTimerTime(todayTotal)}</span>
            </div>
            <div class="tm-modal-body tm-scrollable">
                ${Object.keys(grouped).length ? Object.entries(grouped).reverse().map(([date, entries]) => `
                    <div class="tm-worklog-day">
                        <div class="tm-worklog-date">${date === today ? '📅 Сегодня' : `📅 ${date}`}</div>
                        ${entries.map(e => `
                            <div class="tm-worklog-entry">
                                <span class="tm-worklog-time">${new Date(e.startTime).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})} - ${new Date(e.endTime).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</span>
                                <span class="tm-worklog-task">${escapeHtml(e.taskText)}</span>
                                <span class="tm-worklog-duration">${formatTimerTime(e.duration)}</span>
                                ${e.type === 'pomodoro' ? '<span class="tm-pomodoro-badge">🍅</span>' : ''}
                            </div>
                        `).join('')}
                        <div class="tm-worklog-day-total">
                            Итого: ${formatTimerTime(entries.reduce((s, e) => s + e.duration, 0))}
                        </div>
                    </div>
                `).join('') : '<div class="tm-empty">Нет записей. Запустите таймер для начала отслеживания.</div>'}
            </div>
        `;

        modal.querySelector('.tm-close-btn').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }
    async function showAIPlanner(projectId, projectTitle, tasks, projectContext) {
        const overlay = document.createElement('div');
        overlay.className = 'tm-modal-overlay tm-sub-overlay';

        const modal = document.createElement('div');
        modal.className = 'tm-modal tm-modal-medium';

        modal.innerHTML = `
            <div class="tm-modal-header">
                <div class="tm-header-left">
                    ${ICONS.brain}
                    <h3>AI Планировщик</h3>
                </div>
                <button class="tm-close-btn">${ICONS.x}</button>
            </div>
            <div class="tm-project-subtitle">${escapeHtml(projectTitle)}</div>
            <div class="tm-modal-body">
                <div class="tm-ai-loading">
                    <div class="tm-spinner"></div>
                    <span>AI анализирует проект...</span>
                </div>
            </div>
        `;

        modal.querySelector('.tm-close-btn').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const advice = await getAIPlannerAdvice(tasks, projectContext);
        const forecast = await getProjectForecast(tasks, { ...projectContext, projectId });

        const activeTasks = tasks.filter(t => !t.done);
        const body = modal.querySelector('.tm-modal-body');

        if (!advice) {
            body.innerHTML = `<div class="tm-empty">Не удалось получить рекомендации от AI</div>`;
            return;
        }

        body.innerHTML = `
            <div class="tm-planner-section">
                <div class="tm-planner-card tm-planner-start">
                    <div class="tm-planner-icon">${ICONS.target}</div>
                    <div class="tm-planner-content">
                        <h4>🎯 Начни с этой задачи</h4>
                        <p class="tm-planner-task">${escapeHtml(activeTasks[advice.startWith?.taskIndex]?.text || 'Не определено')}</p>
                        <p class="tm-planner-reason">${escapeHtml(advice.startWith?.reason || '')}</p>
                    </div>
                </div>

                ${advice.quickWins?.length ? `
                    <div class="tm-planner-card">
                        <h4>⚡ Быстрые победы</h4>
                        <ul class="tm-planner-list">
                            ${advice.quickWins.map(qw => `
                                <li>${escapeHtml(activeTasks[qw.taskIndex]?.text || '')} <span class="tm-muted">— ${escapeHtml(qw.reason)}</span></li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${advice.critical?.length ? `
                    <div class="tm-planner-card tm-planner-critical">
                        <h4>🔥 Критичные задачи</h4>
                        <ul class="tm-planner-list">
                            ${advice.critical.map(c => `
                                <li>${escapeHtml(activeTasks[c.taskIndex]?.text || '')} <span class="tm-muted">— ${escapeHtml(c.reason)}</span></li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${advice.risks?.length ? `
                    <div class="tm-planner-card tm-planner-risks">
                        <h4>⚠️ Риски</h4>
                        <ul class="tm-planner-list">
                            ${advice.risks.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>

            <div class="tm-forecast-section">
                <h4>📊 Прогноз завершения</h4>
                <div class="tm-forecast-grid">
                    <div class="tm-forecast-item">
                        <span class="tm-forecast-value">${forecast.estimatedDays}</span>
                        <span class="tm-forecast-label">дней до готовности</span>
                    </div>
                    <div class="tm-forecast-item">
                        <span class="tm-forecast-value">${forecast.estimatedDate}</span>
                        <span class="tm-forecast-label">ожидаемая дата</span>
                    </div>
                    <div class="tm-forecast-item ${forecast.onTrack ? 'tm-on-track' : 'tm-delayed'}">
                        <span class="tm-forecast-value">${forecast.onTrack ? '✅' : '⚠️'}</span>
                        <span class="tm-forecast-label">${forecast.onTrack ? 'В графике' : `Опоздание ${forecast.delayDays} дн.`}</span>
                    </div>
                </div>
                ${forecast.recommendations?.length ? `
                    <div class="tm-forecast-tips">
                        <h5>💡 Рекомендации:</h5>
                        <ul>${forecast.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                <p class="tm-forecast-summary">${escapeHtml(forecast.summary)}</p>
            </div>

            <div class="tm-planner-summary">
                <p>${escapeHtml(advice.summary)}</p>
            </div>
        `;
    }

    // ========== ЭКСПОРТ ==========
    function exportReport(projectTitle, tasks) {
        const m = calculateMetrics(tasks);
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(projectTitle)} - Отчёт</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:48px;background:#0d1117;color:#c9d1d9;line-height:1.5}.report{max-width:900px;margin:0 auto}h1{color:#58a6ff;font-size:32px;margin-bottom:30px}
.metrics{background:#161b22;padding:28px;border-radius:20px;margin:24px 0;border:1px solid #30363d}.progress-bar{height:12px;background:#21262d;border-radius:20px;margin:16px 0;overflow:hidden}.progress-fill{height:100%;background:linear-gradient(90deg,#2ea043,#3fb950);border-radius:20px}
.stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:20px}.stat-card{background:#0d1117;padding:16px;border-radius:14px;border:1px solid #30363d}.stat-label{color:#8b949e;font-size:12px;text-transform:uppercase;margin-bottom:8px}.stat-value{font-size:24px;font-weight:700}
.task{padding:16px;border-bottom:1px solid #30363d;display:flex;align-items:center;gap:12px}.task.done{opacity:0.5}.task.done .task-name{text-decoration:line-through}
.task-priority{padding:4px 10px;border-radius:30px;font-size:11px;font-weight:700}.priority-high{background:rgba(248,81,73,0.15);color:#f85149}.priority-medium{background:rgba(210,153,34,0.15);color:#d29922}.priority-low{background:rgba(139,148,158,0.15);color:#8b949e}
.task-name{flex:1;font-weight:500}.task-hours{color:#8b949e;min-width:60px;text-align:right}.task-price{color:#2ea043;min-width:100px;text-align:right;font-weight:600}.footer{margin-top:40px;text-align:center;color:#8b949e;font-size:13px;padding-top:20px;border-top:1px solid #30363d}
.subtask{padding:8px 16px 8px 48px;border-bottom:1px solid #21262d;font-size:14px;color:#8b949e}.subtask.done{text-decoration:line-through;opacity:0.5}
</style></head><body><div class="report"><h1>${escapeHtml(projectTitle)}</h1>
<div class="metrics"><div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="color:#8b949e">Прогресс</span><span style="color:#2ea043;font-weight:700">${m.progress.toFixed(0)}%</span></div>
<div class="progress-bar"><div class="progress-fill" style="width:${m.progress}%"></div></div>
<div class="stats-grid"><div class="stat-card"><div class="stat-label">Задачи</div><div class="stat-value">${m.done}/${m.total}</div></div>
<div class="stat-card"><div class="stat-label">Время</div><div class="stat-value">${formatTotalTime(m.totalHours)}</div></div>
<div class="stat-card"><div class="stat-label">Бюджет</div><div class="stat-value" style="color:#2ea043">${formatMoney(m.totalPrice)}</div></div></div></div>
<h2 style="color:#c9d1d9;margin:30px 0 20px;font-size:20px">Задачи</h2>
${tasks.map(t => `<div class="task ${t.done ? 'done' : ''}">
<span class="task-priority priority-${t.priority || 'medium'}">${t.priority === 'high' ? 'Высокий' : t.priority === 'medium' ? 'Средний' : 'Низкий'}</span>
<span class="task-name">${escapeHtml(t.text)}</span>
<span class="task-hours">${t.hours || 0}ч ${t.minutes || 0}м</span>
<span class="task-price">${formatMoney(parseNumber(t.price))}</span>
</div>${t.subtasks?.length ? t.subtasks.map(s => `<div class="subtask ${s.done ? 'done' : ''}">${s.done ? '✅' : '⬜'} ${escapeHtml(s.text)} (${s.hours || 0}ч ${s.minutes || 0}м)</div>`).join('') : ''}`).join('')}
<div class="footer">Сгенерировано DesignFlow Journal PRO v5.2 • ${new Date().toLocaleDateString('ru-RU')}</div></div></body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        window.open(URL.createObjectURL(blob));
    }

    function copyShareLink(projectId, tasks) {
        const m = calculateMetrics(tasks);
        try {
            const shareData = { tasks: tasks.map(t => ({ text: t.text, done: t.done })), progress: m.progress };
            const url = `${window.location.origin}${window.location.pathname}?share=${btoa(unescape(encodeURIComponent(JSON.stringify(shareData))))}`;
            navigator.clipboard?.writeText(url).then(() => showToast('🔗 Ссылка скопирована!', 'success')).catch(() => prompt('Скопируйте:', url));
        } catch (e) {
            showToast('Не удалось создать ссылку', 'error');
        }
    }

    // ========== ГЛАВНОЕ ОКНО ЖУРНАЛА ==========
    function openJournal(projectId, row) {
        const projectContext = getProjectContext(row);
        const projectTitle = getProjectTitle(row);
        let tasks = sortTasksByPriority([...getTasks(projectId)]);
        let aiText = '';
        let aiImageBase64 = '';
        let isLoading = false;
        let filterStatus = 'all';
        let aiExpanded = false;
        let selectedTasks = new Set();
        let templateMenuOpen = false;
        let categoryMenuOpen = false;
        const categories = loadCategories();

        const overlay = document.createElement('div');
        overlay.className = 'tm-modal-overlay';
        const modal = document.createElement('div');
        modal.className = 'tm-modal';

        const setLoading = (val) => { isLoading = val; render(); };

        const expandAI = () => { aiExpanded = true; render(); };

        const handleAIAnalyze = async () => {
            if (!aiText.trim() && !aiImageBase64) {
                showToast('Введите текст или загрузите скриншот', 'error');
                return;
            }
            setLoading(true);
            try {
                let newTasks = aiImageBase64 ? await analyzeImageWithAI(aiImageBase64) : await analyzeTextWithAI(aiText, projectContext);
                if (newTasks.length > 0) {
                    tasks = sortTasksByPriority([...tasks, ...newTasks.map(t => ({ ...t, id: generateId(), done: false, hours: t.hours || '0', minutes: t.minutes || '0', price: t.price || '', priority: t.priority || 'medium', subtasks: [] }))]);
                    setTasks(projectId, tasks);
                    logTaskChange(projectId, '🤖 AI-распознавание', `Добавлено ${newTasks.length} задач`);
                    aiText = ''; aiImageBase64 = '';
                    showToast(`Добавлено ${newTasks.length} задач`, 'success');
                } else {
                    showToast('Не удалось распознать задачи', 'error');
                }
            } catch (e) {
                showToast('Ошибка: ' + e.message, 'error');
            }
            finally { setLoading(false); }
        };

        const handleFileUpload = (e) => {
            const file = e.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (ev) => { aiImageBase64 = ev.target.result; render(); };
            reader.readAsDataURL(file);
        };

        const handlePasteImage = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (ev) => { aiImageBase64 = ev.target.result; aiExpanded = true; render(); };
                    reader.readAsDataURL(file);
                    e.preventDefault();
                    break;
                }
            }
        };

        const handleSplitTask = async (taskIndex) => {
            const task = tasks[taskIndex];
            if (!task) return;

            showToast('AI разбивает задачу на подзадачи...', 'info');
            const subtasks = await splitTaskWithAI(task, projectContext);

            if (subtasks.length > 0) {
                task.subtasks = subtasks.map(s => ({
                    id: generateId(),
                    text: s.text,
                    hours: s.hours || '0',
                    minutes: s.minutes || '0',
                    done: false
                }));
                task.isExpanded = true;
                setTasks(projectId, tasks);
                logTaskChange(projectId, '✂️ AI разбиение', `"${task.text}" → ${subtasks.length} подзадач`);
                showToast(`Создано ${subtasks.length} подзадач`, 'success');
                render();
            } else {
                showToast('Не удалось разбить задачу', 'error');
            }
        };

        const deleteSelectedTasks = () => {
            if (selectedTasks.size === 0) {
                showToast('Выберите задачи для удаления', 'error');
                return;
            }
            const indices = Array.from(selectedTasks).sort((a, b) => b - a);
            const count = indices.length;
            indices.forEach(idx => tasks.splice(idx, 1));
            selectedTasks.clear();
            tasks = sortTasksByPriority(tasks);
            setTasks(projectId, tasks);
            logTaskChange(projectId, '🗑️ Массовое удаление', `Удалено ${count} задач`);
            showToast(`Удалено ${count} задач`, 'success');
            render();
        };

        const toggleSelectAll = (checked) => {
            if (checked) {
                tasks.forEach((_, idx) => selectedTasks.add(idx));
            } else {
                selectedTasks.clear();
            }
            render();
        };

        const saveTemplate = () => {
            const name = prompt('Название шаблона:');
            if (name?.trim()) {
                const custom = JSON.parse(GM_getValue(TEMPLATES_KEY, '{}'));
                custom[name.trim()] = { name: name.trim(), tasks: tasks.filter(t => t.text) };
                GM_setValue(TEMPLATES_KEY, JSON.stringify(custom));
                showToast(`Шаблон "${name.trim()}" сохранён`, 'success');
                render();
            }
        };

        const loadTemplate = (templateKey) => {
            const tpl = JSON.parse(GM_getValue(TEMPLATES_KEY, '{}'))[templateKey];
            if (tpl) {
                tasks = sortTasksByPriority([...tasks, ...tpl.tasks.map(t => ({ ...t, id: generateId(), done: false, subtasks: t.subtasks || [] }))]);
                setTasks(projectId, tasks);
                logTaskChange(projectId, '📋 Загрузка шаблона', `Шаблон "${tpl.name}" загружен`);
                showToast(`Шаблон "${tpl.name}" загружен`, 'success');
                render();
            }
        };

        const handleCategoryAction = async (action) => {
            if (action === 'ai') {
                showToast('AI создаёт категории...', 'info');
                const prompt = `Создай 3-5 логичных категорий для организации задач в проекте "${projectTitle}". Верни ТОЛЬКО JSON: {"categories": ["Название1", "Название2", "Название3"]}`;
                try {
                    const response = await callOpenRouter(prompt);
                    const jsonMatch = response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const newCats = JSON.parse(jsonMatch[0]).categories || [];
                        const currentCats = loadCategories();
                        const allCats = [...new Set([...currentCats, ...newCats])];
                        saveCategories(allCats);
                        showToast(`Добавлено категорий: ${newCats.length}`, 'success');
                        render();
                    }
                } catch (e) {
                    showToast('Ошибка AI: ' + e.message, 'error');
                }
            } else if (action === 'manual') {
                const name = prompt('Название новой категории:');
                if (name?.trim()) {
                    const currentCats = loadCategories();
                    const allCats = [...new Set([...currentCats, name.trim()])];
                    saveCategories(allCats);
                    showToast(`Категория "${name.trim()}" создана`, 'success');
                    render();
                }
            }
            categoryMenuOpen = false;
        };

        const render = () => {
            const m = calculateMetrics(tasks);
            let filteredTasks = tasks;
            if (filterStatus === 'active') filteredTasks = tasks.filter(t => !t.done);
            if (filterStatus === 'done') filteredTasks = tasks.filter(t => t.done);

            const customTemplates = JSON.parse(GM_getValue(TEMPLATES_KEY, '{}'));
            const hasTemplates = Object.keys(customTemplates).length > 0;
            const currentCategories = loadCategories();

            const timerActive = currentTimerState && currentTimerState.projectId === projectId;
            const timerTaskIndex = timerActive ? currentTimerState.taskIndex : -1;

            modal.innerHTML = `
                <div class="tm-modal-header">
                    <div class="tm-header-left">
                        ${ICONS.journal}
                        <h3>Журнал задач</h3>
                        <span class="tm-version-badge">v5.2</span>
                    </div>
                    <button class="tm-close-btn">${ICONS.x}</button>
                </div>
                <div class="tm-project-subtitle">${escapeHtml(projectTitle)}</div>
                <div class="tm-modal-body">

                    ${timerActive ? `
                        <div class="tm-timer-section ${currentTimerState.pomodoroPhase === 'break' ? 'tm-timer-break' : ''}">
                            <div class="tm-timer-info">
                                <span class="tm-timer-task">${ICONS.clock} ${escapeHtml(currentTimerState.taskText)}</span>
                                <span class="tm-timer-phase">${currentTimerState.pomodoroPhase === 'break' ? '☕ Перерыв' : '🍅 Pomodoro #' + (currentTimerState.pomodoroCount + 1)}</span>
                            </div>
                            <div class="tm-timer-display">${formatTimerTime(currentTimerState.elapsed)}</div>
                            <div class="tm-timer-controls">
                                <button class="tm-timer-btn" id="tm-pause-timer">${currentTimerState.isPaused ? ICONS.play : ICONS.pause}</button>
                                <button class="tm-timer-btn tm-timer-stop" id="tm-stop-timer">${ICONS.stop}</button>
                            </div>
                        </div>
                    ` : ''}

                    <div class="tm-toolbar">
                        <button class="tm-pro-btn tm-ai-planner-btn" id="tm-ai-planner">${ICONS.brain} С чего начать</button>
                        <div class="tm-dropdown">
                            <button class="tm-pro-btn" id="tm-template-btn">${ICONS.template} Шаблоны ${ICONS.chevronDown}</button>
                            <div class="tm-dropdown-menu ${templateMenuOpen ? 'show' : ''}" id="tm-template-menu">
                                <div class="tm-dropdown-item" id="tm-save-template">${ICONS.save} Сохранить как шаблон</div>
                                ${hasTemplates ? Object.entries(customTemplates).map(([k, v]) => `<div class="tm-dropdown-item" data-template="${k}">${ICONS.file} ${escapeHtml(v.name)}</div>`).join('') : '<div class="tm-dropdown-item disabled">Нет сохранённых шаблонов</div>'}
                            </div>
                        </div>
                        <div class="tm-dropdown">
                            <button class="tm-pro-btn" id="tm-category-btn">${ICONS.category} Категории ${ICONS.chevronDown}</button>
                            <div class="tm-dropdown-menu ${categoryMenuOpen ? 'show' : ''}" id="tm-category-menu">
                                <div class="tm-dropdown-item" data-action="ai">${ICONS.sparkles} Создать с AI</div>
                                <div class="tm-dropdown-item" data-action="manual">${ICONS.plus} Создать вручную</div>
                                ${currentCategories.length ? '<div class="tm-dropdown-divider"></div>' : ''}
                                ${currentCategories.map(c => `<div class="tm-dropdown-item category-item">${ICONS.folder} ${escapeHtml(c)}</div>`).join('')}
                            </div>
                        </div>
                        <button class="tm-pro-btn" id="tm-history-btn">${ICONS.history} История</button>
                        <button class="tm-pro-btn" id="tm-worklog-btn">${ICONS.list} Лог работы</button>
                        <button class="tm-pro-btn" id="tm-export-btn">${ICONS.file} Отчёт</button>
                        <button class="tm-pro-btn" id="tm-share-btn">${ICONS.share}</button>
                        ${selectedTasks.size > 0 ? `<button class="tm-pro-btn tm-delete-selected-btn" id="tm-delete-selected">${ICONS.trash} Удалить ${selectedTasks.size}</button>` : ''}
                        <div class="tm-toolbar-spacer"></div>
                        <select class="tm-toolbar-select" id="tm-filter-select">
                            <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>Все ${m.total}</option>
                            <option value="active" ${filterStatus === 'active' ? 'selected' : ''}>Активные ${m.total - m.done}</option>
                            <option value="done" ${filterStatus === 'done' ? 'selected' : ''}>Выполненные ${m.done}</option>
                        </select>
                    </div>

                    <div class="tm-ai-section">
                        <div class="tm-ai-header" id="tm-ai-header">
                            <div class="tm-ai-header-left">${ICONS.sparkles} AI-помощник <span class="tm-ai-badge">PRO</span></div>
                            <span class="tm-ai-arrow" style="transform:rotate(${aiExpanded ? '180deg' : '0'})">${ICONS.chevronDown}</span>
                        </div>
                        <div class="tm-ai-input-area" style="display:${aiExpanded ? 'block' : 'none'}">
                            <div class="tm-ai-tip">${ICONS.info}<div class="tm-ai-tip-content"><strong>Вставьте ТЗ или переписку Ctrl+V для скриншота</strong> — AI извлечёт задачи, время и стоимость.</div></div>
                            <textarea class="tm-ai-textarea" id="tm-ai-text" placeholder="Вставьте текст... Enter для отправки">${escapeHtml(aiText)}</textarea>
                            ${aiImageBase64 ? `<img class="tm-preview-image" src="${aiImageBase64}">` : ''}
                            <div class="tm-ai-toolbar">
                                <button class="tm-ai-btn" id="tm-upload-btn">${ICONS.upload} Скриншот</button>
                                <input type="file" class="tm-file-input" id="tm-file-input" accept="image/*">
                                <button class="tm-ai-btn primary" id="tm-analyze-btn" ${isLoading ? 'disabled' : ''}>${isLoading ? 'Анализ...' : `${ICONS.sparkles} Распознать`}</button>
                                ${aiImageBase64 ? `<button class="tm-ai-btn" id="tm-clear-image-btn">${ICONS.x} Очистить</button>` : ''}
                            </div>
                            ${isLoading ? `<div class="tm-ai-loading"><div class="tm-spinner"></div><span>AI анализирует...</span></div>` : ''}
                        </div>
                    </div>

                    <div class="tm-progress-section">
                        <div class="tm-progress-row">
                            <div class="tm-progress-percent">${m.progress.toFixed(0)}%</div>
                            <div class="tm-progress-bar-wrapper"><div class="tm-progress-bar"><div class="tm-progress-fill" style="width:${m.progress}%"></div></div></div>
                            <div class="tm-progress-metrics">
                                <div class="tm-metric">${ICONS.check} ${m.done}/${m.total}</div>
                                <div class="tm-metric">${ICONS.clock} ${formatTotalTime(m.totalHours)}</div>
                                <div class="tm-metric tm-metric-money">${ICONS.dollar} ${formatMoney(m.totalPrice)}</div>
                            </div>
                        </div>
                    </div>

                    <div class="tm-tasks-header">
                        <span class="tm-tasks-title">Задачи ${filteredTasks.length}</span>
                        <label class="tm-select-all">
                            <input type="checkbox" id="tm-select-all-checkbox" ${selectedTasks.size === tasks.length && tasks.length > 0 ? 'checked' : ''}> Выбрать все
                        </label>
                    </div>

                    <div class="tm-tasks-list">
                        ${filteredTasks.length ? filteredTasks.map((t) => {
                            const originalIndex = tasks.indexOf(t);
                            const subProgress = calculateSubtaskProgress(t);
                            const hasSubtasks = t.subtasks && t.subtasks.length > 0;
                            const isTimerTask = timerTaskIndex === originalIndex;
                            const isSelected = selectedTasks.has(originalIndex);

                            return `
                                <div class="tm-task-row ${t.done ? 'done' : ''} priority-${t.priority || 'medium'} ${isTimerTask ? 'tm-timer-active' : ''} ${isSelected ? 'tm-selected' : ''}" data-index="${originalIndex}">
                                    <div class="tm-select-checkbox">
                                        <input type="checkbox" class="tm-task-select" data-index="${originalIndex}" ${isSelected ? 'checked' : ''}>
                                    </div>
                                    ${hasSubtasks ? `<button class="tm-subtask-toggle ${t.isExpanded ? 'expanded' : ''}" data-index="${originalIndex}">${t.isExpanded ? ICONS.chevronDown : ICONS.chevronRight}</button>` : '<div class="tm-subtask-toggle-placeholder"></div>'}
                                    <div class="tm-checkbox-wrapper"><input type="checkbox" ${t.done ? 'checked' : ''} data-index="${originalIndex}"><div class="tm-checkbox-custom">${ICONS.check}</div></div>
                                    <input type="text" class="tm-task-text" value="${escapeHtml(t.text)}" placeholder="Название задачи" data-index="${originalIndex}">
                                    ${hasSubtasks ? `<div class="tm-subtask-progress-mini"><span>${subProgress.done}/${subProgress.total}</span><div class="tm-subtask-bar"><div style="width:${subProgress.percent}%"></div></div></div>` : `
                                        <div class="tm-time-wrapper">
                                            <input type="number" class="tm-time-input tm-task-hours" value="${t.hours || 0}" min="0" data-index="${originalIndex}" title="Часы"><span class="tm-time-sep">ч</span>
                                            <input type="number" class="tm-time-input tm-task-minutes" value="${t.minutes || 0}" min="0" max="59" data-index="${originalIndex}" title="Минуты"><span class="tm-time-sep">м</span>
                                        </div>
                                    `}
                                    <input type="text" class="tm-task-price" value="${t.price || ''}" placeholder="₽" data-index="${originalIndex}">
                                    <select class="tm-task-priority" data-index="${originalIndex}">
                                        <option value="high" ${t.priority === 'high' ? 'selected' : ''}>Высокий</option>
                                        <option value="medium" ${t.priority === 'medium' ? 'selected' : ''}>Средний</option>
                                        <option value="low" ${t.priority === 'low' ? 'selected' : ''}>Низкий</option>
                                    </select>
                                    <div class="tm-task-actions">
                                        ${!isTimerTask ? `<button class="tm-task-action-btn tm-start-timer-btn" data-index="${originalIndex}" title="Запустить таймер">${ICONS.play}</button>` : `<span class="tm-pomodoro-icon" data-task-index="${originalIndex}" style="display:inline-flex">${ICONS.coffee}</span>`}
                                        <button class="tm-task-action-btn tm-split-btn" data-index="${originalIndex}" title="Разбить на подзадачи">${ICONS.split}</button>
                                        <button class="tm-task-action-btn tm-delete-btn" data-index="${originalIndex}" title="Удалить">${ICONS.trash}</button>
                                    </div>
                                </div>
                                ${hasSubtasks && t.isExpanded ? `
                                    <div class="tm-subtasks-container">
                                        ${t.subtasks.map((sub, subIdx) => `
                                            <div class="tm-subtask-row ${sub.done ? 'done' : ''}" data-task-index="${originalIndex}" data-sub-index="${subIdx}">
                                                <div class="tm-subtask-indent">${subIdx === t.subtasks.length - 1 ? '└─' : '├─'}</div>
                                                <div class="tm-checkbox-wrapper tm-checkbox-small"><input type="checkbox" class="tm-subtask-checkbox" ${sub.done ? 'checked' : ''} data-task-index="${originalIndex}" data-sub-index="${subIdx}"><div class="tm-checkbox-custom">${ICONS.check}</div></div>
                                                <input type="text" class="tm-subtask-text" value="${escapeHtml(sub.text)}" data-task-index="${originalIndex}" data-sub-index="${subIdx}">
                                                <div class="tm-time-wrapper tm-time-small">
                                                    <input type="number" class="tm-time-input tm-subtask-hours" value="${sub.hours || 0}" min="0" data-task-index="${originalIndex}" data-sub-index="${subIdx}"><span class="tm-time-sep">ч</span>
                                                    <input type="number" class="tm-time-input tm-subtask-minutes" value="${sub.minutes || 0}" min="0" max="59" data-task-index="${originalIndex}" data-sub-index="${subIdx}"><span class="tm-time-sep">м</span>
                                                </div>
                                                <button class="tm-subtask-delete" data-task-index="${originalIndex}" data-sub-index="${subIdx}">${ICONS.x}</button>
                                            </div>
                                        `).join('')}
                                        <button class="tm-add-subtask" data-index="${originalIndex}">${ICONS.plus} Добавить подзадачу</button>
                                    </div>
                                ` : ''}
                            `;
                        }).join('') : `<div class="tm-empty">${ICONS.circle}<br>Нет задач. Добавьте вручную или через AI.</div>`}
                    </div>

                    <div class="tm-add-buttons">
                        <button class="tm-add-task" id="tm-add-task-btn">${ICONS.plus} Добавить задачу</button>
                        <button class="tm-add-ai-btn" id="tm-add-ai-btn">${ICONS.sparkles} Через AI</button>
                    </div>
                </div>

                <div class="tm-modal-footer">
                    <span class="tm-footer-total">${ICONS.dollar} <span class="tm-footer-value">${formatMoney(m.totalPrice)}</span></span>
                    <div class="tm-footer-stats"><span>${ICONS.clock} ${formatTotalTime(m.totalHours)}</span><span>${ICONS.check} ${m.done}/${m.total}</span></div>
                </div>
            `;

            // ===== СОБЫТИЯ =====
            modal.querySelector('.tm-close-btn').onclick = () => overlay.remove();
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

            modal.querySelector('#tm-pause-timer')?.addEventListener('click', () => { pauseTimer(); render(); });
            modal.querySelector('#tm-stop-timer')?.addEventListener('click', () => { stopTimer(); render(); });

            modal.querySelector('#tm-ai-planner')?.addEventListener('click', () => {
                showAIPlanner(projectId, projectTitle, tasks, { ...projectContext, projectId });
            });

            // Шаблоны dropdown
            const templateBtn = modal.querySelector('#tm-template-btn');
            templateBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                templateMenuOpen = !templateMenuOpen;
                categoryMenuOpen = false;
                render();
            });

            modal.querySelector('#tm-save-template')?.addEventListener('click', () => {
                saveTemplate();
                templateMenuOpen = false;
            });

            modal.querySelectorAll('[data-template]').forEach(el => {
                el.addEventListener('click', () => {
                    loadTemplate(el.dataset.template);
                    templateMenuOpen = false;
                });
            });

            // Категории dropdown
            const categoryBtn = modal.querySelector('#tm-category-btn');
            categoryBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                categoryMenuOpen = !categoryMenuOpen;
                templateMenuOpen = false;
                render();
            });

            modal.querySelectorAll('[data-action]').forEach(el => {
                el.addEventListener('click', () => {
                    handleCategoryAction(el.dataset.action);
                });
            });

            // AI секция
            modal.querySelector('#tm-ai-header')?.addEventListener('click', () => {
                aiExpanded = !aiExpanded;
                render();
            });

            modal.querySelector('#tm-add-ai-btn')?.addEventListener('click', expandAI);

            const textarea = modal.querySelector('#tm-ai-text');
            if (textarea) {
                textarea.oninput = (e) => { aiText = e.target.value; };
                textarea.onkeydown = (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAIAnalyze();
                    }
                };
                textarea.onpaste = handlePasteImage;
            }

            modal.querySelector('#tm-upload-btn')?.addEventListener('click', () => modal.querySelector('#tm-file-input')?.click());
            modal.querySelector('#tm-file-input')?.addEventListener('change', handleFileUpload);
            modal.querySelector('#tm-clear-image-btn')?.addEventListener('click', () => { aiImageBase64 = ''; render(); });
            modal.querySelector('#tm-analyze-btn')?.addEventListener('click', handleAIAnalyze);

            modal.querySelector('#tm-history-btn')?.addEventListener('click', () => { showHistory(projectId, projectTitle); });
            modal.querySelector('#tm-worklog-btn')?.addEventListener('click', () => { showWorklog(projectId, projectTitle); });
            modal.querySelector('#tm-export-btn')?.addEventListener('click', () => exportReport(projectTitle, tasks));
            modal.querySelector('#tm-share-btn')?.addEventListener('click', () => copyShareLink(projectId, tasks));

            modal.querySelector('#tm-delete-selected')?.addEventListener('click', deleteSelectedTasks);

            modal.querySelector('#tm-select-all-checkbox')?.addEventListener('change', (e) => {
                toggleSelectAll(e.target.checked);
            });

            modal.querySelectorAll('.tm-task-select').forEach(cb => {
                cb.onchange = (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    if (e.target.checked) {
                        selectedTasks.add(idx);
                    } else {
                        selectedTasks.delete(idx);
                    }
                    render();
                };
            });

            modal.querySelector('#tm-filter-select')?.addEventListener('change', (e) => {
                filterStatus = e.target.value;
                render();
            });

            modal.querySelector('#tm-add-task-btn')?.addEventListener('click', () => {
                tasks.push({ id: generateId(), text: '', done: false, hours: '0', minutes: '0', price: '', priority: 'medium', subtasks: [] });
                tasks = sortTasksByPriority(tasks);
                setTasks(projectId, tasks);
                logTaskChange(projectId, '➕ Добавление', 'Новая задача');
                render();
            });

            modal.querySelectorAll('.tm-task-row > .tm-checkbox-wrapper input').forEach(cb => {
                cb.onchange = (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    tasks[idx].done = e.target.checked;
                    if (tasks[idx].subtasks) {
                        tasks[idx].subtasks.forEach(s => s.done = e.target.checked);
                    }
                    tasks = sortTasksByPriority(tasks);
                    setTasks(projectId, tasks);
                    logTaskChange(projectId, e.target.checked ? '✅ Выполнено' : '🔄 Возобновлено', tasks[idx].text || 'Задача');
                    render();
                };
            });

            modal.querySelectorAll('.tm-task-text').forEach(input => {
                input.onchange = (e) => {
                    tasks[parseInt(e.target.dataset.index)].text = e.target.value;
                    setTasks(projectId, tasks);
                };
            });

            modal.querySelectorAll('.tm-task-hours').forEach(input => {
                input.onchange = (e) => {
                    tasks[parseInt(e.target.dataset.index)].hours = e.target.value;
                    setTasks(projectId, tasks);
                    render();
                };
            });

            modal.querySelectorAll('.tm-task-minutes').forEach(input => {
                input.onchange = (e) => {
                    tasks[parseInt(e.target.dataset.index)].minutes = e.target.value;
                    setTasks(projectId, tasks);
                    render();
                };
            });

            modal.querySelectorAll('.tm-task-price').forEach(input => {
                input.onchange = (e) => {
                    tasks[parseInt(e.target.dataset.index)].price = e.target.value;
                    setTasks(projectId, tasks);
                    render();
                };
            });

            modal.querySelectorAll('.tm-task-priority').forEach(select => {
                select.onchange = (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    tasks[idx].priority = e.target.value;
                    tasks = sortTasksByPriority(tasks);
                    setTasks(projectId, tasks);
                    render();
                };
            });

            modal.querySelectorAll('.tm-delete-btn').forEach(btn => {
                btn.onclick = () => {
                    const idx = parseInt(btn.dataset.index);
                    const text = tasks[idx].text;
                    tasks.splice(idx, 1);
                    selectedTasks.delete(idx);
                    setTasks(projectId, tasks);
                    logTaskChange(projectId, '🗑️ Удаление', text || 'Задача');
                    render();
                };
            });

            modal.querySelectorAll('.tm-start-timer-btn').forEach(btn => {
                btn.onclick = () => {
                    const idx = parseInt(btn.dataset.index);
                    startTimer(projectId, idx, tasks[idx].text || 'Задача');
                    render();
                };
            });

            modal.querySelectorAll('.tm-split-btn').forEach(btn => {
                btn.onclick = () => handleSplitTask(parseInt(btn.dataset.index));
            });

            modal.querySelectorAll('.tm-subtask-toggle').forEach(btn => {
                btn.onclick = () => {
                    const idx = parseInt(btn.dataset.index);
                    tasks[idx].isExpanded = !tasks[idx].isExpanded;
                    setTasks(projectId, tasks);
                    render();
                };
            });

            modal.querySelectorAll('.tm-add-subtask').forEach(btn => {
                btn.onclick = () => {
                    const idx = parseInt(btn.dataset.index);
                    if (!tasks[idx].subtasks) tasks[idx].subtasks = [];
                    tasks[idx].subtasks.push({ id: generateId(), text: '', hours: '0', minutes: '0', done: false });
                    tasks[idx].isExpanded = true;
                    setTasks(projectId, tasks);
                    render();
                };
            });

            modal.querySelectorAll('.tm-subtask-checkbox').forEach(cb => {
                cb.onchange = (e) => {
                    const taskIdx = parseInt(e.target.dataset.taskIndex);
                    const subIdx = parseInt(e.target.dataset.subIndex);
                    tasks[taskIdx].subtasks[subIdx].done = e.target.checked;
                    if (tasks[taskIdx].subtasks.every(s => s.done)) {
                        tasks[taskIdx].done = true;
                        logTaskChange(projectId, '✅ Авто-завершение', tasks[taskIdx].text);
                    } else {
                        tasks[taskIdx].done = false;
                    }
                    setTasks(projectId, tasks);
                    render();
                };
            });

            modal.querySelectorAll('.tm-subtask-text').forEach(input => {
                input.onchange = (e) => {
                    const taskIdx = parseInt(e.target.dataset.taskIndex);
                    const subIdx = parseInt(e.target.dataset.subIndex);
                    tasks[taskIdx].subtasks[subIdx].text = e.target.value;
                    setTasks(projectId, tasks);
                };
            });

            modal.querySelectorAll('.tm-subtask-hours').forEach(input => {
                input.onchange = (e) => {
                    const taskIdx = parseInt(e.target.dataset.taskIndex);
                    const subIdx = parseInt(e.target.dataset.subIndex);
                    tasks[taskIdx].subtasks[subIdx].hours = e.target.value;
                    setTasks(projectId, tasks);
                    render();
                };
            });

            modal.querySelectorAll('.tm-subtask-minutes').forEach(input => {
                input.onchange = (e) => {
                    const taskIdx = parseInt(e.target.dataset.taskIndex);
                    const subIdx = parseInt(e.target.dataset.subIndex);
                    tasks[taskIdx].subtasks[subIdx].minutes = e.target.value;
                    setTasks(projectId, tasks);
                    render();
                };
            });

            modal.querySelectorAll('.tm-subtask-delete').forEach(btn => {
                btn.onclick = () => {
                    const taskIdx = parseInt(btn.dataset.taskIndex);
                    const subIdx = parseInt(btn.dataset.subIndex);
                    tasks[taskIdx].subtasks.splice(subIdx, 1);
                    setTasks(projectId, tasks);
                    render();
                };
            });

            document.addEventListener('click', function closeDropdowns(e) {
                if (!e.target.closest('.tm-dropdown')) {
                    templateMenuOpen = false;
                    categoryMenuOpen = false;
                }
            });
        };

        render();
        if (currentTimerState) runTimer();

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    // ========== СТИЛИ ==========
    GM_addStyle(`
        :root { --bg: #0d1117; --card: #161b22; --card-alt: #0f141b; --border: #30363d; --text: #c9d1d9; --muted: #8b949e; --accent: #58a6ff; --accent2: #a371f7; --success: #2ea043; --warning: #d29922; --danger: #f85149; }

        .tm-journal-btn { display: inline-flex !important; align-items: center; justify-content: center; gap: 6px; min-width: 55px; height: 32px; background: linear-gradient(135deg, rgba(88,166,255,0.12), rgba(163,113,247,0.08)); border: 1px solid var(--border); border-radius: 10px; cursor: pointer !important; color: var(--accent); font-size: 13px; font-weight: 600; transition: all 0.2s; margin: 4px 0 0; padding: 0 10px; }
        .tm-journal-btn:hover { background: linear-gradient(135deg, var(--accent), var(--accent2)); border-color: transparent; color: white; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(88,166,255,0.3); }

        .tm-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); z-index: 1000000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: tm-fade 0.2s ease; }
        .tm-sub-overlay { z-index: 1000001; }
        @keyframes tm-fade { from { opacity: 0; } to { opacity: 1; } }

        .tm-modal { background: var(--card); border: 1px solid var(--border); border-radius: 20px; width: 1100px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column; color: var(--text); box-shadow: 0 30px 80px rgba(0,0,0,0.6); animation: tm-slide 0.25s ease; }
        .tm-modal-small { width: 560px; }
        .tm-modal-medium { width: 700px; }
        @keyframes tm-slide { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .tm-modal-header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--card-alt); border-radius: 20px 20px 0 0; }
        .tm-header-left { display: flex; align-items: center; gap: 10px; color: var(--accent); }
        .tm-header-left h3 { margin: 0; font-size: 17px; font-weight: 700; color: var(--text); }
        .tm-version-badge { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: white; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 800; }
        .tm-project-subtitle { padding: 10px 24px; background: var(--card-alt); border-bottom: 1px solid var(--border); color: var(--muted); font-size: 13px; }
        .tm-today-total { float: right; color: var(--accent); font-weight: 600; }

        .tm-close-btn { background: var(--card-alt); border: 1px solid var(--border); color: var(--muted); width: 34px; height: 34px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .tm-close-btn:hover { background: rgba(248,81,73,0.15); border-color: var(--danger); color: var(--danger); }

        .tm-modal-body { padding: 20px 24px; overflow-y: auto; flex-grow: 1; }
        .tm-scrollable { max-height: 400px; padding: 0; }

        .tm-timer-section { background: linear-gradient(135deg, rgba(46,160,67,0.15), rgba(46,160,67,0.05)); border: 1px solid rgba(46,160,67,0.3); border-radius: 16px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 20px; }
        .tm-timer-section.tm-timer-break { background: linear-gradient(135deg, rgba(210,153,34,0.15), rgba(210,153,34,0.05)); border-color: rgba(210,153,34,0.3); }
        .tm-timer-info { flex: 1; }
        .tm-timer-task { font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .tm-timer-phase { color: var(--muted); font-size: 13px; }
        .tm-timer-display { font-size: 36px; font-weight: 800; font-family: 'SF Mono', Monaco, monospace; background: linear-gradient(135deg, var(--success), #3fb950); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .tm-timer-controls { display: flex; gap: 8px; }
        .tm-timer-btn { width: 40px; height: 40px; border-radius: 12px; border: 1px solid var(--border); background: var(--card-alt); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .tm-timer-btn:hover { border-color: var(--accent); color: var(--accent); }
        .tm-timer-stop:hover { border-color: var(--danger); color: var(--danger); }

        .tm-toolbar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
        .tm-toolbar-spacer { flex: 1; }
        .tm-pro-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: var(--card-alt); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .tm-pro-btn:hover { border-color: var(--accent); color: var(--accent); }
        .tm-ai-planner-btn { background: linear-gradient(135deg, rgba(88,166,255,0.15), rgba(163,113,247,0.1)); border-color: rgba(88,166,255,0.3); }
        .tm-ai-planner-btn:hover { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: white; border-color: transparent; }
        .tm-delete-selected-btn { background: rgba(248,81,73,0.1); border-color: rgba(248,81,73,0.3); color: var(--danger); }
        .tm-delete-selected-btn:hover { background: var(--danger); color: white; border-color: transparent; }
        .tm-toolbar-select { padding: 8px 12px; border-radius: 10px; background: var(--card-alt); border: 1px solid var(--border); color: var(--text); font-size: 12px; font-weight: 600; cursor: pointer; }

        .tm-dropdown { position: relative; }
        .tm-dropdown-menu { position: absolute; top: 100%; left: 0; margin-top: 4px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; min-width: 200px; z-index: 1000; display: none; box-shadow: 0 8px 20px rgba(0,0,0,0.5); }
        .tm-dropdown-menu.show { display: block; }
        .tm-dropdown-item { padding: 10px 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; transition: all 0.15s; }
        .tm-dropdown-item:hover { background: var(--card-alt); color: var(--accent); }
        .tm-dropdown-item.disabled { opacity: 0.5; cursor: default; }
        .tm-dropdown-divider { height: 1px; background: var(--border); margin: 6px 0; }

        .tm-ai-section { background: linear-gradient(135deg, rgba(88,166,255,0.08), rgba(163,113,247,0.05)); border: 1px solid rgba(88,166,255,0.2); border-radius: 16px; padding: 14px 18px; margin-bottom: 20px; }
        .tm-ai-header { display: flex; align-items: center; cursor: pointer; user-select: none; }
        .tm-ai-header-left { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; }
        .tm-ai-badge { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: white; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 800; margin-left: 8px; }
        .tm-ai-arrow { margin-left: auto; color: var(--muted); transition: transform 0.2s; }
        .tm-ai-input-area { margin-top: 14px; }
        .tm-ai-tip { display: flex; gap: 10px; padding: 10px 12px; background: rgba(88,166,255,0.05); border: 1px dashed rgba(88,166,255,0.2); border-radius: 10px; margin-bottom: 12px; font-size: 12px; color: var(--muted); }
        .tm-ai-tip-content strong { color: var(--text); }
        .tm-ai-textarea { width: 100%; min-height: 100px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 14px; color: var(--text); font-size: 13px; resize: vertical; font-family: inherit; }
        .tm-ai-textarea:focus { outline: none; border-color: var(--accent); }
        .tm-preview-image { max-width: 100%; max-height: 150px; border-radius: 10px; margin-top: 12px; border: 1px solid var(--border); }
        .tm-ai-toolbar { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .tm-ai-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: var(--card-alt); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .tm-ai-btn:hover { border-color: var(--accent); color: var(--accent); }
        .tm-ai-btn.primary { background: linear-gradient(135deg, var(--accent), var(--accent2)); border-color: transparent; color: white; }
        .tm-ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .tm-file-input { display: none; }
        .tm-ai-loading { display: flex; align-items: center; gap: 10px; color: var(--muted); padding: 12px; margin-top: 12px; background: rgba(88,166,255,0.05); border-radius: 10px; }

        .tm-progress-section { background: var(--card-alt); border: 1px solid var(--border); border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; }
        .tm-progress-row { display: flex; align-items: center; gap: 16px; }
        .tm-progress-percent { font-size: 20px; font-weight: 800; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; min-width: 50px; }
        .tm-progress-bar-wrapper { flex: 1; }
        .tm-progress-bar { height: 8px; background: var(--bg); border-radius: 10px; overflow: hidden; }
        .tm-progress-fill { height: 100%; background: linear-gradient(90deg, var(--success), #3fb950); border-radius: 10px; transition: width 0.3s; }
        .tm-progress-metrics { display: flex; gap: 14px; }
        .tm-metric { display: flex; align-items: center; gap: 5px; color: var(--muted); font-size: 12px; font-weight: 600; }
        .tm-metric-money { color: var(--success); }

        .tm-tasks-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .tm-tasks-title { font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; font-size: 11px; }
        .tm-select-all { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; cursor: pointer; }
        .tm-select-all input { cursor: pointer; accent-color: var(--accent); }

        .tm-tasks-list { margin-bottom: 16px; }

        .tm-task-row { display: grid; grid-template-columns: 24px 28px 28px 1fr 110px 80px 95px auto; align-items: center; gap: 8px; margin-bottom: 6px; background: var(--card-alt); padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); transition: all 0.2s; }
        .tm-task-row:hover { border-color: var(--accent); }
        .tm-task-row.done { opacity: 0.5; }
        .tm-task-row.done .tm-task-text { text-decoration: line-through; color: var(--muted); }
        .tm-task-row.priority-high { border-left: 3px solid var(--danger); }
        .tm-task-row.priority-medium { border-left: 3px solid var(--warning); }
        .tm-task-row.priority-low { border-left: 3px solid var(--muted); }
        .tm-task-row.tm-timer-active { background: rgba(46,160,67,0.08); border-color: var(--success); }
        .tm-task-row.tm-selected { background: rgba(88,166,255,0.1); border-color: var(--accent); }

        .tm-select-checkbox { display: flex; align-items: center; justify-content: center; }
        .tm-select-checkbox input { cursor: pointer; accent-color: var(--accent); width: 16px; height: 16px; }

        .tm-subtask-toggle { background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .tm-subtask-toggle:hover { color: var(--accent); background: rgba(88,166,255,0.1); }
        .tm-subtask-toggle.expanded { color: var(--accent); }
        .tm-subtask-toggle-placeholder { width: 28px; }

        .tm-checkbox-wrapper { position: relative; width: 22px; height: 22px; }
        .tm-checkbox-wrapper input { position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; z-index: 2; }
        .tm-checkbox-custom { position: absolute; inset: 0; background: var(--bg); border: 2px solid var(--border); border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: transparent; }
        .tm-checkbox-wrapper input:checked + .tm-checkbox-custom { background: linear-gradient(135deg, var(--success), #3fb950); border-color: var(--success); color: white; }
        .tm-checkbox-wrapper:hover .tm-checkbox-custom { border-color: var(--accent); }
        .tm-checkbox-small { width: 18px; height: 18px; }
        .tm-checkbox-small .tm-checkbox-custom { border-radius: 5px; }

        .tm-task-text { background: transparent; border: 1px solid transparent; color: var(--text); outline: none; font-size: 13px; font-weight: 500; padding: 6px 8px; border-radius: 6px; width: 100%; }
        .tm-task-text:focus { border-color: var(--border); background: var(--bg); }

        .tm-subtask-progress-mini { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted); }
        .tm-subtask-bar { width: 50px; height: 4px; background: var(--border); border-radius: 4px; overflow: hidden; }
        .tm-subtask-bar div { height: 100%; background: var(--success); border-radius: 4px; }

        .tm-time-wrapper { display: flex; align-items: center; gap: 2px; }
        .tm-time-input { width: 32px; background: transparent; border: 1px solid transparent; color: var(--text); outline: none; font-size: 12px; padding: 6px 4px; border-radius: 6px; text-align: center; font-weight: 600; }
        .tm-time-input:focus { border-color: var(--border); background: var(--bg); }
        .tm-time-input::-webkit-inner-spin-button, .tm-time-input::-webkit-outer-spin-button { -webkit-appearance: none; }
        .tm-time-sep { color: var(--muted); font-size: 10px; }
        .tm-time-small .tm-time-input { width: 28px; font-size: 11px; padding: 4px 2px; }

        .tm-task-price { background: transparent; border: 1px solid transparent; color: var(--success); outline: none; font-size: 12px; padding: 6px 8px; border-radius: 6px; text-align: right; font-weight: 600; width: 100%; }
        .tm-task-price:focus { border-color: var(--border); background: var(--bg); }

        .tm-task-priority { background: var(--bg); border: 1px solid var(--border); color: var(--text); font-size: 11px; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-weight: 600; }

        .tm-task-actions { display: flex; gap: 4px; }
        .tm-task-action-btn { background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .tm-task-action-btn:hover { background: rgba(88,166,255,0.1); color: var(--accent); }
        .tm-delete-btn:hover { background: rgba(248,81,73,0.1); color: var(--danger); }
        .tm-pomodoro-icon { display: inline-flex; align-items: center; justify-content: center; padding: 4px; color: var(--success); }

        .tm-subtasks-container { margin-left: 80px; padding-left: 12px; border-left: 2px solid var(--border); margin-bottom: 8px; }
        .tm-subtask-row { display: grid; grid-template-columns: 24px 22px 1fr 90px 24px; align-items: center; gap: 6px; padding: 6px 0; }
        .tm-subtask-row.done .tm-subtask-text { text-decoration: line-through; color: var(--muted); }
        .tm-subtask-indent { color: var(--muted); font-size: 12px; font-family: monospace; }
        .tm-subtask-text { background: transparent; border: 1px solid transparent; color: var(--text); outline: none; font-size: 12px; padding: 4px 6px; border-radius: 6px; width: 100%; }
        .tm-subtask-text:focus { border-color: var(--border); background: var(--bg); }
        .tm-subtask-delete { background: none; border: none; color: var(--muted); cursor: pointer; padding: 2px; border-radius: 4px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: all 0.2s; }
        .tm-subtask-row:hover .tm-subtask-delete { opacity: 1; }
        .tm-subtask-delete:hover { color: var(--danger); }
        .tm-add-subtask { background: transparent; border: 1px dashed var(--border); color: var(--muted); padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; margin-top: 6px; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .tm-add-subtask:hover { border-color: var(--accent); color: var(--accent); }

        .tm-add-buttons { display: flex; gap: 10px; }
        .tm-add-task { flex: 1; padding: 12px; background: transparent; border: 2px dashed var(--border); color: var(--muted); border-radius: 12px; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
        .tm-add-task:hover { border-color: var(--accent); color: var(--accent); }
        .tm-add-ai-btn { padding: 12px 20px; background: linear-gradient(135deg, rgba(88,166,255,0.1), rgba(163,113,247,0.08)); border: 2px dashed rgba(88,166,255,0.3); color: var(--accent); border-radius: 12px; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .tm-add-ai-btn:hover { background: linear-gradient(135deg, var(--accent), var(--accent2)); border-color: transparent; color: white; }

        .tm-modal-footer { padding: 14px 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--card-alt); border-radius: 0 0 20px 20px; }
        .tm-footer-total { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--muted); }
        .tm-footer-value { color: var(--accent); font-size: 18px; font-weight: 800; }
        .tm-footer-stats { display: flex; gap: 14px; color: var(--muted); font-size: 13px; }

        .tm-history-item { display: flex; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--border); }
        .tm-history-item:hover { background: var(--card-alt); }
        .tm-history-icon { width: 28px; height: 28px; border-radius: 8px; background: var(--card-alt); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
        .tm-history-content { flex: 1; }
        .tm-history-action { font-weight: 600; margin-bottom: 2px; }
        .tm-history-details { color: var(--muted); font-size: 12px; margin-bottom: 4px; }
        .tm-history-time { font-size: 10px; color: var(--muted); opacity: 0.7; }

        .tm-worklog-day { margin-bottom: 16px; }
        .tm-worklog-date { font-weight: 700; padding: 8px 20px; background: var(--card-alt); border-bottom: 1px solid var(--border); }
        .tm-worklog-entry { display: flex; gap: 12px; padding: 10px 20px; border-bottom: 1px solid var(--border); font-size: 13px; }
        .tm-worklog-time { color: var(--muted); min-width: 100px; }
        .tm-worklog-task { flex: 1; }
        .tm-worklog-duration { color: var(--accent); font-weight: 600; }
        .tm-pomodoro-badge { background: var(--danger); color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; }
        .tm-worklog-day-total { padding: 8px 20px; font-size: 12px; color: var(--success); font-weight: 600; background: rgba(46,160,67,0.05); }

        .tm-planner-section { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .tm-planner-card { background: var(--card-alt); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; }
        .tm-planner-card h4 { margin: 0 0 10px; font-size: 14px; }
        .tm-planner-start { background: linear-gradient(135deg, rgba(46,160,67,0.1), rgba(46,160,67,0.03)); border-color: rgba(46,160,67,0.3); display: flex; gap: 14px; }
        .tm-planner-icon { width: 40px; height: 40px; border-radius: 12px; background: var(--success); color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .tm-planner-content { flex: 1; }
        .tm-planner-task { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
        .tm-planner-reason { color: var(--muted); font-size: 13px; }
        .tm-planner-critical { border-color: rgba(248,81,73,0.3); }
        .tm-planner-risks { border-color: rgba(210,153,34,0.3); }
        .tm-planner-list { list-style: none; padding: 0; margin: 0; }
        .tm-planner-list li { padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
        .tm-planner-list li:last-child { border-bottom: none; }
        .tm-muted { color: var(--muted); }
        .tm-planner-summary { background: linear-gradient(135deg, rgba(88,166,255,0.1), rgba(163,113,247,0.05)); border: 1px solid rgba(88,166,255,0.2); border-radius: 12px; padding: 14px 16px; font-size: 14px; }

        .tm-forecast-section { background: var(--card-alt); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
        .tm-forecast-section h4 { margin: 0 0 14px; font-size: 14px; }
        .tm-forecast-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
        .tm-forecast-item { background: var(--bg); border-radius: 10px; padding: 12px; text-align: center; }
        .tm-forecast-value { display: block; font-size: 22px; font-weight: 800; color: var(--accent); margin-bottom: 4px; }
        .tm-forecast-label { font-size: 11px; color: var(--muted); }
        .tm-on-track .tm-forecast-value { color: var(--success); }
        .tm-delayed .tm-forecast-value { color: var(--danger); }
        .tm-forecast-tips { margin-bottom: 12px; }
        .tm-forecast-tips h5 { margin: 0 0 8px; font-size: 12px; color: var(--muted); }
        .tm-forecast-tips ul { margin: 0; padding-left: 20px; font-size: 13px; }
        .tm-forecast-summary { color: var(--muted); font-size: 13px; font-style: italic; }

        .tm-empty { color: var(--muted); text-align: center; padding: 40px 20px; font-size: 14px; }

        .tm-toast { position: fixed; bottom: 30px; right: 30px; left: auto; transform: none; background: var(--card); border: 1px solid var(--border); color: var(--text); padding: 12px 20px; border-radius: 12px; font-weight: 500; font-size: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); z-index: 10000000; animation: tm-toast-in 0.3s ease; display: flex; align-items: center; gap: 10px; max-width: 350px; }
        .tm-toast-success { border-left: 4px solid var(--success); }
        .tm-toast-error { border-left: 4px solid var(--danger); }
        .tm-toast-info { border-left: 4px solid var(--accent); }
        .tm-toast-hide { opacity: 0; transition: opacity 0.3s; }
        @keyframes tm-toast-in { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }

        .tm-spinner { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: tm-spin 0.8s linear infinite; }
        @keyframes tm-spin { to { transform: rotate(360deg); } }
    `);

    // ========== НАБЛЮДЕНИЕ ==========
    const observer = new MutationObserver(() => {
        document.querySelectorAll('table tbody tr').forEach(row => addJournalButton(row));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(updateAllButtons, 500);
    setInterval(updateAllButtons, 2000);

    if (currentTimerState && !currentTimerState.isPaused) {
        currentTimerState.startTime = Date.now() - (currentTimerState.elapsed * 1000);
        runTimer();
    }

    console.log('✅ DesignFlow Journal PRO v5.2 загружен!');
})();



// ========== ДОБАВЛЕНИЕ КНОПОК ЖУРНАЛА В ТАБЛИЦУ ==========
function addJournalButtonsToRows() {
    const tables = ['t-active', 't-waiting', 't-potential', 't-paused', 't-archive', 't-requests', 't-all', 't-trash'];
    
    tables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            if (row.querySelector('.tm-journal-row-btn')) return;
            
            const cells = row.querySelectorAll('td');
            if (cells.length < 3) return;
            
            let client = '', project = '';
            
            if (tableId === 't-requests') {
                client = cells[1]?.textContent?.trim() || '';
                project = cells[3]?.textContent?.trim() || 'Заявка';
            } else if (tableId === 't-all') {
                client = cells[2]?.textContent?.trim() || '';
                project = cells[3]?.textContent?.trim() || '';
            } else {
                client = cells[1]?.textContent?.trim() || '';
                project = cells[2]?.textContent?.trim() || '';
            }
            
            const actionCell = cells[cells.length - 1];
            
            const btn = document.createElement('button');
            btn.className = 'tm-journal-row-btn';
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span>Журнал</span>
            `;
            btn.title = `${client} — ${project}`;
            
            btn.onclick = (e) => {
                e.stopPropagation();
                const projectId = btoa(encodeURIComponent(client + '|' + project));
                if (typeof window.openJournalModal === 'function') {
                    window.openJournalModal(projectId, { client, project });
                } else {
                    console.log('Журнал:', client, project);
                }
            };
            
            actionCell.appendChild(btn);
        });
    });
}

// Стили для кнопки
const journalBtnStyle = document.createElement('style');
journalBtnStyle.textContent = `
    .tm-journal-row-btn {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        padding: 6px 12px !important;
        background: #0f141b !important;
        border: 1px solid #30363d !important;
        border-radius: 8px !important;
        color: #c9d1d9 !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.2s !important;
        margin-left: 6px !important;
        white-space: nowrap !important;
    }
    .tm-journal-row-btn:hover {
        border-color: #58a6ff !important;
        color: #58a6ff !important;
        background: rgba(88, 166, 255, 0.1) !important;
    }
    .tm-journal-row-btn svg {
        width: 14px;
        height: 14px;
    }
`;
document.head.appendChild(journalBtnStyle);

// Запуск
setTimeout(addJournalButtonsToRows, 500);

// Перехват переключения вкладок
const origSwitchTab = window.switchTab;
if (typeof origSwitchTab === 'function') {
    window.switchTab = function(tabId) {
        origSwitchTab(tabId);
        setTimeout(addJournalButtonsToRows, 200);
    };
}

// Наблюдатель
new MutationObserver(() => addJournalButtonsToRows()).observe(document.body, { childList: true, subtree: true });
setInterval(addJournalButtonsToRows, 2000);

console.log('✅ Кнопки журнала в стиле DesignFlow активированы');

