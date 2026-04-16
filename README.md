# VITAL - Complete Authentication API

A production-ready authentication and authorization API built with FastAPI, featuring JWT tokens, Google OAuth2, role-based access control, and device fingerprinting.

## Features

✅ **User Authentication**
- Email/password registration and login
- Google OAuth2 integration
- JWT access and refresh tokens
- Secure password hashing (bcrypt)

✅ **User Management**
- Three role types: Admin, Member, Partner
- Phone fingerprint tracking for device identification
- User session management and tracking
- Account activation/deactivation

✅ **Authorization**
- Role-based access control (RBAC)
- Protected endpoints with token validation
- Admin-only endpoints
- Optional authentication for public endpoints

✅ **Database**
- SQLAlchemy ORM with full type hints
- SQLite for development, PostgreSQL for production
- Automatic table creation
- Proper relationships between user roles

✅ **Security**
- Password hashing with bcrypt
- JWT token management with expiration
- HTTPS-ready
- CORS configured
- Token invalidation on logout

✅ **Additional Features**
- Device fingerprinting and tracking
- Comprehensive API documentation (Swagger/ReDoc)
- Session tracking with IP and user agent
- Email verification ready

## Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirments.txt
```

### 2. Setup Database (Supabase PostgreSQL)
```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your Supabase password:
# DATABASE_URL=postgresql+psycopg2://postgres.vminkxvmxnhgcooegwue:YOUR_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
```

### 3. Apply Database Migrations (Alembic)
```bash
# Activate virtual environment
source venv/bin/activate

# Apply all migrations to create database schema
alembic upgrade head
```

**📖 See [ALEMBIC_SETUP.md](ALEMBIC_SETUP.md) for migration details**

### 4. Run Server
```bash
python -m uvicorn app.main:app --reload --port 8000
```

### 5. Access API
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Database**: Supabase PostgreSQL (aws-0-eu-west-1)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/google` | Login with Google OAuth2 |
| GET | `/api/v1/auth/me` | Get current user info |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout and invalidate sessions |

## Database Schema

### Users Table
- `id`, `email` (unique), `password_hash`
- `first_name`, `last_name`, `date_of_birth`
- `phone_fingerprint` (unique, device tracking)
- `user_role` (admin, member, partner)
- `google_id` (for OAuth2)
- `is_active`, `is_verified`
- Timestamps

### Role-Specific Tables
- **admins**: Bio, department
- **members**: Bio, subscription plan
- **partners**: Company info, website
- **sessions**: Token tracking, device fingerprint, IP, user agent

## Authentication Flow

```
User Registration/Login
       ↓
Validate Credentials
       ↓
Generate JWT Tokens
       ↓
Create Session Record
       ↓
Return Access & Refresh Tokens
       ↓
Client uses token in Authorization header
       ↓
Server validates token on each request
```

## Protected Endpoints Example

```python
from fastapi import Depends
from backend.app.api.deps import get_current_user, get_current_admin
from backend.app.models.user import User

@router.get("/user/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email}

@router.get("/admin/users")
async def list_users(current_admin: User = Depends(get_current_admin)):
    return {"users": [...]}
```

## User Roles

### Admin
- Full system access
- Can manage users and roles
- Access to admin-only endpoints

### Member
- Personal profile access
- Member-tier features
- Default role for new users

### Partner
- Partner profile management
- Company information
- Partner-specific features

## Environment Variables

```env
# Database
DATABASE_URL=sqlite:///./vital.db

# JWT
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth2 (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# Email (optional)
MAIL_FROM=noreply@example.com

# Application
DEBUG=True
```

## Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/test_auth.py -v

# Run with coverage
pytest --cov=backend tests/
```

## Documentation

- **[Quick Start Guide](QUICKSTART.md)**: Step-by-step setup and testing
- **[Auth API Documentation](AUTH_API_DOCUMENTATION.md)**: Complete API reference
- **[Alembic Database Migrations](ALEMBIC_SETUP.md)**: Database schema management
- **[Full Alembic Guide](ALEMBIC_GUIDE.md)**: Detailed migration documentation

## Tech Stack

- **Framework**: FastAPI
- **Database**: SQLAlchemy ORM (SQLite/PostgreSQL)
- **Migrations**: Alembic (database version control)
- **Authentication**: JWT (python-jose)
- **Password Security**: Passlib + bcrypt
- **Validation**: Pydantic
- **HTTP Client**: httpx (for OAuth2)

## Project Structure

```
backend/
├── alembic.ini                      # Alembic configuration
├── migrations/                      # Database migrations
│   ├── env.py                       # Alembic runtime
│   └── versions/                    # Migration files
│       └── 001_initial.py           # Initial schema
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   └── auth.py          # Auth endpoints
│   │   │   └── api.py               # API router
│   │   └── deps.py                  # Dependency injection
│   ├── core/
│   │   ├── config.py                # Settings
│   │   ├── security.py              # JWT & hashing
│   │   └── database_config.py       # Database configuration
│   ├── crud/
│   │   └── user.py                  # Database operations
│   ├── db/
│   │   ├── base.py                  # ORM base
│   │   └── session.py               # DB session
│   ├── models/
│   │   └── user.py                  # SQLAlchemy models
│   ├── schemas/
│   │   └── user.py                  # Pydantic schemas
│   └── main.py                      # FastAPI app
├── .env.example
├── alembic.ini
├── db-migrate.sh                    # Migration helper script
└── requirments.txt
```

## Example Usage

### Register
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe",
    "phone_fingerprint": "device-abc123",
    "user_role": "member"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Get Profile
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer {access_token}"
```

## Security Features

- ✓ Bcrypt password hashing
- ✓ JWT token expiration
- ✓ Token refresh mechanism
- ✓ Session invalidation
- ✓ CORS configuration
- ✓ Phone fingerprint tracking
- ✓ IP address logging
- ✓ User agent tracking
- ✓ Account activation control

## Production Deployment

1. Change `SECRET_KEY` to strong random value
2. Set `DEBUG=False`
3. Use PostgreSQL database
4. Enable HTTPS
5. Configure proper CORS
6. Set up Google OAuth2 production credentials
7. Implement rate limiting
8. Add monitoring and logging
9. Regular security audits

## Future Enhancements

- [ ] Two-factor authentication (2FA)
- [ ] Email verification
- [ ] Password reset via email
- [ ] Social logins (GitHub, Facebook)
- [ ] API key authentication
- [ ] Rate limiting per endpoint
- [ ] IP whitelist/blacklist
- [ ] Audit logging
- [ ] Session geo-blocking

## License

MIT

## Support

For issues and questions:
- Check [QUICKSTART.md](QUICKSTART.md) for setup help
- See [AUTH_API_DOCUMENTATION.md](AUTH_API_DOCUMENTATION.md) for API details
- Review code comments for implementation details

---

**Built with ❤️ using FastAPI**
