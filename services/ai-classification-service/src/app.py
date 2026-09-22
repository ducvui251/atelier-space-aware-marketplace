import os
import io
import logging
from contextlib import asynccontextmanager
from typing import Optional, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

from .classifier import classifier_instance, DEFAULT_ART_STYLES

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai-classification-service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load the model
    logger.info("Initializing AI Art Classification model...")
    try:
        classifier_instance.load_model()
    except Exception as e:
        logger.error(f"Error initializing model on startup: {e}")
    yield
    logger.info("Shutting down AI Art Classification service...")

app = FastAPI(
    title="Atelier AI Art Classification Service",
    description="Microservice for classifying artwork styles, dominant colors, and dimensions.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClassifyUrlRequest(BaseModel):
    imageUrl: Optional[str] = None
    imagePath: Optional[str] = None
    topK: Optional[int] = 3

class StyleScore(BaseModel):
    style: str
    confidence: float

class ClassificationResponse(BaseModel):
    primaryStyle: str
    topStyles: List[StyleScore]
    detectedStyles: List[str]
    dominantColors: List[str]
    orientation: str
    width: int
    height: int

@app.get("/health")
def health_check():
    return {
        "status": "ok" if classifier_instance.is_ready else "loading",
        "service": "ai-classification-service",
        "version": "v1",
        "modelReady": classifier_instance.is_ready,
        "device": classifier_instance.device
    }

@app.get("/v1/styles")
def list_styles():
    return {
        "styles": DEFAULT_ART_STYLES,
        "total": len(DEFAULT_ART_STYLES)
    }

@app.post("/v1/classify", response_model=ClassificationResponse)
async def classify_artwork(payload: ClassifyUrlRequest):
    if not payload.imageUrl and not payload.imagePath:
        raise HTTPException(status_code=400, detail="Either 'imageUrl' or 'imagePath' must be provided.")

    if not classifier_instance.is_ready:
        # Attempt on-demand load if not ready yet
        try:
            classifier_instance.load_model()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Model not ready: {str(e)}")

    source = payload.imageUrl or payload.imagePath
    try:
        image = classifier_instance.load_image_from_source(source)
    except Exception as e:
        logger.warning(f"Failed to load image from {source}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch or open image: {str(e)}")

    try:
        results = classifier_instance.classify(image, top_k=payload.topK or 3)
        return results
    except Exception as e:
        logger.error(f"Classification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

@app.post("/v1/classify-upload", response_model=ClassificationResponse)
async def classify_upload(file: UploadFile = File(...), topK: int = Form(3)):
    if not classifier_instance.is_ready:
        try:
            classifier_instance.load_model()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Model not ready: {str(e)}")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    try:
        results = classifier_instance.classify(image, top_k=topK)
        return results
    except Exception as e:
        logger.error(f"Classification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")
