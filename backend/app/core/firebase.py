"""Firebase Admin SDK initialization and utilities."""

import firebase_admin
from firebase_admin import credentials, db, auth, storage
from typing import Optional
import logging

from backend.app.core.firebase_config import FirebaseConfig

logger = logging.getLogger(__name__)


class FirebaseService:
    """Firebase service for managing admin SDK initialization and operations."""

    _instance: Optional["FirebaseService"] = None
    _initialized: bool = False

    def __new__(cls):
        """Ensure singleton pattern."""
        if cls._instance is None:
            cls._instance = super(FirebaseService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize Firebase service."""
        if not self._initialized:
            self.initialize()

    @classmethod
    def initialize(cls) -> None:
        """
        Initialize Firebase Admin SDK.

        Raises:
            ValueError: If Firebase configuration is invalid or missing
        """
        if cls._initialized:
            logger.info("Firebase already initialized")
            return

        try:
            firebase_config = FirebaseConfig()
            config_dict = firebase_config.get_config()

            # Initialize Firebase app
            cred = credentials.Certificate(config_dict)
            firebase_admin.initialize_app(cred)

            cls._initialized = True
            logger.info("Firebase Admin SDK initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {str(e)}")
            raise

    @classmethod
    def get_auth(self):
        """
        Get Firebase Auth instance.

        Returns:
            firebase_admin.auth: Firebase authentication module
        """
        if not self._initialized:
            raise RuntimeError("Firebase not initialized. Call initialize() first.")
        return auth

    @classmethod
    def get_db(self):
        """
        Get Firebase Realtime Database instance.

        Returns:
            firebase_admin.db: Firebase database module
        """
        if not self._initialized:
            raise RuntimeError("Firebase not initialized. Call initialize() first.")
        return db

    @classmethod
    def get_storage(self):
        """
        Get Firebase Storage instance.

        Returns:
            firebase_admin.storage: Firebase storage module
        """
        if not self._initialized:
            raise RuntimeError("Firebase not initialized. Call initialize() first.")
        return storage

    @classmethod
    def verify_id_token(cls, token: str) -> dict:
        """
        Verify Firebase ID token.

        Args:
            token: ID token to verify

        Returns:
            dict: Decoded token claims

        Raises:
            ValueError: If token is invalid
        """
        try:
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            logger.error(f"Token verification failed: {str(e)}")
            raise ValueError(f"Invalid token: {str(e)}")

    @classmethod
    def create_user(cls, email: str, password: str, **kwargs) -> str:
        """
        Create a new Firebase user.

        Args:
            email: User email
            password: User password
            **kwargs: Additional user properties (display_name, phone_number, etc.)

        Returns:
            str: Firebase UID
        """
        try:
            user = auth.create_user(email=email, password=password, **kwargs)
            logger.info(f"User created: {user.uid}")
            return user.uid
        except Exception as e:
            logger.error(f"Failed to create user: {str(e)}")
            raise

    @classmethod
    def delete_user(cls, uid: str) -> None:
        """
        Delete a Firebase user.

        Args:
            uid: Firebase user UID
        """
        try:
            auth.delete_user(uid)
            logger.info(f"User deleted: {uid}")
        except Exception as e:
            logger.error(f"Failed to delete user: {str(e)}")
            raise

    @classmethod
    def get_user(cls, uid: str) -> dict:
        """
        Get Firebase user information.

        Args:
            uid: Firebase user UID

        Returns:
            dict: User data
        """
        try:
            user = auth.get_user(uid)
            return {
                "uid": user.uid,
                "email": user.email,
                "display_name": user.display_name,
                "phone_number": user.phone_number,
                "email_verified": user.email_verified,
                "disabled": user.disabled,
            }
        except Exception as e:
            logger.error(f"Failed to get user: {str(e)}")
            raise

    @classmethod
    def is_initialized(cls) -> bool:
        """
        Check if Firebase is initialized.

        Returns:
            bool: True if Firebase is initialized
        """
        return cls._initialized
