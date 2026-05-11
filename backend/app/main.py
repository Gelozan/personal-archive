from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import SessionLocal
from app.core.initial_data import create_default_categories

from app.core.config import settings

from app.api.auth import router as auth_router


app = FastAPI(title=settings.app_name, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "Personal Archive API"}


@app.get("/health")
def health():
    return {"status": "ok"}

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        create_default_categories(db)
    except Exception as e:
        print(f"Startup error: {e}")
    finally:
        db.close()