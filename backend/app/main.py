from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers.scanner_controller import router as scanner_router

# Initialize FastAPI App
app = FastAPI(
    title="Computer Vision Document Scanner API",
    description="A modular backend processing document scans using OpenCV and NumPy.",
    version="1.0.0"
)

# Configure CORS Middleware
# Essential to allow React Native mobile apps or web clients to make API calls without being blocked
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any client origin (mobile emulator, phone, web)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Mount Routers
app.include_router(scanner_router)

@app.get("/", tags=["Health Check"])
def health_check():
    return {
        "status": "online",
        "service": "Document Scanner API",
        "docs_url": "/docs"
    }