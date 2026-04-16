import os
import uuid
import base64
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User, VaultDocument
from app.schemas.user import VaultDocumentResponse
from app.services.encryption import encryption_service, kms

router = APIRouter(prefix="/vault", tags=["vault"])

STORAGE_DIR = "storage/vault"

@router.post("/upload", response_model=VaultDocumentResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    file_content = await file.read()
    
    # 1. Generate a unique Data Key for this file
    data_key = encryption_service.generate_data_key()
    
    # 2. Encrypt the file content with AES-GCM
    ciphertext, nonce = encryption_service.encrypt_data(file_content, data_key)
    
    # 3. Wrap the Data Key with KMS (ECC)
    # Using the KMS simulator's master public key
    encrypted_data_key, ephemeral_pub_key = encryption_service.wrap_key(
        data_key, kms.master_public_key
    )
    
    # 4. Save the encrypted file to storage
    file_id = str(uuid.uuid4())
    file_path = os.path.join(STORAGE_DIR, f"{file_id}.enc")
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, "wb") as f:
        f.write(ciphertext)
    
    # 5. Store metadata and encrypted keys in DB
    db_file = VaultDocument(
        user_id=current_user.id,
        filename=file.filename,
        file_type=file.content_type,
        file_size=len(file_content),
        encrypted_path=file_path,
        encrypted_data_key=base64.b64encode(encrypted_data_key).decode('utf-8'),
        ephemeral_pub_key=base64.b64encode(ephemeral_pub_key).decode('utf-8'),
        nonce=base64.b64encode(nonce).decode('utf-8')
    )
    
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    
    return db_file

@router.get("/files", response_model=List[VaultDocumentResponse])
async def list_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    return db.query(VaultDocument).filter(VaultDocument.user_id == current_user.id).all()

@router.get("/download/{file_id}")
async def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    db_file = db.query(VaultDocument).filter(
        VaultDocument.id == file_id, 
        VaultDocument.user_id == current_user.id
    ).first()
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if not os.path.exists(db_file.encrypted_path):
        raise HTTPException(status_code=404, detail="Encrypted file missing from storage")
    
    # 1. Read encrypted file
    with open(db_file.encrypted_path, "rb") as f:
        ciphertext = f.read()
    
    # 2. Extract and decode encryption metadata
    encrypted_data_key = base64.b64decode(db_file.encrypted_data_key)
    ephemeral_pub_key = base64.b64decode(db_file.ephemeral_pub_key)
    nonce = base64.b64decode(db_file.nonce)
    
    # 3. Unwrap Data Key via KMS
    try:
        data_key = kms.decrypt_key(encrypted_data_key, ephemeral_pub_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Key unwrapping failed")
    
    # 4. Decrypt file content
    try:
        plaintext = encryption_service.decrypt_data(ciphertext, data_key, nonce)
    except Exception as e:
        raise HTTPException(status_code=500, detail="File decryption failed")
    
    # 5. Return as streaming response
    return StreamingResponse(
        io.BytesIO(plaintext),
        media_type=db_file.file_type or "application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={db_file.filename}"}
    )

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    db_file = db.query(VaultDocument).filter(
        VaultDocument.id == file_id, 
        VaultDocument.user_id == current_user.id
    ).first()
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete from storage
    if os.path.exists(db_file.encrypted_path):
        os.remove(db_file.encrypted_path)
    
    # Delete from DB
    db.delete(db_file)
    db.commit()
    
    return None
