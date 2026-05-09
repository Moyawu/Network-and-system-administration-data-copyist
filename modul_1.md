## ISP

```bash
hostnamectl hostname ISP
bash

apt-get update
apt-get install mcedit

mkdir -p /etc/net/ifaces/ens{19,20}/
echo 'TYPE=eth' | tee /etc/net/ifaces/ens{19,20}/options
echo '172.16.1.1/28' > /etc/net/ifaces/ens19/ipv4address
echo '172.16.2.1/28' > /etc/net/ifaces/ens20/ipv4address
systemctl restart network

mcedit /etc/net/ifaces/ens19/ipv4address
172.16.1.1/28

mcedit /etc/net/ifaces/ens20/ipv4address
172.16.2.1/28

systemctl restart network

mcedit /etc/net/sysctl.conf
net.ipv4.ip_forward=1

apt-get install nftables

mcedit /etc/nftables/nftables.nft
table ip nat {
 chain postrouting {
 type nat hook postrouting priority srcnat;
 oifname "ens18" masquerade
}
}


systemctl enable --now nftables
```

HQ-RTR

```bash
hostnamectl hostname HQ-RTR.au-team.irpo

apt-get update
apt-get install sudo tzdata frr dnsmasq nftables -y

mkdir -p /etc/net/ifaces/{ens19,vlan{100,200,999},gre1} 
\mkdir -p /etc/net/ifaces/ens19
\mkdir -p /etc/net/ifaces/vlan100
\mkdir -p /etc/net/ifaces/vlan200
\mkdir -p /etc/net/ifaces/vlan999
\mkdir -p /etc/net/ifaces/gre1

echo 'TYPE=eth' | tee /etc/net/ifaces/ens{18,19}/options
echo '172.16.1.2/28' > /etc/net/ifaces/ens18/ipv4address
\echo 'TYPE=eth' | tee /etc/net/ifaces/ens18/options
\echo 'TYPE=eth' | tee /etc/net/ifaces/ens19/options

echo 'default via 172.16.1.1' > /etc/net/ifaces/ens18/ipv4route
echo 'nameserver 8.8.8.8' > /etc/net/ifaces/ens18/resolv.conf

echo -e 'TYPE=vlan\nHOST=ens19\nVID=100' > /etc/net/ifaces/vlan100/options
echo -e 'TYPE=vlan\nHOST=ens19\nVID=200' > /etc/net/ifaces/vlan200/options
echo -e 'TYPE=vlan\nHOST=ens19\nVID=999' > /etc/net/ifaces/vlan999/options

mcedit /etc/net/ifaces/gre1/options
TYPE=iptun
TUNTYPE=gre
TUNLOCAL=172.16.1.2
TUNREMOTE=172.16.2.2
TUNTTL=64
TUNOPTIONS='ttl 64'

echo '192.168.100.1/26' > /etc/net/ifaces/vlan100/ipv4address
echo '192.168.200.1/28' > /etc/net/ifaces/vlan200/ipv4address
echo '192.168.99.1/29' > /etc/net/ifaces/vlan999/ipv4address
echo "10.10.10.1/30" > /etc/net/ifaces/gre1/ipv4address

mcedit /etc/net/sysctl.conf
net.ipv4.ip_forward=1

systemctl restart network

timedatectl set-timezone Europe/Moscow

useradd net_admin
passwd net_admin 
P@ssw0rd
usermod -aG wheel net_admin

mcedit /etc/sudoers.d/net_admin
WHEEL_USERS ALL=(ALL:ALL) NOPASSWD: ALL

sudo mcedit /etc/frr/frr.conf
interface gre1
 ip ospf area 0
 ip ospf authentification
 ip ospf authentification-key P@ssw0rd
 no ip ospf passive
exit
 interface vlan100
 ip ospf area 0
exit
 interface vlan200
 ip ospf area 0
exit
 interface vlan999
 ip ospf area 0
exit
router ospf
 passive-interface default
exit

systemctl enable frr.service

mcedit /etc/frr/daemons
ospfd=yes

mcedit /etc/syscofig/dnsmasq
AUTO_LOCAL_RESOLVER=no

mcedit /etc/dnsmasq.conf
port=0
interface=vlan200
listen-address=192.168.200.1
dhcp-authoritative
dhcp-range=interface:vlan200,192.168.200.2,192.168.200.10,727h
dhcp-option=3,192.168.200.1
dhcp-option=6,192.168.100.2
leasefile-ro

\Don't send any default route
\dhcp-option=3
\Set the DNS server
\dhcp-option=6,8.8.8.8

systemctl restart dnsmasq

mcedit /etc/nftables/nftables.nft
table ip nat {
  chain postrouting {
    type nat hook postrouting priority srcnat;
    oifname "ens18" masquerade
  }
}

systemctl enable --now nftables
systemctl status frr
systemctl status dnsmasq
```

\ BR-RTR

```bash
hostnamectl hostname BR-RTR.au-team.irpo

apt-get update
apt-get install sudo tzdata frr nftables -y

mkdir -p /etc/net/ifaces/{ens{18,19},gre1}

ls -l /etc/net/ifaces/

echo 'TYPE=eth' | tee /etc/net/ifaces/ens{18,19}/options
echo ‘172.16.2.2/28’ > /etc/net/ifaces/ens18/ipv4address
echo ‘192.168.1.1/28’ > /etc/net/ifaces/ens19/ipv4address
echo ‘default via 172.16.2.1’ > /etc/net/ifaces/ens18/ipv4route
echo ‘nameserver 8.8.8.8’ > /etc/net/ifaces/ens18/resolv.conf

mcedit /etc/net/sysctl.conf
net.ipv4.conf.ip_forward = 1

systemctl restart network

mcedit /etc/net/ifaces/gre1/options
TYPE=iptun
TUNTYPE=gre
TUNLOCAL=172.16.2.2
TUNREMOTE=172.16.1.2
TUNTTL=64
TUNOPTIONS='ttl 64'

echo "10.10.10.2/30" > /etc/net/ifaces/gre1/ipv4address/

mcedit /etc/net/ifaces/ens18/resolv.conf
search au-team.irpo
nameserver 192.168.100.2

mcedit /etc/nftables/nftables.nft
table ip nat {
  chain postrouting {
    type nat hook postrouting priority srcnat;
    oifname "ens18" masquerade
  }
}

systemctl enable --now nftables

timedatectl set-timezone Europe/Moscow

useradd net_admin
passwd net_admin
P@ssw0rd
usermod -aG wheel net_admin

mcedit /etc/sudoers.d/net_admin
WHEEL_USERS ALL=(ALL:ALL) NOPASSWD: ALL

sudo mcedit /etc/frr/frr.conf
interface gre1
 ip ospf area 0
 ip ospf authentification
 ip ospf authentification-key P@ssw0rd
 no ip ospf passive
exit
interface ens19
 ip ospf area 0
exit
router ospf
 passive-interface default
exit

systemctl enable frr.service

mcedit /etc/frr/daemons
ospfd=yes
```

\ HQ-SRV

```bash

hostnamectl hostname HQ-SRV.au-team.irpo

bash

timedatactl set-timezone Europe/Moskow

mcedit /etc/net/ifaces/ens18/options
TYPE=eth

mcedit /etc/net/ifaces/ens18/ipv4address
192.168.100.2/27

mcedit /etc/net/ifaces/ens18/ipv4router
default via 192.168.100.1

mcedit /etc/net/ifaces/ens18/resolve.conf
nameserver 8.8.8.8

systemctl restart network

ip -br -c a

useradd -u 1010 sshuser
passwd sshuser
P@ssw0rd
usermod -aG wheel sshuser

mcedit /etc/sudoers.d/sshuser
WHEEL_USERS ALL=(ALL:ALL) NOPASSWD: ALL

mcedit /etc/openssh/banner
---------------------
Authrized access only
=====================
<===================>

mcedit /etc/openssh/sshd_config
Port 2025
MaxAuthTries 2
AllowUsers sshuser
Banner /etc/openssh/banner

systemctl restart sshd

apt-update
apt-get install bind bind-utils -y

rndc-confgen -a -c /etc/bind/rndc.key

mcedit /etc/bind/options.conf
options {
//  version "unknown";
    directory "/etc/bind/zone":
    dump-file "/var/run/named/named_dump.db";
    statistics-file "/var/run/named/named.stats":
    recursing-file "/var/run/named/named.recursing":
    secroots-file "/var/run/named/named.secroots";
    
    listen-on { any; };
    forwarders { 77.88.8.7; 77.88.8.3; };
    recursion yes;
    allow-query { any; };
    allow-recursion { any; };
    dnssec-validation no;
};

mcedit /etc/bind/local.conf
zone "au-team.irpo" {
type master;
file "au-team.irpo";
};
zone "168.192.in-addr.arpa" {
type master;
file "168.192.in-addr.arpa";
};

cp /etc/bind/zone/empty /etc/bind/zone/{au-team.irpo,168.192.in-addr.arpa}
mcedit /etc/bind/zone/au-team.irpo
IN      SOA     au-team.irpo. root.au-team.irpo.
...
@       IN      NS      hq-srv.au-tean.irpo.
hq-srv  IN      A       192.168.100.2
hq-rtr  IN      A       192.168.100.1
hq-cli  IN      A       192.168.100.2
br-rtr  IN      A       192.168.1.1
br-srv  IN      A       192.168.1.2
moodle  CNAME           hq-rtr.
wiki    CNAME           hq-rtr.

mcedit /etc/bind/zone/168.192.in-addr.arpa
IN      SOA     au-team.irpo. root.au-team.irpo.
...
@       IN      NS      au-tean.irpo.
1.100   IN      PTR     hq-rtr.au-tean.irpo.
2.100   IN      PTR     hq-srv.au-tean.irpo.
2.200   IN      PTR     hq-cli.au-tean.irpo.

mcedit /etc/net/ifaces/ens18/resolv.conf
serch au-team.irpo
nameserver 192.168.100.2

chown :named /etc/bind/zone/{168.192.in-addr.arpa,au-team.irpo}

systemctl restart bind
systemctl restart network
systemctl enable bind
```

\ BR-RTR и HQ-RTR

```bash

systemctl stop nftables
systemctl start nftables \через 2 минуты после остановки

```

\ BR-SRV

```bash

hostnamect hostname BR-RTR.au-team.ru

timedatectl set-timezone Europe/Moscow

mcedit /etc/net/ifaces/ens18/options
TYPE=eth

mcedit /etc/net/ifaces/ens18/ipv4router
192.168.1.2/28

mcedit /etc/net/ifaces/ens18/ipv4address
default via 192.168.1.1

mcedit /etc/net/ifaces/ens18/resolv.conf
nameserver 192.168.100.2

systemctl restart network

useradd -u 1010 sshuser
passwd sshuser
usermod -aG wheel sshuser

mcedit /etc/sudoers.d/sshuser
WHEEL_USERS ALL=(ALL:ALL) NOPASSWD: ALL

mcedit /etc/openssh/banner

---------------------
Authrized access only
=====================
<------------------->

mcedit /etc/openssh/sshd_config
Port 2025
MaxAuthTries 2
AllowUsers sshuser
Banner /etc/openssh/banner

systemctl restart sshd 
```