## ISP
# 4. NTP
```bash
cat <<EOF > /etc/apt/sources.list.d/alt.list
rpm [p10] http://169.254.180.171 p10/branch/x86_64 classic gostcrypto
rpm [p10] http://169.254.180.171 p10/branch/x86_64-i586 classic
rpm [p10] http://169.254.180.171 p10/branch/noarch classic
EOF
apt-get update && apt-get install -y chrony mc
mcedit /etc/chrony.conf
{{DOWN}}{{DOWN}}
local stratum {{NTP_STRATUM}}
allow 0.0.0.0/0
{{EXIT_MCEDIT}}
systemctl restart chronyd
systemctl enable --now chronyd
systemctl start sshd
```

# 9. Nginx

```bash
apt-get update && apt-get install -y apache2-htpasswd nginx
htpasswd -b -c {{NGINX_AUTH_FILE}} {{NGINX_AUTH_USER}} {{PASS_MAIN}}
cat <<EOF > /etc/nginx/sites-available.d/default.conf
server {
    listen 80;
    server_name {{NGINX_WEB_DOMAIN}};
    location / {
        proxy_pass http://{{HQ_NGINX_PROXY}}:8080;
        auth_basic "Vnimanie";
        auth_basic_user_file {{NGINX_AUTH_FILE}};
    }
}
server {
    listen 80;
    server_name {{NGINX_DOCKER_DOMAIN}};
    location / {
        proxy_pass http://{{BR_NGINX_PROXY}}:8080;
    }
}
EOF
ln -sf /etc/nginx/sites-available.d/default.conf /etc/nginx/sites-enabled.d/
systemctl enable --now nginx

```

## HQ-RTR

# 1. DNS

```bash
cat <<EOF > /etc/apt/sources.list.d/alt.list
rpm [p10] http://169.254.180.171 p10/branch/x86_64 classic gostcrypto
rpm [p10] http://169.254.180.171 p10/branch/x86_64-i586 classic
rpm [p10] http://169.254.180.171 p10/branch/noarch classic
EOF
apt-get update && apt-get install -y iptables mc 

sed -i 's/^dhcp-option=6,[0-9.]\+/dhcp-option=6,192.168.3.10/' /etc/dnsmasq.conf

systemctl restart dnsmasq
```

# 4. NTP

```bash
apt-get update && apt-get install chrony -y
mcedit /etc/chrony.conf
{{DOWN}}#{{DOWN}}
server 172.16.1.1 iburst
{{EXIT_MCEDIT}}
systemctl restart chronyd
systemctl enable --now chronyd
systemctl start sshd
```

# 8. Forwarding

```bash
apt-get update && apt-get install -y iptables
iptables -t nat -A PREROUTING -i enp7s1 -p tcp --dport {{SSH_PORT_M2}} -j DNAT --to-destination {{HQ_SRV_IP_M2}}:{{SSH_PORT_M2}}
iptables -t nat -A PREROUTING -i enp7s1 -p tcp --dport 8080 -j DNAT --to-destination {{HQ_SRV_IP_M2}}:80
iptables-save >> /etc/sysconfig/iptables
systemctl enable --now iptables
```

## BR-RTR

# 4. NTP

```bash
cat <<EOF > /etc/apt/sources.list.d/alt.list
rpm [p10] http://169.254.180.171 p10/branch/x86_64 classic gostcrypto
rpm [p10] http://169.254.180.171 p10/branch/x86_64-i586 classic
rpm [p10] http://169.254.180.171 p10/branch/noarch classic
EOF
apt-get update && apt-get install -y chrony
mcedit /etc/chrony.conf
{{DOWN}}#{{DOWN}}
server 172.16.1.1 iburst
{{EXIT_MCEDIT}}
systemctl restart chronyd
systemctl start sshd
```

# 8. Forwarding

```bash
apt-get update && apt-get install -y iptables
iptables -t nat -A PREROUTING -i enp7s1 -p tcp --dport {{SSH_PORT_M2}} -j DNAT --to-destination {{BR_SRV_IP_M2}}:{{SSH_PORT_M2}}
iptables -t nat -A PREROUTING -i enp7s1 -p tcp --dport 8080 -j DNAT --to-destination {{BR_SRV_IP_M2}}:8080
iptables-save >> /etc/sysconfig/iptables
systemctl enable --now iptables
```

## HQ-SRV

# 2. RAID

```bash
mdadm --create /dev/{{RAID_DEV}} -l {{RAID_LVL}} -n 2 /dev/sdb /dev/sdc
mkfs.{{RAID_FS}} /dev/{{RAID_DEV}}
mkdir -p {{RAID_MNT}}
echo "/dev/{{RAID_DEV}} {{RAID_MNT}} {{RAID_FS}} defaults 0 0" >> /etc/fstab
mount -av
mdadm --detail --scan --verbose | tee -a /etc/mdadm.conf
```

# 3. NFS

```bash
apt-get update && apt-get install -y nfs-server nfs-utils
mkdir -p {{NFS_MNT}}
chmod -R 777 {{NFS_MNT}}
echo "{{NFS_MNT}} {{HQ_CLI_IP_M2}}/28(rw,no_root_squash)" > /etc/exports
exportfs -arv
systemctl enable --now nfs-server.service

```

# 4. NTP

```bash
mcedit /etc/chrony.conf
{{DOWN}}#{{DOWN}}
server 172.16.1.1 iburst
{{EXIT_MCEDIT}}
systemctl restart chronyd
systemctl enable --now chronyd
systemctl start sshd
```

# 7. Apache

```bash
apt-get install -y lamp-server
mount /dev/sr0 /mnt/
cp /mnt/web/{{WEB_INDEX}} /var/www/html/
cp /mnt/web/logo.png /var/www/html/
sed -i 's/$username = "user"/$username = "{{WEB_USER}}"/' /var/www/html/{{WEB_INDEX}}
sed -i 's/$password = "password"/$password = "{{PASS_MAIN}}"/' /var/www/html/{{WEB_INDEX}}
sed -i 's/$dbname = "db"/$dbname = "{{WEB_DB}}"/' /var/www/html/{{WEB_INDEX}}

systemctl enable --now mariadb
mariadb -u root -e "CREATE DATABASE {{WEB_DB}};"
mariadb -u root -e "CREATE USER '{{WEB_USER}}'@'localhost' IDENTIFIED BY '{{PASS_MAIN}}';"
mariadb -u root -e "GRANT ALL PRIVILEGES ON {{WEB_DB}}.* TO '{{WEB_USER}}'@'localhost' WITH GRANT OPTION;"
mariadb -u root -e "FLUSH PRIVILEGES;"
mariadb -u {{WEB_USER}} -p{{PASS_MAIN}} -D {{WEB_DB}} < /mnt/web/{{WEB_DUMP}}
systemctl enable --now httpd2

```

## BR-SRV

# 1. DNS

```bash
cat <<EOF > /etc/apt/sources.list.d/alt.list
rpm [p10] http://169.254.180.171 p10/branch/x86_64 classic gostcrypto
rpm [p10] http://169.254.180.171 p10/branch/x86_64-i586 classic
rpm [p10] http://169.254.180.171 p10/branch/noarch classic
EOF
apt-get update && apt-get install -y task-samba-dc
rm -f /etc/samba/smb.conf
rm -rf /var/lib/samba/
rm -rf /var/cache/samba/
mkdir -p /var/lib/samba/sysvol
samba-tool domain provision --server-role={{SAMBA_ROLE}} {{SAMBA_RFC2307}} --dns-backend={{SAMBA_DNS_BACKEND}} --realm={{DOMAIN}} --domain={{SAMBA_NETBIOS}} --adminpass={{PASS_MAIN}}
cp /var/lib/samba/private/krb5.conf /etc/krb5.conf
/etc/krb5.conf
systemctl enable --now samba
echo "nameserver 127.0.0.1" > /etc/net/ifaces/enp7s1/resolv.conf
systemctl restart network

samba-tool group add {{SAMBA_GROUP}}
for i in {1..{{SAMBA_USERS_COUNT}}}; do
  samba-tool user add hquser$i {{PASS_MAIN}}
  samba-tool user setexpiry hquser$i --noexpiry
  samba-tool group addmembers "{{SAMBA_GROUP}}" hquser$i;
done

```

# 4. NTP

```bash
mcedit /etc/chrony.conf
{{DOWN}}#{{DOWN}}
server 172.16.1.1 iburst
{{EXIT_MCEDIT}}
systemctl restart chronyd
systemctl enable --now chronyd
systemctl start sshd
```

# 5. Ansible

```bash
apt-get update && apt-get install -y ansible sshpass
mkdir -p /etc/ansible
export ANSIBLE_HOST_KEY_CHECKING=False
sed -i 's/^#\s*inventory\s*=.*/inventory = \/etc\/ansible\/hosts/' /etc/ansible/ansible.cfg
sed -i 's/^#\s*host_key_checking\s*=.*/host_key_checking = False/' /etc/ansible/ansible.cfg
sed -i 's/^#\s*timeout\s*=.*/timeout = 10/' /etc/ansible/ansible.cfg
cat <<EOF > /etc/ansible/hosts
HQ-SRV ansible_ssh_host={{HQ_SRV_IP_M2}} ansible_user=sshuser ansible_password={{PASS_MAIN}} ansible_port={{SSH_PORT_M2}}
HQ-CLI ansible_ssh_host={{HQ_CLI_IP_M2}} ansible_user=user ansible_password=resu
HQ-RTR ansible_ssh_host={{HQ_RTR_INT_M2}} ansible_user=net_admin ansible_password={{PASS_MAIN}}
BR-RTR ansible_ssh_host={{BR_RTR_INT_M2}} ansible_user=net_admin ansible_password={{PASS_MAIN}}

[all:vars]
ansible_python_interpreter=/usr/bin/python3
ansible_ssh_common_args='-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'
EOF

ssh 
```

# 6. Docker

```bash
apt-get update && apt-get install -y docker-engine docker-compose-v2
systemctl enable --now docker.service
mount /dev/sr0 /mnt/
docker load < /mnt/docker/site_latest.tar
docker load < /mnt/docker/mariadb_latest.tar
cat <<EOF > compose.yaml
services:
  database:
    container_name: db
    image: {{DOCKER_IMG_DB}}
    restart: always
    ports:
      - "3306:3306"
    environment:
      MARIADB_DATABASE: "{{DOCKER_DB_NAME}}"
      MARIADB_USER: "{{DOCKER_DB_USER}}"
      MARIADB_PASSWORD: "{{PASS_MAIN}}"
      MARIADB_ROOT_PASSWORD: "toor"

  app:
    container_name: {{DOCKER_APP_NAME}}
    image: {{DOCKER_IMG_APP}}
    restart: always
    ports:
      - "{{DOCKER_PORT}}:8080"
    environment:
      DB_TYPE: "maria"
      DB_HOST: "{{BR_SRV_IP_M2}}"
      DB_PORT: "3306"
      DB_NAME: "{{DOCKER_DB_NAME}}"
      DB_USER: "{{DOCKER_DB_USER}}"
      DB_PASS: "{{PASS_MAIN}}"
    depends_on:
      - database
EOF
docker compose up -d

```

## HQ-CLI

# 1. DNS

```bash
cat <<EOF > /etc/apt/sources.list.d/alt.list
rpm [p10] http://169.254.180.171 p10/branch/x86_64 classic gostcrypto
rpm [p10] http://169.254.180.171 p10/branch/x86_64-i586 classic
rpm [p10] http://169.254.180.171 p10/branch/noarch classic
EOF
systemctl restart NetworkManager
apt-get update && apt-get install -y task-auth-ad-sssd
adcli join {{DOMAIN}} -U Administrator
reboot
roleadd hq wheel
mcedit /etc/sudoers.d/hq
Cmnd_Alias SHELLCMD = /bin/cat, /bin/grep, /usr/bin/id
WHEEL_USERS ALL=(ALL:ALL) SHELLCMD

```

# 3. NFS

```bash
apt-get update && apt-get install -y nfs-utils nfs-clients
mkdir -p {{NFS_CLI_MNT}}
chmod -R 777 /mnt/nfs
echo "{{HQ_SRV_IP_M2}}:{{NFS_MNT}} {{NFS_CLI_MNT}} nfs defaults,_netdev,nolock 0 0" >> /etc/fstab
mount -av

```

# 4. NTP

```bash
mcedit /etc/chrony.conf
{{DOWN}}#{{DOWN}}
server 172.16.1.1 iburst
{{EXIT_MCEDIT}}
systemctl restart chronyd
systemctl enable --now chronyd
systemctl start sshd
```

# 11. Yandex

```bash
apt-get install yandex-browser-stable 

```