from pydantic import BaseModel
from datetime import datetime


class FolderCreate(BaseModel):
    name: str
    parent_id: int | None = None


class FolderUpdate(BaseModel):
    name: str | None = None
    parent_id: int | None = None


class FolderResponse(BaseModel):
    id: int
    name: str
    parent_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FolderTree(FolderResponse):
    children: list["FolderTree"] = []

    model_config = {"from_attributes": True}