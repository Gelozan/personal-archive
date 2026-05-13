from sqlalchemy.orm import Session
from fastapi import Request
from app.models.audit_log import AuditLog


def create_audit_log(
    db: Session,
    action: str,
    user_id: int | None = None,
    document_id: int | None = None,
    request: Request | None = None,
) -> None:
    ip = None
    if request:
        forwarded_for = request.headers.get("X-Forwarded-For")
        ip = forwarded_for.split(",")[0].strip() if forwarded_for else request.client.host

    log = AuditLog(
        user_id=user_id,
        action=action,
        document_id=document_id,
        ip_address=ip,
    )
    db.add(log)
    db.commit()