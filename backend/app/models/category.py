from sqlalchemy import String, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
<<<<<<< HEAD

=======
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.document import Document
>>>>>>> fix/different-fixes


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        Index("ix_categories_owner_id", "owner_id"),
        UniqueConstraint("owner_id", "name", name="uq_category_owner_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    owner: Mapped["User | None"] = relationship("User", back_populates="categories")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="category")
    user_categories: Mapped[list["UserCategory"]] = relationship("UserCategory", back_populates="category", cascade="all, delete-orphan")


class UserCategory(Base):
    __tablename__ = "user_categories"
    __table_args__ = (
        Index("ix_user_categories_user_id", "user_id"),
        Index("ix_user_categories_category_id", "category_id"),
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True)

    user: Mapped["User"] = relationship("User", back_populates="user_categories")
    category: Mapped["Category"] = relationship("Category", back_populates="user_categories")