

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

import bcrypt
# Password hashing - supporting both bcrypt and argon2
pwd_context = CryptContext(schemes=["bcrypt", "argon2"], deprecated="auto")


class AuthService:
    

    @staticmethod
    def hash_password(password: str) -> str:
        
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            # Fallback for bcrypt if passlib fails due to library version issues
            if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
                try:
                    return bcrypt.checkpw(
                        plain_password.encode("utf-8"), 
                        hashed_password.encode("utf-8")
                    )
                except Exception:
                    return False
            logger.error(f"Password verification failed: {str(e)}")
            return False

    @staticmethod
    def create_access_token(
        user_id: int,
        email: str,
        user_role: str,
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        
        if expires_delta is None:
            expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

        expire = datetime.utcnow() + expires_delta
        to_encode = {
            "sub": str(user_id),
            "email": email,
            "user_role": user_role,
            "exp": expire,
        }

        encoded_jwt = jwt.encode(
            to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
        )
        return encoded_jwt

    @staticmethod
    def create_refresh_token(user_id: int, email: str) -> str:
        
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode = {
            "sub": str(user_id),
            "email": email,
            "type": "refresh",
            "exp": expire,
        }

        encoded_jwt = jwt.encode(
            to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
        )
        return encoded_jwt

    @staticmethod
    def verify_token(token: str) -> Dict[str, Any]:
        
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            user_id: str = payload.get("sub")
            if user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials",
                )
            return payload
        except JWTError as e:
            logger.error(f"Token verification failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

    @staticmethod
    def decode_token(token: str) -> Optional[Dict[str, Any]]:
        
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            return payload
        except JWTError:
            return None

    @staticmethod
    def is_token_expired(token: str) -> bool:
        
        payload = AuthService.decode_token(token)
        if not payload:
            return True

        exp = payload.get("exp")
        if not exp:
            return True

        return datetime.fromtimestamp(exp) < datetime.utcnow()
