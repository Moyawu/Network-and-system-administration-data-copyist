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
    style.id = 'de-stealth-styles'; 
    
    style.textContent = `
        .de-stealth-module { display: none; margin-top: 15px; font-size: 13px; } /* Чуть увеличили базу */
        .de-stealth-module.active { display: block; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .stealth-table { 
            width: 100%; border-collapse: collapse; margin-bottom: 0.8em; 
            font-size: 13px; font-family: sans-serif; color: #202122; /* Читаемый размер для таблицы конфига */
        }
        .stealth-table tr { border-bottom: 1px solid #eaecf0; }
        .stealth-table td { padding: 0.3em 0.6em; } /* Дали чуть больше воздуха ячейкам */
        .stealth-table td:first-child { 
            background-color: #f8f9fa; color: #54595d; width: 25%; 
            user-select: none; font-weight: 500;
        }
        .stealth-table td:last-child { cursor: text; background-color: transparent; }
        
        .stealth-input { 
            width: 100%; background: transparent; border: none; outline: none; 
            font-family: monospace; font-size: 13px; color: #202122; padding: 0;
        }

        /* Настройки скрытого кода - возвращаем читабельность */
        .de-stealth-module pre {
            display: none; 
            background-color: #f8f9fa !important;
            border: 1px solid #eaecf0 !important;
            padding: 0.8em 1em !important; /* Увеличили внутренние отступы, чтобы текст не лип к краям */
            color: #202122 !important;
            white-space: pre-wrap !important;
            font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace !important;
            font-size: 13px !important; /* Было 11px - стало нормально */
            line-height: 1.35 !important; /* Было 1.15 - раздвинули строки */
            border-radius: 2px;
            margin: 0 0 0.8em 0 !important;
            cursor: pointer;
            max-height: 400px; /* Чуть увеличили высоту видимой области, раз шрифт стал больше */
            overflow-y: auto !important;
        }
        
        .de-stealth-module pre.unstealth {
            display: block !important;
        }

        .de-stealth-module pre::-webkit-scrollbar { width: 6px; }
        .de-stealth-module pre::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
        
        .de-stealth-module pre.copied-success {
            background-color: #e8f9ee !important;
            border-color: #a3d9b8 !important;
        }

        .de-stealth-module h1, .de-stealth-module h2, .de-stealth-module h3, .de-stealth-module h4 {
            margin: 0.8em 0 0.4em 0 !important;
            font-size: 15px !important; /* Чуть крупнее, чтобы выделялись */
            border-bottom: none !important;
            cursor: pointer; 
            transition: color 0.2s ease;
            user-select: none;
        }
        
        .de-stealth-module p { margin: 0 0 0.6em 0 !important; }
        .de-stealth-module ul, .de-stealth-module ol { margin: 0 0 0.6em 0 !important; padding-left: 1.5em !important; }
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

    const container = document.querySelector('.de-modules-container');
    addInvisibleCopy(container); // На случай, если ты раскроешь код и кликнешь по нему
    setupStealthHeadings(container); // Подвязываем магию к заголовкам
}

// НОВАЯ ФУНКЦИЯ: Привязка копирования и отображения к заголовкам
function setupStealthHeadings(container) {
    if (!container) return;
    const headings = container.querySelectorAll('h1, h2, h3, h4');

    headings.forEach(heading => {
        let nextEl = heading.nextElementSibling;
        let targetPre = null;
        
        // Ищем ближайший блок <pre> после заголовка
        while (nextEl && !nextEl.tagName.match(/^H[1-6]$/)) {
            if (nextEl.tagName === 'PRE') {
                targetPre = nextEl;
                break;
            }
            nextEl = nextEl.nextElementSibling;
        }

        if (targetPre) {
            // ЛКМ (Обычный клик) - Копируем скрытый код
            heading.addEventListener('click', (e) => {
                if (window.getSelection().toString().length > 0) return;
                
                const textToCopy = targetPre.innerText.trim();
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Мигаем заголовком зеленым цветом
                    const originalColor = heading.style.color;
                    heading.style.color = '#27ae60'; 
                    setTimeout(() => { heading.style.color = originalColor; }, 300);
                });
            });

            // ПКМ (Правый клик) - Показать/Скрыть код
            heading.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Глушим появление стандартного меню браузера
                targetPre.classList.toggle('unstealth');
            });
        }
    });
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
                    e.stopPropagation(); 
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
                setTimeout(() => this.classList.remove('copied-success'), 200); 
            });
        };
    });
}

// === Логика стелс-контроля ===

function panicHide() {
    const wrapper1 = document.getElementById('wrapper-app-1');
    const wrapper2 = document.getElementById('wrapper-app-2');
    if (wrapper1) wrapper1.classList.remove('active');
    if (wrapper2) wrapper2.classList.remove('active');
}

function destroyExtension() {
    const container = document.querySelector('.de-modules-container');
    if (container) container.remove();

    const style = document.getElementById('de-stealth-styles');
    if (style) style.remove();

    abortController.abort();
}

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

    document.addEventListener('keydown', (event) => {
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

        if (event.ctrlKey && event.shiftKey && event.code === 'Digit0') {
            event.preventDefault();
            panicHide();
        }

        if (event.code === 'Escape') {
            panicHide(); 
            
            escCount++;
            clearTimeout(escTimeout);
            
            if (escCount >= 3) {
                destroyExtension();
            } else {
                escTimeout = setTimeout(() => { escCount = 0; }, 700); 
            }
        }
    }, { signal });

    document.addEventListener('mouseleave', (event) => {
        if (event.clientY <= 10) {
            panicHide();
        }
    }, { signal });

    window.addEventListener('blur', panicHide, { signal });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) panicHide();
    }, { signal });
}

injectModules();