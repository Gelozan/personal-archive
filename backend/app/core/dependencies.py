from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.folder import Folder
from app.models.category import Category, UserCategory
from app.models.document import Document

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        sub = payload.get("sub")
        if sub is None or payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user_id = int(sub)
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


def get_folder_or_404(folder_id: int, owner_id: int, db: Session) -> Folder:
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.owner_id == owner_id
    ).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Папка не найдена")
    return folder


def get_category_or_404(category_id: int, owner_id: int, db: Session) -> Category:
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")

    if cat.owner_id is None:
        visible = db.query(UserCategory).filter(
            UserCategory.user_id == owner_id,
            UserCategory.category_id == category_id,
        ).first()
        if not visible:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")
    else:
        if cat.owner_id != owner_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")

    return cat


def get_document_or_404(document_id: int, owner_id: int, db: Session) -> Document:
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == owner_id,
        Document.is_deleted == False,
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Документ не найден")
    return doc


def get_trashed_or_404(document_id: int, owner_id: int, db: Session) -> Document:
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == owner_id,
        Document.is_deleted == True,
    ).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Документ не найден в корзине")
    return doc