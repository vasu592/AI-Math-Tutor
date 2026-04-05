from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost/mathtutor"
    REDIS_URL: str = "redis://localhost:6379"
    OPENAI_API_KEY: str = ""
    VIDEO_BASE_URL: str = "https://your-bucket.s3.amazonaws.com"
    JWT_SECRET: str = "change-this-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days
    ADMIN_PASSWORD: str = "admin123"
    SESSION_MAX_SECONDS: int = 2700  # 45 minutes

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
