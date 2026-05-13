window.DeParser = {
    parseMarkdownToPhases: function(mdText, config) {
        let content = mdText;
        for (const [key, value] of Object.entries(config)) {
            content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
        const lines = content.split('\n');
        const phaseData = { p1: {}, p2: {} };
        
        let currentTargets = [], currentCode = [], inCodeBlock = false, isCurrentP2 = false;

        for (const line of lines) {
            // Очистка от невидимых символов (BOM) и пробелов в начале строки
            const cleanLine = line.replace(/^[\uFEFF\s]+/, '');
            const isHeading = cleanLine.match(/^#{1,4}\s+/); 
            
            if (isHeading && !inCodeBlock) {
                if (currentTargets.length > 0 && currentCode.length > 0) {
                    const cleanCode = currentCode.join('\n').trim();
                    currentTargets.forEach(t => {
                        const phase = isCurrentP2 ? phaseData.p2 : phaseData.p1;
                        phase[t] = phase[t] ? phase[t] + '\n\n' + cleanCode : cleanCode;
                    });
                }
                
                currentTargets = window.DeState.devices.filter(d => cleanLine.toLowerCase().includes(d.toLowerCase()));
                isCurrentP2 = currentTargets.length > 1 || cleanLine.toLowerCase().includes('и') || cleanLine.toLowerCase().includes('final');
                currentCode = [];
            } else {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
                if (currentTargets.length > 0 && inCodeBlock) {
                    currentCode.push(line); // Сохраняем оригинальную строку, чтобы не ломать отступы
                }
            }
        }
        
        if (currentTargets.length > 0 && currentCode.length > 0) {
            const cleanCode = currentCode.join('\n').trim();
            currentTargets.forEach(t => {
                const phase = isCurrentP2 ? phaseData.p2 : phaseData.p1;
                phase[t] = phase[t] ? phase[t] + '\n\n' + cleanCode : cleanCode;
            });
        }
        return phaseData;
    },

    updateParsedData: function() {
        window.DeState.parsedPhases.mod1 = this.parseMarkdownToPhases(window.DeState.rawTemplates.mod1, window.DeState.netConfig);
        window.DeState.parsedPhases.mod2 = this.parseMarkdownToPhases(window.DeState.rawTemplates.mod2, window.DeState.netConfig);
    },

    compileContent: function(rawMd) {
        let content = rawMd;
        for (const [key, value] of Object.entries(window.DeState.netConfig)) {
            content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
        return typeof marked !== 'undefined' ? marked.parse(content) : `<pre>${content}</pre>`;
    },

    parseExamText: function(text) {
        let updated = false;
        const netConfig = window.DeState.netConfig;
        
        const domainMatch = text.match(/(?:DNS-суффикс|Имя домена)[\s\-—]+([a-z0-9.-]+)/i);
        if (domainMatch) { netConfig["DOMAIN"] = domainMatch[1]; updated = true; }
        
        const passMatch = text.match(/паролем\s+([A-Za-z0-9@!#$%^&*()_+]+)/i);
        if (passMatch) { netConfig["PASS_MAIN"] = passMatch[1]; updated = true; }
        
        const portMatch = text.match(/(?:порт|Идентификатор пользователя)\s+(\d{4,5})/i);
        if (portMatch) { netConfig["SSH_PORT_M1"] = portMatch[1]; netConfig["SSH_PORT_M2"] = portMatch[1]; updated = true; }
        
        const ispMatch = [...text.matchAll(/сети\s+(\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2})/g)];
        if (ispMatch.length >= 1) { netConfig["ISP_NET_1"] = ispMatch[0][1]; updated = true; }
        if (ispMatch.length >= 2) { netConfig["ISP_NET_2"] = ispMatch[1][1]; updated = true; }

        const uidMatch = text.match(/(?:UID|Идентификатор(?: пользователя)?)[^\d]+(\d{4})/i);
        if (uidMatch) { netConfig["UID_USER"] = uidMatch[1]; updated = true; }

        const raidMatch = text.match(/RAID[\s\-]+(\d)/i);
        if (raidMatch) { netConfig["RAID_LVL"] = raidMatch[1]; updated = true; }

        const vlanMatches = [...text.matchAll(/(?:VLAN)\s*(\d{1,4})/gi)];
        if (vlanMatches.length >= 1) { netConfig["VLAN_1"] = vlanMatches[0][1]; updated = true; }
        if (vlanMatches.length >= 2) { netConfig["VLAN_2"] = vlanMatches[1][1]; updated = true; }
        if (vlanMatches.length >= 3) { netConfig["VLAN_3"] = vlanMatches[2][1]; updated = true; }
        
        return updated;
    },

    generateUniqueIPs: function() {
        const netConfig = window.DeState.netConfig;
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
        
        window.DeState.saveGlobalState(); 
    }
};