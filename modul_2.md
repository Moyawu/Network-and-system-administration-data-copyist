## ansible 

```bash
apt-get install ansible sshpass
vim /etc/ansible/ansible.cfg
[defaults]
inventory = /etc/ansible/hosts
host_key_checking = False
timeout = 10
```
- не факт что пригодиться, в файле ansible.cfg, если не работает, дописать
```bash
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null

vim /etc/ansible/hosts
HQ-SRV ansible_ssh_host=192.168.1.10 ansible_user=sshuser ansible_password=P@ssw0rd ansible_port=2026
HQ-CLI ansible_ssh_host=192.168.2.10 ansible_user=user ansible_password=resu
HQ-RTR ansible_ssh_host=192.168.1.1 ansible_user=net_admin ansible_password=P@ssw0rd
BR-RTR ansible_ssh_host=192.168.3.1 ansible_user=net_admin ansible_password=P@ssw0rd
```
ПОСЛЕ ЧЕГО ВЕЗДЕ ОБЯЗАТЕЛЬНО ПЕРЕЗАПУСТИТЬ sshd и проверить на Hq-SRv пор 2026 в ссшд

# (chrony)
```bash
vim /etc/chrony.conf
pool (по умолчанию оставлять)
local stratum 5
# allow 0.0.0.0/0
**allow 172.16.1.0/28** - это более правильно
**allow 172.16.2.0/28** 
systemctl restart chronyd
```

## синхра 
HQ-RTR, BR-RTR, HQ-CLI, HQ-SRV, BR-SRV
```bash
vim /etc/chrony.conf 
server 172.16.1.1 iburst - HQ-RTR, HQ-CLI, HQ-SRV
server 172.16.2.1 iburst - BR-SRV, BR-RTR
#pool pool.ntp.org iburst
```

apt-get install -y yandex-browser-stable

## RAID MASSIVE 
```bash
mdadm --zero-superblock --force /dev/sdb /dev/sdc -- эта команда не обязательна
mdadm --create --verbose /dev/md0 -l 0 -n 2 /dev/sdb /dev/sdc
mdadm --detail --scan --verbose | tee -a /etc/mdadm.conf
mkfs.ext4 /dev/md0
vim /etc/fstab 
/dev/md0       /raid   ext4      defaults     0        0
mkdir /raid
mount -av
```

##  nfs server
```bash
apt-get install -y nfs-server nfs-utils                            
mkdir /raid/nfs
chmod 777 /raid/nfs
vim /etc/exports
/raid/nfs       192.168.2.0/28(rw,no_root_squash)
exportfs -arv
systemctl enable --now nfs-server
```

## nfs client
```bash
apt-get update && apt-get install -y nfs-utils nfs-clients 
mkdir /mnt/nfs
chmod 777 /mnt/nfs
vim /etc/fstab
192.168.1.10:/raid/nfs /mnt/nfs       nfs     defaults     0         0
mount -a
```
проверить создав текстовый файл по пути /mnt/nfs и /raid/

# Domain Controlller 
```bash
apt-get install -y task-samba-dc
rm -f /etc/samba/smb.conf
rm -rf /var/lib/samba
rm -rf /var/cache/samba
mkdir -p /var/lib/samba/sysvol
samba-tool domain provision
cp /var/lib/samba/private/krb5.conf /etc/krb5.conf
/ensp7/resolv.conf 
nameserver 127.0.0.1
kinit admin
samba-tool group add hq
samba-tool user add hquser1-5 P@ssw0rd
samba-tool user setexpiry hquser 1-5 --noexpiry
samba-tool group addmembers "hq" hquser1-5
```
зайти в hq-rtr и в параметрах dnsmasq поменять dhcp-option=6, 192.168.3.10                      #  -Br-SRV
dnsmasq restart

## domain client 
```bash
dhcpd
reboot
```
проверить resolv.conf
```bash
apt-get install task-auth-ad-sssd
```
ЦУП (центр управления системой)
войти в домен с учетными данными Administrator P@ss0wrd
```bash
roleadd hq wheel
vim /etc/sudoers.d/hq
Cmnd_Alias SCMD = /bin/cat/, /bin/grep, /usr/bin/id
WHEEL_USERS ALL(ALL:ALL) SCMD
exit
sudo id для проверки
```
 
# hq iptables
```bash
iptables -t nat -A PREROUTING -i enp7s1 -p tcp --dport 2026 -j DNAT --to-destination 192.168.1.10:2026 - на ssh
iptables -t nat -A PREROUTING -i enp7s1 -p tcp --dport 8080 -j DNAT --to-destination 192.168.1.10:80 - на сайт 
iptables - save >> /etc/sysconfig/iptables
systemctl enable --now iptables
```
# br iptables
```bash
iptables -t nat -A PREROUTING -i enp7s1 -p tcp --dport 2026 -j DNAT --to-destination 192.168.3.10:2026 - на ssh
iptables -t nat -A PREROUTING -i enp7s1 -p tcp --dport 8080 -j DNAT --to-destination 192.168.3.10:8080 - na web
iptables - save >> /etc/sysconfig/iptables
systemctl enable --now iptables
```

# NGINX 
```bash
apt-get update
apt-get install -y nginx

cat <<EOF > /etc/nginx/sites-available.d/default.conf
server {
    listen 80;
    server_name web.au-team.irpo;
    location / {
        proxy_pass http://172.16.1.10:8080;
    }
}

server {
    listen 80;
    server_name docker.au-team.irpo;
    location / {
        proxy_pass http://172.16.2.10:8080;
    }
}
EOF

ln -s /etc/nginx/sites-available.d/default.conf /etc/nginx/sites-enabled.d/
systemctl enable --now nginx
```

## hosts hq
```bash
mcedit /etc/hosts
192.168.1.10 web.au-team.irpo
192.168.3.10 docker.au-team.irpo
```
## saitik
```bash
apt-get update && apt-get install -y lamp-server
mount /dev/sr0 /mnt/
cp /mnt/web/index.php /var/www/html/
cp /mnt/web/logo.png /var/www/html/
sed -i 's/$username = "user"/$username = "web"/' /var/www/html/index.php
sed -i 's/$password = "password"/$password = "P@ssw0rd"/' /var/www/html/index.php
sed -i 's/$dbname = "db"/$dbname = "webdb"/' /var/www/html/index.php
systemctl enable --now mariadb

mariadb -u root -e "CREATE DATABASE webdb;"
mariadb -u root -e "CREATE USER 'web'@'localhost' IDENTIFIED BY 'P@ssw0rd';"
mariadb -u root -e "GRANT ALL PRIVILEGES ON webdb.* TO 'web'@'localhost' WITH GRANT OPTION;"
mariadb -u root -e "FLUSH PRIVILEGES;"

mariadb -u web -pP@ssw0rd -D webdb < /mnt/web/dump.sql
systemctl enable --now httpd2
```

## DOCKER 
```bash
apt-get install -y docker-engine docker-compose-v2
systemctl enable --now docker.service
mount /dev/sr0 /mnt/
docker load < /mnt/docker/site_latest.tar
docker load < /mnt/docker/mariadb_latest.tar

cat <<EOF > compose.yaml
services:
  database:
    container_name: db
    image: mariadb:10.11
    restart: always
    ports:
      - "3306:3306"
    environment:
      MARIADB_DATABASE: "testdb"
      MARIADB_USER: "test"
      MARIADB_PASSWORD: "P@ssw0rd"
      MARIADB_ROOT_PASSWORD: "toor"

  app:
    container_name: testapp
    image: site:latest
    restart: always
    ports:
      - "8080:8080"
    environment:
      DB_TYPE: "maria"
      DB_HOST: "192.168.3.10"
      DB_PORT: "3306"
      DB_NAME: "testdb"
      DB_USER: "test"
      DB_PASS: "P@ssw0rd"
    depends_on:
      - database
EOF
docker compose up -d
```

## AUTH NGINX
```bash
apt-get install -y apache2-htpasswd
```

# Правильный способ создания пароля без интерактива
```bash
htpasswd -b -c /etc/nginx/.htpasswd WEB P@ssw0rd

cat <<EOF > /etc/nginx/sites-available.d/default.conf
server {
    listen 80;
    server_name web.au-team.irpo;
    location / {
        proxy_pass http://172.2.1.10:8080;
        auth_basic "Vnimanie";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}

server {
    listen 80;
    server_name docker.au-team.irpo;
    location / {
        proxy_pass http://172.16.2.10:8080;
    }
}
EOF

systemctl restart nginx
```