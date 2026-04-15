"""Firebase authentication dependencies for FastAPI."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from typing import Optional
import logging

from backend.app.core.firebase import FirebaseService

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security),
) -> dict:
    """
    Verify Firebase ID token and return user information.

    Args:
        credentials: HTTP bearer token

    Returns:
        dict: Decoded token with user claims

    Raises:
        HTTPException: If token is invalid or verification fails
    """
    token = credentials.credentials

    try:
        decoded_token = FirebaseService.verify_id_token(token)
        return decoded_token
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthCredentials] = Depends(security),
) -> Optional[dict]:
    """
    Verify Firebase ID token but don't require it (optional authentication).

    Args:
        credentials: HTTP bearer token (optional)

    Returns:
        dict: Decoded token with user claims, or None if no token provided
    """
    if not credentials:
        return None

    try:
        decoded_token = FirebaseService.verify_id_token(credentials.credentials)
        return decoded_token
    except Exception as e:
        logger.warning(f"Optional authentication failed: {str(e)}")
        return None
