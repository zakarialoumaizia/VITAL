import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from nacl.public import PrivateKey, PublicKey, Box
from nacl.encoding import RawEncoder

class EncryptionService:
    @staticmethod
    def generate_data_key() -> bytes:
        
        return os.urandom(32)

    @staticmethod
    def encrypt_data(plaintext: bytes, data_key: bytes) -> tuple[bytes, bytes]:
        
        aesgcm = AESGCM(data_key)
        nonce = os.urandom(12)  # 96-bit nonce for GCM
        ciphertext = aesgcm.encrypt(nonce, plaintext, None)
        return ciphertext, nonce

    @staticmethod
    def decrypt_data(ciphertext: bytes, data_key: bytes, nonce: bytes) -> bytes:
        
        aesgcm = AESGCM(data_key)
        return aesgcm.decrypt(nonce, ciphertext, None)

    @staticmethod
    def wrap_key(data_key: bytes, recipient_public_key_bytes: bytes) -> tuple[bytes, bytes]:
        
        # Recipient's public key
        recipient_public_key = PublicKey(recipient_public_key_bytes)
        
        # Generate ephemeral key pair for this encryption (Perfect Forward Secrecy)
        ephemeral_private_key = PrivateKey.generate()
        ephemeral_public_key = ephemeral_private_key.public_key
        
        # Create a Box for asymmetric encryption
        box = Box(ephemeral_private_key, recipient_public_key)
        
        # Encrypt the data key
        # Box returns nonce + ciphertext by default in nacl
        encrypted_data_key = box.encrypt(data_key)
        
        return encrypted_data_key, ephemeral_public_key.encode(RawEncoder)

    @staticmethod
    def unwrap_key(encrypted_data_key: bytes, ephemeral_public_key_bytes: bytes, recipient_private_key_bytes: bytes) -> bytes:
        
        recipient_private_key = PrivateKey(recipient_private_key_bytes)
        ephemeral_public_key = PublicKey(ephemeral_public_key_bytes)
        
        box = Box(recipient_private_key, ephemeral_public_key)
        
        return box.decrypt(encrypted_data_key)

class KMSSimulator:
    
    def __init__(self):
        # In a real app, these would be loaded from a secure vault or HSM
        self._master_private_key = PrivateKey.generate()
        self.master_public_key = self._master_private_key.public_key.encode(RawEncoder)

    def decrypt_key(self, encrypted_data_key: bytes, ephemeral_public_key: bytes) -> bytes:
        
        return EncryptionService.unwrap_key(
            encrypted_data_key,
            ephemeral_public_key,
            self._master_private_key.encode(RawEncoder)
        )

# Global KMS instance (singleton for mock purposes)
kms = KMSSimulator()
encryption_service = EncryptionService()
