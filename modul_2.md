
## HQ-SRV

```bash
mdadm --create /dev/md0 -l {{RAID_LVL}} -n 2 /dev/sdb /dev/sdc
mdadm --detail --scan --verbose | tee -a /etc/mdadm.conf
mkfs.ext4 /dev/md0
mkdir -p /raid
echo "/dev/md0 /raid ext4 defaults 0 0" >> /etc/fstab
mount -av

apt-get update && apt-get install -y nfs-server nfs-utils
mkdir -p /raid/nfs
chmod 777 /raid/nfs
echo "/raid/nfs       {{HQ_CLI_IP_M2}}/28(rw,no_root_squash)" > /etc/exports
exportfs -arv
systemctl enable --now nfs-server

apt-get install -y lamp-server
mount /dev/sr0 /mnt/
cp /mnt/web/index.php /var/www/html/
cp /mnt/web/logo.png /var/www/html/

sed -i 's/$username = "user"/$username = "web"/' /var/www/html/index.php
sed -i 's/$password = "password"/$password = "{{PASS_MAIN}}"/' /var/www/html/index.php
sed -i 's/$dbname = "db"/$dbname = "webdb"/' /var/www/html/index.php

systemctl enable --now mariadb
mariadb -u root -e "CREATE DATABASE webdb;"
mariadb -u root -e "CREATE USER 'web'@'localhost' IDENTIFIED BY '{{PASS_MAIN}}';"
mariadb -u root -e "GRANT ALL PRIVILEGES ON webdb.* TO 'web'@'localhost' WITH GRANT OPTION;"
mariadb -u root -e "FLUSH PRIVILEGES;"
mariadb -u web -p{{PASS_MAIN}} -D webdb < /mnt/web/dump.sql
systemctl enable --now httpd2

apt-get install -y task-samba-dc
rm -f /etc/samba/smb.conf
samba-tool domain provision --server-role=dc --use-rfc2307 --dns-backend=SAMBA_INTERNAL --realm={{DOMAIN}} --domain=AU-TEAM --adminpass={{PASS_MAIN}}
cp /var/lib/samba/private/krb5.conf /etc/krb5.conf
echo -e "nameserver 127.0.0.1\nsearch {{DOMAIN}}" > /etc/resolv.conf
systemctl enable --now samba

echo "{{PASS_MAIN}}" | kinit Administrator
samba-tool group add hq
samba-tool user add hquser1 {{PASS_MAIN}} --use-username-as-cn
samba-tool group addmembers "hq" hquser1

```

## BR-SRV

```bash
apt-get update && apt-get install -y ansible sshpass docker-engine docker-compose-v2

mkdir -p /etc/ansible
export ANSIBLE_HOST_KEY_CHECKING=False

cat <<EOF > /etc/ansible/ansible.cfg
[defaults]
inventory = /etc/ansible/hosts
host_key_checking = False
timeout = 10

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
EOF

cat <<EOF > /etc/ansible/hosts
HQ-SRV ansible_ssh_host={{HQ_SRV_IP_M2}} ansible_user=sshuser ansible_password={{PASS_MAIN}} ansible_port={{SSH_PORT_M2}}
HQ-CLI ansible_ssh_host={{HQ_CLI_IP_M2}} ansible_user=user ansible_password=resu
HQ-RTR ansible_ssh_host={{HQ_RTR_INT_M2}} ansible_user=net_admin ansible_password={{PASS_MAIN}}
BR-RTR ansible_ssh_host={{BR_RTR_INT_M2}} ansible_user=net_admin ansible_password={{PASS_MAIN}}

[all:vars]
ansible_python_interpreter=/usr/bin/python3
ansible_ssh_common_args='-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'
EOF

systemctl restart sshd

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
      MARIADB_PASSWORD: "{{PASS_MAIN}}"
      MARIADB_ROOT_PASSWORD: "toor"

  app:
    container_name: testapp
    image: site:latest
    restart: always
    ports:
      - "8080:8080"
    environment:
      DB_TYPE: "maria"
      DB_HOST: "{{BR_SRV_IP_M2}}"
      DB_PORT: "3306"
      DB_NAME: "testdb"
      DB_USER: "test"
      DB_PASS: "{{PASS_MAIN}}"
    depends_on:
      - database
EOF

docker compose up -d

```

## HQ-CLI

```bash
apt-get update && apt-get install -y nfs-utils nfs-clients task-auth-ad-sssd
mkdir -p /mnt/nfs
chmod 777 /mnt/nfs
echo "{{HQ_SRV_IP_M2}}:/raid/nfs /mnt/nfs nfs defaults,_netdev,nolock 0 0" >> /etc/fstab
mount -av

# Ввод в домен осуществляется через графический интерфейс ЦУП 
# или командой: adcli join {{DOMAIN}} -U Administrator

```

## HQ-RTR

```bash
apt-get update && apt-get install -y iptables
iptables -t nat -A PREROUTING -i enp7s1 -p tcp --dport {{SSH_PORT_M2}} -j DNAT --to-destination {{HQ_SRV_IP_M2}}:{{SSH_PORT_M2}}
iptables -t nat -A PREROUTING -i enp7s1 -p tcp --dport 8080 -j DNAT --to-destination {{HQ_SRV_IP_M2}}:80
iptables-save >> /etc/sysconfig/iptables
systemctl enable --now iptables

```

## BR-RTR

```bash
apt-get update && apt-get install -y iptables
iptables -t nat -A PREROUTING -i enp7s1 -p tcp --dport {{SSH_PORT_M2}} -j DNAT --to-destination {{BR_SRV_IP_M2}}:{{SSH_PORT_M2}}
iptables -t nat -A PREROUTING -i enp7s1 -p tcp --dport 8080 -j DNAT --to-destination {{BR_SRV_IP_M2}}:8080
iptables-save >> /etc/sysconfig/iptables
systemctl enable --now iptables

```

## ISP

```bash
apt-get update && apt-get install -y apache2-htpasswd nginx chrony

htpasswd -b -c /etc/nginx/.htpasswd WEB {{PASS_MAIN}}

cat <<EOF > /etc/nginx/sites-available.d/default.conf
server {
    listen 80;
    server_name web.{{DOMAIN}};
    location / {
        proxy_pass http://{{HQ_NGINX_PROXY}}:8080;
        auth_basic "Vnimanie";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}

server {
    listen 80;
    server_name docker.{{DOMAIN}};
    location / {
        proxy_pass http://{{BR_NGINX_PROXY}}:8080;
    }
}
EOF

ln -sf /etc/nginx/sites-available.d/default.conf /etc/nginx/sites-enabled.d/
systemctl enable --now nginx

cat <<EOF > /etc/chrony.conf
local stratum 5
allow {{ISP_NET_1}}
allow {{ISP_NET_2}}
EOF

systemctl enable --now chronyd

```
