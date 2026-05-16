#!/bin/bash
set -euo pipefail

# ── Конфигурация ──────────────────────────────────────────────────
BACKUP_DIR="/tmp/pg_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="personal_archive_${TIMESTAMP}.sql.gz"
COMPOSE_FILE="/opt/personal-archive/docker-compose.prod.yml"

# Загружаем переменные из postgres.env
source /opt/personal-archive/infrastructure/env/postgres.env

# S3 настройки для бэкапов (отдельный бакет)
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-personal-archive-backups}"
S3_ENDPOINT="${S3_ENDPOINT:-https://storage.yandexcloud.net}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# ── Создать директорию если не существует ─────────────────────────
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Запуск резервного копирования..."

# ── Дамп PostgreSQL через контейнер ───────────────────────────────
docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
    | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

echo "[$(date)] Дамп создан: ${BACKUP_FILE} ($(du -sh "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1))"

# ── Загрузка в Yandex Object Storage ──────────────────────────────
aws s3 cp \
    "${BACKUP_DIR}/${BACKUP_FILE}" \
    "s3://${S3_BACKUP_BUCKET}/postgres/${BACKUP_FILE}" \
    --endpoint-url "$S3_ENDPOINT"

echo "[$(date)] Загружен в S3: s3://${S3_BACKUP_BUCKET}/postgres/${BACKUP_FILE}"

# ── Удалить локальный файл ─────────────────────────────────────────
rm "${BACKUP_DIR}/${BACKUP_FILE}"

# ── Удалить бэкапы старше RETENTION_DAYS дней из S3 ──────────────
echo "[$(date)] Очистка бэкапов старше ${RETENTION_DAYS} дней..."
aws s3 ls "s3://${S3_BACKUP_BUCKET}/postgres/" \
    --endpoint-url "$S3_ENDPOINT" \
    | awk '{print $4}' \
    | while read -r filename; do
        file_date=$(echo "$filename" | grep -oP '\d{8}')
        if [[ -n "$file_date" ]]; then
            cutoff=$(date -d "-${RETENTION_DAYS} days" +"%Y%m%d")
            if [[ "$file_date" < "$cutoff" ]]; then
                aws s3 rm \
                    "s3://${S3_BACKUP_BUCKET}/postgres/${filename}" \
                    --endpoint-url "$S3_ENDPOINT"
                echo "[$(date)] Удалён старый бэкап: ${filename}"
            fi
        fi
    done

echo "[$(date)] Резервное копирование завершено успешно."
