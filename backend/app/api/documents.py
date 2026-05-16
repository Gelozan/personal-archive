import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_document_or_404, get_folder_or_404, get_category_or_404
from app.core.storage import upload_file, get_presigned_url
from app.core.config import settings
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentResponse, DocumentUpdate
from app.core.audit import create_audit_log
from app.core.actions import ACTION_UPLOAD, ACTION_UPDATE_METADATA, ACTION_MOVE_TO_TRASH, ACTION_DOWNLOAD

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}


@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    note: str | None = Form(None),
    folder_id: int | None = Form(None),
    category_id: int | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File type not allowed. Use PDF, JPG or PNG")

    content = await file.read()
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"File too large. Max size is {settings.max_file_size_mb}MB")

    storage_key = f"users/{current_user.id}/documents/{uuid.uuid4()}"
    upload_file(key=storage_key, data=content, content_type=file.content_type)

    doc = Document(
        owner_id=current_user.id,
        title=title,
        original_filename=file.filename,
        storage_key=storage_key,
        file_size=len(content),
        mime_type=file.content_type,
        note=note,
        folder_id=folder_id,
        category_id=category_id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    create_audit_log(db, action=ACTION_UPLOAD, user_id=current_user.id, document_id=doc.id, request=request)
    return doc


@router.get("/", response_model=list[DocumentResponse])
def get_documents(
    folder_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Document).filter(
        Document.owner_id == current_user.id,
        Document.is_deleted.is_(False),
    )
    if folder_id is not None:
        query = query.filter(Document.folder_id == folder_id)
    else:
        query = query.filter(Document.folder_id.is_(None))
    return query.order_by(Document.created_at.desc()).all()


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_document_or_404(document_id, current_user.id, db)


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = get_document_or_404(document_id, current_user.id, db)
    url = get_presigned_url(doc.storage_key)
    create_audit_log(db, action=ACTION_DOWNLOAD, user_id=current_user.id, document_id=doc.id, request=request)
    return {"url": url}


@router.patch("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: int,
    data: DocumentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = get_document_or_404(document_id, current_user.id, db)

    if data.folder_id is not None:
        get_folder_or_404(data.folder_id, current_user.id, db)
    if data.category_id is not None:
        get_category_or_404(data.category_id, current_user.id, db)

    # model_fields_set содержит только поля которые были переданы в запросе
    for field in data.model_fields_set:
        setattr(doc, field, getattr(data, field))

    db.commit()
    db.refresh(doc)
    create_audit_log(db, action=ACTION_UPDATE_METADATA, user_id=current_user.id, document_id=doc.id, request=request)
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def move_to_trash(
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = get_document_or_404(document_id, current_user.id, db)
    doc.is_deleted = True
    doc.deleted_at = datetime.now(timezone.utc)
    db.commit()
    create_audit_log(db, action=ACTION_MOVE_TO_TRASH, user_id=current_user.id, document_id=doc.id, request=request)