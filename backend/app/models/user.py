

from datetime import datetime
from enum import Enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
    Date,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class UserRole(str, Enum):
    

    ADMIN = "admin"
    MEMBER = "member"
    PARTNER = "partner"
    SPONSOR = "sponsor"


class User(Base):
    

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth2 users
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    user_role = Column(String(20), default=UserRole.MEMBER.value, nullable=False)
    google_id = Column(String(255), unique=True, nullable=True)  # For OAuth2
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    admin = relationship("Admin", back_populates="user", uselist=False)
    member = relationship("Member", back_populates="user", uselist=False)
    partner = relationship("Partner", back_populates="user", uselist=False)
    sponsor = relationship("Sponsor", back_populates="user", uselist=False)
    fingerprints = relationship(
        "Fingerprint", back_populates="user", cascade="all, delete-orphan"
    )
    sessions = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan"
    )

    __mapper_args__ = {"polymorphic_identity": "user"}


class Admin(Base):
    

    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    bio = Column(Text, nullable=True)
    department = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="admin")


class Member(Base):
    

    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="member")


class Partner(Base):
    

    __tablename__ = "partners"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String(255), nullable=True)
    company_website = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="partner")


class Sponsor(Base):
    

    __tablename__ = "sponsors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String(255), nullable=True)
    tier = Column(String(50), default="silver")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="sponsor")


class ContactMessage(Base):
    

    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User")


class Session(Base):
    

    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(500), unique=True, nullable=False)
    device_fingerprint = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="sessions")


class Fingerprint(Base):
    

    __tablename__ = "fingerprints"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    fingerprint_hash = Column(String(255), unique=True, nullable=False, index=True)
    device_name = Column(String(255), nullable=True)
    device_type = Column(String(50), nullable=True)  # mobile, tablet, desktop, etc.
    os_name = Column(String(100), nullable=True)
    os_version = Column(String(50), nullable=True)
    browser_name = Column(String(100), nullable=True)
    browser_version = Column(String(50), nullable=True)
    last_seen = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_trusted = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="fingerprints")
class VaultDocument(Base):
    

    __tablename__ = "vault_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(100))
    file_size = Column(Integer)
    
    # Encryption Metadata
    encrypted_path = Column(String(512), nullable=False)
    encrypted_data_key = Column(Text, nullable=False) # Base64
    ephemeral_pub_key = Column(Text, nullable=False) # Base64
    nonce = Column(String(64), nullable=False) # Base64
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
