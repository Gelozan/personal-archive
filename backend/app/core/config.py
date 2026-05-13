from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str
    debug: bool

    database_url: str

    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int

    max_file_size_mb: int

    yos_endpoint_url: str
    yos_access_key_id: str
    yos_secret_access_key: str
    yos_bucket_name: str

    cors_origins: str

    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    smtp_from: str
    frontend_url: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
