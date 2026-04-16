"""CRUD operations for users."""

from typing import Optional
from sqlalchemy.orm import Session

from app.models.user import (
    User,
    Admin,
    Member,
    Partner,
    Session as SessionModel,
    Fingerprint,
    UserRole,
)
from app.schemas.user import UserRegister, UserOAuth2
from app.core.security import AuthService


class UserCRUD:
    """CRUD operations for User model."""

    @staticmethod
    def create_user(db: Session, user: UserRegister) -> User:
        """
        Create a new user with email and password.

        Args:
            db: Database session
            user: User registration data

        Returns:
            User: Created user record
        """
        hashed_password = AuthService.hash_password(user.password)
        db_user = User(
            email=user.email,
            password_hash=hashed_password,
            first_name=user.first_name,
            last_name=user.last_name,
            date_of_birth=user.date_of_birth,
            user_role=user.user_role.lower(),
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        # Add fingerprint if provided
        if user.fingerprint_hash:
            FingerprintCRUD.create_fingerprint(
                db,
                user_id=db_user.id,
                fingerprint_hash=user.fingerprint_hash,
            )

        return db_user

    @staticmethod
    def create_oauth_user(db: Session, user: UserOAuth2) -> User:
        """
        Create a new user via OAuth2.

        Args:
            db: Database session
            user: User OAuth2 data

        Returns:
            User: Created user record
        """
        db_user = User(
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            google_id=user.google_id,
            user_role=UserRole.MEMBER.value,
            is_verified=True,  # OAuth2 users are pre-verified
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """
        Get user by ID.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            User: User record or None
        """
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """
        Get user by email.

        Args:
            db: Database session
            email: User email

        Returns:
            User: User record or None
        """
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_user_by_google_id(db: Session, google_id: str) -> Optional[User]:
        """
        Get user by Google ID.

        Args:
            db: Database session
            google_id: Google ID

        Returns:
            User: User record or None
        """
        return db.query(User).filter(User.google_id == google_id).first()

    @staticmethod
    def update_user(db: Session, user_id: int, **kwargs) -> Optional[User]:
        """
        Update user fields.

        Args:
            db: Database session
            user_id: User ID
            **kwargs: Fields to update

        Returns:
            User: Updated user record
        """
        db.query(User).filter(User.id == user_id).update(kwargs)
        db.commit()
        return UserCRUD.get_user_by_id(db, user_id)

    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """
        Delete a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            bool: True if deletion was successful
        """
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            db.delete(user)
            db.commit()
            return True
        return False


class AdminCRUD:
    """CRUD operations for Admin model."""

    @staticmethod
    def create_admin(
        db: Session, user_id: int, bio: str = None, department: str = None
    ) -> Admin:
        """
        Create admin profile for a user.

        Args:
            db: Database session
            user_id: User ID
            bio: Admin bio
            department: Admin department

        Returns:
            Admin: Created admin record
        """
        db_admin = Admin(user_id=user_id, bio=bio, department=department)
        db.add(db_admin)
        db.commit()
        db.refresh(db_admin)
        return db_admin

    @staticmethod
    def get_admin_by_user_id(db: Session, user_id: int) -> Optional[Admin]:
        """
        Get admin profile by user ID.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Admin: Admin record or None
        """
        return db.query(Admin).filter(Admin.user_id == user_id).first()


class MemberCRUD:
    """CRUD operations for Member model."""

    @staticmethod
    def create_member(db: Session, user_id: int, bio: str = None) -> Member:
        """
        Create member profile for a user.

        Args:
            db: Database session
            user_id: User ID
            bio: Member bio

        Returns:
            Member: Created member record
        """
        db_member = Member(user_id=user_id, bio=bio)
        db.add(db_member)
        db.commit()
        db.refresh(db_member)
        return db_member

    @staticmethod
    def get_member_by_user_id(db: Session, user_id: int) -> Optional[Member]:
        """
        Get member profile by user ID.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Member: Member record or None
        """
        return db.query(Member).filter(Member.user_id == user_id).first()


class PartnerCRUD:
    """CRUD operations for Partner model."""

    @staticmethod
    def create_partner(
        db: Session,
        user_id: int,
        company_name: str = None,
        company_website: str = None,
        bio: str = None,
    ) -> Partner:
        """
        Create partner profile for a user.

        Args:
            db: Database session
            user_id: User ID
            company_name: Company name
            company_website: Company website
            bio: Partner bio

        Returns:
            Partner: Created partner record
        """
        db_partner = Partner(
            user_id=user_id,
            company_name=company_name,
            company_website=company_website,
            bio=bio,
        )
        db.add(db_partner)
        db.commit()
        db.refresh(db_partner)
        return db_partner

    @staticmethod
    def get_partner_by_user_id(db: Session, user_id: int) -> Optional[Partner]:
        """
        Get partner profile by user ID.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Partner: Partner record or None
        """
        return db.query(Partner).filter(Partner.user_id == user_id).first()


class SessionCRUD:
    """CRUD operations for Session model."""

    @staticmethod
    def create_session(
        db: Session,
        user_id: int,
        token: str,
        expires_at,
        device_fingerprint: str = None,
        ip_address: str = None,
        user_agent: str = None,
    ) -> SessionModel:
        """
        Create a user session.

        Args:
            db: Database session
            user_id: User ID
            token: JWT token
            expires_at: Token expiration datetime
            device_fingerprint: Device fingerprint
            ip_address: IP address
            user_agent: User agent string

        Returns:
            Session: Created session record
        """
        db_session = SessionModel(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
            device_fingerprint=device_fingerprint,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session

    @staticmethod
    def get_session_by_token(db: Session, token: str) -> Optional[SessionModel]:
        """
        Get session by token.

        Args:
            db: Database session
            token: JWT token

        Returns:
            Session: Session record or None
        """
        return db.query(SessionModel).filter(SessionModel.token == token).first()

    @staticmethod
    def get_active_sessions(db: Session, user_id: int):
        """
        Get all active sessions for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            list: Active sessions
        """
        return (
            db.query(SessionModel)
            .filter(SessionModel.user_id == user_id, SessionModel.is_active == True)
            .all()
        )

    @staticmethod
    def invalidate_session(db: Session, token: str) -> bool:
        """
        Invalidate a session.

        Args:
            db: Database session
            token: JWT token

        Returns:
            bool: True if invalidation was successful
        """
        session = SessionCRUD.get_session_by_token(db, token)
        if session:
            session.is_active = False
            db.commit()
            return True
        return False

    @staticmethod
    def invalidate_user_sessions(db: Session, user_id: int) -> int:
        """
        Invalidate all user sessions.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            int: Number of sessions invalidated
        """
        sessions = (
            db.query(SessionModel)
            .filter(SessionModel.user_id == user_id, SessionModel.is_active == True)
            .all()
        )

        count = 0
        for session in sessions:
            session.is_active = False
            count += 1

        db.commit()
        return count


class FingerprintCRUD:
    """CRUD operations for Fingerprint model."""

    @staticmethod
    def create_fingerprint(
        db: Session,
        user_id: int,
        fingerprint_hash: str,
        device_name: str = None,
        device_type: str = None,
        os_name: str = None,
        os_version: str = None,
        browser_name: str = None,
        browser_version: str = None,
        is_trusted: bool = False,
    ) -> Fingerprint:
        """
        Create a new device fingerprint.

        Args:
            db: Database session
            user_id: User ID
            fingerprint_hash: Unique fingerprint hash
            device_name: Device name/model
            device_type: Device type (mobile, tablet, desktop, etc.)
            os_name: Operating system name
            os_version: Operating system version
            browser_name: Browser name
            browser_version: Browser version
            is_trusted: Whether device is trusted

        Returns:
            Fingerprint: Created fingerprint record
        """
        db_fingerprint = Fingerprint(
            user_id=user_id,
            fingerprint_hash=fingerprint_hash,
            device_name=device_name,
            device_type=device_type,
            os_name=os_name,
            os_version=os_version,
            browser_name=browser_name,
            browser_version=browser_version,
            is_trusted=is_trusted,
        )
        db.add(db_fingerprint)
        db.commit()
        db.refresh(db_fingerprint)
        return db_fingerprint

    @staticmethod
    def get_fingerprint_by_hash(
        db: Session, fingerprint_hash: str
    ) -> Optional[Fingerprint]:
        """
        Get fingerprint by hash.

        Args:
            db: Database session
            fingerprint_hash: Fingerprint hash

        Returns:
            Fingerprint: Fingerprint record or None
        """
        return (
            db.query(Fingerprint)
            .filter(Fingerprint.fingerprint_hash == fingerprint_hash)
            .first()
        )

    @staticmethod
    def get_fingerprint_by_id(
        db: Session, fingerprint_id: int
    ) -> Optional[Fingerprint]:
        """
        Get fingerprint by ID.

        Args:
            db: Database session
            fingerprint_id: Fingerprint ID

        Returns:
            Fingerprint: Fingerprint record or None
        """
        return db.query(Fingerprint).filter(Fingerprint.id == fingerprint_id).first()

    @staticmethod
    def get_user_fingerprints(db: Session, user_id: int) -> list:
        """
        Get all fingerprints for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            list: User's fingerprint records
        """
        return db.query(Fingerprint).filter(Fingerprint.user_id == user_id).all()

    @staticmethod
    def get_trusted_fingerprints(db: Session, user_id: int) -> list:
        """
        Get all trusted fingerprints for a user.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            list: User's trusted fingerprints
        """
        return (
            db.query(Fingerprint)
            .filter(Fingerprint.user_id == user_id, Fingerprint.is_trusted == True)
            .all()
        )

    @staticmethod
    def mark_trusted(db: Session, fingerprint_id: int) -> Optional[Fingerprint]:
        """
        Mark a fingerprint as trusted.

        Args:
            db: Database session
            fingerprint_id: Fingerprint ID

        Returns:
            Fingerprint: Updated fingerprint record
        """
        fingerprint = (
            db.query(Fingerprint).filter(Fingerprint.id == fingerprint_id).first()
        )
        if fingerprint:
            fingerprint.is_trusted = True
            db.commit()
            db.refresh(fingerprint)
        return fingerprint

    @staticmethod
    def update_last_seen(db: Session, fingerprint_id: int) -> Optional[Fingerprint]:
        """
        Update fingerprint's last_seen timestamp.

        Args:
            db: Database session
            fingerprint_id: Fingerprint ID

        Returns:
            Fingerprint: Updated fingerprint record
        """
        from datetime import datetime

        fingerprint = (
            db.query(Fingerprint).filter(Fingerprint.id == fingerprint_id).first()
        )
        if fingerprint:
            fingerprint.last_seen = datetime.utcnow()
            db.commit()
            db.refresh(fingerprint)
        return fingerprint

    @staticmethod
    def delete_fingerprint(db: Session, fingerprint_id: int) -> bool:
        """
        Delete a fingerprint.

        Args:
            db: Database session
            fingerprint_id: Fingerprint ID

        Returns:
            bool: True if deletion was successful
        """
        fingerprint = (
            db.query(Fingerprint).filter(Fingerprint.id == fingerprint_id).first()
        )
        if fingerprint:
            db.delete(fingerprint)
            db.commit()
            return True
        return False
