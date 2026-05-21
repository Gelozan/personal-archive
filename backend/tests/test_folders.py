"""
Тесты папок: CRUD, вложенность, каскадное удаление документов.
Эндпоинты: /api/v1/folders/*
"""
from tests.conftest import register_and_login, upload_doc, pdf_file


class TestCreateFolder:
    def test_create_root_folder_success(self, client):
        headers = register_and_login(client)
        resp = client.post("/api/v1/folders/", headers=headers,
                           json={"name": "Финансы"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Финансы"
        assert data["parent_id"] is None

    def test_create_nested_folder_success(self, client):
        headers = register_and_login(client)
        parent_id = client.post("/api/v1/folders/", headers=headers,
                                json={"name": "Родитель"}).json()["id"]
        resp = client.post("/api/v1/folders/", headers=headers,
                           json={"name": "Дочерняя", "parent_id": parent_id})
        assert resp.status_code == 201
        assert resp.json()["parent_id"] == parent_id

    def test_duplicate_name_in_same_parent_returns_409(self, client):
        headers = register_and_login(client)
        client.post("/api/v1/folders/", headers=headers, json={"name": "Дубль"})
        resp = client.post("/api/v1/folders/", headers=headers, json={"name": "Дубль"})
        assert resp.status_code == 409

    def test_same_name_in_different_parents_allowed(self, client):
        headers = register_and_login(client)
        p1 = client.post("/api/v1/folders/", headers=headers,
                         json={"name": "Папка А"}).json()["id"]
        p2 = client.post("/api/v1/folders/", headers=headers,
                         json={"name": "Папка Б"}).json()["id"]
        r1 = client.post("/api/v1/folders/", headers=headers,
                         json={"name": "Общее", "parent_id": p1})
        r2 = client.post("/api/v1/folders/", headers=headers,
                         json={"name": "Общее", "parent_id": p2})
        assert r1.status_code == 201
        assert r2.status_code == 201

    def test_create_without_auth_returns_401(self, client):
        assert client.post("/api/v1/folders/",
                           json={"name": "Без токена"}).status_code == 401


class TestGetFolders:
    def test_get_folder_tree_success(self, client):
        headers = register_and_login(client)
        client.post("/api/v1/folders/", headers=headers, json={"name": "Root"})
        resp = client.get("/api/v1/folders/", headers=headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_folder_by_id_success(self, client):
        headers = register_and_login(client)
        folder_id = client.post("/api/v1/folders/", headers=headers,
                                json={"name": "Конкретная"}).json()["id"]
        resp = client.get(f"/api/v1/folders/{folder_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Конкретная"

    def test_get_other_user_folder_returns_404(self, client):
        h1 = register_and_login(client, "f_owner@test.com")
        h2 = register_and_login(client, "f_spy@test.com")
        folder_id = client.post("/api/v1/folders/", headers=h1,
                                json={"name": "Чужая"}).json()["id"]
        assert client.get(f"/api/v1/folders/{folder_id}", headers=h2).status_code == 404

    def test_tree_contains_children(self, client):
        headers = register_and_login(client)
        parent_id = client.post("/api/v1/folders/", headers=headers,
                                json={"name": "Родитель"}).json()["id"]
        client.post("/api/v1/folders/", headers=headers,
                    json={"name": "Ребёнок", "parent_id": parent_id})

        resp = client.get("/api/v1/folders/", headers=headers)
        tree = resp.json()
        parent = next(f for f in tree if f["id"] == parent_id)
        assert len(parent["children"]) == 1
        assert parent["children"][0]["name"] == "Ребёнок"


class TestUpdateFolder:
    def test_rename_folder_success(self, client):
        headers = register_and_login(client)
        folder_id = client.post("/api/v1/folders/", headers=headers,
                                json={"name": "Старое"}).json()["id"]
        resp = client.patch(f"/api/v1/folders/{folder_id}", headers=headers,
                            json={"name": "Новое"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Новое"

    def test_rename_to_existing_name_returns_409(self, client):
        headers = register_and_login(client)
        client.post("/api/v1/folders/", headers=headers, json={"name": "Занятое"})
        folder_id = client.post("/api/v1/folders/", headers=headers,
                                json={"name": "Свободное"}).json()["id"]
        resp = client.patch(f"/api/v1/folders/{folder_id}", headers=headers,
                            json={"name": "Занятое"})
        assert resp.status_code == 409

    def test_folder_cannot_be_its_own_parent(self, client):
        headers = register_and_login(client)
        folder_id = client.post("/api/v1/folders/", headers=headers,
                                json={"name": "Самоссылка"}).json()["id"]
        resp = client.patch(f"/api/v1/folders/{folder_id}", headers=headers,
                            json={"parent_id": folder_id})
        assert resp.status_code == 400


class TestDeleteFolder:
    def test_delete_folder_success(self, client):
        headers = register_and_login(client)
        folder_id = client.post("/api/v1/folders/", headers=headers,
                                json={"name": "Удалить"}).json()["id"]
        resp = client.delete(f"/api/v1/folders/{folder_id}", headers=headers)
        assert resp.status_code == 204

    def test_delete_folder_moves_documents_to_trash(self, client):
        """Документы в удаляемой папке должны попасть в корзину."""
        headers = register_and_login(client)
        folder_id = client.post("/api/v1/folders/", headers=headers,
                                json={"name": "С документами"}).json()["id"]
        name, content, mime = pdf_file()
        doc_id = client.post("/api/v1/documents/", headers=headers,
                             files={"file": (name, content, mime)},
                             data={"title": "Внутри папки",
                                   "folder_id": folder_id}).json()["id"]

        client.delete(f"/api/v1/folders/{folder_id}", headers=headers)

        # Документ должен быть в корзине
        trash_ids = [d["id"] for d in
                     client.get("/api/v1/trash/", headers=headers).json()]
        assert doc_id in trash_ids

    def test_delete_other_user_folder_returns_404(self, client):
        h1 = register_and_login(client, "fd_owner@test.com")
        h2 = register_and_login(client, "fd_attacker@test.com")
        folder_id = client.post("/api/v1/folders/", headers=h1,
                                json={"name": "Чужая"}).json()["id"]
        assert client.delete(f"/api/v1/folders/{folder_id}",
                             headers=h2).status_code == 404