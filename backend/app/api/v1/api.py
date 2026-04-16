from fastapi import APIRouter

from app.api.v1.endpoints import auth

router = APIRouter()

# Include authentication endpoints
router.include_router(auth.router, prefix="/api/v1")
