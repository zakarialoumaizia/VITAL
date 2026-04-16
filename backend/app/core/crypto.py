import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from app.core.config import settings

class CryptoEngine:
    
    
    @staticmethod
    def generate_data_key():
        
        return AESGCM.generate_key(bit_length=256)

    @staticmethod
    def encrypt_file(file_content: bytes, data_key: bytes):
        
        aesgcm = AESGCM(data_key)
        nonce = os.urandom(12)
        # AESGCM.encrypt combines ciphertext and tag in the output
        encrypted_data = aesgcm.encrypt(nonce, file_content, None)
        return nonce, encrypted_data

    @staticmethod
    def decrypt_file(encrypted_data: bytes, nonce: bytes, data_key: bytes):
        
        aesgcm = AESGCM(data_key)
        return aesgcm.decrypt(nonce, encrypted_data, None)

    @staticmethod
    def encrypt_data_key_with_ecc(data_key: bytes, public_key_pem: str):
        
        public_key = serialization.load_pem_public_key(public_key_pem.encode())
        
        # In ECC we use ECIES (Elliptic Curve Integrated Encryption Scheme)
        # For simplicity in this demo, we'll use a derived shared secret or 
        # encapsulate the key. 
        # Here we use a basic version for the envelope:
        shared_key = ec.generate_private_key(ec.SECP256R1())
        shared_secret = shared_key.exchange(ec.ECDH(), public_key)
        
        derived_key = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=b"envelope-encryption",
        ).derive(shared_secret)
        
        # Encrypt the actual data key with the derived key
        nonce = os.urandom(12)
        aesgcm = AESGCM(derived_key)
        enc_data_key = aesgcm.encrypt(nonce, data_key, None)
        
        return {
            "enc_data_key": base64.b64encode(enc_data_key).decode(),
            "ephemeral_pub": shared_key.public_key().public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode(),
            "nonce": base64.b64encode(nonce).decode()
        }
