const abortController = new AbortController();
const { signal } = abortController;

async function injectModules() {
    // Автоопределение VM из параметров прямой ссылки Proxmox
    const urlParams = new URLSearchParams(window.location.search);
    const vmName = urlParams.get('vmname');
    if (vmName) {
        console.log(`[Stealth] Обнаружена прямая консоль для ВМ: ${vmName}`);
        if (!window.DeState) window.DeState = {};
        window.DeState.currentVmFromUrl = vmName.toUpperCase();
    }

    window.DeState.rawTemplates.mod1 = await (await fetch(chrome.runtime.getURL('modul_1.md'))).text();
    window.DeState.rawTemplates.mod2 = await (await fetch(chrome.runtime.getURL('modul_2.md'))).text();
    window.DeParser.updateParsedData();
    
    const contentContainer = document.getElementById('mw-content-text');
    if (contentContainer) {
        const style = document.createElement('style');
        style.textContent = `
            .de-stealth-module { display: none; margin-top: 15px; font-size: 13px; } 
            .de-stealth-module.active { display: block; } 
            .stealth-table { width: 100%; border-collapse: collapse; margin-bottom: 0.8em; font-size: 13px; } 
            .stealth-table td { padding: 0.3em 0.6em; border-bottom: 1px solid #eee; } 
            .stealth-table td.stealth-input { width: 100%; border: none; outline: none; background: transparent; font-family: monospace; } 
            pre { cursor: pointer; background: #f8f9fa; border: 1px solid #eaecf0; padding: 0.8em; border-radius: 2px; } 
            h1, h2, h3 { cursor: pointer; user-select: none; }
            .device-wrap { margin-bottom: 15px; }
            .device-wrap h2 { transition: all 0.3s ease; padding: 4px 8px; border-radius: 4px; display: inline-block; }
            
            .device-wrap h2.active-device { background-color: #ff6b81; color: white; box-shadow: 0 2px 4px rgba(255, 107, 129, 0.3); }
            .stage-wrap { opacity: 0.4; transition: all 0.2s; padding-left: 10px; border-left: 3px solid transparent; }
            .stage-wrap.active-stage { opacity: 1; border-left: 3px solid #ff6b81; background: rgba(255, 107, 129, 0.05); }
        `;
        document.head.appendChild(style);
        contentContainer.insertAdjacentHTML('beforeend', `<div class="de-modules-container"><div id="wrapper-app-1" class="de-stealth-module"><div id="config-app-1"></div><div id="content-app-1"></div></div><div id="wrapper-app-2" class="de-stealth-module"><div id="config-app-2"></div><div id="content-app-2"></div></div></div>`);
        window.DeUI.renderUpdates();
    }

    document.addEventListener('click', (e) => {
        const text = e.target.innerText || e.target.textContent; 
        
        setTimeout(() => {
            if (window.DeUI && window.DeUI.updateStageHighlight) {
                window.DeUI.updateStageHighlight();
            }
        }, 150);

        if (!text || text.trim().length > 80) return; 
        
        const targetDevice = window.DeState.devices.find(d => {
            const lowerText = text.toLowerCase();
            const lowerDev = d.toLowerCase();
            if (lowerDev === 'isp' && lowerText.includes('display')) return false;
            return lowerText.includes(lowerDev);
        });
        
        if (targetDevice && (e.target.tagName.match(/^H[1-4]$/) || e.target.closest('.xterm-helper-textarea') == null)) {
            
            let activeMod = Number(window.DeState.activeModule) || 1;
            let activeStage = Number(window.DeState.activeStage) || 1; 
            const phases = window.DeState.parsedPhases[`mod${activeMod}`];
            
            if (!phases) return;

            let code = (phases[activeStage]) ? phases[activeStage][targetDevice] : null;

            if (!code && window.getSelection().toString().length === 0) {
                let availableStages = Object.keys(phases).map(Number).sort((a,b)=>a-b);
                let nextStage = availableStages.find(s => s > activeStage && phases[s] && phases[s][targetDevice]);
                if (!nextStage) {
                    nextStage = availableStages.find(s => phases[s] && phases[s][targetDevice]); 
                }
                
                if (nextStage) {
                    activeStage = nextStage;
                    code = phases[activeStage][targetDevice];
                }
            }

            if (code && window.getSelection().toString().length === 0) { 
                if (activeStage !== Number(window.DeState.activeStage)) {
                    window.DeState.activeStage = activeStage;
                    window.DeState.saveGlobalState();
                    window.DeUI.updateStageHighlight();
                }
                
                window.DeState.ghostBuffer = code; 
                window.DeState.saveGlobalState(); 
                window.DeUI.flashElementText(e.target); 
            }
        }
    }, { signal });

    window.addEventListener('keydown', async (event) => {
        if (!event.isTrusted) return; 

        if (event.altKey && event.code.match(/^Digit[1-7]$/)) {
            event.preventDefault(); 
            event.stopImmediatePropagation();
            
            window.DeState.hackermanMode = false;
            window.DeState.typeLock = false;

            if (event.code === 'Digit1') { 
                window.DeState.activeModule = 1; window.DeState.saveGlobalState(); window.DeUI.flashStealthBorder('#bdc3c7'); 
                const w1 = document.getElementById('wrapper-app-1'), w2 = document.getElementById('wrapper-app-2'); 
                if (w1) { w1.classList.add('active'); w2?.classList.remove('active'); } 
                window.DeUI.updateStageHighlight(); 
            }
            else if (event.code === 'Digit2') { 
                window.DeState.activeModule = 2; window.DeState.saveGlobalState(); window.DeUI.flashStealthBorder('#7f8c8d'); 
                const w1 = document.getElementById('wrapper-app-1'), w2 = document.getElementById('wrapper-app-2'); 
                if (w2) { w2.classList.add('active'); w1?.classList.remove('active'); } 
                window.DeUI.updateStageHighlight(); 
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
                const phases = window.DeState.parsedPhases[`mod${window.DeState.activeModule}`];
                if (phases) {
                    const availableStages = Object.keys(phases).map(Number).sort((a,b)=>a-b);
                    if (availableStages.length > 0) {
                        let currentIdx = availableStages.indexOf(Number(window.DeState.activeStage));
                        let nextIdx = currentIdx + 1;
                        if (nextIdx >= availableStages.length) nextIdx = 0; 
                        
                        window.DeState.activeStage = availableStages[nextIdx];
                        window.DeState.saveGlobalState();
                        window.DeUI.updateStageHighlight();
                        window.DeUI.flashStealthBorder('#ffffff'); 
                    }
                }
            }
            return; 
        }

        if ((event.ctrlKey && event.shiftKey && event.code === 'Digit0') || (!window.DeState.hackermanMode && event.code === 'Escape')) { 
            event.preventDefault(); window.DeUI.panicHide(); return; 
        }

        if (window.DeState.hackermanMode) {
            if (event.code === 'Escape') { 
                window.DeState.hackermanMode = false; window.DeState.typeLock = false; window.DeUI.flashStealthBorder('#c0392b'); return; 
            }
            if (['AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight', 'CapsLock', 'Tab'].includes(event.code)) return;
            
            event.preventDefault(); event.stopImmediatePropagation();
            if (event.altKey || event.ctrlKey || event.metaKey || window.DeState.typeLock) return;

            if (window.DeState.hackermanIndex < window.DeState.hackermanText.length) {
                const remaining = window.DeState.hackermanText.substring(window.DeState.hackermanIndex);
                let foundMacro = null, macroSequence = [];
                
                // Комплексные макросы программ
                if (remaining.startsWith('{{EXIT_MCEDIT}}')) { foundMacro = '{{EXIT_MCEDIT}}'; macroSequence = ['Escape', '2', '\n', 'Escape', '0']; }
                else if (remaining.startsWith('{{EXIT_NANO}}')) { foundMacro = '{{EXIT_NANO}}'; macroSequence = ['Ctrl+O', '\n', 'Ctrl+X']; }
                else if (remaining.startsWith('{{EXIT_VIM}}')) { foundMacro = '{{EXIT_VIM}}'; macroSequence = ['Escape', ':', 'w', 'q', '\n']; }
                else if (remaining.startsWith('{{MC_DEL_LINE}}')) { foundMacro = '{{MC_DEL_LINE}}'; macroSequence = ['Ctrl+Y']; }
                else if (remaining.startsWith('{{NANO_DEL_LINE}}')) { foundMacro = '{{NANO_DEL_LINE}}'; macroSequence = ['Ctrl+K']; }

                // Атомарные инструменты редактирования и навигации
                else if (remaining.startsWith('{{LEFT}}')) { foundMacro = '{{LEFT}}'; macroSequence = ['ArrowLeft']; }
		else if (remaining.startsWith('{{RIGHT}}')) { foundMacro = '{{RIGHT}}'; macroSequence = ['ArrowRight']; }
		else if (remaining.startsWith('{{UP}}')) { foundMacro = '{{UP}}'; macroSequence = ['ArrowUp']; }
		else if (remaining.startsWith('{{DOWN}}')) { foundMacro = '{{DOWN}}'; macroSequence = ['ArrowDown']; }
                else if (remaining.startsWith('{{HOME}}')) { foundMacro = '{{HOME}}'; macroSequence = ['HOME']; }
                else if (remaining.startsWith('{{END}}')) { foundMacro = '{{END}}'; macroSequence = ['END']; }
                else if (remaining.startsWith('{{PGUP}}')) { foundMacro = '{{PGUP}}'; macroSequence = ['PGUP']; }
                else if (remaining.startsWith('{{PGDN}}')) { foundMacro = '{{PGDN}}'; macroSequence = ['PGDN']; }
                else if (remaining.startsWith('{{TAB}}')) { foundMacro = '{{TAB}}'; macroSequence = ['TAB']; }
                else if (remaining.startsWith('{{BACKSPACE}}')) { foundMacro = '{{BACKSPACE}}'; macroSequence = ['BACKSPACE']; }
                else if (remaining.startsWith('{{DEL}}')) { foundMacro = '{{DEL}}'; macroSequence = ['DEL']; }
                else if (remaining.startsWith('{{DEL_LEFT}}')) { foundMacro = '{{DEL_LEFT}}'; macroSequence = ['DEL_LEFT']; }
                else if (remaining.startsWith('{{DEL_RIGHT}}')) { foundMacro = '{{DEL_RIGHT}}'; macroSequence = ['DEL_RIGHT']; }

                // Динамический перехват любых кастомных макросов вида {{ЛЮБОЙ_ТЕКСТ}}
                if (!foundMacro) {
                    const genericMatch = remaining.match(/^\{\{([^}]+)\}\}/);
                    if (genericMatch) {
                        foundMacro = genericMatch[0];
                        macroSequence = [genericMatch[1]];
                    }
                }

                if (foundMacro) {
                    window.DeState.hackermanIndex += foundMacro.length; 
                    window.DeState.typeLock = true;
                    (async () => {
                        for (const mk of macroSequence) {
                            let isCtrl = mk.startsWith('Ctrl+'); let isAlt = mk.startsWith('Alt+');
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
                    if (delay > 100) { window.DeState.typeLock = true; setTimeout(() => { window.DeState.typeLock = false; }, delay); }
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

chrome.storage.local.get(['netConfig', 'ghostBuffer', 'activeModule', 'activeStage'], (res) => {
    window.DeState.init(() => window.DeUI.renderUpdates());
    if (res.netConfig) window.DeState.netConfig = res.netConfig;
    if (res.ghostBuffer) window.DeState.ghostBuffer = res.ghostBuffer;
    if (res.activeModule) window.DeState.activeModule = Number(res.activeModule) || 1;
    if (res.activeStage) window.DeState.activeStage = Number(res.activeStage) || 1; 
    
    injectModules();
});