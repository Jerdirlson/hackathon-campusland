from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Metrolínea Counter"
    app_env: str = "dev"
    yolo_model: str = "yolov8n.pt"
    backend_url: str = "http://metrolinea-backend:3000"
    default_capacity: int = 50

    model_config = {"env_file": ".env"}


settings = Settings()
