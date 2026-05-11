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
let parsedPhases = { mod1: { p1: {}, p2: {} }, mod2: { p1: {}, p2: {} } };
let activeModule = 1; 
let activePhase = 1; 
let ghostBuffer = "";

let hackermanMode = false;
let hackermanText = "";
let hackermanIndex = 0;
let typeLock = false; 

function isContextValid() { return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id; }

function saveGlobalState() {
    if (isContextValid()) chrome.storage.local.set({ netConfig, ghostBuffer, activeModule, activePhase }).catch(() => {});
}

if (isContextValid()) {
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.netConfig) { netConfig = changes.netConfig.newValue; if (document.getElementById('mw-content-text')) renderUpdates(); }
        if (changes.ghostBuffer) ghostBuffer = changes.ghostBuffer.newValue;
        if (changes.activeModule) activeModule = changes.activeModule.newValue;
        if (changes.activePhase) activePhase = changes.activePhase.newValue;
    });
}

const charMap = {
    '<': { code: 'Comma', shiftKey: true, keyCode: 188 }, '>': { code: 'Period', shiftKey: true, keyCode: 190 },
    '|': { code: 'Backslash', shiftKey: true, keyCode: 220 }, '\\': { code: 'Backslash', shiftKey: false, keyCode: 220 },
    '/': { code: 'Slash', shiftKey: false, keyCode: 191 }, '?': { code: 'Slash', shiftKey: true, keyCode: 191 },
    '-': { code: 'Minus', shiftKey: false, keyCode: 189 }, '_': { code: 'Minus', shiftKey: true, keyCode: 189 },
    '=': { code: 'Equal', shiftKey: false, keyCode: 187 }, '+': { code: 'Equal', shiftKey: true, keyCode: 187 },
    '[': { code: 'BracketLeft', shiftKey: false, keyCode: 219 }, '{': { code: 'BracketLeft', shiftKey: true, keyCode: 219 },
    ']': { code: 'BracketRight', shiftKey: false, keyCode: 221 }, '}': { code: 'BracketRight', shiftKey: true, keyCode: 221 },
    ';': { code: 'Semicolon', shiftKey: false, keyCode: 186 }, ':': { code: 'Semicolon', shiftKey: true, keyCode: 186 },
    "'": { code: 'Quote', shiftKey: false, keyCode: 222 }, '"': { code: 'Quote', shiftKey: true, keyCode: 222 },
    ',': { code: 'Comma', shiftKey: false, keyCode: 188 }, '.': { code: 'Period', shiftKey: false, keyCode: 190 },
    '`': { code: 'Backquote', shiftKey: false, keyCode: 192 }, '~': { code: 'Backquote', shiftKey: true, keyCode: 192 },
    '!': { code: 'Digit1', shiftKey: true, keyCode: 49 }, '@': { code: 'Digit2', shiftKey: true, keyCode: 50 },
    '#': { code: 'Digit3', shiftKey: true, keyCode: 51 }, '$': { code: 'Digit4', shiftKey: true, keyCode: 52 },
    '%': { code: 'Digit5', shiftKey: true, keyCode: 53 }, '^': { code: 'Digit6', shiftKey: true, keyCode: 54 },
    '&': { code: 'Digit7', shiftKey: true, keyCode: 55 }, '*': { code: 'Digit8', shiftKey: true, keyCode: 56 },
    '(': { code: 'Digit9', shiftKey: true, keyCode: 57 }, ')': { code: 'Digit0', shiftKey: true, keyCode: 48 },
    ' ': { code: 'Space', shiftKey: false, keyCode: 32 }
};

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
    el.style.transition = 'color 0.2s';
    el.style.color = '#27ae60';
    setTimeout(() => { el.style.color = originalColor; }, 300);
}

function typeSingleCharacter(char, isCtrl = false) {
    let target = document.activeElement;
    if (!target || target === document.body || target.tagName === 'IFRAME') {
        target = document.querySelector('textarea.xterm-helper-textarea') || document.querySelector('.xterm-helper-textarea') || document.querySelector('canvas') || document.body;
    }
    if (target) { target.focus(); if (typeof target.click === 'function') target.click(); }

    const isXterm = target.classList && target.classList.contains('xterm-helper-textarea');
    const isCanvas = target.tagName === 'CANVAS';

    let key = char, code = 'Unidentified', keyCode = char.charCodeAt(0), shiftKey = false;
    if (char === '\n') { key = 'Enter'; code = 'Enter'; keyCode = 13; }
    else if (char === 'Escape') { key = 'Escape'; code = 'Escape'; keyCode = 27; }
    else if (/[a-zA-Z]/.test(char)) { code = 'Key' + char.toUpperCase(); shiftKey = char === char.toUpperCase(); keyCode = char.toUpperCase().charCodeAt(0); }
    else if (/[0-9]/.test(char)) { code = 'Digit' + char; keyCode = char.charCodeAt(0); }
    else if (charMap[char]) { code = charMap[char].code; shiftKey = charMap[char].shiftKey; keyCode = charMap[char].keyCode; }

    if (isCtrl) keyCode = char.toUpperCase().charCodeAt(0);
    const opts = { key, code, keyCode, which: keyCode, bubbles: true, cancelable: true, composed: true, ctrlKey: isCtrl, shiftKey };

    target.dispatchEvent(new KeyboardEvent('keydown', opts));
    target.dispatchEvent(new KeyboardEvent('keypress', opts));
    if (isXterm) {
        let val = char;
        if (char === '\n') val = '\r'; else if (char === 'Escape') val = '\x1b';
        else if (isCtrl) val = String.fromCharCode(char.toUpperCase().charCodeAt(0) - 64);
        target.value = val; target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    } else if (!isCanvas) {
        if (char !== '\n' && char !== 'Escape' && !isCtrl && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
            target.value += char; target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        }
    }
    target.dispatchEvent(new KeyboardEvent('keyup', opts));
}

function parseMarkdownToPhases(mdText, config) {
    let content = mdText;
    for (const [key, value] of Object.entries(config)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    const lines = content.split('\n');
    const phaseData = { p1: {}, p2: {} };
    let currentTargets = [], currentCode = [], inCodeBlock = false;

    for (const line of lines) {
        const isHeading = line.match(/^#{1,4}\s+|^\\\s+/); 
        if (isHeading && !inCodeBlock) {
            if (currentTargets.length > 0 && currentCode.length > 0) {
                const isP2 = currentTargets.length > 1 || line.toLowerCase().includes('и') || line.toLowerCase().includes('final');
                const cleanCode = currentCode.join('\n').trim();
                currentTargets.forEach(t => {
                    const phase = isP2 ? phaseData.p2 : phaseData.p1;
                    phase[t] = phase[t] ? phase[t] + '\n\n' + cleanCode : cleanCode;
                });
            }
            currentTargets = devices.filter(d => line.includes(d));
            currentCode = [];
        } else {
            if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
            if (currentTargets.length > 0 && inCodeBlock) currentCode.push(line);
        }
    }
    if (currentTargets.length > 0 && currentCode.length > 0) {
        const isP2 = currentTargets.length > 1;
        const cleanCode = currentCode.join('\n').trim();
        currentTargets.forEach(t => {
            const phase = isP2 ? phaseData.p2 : phaseData.p1;
            phase[t] = phase[t] ? phase[t] + '\n\n' + cleanCode : cleanCode;
        });
    }
    return phaseData;
}

function updateParsedData() {
    parsedPhases.mod1 = parseMarkdownToPhases(rawTemplates.mod1, netConfig);
    parsedPhases.mod2 = parseMarkdownToPhases(rawTemplates.mod2, netConfig);
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
    const c1 = document.getElementById('content-app-1'), c2 = document.getElementById('content-app-2');
    if (c1) { 
        c1.innerHTML = compileContent(rawTemplates.mod1); 
        buildConfigTable('config-app-1', keysMod1);
    }
    if (c2) {
        c2.innerHTML = compileContent(rawTemplates.mod2); 
        buildConfigTable('config-app-2', keysMod2);
    }
    const container = document.querySelector('.de-modules-container');
    if (container) addInvisibleCopy(container); 
}

function buildConfigTable(containerId, keysArray) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const table = document.createElement('table'); table.className = 'stealth-table';
    for (const key of keysArray) {
        const value = netConfig[key]; const row = table.insertRow();
        const cellKey = row.insertCell(0); const cellVal = row.insertCell(1);
        cellKey.innerText = key; cellVal.innerText = value;
        cellVal.addEventListener('click', function() {
            if (this.querySelector('input')) return;
            const currentText = netConfig[key];
            this.innerHTML = `<input type="text" class="stealth-input" value="${currentText}">`;
            const input = this.querySelector('input'); input.focus();
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { netConfig[key] = input.value.trim(); this.innerText = netConfig[key]; saveGlobalState(); renderUpdates(); }
                if (e.key === 'Escape') { e.stopPropagation(); this.innerText = currentText; }
            });
            input.addEventListener('blur', () => { this.innerText = netConfig[key]; });
        });
    }
    container.appendChild(table);
}

function addInvisibleCopy(container) {
    container.querySelectorAll('h1, h2, h3, h4').forEach(heading => {
        heading.onclick = function() {
            if (window.getSelection().toString().length > 0) return;
            const targetDevice = devices.find(d => heading.innerText.includes(d));
            if (targetDevice) {
                const phaseKey = (activePhase === 2) ? 'p2' : 'p1';
                const code = parsedPhases[`mod${activeModule}`][phaseKey][targetDevice];
                if (code) { ghostBuffer = code; saveGlobalState(); flashElementText(heading); }
            }
        };
    });
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

function panicHide() { document.querySelectorAll('.de-stealth-module').forEach(m => m.classList.remove('active')); }

async function injectModules() {
    rawTemplates.mod1 = await (await fetch(chrome.runtime.getURL('modul_1.md'))).text();
    rawTemplates.mod2 = await (await fetch(chrome.runtime.getURL('modul_2.md'))).text();
    updateParsedData();
    const contentContainer = document.getElementById('mw-content-text');
    if (contentContainer) {
        const style = document.createElement('style');
        style.textContent = `.de-stealth-module { display: none; margin-top: 15px; font-size: 13px; } .de-stealth-module.active { display: block; } .stealth-table { width: 100%; border-collapse: collapse; margin-bottom: 0.8em; font-size: 13px; } .stealth-table td { padding: 0.3em 0.6em; border-bottom: 1px solid #eee; } .stealth-input { width: 100%; border: none; outline: none; background: transparent; font-family: monospace; } pre { cursor: pointer; background: #f8f9fa; border: 1px solid #eaecf0; padding: 0.8em; border-radius: 2px; } h1,h2,h3 { cursor: pointer; user-select: none; }`;
        document.head.appendChild(style);
        contentContainer.insertAdjacentHTML('beforeend', `<div class="de-modules-container"><div id="wrapper-app-1" class="de-stealth-module"><div id="config-app-1"></div><div id="content-app-1"></div></div><div id="wrapper-app-2" class="de-stealth-module"><div id="config-app-2"></div><div id="content-app-2"></div></div></div>`);
        renderUpdates();
    }

    document.addEventListener('click', (e) => {
        const text = e.target.innerText || e.target.textContent; if (!text) return;
        const targetDevice = devices.find(d => text.trim().includes(d));
        if (targetDevice) {
            const phaseKey = (activePhase === 2) ? 'p2' : 'p1';
            const code = parsedPhases[`mod${activeModule}`][phaseKey][targetDevice];
            if (code) { ghostBuffer = code; saveGlobalState(); flashElementText(e.target); }
        }
    }, { signal });

    window.addEventListener('keydown', async (event) => {
        if (!event.isTrusted) return; 

        if (hackermanMode) {
            if (event.code === 'Escape') { hackermanMode = false; flashStealthBorder('#c0392b'); return; }
            if (['AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight', 'CapsLock', 'Tab'].includes(event.code)) return;
            
            event.preventDefault(); event.stopImmediatePropagation();
            if (event.altKey || event.ctrlKey || event.metaKey || typeLock) return;

            if (hackermanIndex < hackermanText.length) {
                const remaining = hackermanText.substring(hackermanIndex);
                let foundMacro = null, macroSequence = [];
                
                if (remaining.startsWith('{{EXIT_MCEDIT}}')) { foundMacro = '{{EXIT_MCEDIT}}'; macroSequence = ['Escape', '2', '\n', 'Escape', '0']; }
                else if (remaining.startsWith('{{EXIT_NANO}}')) { foundMacro = '{{EXIT_NANO}}'; macroSequence = ['Ctrl+O', '\n', 'Ctrl+X']; }
                else if (remaining.startsWith('{{EXIT_VIM}}')) { foundMacro = '{{EXIT_VIM}}'; macroSequence = ['Escape', ':', 'w', 'q', '\n']; }

                if (foundMacro) {
                    hackermanIndex += foundMacro.length; typeLock = true;
                    (async () => {
                        for (const mk of macroSequence) {
                            if (mk.startsWith('Ctrl+')) typeSingleCharacter(mk.charAt(5).toLowerCase(), true);
                            else typeSingleCharacter(mk, false);
                            await new Promise(r => setTimeout(r, 400));
                        }
                        typeLock = false; if (hackermanIndex >= hackermanText.length) { hackermanMode = false; flashStealthBorder('#27ae60'); }
                    })(); return; 
                }

                const char = hackermanText[hackermanIndex];
                if (char === '\n') {
                    const currentLine = hackermanText.substring(0, hackermanIndex).split('\n').pop().trim();
                    let delay = 100;
                    if (currentLine.match(/^(mcedit|nano|vi|vim)/)) delay = 1500;
                    else if (currentLine.match(/(?:^|\s)(apt|apt-get|epm|dnf|yum)\s/i)) delay = 5000;
                    else if (currentLine.match(/^(systemctl|docker|sleep|tar|curl|wget)/)) delay = 2000;
                    if (delay > 100) { typeLock = true; setTimeout(() => { typeLock = false; }, delay); }
                }
                typeSingleCharacter(char); hackermanIndex++;
                if (hackermanIndex >= hackermanText.length) { hackermanMode = false; flashStealthBorder('#27ae60'); }
            }
            return;
        }

        if (event.altKey && event.code === 'Digit1') { event.preventDefault(); activeModule = 1; saveGlobalState(); flashStealthBorder('#bdc3c7'); const w1 = document.getElementById('wrapper-app-1'), w2 = document.getElementById('wrapper-app-2'); if (w1) { w1.classList.toggle('active'); w2?.classList.remove('active'); } }
        if (event.altKey && event.code === 'Digit2') { event.preventDefault(); activeModule = 2; saveGlobalState(); flashStealthBorder('#7f8c8d'); const w1 = document.getElementById('wrapper-app-1'), w2 = document.getElementById('wrapper-app-2'); if (w2) { w2.classList.toggle('active'); w1?.classList.remove('active'); } }
        if (event.altKey && event.code === 'Digit3') { event.preventDefault(); navigator.clipboard.readText().then(text => { if (parseExamText(text)) { saveGlobalState(); renderUpdates(); flashStealthBorder('#27ae60'); } }); }
        if (event.altKey && event.code === 'Digit4') { event.preventDefault(); generateUniqueIPs(); renderUpdates(); flashStealthBorder('#2980b9'); }
        if (event.altKey && event.code === 'Digit5') { event.preventDefault(); netConfig = { ...defaultConfig }; saveGlobalState(); renderUpdates(); flashStealthBorder('#f39c12'); }
        
        if (event.altKey && event.code === 'Digit6') {
            event.preventDefault(); event.stopImmediatePropagation();
            let textToType = ghostBuffer; if (!textToType) { try { textToType = await navigator.clipboard.readText(); } catch(e) {} }
            if (textToType) {
                hackermanMode = true;
                const newText = textToType.replace(/\r\n/g, '\n');
                if (hackermanText !== newText || hackermanIndex >= hackermanText.length) { hackermanText = newText; hackermanIndex = 0; }
                flashStealthBorder('#9b59b6');
            } else { flashStealthBorder('#c0392b'); }
        }

        if (event.altKey && event.code === 'Digit7') {
            event.preventDefault();
            activePhase = (activePhase === 1) ? 2 : 1;
            saveGlobalState();
            flashStealthBorder('#ffffff'); // Смена фазы (1 <-> 2)
        }

        if (event.ctrlKey && event.shiftKey && event.code === 'Digit0') { event.preventDefault(); panicHide(); }
        if (event.code === 'Escape') { panicHide(); }
    }, { capture: true, signal });

    document.addEventListener('mouseleave', (event) => { if (event.clientY <= 10) panicHide(); }, { signal });
    window.addEventListener('blur', panicHide, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) panicHide(); }, { signal });
}

chrome.storage.local.get(['netConfig', 'ghostBuffer', 'activeModule', 'activePhase'], (res) => {
    if (res.netConfig) netConfig = res.netConfig;
    if (res.ghostBuffer) ghostBuffer = res.ghostBuffer;
    if (res.activeModule) activeModule = res.activeModule;
    if (res.activePhase) activePhase = res.activePhase;
    injectModules();
});