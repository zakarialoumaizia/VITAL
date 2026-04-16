import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import httpx

from app.db.session import get_db
from app.crud.user import (
    UserCRUD,
    AdminCRUD,
    MemberCRUD,
    PartnerCRUD,
    SessionCRUD,
    FingerprintCRUD,
)
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserOAuth2,
    TokenResponse,
    UserResponse,
)
from app.core.security import AuthService
from app.core.config import settings
from app.api.deps import get_current_user
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(
    user_data: UserRegister, request: Request, db: Session = Depends(get_db)
) -> TokenResponse:

    # Check if email exists
    existing_user = UserCRUD.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Check fingerprint uniqueness if provided
    if user_data.fingerprint_hash:
        existing_fingerprint = FingerprintCRUD.get_fingerprint_by_hash(
            db, user_data.fingerprint_hash
        )
        if existing_fingerprint:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Device fingerprint already registered with another account",
            )

    try:
        # Create user
        user = UserCRUD.create_user(db, user_data)

        # Create role-specific profile
        if user_data.user_role.lower() == UserRole.ADMIN.value:
            AdminCRUD.create_admin(db, user.id)
        elif user_data.user_role.lower() == UserRole.PARTNER.value:
            PartnerCRUD.create_partner(db, user.id)
        else:  # Default to member
            MemberCRUD.create_member(db, user.id)

        # Generate tokens
        access_token = AuthService.create_access_token(
            user_id=user.id, email=user.email, user_role=user.user_role
        )
        refresh_token = AuthService.create_refresh_token(user.id, user.email)

        # Create session
        expires_at = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        SessionCRUD.create_session(
            db=db,
            user_id=user.id,
            token=access_token,
            expires_at=expires_at,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register user: {str(e)}",
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin, request: Request, db: Session = Depends(get_db)
) -> TokenResponse:

    # Get user by email
    user = UserCRUD.get_user_by_email(db, credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    # Verify password
    if not user.password_hash or not AuthService.verify_password(
        credentials.password, user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
        )

    try:
        # Generate tokens
        access_token = AuthService.create_access_token(
            user_id=user.id, email=user.email, user_role=user.user_role
        )
        refresh_token = AuthService.create_refresh_token(user.id, user.email)

        # Create session
        expires_at = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        SessionCRUD.create_session(
            db=db,
            user_id=user.id,
            token=access_token,
            expires_at=expires_at,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login failed"
        )


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    google_token: str, request: Request, db: Session = Depends(get_db)
) -> TokenResponse:

    try:
        # Verify Google token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.googleapis.com/oauth2/v3/tokeninfo",
                params={"id_token": google_token},
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token"
            )

        token_info = response.json()

        # Check if Google ID is correct
        if token_info.get("aud") != settings.GOOGLE_CLIENT_ID and not settings.DEBUG:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token audience",
            )

        google_id = token_info.get("sub")
        email = token_info.get("email")
        first_name = token_info.get("given_name", "")
        last_name = token_info.get("family_name", "")

        # Check if user exists
        user = UserCRUD.get_user_by_google_id(db, google_id)

        if not user:
            # Create new user
            oauth_user = UserOAuth2(
                google_id=google_id,
                email=email,
                first_name=first_name,
                last_name=last_name,
            )
            user = UserCRUD.create_oauth_user(db, oauth_user)
            MemberCRUD.create_member(db, user.id)

        # Check if account is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
            )

        # Generate tokens
        access_token = AuthService.create_access_token(
            user_id=user.id, email=user.email, user_role=user.user_role
        )
        refresh_token = AuthService.create_refresh_token(user.id, user.email)

        # Create session
        expires_at = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        SessionCRUD.create_session(
            db=db,
            user_id=user.id,
            token=access_token,
            expires_at=expires_at,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    except httpx.HTTPError as e:
        logger.error(f"Google token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed",
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> UserResponse:

    return UserResponse.from_orm(current_user)


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:

    SessionCRUD.invalidate_user_sessions(db, current_user.id)
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str, db: Session = Depends(get_db)
) -> TokenResponse:

    try:
        payload = AuthService.verify_token(refresh_token)

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
            )

        user_id = int(payload.get("sub"))
        user = UserCRUD.get_user_by_id(db, user_id)

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
            )

        # Generate new access token
        access_token = AuthService.create_access_token(
            user_id=user.id, email=user.email, user_role=user.user_role
        )

        return TokenResponse(
            access_token=access_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token refresh failed"
        )
