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
        const originalColor = el.style.color;
        el.style.transition = 'color 0.2s';
        el.style.color = '#27ae60';
        setTimeout(() => { el.style.color = originalColor; }, 300);
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

    renderUpdates: function() {
        window.DeParser.updateParsedData(); 
        const c1 = document.getElementById('content-app-1'), c2 = document.getElementById('content-app-2');
        
        if (c1) { 
            c1.innerHTML = window.DeParser.compileContent(window.DeState.rawTemplates.mod1); 
            this.buildConfigTable('config-app-1', window.DeState.keysMod1);
        }
        if (c2) {
            c2.innerHTML = window.DeParser.compileContent(window.DeState.rawTemplates.mod2); 
            this.buildConfigTable('config-app-2', window.DeState.keysMod2);
        }
    },

    panicHide: function() { 
        document.querySelectorAll('.de-stealth-module').forEach(m => m.classList.remove('active')); 
    }
};