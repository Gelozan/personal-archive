FROM python:3.12-slim

WORKDIR /backend

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
# Системные зависимости (нужны для psycopg2 и bcrypt)

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Сначала копируем только requirements.txt — слой кешируется
# пока зависимости не меняются, docker не пересобирает этот слой
COPY requirements.txt .

RUN uv pip install --system --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY ./app ./app
COPY alembic.ini .
COPY alembic ./alembic

EXPOSE 8000

# CMD для production — переопределяется в docker-compose.yml для локали
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
