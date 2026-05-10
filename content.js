const abortController = new AbortController();
const { signal } = abortController;

// Эталонный (заводской) конфиг
const defaultConfig = {
    "DOMAIN": "au-team.irpo", "PASS_MAIN": "P@ssw0rd",
    "ISP_IP_1": "172.16.1.1", "ISP_IP_2": "172.16.2.1",
    "ISP_NET_1": "172.16.1.0/28", "ISP_NET_2": "172.16.2.0/28",
    "HQ_RTR_EXT": "172.16.1.2", "HQ_RTR_V100": "192.168.100.1",
    "HQ_RTR_V200": "192.168.200.1", "HQ_RTR_V999": "192.168.99.1",
    "HQ_SRV_IP_M1": "192.168.100.2", "BR_RTR_EXT": "172.16.2.2",
    "BR_RTR_INT_M1": "192.168.1.1", "BR_SRV_IP_M1": "192.168.1.2",
    "TUNNEL_HQ": "10.10.10.1", "TUNNEL_BR": "10.10.10.2",
    "HQ_SRV_IP_M2": "192.168.1.10", "HQ_CLI_IP_M2": "192.168.2.10",
    "BR_SRV_IP_M2": "192.168.3.10", "HQ_RTR_INT_M2": "192.168.1.1", 
    "BR_RTR_INT_M2": "192.168.3.1", "HQ_NGINX_PROXY": "172.16.1.10",
    "BR_NGINX_PROXY": "172.16.2.10", "SSH_PORT_M1": "2025", "SSH_PORT_M2": "2026"
};

// Текущий конфиг (изначально равен эталонному)
let netConfig = { ...defaultConfig };

// Восстанавливаем из памяти, если есть
const savedConfig = localStorage.getItem('de_stealth_config');
if (savedConfig) netConfig = JSON.parse(savedConfig);

function saveConfig() {
    localStorage.setItem('de_stealth_config', JSON.stringify(netConfig));
}

const keysMod1 = ["DOMAIN", "PASS_MAIN", "ISP_IP_1", "ISP_IP_2", "ISP_NET_1", "ISP_NET_2", "HQ_RTR_EXT", "HQ_RTR_V100", "HQ_RTR_V200", "HQ_RTR_V999", "HQ_SRV_IP_M1", "BR_RTR_EXT", "BR_RTR_INT_M1", "BR_SRV_IP_M1", "TUNNEL_HQ", "TUNNEL_BR", "SSH_PORT_M1"];
const keysMod2 = ["DOMAIN", "PASS_MAIN", "ISP_IP_1", "ISP_IP_2", "ISP_NET_1", "ISP_NET_2", "HQ_SRV_IP_M2", "HQ_CLI_IP_M2", "BR_SRV_IP_M2", "HQ_RTR_INT_M2", "BR_RTR_INT_M2", "HQ_NGINX_PROXY", "BR_NGINX_PROXY", "SSH_PORT_M2"];

let rawTemplates = { mod1: "", mod2: "" };

async function loadMarkdownFile(filename) {
    try {
        const response = await fetch(chrome.runtime.getURL(filename));
        return await response.text();
    } catch { return "Ошибка загрузки"; }
}

// Микро-уведомления для стелс-действий
function showStealthNotification(msg, isError = false) {
    const notif = document.createElement('div');
    notif.innerText = msg;
    Object.assign(notif.style, {
        position: 'fixed', top: '10px', right: '10px', 
        background: '#f8f9fa', color: isError ? '#c0392b' : '#27ae60',
        border: `1px solid ${isError ? '#e74c3c' : '#2ecc71'}`,
        padding: '6px 12px', fontSize: '12px', borderRadius: '3px', 
        zIndex: '999999', fontFamily: 'monospace', 
        opacity: '0', transition: 'opacity 0.2s', pointerEvents: 'none'
    });
    document.body.appendChild(notif);
    setTimeout(() => notif.style.opacity = '1', 10);
    setTimeout(() => { 
        notif.style.opacity = '0'; 
        setTimeout(() => notif.remove(), 200); 
    }, 2000);
}

function injectStyles() {
    const style = document.createElement('style');
    style.id = 'de-stealth-styles'; 
    style.textContent = `
        .de-stealth-module { display: none; margin-top: 15px; font-size: 13px; }
        .de-stealth-module.active { display: block; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .stealth-table { width: 100%; border-collapse: collapse; margin-bottom: 0.8em; font-size: 13px; font-family: sans-serif; color: #202122; }
        .stealth-table tr { border-bottom: 1px solid #eaecf0; }
        .stealth-table td { padding: 0.3em 0.6em; }
        .stealth-table td:first-child { background-color: #f8f9fa; color: #54595d; width: 25%; user-select: none; font-weight: 500; }
        .stealth-input { width: 100%; background: transparent; border: none; outline: none; font-family: monospace; font-size: 13px; color: #202122; padding: 0; }
        
        .stealth-btn { background: #fff; border: 1px solid #ccc; border-radius: 3px; padding: 3px 8px; font-size: 12px; cursor: pointer; margin-right: 5px; transition: 0.1s; color: #333;}
        .stealth-btn:hover { background: #eee; }
        .stealth-btn:active { background: #ddd; }

        .de-stealth-module pre { display: none; background-color: #f8f9fa !important; border: 1px solid #eaecf0 !important; padding: 0.8em 1em !important; color: #202122 !important; white-space: pre-wrap !important; font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace !important; font-size: 13px !important; line-height: 1.35 !important; border-radius: 2px; margin: 0 0 0.8em 0 !important; cursor: pointer; max-height: 400px; overflow-y: auto !important; }
        .de-stealth-module pre.unstealth { display: block !important; }
        .de-stealth-module pre::-webkit-scrollbar { width: 6px; }
        .de-stealth-module pre::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
        .de-stealth-module pre.copied-success { background-color: #e8f9ee !important; border-color: #a3d9b8 !important; }
        
        .de-stealth-module h1, .de-stealth-module h2, .de-stealth-module h3, .de-stealth-module h4 { margin: 0.8em 0 0.4em 0 !important; font-size: 15px !important; border-bottom: none !important; cursor: pointer; transition: color 0.2s ease; user-select: none; }
        .de-stealth-module p, .de-stealth-module ul, .de-stealth-module ol { margin: 0 0 0.6em 0 !important; }
    `;
    document.head.appendChild(style);
}

// Умный парсинг текста из PDF
function parseExamText(text) {
    let updated = false;
    const domainMatch = text.match(/(?:DNS-суффикс|Имя домена)[\s\-—]+([a-z0-9.-]+)/i);
    if (domainMatch) { netConfig["DOMAIN"] = domainMatch[1]; updated = true; }
    
    const passMatch = text.match(/паролем\s+([A-Za-z0-9@!#$%^&*()_+]+)/i);
    if (passMatch) { netConfig["PASS_MAIN"] = passMatch[1]; updated = true; }
    
    const portMatch = text.match(/(?:порт|Идентификатор пользователя)\s+(\d{4,5})/i);
    if (portMatch) { netConfig["SSH_PORT_M1"] = portMatch[1]; netConfig["SSH_PORT_M2"] = portMatch[1]; updated = true; }
    
    const ispMatch = [...text.matchAll(/сети\s+(\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2})/g)];
    if (ispMatch.length >= 1) { netConfig["ISP_NET_1"] = ispMatch[0][1]; updated = true; }
    if (ispMatch.length >= 2) { netConfig["ISP_NET_2"] = ispMatch[1][1]; updated = true; }
    
    return updated;
}

// Генератор уникальных и правильных IP
function generateUniqueIPs() {
    const x = Math.floor(Math.random() * 200) + 10; // Подсеть для HQ
    const y = Math.floor(Math.random() * 200) + 10; // Подсеть для BR
    const z = Math.floor(Math.random() * 200) + 10; // Туннель

    netConfig["HQ_RTR_V100"] = `10.${x}.100.1`;  
    netConfig["HQ_SRV_IP_M1"] = `10.${x}.100.2`;
    netConfig["HQ_SRV_IP_M2"] = `10.${x}.100.10`;

    netConfig["HQ_RTR_V200"] = `10.${x}.200.1`;  
    netConfig["HQ_CLI_IP_M2"] = `10.${x}.200.10`;

    netConfig["HQ_RTR_V999"] = `10.${x}.99.1`;   

    netConfig["BR_RTR_INT_M1"] = `10.${y}.1.1`;  
    netConfig["BR_SRV_IP_M1"] = `10.${y}.1.2`;
    netConfig["BR_RTR_INT_M2"] = `10.${y}.1.1`;
    netConfig["BR_SRV_IP_M2"] = `10.${y}.1.10`;

    netConfig["TUNNEL_HQ"] = `192.168.${z}.1`;   
    netConfig["TUNNEL_BR"] = `192.168.${z}.2`;
    
    saveConfig();
}

function compileContent(rawMd) {
    let content = rawMd;
    for (const [key, value] of Object.entries(netConfig)) {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return typeof marked !== 'undefined' ? marked.parse(content) : `<pre>${content}</pre>`;
}

function renderUpdates() {
    const mod1Content = document.getElementById('content-app-1');
    const mod2Content = document.getElementById('content-app-2');
    if (mod1Content) mod1Content.innerHTML = compileContent(rawTemplates.mod1);
    if (mod2Content) mod2Content.innerHTML = compileContent(rawTemplates.mod2);
    
    const container = document.querySelector('.de-modules-container');
    addInvisibleCopy(container); 
    setupStealthHeadings(container); 
}

function setupStealthHeadings(container) {
    if (!container) return;
    container.querySelectorAll('h1, h2, h3, h4').forEach(heading => {
        let nextEl = heading.nextElementSibling;
        let targetPre = null;
        while (nextEl && !nextEl.tagName.match(/^H[1-6]$/)) {
            if (nextEl.tagName === 'PRE') { targetPre = nextEl; break; }
            nextEl = nextEl.nextElementSibling;
        }
        if (targetPre) {
            heading.addEventListener('click', () => {
                if (window.getSelection().toString().length > 0) return;
                navigator.clipboard.writeText(targetPre.innerText.trim()).then(() => {
                    const originalColor = heading.style.color;
                    heading.style.color = '#27ae60'; 
                    setTimeout(() => { heading.style.color = originalColor; }, 300);
                });
            });
            heading.addEventListener('contextmenu', (e) => {
                e.preventDefault(); 
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

    // Панель инструментов
    if (containerId === 'config-app-1') {
        const toolRow = table.insertRow();
        toolRow.innerHTML = `
            <td colspan="2" style="background: #eef2f5; text-align: center;">
                <button id="btn-paste" class="stealth-btn" title="Спарсить данные из буфера обмена (Alt+3)">📋 Из буфера</button>
                <button id="btn-gen" class="stealth-btn" title="Сгенерировать случайные правильные IP">🎲 Авто-IP</button>
                <button id="btn-reset" class="stealth-btn" title="Сбросить все настройки к исходным">🔄 Сброс</button>
            </td>
        `;
        
        toolRow.querySelector('#btn-paste').addEventListener('click', async function() {
            try {
                const text = await navigator.clipboard.readText();
                if (parseExamText(text)) {
                    this.innerText = "✅ Готово!";
                    this.style.color = "green";
                    saveConfig();
                    renderUpdates();
                    setTimeout(() => { buildConfigTable('config-app-1', keysMod1); buildConfigTable('config-app-2', keysMod2); }, 500);
                } else {
                    this.innerText = "⚠️ Не найдено";
                    this.style.color = "red";
                }
                setTimeout(() => { this.innerText = "📋 Из буфера"; this.style.color = ""; }, 2000);
            } catch (err) { alert("Разреши чтение буфера в браузере!"); }
        });

        toolRow.querySelector('#btn-gen').addEventListener('click', function() {
            generateUniqueIPs();
            this.innerText = "✅ IP созданы!";
            renderUpdates();
            setTimeout(() => { buildConfigTable('config-app-1', keysMod1); buildConfigTable('config-app-2', keysMod2); }, 100);
            setTimeout(() => { this.innerText = "🎲 Авто-IP"; }, 2000);
        });

        // ЛОГИКА СБРОСА НАСТРОЕК
        toolRow.querySelector('#btn-reset').addEventListener('click', function() {
            netConfig = { ...defaultConfig }; // Восстанавливаем из эталонного
            saveConfig(); // Перезаписываем память
            this.innerText = "✅ Сброшено!";
            renderUpdates(); // Обновляем markdown
            setTimeout(() => { buildConfigTable('config-app-1', keysMod1); buildConfigTable('config-app-2', keysMod2); }, 100);
            setTimeout(() => { this.innerText = "🔄 Сброс"; }, 2000);
        });
    }

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
                    saveConfig();
                    renderUpdates();
                }
                if (e.key === 'Escape') { e.stopPropagation(); this.innerText = currentText; }
            });
            input.addEventListener('blur', () => { this.innerText = netConfig[key]; });
        });
    }
    container.appendChild(table);
}

function addInvisibleCopy(container) {
    if (!container) return;
    container.querySelectorAll('pre').forEach(pre => {
        pre.onclick = function() {
            if (window.getSelection().toString().length > 0) return;
            navigator.clipboard.writeText(this.innerText.trim()).then(() => {
                this.classList.add('copied-success');
                setTimeout(() => this.classList.remove('copied-success'), 200); 
            });
        };
    });
}

function panicHide() {
    document.querySelectorAll('.de-stealth-module').forEach(m => m.classList.remove('active'));
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
        <div id="wrapper-app-1" class="de-stealth-module"><div id="config-app-1"></div><div id="content-app-1"></div></div>
        <div id="wrapper-app-2" class="de-stealth-module"><div id="config-app-2"></div><div id="content-app-2"></div></div>
    `;
    contentContainer.appendChild(modulesWrapper);

    buildConfigTable('config-app-1', keysMod1);
    buildConfigTable('config-app-2', keysMod2);
    renderUpdates();

    const wrapper1 = document.getElementById('wrapper-app-1');
    const wrapper2 = document.getElementById('wrapper-app-2');

    document.addEventListener('keydown', (event) => {
        if (event.altKey && event.code === 'Digit1') { event.preventDefault(); wrapper1.classList.toggle('active'); if (wrapper1.classList.contains('active')) wrapper1.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        if (event.altKey && event.code === 'Digit2') { event.preventDefault(); wrapper2.classList.toggle('active'); if (wrapper2.classList.contains('active')) wrapper2.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        if (event.ctrlKey && event.shiftKey && event.code === 'Digit0') { event.preventDefault(); panicHide(); }
        
        // === НОВЫЙ ХОТКЕЙ: Alt + 3 (Стелс-перехват из буфера) ===
        if (event.altKey && event.code === 'Digit3') {
            event.preventDefault();
            navigator.clipboard.readText().then(text => {
                if (parseExamText(text)) {
                    saveConfig();
                    renderUpdates();
                    // Обновляем таблицы в фоне, если они открыты
                    buildConfigTable('config-app-1', keysMod1);
                    buildConfigTable('config-app-2', keysMod2);
                    showStealthNotification("✅ Данные загружены!");
                } else {
                    showStealthNotification("⚠️ Нет нужных данных", true);
                }
            }).catch(() => {
                showStealthNotification("⚠️ Разреши чтение буфера!", true);
            });
        }

        if (event.code === 'Escape') {
            panicHide(); 
            escCount++; clearTimeout(escTimeout);
            if (escCount >= 3) destroyExtension();
            else escTimeout = setTimeout(() => { escCount = 0; }, 700); 
        }
    }, { signal });

    document.addEventListener('mouseleave', (event) => { if (event.clientY <= 10) panicHide(); }, { signal });
    window.addEventListener('blur', panicHide, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) panicHide(); }, { signal });
}

injectModules();