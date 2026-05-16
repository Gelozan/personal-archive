#!/bin/bash
set -euo pipefail

# ── Конфигурация ──────────────────────────────────────────────────
COMPOSE_FILE="/opt/personal-archive/docker-compose.prod.yml"
PROJECT_DIR="/opt/personal-archive"

# ── Проверка аргумента ────────────────────────────────────────────
if [[ $# -lt 1 ]]; then
    echo "Использование: $0 <git-commit-hash>"
    echo ""
    echo "Последние коммиты:"
    git -C "$PROJECT_DIR" log --oneline -10
    exit 1
fi

TARGET_COMMIT="$1"

echo "[$(date)] Откат к коммиту: ${TARGET_COMMIT}"

# ── Проверить что коммит существует ───────────────────────────────
if ! git -C "$PROJECT_DIR" cat-file -e "${TARGET_COMMIT}^{commit}" 2>/dev/null; then
    echo "Ошибка: коммит ${TARGET_COMMIT} не найден."
    exit 1
fi

# ── Зафиксировать текущий коммит для возможного возврата ──────────
CURRENT_COMMIT=$(git -C "$PROJECT_DIR" rev-parse HEAD)
echo "[$(date)] Текущий коммит: ${CURRENT_COMMIT}"

# ── Переключиться на целевой коммит ───────────────────────────────
git -C "$PROJECT_DIR" checkout "$TARGET_COMMIT"

# ── Пересобрать и перезапустить контейнеры ────────────────────────
docker compose -f "$COMPOSE_FILE" up -d --build

echo "[$(date)] Откат завершён. Приложение работает на коммите: ${TARGET_COMMIT}"
echo ""
echo "Для возврата к предыдущей версии выполни:"
echo "  $0 ${CURRENT_COMMIT}"
