window.DeParser = {
    parseMarkdownToPhases: function(mdText, config) {
        let content = mdText;
        for (const [key, value] of Object.entries(config)) {
            content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
        
        const phases = {}; 
        let curDev = null;
        let curStage = 1; 
        let inCode = false;
        let codeAcc = [];

        const lines = content.split('\n');
        for (const line of lines) {
            const devMatch = line.match(/^##\s+(.*)/);
            const stageMatch = line.match(/^#\s*(\d+)\./);
            
            if (devMatch && !inCode) {
                curDev = devMatch[1].trim();
            } else if (stageMatch && !inCode) {
                curStage = parseInt(stageMatch[1], 10);
            } else if (line.trim().startsWith('```')) {
                if (inCode) {
                    if (!phases[curStage]) phases[curStage] = {};
                    if (!phases[curStage][curDev]) phases[curStage][curDev] = [];
                    phases[curStage][curDev].push(codeAcc.join('\n').trim());
                    codeAcc = [];
                }
                inCode = !inCode;
            } else if (inCode) {
                codeAcc.push(line);
            }
        }
        
        for (let s in phases) {
            for (let d in phases[s]) {
                phases[s][d] = phases[s][d].join('\n\n');
            }
        }
        return phases;
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
        // (Остается без изменений - парсинг конфигов из билета)
        let updated = false;
        const netConfig = window.DeState.netConfig;
        
        const parts = text.split(/(?:Задание\s*модуль\s*2|Модуль\s*2)/i);
        const textMod1 = parts[0] || "";
        const textMod2 = parts[1] || "";
        
        if (textMod1) {
            const domainMatch = textMod1.match(/(?:DNS-суффикс|Имя домена)[\s\-—]+([a-z0-9.-]+)/i);
            if (domainMatch) { netConfig["DOMAIN"] = domainMatch[1]; updated = true; }
            
            const passMatch = textMod1.match(/паролем\s+([A-Za-z0-9@!#$%^&*()_+]+)/i);
            if (passMatch) { netConfig["PASS_MAIN"] = passMatch[1]; updated = true; }
            
            const portMatch = textMod1.match(/(?:порт|Идентификатор пользователя)\s+(\d{4,5})/i);
            if (portMatch) { netConfig["SSH_PORT_M1"] = portMatch[1]; updated = true; }
            
            const ispMatch = [...textMod1.matchAll(/подключен к сети\s+(\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2})/gi)];
            if (ispMatch.length >= 1) { netConfig["ISP_NET_1"] = ispMatch[0][1]; updated = true; }
            if (ispMatch.length >= 2) { netConfig["ISP_NET_2"] = ispMatch[1][1]; updated = true; }

            const uidMatch = textMod1.match(/(?:UID|Идентификатор(?: пользователя)?)[^\d]+(\d{4})/i);
            if (uidMatch) { netConfig["UID_USER"] = uidMatch[1]; updated = true; }

            const vlanMatches = [...textMod1.matchAll(/(?:VLAN)\s*(\d{1,4})/gi)];
            if (vlanMatches.length >= 1) { netConfig["VLAN_1"] = vlanMatches[0][1]; updated = true; }
            if (vlanMatches.length >= 2) { netConfig["VLAN_2"] = vlanMatches[1][1]; updated = true; }
            if (vlanMatches.length >= 3) { netConfig["VLAN_3"] = vlanMatches[2][1]; updated = true; }

            const srvUserMatch = textMod1.match(/Создайте пользователя\s+([a-zA-Z0-9_]+)\s*$|Пароль пользователя\s+([a-zA-Z0-9_]+)\s+с паролем/im);
            if (srvUserMatch) { netConfig["SRV_USER"] = srvUserMatch[1] || srvUserMatch[2]; updated = true; }

            const rtrUserMatch = textMod1.match(/Создайте пользователя\s+([a-zA-Z0-9_]+)\s+на маршрутизаторах/i);
            if (rtrUserMatch) { netConfig["RTR_USER"] = rtrUserMatch[1]; updated = true; }

            const dnsFwdMatch = textMod1.match(/DNS\s*сервер\s*пересылки.*?\s*(\d{1,3}(?:\.\d{1,3}){3})/i);
            if (dnsFwdMatch) { netConfig["DNS_FORWARDER"] = dnsFwdMatch[1]; updated = true; }

            const subnetMatch = textMod1.match(/192\.168\.(\d+)\.0/);
            if (subnetMatch) {
            	netConfig["REV_ZONE"] = `${subnetMatch[1]}.168.192.in-addr.arpa`; 
            	updated = true;
}
        }

        if (textMod2) {
            const raidMatch = textMod2.match(/массив[а-я\s]*уровня\s+(\d)/i);
            if (raidMatch) { netConfig["RAID_LVL"] = raidMatch[1]; updated = true; }

            const raidFsMatch = textMod2.match(/файловой системы используйте\s+([a-z0-9]+)/i);
            if (raidFsMatch) { netConfig["RAID_FS"] = raidFsMatch[1]; updated = true; }
            
            const raidDevMatch = textMod2.match(/Имя устройства\s*–\s*(md\d+)/i);
            if (raidDevMatch) { netConfig["RAID_DEV"] = raidDevMatch[1]; updated = true; }

            const raidMntMatch = textMod2.match(/автоматическое монтирование в папку\s+(\/[a-z0-9_/-]+)/i);
            if (raidMntMatch) { netConfig["RAID_MNT"] = raidMntMatch[1]; updated = true; }
            
            const nfsMntMatch = textMod2.match(/папки общего доступа выберите\s+(\/[a-z0-9_/-]+)/i);
            if (nfsMntMatch) { netConfig["NFS_MNT"] = nfsMntMatch[1]; updated = true; }

            const nfsCliMntMatch = textMod2.match(/автомонтирование в папку\s+(\/[a-z0-9_/-]+)/i);
            if (nfsCliMntMatch) { netConfig["NFS_CLI_MNT"] = nfsCliMntMatch[1]; updated = true; }

            const stratumMatch = textMod2.match(/Стратум сервера\s*-\s*(\d+)/i);
            if (stratumMatch) { netConfig["NTP_STRATUM"] = stratumMatch[1]; updated = true; }

            const smbUsersCountMatch = textMod2.match(/Создайте\s+(\d+)\s+пользователей/i);
            if (smbUsersCountMatch) { netConfig["SAMBA_USERS_COUNT"] = smbUsersCountMatch[1]; updated = true; }

            const smbGroupMatch = textMod2.match(/Создайте группу\s+([a-zA-Z0-9_-]+)/i);
            if (smbGroupMatch) { netConfig["SAMBA_GROUP"] = smbGroupMatch[1]; updated = true; }

            const dockerAppMatch = textMod2.match(/Основной контейнер\s+[a-zA-Z0-9_-]+\s+должен называться\s+([a-zA-Z0-9_-]+)/i);
            if (dockerAppMatch) { netConfig["DOCKER_APP_NAME"] = dockerAppMatch[1]; updated = true; }

            const dockerDbNameMatch = textMod2.match(/имя БД\s*-\s*([a-zA-Z0-9_-]+)/i);
            if (dockerDbNameMatch) { netConfig["DOCKER_DB_NAME"] = dockerDbNameMatch[1]; updated = true; }

            const dockerDbUserMatch = textMod2.match(/пользователь\s+([a-zA-Z0-9_-]+)\s*с паролем/i);
            if (dockerDbUserMatch) { netConfig["DOCKER_DB_USER"] = dockerDbUserMatch[1]; updated = true; }

            const webDbMatch = textMod2.match(/базу данных\s+([a-zA-Z0-9_-]+)/i);
            if (webDbMatch) { netConfig["WEB_DB"] = webDbMatch[1]; updated = true; }

            const webUserMatch = textMod2.match(/Создайте пользователя\s+([a-zA-Z0-9_-]+)\s*с паролем/i);
            if (webUserMatch) { netConfig["WEB_USER"] = webUserMatch[1]; updated = true; }

            const webDumpMatch = textMod2.match(/из файла\s+([a-zA-Z0-9_.-]+)\s+в базу/i);
            if (webDumpMatch) { netConfig["WEB_DUMP"] = webDumpMatch[1]; updated = true; }

            const nginxUserMatch = textMod2.match(/логина для аутентификации выберите\s+([a-zA-Z0-9_-]+)/i);
            if (nginxUserMatch) { netConfig["NGINX_AUTH_USER"] = nginxUserMatch[1]; updated = true; }
            
            const nginxFileMatch = textMod2.match(/Выберите файл\s+(\/[a-zA-Z0-9_./-]+)\s+в качестве/i);
            if (nginxFileMatch) { netConfig["NGINX_AUTH_FILE"] = nginxFileMatch[1]; updated = true; }

            const port2Match = textMod2.match(/Пробросьте порт\s+(\d{4,5})\s*.*в порт\s*\d+\s*сервера.*ssh/i);
            if (port2Match) { netConfig["SSH_PORT_M2"] = port2Match[1]; updated = true; }
            else if (netConfig["SSH_PORT_M1"]) { netConfig["SSH_PORT_M2"] = netConfig["SSH_PORT_M1"]; } 
        }

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
