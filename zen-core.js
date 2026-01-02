(function() {
    'use strict';

    // Используем тот же ключ, что и в app.js
    const UI_PREFS_KEY = 'designflow_ui_prefs';

    function getZenFromPrefs() {
        try {
            const prefs = JSON.parse(localStorage.getItem(UI_PREFS_KEY));
            return prefs && prefs.zenMode === true;
        } catch(e) { return false; }
    }

    function saveZenToPrefs(isActive) {
        try {
            let prefs = JSON.parse(localStorage.getItem(UI_PREFS_KEY)) || {};
            prefs.zenMode = isActive;
            localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
            
            // Также обновляем основной ключ grok_design_v5, чтобы app.js не затер данные
            const mainData = JSON.parse(localStorage.getItem('grok_design_v5'));
            if (mainData) {
                mainData.uiPrefs = mainData.uiPrefs || {};
                mainData.uiPrefs.zenMode = isActive;
                localStorage.setItem('grok_design_v5', JSON.stringify(mainData));
            }
        } catch(e) { console.error("Zen save error", e); }
    }

    const styleZen = document.createElement('style');
    document.documentElement.appendChild(styleZen);

    function applyZen(isActive) {
        if (isActive) {
            styleZen.textContent = `
                #analytics-dashboard, .stats-full, header, footer, .welcome-block,
                #efficiency-card, #record-banner, #reputation-card, #top-clients-card, .side-stack,
                #tab-all, #tab-potential, #tab-paused, #tab-archive, #tab-trash {
                    display: none !important;
                }
                .main-container { max-width: 98% !important; width: 98% !important; margin: 0 auto !important; padding-top: 20px !important; }
                #zen-btn { background: #2ea043 !important; color: white !important; border-color: #2ea043 !important; }
            `;
        } else {
            styleZen.textContent = '';
        }
    }

    function toggleZen() {
        const newState = !getZenFromPrefs();
        saveZenToPrefs(newState);
        applyZen(newState);
    }

    function init() {
        if (document.getElementById('zen-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'zen-btn';
        btn.innerHTML = '🧘';
        btn.style = "position:fixed; bottom:20px; left:20px; z-index:9999; width:44px; height:44px; border-radius:10px; border:1px solid #30363d; background:#21262d; color:#c9d1d9; cursor:pointer; font-size:20px; display:flex; align-items:center; justify-content:center;";
        document.body.appendChild(btn);
        btn.onclick = toggleZen;
        applyZen(getZenFromPrefs());
    }

    // Запуск с повторами, чтобы app.js не перехватил управление
    setInterval(init, 1000);

    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyF' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            toggleZen();
        }
    }, true);
})();
