from pydantic import BaseModel
from datetime import datetime


class ShareLinkCreate(BaseModel):
    expires_at: datetime | None = None


class ShareLinkResponse(BaseModel):
    token: str
    is_active: bool
    expires_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ShareLinkPublicResponse(BaseModel):
    title: str
    original_filename: str
    file_size: int
    mime_type: str
    download_url: str