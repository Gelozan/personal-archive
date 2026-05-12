import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.storage import upload_file, delete_file, get_presigned_url, s3_client
from app.core.config import settings
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentResponse, DocumentUpdate

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png"}


def get_document_or_404(document_id: int, owner_id: int, db: Session) -> Document:
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == owner_id,
        Document.is_deleted == False,
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
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
    return doc


@router.get("/", response_model=list[DocumentResponse])
def get_documents(
    folder_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Document).filter(
        Document.owner_id == current_user.id,
        Document.is_deleted == False,
    )
    if folder_id is not None:
        query = query.filter(Document.folder_id == folder_id)
    else:
        query = query.filter(Document.folder_id == None)
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = get_document_or_404(document_id, current_user.id, db)
    url = get_presigned_url(doc.storage_key)
    return {"url": url}


@router.patch("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: int,
    data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = get_document_or_404(document_id, current_user.id, db)

    # model_fields_set содержит только поля которые были переданы в запросе
    for field in data.model_fields_set:
        setattr(doc, field, getattr(data, field))

    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def move_to_trash(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = get_document_or_404(document_id, current_user.id, db)
    doc.is_deleted = True
    doc.deleted_at = datetime.now(timezone.utc)
    db.commit()