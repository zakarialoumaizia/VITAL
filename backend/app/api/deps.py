

from typing import Optional, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import AuthService
from app.crud.user import UserCRUD
from app.models.user import User

security = HTTPBearer()


def get_current_user(
    credentials: Any = Depends(security), db: Session = Depends(get_db)
) -> User:
    
    token = credentials.credentials

    try:
        payload = AuthService.verify_token(token)
        user_id: int = int(payload.get("sub"))
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = UserCRUD.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    
    if current_user.user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this resource",
        )
    return current_user


def get_current_user_optional(
    credentials: Optional[Any] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    
    if not credentials:
        return None

    try:
        current_user = get_current_user(credentials, db)
        return current_user
    except HTTPException:
        return None
