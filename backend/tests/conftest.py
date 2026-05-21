import os
import pytest
from unittest.mock import patch, MagicMock

# Патчим boto3 ДО импорта приложения — иначе s3_client упадёт без реальных ключей
patch("boto3.client", return_value=MagicMock()).start()

os.environ.setdefault("APP_NAME", "personal-archive-test")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("REFRESH_TOKEN_EXPIRE_DAYS", "7")
os.environ.setdefault("MAX_FILE_SIZE_MB", "50")
os.environ.setdefault("YOS_ENDPOINT_URL", "https://fake.storage.test")
os.environ.setdefault("YOS_ACCESS_KEY_ID", "fake-key-id")
os.environ.setdefault("YOS_SECRET_ACCESS_KEY", "fake-secret")
os.environ.setdefault("YOS_BUCKET_NAME", "fake-bucket")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
os.environ.setdefault("SMTP_HOST", "smtp.test")
os.environ.setdefault("SMTP_PORT", "587")
os.environ.setdefault("SMTP_USER", "test@test.com")
os.environ.setdefault("SMTP_PASSWORD", "fake-password")
os.environ.setdefault("SMTP_FROM", "test@test.com")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, get_db

TEST_DB_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def clean_db():
    """Очищает все таблицы перед каждым тестом — полная изоляция."""
    yield
    with engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()


@pytest.fixture
def client():
    """
    TestClient с подменёнными зависимостями:
      - БД → SQLite (без реального PostgreSQL)
      - S3 функции → MagicMock (без реального Object Storage)
      - Email → MagicMock (без реального SMTP)
    """
    app.dependency_overrides[get_db] = override_get_db
    with (
        patch("app.core.storage.upload_file") as mock_upload,
        patch("app.core.storage.delete_file") as mock_delete,
        patch("app.core.storage.get_presigned_url",
              return_value="https://fake.storage/presigned?token=abc"),
        patch("app.core.email.send_password_reset_email"),
    ):
        mock_upload.return_value = None
        mock_delete.return_value = None
        with TestClient(app, raise_server_exceptions=True) as c:
            c.mock_upload = mock_upload
            c.mock_delete = mock_delete
            yield c
    app.dependency_overrides.clear()


# ---------- вспомогательные функции ----------

def pdf_file(size_kb: int = 5):
    """Минимальный валидный PDF + padding."""
    header = b"%PDF-1.4\n%%EOF\n"
    return ("doc.pdf", header + b"x" * max(0, size_kb * 1024 - len(header)), "application/pdf")


def jpg_file():
    content = bytes([0xFF, 0xD8, 0xFF, 0xE0]) + b"\x00\x10JFIF" + b"x" * 512
    return ("image.jpg", content, "image/jpeg")


def png_file():
    content = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) + b"x" * 512
    return ("image.png", content, "image/png")


def register_and_login(client, email="user@test.com", password="StrongPass1!") -> dict:
    """Регистрирует пользователя, возвращает словарь Authorization-заголовков."""
    client.post("/api/v1/auth/register", json={
        "email": email, "name": "Test User", "password": password,
    })
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def upload_doc(client, headers: dict, title: str = "Test Doc", file=None) -> int:
    """Загружает документ и возвращает его id."""
    name, content, mime = file or pdf_file()
    resp = client.post(
        "/api/v1/documents/",
        headers=headers,
        files={"file": (name, content, mime)},
        data={"title": title},
    )
    assert resp.status_code == 201, f"Upload failed: {resp.text}"
    return resp.json()["id"]

@pytest.fixture(autouse=True)
def mock_email_sending():
    """Автоматически глушит отправку писем через smtplib во всех тестов."""
    with patch("app.core.email.smtplib.SMTP") as mock_smtp:
        # Настраиваем mock, чтобы он вел себя как успешный контекстный менеджер
        mock_instance = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_instance
        yield mock_instance