from pathlib import Path
from pydantic_settings import SettingsConfigDict, BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
                    env_file=BASE_DIR / ".env",
                    env_file_encoding="utf-8",
                    extra="ignore")

settings = Settings()