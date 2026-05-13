window.DeState = {
    defaultConfig: {
        "DOMAIN": "au-team.irpo", "PASS_MAIN": "P@ssw0rd",
        "UID_USER": "2026", "SSH_PORT_M1": "2025", "SSH_PORT_M2": "2026",
        "VLAN_1": "100", "VLAN_2": "200", "VLAN_3": "999", "RAID_LVL": "1",
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
        "BR_NGINX_PROXY": "172.16.2.10"
    },
    // Добавили UID, SSH, VLAN-ы в первую фазу
    keysMod1: ["DOMAIN", "PASS_MAIN", "UID_USER", "SSH_PORT_M1", "VLAN_1", "VLAN_2", "VLAN_3", "ISP_IP_1", "ISP_IP_2", "ISP_NET_1", "ISP_NET_2", "HQ_RTR_EXT", "HQ_RTR_V100", "HQ_RTR_V200", "HQ_RTR_V999", "HQ_SRV_IP_M1", "BR_RTR_EXT", "BR_RTR_INT_M1", "BR_SRV_IP_M1", "TUNNEL_HQ", "TUNNEL_BR"],
    // Добавили RAID_LVL во вторую фазу
    keysMod2: ["DOMAIN", "PASS_MAIN", "UID_USER", "SSH_PORT_M2", "RAID_LVL", "ISP_IP_1", "ISP_IP_2", "ISP_NET_1", "ISP_NET_2", "HQ_SRV_IP_M2", "HQ_CLI_IP_M2", "BR_SRV_IP_M2", "HQ_RTR_INT_M2", "BR_RTR_INT_M2", "HQ_NGINX_PROXY", "BR_NGINX_PROXY"],
    devices: ['ISP', 'HQ-RTR', 'HQ-SRV', 'HQ-CLI', 'BR-RTR', 'BR-SRV'],
    
    netConfig: {},
    rawTemplates: { mod1: "", mod2: "" },
    parsedPhases: { mod1: { p1: {}, p2: {} }, mod2: { p1: {}, p2: {} } },
    
    activeModule: 1, 
    activePhase: 1, 
    ghostBuffer: "",

    hackermanMode: false,
    hackermanText: "",
    hackermanIndex: 0,
    typeLock: false,

    isContextValid: function() { 
        return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id; 
    },

    saveGlobalState: function() {
        if (this.isContextValid()) {
            chrome.storage.local.set({ 
                netConfig: this.netConfig, 
                ghostBuffer: this.ghostBuffer, 
                activeModule: this.activeModule, 
                activePhase: this.activePhase 
            }).catch(() => {});
        }
    },

    init: function(renderCallback) {
        this.netConfig = { ...this.defaultConfig };
        if (this.isContextValid()) {
            chrome.storage.onChanged.addListener((changes) => {
                if (changes.netConfig) { 
                    this.netConfig = changes.netConfig.newValue; 
                    if (document.getElementById('mw-content-text')) renderCallback(); 
                }
                if (changes.ghostBuffer) this.ghostBuffer = changes.ghostBuffer.newValue;
                if (changes.activeModule) this.activeModule = changes.activeModule.newValue;
                if (changes.activePhase) this.activePhase = changes.activePhase.newValue;
            });
        }
    }
};