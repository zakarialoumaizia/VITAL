from fastapi import APIRouter

from app.api.v1.endpoints import auth, admin, vault, member, sponsor

router = APIRouter()

# Include endpoints
router.include_router(auth.router, prefix="/api/v1")
router.include_router(admin.router, prefix="/api/v1")
router.include_router(vault.router, prefix="/api/v1")
router.include_router(member.router, prefix="/api/v1")
router.include_router(sponsor.router, prefix="/api/v1")
