"""
Тесты документов: загрузка, чтение, PATCH, presigned URL.
Эндпоинты: /api/v1/documents/*
"""
from tests.conftest import register_and_login, upload_doc, pdf_file, jpg_file, png_file


class TestUpload:
    def test_pdf_upload_success(self, client):
        headers = register_and_login(client)
        name, content, mime = pdf_file()
        resp = client.post("/api/v1/documents/", headers=headers,
                           files={"file": (name, content, mime)},
                           data={"title": "Мой договор"})
        assert resp.status_code == 201
        doc = resp.json()
        assert doc["title"] == "Мой договор"
        assert doc["mime_type"] == "application/pdf"
        assert doc["is_deleted"] is False
        assert "storage_key" not in doc  # ключ S3 скрыт от клиента

    def test_jpg_upload_success(self, client):
        headers = register_and_login(client)
        name, content, mime = jpg_file()
        resp = client.post("/api/v1/documents/", headers=headers,
                           files={"file": (name, content, mime)},
                           data={"title": "Скан паспорта"})
        assert resp.status_code == 201
        assert resp.json()["mime_type"] == "image/jpeg"

    def test_png_upload_success(self, client):
        headers = register_and_login(client)
        name, content, mime = png_file()
        resp = client.post("/api/v1/documents/", headers=headers,
                           files={"file": (name, content, mime)},
                           data={"title": "Скриншот"})
        assert resp.status_code == 201

    def test_forbidden_mime_type_rejected(self, client):
        headers = register_and_login(client)
        resp = client.post("/api/v1/documents/", headers=headers,
                           files={"file": ("virus.exe", b"MZ\x90\x00" + b"x" * 512,
                                           "application/octet-stream")},
                           data={"title": "Вирус"})
        assert resp.status_code == 400

    def test_text_file_rejected(self, client):
        headers = register_and_login(client)
        resp = client.post("/api/v1/documents/", headers=headers,
                           files={"file": ("script.sh", b"#!/bin/bash\nrm -rf /",
                                           "text/plain")},
                           data={"title": "Скрипт"})
        assert resp.status_code == 400

    def test_file_too_large_rejected(self, client):
        """Файл > MAX_FILE_SIZE_MB (50 МБ) должен вернуть 400."""
        headers = register_and_login(client)
        big = b"%PDF-1.4\n" + b"x" * (51 * 1024 * 1024)
        resp = client.post("/api/v1/documents/", headers=headers,
                           files={"file": ("big.pdf", big, "application/pdf")},
                           data={"title": "Большой"})
        assert resp.status_code == 400

    def test_upload_without_title_rejected(self, client):
        headers = register_and_login(client)
        name, content, mime = pdf_file()
        resp = client.post("/api/v1/documents/", headers=headers,
                           files={"file": (name, content, mime)})
        assert resp.status_code == 422

    def test_upload_without_auth_returns_401(self, client):
        name, content, mime = pdf_file()
        resp = client.post("/api/v1/documents/",
                           files={"file": (name, content, mime)},
                           data={"title": "Doc"})
        assert resp.status_code == 401      

    def test_upload_with_note(self, client):
        headers = register_and_login(client)
        name, content, mime = pdf_file()
        resp = client.post("/api/v1/documents/", headers=headers,
                           files={"file": (name, content, mime)},
                           data={"title": "Договор", "note": "Важный документ"})
        assert resp.status_code == 201
        assert resp.json()["note"] == "Важный документ"


class TestGetDocuments:
    def test_list_returns_only_own_documents(self, client):
        h1 = register_and_login(client, "user1@test.com")
        h2 = register_and_login(client, "user2@test.com")
        upload_doc(client, h1, "Документ пользователя 1")
        upload_doc(client, h2, "Документ пользователя 2")

        resp = client.get("/api/v1/documents/", headers=h1)
        titles = [d["title"] for d in resp.json()]
        assert "Документ пользователя 1" in titles
        assert "Документ пользователя 2" not in titles

    def test_list_excludes_deleted_documents(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers, "Удалённый")
        client.delete(f"/api/v1/documents/{doc_id}", headers=headers)

        resp = client.get("/api/v1/documents/", headers=headers)
        assert doc_id not in [d["id"] for d in resp.json()]

    def test_get_single_document_success(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers, "Конкретный")
        resp = client.get(f"/api/v1/documents/{doc_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["title"] == "Конкретный"

    def test_get_other_user_document_returns_404(self, client):
        """Чужой документ → 404, не 403: не раскрываем существование."""
        h1 = register_and_login(client, "owner@test.com")
        h2 = register_and_login(client, "stealer@test.com")
        doc_id = upload_doc(client, h1)
        assert client.get(f"/api/v1/documents/{doc_id}", headers=h2).status_code == 404

    def test_get_nonexistent_document_returns_404(self, client):
        headers = register_and_login(client)
        assert client.get("/api/v1/documents/999999", headers=headers).status_code == 404

    def test_list_by_folder_filters_correctly(self, client):
        headers = register_and_login(client)
        folder_id = client.post("/api/v1/folders/", headers=headers,
                                json={"name": "Рабочие"}).json()["id"]
        name, content, mime = pdf_file()
        client.post("/api/v1/documents/", headers=headers,
                    files={"file": (name, content, mime)},
                    data={"title": "В папке", "folder_id": folder_id})
        upload_doc(client, headers, "В корне")

        resp = client.get(f"/api/v1/documents/?folder_id={folder_id}", headers=headers)
        titles = [d["title"] for d in resp.json()]
        assert "В папке" in titles
        assert "В корне" not in titles


class TestUpdateDocument:
    def test_patch_title_success(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers, "Старое название")
        resp = client.patch(f"/api/v1/documents/{doc_id}", headers=headers,
                            json={"title": "Новое название"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Новое название"

    def test_patch_note_success(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        resp = client.patch(f"/api/v1/documents/{doc_id}", headers=headers,
                            json={"note": "Срочно продлить"})
        assert resp.status_code == 200
        assert resp.json()["note"] == "Срочно продлить"

    def test_patch_folder_id_null_moves_to_root(self, client):
        """
        КРИТИЧНЫЙ тест model_fields_set:
        {"folder_id": null} = «переместить в корень», не «поле не передано».
        """
        headers = register_and_login(client)
        folder_id = client.post("/api/v1/folders/", headers=headers,
                                json={"name": "Папка"}).json()["id"]
        name, content, mime = pdf_file()
        doc_id = client.post("/api/v1/documents/", headers=headers,
                             files={"file": (name, content, mime)},
                             data={"title": "Перемещение",
                                   "folder_id": folder_id}).json()["id"]

        resp = client.patch(f"/api/v1/documents/{doc_id}", headers=headers,
                            json={"folder_id": None})
        assert resp.status_code == 200
        assert resp.json()["folder_id"] is None

    def test_patch_empty_body_changes_nothing(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers, "Стабильный")
        resp = client.patch(f"/api/v1/documents/{doc_id}", headers=headers, json={})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Стабильный"

    def test_patch_other_user_document_returns_404(self, client):
        h1 = register_and_login(client, "owner2@test.com")
        h2 = register_and_login(client, "attacker@test.com")
        doc_id = upload_doc(client, h1)
        resp = client.patch(f"/api/v1/documents/{doc_id}", headers=h2,
                            json={"title": "Взломал"})
        assert resp.status_code == 404


class TestDownloadURL:

    def test_download_url_other_user_forbidden(self, client):
        h1 = register_and_login(client, "owner3@test.com")
        h2 = register_and_login(client, "spy@test.com")
        doc_id = upload_doc(client, h1)
        assert client.get(f"/api/v1/documents/{doc_id}/download",
                          headers=h2).status_code == 404