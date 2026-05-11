## HQ-SRV

```bash
apt-get update
apt-get install ansible sshpass mc

mcedit /etc/ansible/ansible.cfg
[defaults]
inventory = /etc/ansible/hosts
host_key_checking = False
timeout = 10
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
{{EXIT_MCEDIT}}

mcedit /etc/ansible/hosts
[all]
HQ-SRV ansible_ssh_host={{HQ_SRV_IP_M2}} ansible_user=sshuser ansible_password={{PASS_MAIN}} ansible_port={{SSH_PORT_M2}}
HQ-CLI ansible_ssh_host={{HQ_CLI_IP_M2}} ansible_user=user ansible_password=resu
HQ-RTR ansible_ssh_host={{HQ_RTR_INT_M2}} ansible_user=net_admin ansible_password={{PASS_MAIN}}
BR-RTR ansible_ssh_host={{BR_RTR_INT_M2}} ansible_user=net_admin ansible_password={{PASS_MAIN}}
{{EXIT_MCEDIT}}

systemctl restart sshd

apt-get install samba samba-dc krb5-user
rm /etc/samba/smb.conf
samba-tool domain provision --server-role=dc --use-rfc2307 --dns-backend=SAMBA_INTERNAL --realm={{DOMAIN}} --domain=AU-TEAM --adminpass={{PASS_MAIN}}

mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc
mkfs.ext4 /dev/md0

mkdir -p /mnt/raid/nfs
mcedit /etc/exports
/mnt/raid/nfs *(rw,sync,no_root_squash,no_subtree_check)
{{EXIT_MCEDIT}}

systemctl enable --now nfs-server
exportfs -a

## BR-SRV
```bash
apt-get update
apt-get install mc chrony docker-engine docker-compose-v2

mcedit /etc/chrony.conf
server {{HQ_SRV_IP_M2}} iburst
{{EXIT_MCEDIT}}

systemctl restart chronyd
systemctl enable chronyd

systemctl enable --now docker.service
mount /dev/sr0 /mnt/
docker load < /mnt/docker/site_latest.tar
docker load < /mnt/docker/mariadb_latest.tar

mkdir -p /opt/docker
cd /opt/docker

mcedit compose.yaml
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
{{EXIT_MCEDIT}}

docker compose up -d

apt-get install -y apache2-htpasswd
```

## HQ-CLI
```bash
apt-get update
apt-get install mc chrony nfs-clients

mcedit /etc/chrony.conf
server {{HQ_SRV_IP_M2}} iburst
{{EXIT_MCEDIT}}

systemctl restart chronyd
systemctl enable chronyd

mkdir -p /mnt/nfs
mcedit /etc/fstab
{{HQ_SRV_IP_M2}}:/mnt/raid/nfs /mnt/nfs nfs defaults 0 0
{{EXIT_MCEDIT}}

mount -a
```