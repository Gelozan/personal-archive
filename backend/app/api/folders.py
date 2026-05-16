from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.folder import Folder
from app.models.document import Document
from app.schemas.folder import FolderCreate, FolderUpdate, FolderResponse, FolderTree
from app.core.audit import create_audit_log
from app.core.actions import ACTION_CREATE_FOLDER, ACTION_UPDATE_FOLDER, ACTION_DELETE_FOLDER, ACTION_MOVE_TO_TRASH
from app.core.dependencies import get_folder_or_404
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/folders", tags=["folders"])


def build_tree(folders: list[Folder], parent_id: int | None = None) -> list[FolderTree]:
    result = []
    for folder in folders:
        if folder.parent_id == parent_id:
            node = FolderTree.model_validate(folder)
            node.children = build_tree(folders, folder.id)
            result.append(node)
    return result


@router.get("/", response_model=list[FolderTree])
def get_folders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folders = db.query(Folder).filter(Folder.owner_id == current_user.id).order_by(Folder.name.asc()).all()
    return build_tree(folders)


@router.get("/children", response_model=list[FolderResponse])
def get_folder_children(
    folder_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if folder_id is not None:
        get_folder_or_404(folder_id, current_user.id, db)
        
    query = db.query(Folder).filter(Folder.owner_id == current_user.id)
    if folder_id is not None:
        query = query.filter(Folder.parent_id == folder_id)
    else:
        query = query.filter(Folder.parent_id.is_(None))
    return query.order_by(Folder.name.asc()).all()


@router.get("/{folder_id}", response_model=FolderResponse)
def get_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_folder_or_404(folder_id, current_user.id, db)


@router.post("/", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(
    data: FolderCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.parent_id is not None:
        get_folder_or_404(data.parent_id, current_user.id, db)

    exists = db.query(Folder).filter(
        Folder.owner_id == current_user.id,
        Folder.name == data.name,
        Folder.parent_id == data.parent_id,
    ).first()
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Папка с таким названием уже существует",
        )

    folder = Folder(name=data.name, owner_id=current_user.id, parent_id=data.parent_id)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    create_audit_log(db, action=ACTION_CREATE_FOLDER, folder_id=folder.id, user_id=current_user.id, request=request)
    return folder


@router.patch("/{folder_id}", response_model=FolderResponse)
def update_folder(
    folder_id: int,
    data: FolderUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = get_folder_or_404(folder_id, current_user.id, db)

    if data.name and data.name != folder.name:
        exists = db.query(Folder).filter(
            Folder.owner_id == current_user.id,
            Folder.name == data.name,
            Folder.parent_id == folder.parent_id,
            Folder.id != folder.id,  # не считаем саму себя
        ).first()
        if exists:
            raise HTTPException(409, "Папка с таким названием уже существует")

    if data.parent_id is not None:
        if data.parent_id == folder_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Folder cannot be its own parent")
        get_folder_or_404(data.parent_id, current_user.id, db)

    if data.name is not None:
        folder.name = data.name
    if data.parent_id is not None:
        folder.parent_id = data.parent_id

    db.commit()
    db.refresh(folder)
    create_audit_log(db, action=ACTION_UPDATE_FOLDER, folder_id=folder.id, user_id=current_user.id, request=request)
    return folder


def _collect_folder_ids(db: Session, parent_id: int, owner_id: int) -> list[int]:
    children = (
        db.query(Folder.id)
        .filter(Folder.parent_id == parent_id, Folder.owner_id == owner_id)
        .all()
    )
    result = []
    for (child_id,) in children:
        result.append(child_id)
        result.extend(_collect_folder_ids(db, child_id, owner_id))
    return result


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = get_folder_or_404(folder_id, current_user.id, db)

    all_folder_ids = _collect_folder_ids(db, folder_id, current_user.id)
    all_folder_ids.append(folder_id)

    docs_to_trash = (
        db.query(Document)
        .filter(
            Document.owner_id == current_user.id,
            Document.folder_id.in_(all_folder_ids),
            Document.is_deleted.is_(False),
        )
        .all()
    )

    for doc in docs_to_trash:
        doc.is_deleted = True
        doc.deleted_at = datetime.now(timezone.utc)
        create_audit_log(db, action=ACTION_MOVE_TO_TRASH, user_id=current_user.id, document_id=doc.id, request=request)

    create_audit_log(db, action=ACTION_DELETE_FOLDER, folder_id=folder.id, user_id=current_user.id, request=request)
    db.delete(folder)
    db.commit()