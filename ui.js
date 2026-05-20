window.DeUI = {
    flashStealthBorder: function(color) {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            pointerEvents: 'none', zIndex: '99999999', transition: 'opacity 0.4s ease',
            boxShadow: `inset 0 0 0 1px ${color}`, opacity: '0.4'
        });
        document.body.appendChild(overlay);
        setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 400); }, 1500);
    },

    flashElementText: function(el) {
        if (!el || !el.style) return; 
        const originalColor = el.style.color;
        el.style.transition = 'color 0.2s';
        el.style.color = '#ff6b81';
        setTimeout(() => { if (el && el.style) el.style.color = originalColor; }, 300);
    },

    buildConfigTable: function(containerId, keysArray) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        const table = document.createElement('table'); 
        table.className = 'stealth-table';
        
        for (const key of keysArray) {
            const value = window.DeState.netConfig[key]; 
            const row = table.insertRow();
            const cellKey = row.insertCell(0); 
            const cellVal = row.insertCell(1);
            
            cellKey.innerText = key; 
            cellVal.innerText = value;
            
            cellVal.addEventListener('click', function() {
                if (this.querySelector('input')) return;
                const currentText = window.DeState.netConfig[key];
                this.innerHTML = `<input type="text" class="stealth-input" value="${currentText}">`;
                const input = this.querySelector('input'); 
                input.focus();
                
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { 
                        window.DeState.netConfig[key] = input.value.trim(); 
                        this.innerText = window.DeState.netConfig[key]; 
                        window.DeState.saveGlobalState(); 
                        window.DeUI.renderUpdates(); 
                    }
                    if (e.key === 'Escape') { e.stopPropagation(); this.innerText = currentText; }
                });
                input.addEventListener('blur', () => { this.innerText = window.DeState.netConfig[key]; });
            });
        }
        container.appendChild(table);
    },

    updateProxmoxTitle: function(stage) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        let versionString = `Virtual Environment 8.3.${stage}`;
        
        if (stage === 10) versionString = 'Virtual Environment 8.1.0';
        else if (stage === 11) versionString = 'Virtual Environment 8.1.1';

        while ((node = walker.nextNode())) {
            if (node.nodeValue && node.nodeValue.match(/Virtual Environment 8\.[13]\.\d+/)) {
                node.nodeValue = node.nodeValue.replace(/Virtual Environment 8\.[13]\.\d+/, versionString);
            }
        }
    },

    // Раскраска левого меню в Proxmox с использованием !important для защиты от ExtJS
    updateProxmoxTreeHighlight: function(activeDevices) {
        const treeNodes = document.querySelectorAll('.x-tree-node-text');
        
        treeNodes.forEach(node => {
            const text = (node.innerText || node.textContent).trim().toLowerCase();
            const isMatch = activeDevices.length > 0 && activeDevices.some(dev => text.includes(dev.toLowerCase()));

            if (isMatch) {
                node.style.setProperty('color', '#ff6b81', 'important');
                node.style.setProperty('font-weight', 'bold', 'important');
                node.dataset.deHighlighted = 'true';
            } else {
                if (node.dataset.deHighlighted) {
                    node.style.color = '';
                    node.style.fontWeight = '';
                    delete node.dataset.deHighlighted;
                }
            }
        });
    },

    updateStageHighlight: function() {
        // Очищаем старые стили
        document.querySelectorAll('.device-wrap h2').forEach(h2 => h2.classList.remove('active-device'));
        document.querySelectorAll('.stage-wrap').forEach(el => el.classList.remove('active-stage'));

        const activeMod = Number(window.DeState.activeModule) || 1;
        const currentStage = Number(window.DeState.activeStage) || 1;
        const phases = window.DeState.parsedPhases[`mod${activeMod}`];

        let activeDevicesForStage = [];

        // Берем список машин НЕ ИЗ ДОМА, а 100% точно из распарсенного объекта текущего этапа
        if (phases && phases[currentStage]) {
            activeDevicesForStage = Object.keys(phases[currentStage]);
        }

        // Подсвечиваем код в самом расширении
        const activeContainerId = `wrapper-app-${activeMod}`;
        const activeContainer = document.getElementById(activeContainerId);

        if (activeContainer) {
            activeContainer.querySelectorAll('.stage-wrap').forEach(el => {
                if (Number(el.dataset.stage) === currentStage) {
                    el.classList.add('active-stage');
                    
                    const devWrap = el.closest('.device-wrap');
                    if (devWrap) {
                        const h2 = devWrap.querySelector('h2');
                        if (h2) h2.classList.add('active-device');
                    }
                }
            });
        }

        this.updateProxmoxTitle(currentStage);
        
        this.lastActiveDevices = activeDevicesForStage;
        this.updateProxmoxTreeHighlight(activeDevicesForStage);

        // Таймер для ВЕЧНОЙ подсветки в дереве Proxmox (каждые 500 мс восстанавливает цвет, если Proxmox его стер)
        if (!this.highlightInterval) {
            this.highlightInterval = setInterval(() => {
                if (this.lastActiveDevices) {
                    this.updateProxmoxTreeHighlight(this.lastActiveDevices);
                }
            }, 500);
        }
    },

    renderUpdates: function() {
        window.DeParser.updateParsedData(); 
        const c1 = document.getElementById('content-app-1'), c2 = document.getElementById('content-app-2');
        
        if (c1) { 
            c1.innerHTML = window.DeParser.compileContent(window.DeState.rawTemplates.mod1); 
            this.buildConfigTable('config-app-1', window.DeState.keysMod1);
            this.wrapStagesInDOM(c1);
        }
        if (c2) {
            c2.innerHTML = window.DeParser.compileContent(window.DeState.rawTemplates.mod2); 
            this.buildConfigTable('config-app-2', window.DeState.keysMod2);
            this.wrapStagesInDOM(c2);
        }
        this.updateStageHighlight();
    },

    wrapStagesInDOM: function(container) {
        const children = Array.from(container.children);
        container.innerHTML = '';
        
        let currentDeviceWrap = null;
        let currentStageDiv = null;
        
        children.forEach(el => {
            if (el.tagName === 'H2') { 
                currentDeviceWrap = document.createElement('div');
                currentDeviceWrap.className = 'device-wrap';
                currentDeviceWrap.appendChild(el);
                container.appendChild(currentDeviceWrap);
                currentStageDiv = null; 
            } else if (el.tagName === 'H1') { 
                const match = el.innerText.match(/^(\d+)\./);
                const stageNum = match ? match[1] : '1';
                
                currentStageDiv = document.createElement('div');
                currentStageDiv.className = `stage-wrap stage-${stageNum}`;
                currentStageDiv.dataset.stage = stageNum;
                currentStageDiv.appendChild(el);
                
                if (currentDeviceWrap) {
                    currentDeviceWrap.appendChild(currentStageDiv);
                } else {
                    container.appendChild(currentStageDiv);
                }
            } else {
                if (currentStageDiv) currentStageDiv.appendChild(el);
                else if (currentDeviceWrap) currentDeviceWrap.appendChild(el);
                else container.appendChild(el);
            }
        });
    },

    panicHide: function() { 
        document.querySelectorAll('.de-stealth-module').forEach(m => m.classList.remove('active')); 
    }
};