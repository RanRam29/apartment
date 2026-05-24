from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    mongo_uri: str = "mongodb://localhost:27017/apartment_preferences"
    redis_url: str = ""
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    port: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
