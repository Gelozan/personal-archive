import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.storage import get_presigned_url
from app.models.user import User
from app.models.document import Document
from app.models.share_link import ShareLink
from app.schemas.share_link import ShareLinkCreate, ShareLinkResponse, ShareLinkPublicResponse
from app.core.audit import create_audit_log
from app.core.actions import ACTION_CREATE_SHARE_LINK, ACTION_REVOKE_SHARE_LINK, ACTION_ACCESS_SHARED_DOCUMENT

router = APIRouter(tags=["share"])


@router.post("/documents/{document_id}/share", response_model=ShareLinkResponse, status_code=status.HTTP_201_CREATED)
def create_share_link(
    document_id: int,
    data: ShareLinkCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id,
        Document.is_deleted.is_(False),
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # деактивируем предыдущие ссылки на этот документ
    db.query(ShareLink).filter(
        ShareLink.document_id == document_id,
        ShareLink.is_active.is_(True),
    ).update({"is_active": False})

    link = ShareLink(
        document_id=document_id,
        token=secrets.token_urlsafe(32),
        expires_at=data.expires_at,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    create_audit_log(db, action=ACTION_CREATE_SHARE_LINK, user_id=current_user.id, document_id=document_id, request=request)
    return link


@router.delete("/documents/{document_id}/share", status_code=status.HTTP_204_NO_CONTENT)
def revoke_share_link(
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    link = db.query(ShareLink).filter(
        ShareLink.document_id == document_id,
        ShareLink.is_active.is_(True),
    ).first()
    db.delete(link)
    db.commit()
    create_audit_log(db, action=ACTION_REVOKE_SHARE_LINK, user_id=current_user.id, document_id=document_id, request=request)


@router.get("/share/{token}", response_model=ShareLinkPublicResponse)
def access_shared_document(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    link = db.query(ShareLink).filter(
        ShareLink.token == token,
        ShareLink.is_active.is_(True),
    ).first()

    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found or revoked")

    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        db.delete(link)
        db.commit()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found or expired")

    doc = link.document
    if doc.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    create_audit_log(db, action=ACTION_ACCESS_SHARED_DOCUMENT, document_id=link.document_id, request=request)

    return ShareLinkPublicResponse(
        title=doc.title,
        original_filename=doc.original_filename,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        download_url=get_presigned_url(doc.storage_key),
    )