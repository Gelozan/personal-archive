"""
Тесты поиска и фильтрации.
Эндпоинт: GET /api/v1/search/
"""
from tests.conftest import register_and_login, upload_doc, pdf_file, jpg_file


class TestSearch:
    def test_search_by_note(self, client):
        headers = register_and_login(client)
        name, content, mime = pdf_file()
        client.post("/api/v1/documents/", headers=headers,
                    files={"file": (name, content, mime)},
                    data={"title": "Безымянный", "note": "срочно продлить"})
        upload_doc(client, headers, "Обычный")

        resp = client.get("/api/v1/search/?q=срочно", headers=headers)
        assert len(resp.json()) >= 1

    def test_search_by_original_filename(self, client):
        headers = register_and_login(client)
        client.post("/api/v1/documents/", headers=headers,
                    files={"file": ("contract_2024.pdf", b"%PDF-1.4\n" + b"x" * 100,
                                    "application/pdf")},
                    data={"title": "Контракт"})

        resp = client.get("/api/v1/search/?q=contract_2024", headers=headers)
        assert len(resp.json()) >= 1

    def test_search_returns_empty_for_no_match(self, client):
        headers = register_and_login(client)
        upload_doc(client, headers, "Договор")

        resp = client.get("/api/v1/search/?q=xyz_никогда_не_найти", headers=headers)
        assert resp.json() == []

    def test_search_isolated_between_users(self, client):
        """Поиск не должен возвращать документы другого пользователя."""
        h1 = register_and_login(client, "s1@test.com")
        h2 = register_and_login(client, "s2@test.com")
        upload_doc(client, h1, "Мой секретный документ")

        resp = client.get("/api/v1/search/?q=секретный", headers=h2)
        assert resp.json() == []

    def test_search_excludes_deleted_documents(self, client):
        headers = register_and_login(client)
        doc_id = upload_doc(client, headers, "Удалённый поиск")
        client.delete(f"/api/v1/documents/{doc_id}", headers=headers)

        resp = client.get("/api/v1/search/?q=Удалённый+поиск", headers=headers)
        assert doc_id not in [d["id"] for d in resp.json()]


class TestFilters:
    def test_filter_by_mime_type(self, client):
        headers = register_and_login(client)
        upload_doc(client, headers, "PDF документ", file=pdf_file())
        upload_doc(client, headers, "JPEG фото", file=jpg_file())

        resp = client.get("/api/v1/search/?mime_type=application/pdf",
                          headers=headers)
        assert resp.status_code == 200
        for doc in resp.json():
            assert doc["mime_type"] == "application/pdf"

    def test_filter_by_category(self, client):
        headers = register_and_login(client)
        cat_id = client.post("/api/v1/categories/", headers=headers,
                             json={"name": "Медицина"}).json()["id"]
        doc_id = upload_doc(client, headers, "Мед. карта")
        client.patch