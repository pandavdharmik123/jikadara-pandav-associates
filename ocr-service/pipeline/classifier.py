import fitz  # PyMuPDF
import logging

logger = logging.getLogger(__name__)

def classify_page_type(page: fitz.Page, min_char_threshold: int = 150) -> dict:
    """
    Classifies a PDF page and checks for embedded photos/scanned images.
    
    Args:
        page: PyMuPDF Page object.
        min_char_threshold: Minimum selectable text characters to consider purely digital.
        
    Returns:
        dict with pageType ('digital' or 'scanned'), has_images (bool), characterCount (int), rawText (str).
    """
    try:
        text = page.get_text("text").strip()
        clean_text = "".join(text.split())
        image_list = page.get_images()
        has_images = len(image_list) > 0
        
        # Determine if page should undergo OCR vision scan
        # If embedded image exists (e.g. CamScanner photo inside PDF), we MUST run OCR!
        if len(clean_text) >= min_char_threshold and not has_images:
            logger.info(f"Page {page.number + 1}: Pure DIGITAL ({len(clean_text)} chars, 0 images)")
            page_type = "digital"
        else:
            logger.info(f"Page {page.number + 1}: Requires OCR Vision (Chars: {len(clean_text)}, Images: {len(image_list)})")
            page_type = "scanned" if len(clean_text) < min_char_threshold else "hybrid"
            
        return {
            "pageType": page_type,
            "hasImages": has_images,
            "characterCount": len(clean_text),
            "rawText": text,
            "shouldRunOcr": has_images or page_type in ("scanned", "hybrid") or len(clean_text) < min_char_threshold
        }
    except Exception as e:
        logger.error(f"Error classifying page {page.number + 1}: {e}")
        return {
            "pageType": "scanned",
            "hasImages": True,
            "characterCount": 0,
            "rawText": "",
            "shouldRunOcr": True
        }
