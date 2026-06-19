from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Metrolinea AI"
    app_env: str = "dev"
    log_level: str = "INFO"

    yolo_model: str = "yolov8n.pt"

    occupancy_threshold: float = 0.85
    delay_threshold_min: int = 8
    dispatch_cooldown_min: int = 10

    data_dir: str = "/srv/data"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
