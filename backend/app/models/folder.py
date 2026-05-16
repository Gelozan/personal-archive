from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.document import Document

class Folder(Base):
    __tablename__ = "folders"
    __table_args__ = (
        Index("ix_folders_owner_id", "owner_id"),
        Index("ix_folders_parent_id", "parent_id"),
        UniqueConstraint("owner_id", "parent_id", "name", name="uq_folder_owner_parent_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner: Mapped["User"] = relationship("User", back_populates="folders") # noqa: F821
    parent: Mapped["Folder | None"] = relationship("Folder", remote_side="Folder.id", back_populates="children") # noqa: F821
    children: Mapped[list["Folder"]] = relationship("Folder", back_populates="parent", cascade="all, delete-orphan") # noqa: F821
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="folder") # noqa: F821