// Контроллер для мгновенного удаления всех слушателей событий при самоуничтожении
const abortController = new AbortController();
const { signal } = abortController;

let netConfig = {
    "DOMAIN": "au-team.irpo",
    "PASS_MAIN": "P@ssw0rd",
    "ISP_IP_1": "172.16.1.1",
    "ISP_IP_2": "172.16.2.1",
    "ISP_NET_1": "172.16.1.0/28",
    "ISP_NET_2": "172.16.2.0/28",
    "HQ_RTR_EXT": "172.16.1.2",
    "HQ_RTR_V100": "192.168.100.1",
    "HQ_RTR_V200": "192.168.200.1",
    "HQ_RTR_V999": "192.168.99.1",
    "HQ_SRV_IP_M1": "192.168.100.2",
    "BR_RTR_EXT": "172.16.2.2",
    "BR_RTR_INT_M1": "192.168.1.1",
    "BR_SRV_IP_M1": "192.168.1.2",
    "TUNNEL_HQ": "10.10.10.1",
    "TUNNEL_BR": "10.10.10.2",
    "HQ_SRV_IP_M2": "192.168.1.10",
    "HQ_CLI_IP_M2": "192.168.2.10",
    "BR_SRV_IP_M2": "192.168.3.10",
    "HQ_RTR_INT_M2": "192.168.1.1", 
    "BR_RTR_INT_M2": "192.168.3.1", 
    "HQ_NGINX_PROXY": "172.16.1.10",
    "BR_NGINX_PROXY": "172.16.2.10",
    "SSH_PORT_M1": "2025",
    "SSH_PORT_M2": "2026"
};

const keysMod1 = ["DOMAIN", "PASS_MAIN", "ISP_IP_1", "ISP_IP_2", "HQ_RTR_EXT", "HQ_RTR_V100", "HQ_RTR_V200", "HQ_RTR_V999", "HQ_SRV_IP_M1", "BR_RTR_EXT", "BR_RTR_INT_M1", "BR_SRV_IP_M1", "TUNNEL_HQ", "TUNNEL_BR", "SSH_PORT_M1"];
const keysMod2 = ["DOMAIN", "PASS_MAIN", "ISP_IP_1", "ISP_IP_2", "ISP_NET_1", "ISP_NET_2", "HQ_SRV_IP_M2", "HQ_CLI_IP_M2", "BR_SRV_IP_M2", "HQ_RTR_INT_M2", "BR_RTR_INT_M2", "HQ_NGINX_PROXY", "BR_NGINX_PROXY", "SSH_PORT_M2"];

let rawTemplates = { mod1: "", mod2: "" };

async function loadMarkdownFile(filename) {
    const url = chrome.runtime.getURL(filename);
    try {
        const response = await fetch(url);
        return await response.text();
    } catch (error) {
        return "Ошибка загрузки: " + filename;
    }
}

function injectStyles() {
    const style = document.createElement('style');
    style.id = 'de-stealth-styles'; // ID нужен для удаления при kill-switch
    
    // Анимация есть только у .active. Когда класс убирается, display: none применяется за 0ms.
    style.textContent = `
        .de-stealth-module { display: none; margin-top: 20px; }
        .de-stealth-module.active { display: block; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Таблица, мимикрирующая под контент MediaWiki */
        .stealth-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 1em; 
            font-size: 14px; 
            font-family: sans-serif;
            color: #202122; 
        }
        .stealth-table tr {
            border-bottom: 1px solid #eaecf0; /* Тонкая линия, как в вики-списках */
        }
        .stealth-table td { 
            padding: 0.4em 0.8em; 
        }
        .stealth-table td:first-child { 
            background-color: #f8f9fa; /* Серый фон MediaWiki */
            color: #54595d; 
            width: 25%; 
            user-select: none; 
            font-weight: 500;
        }
        .stealth-table td:last-child { 
            cursor: text; 
            background-color: transparent;
        }
        
        .stealth-input { 
            width: 100%; 
            background: transparent; 
            border: none; 
            outline: none; 
            font-family: monospace; 
            font-size: 13px;
            color: #202122; 
            padding: 0;
        }

        .de-stealth-module pre {
            background-color: #f8f9fa !important;
            border: 1px solid #eaecf0 !important;
            padding: 1em !important;
            color: #202122 !important;
            white-space: pre-wrap !important;
            font-family: monospace !important;
            line-height: 1.3 !important;
            border-radius: 2px;
            margin: 0 0 1em 0 !important;
            cursor: pointer;
        }
        .de-stealth-module pre.copied-success {
            background-color: #e8f9ee !important;
            border-color: #a3d9b8 !important;
        }
    `;
    document.head.appendChild(style);
}

function compileContent(rawMd) {
    let content = rawMd;
    for (const [key, value] of Object.entries(netConfig)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(placeholder, value);
    }
    return typeof marked !== 'undefined' ? marked.parse(content) : `<pre>${content}</pre>`;
}

function renderUpdates() {
    const mod1Content = document.getElementById('content-app-1');
    const mod2Content = document.getElementById('content-app-2');

    if (mod1Content) mod1Content.innerHTML = compileContent(rawTemplates.mod1);
    if (mod2Content) mod2Content.innerHTML = compileContent(rawTemplates.mod2);

    addInvisibleCopy(document.querySelector('.de-modules-container'));
}

function buildConfigTable(containerId, keysArray) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'stealth-table';

    for (const key of keysArray) {
        const value = netConfig[key];
        const row = table.insertRow();
        const cellKey = row.insertCell(0);
        const cellVal = row.insertCell(1);

        cellKey.innerText = key;
        cellVal.innerText = value;

        cellVal.addEventListener('click', function() {
            if (this.querySelector('input')) return;

            const currentText = netConfig[key];
            this.innerHTML = `<input type="text" class="stealth-input" value="${currentText}">`;
            const input = this.querySelector('input');
            input.focus();

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    netConfig[key] = input.value.trim();
                    this.innerText = netConfig[key];
                    renderUpdates();
                }
                if (e.key === 'Escape') {
                    e.stopPropagation(); // Не прокидывать Esc дальше, чтобы не сработало скрытие модулей
                    this.innerText = currentText;
                }
            });

            input.addEventListener('blur', () => {
                this.innerText = netConfig[key];
            });
        });
    }
    container.appendChild(table);
}

function addInvisibleCopy(container) {
    if (!container) return;
    const preBlocks = container.querySelectorAll('pre');
    
    preBlocks.forEach(pre => {
        pre.onclick = function() {
            if (window.getSelection().toString().length > 0) return;
            const textToCopy = this.innerText.trim();
            navigator.clipboard.writeText(textToCopy).then(() => {
                this.classList.add('copied-success');
                setTimeout(() => this.classList.remove('copied-success'), 200); // Ускорил мерцание
            });
        };
    });
}

// === Логика стелс-контроля ===

function panicHide() {
    const wrapper1 = document.getElementById('wrapper-app-1');
    const wrapper2 = document.getElementById('wrapper-app-2');
    // Удаление класса .active применяет базовое правило display: none мгновенно (0ms)
    if (wrapper1) wrapper1.classList.remove('active');
    if (wrapper2) wrapper2.classList.remove('active');
}

function destroyExtension() {
    // 1. Убираем HTML
    const container = document.querySelector('.de-modules-container');
    if (container) container.remove();

    // 2. Убираем стили
    const style = document.getElementById('de-stealth-styles');
    if (style) style.remove();

    // 3. Отписываемся от ВСЕХ событий, привязанных к signal
    abortController.abort();
    
    console.log("Modules offline."); // Опционально, можно убрать
}

// Переменные для каскадного тройного Esc
let escCount = 0;
let escTimeout;

async function injectModules() {
    const contentContainer = document.getElementById('mw-content-text') || document.body;
    if (!contentContainer) return;

    injectStyles();

    rawTemplates.mod1 = await loadMarkdownFile('modul_1.md');
    rawTemplates.mod2 = await loadMarkdownFile('modul_2.md');

    const modulesWrapper = document.createElement('div');
    modulesWrapper.className = 'mw-parser-output de-modules-container';
    
    modulesWrapper.innerHTML = `
        <div id="wrapper-app-1" class="de-stealth-module">
            <div id="config-app-1"></div>
            <div id="content-app-1"></div>
        </div>
        <div id="wrapper-app-2" class="de-stealth-module">
            <div id="config-app-2"></div>
            <div id="content-app-2"></div>
        </div>
    `;

    contentContainer.appendChild(modulesWrapper);

    buildConfigTable('config-app-1', keysMod1);
    buildConfigTable('config-app-2', keysMod2);
    renderUpdates();

    const wrapper1 = document.getElementById('wrapper-app-1');
    const wrapper2 = document.getElementById('wrapper-app-2');

    // Навешиваем события с передачей объекта { signal }
    document.addEventListener('keydown', (event) => {
        // Хоткеи открытия
        if (event.altKey && event.code === 'Digit1') {
            event.preventDefault();
            wrapper1.classList.toggle('active');
            if (wrapper1.classList.contains('active')) wrapper1.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (event.altKey && event.code === 'Digit2') {
            event.preventDefault();
            wrapper2.classList.toggle('active');
            if (wrapper2.classList.contains('active')) wrapper2.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Нестандартная паник-кнопка Ctrl+Shift+0
        if (event.ctrlKey && event.shiftKey && event.code === 'Digit0') {
            event.preventDefault();
            panicHide();
        }

        // Логика каскадного Esc
        if (event.code === 'Escape') {
            panicHide(); // Скрываем при первом же нажатии
            
            escCount++;
            clearTimeout(escTimeout);
            
            if (escCount >= 3) {
                destroyExtension(); // Тройной клик - полное удаление
            } else {
                // Если не нажали 3 раза за 700мс - счетчик сбрасывается
                escTimeout = setTimeout(() => { escCount = 0; }, 700); 
            }
        }
    }, { signal });

    // Детект ухода мыши в верхнюю часть окна
    document.addEventListener('mouseleave', (event) => {
        if (event.clientY <= 10) {
            panicHide();
        }
    }, { signal });

    // Детект потери фокуса окна и смены вкладки
    window.addEventListener('blur', panicHide, { signal });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) panicHide();
    }, { signal });
}

injectModules();