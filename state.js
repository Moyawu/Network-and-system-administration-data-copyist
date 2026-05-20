window.DeState = {
    defaultConfig: {
        "DOMAIN": "au-team.irpo", "PASS_MAIN": "P@ssw0rd",
        "UID_USER": "2026", "SSH_PORT_M1": "2026", "SSH_PORT_M2": "2026",
        "SRV_USER": "sshuser", "RTR_USER": "net_admin",
        "SSH_BANNER": "Authorized access only", "SSH_MAX_TRIES": "2",
        "DNS_FORWARDER": "77.88.8.7",
        "VLAN_1": "100", "VLAN_2": "200", "VLAN_3": "999", 
        
        "M_EXT": "28", "M_VLAN1": "27", "M_VLAN2": "27", "M_VLAN3": "29", "M_TUN": "30", "M_BR_SRV": "27",
        "NET_TUN": "10.10.10.0", "NET_VLAN1": "192.168.100.0", "NET_VLAN2": "192.168.200.0", "NET_VLAN3": "192.168.99.0", "NET_BR_SRV": "192.168.1.0",
        "NET_VLAN2_START": "192.168.200.2", "NET_VLAN2_END": "192.168.200.14",
        "PTR_HQ_RTR": "1.100.168.192", "PTR_HQ_SRV": "2.100.168.192", "PTR_HQ_CLI": "2.200.168.192",
        
        "ISP_IP_1": "172.16.1.1", "ISP_IP_2": "172.16.2.1",
        "ISP_NET_1": "172.16.1.0/28", "ISP_NET_2": "172.16.2.0/28",
        "HQ_RTR_EXT": "172.16.1.2", "HQ_RTR_V100": "192.168.100.1",
        "HQ_RTR_V200": "192.168.200.1", "HQ_RTR_V999": "192.168.99.1",
        "HQ_SRV_IP_M1": "192.168.100.2", "BR_RTR_EXT": "172.16.2.2",
        "BR_RTR_INT_M1": "192.168.1.1", "BR_SRV_IP_M1": "192.168.1.2",
        "TUNNEL_HQ": "10.10.10.1", "TUNNEL_BR": "10.10.10.2",
	"REV_ZONE": "100.168.192.in-addr.arpa",

        "RAID_LVL": "0", "RAID_DEV": "md0", "RAID_FS": "ext4", "RAID_MNT": "/raid",
        "NFS_MNT": "/raid/nfs", "NFS_CLI_MNT": "/mnt/nfs",
        "NTP_STRATUM": "5",
        "SAMBA_ROLE": "dc", "SAMBA_RFC2307": "--use-rfc2307", "SAMBA_DNS_BACKEND": "SAMBA_INTERNAL", "SAMBA_NETBIOS": "AU-TEAM",
        "SAMBA_GROUP": "hq", "SAMBA_USERS_COUNT": "5",
        "DOCKER_IMG_DB": "mariadb_latest", "DOCKER_IMG_APP": "site_latest",
        "DOCKER_APP_NAME": "tespapp", "DOCKER_DB_NAME": "testdb", "DOCKER_DB_USER": "test", "DOCKER_PORT": "8080",
        "WEB_DB": "webdb", "WEB_USER": "web", "WEB_DUMP": "dump.sql", "WEB_INDEX": "index.php",
        "NGINX_AUTH_USER": "WEB", "NGINX_AUTH_FILE": "/etc/nginx/.htpasswd",
        "NGINX_WEB_DOMAIN": "web.au-team.irpo", "NGINX_DOCKER_DOMAIN": "docker.au-team.irpo",
	"DNS_NEW_IP": "192.168.3.10",
        
        "HQ_SRV_IP_M2": "192.168.1.10", "HQ_CLI_IP_M2": "192.168.2.10",
        "BR_SRV_IP_M2": "192.168.3.10", "HQ_RTR_INT_M2": "192.168.1.1", 
        "BR_RTR_INT_M2": "192.168.3.1", "HQ_NGINX_PROXY": "172.16.1.10",
        "BR_NGINX_PROXY": "172.16.2.10"
    },
    
    keysMod1: [
        "DOMAIN", "PASS_MAIN", "UID_USER", "SSH_PORT_M1", "SRV_USER", "RTR_USER", 
        "VLAN_1", "VLAN_2", "VLAN_3", "DNS_FORWARDER", "ISP_IP_1", "ISP_IP_2", 
        "ISP_NET_1", "ISP_NET_2", "HQ_RTR_EXT", "HQ_RTR_V100", "HQ_RTR_V200", 
        "HQ_RTR_V999", "HQ_SRV_IP_M1", "BR_RTR_EXT", "BR_RTR_INT_M1", 
        "BR_SRV_IP_M1", "TUNNEL_HQ", "TUNNEL_BR"
    ],
    
    keysMod2: [
        "SSH_PORT_M2", "RAID_LVL", "RAID_DEV", "RAID_FS", "RAID_MNT", 
        "NFS_MNT", "NFS_CLI_MNT", "NTP_STRATUM", "SAMBA_GROUP", "SAMBA_USERS_COUNT",
        "DOCKER_APP_NAME", "DOCKER_DB_NAME", "DOCKER_DB_USER", "DOCKER_PORT",
        "WEB_DB", "WEB_USER", "WEB_DUMP", "NGINX_AUTH_USER", "NGINX_AUTH_FILE", 
        "NGINX_WEB_DOMAIN", "NGINX_DOCKER_DOMAIN", "ISP_IP_1", "ISP_IP_2", 
        "HQ_SRV_IP_M2", "HQ_CLI_IP_M2", "BR_SRV_IP_M2", "HQ_RTR_INT_M2", 
        "BR_RTR_INT_M2", "HQ_NGINX_PROXY", "BR_NGINX_PROXY"
    ],
    
    devices: ['ISP', 'HQ-RTR', 'HQ-SRV', 'HQ-CLI', 'BR-RTR', 'BR-SRV'],
    
    netConfig: {},
    rawTemplates: { mod1: "", mod2: "" },
    parsedPhases: { mod1: {}, mod2: {} }, 
    
    activeModule: 1, 
    activeStage: 1, 
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
                activeStage: this.activeStage 
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
                if (changes.activeStage) this.activeStage = changes.activeStage.newValue;
            });
        }
    }
};