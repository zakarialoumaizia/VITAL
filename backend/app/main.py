import logging
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1 import api
from backend.app.core.firebase import FirebaseService

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(title="VITAL API")


# Initialize Firebase on startup
@app.on_event("startup")
async def startup_event():
    """Initialize Firebase Admin SDK on application startup."""
    try:
        FirebaseService.initialize()
        logger.info("Firebase initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        raise


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# app.include_router(api.router, prefix="/api/v1")
