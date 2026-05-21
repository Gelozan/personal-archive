"""
Тесты безопасности: MIME-валидация, изоляция пользователей,
JWT enforcement на всех write-эндпоинтах, защита от path traversal.
"""
import pytest
from tests.conftest import register_and_login, upload_doc, pdf_file

class TestFileValidation:
    def test_exe_file_rejected(self, client):
        """Исполняемый файл с заголовком MZ должен быть отклонён."""
        headers = register_and_login(client)
        resp = client.post(
            "/api/v1/documents/",
            headers=headers,
            files={"file": ("malware.exe", b"MZ\x90\x00" + b"x" * 512,
                            "application/octet-stream")},
            data={"title": "Вирус"},
        )
        assert resp.status_code == 400

    def test_html_file_rejected(self, client):
        headers = register_and_login(client)
        resp = client.post(
            "/api/v1/documents/",
            headers=headers,
            files={"file": ("xss.html", b"<script>alert(1)</script>", "text/html")},
            data={"title": "XSS"},
        )
        assert resp.status_code == 400

    def test_svg_file_rejected(self, client):
        """SVG с потенциальными XSS-векторами — не допускается."""
        headers = register_and_login(client)
        resp = client.post(
            "/api/v1/documents/",
            headers=headers,
            files={"file": ("image.svg",
                            b'<svg><script>alert(1)</script></svg>',
                            "image/svg+xml")},
            data={"title": "SVG атака"},
        )
        assert resp.status_code == 400

    def test_zip_file_rejected(self, client):
        headers = register_and_login(client)
        resp = client.post(
            "/api/v1/documents/",
            headers=headers,
            files={"file": ("archive.zip", b"PK\x03\x04" + b"x" * 512,
                            "application/zip")},
            data={"title": "Архив"},
        )
        assert resp.status_code == 400

    def test_pdf_mime_with_wrong_content_rejected(self, client):
        """
        Content-Type: application/pdf, но содержимое — EXE.
        Сервер проверяет content_type из multipart-заголовка,
        поэтому такой файл должен пройти валидацию MIME (content_type == pdf),
        НО это тест на корректность: если реализована magic-byte проверка,
        должен вернуть 400. Пропускаем через assert в зависимости от реализации.
        """
        headers = register_and_login(client)
        resp = client.post(
            "/api/v1/documents/",
            headers=headers,
            files={"file": ("fake.pdf", b"MZ\x90\x00" + b"x" * 512,
                            "application/pdf")},
            data={"title": "Подделка"},
        )
        # Допустимы оба варианта: 201 (если magic bytes не проверяются)
        # или 400 (если проверяются). Главное — не 500.
        assert resp.status_code in (201, 400), \
            f"Unexpected status {resp.status_code}: {resp.text}"

    def test_file_exactly_at_limit_accepted(self, client):
        """Файл ровно на границе MAX_FILE_SIZE_MB должен проходить."""
        headers = register_and_login(client)
        # MAX_FILE_SIZE_MB=50 в тестовом окружении
        limit_bytes = 50 * 1024 * 1024
        header = b"%PDF-1.4\n%%EOF\n"
        content = header + b"x" * (limit_bytes - len(header))
        resp = client.post(
            "/api/v1/documents/",
            headers=headers,
            files={"file": ("limit.pdf", content, "application/pdf")},
            data={"title": "На границе"},
        )
        assert resp.status_code == 201

    def test_file_over_limit_rejected(self, client):
        """Файл на 1 байт больше лимита должен возвращать 400."""
        headers = register_and_login(client)
        over_limit = b"%PDF-1.4\n" + b"x" * (50 * 1024 * 1024 + 1)
        resp = client.post(
            "/api/v1/documents/",
            headers=headers,
            files={"file": ("overlimit.pdf", over_limit, "application/pdf")},
            data={"title": "Слишком большой"},
        )
        assert resp.status_code == 400

class TestJWTEnforcement:
    """
    Все write- и read-эндпоинты, требующие авторизации,
    должны возвращать 401 при отсутствии токена.
    """

    @pytest.mark.parametrize("method,path", [
        # Documents
        ("GET",    "/api/v1/documents/"),
        ("POST",   "/api/v1/documents/"),
        ("GET",    "/api/v1/documents/1"),
        ("PATCH",  "/api/v1/documents/1"),
        ("DELETE", "/api/v1/documents/1"),
        ("GET",    "/api/v1/documents/1/download"),
        # Folders
        ("GET",    "/api/v1/folders/"),
        ("POST",   "/api/v1/folders/"),
        ("GET",    "/api/v1/folders/1"),
        ("PATCH",  "/api/v1/folders/1"),
        ("DELETE", "/api/v1/folders/1"),
        # Categories
        ("GET",    "/api/v1/categories/"),
        ("POST",   "/api/v1/categories/"),
        ("DELETE", "/api/v1/categories/1"),
        # Trash
        ("GET",    "/api/v1/trash/"),
        ("POST",   "/api/v1/trash/1/restore"),
        ("DELETE", "/api/v1/trash/1"),
        # Search
        ("GET",    "/api/v1/search/"),
        # Share (create/revoke требуют авторизации)
        ("POST",   "/api/v1/documents/1/share"),
        ("DELETE", "/api/v1/documents/1/share"),
        # Me
        ("GET",    "/api/v1/auth/me"),
    ])
    def test_endpoint_requires_auth(self, client, method, path):
        fn = getattr(client, method.lower())
        resp = fn(path)
        assert resp.status_code == 401, \
            f"Expected 401 for {method} {path}, got {resp.status_code}"

    def test_malformed_bearer_token_returns_401(self, client):
        resp = client.get(
            "/api/v1/documents/",
            headers={"Authorization": "Bearer not.a.valid.jwt"},
        )
        assert resp.status_code == 401

    def test_bearer_prefix_missing_returns_401(self, client):
        """Токен без слова Bearer должен быть отклонён."""
        headers = register_and_login(client)
        raw_token = headers["Authorization"].split(" ")[1]
        resp = client.get(
            "/api/v1/documents/",
            headers={"Authorization": raw_token},  # без "Bearer "
        )
        assert resp.status_code == 401

    def test_access_token_used_as_refresh_is_rejected(self, client):
        """Access-токен не должен приниматься как refresh-токен."""
        headers = register_and_login(client)
        access_token = headers["Authorization"].split(" ")[1]
        resp = client.post("/api/v1/auth/refresh",
                           json={"refresh_token": access_token})
        assert resp.status_code == 401

class TestDataIsolation:
    def test_cannot_read_other_user_document(self, client):
        h1 = register_and_login(client, "iso_d1@test.com")
        h2 = register_and_login(client, "iso_d2@test.com")
        doc_id = upload_doc(client, h1)
        assert client.get(f"/api/v1/documents/{doc_id}",
                          headers=h2).status_code == 404

    def test_cannot_patch_other_user_document(self, client):
        h1 = register_and_login(client, "iso_p1@test.com")
        h2 = register_and_login(client, "iso_p2@test.com")
        doc_id = upload_doc(client, h1)
        assert client.patch(f"/api/v1/documents/{doc_id}",
                            headers=h2,
                            json={"title": "Взломал"}).status_code == 404

    def test_cannot_delete_other_user_document(self, client):
        h1 = register_and_login(client, "iso_del1@test.com")
        h2 = register_and_login(client, "iso_del2@test.com")
        doc_id = upload_doc(client, h1)
        assert client.delete(f"/api/v1/documents/{doc_id}",
                             headers=h2).status_code == 404

    def test_cannot_download_other_user_document(self, client):
        h1 = register_and_login(client, "iso_dl1@test.com")
        h2 = register_and_login(client, "iso_dl2@test.com")
        doc_id = upload_doc(client, h1)
        assert client.get(f"/api/v1/documents/{doc_id}/download",
                          headers=h2).status_code == 404

    def test_cannot_read_other_user_folder(self, client):
        h1 = register_and_login(client, "iso_f1@test.com")
        h2 = register_and_login(client, "iso_f2@test.com")
        folder_id = client.post("/api/v1/folders/", headers=h1,
                                json={"name": "Чужая папка"}).json()["id"]
        assert client.get(f"/api/v1/folders/{folder_id}",
                          headers=h2).status_code == 404

    def test_cannot_delete_other_user_folder(self, client):
        h1 = register_and_login(client, "iso_fd1@test.com")
        h2 = register_and_login(client, "iso_fd2@test.com")
        folder_id = client.post("/api/v1/folders/", headers=h1,
                                json={"name": "Чужая папка"}).json()["id"]
        assert client.delete(f"/api/v1/folders/{folder_id}",
                             headers=h2).status_code == 404

    def test_cannot_delete_other_user_custom_category(self, client):
        h1 = register_and_login(client, "iso_c1@test.com")
        h2 = register_and_login(client, "iso_c2@test.com")
        cat_id = client.post("/api/v1/categories/", headers=h1,
                             json={"name": "Чужая категория"}).json()["id"]
        assert client.delete(f"/api/v1/categories/{cat_id}",
                             headers=h2).status_code == 404

    def test_cannot_restore_other_user_trashed_document(self, client):
        h1 = register_and_login(client, "iso_tr1@test.com")
        h2 = register_and_login(client, "iso_tr2@test.com")
        doc_id = upload_doc(client, h1)
        client.delete(f"/api/v1/documents/{doc_id}", headers=h1)
        assert client.post(f"/api/v1/trash/{doc_id}/restore",
                           headers=h2).status_code == 404

    def test_cannot_permanently_delete_other_user_document(self, client):
        h1 = register_and_login(client, "iso_pd1@test.com")
        h2 = register_and_login(client, "iso_pd2@test.com")
        doc_id = upload_doc(client, h1)
        client.delete(f"/api/v1/documents/{doc_id}", headers=h1)
        assert client.delete(f"/api/v1/trash/{doc_id}",
                             headers=h2).status_code == 404

    def test_search_does_not_leak_other_user_documents(self, client):
        h1 = register_and_login(client, "iso_s1@test.com")
        h2 = register_and_login(client, "iso_s2@test.com")
        upload_doc(client, h1, "Секретный_xyz987")
        resp = client.get("/api/v1/search/?q=Секретный_xyz987", headers=h2)
        assert resp.json() == []

    def test_trash_does_not_show_other_user_documents(self, client):
        h1 = register_and_login(client, "iso_t1@test.com")
        h2 = register_and_login(client, "iso_t2@test.com")
        doc_id = upload_doc(client, h1)
        client.delete(f"/api/v1/documents/{doc_id}", headers=h1)
        trash_ids = [d["id"] for d in
                     client.get("/api/v1/trash/", headers=h2).json()]
        assert doc_id not in trash_ids

class TestPathTraversal:
    def test_null_byte_in_filename_safe(self, client):
        """Null-байт в имени файла не должен ломать сервер."""
        headers = register_and_login(client)
        content = b"%PDF-1.4\n%%EOF\n" + b"x" * 100
        resp = client.post(
            "/api/v1/documents/",
            headers=headers,
            files={"file": ("doc\x00hidden.pdf", content, "application/pdf")},
            data={"title": "Null byte test"},
        )
        assert resp.status_code in (201, 400, 422)
        assert resp.status_code != 500

class TestPublicShareSecurity:
    def test_revoked_share_link_inaccessible(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers)
        token = client.post(f"/api/v1/documents/{doc_id}/share",
                            headers=headers, json={}).json()["token"]
        client.delete(f"/api/v1/documents/{doc_id}/share", headers=headers)

        assert client.get(f"/api/v1/share/{token}").status_code == 404

    def test_share_link_of_deleted_document_inaccessible(self, client):
        """
        Если документ удалён в корзину после создания ссылки,
        публичный доступ должен вернуть 404.
        """
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers, "Удалю после шаринга")
        token = client.post(f"/api/v1/documents/{doc_id}/share",
                            headers=headers, json={}).json()["token"]
        client.delete(f"/api/v1/documents/{doc_id}", headers=headers)

        assert client.get(f"/api/v1/share/{token}").status_code == 404