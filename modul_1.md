## ISP
# 1. Base
```bash
hostnamectl hostname ISP; exec bash
sed -i "s/HOSTNAME=localhost/HOSTNAME=ISP/g" /etc/sysconfig/network
apt-get update && apt-get install mc iptables -y
mkdir -p /etc/net/ifaces/enp7s{2,3}/
echo 'TYPE=eth' | tee /etc/net/ifaces/enp7s{2,3}/options
echo "BOOTPROTO=static" >> /etc/net/ifaces/enp7s2/options
echo "BOOTPROTO=static" >> /etc/net/ifaces/enp7s3/options
echo '{{ISP_IP_1}}/{{M_EXT}}' > /etc/net/ifaces/enp7s2/ipv4address
echo '{{ISP_IP_2}}/{{M_EXT}}' > /etc/net/ifaces/enp7s3/ipv4address
sed -i 's/net.ipv4.ip_forward = 0/net.ipv4.ip_forward = 1/' /etc/net/sysctl.conf
systemctl restart network
iptables -t nat -F
iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE
iptables-save >> /etc/sysconfig/iptables
systemctl enable --now iptables
```

## HQ-RTR

# 1. Base

```bash
hostnamectl hostname HQ-RTR.{{DOMAIN}}; exec bash
sed -i "s/HOSTNAME=localhost/HOSTNAME=hq-rtr.{{DOMAIN}}/g" /etc/sysconfig/network
mkdir -p /etc/net/ifaces/{enp7s2,enp7s2.{{VLAN_1}},enp7s2.{{VLAN_2}},enp7s2.{{VLAN_3}}}
echo "{{HQ_RTR_EXT}}/{{M_EXT}}" > /etc/net/ifaces/enp7s1/ipv4address
echo "TYPE=eth" | tee /etc/net/ifaces/enp7s{1,2}/options
echo "default via {{ISP_IP_1}}" > /etc/net/ifaces/enp7s1/ipv4route
echo "nameserver 8.8.8.8" > /etc/net/ifaces/enp7s1/resolv.conf
echo -e "TYPE=vlan\nHOST=enp7s2\nVID={{VLAN_1}}" > /etc/net/ifaces/enp7s2.{{VLAN_1}}/options
echo -e "TYPE=vlan\nHOST=enp7s2\nVID={{VLAN_2}}" > /etc/net/ifaces/enp7s2.{{VLAN_2}}/options
echo -e "TYPE=vlan\nHOST=enp7s2\nVID={{VLAN_3}}" > /etc/net/ifaces/enp7s2.{{VLAN_3}}/options
echo "{{HQ_RTR_V100}}/{{M_VLAN1}}" > /etc/net/ifaces/enp7s2.{{VLAN_1}}/ipv4address
echo "{{HQ_RTR_V200}}/{{M_VLAN2}}" > /etc/net/ifaces/enp7s2.{{VLAN_2}}/ipv4address
echo "{{HQ_RTR_V999}}/{{M_VLAN3}}" > /etc/net/ifaces/enp7s2.{{VLAN_3}}/ipv4address
sed -i 's/net.ipv4.ip_forward = 0/net.ipv4.ip_forward = 1/' /etc/net/sysctl.conf
systemctl restart network
apt-get update && apt-get install sudo tzdata frr dnsmasq iptables -y
iptables -t nat -F
iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE
iptables-save >> /etc/sysconfig/iptables
systemctl enable --now iptables
```

# 3. Users

```bash
useradd -m -G wheel {{RTR_USER}}
echo "{{RTR_USER}}:{{PASS_MAIN}}" | chpasswd
echo "{{RTR_USER}} ALL=(ALL:ALL) NOPASSWD: ALL" > /etc/sudoers.d/{{RTR_USER}}

```

# 6. Tunnel

```bash
mkdir -p /etc/net/ifaces/gre1
cat <<EOF > /etc/net/ifaces/gre1/options
TYPE=iptun
TUNTYPE=gre
TUNLOCAL={{HQ_RTR_EXT}}
TUNREMOTE={{BR_RTR_EXT}}
TUNTTL=64
TUNOPTIONS='ttl 64'
HOST=enp7s1
EOF
echo "{{TUNNEL_HQ}}/{{M_TUN}}" > /etc/net/ifaces/gre1/ipv4address
systemctl restart network
```

# 7. Routing

```bash
sed -i "s/ospfd=no/ospfd=yes/g" /etc/frr/daemons
systemctl enable --now frr.service
vtysh
configure terminal
router ospf
passive-interface default
network {{NET_TUN}}/{{M_TUN}} area 0
network {{NET_VLAN1}}/{{M_VLAN1}} area 0
network {{NET_VLAN2}}/{{M_VLAN2}} area 0
network {{NET_VLAN3}}/{{M_VLAN3}} area 0
exit
interface gre1
no ip ospf passive
ip ospf authentication message-digest
ip ospf message-digest-key 1 md5 {{PASS_MAIN}}
end
wr mem
exit

```

# 8. NAT

```bash
iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE
iptables-save >> /etc/sysconfig/iptables
systemctl enable --now iptables
```

# 9. DHCP

```bash
sed -i "s/AUTO_LOCAL_RESOLVER=yes/AUTO_LOCAL_RESOLVER=no/g" /etc/sysconfig/dnsmasq
cat <<EOF > /etc/dnsmasq.conf
port=0
interface=enp7s2.{{VLAN_2}}
listen-address={{HQ_RTR_V200}}
dhcp-authoritative
dhcp-range=interface:enp7s2.{{VLAN_2}},{{NET_VLAN2_START}},{{NET_VLAN2_END}},12h
dhcp-option=3,{{HQ_RTR_V200}}
dhcp-option=6,{{HQ_SRV_IP_M1}}
dhcp-option=15,{{DOMAIN}}
leasefile-ro
EOF
systemctl enable --now dnsmasq
```

# 11. Timezone

```bash
timedatectl set-timezone Europe/Moscow

```

## BR-RTR

# 1. Base

```bash
hostnamectl hostname BR-RTR.{{DOMAIN}}; exec bash
sed -i "s/HOSTNAME=localhost/HOSTNAME=br-rtr.{{DOMAIN}}/g" /etc/sysconfig/network
mkdir -p /etc/net/ifaces/enp7s{1,2}
echo "TYPE=eth" | tee /etc/net/ifaces/enp7s{1,2}/options
echo "{{BR_RTR_EXT}}/{{M_EXT}}" > /etc/net/ifaces/enp7s1/ipv4address
echo "{{BR_RTR_INT_M1}}/{{M_BR_SRV}}" > /etc/net/ifaces/enp7s2/ipv4address
echo "default via {{ISP_IP_2}}" > /etc/net/ifaces/enp7s1/ipv4route
echo "nameserver 8.8.8.8" > /etc/net/ifaces/enp7s1/resolv.conf
echo "nameserver 8.8.8.8" > /etc/resolv.conf
sed -i 's/net.ipv4.ip_forward = 0/net.ipv4.ip_forward = 1/' /etc/net/sysctl.conf
systemctl restart network
apt-get update && apt-get install sudo tzdata frr iptables -y
iptables -t nat -A POSTROUTING -o enp7s1 -j MASQUERADE
iptables-save >> /etc/sysconfig/iptables
systemctl enable --now iptables
```

# 3. Users

```bash
useradd -m -G wheel {{RTR_USER}}
echo "{{RTR_USER}}:{{PASS_MAIN}}" | chpasswd
echo "{{RTR_USER}} ALL=(ALL:ALL) NOPASSWD: ALL" > /etc/sudoers.d/{{RTR_USER}}

```

# 6. Tunnel

```bash
mkdir -p /etc/net/ifaces/gre1
cat <<EOF > /etc/net/ifaces/gre1/options
TYPE=iptun
TUNTYPE=gre
TUNLOCAL={{BR_RTR_EXT}}
TUNREMOTE={{HQ_RTR_EXT}}
TUNTTL=64
TUNOPTIONS='ttl 64'
HOST=enp7s1
EOF
echo "{{TUNNEL_BR}}/{{M_TUN}}" > /etc/net/ifaces/gre1/ipv4address
systemctl restart network

```

# 7. Routing

```bash
sed -i "s/ospfd=no/ospfd=yes/g" /etc/frr/daemons
systemctl enable --now frr.service
vtysh
configure terminal
router ospf
passive-interface default
network {{NET_TUN}}/{{M_TUN}} area 0
network {{NET_BR_SRV}}/{{M_BR_SRV}} area 0
exit
interface gre1
no ip ospf passive
ip ospf authentication message-digest
ip ospf message-digest-key 1 md5 {{PASS_MAIN}}
end
wr mem
exit

```

# 11. Timezone

```bash
cat <<EOF > /etc/net/ifaces/enp7s1/resolv.conf
search {{DOMAIN}}
nameserver {{HQ_SRV_IP_M1}}
EOF

timedatectl set-timezone Europe/Moscow
```

## HQ-SRV

# 1. Base

```bash
hostnamectl hostname HQ-SRV.{{DOMAIN}}; exec bash
sed -i "s/HOSTNAME=localhost/HOSTNAME=hq-srv.{{DOMAIN}}/g" /etc/sysconfig/network
mkdir -p /etc/net/ifaces/{enp7s1,enp7s1.{{VLAN_1}}}
echo "TYPE=eth" > /etc/net/ifaces/enp7s1/options
echo -e "TYPE=vlan\nHOST=enp7s1\nVID={{VLAN_1}}" > /etc/net/ifaces/enp7s1.{{VLAN_1}}/options
echo "{{HQ_SRV_IP_M1}}/{{M_VLAN1}}" > /etc/net/ifaces/enp7s1.{{VLAN_1}}/ipv4address
echo "default via {{HQ_RTR_V100}}" > /etc/net/ifaces/enp7s1.{{VLAN_1}}/ipv4route
cat <<EOF > /etc/net/ifaces/enp7s1.{{VLAN_1}}/resolv.conf
search {{DOMAIN}}
nameserver 8.8.8.8
EOF
systemctl restart network

```

# 3. Users

```bash
useradd -m -u {{UID_USER}} -G wheel {{SRV_USER}}
echo "{{SRV_USER}}:{{PASS_MAIN}}" | chpasswd
echo "{{SRV_USER}} ALL=(ALL:ALL) NOPASSWD: ALL" > /etc/sudoers.d/{{SRV_USER}}
```

# 5. SSH

```bash
echo "{{SSH_BANNER}}" > /etc/openssh/banner
sed -i "s/#Port 22/Port {{SSH_PORT_M1}}/" /etc/openssh/sshd_config
echo "MaxAuthTries {{SSH_MAX_TRIES}}" >> /etc/openssh/sshd_config
echo "AllowUsers {{SRV_USER}}" >> /etc/openssh/sshd_config
echo "Banner /etc/openssh/banner" >> /etc/openssh/sshd_config
systemctl restart sshd
```

# 10. DNS

```bash
apt-get update && apt-get install bind bind-utils -y
rndc-confgen -a -c /etc/bind/rndc.key
cat <<EOF > /etc/bind/options.conf
options {
    directory "/etc/bind/zone";
    dump-file "/var/run/named/named_dump.db";
    statistics-file "/var/run/named/named.stats";
    recursing-file "/var/run/named/named.recursing";
    secroots-file "/var/run/named/named.secroots";
    listen-on { any; };
    forwarders { {{DNS_FORWARDER}}; };
    recursion yes;
    allow-query { any; };
    allow-recursion { any; };
    dnssec-validation no;
};
EOF

mkdir -p /etc/bind/zone
chown -R root:named /etc/bind/zone
chmod 750 /etc/bind/zone
chmod 755 /etc/bind

cat <<EOF > /etc/bind/local.conf
zone "{{DOMAIN}}" { type master; file "{{DOMAIN}}"; };
zone "{{REV_ZONE}}" { type master; file "{{REV_ZONE}}"; };
EOF

cat <<EOF > /etc/bind/zone/{{DOMAIN}}
\$TTL 1D
@       IN      SOA     hq-srv.{{DOMAIN}}. root.{{DOMAIN}}. ( 1 8H 2H 4W 1D )
        IN      NS      hq-srv.{{DOMAIN}}.
hq-srv  IN      A       {{HQ_SRV_IP_M1}}
hq-rtr  IN      A       {{HQ_RTR_V100}}
hq-cli  IN      A       {{NET_VLAN2_START}}
br-rtr  IN      A       {{BR_RTR_INT_M1}}
br-srv  IN      A       {{BR_SRV_IP_M1}}
docker  IN      A       {{ISP_IP_1}}
web     IN      A       {{ISP_IP_2}}
EOF

cat <<EOF > /etc/bind/zone/{{REV_ZONE}}
\$TTL 1D
@       IN      SOA     hq-srv.{{DOMAIN}}. root.{{DOMAIN}}. ( 1 8H 2H 4W 1D )
        IN      NS      hq-srv.{{DOMAIN}}.
{{PTR_HQ_RTR}}   IN      PTR     hq-rtr.{{DOMAIN}}.
{{PTR_HQ_SRV}}   IN      PTR     hq-srv.{{DOMAIN}}.
{{PTR_HQ_CLI}}   IN      PTR     hq-cli.{{DOMAIN}}.
EOF

chown -R root:named /etc/bind/zone
chmod 640 /etc/bind/zone/{{DOMAIN}} /etc/bind/zone/{{REV_ZONE}}

cat <<EOF > /etc/net/ifaces/enp7s1.{{VLAN_1}}/resolv.conf
search {{DOMAIN}}
nameserver {{HQ_SRV_IP_M1}}
EOF

systemctl restart network
systemctl enable --now bind
```

# 11. Timezone

```bash
timedatectl set-timezone Europe/Moscow

```

## BR-SRV

# 1. Base

```bash
hostnamectl hostname BR-SRV.{{DOMAIN}}; exec bash
sed -i "s/HOSTNAME=localhost/HOSTNAME=br-srv.{{DOMAIN}}/g" /etc/sysconfig/network
mkdir -p /etc/net/ifaces/enp7s1
echo "TYPE=eth" > /etc/net/ifaces/enp7s1/options
echo "{{BR_SRV_IP_M1}}/{{M_BR_SRV}}" > /etc/net/ifaces/enp7s1/ipv4address
echo "default via {{BR_RTR_INT_M1}}" > /etc/net/ifaces/enp7s1/ipv4route
cat <<EOF > /etc/net/ifaces/enp7s1/resolv.conf
search {{DOMAIN}}
nameserver {{HQ_SRV_IP_M1}}
EOF
systemctl restart network

```

# 3. Users

```bash
useradd -m -u {{UID_USER}} -G wheel {{SRV_USER}}
echo "{{SRV_USER}}:{{PASS_MAIN}}" | chpasswd
echo "{{SRV_USER}} ALL=(ALL:ALL) NOPASSWD: ALL" > /etc/sudoers.d/{{SRV_USER}}

```

# 5. SSH

```bash
echo "{{SSH_BANNER}}" > /etc/openssh/banner
sed -i "s/#Port 22/Port {{SSH_PORT_M1}}/" /etc/openssh/sshd_config
echo "MaxAuthTries {{SSH_MAX_TRIES}}" >> /etc/openssh/sshd_config
echo "AllowUsers {{SRV_USER}}" >> /etc/openssh/sshd_config
echo "Banner /etc/openssh/banner" >> /etc/openssh/sshd_config
systemctl restart sshd

```

# 11. Timezone

```bash
timedatectl set-timezone Europe/Moscow

```
