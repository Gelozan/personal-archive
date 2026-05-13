from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import secrets
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserLogin, ForgotPasswordRequest, ResetPasswordRequest
from app.core.dependencies import get_current_user
from app.core.initial_data import assign_default_categories_to_user
from app.models.password_reset import PasswordResetToken
from app.core.email import send_password_reset_email
from app.core.audit import create_audit_log
from app.core.actions import ACTION_REGISTER, ACTION_LOGIN, ACTION_FORGOT_PASSWORD, ACTION_RESET_PASSWORD

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(email=data.email, name=data.name, hashed_password=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    create_audit_log(db, action=ACTION_REGISTER, user_id=user.id, request=request)
    assign_default_categories_to_user(db, user)
    return user


@router.post("/login")
def login(data: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    create_audit_log(db, action=ACTION_LOGIN, user_id=user.id, request=request)
    return {
        "access_token": create_access_token({"sub": user.id}),
        "refresh_token": create_refresh_token({"sub": user.id}),
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(data: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        return

    # Инвалидируем старые токены этого пользователя
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,
    ).update({"used": True})

    token = secrets.token_urlsafe(32)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(reset_token)
    db.commit()
    create_audit_log(db, action=ACTION_FORGOT_PASSWORD, user_id=user.id, request=request)
    send_password_reset_email(to_email=user.email, token=token)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(data: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == data.token,
        PasswordResetToken.used == False,
    ).first()

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used token",
        )

    if reset_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token has expired",
        )

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    user.hashed_password = hash_password(data.new_password)

    reset_token.used = True
    db.commit()
    create_audit_log(db, action=ACTION_RESET_PASSWORD, user_id=user.id, request=request)