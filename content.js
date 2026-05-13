const abortController = new AbortController();
const { signal } = abortController;

async function injectModules() {
    window.DeState.rawTemplates.mod1 = await (await fetch(chrome.runtime.getURL('modul_1.md'))).text();
    window.DeState.rawTemplates.mod2 = await (await fetch(chrome.runtime.getURL('modul_2.md'))).text();
    window.DeParser.updateParsedData();
    
    const contentContainer = document.getElementById('mw-content-text');
    if (contentContainer) {
        const style = document.createElement('style');
        style.textContent = `.de-stealth-module { display: none; margin-top: 15px; font-size: 13px; } .de-stealth-module.active { display: block; } .stealth-table { width: 100%; border-collapse: collapse; margin-bottom: 0.8em; font-size: 13px; } .stealth-table td { padding: 0.3em 0.6em; border-bottom: 1px solid #eee; } .stealth-input { width: 100%; border: none; outline: none; background: transparent; font-family: monospace; } pre { cursor: pointer; background: #f8f9fa; border: 1px solid #eaecf0; padding: 0.8em; border-radius: 2px; } h1,h2,h3 { cursor: pointer; user-select: none; }`;
        document.head.appendChild(style);
        contentContainer.insertAdjacentHTML('beforeend', `<div class="de-modules-container"><div id="wrapper-app-1" class="de-stealth-module"><div id="config-app-1"></div><div id="content-app-1"></div></div><div id="wrapper-app-2" class="de-stealth-module"><div id="config-app-2"></div><div id="content-app-2"></div></div></div>`);
        window.DeUI.renderUpdates();
    }

    // Универсальный делегированный клик с Умным Поиском (Smart Fetch)
    document.addEventListener('click', (e) => {
        const text = e.target.innerText || e.target.textContent; 
        if (!text || text.trim().length > 80) return; 
        
        const targetDevice = window.DeState.devices.find(d => {
            const lowerText = text.toLowerCase();
            const lowerDev = d.toLowerCase();
            if (lowerDev === 'isp' && lowerText.includes('display')) return false;
            return lowerText.includes(lowerDev);
        });
        
        if (targetDevice && (e.target.tagName.match(/^H[1-4]$/) || e.target.closest('.xterm-helper-textarea') == null)) {
            
            let foundMod = window.DeState.activeModule;
            let foundPhase = window.DeState.activePhase;
            let finalCode = null;
            
            // Ищем код в текущих модулях/фазах, если нет - проверяем другие
            const phases = [window.DeState.activePhase, (window.DeState.activePhase === 1 ? 2 : 1)];
            const mods = [window.DeState.activeModule, (window.DeState.activeModule === 1 ? 2 : 1)];
            
            for(let m of mods) {
                for(let p of phases) {
                    const mk = `mod${m}`;
                    const pk = `p${p}`;
                    if (window.DeState.parsedPhases[mk][pk][targetDevice]) {
                        finalCode = window.DeState.parsedPhases[mk][pk][targetDevice];
                        foundMod = m;
                        foundPhase = p;
                        break;
                    }
                }
                if (finalCode) break;
            }

            // Если код найден и пользователь не выделял текст мышкой
            if (finalCode && window.getSelection().toString().length === 0) { 
                
                // Авто-переключение модуля в UI, если код был в другом модуле
                if (foundMod !== window.DeState.activeModule) {
                    window.DeState.activeModule = foundMod;
                    const w1 = document.getElementById('wrapper-app-1'), w2 = document.getElementById('wrapper-app-2');
                    if (foundMod === 1) { w1?.classList.add('active'); w2?.classList.remove('active'); window.DeUI.flashStealthBorder('#bdc3c7'); }
                    else { w2?.classList.add('active'); w1?.classList.remove('active'); window.DeUI.flashStealthBorder('#7f8c8d'); }
                }
                // Авто-переключение фазы
                if (foundPhase !== window.DeState.activePhase) {
                    window.DeState.activePhase = foundPhase;
                    window.DeUI.flashStealthBorder('#ffffff');
                }
                
                window.DeState.ghostBuffer = finalCode; 
                window.DeState.saveGlobalState(); 
                window.DeUI.flashElementText(e.target); 
            }
        }
    }, { signal });

    window.addEventListener('keydown', async (event) => {
        if (!event.isTrusted) return; 

        // 1. НАИВЫСШИЙ ПРИОРИТЕТ: Системные Хоткеи
        if (event.altKey && event.code.match(/^Digit[1-7]$/)) {
            event.preventDefault(); 
            event.stopImmediatePropagation();
            
            window.DeState.hackermanMode = false;
            window.DeState.typeLock = false;

            if (event.code === 'Digit1') { 
                window.DeState.activeModule = 1; window.DeState.saveGlobalState(); window.DeUI.flashStealthBorder('#bdc3c7'); 
                const w1 = document.getElementById('wrapper-app-1'), w2 = document.getElementById('wrapper-app-2'); 
                if (w1) { w1.classList.add('active'); w2?.classList.remove('active'); } 
            }
            else if (event.code === 'Digit2') { 
                window.DeState.activeModule = 2; window.DeState.saveGlobalState(); window.DeUI.flashStealthBorder('#7f8c8d'); 
                const w1 = document.getElementById('wrapper-app-1'), w2 = document.getElementById('wrapper-app-2'); 
                if (w2) { w2.classList.add('active'); w1?.classList.remove('active'); } 
            }
            else if (event.code === 'Digit3') { 
                try {
                    const text = await navigator.clipboard.readText();
                    if (window.DeParser.parseExamText(text)) { window.DeState.saveGlobalState(); window.DeUI.renderUpdates(); window.DeUI.flashStealthBorder('#27ae60'); }
                } catch(e) {} 
            }
            else if (event.code === 'Digit4') { 
                window.DeParser.generateUniqueIPs(); window.DeUI.renderUpdates(); window.DeUI.flashStealthBorder('#2980b9'); 
            }
            else if (event.code === 'Digit5') { 
                window.DeState.netConfig = { ...window.DeState.defaultConfig }; window.DeState.saveGlobalState(); window.DeUI.renderUpdates(); window.DeUI.flashStealthBorder('#f39c12'); 
            }
            else if (event.code === 'Digit6') {
                let textToType = window.DeState.ghostBuffer; 
                if (!textToType) { try { textToType = await navigator.clipboard.readText(); } catch(e) {} }
                
                if (textToType) {
                    window.DeState.hackermanMode = true;
                    const newText = textToType.replace(/\r\n/g, '\n');
                    window.DeState.hackermanText = newText; 
                    window.DeState.hackermanIndex = 0; 
                    window.DeUI.flashStealthBorder('#9b59b6');
                } else { 
                    window.DeUI.flashStealthBorder('#c0392b'); 
                }
            }
            else if (event.code === 'Digit7') {
                window.DeState.activePhase = (window.DeState.activePhase === 1) ? 2 : 1;
                window.DeState.saveGlobalState();
                window.DeUI.flashStealthBorder('#ffffff'); 
            }
            return; 
        }

        if ((event.ctrlKey && event.shiftKey && event.code === 'Digit0') || (!window.DeState.hackermanMode && event.code === 'Escape')) { 
            event.preventDefault(); window.DeUI.panicHide(); return; 
        }

        // 2. Логика Hackerman Mode
        if (window.DeState.hackermanMode) {
            if (event.code === 'Escape') { 
                window.DeState.hackermanMode = false; 
                window.DeState.typeLock = false; 
                window.DeUI.flashStealthBorder('#c0392b'); 
                return; 
            }
            if (['AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight', 'CapsLock', 'Tab'].includes(event.code)) return;
            
            event.preventDefault(); event.stopImmediatePropagation();
            if (event.altKey || event.ctrlKey || event.metaKey || window.DeState.typeLock) return;

            if (window.DeState.hackermanIndex < window.DeState.hackermanText.length) {
                const remaining = window.DeState.hackermanText.substring(window.DeState.hackermanIndex);
                let foundMacro = null, macroSequence = [];
                
                if (remaining.startsWith('{{EXIT_MCEDIT}}')) { foundMacro = '{{EXIT_MCEDIT}}'; macroSequence = ['Escape', '2', '\n', 'Escape', '0']; }
                else if (remaining.startsWith('{{EXIT_NANO}}')) { foundMacro = '{{EXIT_NANO}}'; macroSequence = ['Ctrl+O', '\n', 'Ctrl+X']; }
                else if (remaining.startsWith('{{EXIT_VIM}}')) { foundMacro = '{{EXIT_VIM}}'; macroSequence = ['Escape', ':', 'w', 'q', '\n']; }
                else if (remaining.startsWith('{{MC_DEL_LINE}}')) { foundMacro = '{{MC_DEL_LINE}}'; macroSequence = ['Ctrl+Y']; }
                else if (remaining.startsWith('{{NANO_DEL_LINE}}')) { foundMacro = '{{NANO_DEL_LINE}}'; macroSequence = ['Ctrl+K']; }
                else if (remaining.startsWith('{{DOWN}}')) { foundMacro = '{{DOWN}}'; macroSequence = ['ArrowDown']; }
                else if (remaining.startsWith('{{TAB}}')) { foundMacro = '{{TAB}}'; macroSequence = ['Tab']; }

                if (foundMacro) {
                    window.DeState.hackermanIndex += foundMacro.length; 
                    window.DeState.typeLock = true;
                    (async () => {
                        for (const mk of macroSequence) {
                            let isCtrl = mk.startsWith('Ctrl+');
                            let isAlt = mk.startsWith('Alt+');
                            let charToType = mk.replace('Ctrl+', '').replace('Alt+', '');
                            
                            if (isCtrl) charToType = charToType.toLowerCase();
                            window.DeKeyboard.typeSingleCharacter(charToType, isCtrl, isAlt);
                            
                            await new Promise(r => setTimeout(r, 400));
                        }
                        window.DeState.typeLock = false; 
                        if (window.DeState.hackermanIndex >= window.DeState.hackermanText.length) { 
                            window.DeState.hackermanMode = false; window.DeUI.flashStealthBorder('#27ae60'); 
                        }
                    })(); 
                    return; 
                }

                const char = window.DeState.hackermanText[window.DeState.hackermanIndex];
                if (char === '\n') {
                    const currentLine = window.DeState.hackermanText.substring(0, window.DeState.hackermanIndex).split('\n').pop().trim();
                    let delay = 100;
                    if (currentLine.match(/^(mcedit|nano|vi|vim)/)) delay = 1500;
                    else if (currentLine.match(/(?:^|\s)(apt|apt-get|epm|dnf|yum)\s/i)) delay = 5000;
                    else if (currentLine.match(/^(systemctl|docker|sleep|tar|curl|wget)/)) delay = 2000;
                    if (delay > 100) { 
                        window.DeState.typeLock = true; 
                        setTimeout(() => { window.DeState.typeLock = false; }, delay); 
                    }
                }
                
                window.DeKeyboard.typeSingleCharacter(char); 
                window.DeState.hackermanIndex++;
                
                if (window.DeState.hackermanIndex >= window.DeState.hackermanText.length) { 
                    window.DeState.hackermanMode = false; window.DeUI.flashStealthBorder('#27ae60'); 
                }
            }
        }
    }, { capture: true, signal });

    document.addEventListener('mouseleave', (event) => { if (event.clientY <= 10) window.DeUI.panicHide(); }, { signal });
    window.addEventListener('blur', () => window.DeUI.panicHide(), { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) window.DeUI.panicHide(); }, { signal });
}

chrome.storage.local.get(['netConfig', 'ghostBuffer', 'activeModule', 'activePhase'], (res) => {
    window.DeState.init(() => window.DeUI.renderUpdates());
    if (res.netConfig) window.DeState.netConfig = res.netConfig;
    if (res.ghostBuffer) window.DeState.ghostBuffer = res.ghostBuffer;
    if (res.activeModule) window.DeState.activeModule = res.activeModule;
    if (res.activePhase) window.DeState.activePhase = res.activePhase;
    
    injectModules();
});