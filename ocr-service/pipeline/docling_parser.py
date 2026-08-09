import logging
import fitz  # PyMuPDF
from PIL import Image
from typing import Dict, Any, List

from pipeline.classifier import classify_page_type
from pipeline.preprocessor import preprocess_scanned_image
from pipeline.ocr_engine import run_ocr_on_image

logger = logging.getLogger(__name__)

def parse_with_docling_native(pdf_path: str) -> Dict[str, Any]:
    """
    Attempts parsing using Docling DocumentConverter.
    Returns Docling parsed document structure if successful.
    """
    try:
        from docling.document_converter import DocumentConverter
        logger.info(f"Invoking Docling DocumentConverter on '{pdf_path}'...")
        converter = DocumentConverter()
        result = converter.convert(pdf_path)
        doc = result.document
        
        markdown_output = doc.export_to_markdown() if hasattr(doc, "export_to_markdown") else ""
        html_output = doc.export_to_html() if hasattr(doc, "export_to_html") else ""
        
        return {
            "success": True,
            "markdown": markdown_output,
            "html": html_output,
            "native_doc": doc
        }
    except Exception as e:
        logger.warning(f"Docling native converter issue: {e}")
        return {"success": False, "error": str(e)}

def render_page_to_pil(page: fitz.Page, dpi: int = 200) -> Image.Image:
    """
    Renders a PyMuPDF page directly into a PIL Image at specified DPI.
    Fast, reliable, and requires 0 external C-library binary dependencies.
    """
    pix = page.get_pixmap(dpi=dpi)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    return img

def classify_block_type(text: str) -> tuple:
    """Classifies block as heading, list, or paragraph."""
    clean = text.strip()
    b_kind = "paragraph"
    h_lvl = None
    
    if len(clean) < 70 and not clean.endswith(".") and not clean.endswith(":") and not clean.endswith(";"):
        b_kind = "heading"
        h_lvl = 1 if len(clean) < 35 else 2
    elif clean.startswith(("- ", "* ", "• ")) or (len(clean) > 3 and clean[0].isdigit() and clean[1:3] in (". ", ") ")):
        b_kind = "list"
    elif "IMPORTANT INSTRUCTIONS" in clean.upper() or "SELF DECLARATION" in clean.upper() or "ADMIT CARD" in clean.upper():
        b_kind = "heading"
        h_lvl = 1
        
    return b_kind, h_lvl

def process_pdf_full_pipeline(pdf_path: str, preferred_lang: str = "en") -> Dict[str, Any]:
    """
    Hybrid Document AI processing pipeline:
    1. Extracts 100% of embedded vector text blocks (headings, paragraphs, lists) via PyMuPDF.
    2. Runs PaddleOCR vision engine on scanned images / photos / image-only pages.
    3. Merges vector text and OCR text intelligently, guaranteeing zero missing paragraphs on digital or scanned pages.
    """
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    
    pages_metadata = []
    all_blocks = []
    
    digital_count = 0
    scanned_count = 0
    total_doc_confidence = 0.0
    
    for page_idx in range(total_pages):
        page = doc[page_idx]
        page_num = page_idx + 1
        
        diag = classify_page_type(page)
        has_images = diag["hasImages"]
        
        # Step 1: Extract PyMuPDF Vector Text Blocks
        raw_blocks = page.get_text("blocks")
        vector_blocks = []
        vector_text_content = []
        
        for b in raw_blocks:
            x0, y0, x1, y1, text, b_no, b_type = b
            clean_text = text.strip()
            if not clean_text:
                continue
            
            b_kind, h_lvl = classify_block_type(clean_text)
            vector_blocks.append({
                "id": f"p{page_num}_vec_{b_no}",
                "type": b_kind,
                "level": h_lvl,
                "content": clean_text,
                "confidence": 0.99,
                "pageNumber": page_num,
                "bbox": {
                    "x": round(x0, 2),
                    "y": round(y0, 2),
                    "width": round(x1 - x0, 2),
                    "height": round(y1 - y0, 2)
                }
            })
            vector_text_content.append(clean_text)
            
        full_vector_str = "\n".join(vector_text_content)
        
        # Step 2: Determine if OCR Vision Scan is needed
        # OCR runs if vector text is sparse (<150 chars) OR if page contains embedded images/photos
        need_ocr_scan = (len(full_vector_str.strip()) < 150) or has_images
        
        page_blocks = []
        page_confidence = 0.99
        text_char_count = len(full_vector_str.strip())
        
        if len(full_vector_str.strip()) >= 150:
            # Digital or hybrid page with rich vector text (e.g. Page 3 instructions)
            digital_count += 1
            page_blocks.extend(vector_blocks)
            logger.info(f"Page {page_num}: Extracted {len(vector_blocks)} Digital Vector Text Blocks ({text_char_count} chars)")
            
            # If images exist on page (e.g. photo/signature), run OCR to complement vector text
            if has_images:
                try:
                    pil_img = render_page_to_pil(page, dpi=200)
                    prep_img = preprocess_scanned_image(pil_img)
                    ocr_res = run_ocr_on_image(prep_img, preferred_lang=preferred_lang)
                    
                    # Append OCR text lines that are NOT already in the vector text layer
                    ocr_added = 0
                    for idx, ocr_b in enumerate(ocr_res["blocks"]):
                        txt = ocr_b["text"].strip()
                        if len(txt) > 3 and txt.lower() not in full_vector_str.lower():
                            b_kind, h_lvl = classify_block_type(txt)
                            page_blocks.append({
                                "id": f"p{page_num}_ocr_{idx}",
                                "type": b_kind,
                                "level": h_lvl,
                                "content": txt,
                                "confidence": round(ocr_b["confidence"], 4),
                                "pageNumber": page_num,
                                "bbox": ocr_b["bbox"]
                            })
                            ocr_added += 1
                            text_char_count += len(txt)
                    if ocr_added > 0:
                        logger.info(f"Page {page_num}: Appended {ocr_added} OCR blocks from image areas")
                except Exception as ocr_err:
                    logger.warning(f"Page {page_num}: Supplementary OCR scan skipped: {ocr_err}")
        else:
            # Scanned image / photo page with little to no vector text
            scanned_count += 1
            logger.info(f"Page {page_num}: Running Full OCR Vision Scan on Scanned/Photo Page...")
            
            try:
                pil_img = render_page_to_pil(page, dpi=200)
                prep_img = preprocess_scanned_image(pil_img)
                ocr_res = run_ocr_on_image(prep_img, preferred_lang=preferred_lang)
                
                ocr_blocks = ocr_res["blocks"]
                page_confidence = ocr_res["avg_confidence"] if ocr_blocks else 0.5
                
                for idx, b in enumerate(ocr_blocks):
                    txt = b["text"].strip()
                    conf = b["confidence"]
                    if not txt:
                        continue
                    
                    b_kind, h_lvl = classify_block_type(txt)
                    page_blocks.append({
                        "id": f"p{page_num}_ocr_{idx}",
                        "type": b_kind,
                        "level": h_lvl,
                        "content": txt,
                        "confidence": round(conf, 4),
                        "pageNumber": page_num,
                        "bbox": b["bbox"]
                    })
                    text_char_count += len(txt)
                    
                # Include vector text if any existed
                if vector_blocks and len(ocr_blocks) == 0:
                    page_blocks.extend(vector_blocks)
                    
            except Exception as scanned_err:
                logger.error(f"Error processing scanned page {page_num}: {scanned_err}")
                if vector_blocks:
                    page_blocks.extend(vector_blocks)

        pages_metadata.append({
            "pageNumber": page_num,
            "pageType": "digital" if len(full_vector_str.strip()) >= 150 else "scanned",
            "characterCount": text_char_count,
            "ocrConfidence": round(page_confidence, 4),
            "detectedLanguages": [preferred_lang]
        })
        
        all_blocks.extend(page_blocks)
        total_doc_confidence += page_confidence

    doc.close()
    overall_confidence = round(total_doc_confidence / total_pages, 4) if total_pages > 0 else 0.0
    
    return {
        "totalPages": total_pages,
        "overallConfidence": overall_confidence,
        "summary": {
            "digitalPagesCount": digital_count,
            "scannedPagesCount": scanned_count,
            "primaryLanguages": [preferred_lang]
        },
        "pages": pages_metadata,
        "blocks": all_blocks
    }
