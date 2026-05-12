from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class DocumentResponse(BaseModel):
    id: int
    title: str
    original_filename: str
    file_size: int
    mime_type: str
    note: str | None
    folder_id: int | None
    category_id: int | None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    title: str | None = None
    note: str | None = None
    folder_id: int | None = None
    category_id: int | None = None


class SortField(str, Enum):
    created_at = "created_at"
    title = "title"
    file_size = "file_size"

class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"