"""
Тесты категорий: системные и пользовательские.
Эндпоинты: /api/v1/categories/*
"""
from tests.conftest import register_and_login, upload_doc, pdf_file


class TestSystemCategories:
    def test_system_categories_visible_after_registration(self, client):
        headers = register_and_login(client)
        resp = client.get("/api/v1/categories/", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) > 0

    def test_system_categories_have_no_owner_id(self, client):
        headers = register_and_login(client)
        categories = client.get("/api/v1/categories/", headers=headers).json()
        system_cats = [c for c in categories if c.get("owner_id") is None]
        assert len(system_cats) > 0

    def test_hide_system_category(self, client):
        headers = register_and_login(client)
        all_cats = client.get("/api/v1/categories/", headers=headers).json()
        system_cat = next(c for c in all_cats if c.get("owner_id") is None)

        resp = client.delete(f"/api/v1/categories/system/{system_cat['id']}",
                             headers=headers)
        assert resp.status_code == 204

        # Скрытая категория не должна возвращаться в списке
        ids_after = [c["id"] for c in
                     client.get("/api/v1/categories/", headers=headers).json()]
        assert system_cat["id"] not in ids_after

    def test_hide_system_category_of_other_user_returns_404(self, client):
        """Скрытие системной категории привязано к user_categories конкретного юзера."""
        h1 = register_and_login(client, "sc1@test.com")
        h2 = register_and_login(client, "sc2@test.com")
        all_cats = client.get("/api/v1/categories/", headers=h1).json()
        system_cat = next(c for c in all_cats if c.get("owner_id") is None)

        # Скрываем у первого пользователя
        client.delete(f"/api/v1/categories/system/{system_cat['id']}", headers=h1)

        # У второго пользователя категория остаётся
        ids_h2 = [c["id"] for c in
                  client.get("/api/v1/categories/", headers=h2).json()]
        assert system_cat["id"] in ids_h2


class TestCustomCategories:
    def test_create_custom_category_success(self, client):
        headers = register_and_login(client)
        resp = client.post("/api/v1/categories/", headers=headers,
                           json={"name": "Финансы"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Финансы"
        # Пользовательская категория имеет owner_id
        assert data["owner_id"] is not None

    def test_duplicate_custom_category_returns_409(self, client):
        headers = register_and_login(client)
        client.post("/api/v1/categories/", headers=headers, json={"name": "Налоги"})
        resp = client.post("/api/v1/categories/", headers=headers,
                           json={"name": "Налоги"})
        assert resp.status_code == 409

    def test_two_users_can_have_same_category_name(self, client):
        """Одинаковое название у разных пользователей — не дубль."""
        h1 = register_and_login(client, "cc1@test.com")
        h2 = register_and_login(client, "cc2@test.com")
        r1 = client.post("/api/v1/categories/", headers=h1, json={"name": "Общее"})
        r2 = client.post("/api/v1/categories/", headers=h2, json={"name": "Общее"})
        assert r1.status_code == 201
        assert r2.status_code == 201

    def test_delete_custom_category_success(self, client):
        headers = register_and_login(client)
        cat_id = client.post("/api/v1/categories/", headers=headers,
                             json={"name": "Временная"}).json()["id"]
        resp = client.delete(f"/api/v1/categories/{cat_id}", headers=headers)
        assert resp.status_code == 204

    def test_delete_other_user_category_returns_404(self, client):
        h1 = register_and_login(client, "cat_owner@test.com")
        h2 = register_and_login(client, "cat_spy@test.com")
        cat_id = client.post("/api/v1/categories/", headers=h1,
                             json={"name": "Чужая категория"}).json()["id"]
        assert client.delete(f"/api/v1/categories/{cat_id}",
                             headers=h2).status_code == 404

    def test_assign_category_to_document(self, client):
        headers = register_and_login(client)
        cat_id = client.post("/api/v1/categories/", headers=headers,
                             json={"name": "Страховки"}).json()["id"]
        doc_id = upload_doc(client, headers)
        resp = client.patch(f"/api/v1/documents/{doc_id}", headers=headers,
                            json={"category_id": cat_id})
        assert resp.status_code == 200
        assert resp.json()["category_id"] == cat_id