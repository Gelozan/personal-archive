from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.folder import Folder
from app.schemas.folder import FolderCreate, FolderUpdate, FolderResponse, FolderTree

router = APIRouter(prefix="/folders", tags=["folders"])


def get_folder_or_404(folder_id: int, owner_id: int, db: Session) -> Folder:
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.owner_id == owner_id
    ).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return folder


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
    folders = db.query(Folder).filter(Folder.owner_id == current_user.id).all()
    return build_tree(folders)


@router.post("/", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(
    data: FolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.parent_id is not None:
        get_folder_or_404(data.parent_id, current_user.id, db)

    folder = Folder(name=data.name, owner_id=current_user.id, parent_id=data.parent_id)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


@router.patch("/{folder_id}", response_model=FolderResponse)
def update_folder(
    folder_id: int,
    data: FolderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = get_folder_or_404(folder_id, current_user.id, db)

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
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = get_folder_or_404(folder_id, current_user.id, db)
    db.delete(folder)
    db.commit()