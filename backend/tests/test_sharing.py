"""
Тесты публичных ссылок: создание, доступ без авторизации, отзыв.
Эндпоинты: /api/v1/documents/{id}/share  и  /api/v1/share/{token}
"""
from datetime import datetime, timezone, timedelta
from tests.conftest import register_and_login, upload_doc


class TestCreateShareLink:
    def test_create_share_link_success(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        resp = client.post(f"/api/v1/documents/{doc_id}/share",
                           headers=headers, json={"expires_at": None})
        assert resp.status_code == 201
        data = resp.json()
        assert "token" in data
        assert data["is_active"] is True

    def test_create_link_with_expiry(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        future = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        resp = client.post(f"/api/v1/documents/{doc_id}/share",
                           headers=headers, json={"expires_at": future})
        assert resp.status_code == 201
        assert resp.json()["expires_at"] is not None

    def test_create_link_deactivates_previous(self, client):
        """Создание новой ссылки деактивирует предыдущую."""
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        token1 = client.post(f"/api/v1/documents/{doc_id}/share",
                             headers=headers, json={}).json()["token"]
        token2 = client.post(f"/api/v1/documents/{doc_id}/share",
                             headers=headers, json={}).json()["token"]
        assert token1 != token2
        # Старый токен должен быть недействителен
        assert client.get(f"/api/v1/share/{token1}").status_code == 404

    def test_create_link_for_other_user_document_returns_404(self, client):
        h1 = register_and_login(client, "sl_owner@test.com")
        h2 = register_and_login(client, "sl_spy@test.com")
        doc_id = upload_doc(client, h1)
        assert client.post(f"/api/v1/documents/{doc_id}/share",
                           headers=h2, json={}).status_code == 404

    def test_create_link_for_deleted_document_returns_404(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
        assert client.post(f"/api/v1/documents/{doc_id}/share",
                           headers=headers, json={}).status_code == 404


class TestAccessSharedDocument:
    def test_invalid_token_returns_404(self, client):
        assert client.get("/api/v1/share/completely-fake-token").status_code == 404

    def test_expired_link_returns_404(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        token = client.post(f"/api/v1/documents/{doc_id}/share",
                            headers=headers,
                            json={"expires_at": past}).json()["token"]
        assert client.get(f"/api/v1/share/{token}").status_code == 404


class TestRevokeShareLink:
    def test_revoke_link_success(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        token = client.post(f"/api/v1/documents/{doc_id}/share",
                            headers=headers, json={}).json()["token"]

        resp = client.delete(f"/api/v1/documents/{doc_id}/share", headers=headers)
        assert resp.status_code == 204

        # После отзыва токен должен быть недействителен
        assert client.get(f"/api/v1/share/{token}").status_code == 404

    def test_revoke_other_user_link_returns_404(self, client):
        h1 = register_and_login(client, "rv_owner@test.com")
        h2 = register_and_login(client, "rv_spy@test.com")
        doc_id = upload_doc(client, h1)
        client.post(f"/api/v1/documents/{doc_id}/share", headers=h1, json={})

        assert client.delete(f"/api/v1/documents/{doc_id}/share",
                             headers=h2).status_code == 404

    def test_get_active_share_link(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        created_token = client.post(f"/api/v1/documents/{doc_id}/share",
                                    headers=headers, json={}).json()["token"]

        resp = client.get(f"/api/v1/documents/{doc_id}/share", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["token"] == created_token