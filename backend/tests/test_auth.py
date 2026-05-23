"""
Тесты авторизации: регистрация, вход, токены, сброс пароля.
Эндпоинты: /api/v1/auth/*
"""
from unittest.mock import patch

from tests.conftest import register_and_login


class TestRegister:
    def test_success_returns_201_and_user_fields(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "newuser@test.com", "name": "New User", "password": "StrongPass1!",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "newuser@test.com"
        assert data["name"] == "New User"
        assert "id" in data
        # Хэш пароля никогда не должен возвращаться клиенту
        assert "hashed_password" not in data
        assert "password" not in data

    def test_duplicate_email_returns_400(self, client):
        payload = {"email": "dup@test.com", "name": "A", "password": "StrongPass1!"}
        client.post("/api/v1/auth/register", json=payload)
        resp = client.post("/api/v1/auth/register", json=payload)
        assert resp.status_code == 400

    def test_invalid_email_format_returns_422(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "email": "not-an-email", "name": "A", "password": "StrongPass1!",
        })
        assert resp.status_code == 422

    def test_missing_required_fields_returns_422(self, client):
        resp = client.post("/api/v1/auth/register", json={
            "name": "A", "password": "StrongPass1!",
        })
        assert resp.status_code == 422

    def test_system_categories_assigned_after_register(self, client):
        """После регистрации у пользователя должны быть системные категории."""
        headers = register_and_login(client, "cat_check@test.com")
        resp = client.get("/api/v1/categories/", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) > 0


class TestLogin:
    def test_success_returns_both_tokens(self, client):
        client.post("/api/v1/auth/register", json={
            "email": "login@test.com", "name": "A", "password": "StrongPass1!",
        })
        resp = client.post("/api/v1/auth/login", json={
            "email": "login@test.com", "password": "StrongPass1!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_wrong_password_returns_401(self, client):
        client.post("/api/v1/auth/register", json={
            "email": "wp@test.com", "name": "A", "password": "Correct1!",
        })
        resp = client.post("/api/v1/auth/login", json={
            "email": "wp@test.com", "password": "Wrong1!",
        })
        assert resp.status_code == 401

    def test_nonexistent_user_returns_401(self, client):
        resp = client.post("/api/v1/auth/login", json={
            "email": "ghost@test.com", "password": "Pass1!",
        })
        assert resp.status_code == 401

    def test_me_endpoint_returns_current_user(self, client):
        headers = register_and_login(client, "me@test.com")
        resp = client.get("/api/v1/auth/me", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "me@test.com"

    def test_me_without_token_returns_401(self, client):
        assert client.get("/api/v1/auth/me").status_code == 401


class TestTokens:
    def test_refresh_returns_new_access_token(self, client):
        client.post("/api/v1/auth/register", json={
            "email": "refresh@test.com", "name": "A", "password": "StrongPass1!",
        })
        login = client.post("/api/v1/auth/login", json={
            "email": "refresh@test.com", "password": "StrongPass1!",
        })
        resp = client.post("/api/v1/auth/refresh",
                           json={"refresh_token": login.json()["refresh_token"]})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_refresh_with_access_token_is_rejected(self, client):
        """Access токен не может использоваться как refresh."""
        headers = register_and_login(client, "badrefresh@test.com")
        access_token = headers["Authorization"].split(" ")[1]
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
        assert resp.status_code == 401

    def test_invalid_token_returns_401(self, client):
        resp = client.get("/api/v1/auth/me",
                          headers={"Authorization": "Bearer invalid.jwt.token"})
        assert resp.status_code == 401

    def test_no_token_on_protected_endpoint_returns_401(self, client):
        assert client.get("/api/v1/documents/").status_code == 401


class TestPasswordReset:
    def test_reset_password_with_invalid_token_returns_400(self, client):
        resp = client.post("/api/v1/auth/reset-password", json={
            "token": "fake-token-that-does-not-exist",
            "new_password": "NewPass1!",
        })
        assert resp.status_code == 400

    def test_forgot_password_unknown_email_also_returns_204(self, client):
        """Не раскрываем факт существования аккаунта — всегда 204."""
        with patch("app.api.auth.send_password_reset_email") as mock_send_email:
            resp = client.post("/api/v1/auth/forgot-password",
                               json={"email": "nobody@test.com"})
        resp = client.post("/api/v1/auth/forgot-password",
                           json={"email": "nobody@test.com"})
        
        assert resp.status_code == 204
