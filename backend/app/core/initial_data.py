from sqlalchemy.orm import Session
from app.models.category import Category, UserCategory
from app.models.user import User

DEFAULT_CATEGORIES = [
    "Паспорт", "СНИЛС", "ИНН", "Полис ОМС",
    "Страховка", "Договор", "Чек", "Справка",
    "Доверенность", "Свидетельство", "Прочее",
]


def create_default_categories(db: Session) -> None:
    existing = db.query(Category).filter(Category.owner_id == None).count()
    if existing > 0:
        return
    for name in DEFAULT_CATEGORIES:
        db.add(Category(name=name, owner_id=None))
    db.commit()


def assign_default_categories_to_user(db: Session, user: User) -> None:
    system_categories = db.query(Category).filter(Category.owner_id == None).all()
    for category in system_categories:
        db.add(UserCategory(user_id=user.id, category_id=category.id))
    db.commit()