/**
 * DesignFlow Journal PRO BETA
 * Умный помощник: подзадачи, AI-планировщик, таймер Pomodoro, прогнозы
 */

(function() {
    'use strict';

    // ========== КОНФИГУРАЦИЯ ==========
    const DEFAULT_API_KEY = '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';
    let OPENROUTER_API_KEY = localStorage.getItem('openrouter_api_key') || DEFAULT_API_KEY;
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
        tomato: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="14" r="8"></circle><path d="M12 6V4"></path><path d="M8 6c0-1 1-2 4-2s4 1 4 2"></path></svg>',
        edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
        download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
        grip: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="7" r="1.5"/><circle cx="15" cy="7" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/></svg>'
    };

    // ========== ХРАНЕНИЕ ДАННЫХ ==========
    function loadData(key, defaultValue = '{}') {
        try {
            return JSON.parse(localStorage.getItem(key) || defaultValue);
        } catch {
            return JSON.parse(defaultValue);
        }
    }
    
    function saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function loadTasks() { return loadData(STORAGE_KEY, '{}'); }
    function saveTasks(tasks) { saveData(STORAGE_KEY, tasks); }
    function loadWorklog() { return loadData(WORKLOG_KEY, '{}'); }
    function saveWorklog(worklog) { saveData(WORKLOG_KEY, worklog); }
    function loadTimerState() { return loadData(TIMER_KEY, 'null'); }
    function saveTimerState(state) { saveData(TIMER_KEY, state); }
    function loadCategories() { return loadData(CATEGORIES_KEY, '[]'); }
    function saveCategories(cats) { saveData(CATEGORIES_KEY, cats); }

    let TASKS = loadTasks();
    let CATEGORIES = loadCategories();

    function getTasks(projectId) { return TASKS[projectId] || []; }
    function setTasks(projectId, tasks) { TASKS[projectId] = tasks; saveTasks(TASKS); updateAllButtons(); }

    // ========== ИСТОРИЯ ИЗМЕНЕНИЙ ==========
    function logTaskChange(projectId, action, details, icon = 'edit') {
        const history = loadData(HISTORY_KEY, '{}');
        if (!history[projectId]) history[projectId] = [];
        history[projectId].push({ timestamp: new Date().toISOString(), action, details, icon });
        if (history[projectId].length > 100) history[projectId] = history[projectId].slice(-100);
        saveData(HISTORY_KEY, history);
    }

    // ========== WORKLOG ==========
    function addWorklogEntry(projectId, taskText, duration, type = 'work') {
        const worklog = loadWorklog();
        if (!worklog[projectId]) worklog[projectId] = [];
        worklog[projectId].push({
            id: `wl_${Date.now()}`, taskText, duration, type,
            startTime: new Date(Date.now() - duration * 1000).toISOString(),
            endTime: new Date().toISOString(),
            date: new Date().toLocaleDateString('ru-RU')
        });
        saveWorklog(worklog);
    }
    
    function getWorklogForProject(projectId) { return loadWorklog()[projectId] || []; }
    
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
            projectId, taskIndex, taskText, startTime: Date.now(), elapsed: 0, isPaused: false,
            pomodoroCount: currentTimerState?.pomodoroCount || 0, pomodoroPhase: 'work',
            pomodoroWorkTime: 25 * 60, pomodoroBreakTime: 5 * 60
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
            const phaseTime = currentTimerState.pomodoroPhase === 'work' ? currentTimerState.pomodoroWorkTime : currentTimerState.pomodoroBreakTime;
            if (currentTimerState.elapsed >= phaseTime) {
                if (currentTimerState.pomodoroPhase === 'work') {
                    currentTimerState.pomodoroCount++;
                    showToast(`Pomodoro #${currentTimerState.pomodoroCount} завершён! Перерыв 5 минут`, 'success');
                    addWorklogEntry(currentTimerState.projectId, currentTimerState.taskText, currentTimerState.elapsed, 'pomodoro');
                    currentTimerState.pomodoroPhase = 'break';
                } else {
                    showToast('Перерыв окончен! Продолжаем работу', 'info');
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
        if (!currentTimerState.isPaused) currentTimerState.startTime = Date.now() - currentTimerState.elapsed * 1000;
        saveTimerState(currentTimerState);
    }

    function stopTimer() {
        if (!currentTimerState) return;
        if (currentTimerState.elapsed > 60) addWorklogEntry(currentTimerState.projectId, currentTimerState.taskText, currentTimerState.elapsed, currentTimerState.pomodoroPhase);
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        currentTimerState = null;
        saveTimerState(null);
    }

    function formatTimerTime(seconds) {
        const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        const timerEl = document.querySelector('.j-timer-display');
        if (timerEl && currentTimerState) timerEl.textContent = formatTimerTime(currentTimerState.elapsed);
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
        toast.className = `j-toast j-toast-${type}`;
        const icon = type === 'error' ? ICONS.alert : type === 'success' ? ICONS.check : ICONS.info;
        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.classList.add('j-toast-hide'); setTimeout(() => toast.remove(), 300); }, 3000);
    }

    // ========== МЕТРИКИ ==========
    function calculateMetrics(tasks) {
        const total = tasks.length, done = tasks.filter(t => t.done).length;
        let totalHours = 0, totalPrice = 0;
        tasks.forEach(t => {
            if (t.subtasks?.length) t.subtasks.forEach(sub => { totalHours += parseTime(sub.hours, sub.minutes); });
            else totalHours += parseTime(t.hours, t.minutes);
            totalPrice += parseNumber(t.price);
        });
        const progress = total ? (done / total) * 100 : 0;
        return { progress, totalHours, totalPrice, done, total };
    }

    function calculateSubtaskProgress(task) {
        if (!task.subtasks?.length) return null;
        const done = task.subtasks.filter(s => s.done).length, total = task.subtasks.length;
        return { done, total, percent: (done / total) * 100 };
    }

    function sortTasksByPriority(tasks) {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        return [...tasks].sort((a, b) => {
            if (a.done !== b.done) return a.done ? 1 : -1;
            return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
        });
    }
        // ========== AI ФУНКЦИИ ==========
    async function callOpenRouter(prompt) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: [
                        { role: 'system', content: 'Отвечай только JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 2000
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                showAPIErrorModal(data.error.message || 'Ошибка API');
                throw new Error(data.error.message);
            }
            
            return data.choices[0].message.content;
        } catch (e) {
            if (!e.message.includes('API')) {
                showAPIErrorModal('Ошибка соединения с API');
            }
            throw e;
        }
    }

    async function callOpenRouterVision(prompt, base64Image) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: [
                        { role: 'system', content: 'Отвечай только JSON.' },
                        { role: 'user', content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: base64Image } }
                        ]}
                    ],
                    temperature: 0.3,
                    max_tokens: 2000
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                showAPIErrorModal(data.error.message || 'Ошибка API');
                throw new Error(data.error.message);
            }
            
            return data.choices[0].message.content;
        } catch (e) {
            if (!e.message.includes('API')) {
                showAPIErrorModal('Ошибка соединения с API');
            }
            throw e;
        }
    }

    async function analyzeTextWithAI(text, projectContext = {}) {
        const prompt = `Ты — профессиональный project-менеджер. Извлеки из текста список задач.\n${projectContext.client ? `Клиент: ${projectContext.client}` : ''}\nВерни ТОЛЬКО JSON: {"tasks": [{"text": "Название", "hours": "2", "minutes": "30", "price": "5000", "priority": "high"}]}\nТекст:\n${text}`;
        try {
            const response = await callOpenRouter(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]).tasks || [];
        } catch (e) { console.error('AI Error:', e); }
        return [];
    }

    async function splitTaskWithAI(task) {
        const prompt = `Разбей задачу на подзадачи.\nЗадача: "${task.text}"\nВерни JSON: {"subtasks": [{"text": "...", "hours": "2", "minutes": "0"}]}`;
        try {
            const response = await callOpenRouter(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]).subtasks || [];
        } catch (e) { console.error('AI Error:', e); }
        return [];
    }

    async function getAIPlannerAdvice(tasks, projectContext = {}) {
        const activeTasks = tasks.filter(t => !t.done);
        if (!activeTasks.length) return null;
        const tasksDescription = activeTasks.map((t, i) => `${i + 1}. "${t.text}"`).join('\n');
        const prompt = `Дай рекомендации по задачам:\n${tasksDescription}\nВерни JSON: {"startWith": {"taskIndex": 0, "reason": ""}, "quickWins": [], "critical": [], "summary": ""}`;
        try {
            const response = await callOpenRouter(prompt);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch (e) { console.error('AI Error:', e); }
        return null;
    }

    async function analyzeImageWithAI(base64Image) {
        const prompt = `Извлеки задачи из скриншота. Верни JSON: {"tasks": [{"text": "...", "hours": "2", "minutes": "0", "price": "5000", "priority": "medium"}]}`;
        try {
            const response = await callOpenRouterVision(prompt, base64Image);
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]).tasks || [];
        } catch (e) { console.error('AI Vision Error:', e); }
        return [];
    }

    async function getProjectForecast(tasks, projectContext = {}) {
        const activeTasks = tasks.filter(t => !t.done);
        const doneTasks = tasks.filter(t => t.done);
        const totalRemainingHours = activeTasks.reduce((sum, t) => {
            if (t.subtasks && t.subtasks.length > 0) {
                return sum + t.subtasks.filter(s => !s.done).reduce((s, sub) => s + parseTime(sub.hours, sub.minutes), 0);
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

        const daysNeeded = Math.ceil(totalRemainingHours / avgHoursPerDay);
        const estimatedDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000);
        
        return {
            estimatedDays: daysNeeded,
            estimatedDate: estimatedDate.toLocaleDateString('ru-RU'),
            onTrack: true,
            delayDays: 0,
            recommendations: [],
            summary: `При текущей скорости проект будет готов через ${daysNeeded} дней`
        };
    }

    // ========== API ERROR MODAL ==========
    function showAPIErrorModal(errorMessage) {
        if (document.querySelector('.j-api-error-modal')) return;
        
        const maskedKey = OPENROUTER_API_KEY.substring(0, 8) + '••••••••••••••••••••••••' + OPENROUTER_API_KEY.substring(OPENROUTER_API_KEY.length - 4);
        
        const overlay = document.createElement('div');
        overlay.className = 'j-modal-overlay j-sub-overlay j-api-error-modal';
        const modal = document.createElement('div');
        modal.className = 'j-modal j-modal-api-error';
        
        modal.innerHTML = `
            <div class="j-modal-header">
                <div class="j-header-left">${ICONS.alert}<h3>Ошибка API</h3></div>
                <button class="j-close-btn" title="Закрыть">${ICONS.x}</button>
            </div>
            <div class="j-modal-body">
                <div class="j-api-error-content">
                    <div class="j-api-error-icon">${ICONS.alert}</div>
                    <div class="j-api-error-message">${escapeHtml(errorMessage)}</div>
                </div>
                
                <div class="j-api-error-section">
                    <h4>${ICONS.zap} Сменить API ключ</h4>
                    <div class="j-api-current-key">
                        <span class="j-api-current-label">Текущий ключ:</span>
                        <span class="j-api-current-value">${maskedKey}</span>
                    </div>
                    <div class="j-api-key-input-wrapper">
                        <input type="password" class="j-api-key-input" id="j-api-key-input" placeholder="Вставьте новый ключ sk-or-v1-..." autocomplete="off">
                        <button class="j-api-key-save" id="j-save-api-key">${ICONS.save} Сохранить</button>
                    </div>
                    <div class="j-api-key-status" id="j-api-key-status"></div>
                </div>
                
                <div class="j-api-error-section">
                    <h4>${ICONS.info} Как получить ключ</h4>
                    <div class="j-api-steps">
                        <div class="j-api-step">
                            <span class="j-api-step-num">1</span>
                            <span>Смените IP адрес (перезагрузите роутер или включите VPN)</span>
                        </div>
                        <div class="j-api-step">
                            <span class="j-api-step-num">2</span>
                            <span>Перейдите на <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a></span>
                        </div>
                        <div class="j-api-step">
                            <span class="j-api-step-num">3</span>
                            <span>Зарегистрируйтесь или войдите в аккаунт</span>
                        </div>
                        <div class="j-api-step">
                            <span class="j-api-step-num">4</span>
                            <span>Нажмите "Create Key" и скопируйте ключ</span>
                        </div>
                        <div class="j-api-step">
                            <span class="j-api-step-num">5</span>
                            <span>Вставьте ключ в поле выше и нажмите "Сохранить"</span>
                        </div>
                    </div>
                </div>
                
                <div class="j-api-error-note">
                    <div class="j-api-note-icon">${ICONS.info}</div>
                    <div class="j-api-note-text">
                        <strong>Не получается с компьютера?</strong><br>
                        Зайдите с телефона через мобильный интернет (не Wi-Fi) на openrouter.ai и получите API ключ там. Мобильный IP обычно не заблокирован.
                    </div>
                </div>
                
                <div class="j-api-error-actions">
                    <button class="j-api-btn-primary" id="j-open-router-link">${ICONS.zap} Открыть OpenRouter</button>
                    <button class="j-api-btn-secondary" id="j-close-api-error">Закрыть</button>
                </div>
            </div>
        `;
        
        const currentValueEl = modal.querySelector('.j-api-current-value');
        currentValueEl.oncopy = (e) => e.preventDefault();
        currentValueEl.oncut = (e) => e.preventDefault();
        
        modal.querySelector('.j-close-btn').onclick = () => overlay.remove();
        modal.querySelector('#j-close-api-error').onclick = () => overlay.remove();
        modal.querySelector('#j-open-router-link').onclick = () => {
            window.open('https://openrouter.ai/keys', '_blank');
        };
        
        modal.querySelector('#j-save-api-key').onclick = () => {
            const input = modal.querySelector('#j-api-key-input');
            const status = modal.querySelector('#j-api-key-status');
            const newKey = input.value.trim();
            
            if (!newKey) {
                status.innerHTML = `<span class="j-api-status-error">${ICONS.alert} Введите API ключ</span>`;
                return;
            }
            
            if (!newKey.startsWith('sk-or-')) {
                status.innerHTML = `<span class="j-api-status-error">${ICONS.alert} Ключ должен начинаться с sk-or-</span>`;
                return;
            }
            
            localStorage.setItem('openrouter_api_key', newKey);
            OPENROUTER_API_KEY = newKey;
            
            status.innerHTML = `<span class="j-api-status-success">${ICONS.check} Ключ сохранён! Попробуйте снова.</span>`;
            
            setTimeout(() => overlay.remove(), 1500);
        };
        
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }
        // ========== SAVE REPORT AS IMAGE ==========
    function saveReportAsImage(projectTitle, tasks, metrics) {
        const m = metrics || calculateMetrics(tasks);
        
        let displayTitle = projectTitle;
        if (!displayTitle || displayTitle === 'Проект') {
            const projectNameInput = document.getElementById('add-proj-name');
            if (projectNameInput && projectNameInput.value) {
                displayTitle = projectNameInput.value.trim();
            }
        }
        if (!displayTitle) displayTitle = 'Проект';
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = 2800;
        const padding = 120;
        const cardPadding = 80;
        
        // Подсчёт высоты
        let contentHeight = 0;
        contentHeight += 280;
        contentHeight += 140;
        contentHeight += 220;
        contentHeight += 80;
        
        tasks.forEach(t => {
            contentHeight += 100;
            if (t.subtasks?.length) {
                contentHeight += t.subtasks.length * 60;
            }
            contentHeight += 30;
        });
        
        contentHeight += 120;
        contentHeight += padding * 2;
        contentHeight += cardPadding * 2;
        
        const height = Math.max(1800, contentHeight);
        canvas.width = width;
        canvas.height = height;
        
        // Фон
        const bgGradient = ctx.createLinearGradient(0, 0, width, height);
        bgGradient.addColorStop(0, '#f8fafc');
        bgGradient.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Карточка
        const cardX = padding;
        const cardY = padding;
        const cardWidth = width - padding * 2;
        const cardHeight = height - padding * 2;
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = 60;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20;
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 40);
        ctx.fill();
        
        ctx.shadowColor = 'transparent';
        
        // Hero
        const heroHeight = 220;
        const heroGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + heroHeight);
        heroGradient.addColorStop(0, '#f8fafc');
        heroGradient.addColorStop(1, '#eef2ff');
        ctx.fillStyle = heroGradient;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, heroHeight, [40, 40, 0, 0]);
        ctx.fill();
        
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cardX, cardY + heroHeight);
        ctx.lineTo(cardX + cardWidth, cardY + heroHeight);
        ctx.stroke();
        
        let y = cardY + 80;
        
        // Название
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const maxTitleWidth = cardWidth - cardPadding * 2;
        let titleText = displayTitle;
        if (ctx.measureText(titleText).width > maxTitleWidth) {
            while (ctx.measureText(titleText + '...').width > maxTitleWidth && titleText.length > 0) {
                titleText = titleText.slice(0, -1);
            }
            titleText += '...';
        }
        ctx.fillText(titleText, cardX + cardPadding, y);
        
        y += 70;
        
        // Дата с иконкой
        const dateText = `Отчёт от ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        const iconSize = 32;
        const iconX = cardX + cardPadding;
        const iconY = y - 24;
        
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(iconX + 9, iconY + 16);
        ctx.lineTo(iconX + 14, iconY + 22);
        ctx.lineTo(iconX + 23, iconY + 10);
        ctx.stroke();
        
        ctx.fillStyle = '#64748b';
        ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(dateText, iconX + iconSize + 16, iconY + iconSize/2);
        ctx.textBaseline = 'alphabetic';
        
        y = cardY + heroHeight + 50;
        
        // Прогресс
        const progressBarX = cardX + cardPadding;
        const progressBarWidth = cardWidth - cardPadding * 2;
        
        ctx.fillStyle = '#64748b';
        ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText('Общий прогресс', progressBarX, y);
        
        ctx.textAlign = 'right';
        ctx.fillStyle = '#6366f1';
        ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText(`${m.progress.toFixed(0)}%`, progressBarX + progressBarWidth, y + 5);
        ctx.textAlign = 'left';
        
        y += 40;
        
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(progressBarX, y, progressBarWidth, 28, 14);
        ctx.fill();
        
        if (m.progress > 0) {
            const progressGradient = ctx.createLinearGradient(progressBarX, 0, progressBarX + progressBarWidth * (m.progress / 100), 0);
            progressGradient.addColorStop(0, '#10b981');
            progressGradient.addColorStop(1, '#34d399');
            ctx.fillStyle = progressGradient;
            ctx.beginPath();
            ctx.roundRect(progressBarX, y, Math.max(28, progressBarWidth * (m.progress / 100)), 28, 14);
            ctx.fill();
        }
        
        y += 80;
        
        // Метрики
        const metricWidth = (cardWidth - cardPadding * 2 - 60) / 3;
        const metricHeight = 140;
        const metricData = [
            { label: 'Выполнено задач', value: `${m.done}/${m.total}`, color: '#10b981', bg: '#ecfdf5' },
            { label: 'Затрачено времени', value: formatTotalTime(m.totalHours), color: '#6366f1', bg: '#eef2ff' },
            { label: 'Бюджет проекта', value: formatMoney(m.totalPrice), color: '#f59e0b', bg: '#fffbeb' }
        ];
        
        metricData.forEach((metric, i) => {
            const mx = cardX + cardPadding + i * (metricWidth + 30);
            
            ctx.fillStyle = metric.bg;
            ctx.beginPath();
            ctx.roundRect(mx, y, metricWidth, metricHeight, 24);
            ctx.fill();
            
            ctx.strokeStyle = metric.color + '30';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(mx, y, metricWidth, metricHeight, 24);
            ctx.stroke();
            
            ctx.fillStyle = metric.color;
            ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText(metric.value, mx + 30, y + 65);
            
            ctx.fillStyle = '#64748b';
            ctx.font = '26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText(metric.label, mx + 30, y + 110);
        });
        
        y += metricHeight + 50;
        
        // Разделитель
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cardX + cardPadding, y);
        ctx.lineTo(cardX + cardWidth - cardPadding, y);
        ctx.stroke();
        
        y += 50;
        
        // Заголовок задач
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText('Список задач', cardX + cardPadding, y);
        
        y += 50;
        
        // Задачи
        tasks.forEach(t => {
            const taskBg = t.done ? '#f0fdf4' : '#f8fafc';
            const taskBorder = t.done ? '#bbf7d0' : '#e2e8f0';
            
            ctx.fillStyle = taskBg;
            ctx.beginPath();
            ctx.roundRect(cardX + cardPadding, y, cardWidth - cardPadding * 2, 80, 16);
            ctx.fill();
            
            ctx.strokeStyle = taskBorder;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(cardX + cardPadding, y, cardWidth - cardPadding * 2, 80, 16);
            ctx.stroke();
            
            const checkX = cardX + cardPadding + 30;
            const checkY = y + 28;
            
            if (t.done) {
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.roundRect(checkX, checkY, 28, 28, 6);
                ctx.fill();
                
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(checkX + 7, checkY + 14);
                ctx.lineTo(checkX + 12, checkY + 20);
                ctx.lineTo(checkX + 21, checkY + 9);
                ctx.stroke();
            } else {
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(checkX, checkY, 28, 28, 6);
                ctx.stroke();
            }
            
            ctx.fillStyle = t.done ? '#64748b' : '#0f172a';
            ctx.font = `${t.done ? 'normal' : '600'} 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
            const taskText = t.text.length > 45 ? t.text.substring(0, 45) + '...' : t.text;
            ctx.fillText(taskText, checkX + 50, y + 50);
            
            ctx.fillStyle = '#64748b';
            ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${t.hours || 0}ч ${t.minutes || 0}м`, cardX + cardWidth - cardPadding - 220, y + 50);
            
            if (t.price) {
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                ctx.fillText(formatMoney(parseNumber(t.price)), cardX + cardWidth - cardPadding - 30, y + 50);
            }
            ctx.textAlign = 'left';
            
            y += 95;
            
            if (t.subtasks?.length) {
                t.subtasks.forEach(s => {
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(cardX + cardPadding + 44, y - 15);
                    ctx.lineTo(cardX + cardPadding + 44, y + 20);
                    ctx.lineTo(cardX + cardPadding + 70, y + 20);
                    ctx.stroke();
                    
                    const subCheckX = cardX + cardPadding + 80;
                    const subCheckY = y + 8;
                    
                    if (s.done) {
                        ctx.fillStyle = '#10b981';
                        ctx.beginPath();
                        ctx.roundRect(subCheckX, subCheckY, 22, 22, 5);
                        ctx.fill();
                        
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(subCheckX + 5, subCheckY + 11);
                        ctx.lineTo(subCheckX + 9, subCheckY + 15);
                        ctx.lineTo(subCheckX + 17, subCheckY + 7);
                        ctx.stroke();
                    } else {
                        ctx.strokeStyle = '#cbd5e1';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.roundRect(subCheckX, subCheckY, 22, 22, 5);
                        ctx.stroke();
                    }
                    
                    ctx.fillStyle = s.done ? '#94a3b8' : '#475569';
                    ctx.font = `${s.done ? 'normal' : '500'} 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
                    const subText = s.text.length > 50 ? s.text.substring(0, 50) + '...' : s.text;
                    ctx.fillText(subText, subCheckX + 35, y + 26);
                    
                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText(`${s.hours || 0}ч ${s.minutes || 0}м`, cardX + cardWidth - cardPadding - 30, y + 26);
                    ctx.textAlign = 'left';
                    
                    y += 50;
                });
            }
            
            y += 15;
        });
        
        // Футер
        y = Math.max(y + 30, cardY + cardHeight - 80);
        
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY + cardHeight - 80, cardWidth, 80, [0, 0, 40, 40]);
        ctx.fill();
        
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX, cardY + cardHeight - 80);
        ctx.lineTo(cardX + cardWidth, cardY + cardHeight - 80);
        ctx.stroke();
        
        ctx.fillStyle = '#64748b';
        ctx.font = '26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DesignFlow Journal PRO • ' + new Date().toLocaleDateString('ru-RU'), cardX + cardWidth / 2, cardY + cardHeight - 35);
        ctx.textAlign = 'left';
        
        // Скачивание
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${displayTitle.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_report.jpg`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Отчёт сохранён как изображение', 'success');
        }, 'image/jpeg', 0.95);
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

        const overlay = document.createElement('div');
        overlay.className = 'j-modal-overlay';
        const modal = document.createElement('div');
        modal.className = 'j-modal';

        const setLoading = (val) => { isLoading = val; render(); };
        const expandAI = () => { aiExpanded = true; render(); };

        const suggestSplitTasks = (newTasks) => {
            const suggestModal = document.createElement('div');
            suggestModal.className = 'j-suggest-split-modal';
            suggestModal.innerHTML = `
                <div class="j-suggest-split-content">
                    <h3>${ICONS.sparkles} Разбить задачи на подзадачи?</h3>
                    <p>AI может разбить добавленные задачи на логичные подзадачи. Это поможет лучше отслеживать прогресс.</p>
                    <div class="j-suggest-split-actions">
                        <button class="j-split-yes">Да, разбить</button>
                        <button class="j-split-no">Нет, оставить как есть</button>
                        <button class="j-split-later">Позже</button>
                    </div>
                </div>
            `;
            document.body.appendChild(suggestModal);

            suggestModal.querySelector('.j-split-yes').onclick = async () => {
                suggestModal.remove();
                showToast('AI разбивает задачи...', 'info');
                for (let i = 0; i < newTasks.length; i++) {
                    const task = tasks[tasks.length - newTasks.length + i];
                    if (task) {
                        const subtasks = await splitTaskWithAI(task);
                        if (subtasks.length) {
                            task.subtasks = subtasks.map(s => ({ id: generateId(), text: s.text, hours: s.hours || '0', minutes: s.minutes || '0', done: false }));
                            task.isExpanded = true;
                        }
                    }
                }
                setTasks(projectId, tasks);
                showToast('Задачи разбиты на подзадачи', 'success');
                render();
            };
            suggestModal.querySelector('.j-split-no').onclick = () => { suggestModal.remove(); render(); };
            suggestModal.querySelector('.j-split-later').onclick = () => { suggestModal.remove(); render(); };
        };

        const handleAIAnalyze = async () => {
            if (!aiText.trim() && !aiImageBase64) { showToast('Введите текст или загрузите скриншот', 'error'); return; }
            setLoading(true);
            try {
                let newTasks = aiImageBase64 ? await analyzeImageWithAI(aiImageBase64) : await analyzeTextWithAI(aiText, projectContext);
                if (newTasks.length) {
                    tasks = sortTasksByPriority([...tasks, ...newTasks.map(t => ({ ...t, id: generateId(), done: false, hours: t.hours || '0', minutes: t.minutes || '0', price: t.price || '', priority: t.priority || 'medium', subtasks: [] }))]);
                    setTasks(projectId, tasks);
                    logTaskChange(projectId, 'AI-распознавание', `Добавлено ${newTasks.length} задач`, 'robot');
                    aiText = ''; aiImageBase64 = '';
                    showToast(`Добавлено ${newTasks.length} задач`, 'success');
                    render();
                    suggestSplitTasks(newTasks);
                } else showToast('Не удалось распознать задачи', 'error');
            } catch (e) { showToast('Ошибка: ' + e.message, 'error'); }
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

        const handleSplitTask = (taskIndex) => {
            const task = tasks[taskIndex];
            if (!task) return;
            
            showSplitTaskModal(task, 
                () => {
                    if (!task.subtasks) task.subtasks = [];
                    task.subtasks.push({ id: generateId(), text: '', hours: '0', minutes: '0', done: false });
                    task.isExpanded = true;
                    setTasks(projectId, tasks);
                    render();
                },
                async () => {
                    showToast('AI разбивает задачу...', 'info');
                    const subtasks = await splitTaskWithAI(task);
                    if (subtasks.length) {
                        task.subtasks = subtasks.map(s => ({ id: generateId(), text: s.text, hours: s.hours || '0', minutes: s.minutes || '0', done: false }));
                        task.isExpanded = true;
                        setTasks(projectId, tasks);
                        logTaskChange(projectId, 'Разбиение задачи', `"${task.text}" разбита на ${subtasks.length} подзадач`, 'split');
                        showToast(`Создано ${subtasks.length} подзадач`, 'success');
                        render();
                    } else {
                        showToast('Не удалось разбить задачу', 'error');
                    }
                }
            );
        };

        const deleteSelectedTasks = () => {
            if (!selectedTasks.size) { showToast('Выберите задачи для удаления', 'error'); return; }
            const indices = Array.from(selectedTasks).sort((a, b) => b - a);
            indices.forEach(idx => tasks.splice(idx, 1));
            selectedTasks.clear();
            tasks = sortTasksByPriority(tasks);
            setTasks(projectId, tasks);
            logTaskChange(projectId, 'Массовое удаление', `Удалено ${indices.length} задач`, 'delete');
            showToast(`Удалено ${indices.length} задач`, 'success');
            render();
        };

        const toggleSelectAll = () => {
            if (selectedTasks.size === tasks.length) selectedTasks.clear();
            else tasks.forEach((_, idx) => selectedTasks.add(idx));
            render();
        };

        const saveTemplate = () => {
            const name = prompt('Название шаблона:');
            if (name?.trim()) {
                const custom = loadData(TEMPLATES_KEY, '{}');
                custom[name.trim()] = { name: name.trim(), tasks: tasks.filter(t => t.text) };
                saveData(TEMPLATES_KEY, custom);
                showToast(`Шаблон "${name.trim()}" сохранён`, 'success');
                render();
            }
        };

        const loadTemplate = (templateKey) => {
            const tpl = loadData(TEMPLATES_KEY, '{}')[templateKey];
            if (tpl) {
                tasks = sortTasksByPriority([...tasks, ...tpl.tasks.map(t => ({ ...t, id: generateId(), done: false, subtasks: t.subtasks || [] }))]);
                setTasks(projectId, tasks);
                showToast(`Шаблон "${tpl.name}" загружен`, 'success');
                render();
            }
        };

        const deleteTemplate = (templateKey) => {
            const custom = loadData(TEMPLATES_KEY, '{}');
            const name = custom[templateKey]?.name || templateKey;
            delete custom[templateKey];
            saveData(TEMPLATES_KEY, custom);
            showToast(`Шаблон "${name}" удалён`, 'success');
            render();
        };

        const addNewTask = () => {
            tasks.push({ id: generateId(), text: '', done: false, hours: '0', minutes: '0', price: '', priority: 'medium', subtasks: [] });
            tasks = sortTasksByPriority(tasks);
            setTasks(projectId, tasks);
            logTaskChange(projectId, 'Добавление задачи', 'Создана новая задача', 'add');
            render();
        };

        const render = () => {
            const m = calculateMetrics(tasks);
            let filteredTasks = tasks;
            if (filterStatus === 'active') filteredTasks = tasks.filter(t => !t.done);
            if (filterStatus === 'done') filteredTasks = tasks.filter(t => t.done);

            const customTemplates = loadData(TEMPLATES_KEY, '{}');
            const hasTemplates = Object.keys(customTemplates).length > 0;
            const timerActive = currentTimerState && currentTimerState.projectId === projectId;
            const timerTaskIndex = timerActive ? currentTimerState.taskIndex : -1;

            modal.innerHTML = `
                <div class="j-modal-header">
                    <div class="j-header-left">${ICONS.journal}<h3>Журнал задач</h3><span class="j-version-badge">BETA</span></div>
                    <div class="j-header-actions">
                        <button class="j-header-btn j-add-task-header" id="j-add-task-header" title="Новая задача">${ICONS.plus} Задача</button>
                        <button class="j-header-btn j-add-ai-header" id="j-add-ai-header" title="Добавить через AI">${ICONS.sparkles} AI</button>
                        <button class="j-close-btn" title="Закрыть">${ICONS.x}</button>
                    </div>
                </div>
                <div class="j-project-subtitle">${escapeHtml(projectTitle)}</div>
                <div class="j-modal-body">
                    ${timerActive ? `
                        <div class="j-timer-section ${currentTimerState.pomodoroPhase === 'break' ? 'j-timer-break' : ''}">
                            <div class="j-timer-info">
                                <span class="j-timer-task">${ICONS.clock} ${escapeHtml(currentTimerState.taskText)}</span>
                                <span class="j-timer-phase">${currentTimerState.pomodoroPhase === 'break' ? `${ICONS.coffee} Перерыв` : `${ICONS.tomato} Pomodoro #${currentTimerState.pomodoroCount + 1}`}</span>
                            </div>
                            <div class="j-timer-display">${formatTimerTime(currentTimerState.elapsed)}</div>
                            <div class="j-timer-controls">
                                <button class="j-timer-btn j-timer-pause" id="j-pause-timer" title="${currentTimerState.isPaused ? 'Продолжить' : 'Пауза'}">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                        ${currentTimerState.isPaused 
                                            ? '<polygon points="5 3 19 12 5 21 5 3"></polygon>' 
                                            : '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>'}
                                    </svg>
                                </button>
                                <button class="j-timer-btn j-timer-stop" id="j-stop-timer" title="Остановить">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                        <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                                    </svg>
                                </button>
                            </div>
                        </div>` : ''}
                    <div class="j-toolbar">
                        <button class="j-pro-btn j-ai-planner-btn" id="j-ai-planner">${ICONS.brain} С чего начать</button>
                        <div class="j-dropdown">
                            <button class="j-pro-btn" id="j-template-btn">${ICONS.template} Шаблоны ${ICONS.chevronDown}</button>
                            <div class="j-dropdown-menu ${templateMenuOpen ? 'show' : ''}" id="j-template-menu">
                                <div class="j-dropdown-item" id="j-save-template">${ICONS.save} Сохранить как шаблон</div>
                                ${hasTemplates ? `
                                    <div class="j-dropdown-divider"></div>
                                    <div class="j-template-list" id="j-template-list">
                                        ${Object.entries(customTemplates).map(([k, v]) => `
                                            <div class="j-template-item" data-template-key="${k}">
                                                <span class="j-template-grip">${ICONS.grip}</span>
                                                <span class="j-template-name" data-template="${k}">${escapeHtml(v.name)}</span>
                                                <button class="j-template-delete" data-template-delete="${k}" title="Удалить шаблон">${ICONS.trash}</button>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : '<div class="j-dropdown-item disabled">Нет сохранённых шаблонов</div>'}
                            </div>
                        </div>
                        <button class="j-pro-btn" id="j-history-btn">${ICONS.history} История</button>
                        <button class="j-pro-btn" id="j-worklog-btn">${ICONS.list} Лог работы</button>
                        <button class="j-pro-btn" id="j-export-btn">${ICONS.file} Отчёт</button>
                        ${selectedTasks.size > 0 ? `<button class="j-pro-btn j-delete-selected-btn" id="j-delete-selected">${ICONS.trash} Удалить ${selectedTasks.size}</button>` : ''}
                        <div class="j-toolbar-spacer"></div>
                        <button class="j-pro-btn" id="j-select-btn">${selectedTasks.size === tasks.length ? ICONS.x : ICONS.check} ${selectedTasks.size === tasks.length ? 'Снять' : 'Выбрать всё'}</button>
                        <select class="j-toolbar-select" id="j-filter-select">
                            <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>Все ${m.total}</option>
                            <option value="active" ${filterStatus === 'active' ? 'selected' : ''}>Активные ${m.total - m.done}</option>
                            <option value="done" ${filterStatus === 'done' ? 'selected' : ''}>Выполненные ${m.done}</option>
                        </select>
                    </div>
                    <div class="j-ai-section">
                        <div class="j-ai-header" id="j-ai-header">
                            <div class="j-ai-header-left">${ICONS.sparkles} AI-помощник <span class="j-ai-badge">PRO</span></div>
                            <span class="j-ai-arrow" style="transform:rotate(${aiExpanded ? '180deg' : '0'})">${ICONS.chevronDown}</span>
                        </div>
                        <div class="j-ai-input-area" style="display:${aiExpanded ? 'block' : 'none'}">
                            <div class="j-ai-tip">${ICONS.info}<div class="j-ai-tip-content"><strong>Вставьте ТЗ или Ctrl+V для скриншота</strong></div></div>
                            <textarea class="j-ai-textarea" id="j-ai-text" placeholder="Вставьте текст... Enter для отправки">${escapeHtml(aiText)}</textarea>
                            ${aiImageBase64 ? `<img class="j-preview-image" src="${aiImageBase64}">` : ''}
                            <div class="j-ai-toolbar">
                                <button class="j-ai-btn" id="j-upload-btn">${ICONS.upload} Скриншот</button>
                                <input type="file" class="j-file-input" id="j-file-input" accept="image/*">
                                <button class="j-ai-btn primary" id="j-analyze-btn" ${isLoading ? 'disabled' : ''}>${isLoading ? 'Анализ...' : `${ICONS.sparkles} Распознать`}</button>
                                ${aiImageBase64 ? `<button class="j-ai-btn" id="j-clear-image-btn">${ICONS.x} Очистить</button>` : ''}
                            </div>
                            ${isLoading ? `<div class="j-ai-loading"><div class="j-spinner"></div><span>AI анализирует...</span></div>` : ''}
                        </div>
                    </div>
                    <div class="j-progress-section">
                        <div class="j-progress-row">
                            <div class="j-progress-percent">${m.progress.toFixed(0)}%</div>
                            <div class="j-progress-bar-wrapper"><div class="j-progress-bar"><div class="j-progress-fill" style="width:${m.progress}%"></div></div></div>
                            <div class="j-progress-metrics">
                                <div class="j-metric">${ICONS.check} ${m.done}/${m.total}</div>
                                <div class="j-metric">${ICONS.clock} ${formatTotalTime(m.totalHours)}</div>
                                <div class="j-metric j-metric-money">${ICONS.dollar} ${formatMoney(m.totalPrice)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="j-tasks-header">
                        <span class="j-tasks-title">Задачи ${filteredTasks.length}</span>
                    </div>
                    <div class="j-tasks-list" id="j-tasks-list">
                        ${filteredTasks.length ? filteredTasks.map((t) => {
                            const originalIndex = tasks.indexOf(t);
                            const subProgress = calculateSubtaskProgress(t);
                            const hasSubtasks = t.subtasks?.length;
                            const isTimerTask = timerTaskIndex === originalIndex;
                            const isSelected = selectedTasks.has(originalIndex);
                            return `
                                <div class="j-task-row ${t.done ? 'done' : ''} priority-${t.priority || 'medium'} ${isTimerTask ? 'j-timer-active' : ''} ${isSelected ? 'j-selected' : ''}" data-index="${originalIndex}">
                                    <button class="j-subtask-toggle ${hasSubtasks ? (t.isExpanded ? 'expanded' : '') : 'j-toggle-hidden'}" data-toggle-index="${originalIndex}" ${!hasSubtasks ? 'disabled' : ''}>${hasSubtasks ? (t.isExpanded ? ICONS.chevronDown : ICONS.chevronRight) : ''}</button>
                                    <div class="j-checkbox-wrapper"><input type="checkbox" class="j-task-checkbox" ${t.done ? 'checked' : ''} data-index="${originalIndex}"><div class="j-checkbox-custom">${ICONS.check}</div></div>
                                    <input type="text" class="j-task-text" value="${escapeHtml(t.text)}" placeholder="Название задачи" data-index="${originalIndex}">
                                    ${hasSubtasks ? `<div class="j-subtask-progress-mini"><span>${subProgress.done}/${subProgress.total}</span><div class="j-subtask-bar"><div style="width:${subProgress.percent}%"></div></div></div>` : `
                                        <div class="j-time-wrapper">
                                            <input type="number" class="j-time-input j-task-hours" value="${t.hours || 0}" min="0" data-index="${originalIndex}"><span class="j-time-sep">ч</span>
                                            <input type="number" class="j-time-input j-task-minutes" value="${t.minutes || 0}" min="0" max="59" data-index="${originalIndex}"><span class="j-time-sep">м</span>
                                        </div>`}
                                    <input type="text" class="j-task-price" value="${t.price || ''}" placeholder="₽" data-index="${originalIndex}">
                                    <select class="j-task-priority" data-index="${originalIndex}">
                                        <option value="high" ${t.priority === 'high' ? 'selected' : ''}>Высокий</option>
                                        <option value="medium" ${t.priority === 'medium' ? 'selected' : ''}>Средний</option>
                                        <option value="low" ${t.priority === 'low' ? 'selected' : ''}>Низкий</option>
                                    </select>
                                    <div class="j-task-actions">
                                        ${!isTimerTask ? `<button class="j-task-action-btn j-start-timer-btn" data-index="${originalIndex}" title="Запустить таймер">${ICONS.play}</button>` : `<button class="j-task-action-btn j-stop-timer-btn" data-index="${originalIndex}" title="Остановить таймер">${ICONS.stop}</button>`}
                                        <button class="j-task-action-btn j-split-btn" data-index="${originalIndex}" title="Разбить на подзадачи">${ICONS.split}</button>
                                        <button class="j-task-action-btn j-delete-btn" data-index="${originalIndex}" title="Удалить">${ICONS.trash}</button>
                                    </div>
                                </div>
                                ${hasSubtasks && t.isExpanded ? `
                                    <div class="j-subtasks-container">
                                        ${t.subtasks.map((sub, subIdx) => `
                                            <div class="j-subtask-row ${sub.done ? 'done' : ''}" data-task-index="${originalIndex}" data-sub-index="${subIdx}">
                                                <div class="j-subtask-indent">${subIdx === t.subtasks.length - 1 ? '└─' : '├─'}</div>
                                                <div class="j-checkbox-wrapper j-checkbox-small"><input type="checkbox" class="j-subtask-checkbox" ${sub.done ? 'checked' : ''} data-task-index="${originalIndex}" data-sub-index="${subIdx}"><div class="j-checkbox-custom">${ICONS.check}</div></div>
                                                <input type="text" class="j-subtask-text" value="${escapeHtml(sub.text)}" data-task-index="${originalIndex}" data-sub-index="${subIdx}">
                                                <div class="j-time-wrapper j-time-small">
                                                    <input type="number" class="j-time-input j-subtask-hours" value="${sub.hours || 0}" min="0" data-task-index="${originalIndex}" data-sub-index="${subIdx}"><span class="j-time-sep">ч</span>
                                                    <input type="number" class="j-time-input j-subtask-minutes" value="${sub.minutes || 0}" min="0" max="59" data-task-index="${originalIndex}" data-sub-index="${subIdx}"><span class="j-time-sep">м</span>
                                                </div>
                                                <button class="j-subtask-delete" data-task-index="${originalIndex}" data-sub-index="${subIdx}">${ICONS.x}</button>
                                            </div>`).join('')}
                                        <button class="j-add-subtask" data-index="${originalIndex}">${ICONS.plus} Добавить подзадачу</button>
                                    </div>` : ''}`;
                        }).join('') : `<div class="j-empty">${ICONS.circle}<br>Нет задач. Добавьте вручную или через AI.</div>`}
                    </div>
                    <div class="j-add-buttons">
                        <button class="j-add-task" id="j-add-task-btn">${ICONS.plus} Добавить задачу</button>
                        <button class="j-add-ai-btn" id="j-add-ai-btn">${ICONS.sparkles} Через AI</button>
                    </div>
                </div>
                <div class="j-modal-footer">
                    <span class="j-footer-total">${ICONS.dollar} <span class="j-footer-value">${formatMoney(m.totalPrice)}</span></span>
                    <div class="j-footer-stats"><span>${ICONS.clock} ${formatTotalTime(m.totalHours)}</span><span>${ICONS.check} ${m.done}/${m.total}</span></div>
                </div>`;

            // ========== СОБЫТИЯ ==========
            modal.querySelector('.j-close-btn').onclick = () => overlay.remove();
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
            
            modal.querySelector('#j-add-task-header')?.addEventListener('click', addNewTask);
            modal.querySelector('#j-add-ai-header')?.addEventListener('click', expandAI);
            
            modal.querySelector('#j-pause-timer')?.addEventListener('click', () => { pauseTimer(); render(); });
            modal.querySelector('#j-stop-timer')?.addEventListener('click', () => { stopTimer(); render(); });
            
            modal.querySelector('#j-ai-planner')?.addEventListener('click', () => { showAIPlanner(projectId, projectTitle, tasks, { ...projectContext, projectId }); });

            const templateBtn = modal.querySelector('#j-template-btn');
            templateBtn?.addEventListener('click', (e) => { e.stopPropagation(); templateMenuOpen = !templateMenuOpen; render(); });
            modal.querySelector('#j-save-template')?.addEventListener('click', () => { saveTemplate(); templateMenuOpen = false; });

            modal.querySelectorAll('[data-template]').forEach(el => el.addEventListener('click', (e) => {
                e.stopPropagation();
                loadTemplate(el.dataset.template);
                templateMenuOpen = false;
            }));

            modal.querySelectorAll('[data-template-delete]').forEach(el => el.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTemplate(el.dataset.templateDelete);
                templateMenuOpen = false;
            }));

            modal.querySelector('#j-ai-header')?.addEventListener('click', () => { aiExpanded = !aiExpanded; render(); });
            modal.querySelector('#j-add-ai-btn')?.addEventListener('click', expandAI);
            
            const textarea = modal.querySelector('#j-ai-text');
            if (textarea) {
                textarea.oninput = (e) => { aiText = e.target.value; };
                textarea.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAIAnalyze(); } };
                textarea.onpaste = handlePasteImage;
            }
            modal.querySelector('#j-upload-btn')?.addEventListener('click', () => modal.querySelector('#j-file-input')?.click());
            modal.querySelector('#j-file-input')?.addEventListener('change', handleFileUpload);
            modal.querySelector('#j-clear-image-btn')?.addEventListener('click', () => { aiImageBase64 = ''; render(); });
            modal.querySelector('#j-analyze-btn')?.addEventListener('click', handleAIAnalyze);

            modal.querySelector('#j-history-btn')?.addEventListener('click', () => showHistory(projectId, projectTitle));
            modal.querySelector('#j-worklog-btn')?.addEventListener('click', () => showWorklog(projectId, projectTitle));
            modal.querySelector('#j-export-btn')?.addEventListener('click', () => showReportModal(projectTitle, tasks));
            modal.querySelector('#j-delete-selected')?.addEventListener('click', deleteSelectedTasks);
            modal.querySelector('#j-select-btn')?.addEventListener('click', toggleSelectAll);
            modal.querySelector('#j-filter-select')?.addEventListener('change', (e) => { filterStatus = e.target.value; render(); });
            modal.querySelector('#j-add-task-btn')?.addEventListener('click', addNewTask);

            // Toggle подзадач
            modal.querySelectorAll('.j-subtask-toggle:not(.j-toggle-hidden)').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const idx = parseInt(btn.dataset.toggleIndex);
                    tasks[idx].isExpanded = !tasks[idx].isExpanded;
                    setTasks(projectId, tasks);
                    render();
                };
            });

            // Чекбоксы задач
            modal.querySelectorAll('.j-task-checkbox').forEach(cb => {
                cb.onchange = (e) => {
                    e.stopPropagation();
                    const idx = parseInt(e.target.dataset.index);
                    tasks[idx].done = e.target.checked;
                    if (tasks[idx].subtasks) tasks[idx].subtasks.forEach(s => s.done = e.target.checked);
                    tasks = sortTasksByPriority(tasks);
                    setTasks(projectId, tasks);
                    logTaskChange(projectId, e.target.checked ? 'Задача выполнена' : 'Задача открыта', tasks[idx].text, 'check');
                    render();
                };
            });

            // Текстовые поля
            modal.querySelectorAll('.j-task-text').forEach(input => {
                input.onclick = (e) => e.stopPropagation();
                input.onchange = (e) => { tasks[parseInt(e.target.dataset.index)].text = e.target.value; setTasks(projectId, tasks); };
            });
            modal.querySelectorAll('.j-task-hours').forEach(input => {
                input.onclick = (e) => e.stopPropagation();
                input.onchange = (e) => { tasks[parseInt(e.target.dataset.index)].hours = e.target.value; setTasks(projectId, tasks); render(); };
            });
            modal.querySelectorAll('.j-task-minutes').forEach(input => {
                input.onclick = (e) => e.stopPropagation();
                input.onchange = (e) => { tasks[parseInt(e.target.dataset.index)].minutes = e.target.value; setTasks(projectId, tasks); render(); };
            });
            modal.querySelectorAll('.j-task-price').forEach(input => {
                input.onclick = (e) => e.stopPropagation();
                input.onchange = (e) => { tasks[parseInt(e.target.dataset.index)].price = e.target.value; setTasks(projectId, tasks); render(); };
            });
            modal.querySelectorAll('.j-task-priority').forEach(select => {
                select.onclick = (e) => e.stopPropagation();
                select.onchange = (e) => { const idx = parseInt(e.target.dataset.index); tasks[idx].priority = e.target.value; tasks = sortTasksByPriority(tasks); setTasks(projectId, tasks); render(); };
            });

            // Действия с задачами
            modal.querySelectorAll('.j-delete-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.index);
                    const taskText = tasks[idx].text;
                    tasks.splice(idx, 1);
                    selectedTasks.delete(idx);
                    setTasks(projectId, tasks);
                    logTaskChange(projectId, 'Удаление задачи', taskText, 'delete');
                    render();
                };
            });
            
            modal.querySelectorAll('.j-start-timer-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.index);
                    startTimer(projectId, idx, tasks[idx].text || 'Задача');
                    render();
                };
            });
            
            modal.querySelectorAll('.j-stop-timer-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    stopTimer();
                    render();
                };
            });
            
            modal.querySelectorAll('.j-split-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    handleSplitTask(parseInt(btn.dataset.index));
                };
            });

            // Подзадачи
            modal.querySelectorAll('.j-add-subtask').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.index);
                    if (!tasks[idx].subtasks) tasks[idx].subtasks = [];
                    tasks[idx].subtasks.push({ id: generateId(), text: '', hours: '0', minutes: '0', done: false });
                    tasks[idx].isExpanded = true;
                    setTasks(projectId, tasks);
                    render();
                };
            });
            
            modal.querySelectorAll('.j-subtask-checkbox').forEach(cb => {
                cb.onchange = (e) => {
                    e.stopPropagation();
                    const taskIdx = parseInt(e.target.dataset.taskIndex);
                    const subIdx = parseInt(e.target.dataset.subIndex);
                    tasks[taskIdx].subtasks[subIdx].done = e.target.checked;
                    if (tasks[taskIdx].subtasks.every(s => s.done)) tasks[taskIdx].done = true;
                    else tasks[taskIdx].done = false;
                    setTasks(projectId, tasks);
                    render();
                };
            });
            
            modal.querySelectorAll('.j-subtask-text').forEach(input => {
                input.onclick = (e) => e.stopPropagation();
                input.onchange = (e) => {
                    const taskIdx = parseInt(e.target.dataset.taskIndex);
                    const subIdx = parseInt(e.target.dataset.subIndex);
                    tasks[taskIdx].subtasks[subIdx].text = e.target.value;
                    setTasks(projectId, tasks);
                };
            });
            
            modal.querySelectorAll('.j-subtask-hours').forEach(input => {
                input.onclick = (e) => e.stopPropagation();
                input.onchange = (e) => {
                    const taskIdx = parseInt(e.target.dataset.taskIndex);
                    const subIdx = parseInt(e.target.dataset.subIndex);
                    tasks[taskIdx].subtasks[subIdx].hours = e.target.value;
                    setTasks(projectId, tasks);
                    render();
                };
            });
            
            modal.querySelectorAll('.j-subtask-minutes').forEach(input => {
                input.onclick = (e) => e.stopPropagation();
                input.onchange = (e) => {
                    const taskIdx = parseInt(e.target.dataset.taskIndex);
                    const subIdx = parseInt(e.target.dataset.subIndex);
                    tasks[taskIdx].subtasks[subIdx].minutes = e.target.value;
                    setTasks(projectId, tasks);
                    render();
                };
            });
            
            modal.querySelectorAll('.j-subtask-delete').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const taskIdx = parseInt(btn.dataset.taskIndex);
                    const subIdx = parseInt(btn.dataset.subIndex);
                    tasks[taskIdx].subtasks.splice(subIdx, 1);
                    setTasks(projectId, tasks);
                    render();
                };
            });

            // Выделение задач
            modal.querySelectorAll('.j-task-row').forEach(row => {
                row.onclick = (e) => {
                    if (e.target.closest('input, select, button, .j-checkbox-wrapper')) return;
                    const idx = parseInt(row.dataset.index);
                    if (e.shiftKey && selectedTasks.size > 0) {
                        const lastSelected = Math.max(...selectedTasks);
                        const start = Math.min(lastSelected, idx);
                        const end = Math.max(lastSelected, idx);
                        for (let i = start; i <= end; i++) selectedTasks.add(i);
                    } else if (e.ctrlKey || e.metaKey) {
                        if (selectedTasks.has(idx)) selectedTasks.delete(idx);
                        else selectedTasks.add(idx);
                    } else {
                        if (selectedTasks.has(idx) && selectedTasks.size === 1) {
                            selectedTasks.clear();
                        } else {
                            selectedTasks.clear();
                            selectedTasks.add(idx);
                        }
                    }
                    render();
                };
            });
        };

        render();
        if (currentTimerState) runTimer();
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    // ========== ДОБАВЛЕНИЕ КНОПОК В ТАБЛИЦЫ ==========
    function addJournalButtonsToRows() {
        const tables = ['t-active', 't-waiting', 't-potential', 't-paused', 't-archive', 't-requests', 't-all', 't-trash'];

        tables.forEach(tableId => {
            const table = document.getElementById(tableId);
            if (!table) return;

            const tbody = table.querySelector('tbody');
            if (!tbody) return;

            const rows = tbody.querySelectorAll('tr');

            rows.forEach(row => {
                if (row.querySelector('.j-table-btn-row') || row.querySelector('.j-table-btn')) return;

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

                if (!project) {
                    const projectNameInput = document.getElementById('add-proj-name');
                    if (projectNameInput && projectNameInput.value) {
                        project = projectNameInput.value.trim();
                    }
                }

                const projectId = btoa(encodeURIComponent(client + '|' + project)).replace(/=/g, '');
                const projectTasks = getTasks(projectId);
                const done = projectTasks.filter(t => t.done).length;
                const total = projectTasks.length;

                const actionCell = cells[cells.length - 1];

                const btn = document.createElement('button');
                btn.className = 'j-table-btn-row';
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>${done}/${total}</span>
                `;
                btn.title = `${client} — ${project}`;
                btn.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    background: ${done === total && total > 0 ? 'rgba(46, 160, 67, 0.15)' : '#0f141b'};
                    border: 1px solid ${done === total && total > 0 ? 'rgba(46, 160, 67, 0.4)' : '#30363d'};
                    border-radius: 8px;
                    color: ${done === total && total > 0 ? '#2ea043' : '#c9d1d9'};
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-left: 6px;
                    white-space: nowrap;
                `;

                btn.onmouseenter = () => {
                    btn.style.borderColor = '#58a6ff';
                    btn.style.color = '#58a6ff';
                    btn.style.background = 'rgba(88, 166, 255, 0.1)';
                };
                btn.onmouseleave = () => {
                    btn.style.borderColor = done === total && total > 0 ? 'rgba(46, 160, 67, 0.4)' : '#30363d';
                    btn.style.color = done === total && total > 0 ? '#2ea043' : '#c9d1d9';
                    btn.style.background = done === total && total > 0 ? 'rgba(46, 160, 67, 0.15)' : '#0f141b';
                };

                btn.onclick = (e) => {
                    e.stopPropagation();
                    const fakeRow = document.createElement('tr');
                    fakeRow.innerHTML = `
                        <td></td>
                        <td data-key="c">${client}</td>
                        <td data-key="n">${project}</td>
                        <td data-key="p"></td>
                        <td data-key="dl"></td>
                    `;
                    openJournal(projectId, fakeRow);
                };

                actionCell.appendChild(btn);
            });
        });
    }

    // ========== ГЛОБАЛЬНАЯ КНОПКА ==========
    function initGlobalButton() {
        const globalBtn = document.getElementById('open-journal-global');
        if (globalBtn) {
            globalBtn.onclick = () => {
                const projectNameInput = document.getElementById('add-proj-name');
                const clientInput = document.getElementById('add-client');
                
                const project = projectNameInput?.value?.trim() || 'Новый проект';
                const client = clientInput?.value?.trim() || '';
                
                const projectId = btoa(encodeURIComponent(client + '|' + project)).replace(/=/g, '');
                
                const fakeRow = document.createElement('tr');
                fakeRow.innerHTML = `
                    <td></td>
                    <td data-key="c">${client}</td>
                    <td data-key="n">${project}</td>
                    <td data-key="p"></td>
                    <td data-key="dl"></td>
                `;
                
                openJournal(projectId, fakeRow);
            };
        }
    }

    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    function init() {
        // Добавляем кнопки в таблицы
        setTimeout(addJournalButtonsToRows, 500);
        setTimeout(addJournalButtonsToRows, 1000);
        setTimeout(addJournalButtonsToRows, 2000);

        // Инициализируем глобальную кнопку
        initGlobalButton();

        // Перехват switchTab
        const originalSwitch = window.switchTab;
        if (originalSwitch) {
            window.switchTab = function(tab) {
                originalSwitch(tab);
                setTimeout(addJournalButtonsToRows, 300);
                setTimeout(addJournalButtonsToRows, 800);
            };
        }

        // Наблюдатель за DOM
        const observer = new MutationObserver(() => {
            addJournalButtonsToRows();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Периодическая проверка
        setInterval(addJournalButtonsToRows, 3000);
        setInterval(updateAllButtons, 2000);

        // Восстанавливаем таймер
        if (currentTimerState && !currentTimerState.isPaused) {
            currentTimerState.startTime = Date.now() - (currentTimerState.elapsed * 1000);
            runTimer();
        }

        console.log('✅ DesignFlow Journal PRO BETA загружен!');
    }

    // Запуск после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Экспорт для глобального доступа
    window.JournalPro = {
        openJournal,
        getTasks,
        setTasks,
        showToast
    };

})();
