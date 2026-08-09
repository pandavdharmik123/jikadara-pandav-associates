import numpy as np
from PIL import Image
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Lazy singleton OCR engines for performance
_ocr_engines = {}

def get_paddle_ocr_engine(lang: str = "en"):
    """
    Retrieves or initializes a PaddleOCR engine for the given language.
    Supports PaddleOCR 3.7+ / PaddleX v3 models.
    """
    global _ocr_engines
    
    lang_map = {
        "en": "en",
        "gu": "latin",
        "hi": "devanagari",
        "devanagari": "devanagari"
    }
    target_lang = lang_map.get(lang.lower(), "en")
    
    if target_lang not in _ocr_engines:
        try:
            from paddleocr import PaddleOCR
            logger.info(f"Initializing PaddleOCR engine for language: '{target_lang}'...")
            _ocr_engines[target_lang] = PaddleOCR(
                use_textline_orientation=True,
                lang=target_lang
            )
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR for '{target_lang}': {e}. Falling back to default 'en'.")
            if "en" not in _ocr_engines:
                from paddleocr import PaddleOCR
                _ocr_engines["en"] = PaddleOCR(use_textline_orientation=True, lang="en")
            return _ocr_engines["en"]
            
    return _ocr_engines[target_lang]

def run_ocr_on_image(pil_image: Image.Image, preferred_lang: str = "en") -> Dict[str, Any]:
    """
    Runs PaddleOCR on a PIL image and extracts text, confidence scores,
    and bounding boxes. Supports both PaddleOCR 3.7+ dict format and legacy 2.x list format.
    """
    engine = get_paddle_ocr_engine(preferred_lang)
    img_np = np.array(pil_image)
    
    try:
        results = engine.ocr(img_np)
    except Exception as e:
        logger.error(f"PaddleOCR execution error: {e}")
        return {
            "blocks": [],
            "full_text": "",
            "avg_confidence": 0.0,
            "detected_languages": [preferred_lang]
        }
        
    extracted_blocks = []
    total_confidence = 0.0
    valid_count = 0
    full_text_lines = []

    if results and len(results) > 0:
        res_obj = results[0]
        
        # Format 1: PaddleOCR 3.7+ / PaddleX v3 Dictionary Format
        if isinstance(res_obj, dict) and "rec_texts" in res_obj:
            texts = res_obj.get("rec_texts", [])
            scores = res_obj.get("rec_scores", [])
            polys = res_obj.get("dt_polys", []) or res_obj.get("rec_polys", [])
            
            for idx in range(len(texts)):
                txt = str(texts[idx]).strip()
                if not txt:
                    continue
                    
                conf = float(scores[idx]) if idx < len(scores) else 0.9
                poly = polys[idx] if idx < len(polys) else None
                
                x, y, w, h = 0.0, 0.0, 0.0, 0.0
                if poly is not None and len(poly) > 0:
                    try:
                        xs = [float(p[0]) for p in poly]
                        ys = [float(p[1]) for p in poly]
                        x, y = min(xs), min(ys)
                        w, h = max(xs) - x, max(ys) - y
                    except Exception:
                        pass
                        
                block_info = {
                    "text": txt,
                    "confidence": round(conf, 4),
                    "bbox": {
                        "x": round(x, 2),
                        "y": round(y, 2),
                        "width": round(w, 2),
                        "height": round(h, 2)
                    }
                }
                extracted_blocks.append(block_info)
                full_text_lines.append(txt)
                total_confidence += conf
                valid_count += 1
                
        # Format 2: Legacy PaddleOCR 2.x Nested List Format
        elif isinstance(res_obj, list):
            for line in res_obj:
                try:
                    bbox_coords, (text, confidence) = line
                    clean_txt = str(text).strip()
                    if not clean_txt:
                        continue
                        
                    x1, y1 = bbox_coords[0]
                    x2, y2 = bbox_coords[2]
                    
                    block_info = {
                        "text": clean_txt,
                        "confidence": float(confidence),
                        "bbox": {
                            "x": float(x1),
                            "y": float(y1),
                            "width": float(x2 - x1),
                            "height": float(y2 - y1)
                        }
                    }
                    extracted_blocks.append(block_info)
                    full_text_lines.append(clean_txt)
                    total_confidence += float(confidence)
                    valid_count += 1
                except Exception as item_err:
                    logger.warning(f"Error parsing line item: {item_err}")

    avg_conf = (total_confidence / valid_count) if valid_count > 0 else 0.0

    return {
        "blocks": extracted_blocks,
        "full_text": "\n".join(full_text_lines),
        "avg_confidence": round(avg_conf, 4),
        "detected_languages": [preferred_lang]
    }
