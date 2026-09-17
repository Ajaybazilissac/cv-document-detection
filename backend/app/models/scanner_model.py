from pydantic import BaseModel
from typing import List, Optional

class ImageProperties(BaseModel):
    height: int
    width: int
    channels: int
    data_type: str
    min_intensity: int
    max_intensity: int

class HistogramData(BaseModel):
    bins: List[int]
    frequencies: List[int]

class ScanResponse(BaseModel):
    success: bool
    message: str
    properties: ImageProperties
    histogram: HistogramData
    original_image: str
    grayscale_image: str
    edges_image: str
    bounding_box_image: str
    cropped_document: str
    final_scanned_image: str
    extracted_text: Optional[str] = ""  # Contains OCR character recognition output

class Base64ScanRequest(BaseModel):
    image_base64: str