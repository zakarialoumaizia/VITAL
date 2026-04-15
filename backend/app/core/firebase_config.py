"""Firebase configuration module."""

import os
import json
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings


class FirebaseSettings(BaseSettings):
    """Firebase configuration settings."""

    # Firebase project credentials
    firebase_project_id: str
    firebase_private_key_id: str
    firebase_private_key: str
    firebase_client_email: str
    firebase_client_id: str
    firebase_auth_uri: str
    firebase_token_uri: str
    firebase_auth_provider_x509_cert_url: str
    firebase_client_x509_cert_url: str

    class Config:
        env_file = ".env"
        case_sensitive = False


class FirebaseConfig:
    """Firebase admin SDK configuration."""

    def __init__(self):
        """Initialize Firebase configuration from environment or env file."""
        # Load .env from backend directory if not already loaded
        backend_dir = Path(__file__).parent.parent.parent
        env_file = backend_dir / ".env"
        if env_file.exists():
            from dotenv import load_dotenv

            load_dotenv(env_file)

        self.config_dict = self._load_config()

    def _load_config(self) -> dict:
        """
        Load Firebase configuration from environment variables or .env file.

        Returns:
            dict: Firebase service account configuration
        """
        backend_dir = Path(__file__).parent.parent.parent

        # Try to load from GOOGLE_APPLICATION_CREDENTIALS file path
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if creds_path:
            # Try the path as-is first
            if os.path.exists(creds_path):
                with open(creds_path, "r") as f:
                    return json.load(f)

            # Try relative to backend directory
            alt_path = backend_dir / creds_path
            if alt_path.exists():
                with open(alt_path, "r") as f:
                    return json.load(f)

        # Try to load from FIREBASE_CONFIG env variable (JSON string)
        firebase_config_str = os.getenv("FIREBASE_CONFIG")
        if firebase_config_str:
            try:
                return json.loads(firebase_config_str)
            except json.JSONDecodeError:
                raise ValueError("Invalid FIREBASE_CONFIG JSON")

        # Build from individual environment variables
        required_fields = [
            "firebase_project_id",
            "firebase_private_key_id",
            "firebase_private_key",
            "firebase_client_email",
            "firebase_client_id",
            "firebase_auth_uri",
            "firebase_token_uri",
            "firebase_auth_provider_x509_cert_url",
            "firebase_client_x509_cert_url",
        ]

        config = {}
        for field in required_fields:
            value = os.getenv(field.upper())
            if not value:
                raise ValueError(f"Missing required Firebase config: {field}")
            config[field] = value

        return config

    def get_config(self) -> dict:
        """
        Get Firebase configuration dictionary.

        Returns:
            dict: Firebase service account configuration
        """
        return self.config_dict
