(function() {
    'use strict';

    // Функция для работы с Cookie (вместо localStorage)
    const Cookie = {
        set(name, value, days = 365) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
        },
        get(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }
    };

    let isZen = Cookie.get('zen_mode') === 'true';

    const styleZen = document.createElement('style');
    styleZen.id = 'zen-logic-final';
    document.documentElement.appendChild(styleZen);

    function applyZen() {
        if (isZen) {
            styleZen.textContent = `
                #analytics-dashboard, .stats-full, header, footer, .welcome-block,
                #efficiency-card, #record-banner, #reputation-card, #top-clients-card, .side-stack,
                #tab-all, #tab-potential, #tab-paused, #tab-archive, #tab-trash {
                    display: none !important;
                }
                .main-container {
                    max-width: 98% !important;
                    width: 98% !important;
                    margin: 0 auto !important;
                    padding-top: 20px !important;
                }
                #zen-btn { background: #2ea043 !important; color: white !important; border-color: #2ea043 !important; }
            `;
            if (document.querySelector('.tab.active')?.id === 'tab-archive') {
                if (typeof window.switchTab === 'function') window.switchTab('active');
            }
        } else {
            styleZen.textContent = '';
        }
    }

    function toggleZen() {
        isZen = !isZen;
        Cookie.set('zen_mode', isZen);
        applyZen();
        console.log("Zen saved to Cookie:", isZen);
    }

    function injectButton() {
        if (document.getElementById('zen-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'zen-btn';
        btn.innerHTML = '🧘';
        btn.style = `
            position: fixed; bottom: 20px; left: 20px; z-index: 2147483647;
            width: 44px; height: 44px; border-radius: 10px; border: 1px solid #30363d;
            background: #21262d; color: #c9d1d9; cursor: pointer; font-size: 20px;
            display: flex; align-items: center; justify-content: center;
        `;
        document.body.appendChild(btn);
        btn.onclick = toggleZen;
    }

    // Запуск проверки каждые 300мс в течение 3 секунд (чтобы победить перерисовку app.js)
    let count = 0;
    const timer = setInterval(() => {
        applyZen();
        injectButton();
        if (++count > 10) clearInterval(timer);
    }, 300);

    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyF' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            toggleZen();
        }
    }, true);

})();
