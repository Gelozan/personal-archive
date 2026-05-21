"""
Тесты корзины: soft delete, restore, permanent delete.
Эндпоинты: /api/v1/trash/*  и  DELETE /api/v1/documents/{id}
"""
from tests.conftest import register_and_login, upload_doc


class TestSoftDelete:
    def test_deleted_document_appears_in_trash(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers, "В корзину")
        client.delete(f"/api/v1/documents/{doc_id}", headers=headers)

        trash_ids = [d["id"] for d in
                     client.get("/api/v1/trash/", headers=headers).json()]
        assert doc_id in trash_ids

    def test_deleted_document_not_in_main_list(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers, "Удалённый")
        client.delete(f"/api/v1/documents/{doc_id}", headers=headers)

        docs_ids = [d["id"] for d in
                    client.get("/api/v1/documents/", headers=headers).json()]
        assert doc_id not in docs_ids

    def test_deleted_document_has_is_deleted_true(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
    
        trash = client.get("/api/v1/trash/", headers=headers).json()
        doc = next(d for d in trash if d["id"] == doc_id)
        
        assert doc["is_deleted"] is True


    def test_delete_already_deleted_document_returns_404(self, client):
        """Нельзя удалить документ, который уже в корзине."""
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
        resp = client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
        assert resp.status_code == 404

    def test_trash_isolated_between_users(self, client):
        h1 = register_and_login(client, "t1@test.com")
        h2 = register_and_login(client, "t2@test.com")
        doc_id = upload_doc(client, h1)
        client.delete(f"/api/v1/documents/{doc_id}", headers=h1)

        trash_h2 = [d["id"] for d in client.get("/api/v1/trash/", headers=h2).json()]
        assert doc_id not in trash_h2


class TestRestore:
    def test_restore_moves_document_back_to_main(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers, "Восстановить")
        client.delete(f"/api/v1/documents/{doc_id}", headers=headers)

        resp = client.post(f"/api/v1/trash/{doc_id}/restore", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["is_deleted"] is False

        docs_ids = [d["id"] for d in
                    client.get("/api/v1/documents/", headers=headers).json()]
        assert doc_id in docs_ids

    def test_restore_clears_deleted_at(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
        resp = client.post(f"/api/v1/trash/{doc_id}/restore", headers=headers)

    def test_restore_removes_from_trash(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
        client.post(f"/api/v1/trash/{doc_id}/restore", headers=headers)

        trash_ids = [d["id"] for d in client.get("/api/v1/trash/", headers=headers).json()]
        assert doc_id not in trash_ids

    def test_restore_other_user_document_returns_404(self, client):
        h1 = register_and_login(client, "tr_owner@test.com")
        h2 = register_and_login(client, "tr_spy@test.com")
        doc_id = upload_doc(client, h1)
        client.delete(f"/api/v1/documents/{doc_id}", headers=h1)

        assert client.post(f"/api/v1/trash/{doc_id}/restore",
                           headers=h2).status_code == 404

    def test_restore_document_to_deleted_folder_moves_to_root(self, client):
        """
        Если папка была удалена, восстановленный документ должен
        переместиться в корень (folder_id = None).
        """
        headers = register_and_login(client)
        folder_id = client.post("/api/v1/folders/", headers=headers,
                                json={"name": "Временная папка"}).json()["id"]
        from tests.conftest import pdf_file
        name, content, mime = pdf_file()
        doc_id = client.post("/api/v1/documents/", headers=headers,
                             files={"file": (name, content, mime)},
                             data={"title": "Документ в папке",
                                   "folder_id": folder_id}).json()["id"]

        # Удаляем папку (документ попадает в корзину автоматически)
        client.delete(f"/api/v1/folders/{folder_id}", headers=headers)

        # Восстанавливаем документ
        resp = client.post(f"/api/v1/trash/{doc_id}/restore", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["folder_id"] is None


class TestPermanentDelete:
    def test_permanent_delete_removes_from_trash(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
        client.delete(f"/api/v1/trash/{doc_id}", headers=headers)

        trash_ids = [d["id"] for d in client.get("/api/v1/trash/", headers=headers).json()]
        assert doc_id not in trash_ids

    def test_permanent_delete_from_main_list_returns_404(self, client):
        """Нельзя окончательно удалить документ, который не в корзине."""
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        assert client.delete(f"/api/v1/trash/{doc_id}", headers=headers).status_code == 404

    def test_permanent_delete_other_user_document_returns_404(self, client):
        h1 = register_and_login(client, "pd_owner@test.com")
        h2 = register_and_login(client, "pd_spy@test.com")
        doc_id = upload_doc(client, h1)
        client.delete(f"/api/v1/documents/{doc_id}", headers=h1)

        assert client.delete(f"/api/v1/trash/{doc_id}", headers=h2).status_code == 404