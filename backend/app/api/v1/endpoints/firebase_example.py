"""Example endpoints demonstrating Firebase integration."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import logging

from backend.app.api.firebase_auth import get_current_user, get_current_user_optional
from backend.app.core.firebase import FirebaseService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/firebase", tags=["firebase"])


class SignUpRequest(BaseModel):
    """Sign up request model."""

    email: str
    password: str
    display_name: Optional[str] = None


class SignUpResponse(BaseModel):
    """Sign up response model."""

    uid: str
    email: str
    message: str


@router.post("/signup", response_model=SignUpResponse)
async def signup(request: SignUpRequest) -> SignUpResponse:
    """
    Create a new user in Firebase.

    Args:
        request: Sign up request with email and password

    Returns:
        SignUpResponse: User UID and confirmation message

    Raises:
        HTTPException: If user creation fails
    """
    try:
        uid = FirebaseService.create_user(
            email=request.email,
            password=request.password,
            display_name=request.display_name,
        )

        return SignUpResponse(
            uid=uid,
            email=request.email,
            message="User created successfully",
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )


@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Get current user profile from Firebase.

    Args:
        current_user: Decoded Firebase token

    Returns:
        dict: User profile information
    """
    try:
        uid = current_user.get("uid")
        user_data = FirebaseService.get_user(uid)

        return {
            "uid": user_data["uid"],
            "email": user_data["email"],
            "display_name": user_data["display_name"],
            "email_verified": user_data["email_verified"],
        }

    except Exception as e:
        logger.error(f"Profile fetch error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch profile",
        )


@router.delete("/account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """
    Delete current user account.

    Args:
        current_user: Decoded Firebase token

    Returns:
        dict: Confirmation message
    """
    try:
        uid = current_user.get("uid")
        FirebaseService.delete_user(uid)

        return {"message": "Account deleted successfully"}

    except Exception as e:
        logger.error(f"Account deletion error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account",
        )


@router.get("/verify")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """
    Verify current Firebase token.

    Args:
        current_user: Decoded Firebase token

    Returns:
        dict: Token verification result
    """
    return {
        "valid": True,
        "uid": current_user.get("uid"),
        "email": current_user.get("email"),
        "iat": current_user.get("iat"),
        "exp": current_user.get("exp"),
    }


@router.get("/public-info")
async def public_info(
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    Public endpoint with optional authentication.

    Args:
        current_user: Decoded Firebase token (optional)

    Returns:
        dict: Response with or without user info
    """
    if current_user:
        return {
            "authenticated": True,
            "user_id": current_user.get("uid"),
            "data": "This is personalized data",
        }

    return {
        "authenticated": False,
        "data": "This is public data",
    }
