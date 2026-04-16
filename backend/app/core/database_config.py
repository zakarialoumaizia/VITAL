

from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class DatabaseConfig(BaseSettings):
    

    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./test.db")

    # Collection names
    FINGERPRINTS_COLLECTION: str = "fingerprints"
    USERS_COLLECTION: str = "users"
    SESSIONS_COLLECTION: str = "sessions"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_database_config() -> DatabaseConfig:
    
    return DatabaseConfig()
