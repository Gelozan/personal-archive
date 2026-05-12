from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.storage import delete_file
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentResponse

router = APIRouter(prefix="/trash", tags=["trash"])


def get_trashed_or_404(document_id: int, owner_id: int, db: Session) -> Document:
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == owner_id,
        Document.is_deleted == True,
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found in trash")
    return doc


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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = get_trashed_or_404(document_id, current_user.id, db)
    doc.is_deleted = False
    doc.deleted_at = None
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_permanently(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = get_trashed_or_404(document_id, current_user.id, db)
    delete_file(doc.storage_key)
    db.delete(doc)
    db.commit()