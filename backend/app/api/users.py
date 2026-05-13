from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import verify_password, hash_password
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, PasswordChange
from app.core.audit import create_audit_log
from app.core.actions import ACTION_UPDATE_USER_INFO, ACTION_CHANGE_PASSWORD

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    data: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field in data.model_fields_set:
        setattr(current_user, field, getattr(data, field))
    db.commit()
    db.refresh(current_user)
    create_audit_log(db, action=ACTION_UPDATE_USER_INFO, user_id=current_user.id, request=request)
    return current_user


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    data: PasswordChange,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    create_audit_log(db, action=ACTION_CHANGE_PASSWORD, user_id=current_user.id, request=request)