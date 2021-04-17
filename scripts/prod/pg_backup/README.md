# PostgreSQL Automated Backup

## Setup Instructions

1. rename `pg_backup_rotated.sh` to `pg_backup_rotated` (remove the file extension)
2. move `pg_backup_rotated` and `pg_backup.conf` into `/etc/cron.daily/`
3. make `pg_backup_rotated` executable using `sudo chmod +x pg_backup_rotated`
4. configure `pg_backup.conf` and the `PGPASSWORD` variable in `pg_backup_rotated` to match your setup

## Source

https://wiki.postgresql.org/wiki/Automated_Backup_on_Linux
