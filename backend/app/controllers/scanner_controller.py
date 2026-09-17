import base64
import re
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.models.scanner_model import ScanResponse, Base64ScanRequest
from app.services.vision_service import VisionService

router = APIRouter(
    prefix="/api/v1/scanner",
    tags=["Document Scanner"]
)

@router.post("/process-base64", response_model=ScanResponse, status_code=status.HTTP_200_OK)
async def process_document_base64(payload: Base64ScanRequest):
    """
    Accepts an image directly as a base64 encoded string inside a JSON body.
    Handles data URI prefixes, whitespace, and missing padding automatically.
    """
    try:
        clean_base64 = payload.image_base64.strip()

        # 1. Remove data-uri header if present (e.g., 'data:image/jpeg;base64,')
        if "," in clean_base64:
            clean_base64 = clean_base64.split(",", 1)[1]

        # 2. Remove any whitespace or newline characters
        clean_base64 = re.sub(r"\s+", "", clean_base64)

        # 3. Fix missing base64 padding if needed
        missing_padding = len(clean_base64) % 4
        if missing_padding != 0:
            clean_base64 += "=" * (4 - missing_padding)

        # 4. Decode into raw image bytes
        image_bytes = base64.b64decode(clean_base64)

        # 5. Process through the Day 1 Computer Vision pipeline
        result = VisionService.process_document(image_bytes)
        return result

    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing base64 image: {str(err)}"
        )

@router.post("/process", response_model=ScanResponse, status_code=status.HTTP_200_OK)
async def process_document(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Please upload an image."
        )
    try:
        image_bytes = await file.read()
        result = VisionService.process_document(image_bytes)
        return result
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(err)}"
        )