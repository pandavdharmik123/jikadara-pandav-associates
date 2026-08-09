import os
import time
import uuid
import tempfile
import logging
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pipeline.docling_parser import process_pdf_full_pipeline, parse_with_docling_native
from pipeline.formatter import build_full_output

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ocr-service")

app = FastAPI(
    title="Document AI & Multilingual OCR Microservice",
    version="1.0.0",
    description="Stateless OCR microservice using PyMuPDF, PaddleOCR, OpenCV, pdf2image, and Docling"
)

# Enable CORS for internal cross-service calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "python-ocr-microservice",
        "timestamp": time.time()
    }

@app.post("/api/v1/ocr/process")
async def process_document(
    file: UploadFile = File(...),
    preferred_lang: str = Form("en")
):
    """
    Processes an uploaded PDF file and returns structured JSON, HTML, and Markdown.
    Ensures absolute cleanup of temporary files in try...finally block.
    """
    start_time = time.time()
    file_name = file.filename or "uploaded_document.pdf"
    
    # Validation 1: Check File Extension
    if not file_name.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF files are supported."
        )
        
    # Generate unique temporary file path
    temp_dir = tempfile.gettempdir()
    temp_file_id = f"ocr_file_{uuid.uuid4().hex}.pdf"
    temp_file_path = os.path.join(temp_dir, temp_file_id)
    
    try:
        logger.info(f"Receiving file: {file_name} -> Saving temp: {temp_file_path}")
        
        # Read and validate Magic Bytes (%PDF-)
        file_bytes = await file.read()
        if len(file_bytes) < 4 or not file_bytes.startswith(b"%PDF"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PDF content. Header magic bytes %PDF- check failed."
            )
            
        with open(temp_file_path, "wb") as f:
            f.write(file_bytes)
            
        # Execute hybrid Document AI pipeline
        logger.info(f"Processing PDF pipeline for '{file_name}'...")
        doc_structure = process_pdf_full_pipeline(temp_file_path, preferred_lang=preferred_lang)
        
        # Format final payload
        formatted_result = build_full_output(temp_file_path, doc_structure, file_name=file_name)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        response_payload = {
            "success": True,
            "documentId": str(uuid.uuid4()),
            "fileName": file_name,
            "totalPages": doc_structure["totalPages"],
            "overallConfidence": doc_structure["overallConfidence"],
            "processingTimeMs": processing_time_ms,
            "summary": doc_structure["summary"],
            "output": formatted_result["output"]
        }
        
        logger.info(f"Completed processing '{file_name}' in {processing_time_ms}ms with confidence {doc_structure['overallConfidence']}")
        return response_payload

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logger.error(f"Failed processing document '{file_name}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR & Document AI processing failure: {str(e)}"
        )
    finally:
        # Delete temporary file immediately after processing
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.info(f"Successfully deleted temporary file: {temp_file_path}")
            except Exception as cleanup_err:
                logger.error(f"Failed to delete temporary file {temp_file_path}: {cleanup_err}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
