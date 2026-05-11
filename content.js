const abortController = new AbortController();
const { signal } = abortController;

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

let netConfig = { ...defaultConfig };
const keysMod1 = ["DOMAIN", "PASS_MAIN", "ISP_IP_1", "ISP_IP_2", "ISP_NET_1", "ISP_NET_2", "HQ_RTR_EXT", "HQ_RTR_V100", "HQ_RTR_V200", "HQ_RTR_V999", "HQ_SRV_IP_M1", "BR_RTR_EXT", "BR_RTR_INT_M1", "BR_SRV_IP_M1", "TUNNEL_HQ", "TUNNEL_BR", "SSH_PORT_M1"];
const keysMod2 = ["DOMAIN", "PASS_MAIN", "ISP_IP_1", "ISP_IP_2", "ISP_NET_1", "ISP_NET_2", "HQ_SRV_IP_M2", "HQ_CLI_IP_M2", "BR_SRV_IP_M2", "HQ_RTR_INT_M2", "BR_RTR_INT_M2", "HQ_NGINX_PROXY", "BR_NGINX_PROXY", "SSH_PORT_M2"];
const devices = ['ISP', 'HQ-RTR', 'HQ-SRV', 'HQ-CLI', 'BR-RTR', 'BR-SRV'];

let rawTemplates = { mod1: "", mod2: "" };
let parsedBlocks = { mod1: {}, mod2: {} };
let activeModule = 1; 
let ghostBuffer = "";

// Состояние "Режима Хакера"
let hackermanMode = false;
let hackermanText = "";
let hackermanIndex = 0;

function isContextValid() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
}

function saveGlobalState() {
    if (isContextValid()) {
        chrome.storage.local.set({ netConfig, ghostBuffer, activeModule }).catch(() => {});
    }
}

if (isContextValid() && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.netConfig) {
            netConfig = changes.netConfig.newValue;
            if (document.getElementById('mw-content-text')) renderUpdates();
        }
        if (changes.ghostBuffer) ghostBuffer = changes.ghostBuffer.newValue;
        if (changes.activeModule) activeModule = changes.activeModule.newValue;
    });
}

async function loadMarkdownFile(filename) {
    if (!isContextValid()) return "Обновите страницу (F5)";
    try {
        const response = await fetch(chrome.runtime.getURL(filename));
        return await response.text();
    } catch { return "Ошибка загрузки"; }
}

function flashStealthBorder(color) {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        pointerEvents: 'none', zIndex: '99999999', transition: 'opacity 0.4s ease',
        boxShadow: `inset 0 0 0 1px ${color}`, opacity: '0.4'
    });
    document.body.appendChild(overlay);
    setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 400); }, 1500);
}

function flashElementText(el) {
    const originalColor = el.style.color;
    const originalTransition = el.style.transition;
    el.style.transition = 'color 0.2s';
    el.style.color = '#27ae60';
    setTimeout(() => {
        el.style.color = originalColor;
        setTimeout(() => el.style.transition = originalTransition, 200);
    }, 300);
}

// === ФУНКЦИЯ ВВОДА 1 СИМВОЛА ===
function typeSingleCharacter(char) {
    let target = document.activeElement;
    
    // Ищем терминал Proxmox
    if (!target || target === document.body || target.tagName === 'IFRAME') {
        target = document.querySelector('textarea.xterm-helper-textarea') || 
                 document.querySelector('.xterm-helper-textarea') || 
                 document.querySelector('canvas') || 
                 document.body;
    }
    
    if (target) {
        target.focus();
        if (typeof target.click === 'function') target.click();
    }

    const isXterm = target.classList && target.classList.contains('xterm-helper-textarea');
    const isCanvas = target.tagName === 'CANVAS';

    if (isXterm) {
        target.value = char === '\n' ? '\r' : char;
        target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    } else if (isCanvas) {
        const key = char === '\n' ? 'Enter' : char;
        const code = char === '\n' ? 'Enter' : 'Key' + char.toUpperCase();
        const keyCode = char === '\n' ? 13 : char.charCodeAt(0);
        
        const opts = { key, code, keyCode, which: keyCode, bubbles: true, cancelable: true, composed: true };
        target.dispatchEvent(new KeyboardEvent('keydown', opts));
        target.dispatchEvent(new KeyboardEvent('keypress', opts));
        target.dispatchEvent(new KeyboardEvent('keyup', opts));
    } else {
        const keyCode = char === '\n' ? 13 : char.charCodeAt(0);
        const opts = { key: char === '\n' ? 'Enter' : char, keyCode, which: keyCode, bubbles: true, cancelable: true, composed: true };
        
        target.dispatchEvent(new KeyboardEvent('keydown', opts));
        if (char !== '\n' && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
            target.value += char;
            target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        }
        target.dispatchEvent(new KeyboardEvent('keyup', opts));
    }
}

function parseMarkdownToBlocks(mdText, config) {
    let content = mdText;
    for (const [key, value] of Object.entries(config)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    const lines = content.split('\n');
    const blocks = {};
    let currentTargets = [];
    let currentCode = [];
    let inCodeBlock = false;

    for (const line of lines) {
        const isHeading = line.match(/^#{1,4}\s+|^\\\s+/); 
        if (isHeading && !inCodeBlock) {
            if (currentTargets.length > 0 && currentCode.length > 0) saveExtractedCode(blocks, currentTargets, currentCode);
            currentTargets = devices.filter(d => line.includes(d));
            currentCode = [];
        } else {
            if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
            if (currentTargets.length > 0 && inCodeBlock) currentCode.push(line);
        }
    }
    if (currentTargets.length > 0 && currentCode.length > 0) saveExtractedCode(blocks, currentTargets, currentCode);
    return blocks;
}

function saveExtractedCode(blocks, targets, codeLines) {
    const cleanCode = codeLines.join('\n').trim();
    targets.forEach(t => { blocks[t] = blocks[t] ? blocks[t] + '\n\n' + cleanCode : cleanCode; });
}

function updateParsedData() {
    parsedBlocks.mod1 = parseMarkdownToBlocks(rawTemplates.mod1, netConfig);
    parsedBlocks.mod2 = parseMarkdownToBlocks(rawTemplates.mod2, netConfig);
}

function compileContent(rawMd) {
    let content = rawMd;
    for (const [key, value] of Object.entries(netConfig)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return typeof marked !== 'undefined' ? marked.parse(content) : `<pre>${content}</pre>`;
}

function renderUpdates() {
    updateParsedData(); 
    const mod1Content = document.getElementById('content-app-1');
    const mod2Content = document.getElementById('content-app-2');
    if (mod1Content) mod1Content.innerHTML = compileContent(rawTemplates.mod1);
    if (mod2Content) mod2Content.innerHTML = compileContent(rawTemplates.mod2);
    
    buildConfigTable('config-app-1', keysMod1);
    buildConfigTable('config-app-2', keysMod2);

    const container = document.querySelector('.de-modules-container');
    addInvisibleCopy(container); 
}

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

function generateUniqueIPs() {
    const x = Math.floor(Math.random() * 200) + 10;
    const y = Math.floor(Math.random() * 200) + 10;
    const z = Math.floor(Math.random() * 200) + 10;
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
    saveGlobalState(); 
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
        .de-stealth-module pre { display: none; background-color: #f8f9fa !important; border: 1px solid #eaecf0 !important; padding: 0.8em 1em !important; color: #202122 !important; white-space: pre-wrap !important; font-family: monospace !important; font-size: 13px !important; line-height: 1.35 !important; border-radius: 2px; margin: 0 0 0.8em 0 !important; cursor: pointer; max-height: 400px; overflow-y: auto !important; }
        .de-stealth-module pre.unstealth { display: block !important; }
        .de-stealth-module pre.copied-success { background-color: #e8f9ee !important; border-color: #a3d9b8 !important; }
        .de-stealth-module h1, .de-stealth-module h2, .de-stealth-module h3, .de-stealth-module h4 { margin: 0.8em 0 0.4em 0 !important; font-size: 15px !important; border-bottom: none !important; cursor: pointer; transition: color 0.2s ease; user-select: none; }
    `;
    document.head.appendChild(style);
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
                    saveGlobalState(); renderUpdates();
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
    
    container.querySelectorAll('h1, h2, h3, h4').forEach(heading => {
        let nextEl = heading.nextElementSibling;
        let targetPre = null;
        while (nextEl && !nextEl.tagName.match(/^H[1-6]$/)) {
            if (nextEl.tagName === 'PRE') { targetPre = nextEl; break; }
            nextEl = nextEl.nextElementSibling;
        }
        if (targetPre) {
            heading.onclick = function() {
                if (window.getSelection().toString().length > 0) return;
                const text = targetPre.innerText.trim();
                navigator.clipboard.writeText(text).then(() => {
                    ghostBuffer = text; 
                    saveGlobalState(); 
                    flashElementText(heading); 
                });
            };
            heading.oncontextmenu = function(e) {
                e.preventDefault(); targetPre.classList.toggle('unstealth');
            };
        }
    });

    container.querySelectorAll('pre').forEach(pre => {
        pre.onclick = function() {
            if (window.getSelection().toString().length > 0) return;
            const text = this.innerText.trim();
            navigator.clipboard.writeText(text).then(() => {
                ghostBuffer = text; 
                saveGlobalState(); 
                this.classList.add('copied-success');
                setTimeout(() => this.classList.remove('copied-success'), 200); 
            });
        };
    });
}

function panicHide() {
    document.querySelectorAll('.de-stealth-module').forEach(m => m.classList.remove('active'));
}

async function injectModules() {
    rawTemplates.mod1 = await loadMarkdownFile('modul_1.md');
    rawTemplates.mod2 = await loadMarkdownFile('modul_2.md');
    updateParsedData();

    const contentContainer = document.getElementById('mw-content-text');
    if (contentContainer) {
        injectStyles();
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
    }

    document.addEventListener('click', (e) => {
        const text = e.target.innerText || e.target.textContent;
        if (!text) return;
        
        const targetDevice = devices.find(d => text.trim().includes(d));
        
        if (targetDevice) {
            const activeModKey = `mod${activeModule}`;
            const codeToCopy = parsedBlocks[activeModKey][targetDevice];
            
            if (codeToCopy) {
                navigator.clipboard.writeText(codeToCopy).then(() => {
                    ghostBuffer = codeToCopy;
                    saveGlobalState(); 
                    flashElementText(e.target); 
                });
            }
        }
    }, { signal });

    // === ГЛОБАЛЬНЫЙ ПЕРЕХВАТЧИК КЛАВИАТУРЫ (С параметром capture: true) ===
    window.addEventListener('keydown', async (event) => {
        // Игнорируем наши собственные сгенерированные события, чтобы не зациклить
        if (!event.isTrusted) return; 

        // 1. ЛОГИКА РЕЖИМА ХАКЕРА (Перехват каждого нажатия)
        if (hackermanMode) {
            // Если нажали Esc - экстренно отменяем
            if (event.code === 'Escape') {
                hackermanMode = false;
                flashStealthBorder('#e74c3c'); // Красный
                return;
            }

            // Игнорируем служебные клавиши (Shift, Alt, Ctrl), чтобы они не тратили буквы
            if (['AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight', 'CapsLock', 'Tab'].includes(event.code)) {
                return;
            }

            // Блокируем реальное нажатие клавиши
            event.preventDefault();
            event.stopImmediatePropagation();

            // Берем правильную букву из скрипта и отправляем в консоль
            const char = hackermanText[hackermanIndex];
            typeSingleCharacter(char);

            hackermanIndex++;
            
            // Если скрипт закончился - выходим из режима хакера
            if (hackermanIndex >= hackermanText.length) {
                hackermanMode = false;
                flashStealthBorder('#27ae60'); // Зеленый (Успех)
            }
            return;
        }

        // 2. СТАНДАРТНЫЕ ГОРЯЧИЕ КЛАВИШИ
        if (event.altKey && event.code === 'Digit1') { 
            event.preventDefault(); activeModule = 1; saveGlobalState();
            flashStealthBorder('#bdc3c7'); 
            const wrapper1 = document.getElementById('wrapper-app-1');
            const wrapper2 = document.getElementById('wrapper-app-2');
            if (wrapper1) { wrapper1.classList.toggle('active'); wrapper2?.classList.remove('active'); }
        }
        
        if (event.altKey && event.code === 'Digit2') { 
            event.preventDefault(); activeModule = 2; saveGlobalState();
            flashStealthBorder('#7f8c8d'); 
            const wrapper1 = document.getElementById('wrapper-app-1');
            const wrapper2 = document.getElementById('wrapper-app-2');
            if (wrapper2) { wrapper2.classList.toggle('active'); wrapper1?.classList.remove('active'); }
        }
        
        if (event.altKey && event.code === 'Digit3') {
            event.preventDefault();
            navigator.clipboard.readText().then(text => {
                if (parseExamText(text)) {
                    saveGlobalState(); renderUpdates();
                    flashStealthBorder('#27ae60'); 
                }
            });
        }

        if (event.altKey && event.code === 'Digit4') {
            event.preventDefault();
            generateUniqueIPs(); renderUpdates();
            flashStealthBorder('#2980b9'); 
        }

        if (event.altKey && event.code === 'Digit5') {
            event.preventDefault();
            netConfig = { ...defaultConfig };
            saveGlobalState(); renderUpdates();
            flashStealthBorder('#f39c12'); 
        }

        // === АКТИВАЦИЯ РЕЖИМА ХАКЕРА (Alt + V) ===
        if (event.altKey && event.code === 'KeyV') {
            event.preventDefault();
            event.stopImmediatePropagation();
            
            let textToType = ghostBuffer;
            if (!textToType) {
                try { textToType = await navigator.clipboard.readText(); } catch(e) {}
            }

            if (textToType) {
                hackermanMode = true;
                hackermanIndex = 0;
                hackermanText = textToType.replace(/\r\n/g, '\n');
                flashStealthBorder('#9b59b6'); // Фиолетовый (Заряжено, можно печатать)
            } else {
                flashStealthBorder('#c0392b'); // Красный (Буфер пуст)
            }
        }

        if (event.ctrlKey && event.shiftKey && event.code === 'Digit0') { event.preventDefault(); panicHide(); }
        if (event.code === 'Escape') { panicHide(); }
    }, { capture: true, signal }); // <-- КРИТИЧНО: capture: true перехватывает клавиши ДО того, как их увидит Proxmox

    document.addEventListener('mouseleave', (event) => { if (event.clientY <= 10) panicHide(); }, { signal });
    window.addEventListener('blur', panicHide, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) panicHide(); }, { signal });
}

if (isContextValid()) {
    chrome.storage.local.get(['netConfig', 'ghostBuffer', 'activeModule'], (res) => {
        if (chrome.runtime.lastError) { /* игнор */ }
        if (res.netConfig) netConfig = res.netConfig;
        if (res.ghostBuffer) ghostBuffer = res.ghostBuffer;
        if (res.activeModule) activeModule = res.activeModule;
        
        injectModules();
    });
} else {
    injectModules();
}