

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.user import FingerprintCreate, FingerprintResponse
from app.crud.user import FingerprintCRUD
from app.models.user import User, Fingerprint
from app.api.deps import get_current_user
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/fingerprint", tags=["fingerprint"])


@router.get("/devices", response_model=List[FingerprintResponse])
async def get_user_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    
    fingerprints = FingerprintCRUD.get_user_fingerprints(db, current_user.id)
    return fingerprints if fingerprints else []


@router.get("/devices/trusted", response_model=List[FingerprintResponse])
async def get_trusted_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    
    fingerprints = FingerprintCRUD.get_trusted_fingerprints(db, current_user.id)
    return fingerprints if fingerprints else []


@router.post("/devices")
async def register_device(
    fingerprint_data: FingerprintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    
    # Check if fingerprint already exists
    existing = FingerprintCRUD.get_fingerprint_by_hash(
        db, fingerprint_data.fingerprint_hash
    )

    if existing:
        # If same user, update last_seen
        if existing.user_id == current_user.id:
            FingerprintCRUD.update_last_seen(db, existing.id)
            return {"message": "Device updated", "is_new": False}
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This device is already registered to another user",
            )

    # Create new fingerprint
    fingerprint = FingerprintCRUD.create_fingerprint(
        db=db,
        user_id=current_user.id,
        fingerprint_hash=fingerprint_data.fingerprint_hash,
        device_name=fingerprint_data.device_name,
        device_type=fingerprint_data.device_type,
        os_name=fingerprint_data.os_name,
        os_version=fingerprint_data.os_version,
        browser_name=fingerprint_data.browser_name,
        browser_version=fingerprint_data.browser_version,
        is_trusted=fingerprint_data.is_trusted or False,
    )

    return {
        "message": "Device registered successfully",
        "is_new": True,
        "fingerprint": fingerprint,
    }


@router.put("/devices/{device_id}/trust")
async def mark_device_trusted(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    
    # Verify ownership
    device = db.query(Fingerprint).filter_by(id=int(device_id)).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )

    if device.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot trust device owned by another user",
        )

    FingerprintCRUD.mark_trusted(db, device_id)

    return {
        "message": "Device marked as trusted",
        "device_id": device_id,
        "is_trusted": True,
    }


@router.delete("/devices/{device_id}")
async def delete_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    
    # Verify ownership
    device = db.query(Fingerprint).filter_by(id=int(device_id)).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )

    if device.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete device owned by another user",
        )

    try:
        success = FingerprintCRUD.delete_fingerprint(db, device_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete device",
            )

        return {"message": "Device deleted successfully", "device_id": device_id}
    except Exception as e:
        logger.error(f"Device deletion error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete device",
        )
