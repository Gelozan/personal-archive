from datetime import datetime, timedelta
from sqlalchemy import or_, func as sa_func
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentResponse, SortField, SortOrder

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/", response_model=list[DocumentResponse])
def search_documents(
    q: str | None = None,
    category_id: int | None = None,
    mime_type: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    size_min: int | None = None,
    size_max: int | None = None,
    sort_by: SortField = SortField.created_at,
    sort_order: SortOrder = SortOrder.desc,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Document).filter(
        Document.owner_id == current_user.id,
        Document.is_deleted.is_(False),
    )

    if q:
        term = f"%{q.lower()}%"
        query = query.filter(or_(
            sa_func.lower(Document.title).like(term),
            sa_func.lower(Document.original_filename).like(term),
            sa_func.lower(Document.note).like(term),
        ))

    if category_id is not None:
        query = query.filter(Document.category_id == category_id)
    if mime_type is not None:
        query = query.filter(Document.mime_type == mime_type)
    if date_from is not None:
        query = query.filter(Document.updated_at >= date_from)
    if date_to is not None:
        query = query.filter(Document.updated_at < (date_to + timedelta(days=1)))
    if size_min is not None:
        query = query.filter(Document.file_size >= size_min)
    if size_max is not None:
        query = query.filter(Document.file_size <= size_max)

    sort_column = getattr(Document, sort_by.value)
    query = query.order_by(
        sort_column.desc() if sort_order == SortOrder.desc else sort_column.asc()
    )

    return query.all()