from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.category import Category, UserCategory
from app.schemas.category import CategoryCreate, CategoryResponse
from app.core.audit import create_audit_log
from app.core.actions import ACTION_CREATE_CATEGORY, ACTION_DELETE_CATEGORY, ACTION_HIDE_CATEGORY

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=list[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # системные категории которые пользователь не скрыл
    system = (
        db.query(Category)
        .join(UserCategory, UserCategory.category_id == Category.id)
        .filter(UserCategory.user_id == current_user.id)
        .all()
    )
    # кастомные категории пользователя
    custom = db.query(Category).filter(Category.owner_id == current_user.id).all()
    return system + custom


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = Category(name=data.name, owner_id=current_user.id)
    db.add(category)
    db.commit()
    db.refresh(category)
    create_audit_log(db, action=ACTION_CREATE_CATEGORY, category_id=category.id, user_id=current_user.id, request=request)
    return category


@router.delete("/system/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def hide_system_category(
    category_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uc = db.query(UserCategory).filter(
        UserCategory.user_id == current_user.id,
        UserCategory.category_id == category_id,
    ).first()
    if not uc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    db.delete(uc)
    db.commit()
    create_audit_log(db, action=ACTION_HIDE_CATEGORY, category_id=category_id, user_id=current_user.id, request=request)

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_category(
    category_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.owner_id == current_user.id,
    ).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    create_audit_log(db, action=ACTION_DELETE_CATEGORY, category_id=category.id, user_id=current_user.id, request=request)
    db.delete(category)
    db.commit()