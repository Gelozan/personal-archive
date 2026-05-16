from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_trashed_or_404
from app.core.storage import delete_file
from app.models.user import User
from app.models.document import Document
from app.models.folder import Folder
from app.schemas.document import DocumentResponse
from app.core.audit import create_audit_log
from app.core.actions import ACTION_RESTORE, ACTION_DELETE_PERMANENT

router = APIRouter(prefix="/trash", tags=["trash"])


@router.get("/", response_model=list[DocumentResponse])
def get_trash(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Document).filter(
        Document.owner_id == current_user.id,
        Document.is_deleted == True,
    ).order_by(Document.deleted_at.desc()).all()


@router.post("/{document_id}/restore", response_model=DocumentResponse)
def restore_document(
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = get_trashed_or_404(document_id, current_user.id, db)
    doc.is_deleted = False
    doc.deleted_at = None
    if doc.folder_id is not None:
        folder_exists = db.query(Folder).filter(
            Folder.id == doc.folder_id,
            Folder.owner_id == current_user.id,
        ).first()
        if not folder_exists:
            doc.folder_id = None
    db.commit()
    db.refresh(doc)
    create_audit_log(db, action=ACTION_RESTORE, user_id=current_user.id, document_id=doc.id, request=request)
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_permanently(
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = get_trashed_or_404(document_id, current_user.id, db)
    delete_file(doc.storage_key)
    create_audit_log(db, action=ACTION_DELETE_PERMANENT, user_id=current_user.id, document_id=doc.id, request=request)
    db.delete(doc)
    db.commit()
    