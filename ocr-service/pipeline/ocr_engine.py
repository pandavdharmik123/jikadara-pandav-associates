import os
import logging
from typing import List, Dict, Any
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Directory containing high-accuracy traineddata models
TESSDATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tessdata")

# Lazy singleton PaddleOCR engines for English/Latin
_paddle_engines = {}

def get_paddle_ocr_engine(lang: str = "en"):
    """
    Retrieves or initializes a PaddleOCR engine for English/Devanagari.
    """
    global _paddle_engines
    
    if lang not in _paddle_engines:
        try:
            from paddleocr import PaddleOCR
            logger.info(f"Initializing PaddleOCR engine for language: '{lang}'...")
            _paddle_engines[lang] = PaddleOCR(
                use_textline_orientation=True,
                lang=lang
            )
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR for '{lang}': {e}")
            if "en" not in _paddle_engines:
                from paddleocr import PaddleOCR
                _paddle_engines["en"] = PaddleOCR(use_textline_orientation=True, lang="en")
            return _paddle_engines["en"]
            
    return _paddle_engines[lang]

def run_tesseract_ocr(pil_image: Image.Image, lang: str = "guj+eng") -> Dict[str, Any]:
    """
    Executes Tesseract OCR with support for Gujarati, Hindi, and English bilingual texts.
    Returns structured blocks, line bounding boxes, and confidence scores.
    """
    import pytesseract

    custom_config = f'--tessdata-dir "{TESSDATA_DIR}" --psm 3'
    if not os.path.exists(TESSDATA_DIR):
        custom_config = '--psm 3'

    try:
        data = pytesseract.image_to_data(
            pil_image,
            lang=lang,
            config=custom_config,
            output_type=pytesseract.Output.DICT
        )
    except Exception as e:
        logger.warning(f"Tesseract OCR initial run failed with config: {e}. Trying fallback...")
        try:
            data = pytesseract.image_to_data(
                pil_image,
                lang=lang,
                config='--psm 3',
                output_type=pytesseract.Output.DICT
            )
        except Exception as e2:
            logger.error(f"Tesseract OCR fallback failed: {e2}")
            return {
                "blocks": [],
                "full_text": "",
                "avg_confidence": 0.0,
                "detected_languages": [lang]
            }

    # Group extracted words into coherent lines
    lines_map = {}
    n_boxes = len(data.get("text", []))

    for i in range(n_boxes):
        word = str(data["text"][i]).strip()
        conf = float(data["conf"][i]) if i < len(data["conf"]) else -1

        # Tesseract returns -1 confidence for whitespace / layout boxes
        if not word or conf < 0:
            continue

        block_num = data["block_num"][i]
        par_num = data["par_num"][i]
        line_num = data["line_num"][i]
        line_key = (block_num, par_num, line_num)

        x = data["left"][i]
        y = data["top"][i]
        w = data["width"][i]
        h = data["height"][i]

        if line_key not in lines_map:
            lines_map[line_key] = {
                "words": [word],
                "confs": [conf],
                "left": x,
                "top": y,
                "right": x + w,
                "bottom": y + h
            }
        else:
            lines_map[line_key]["words"].append(word)
            lines_map[line_key]["confs"].append(conf)
            lines_map[line_key]["left"] = min(lines_map[line_key]["left"], x)
            lines_map[line_key]["top"] = min(lines_map[line_key]["top"], y)
            lines_map[line_key]["right"] = max(lines_map[line_key]["right"], x + w)
            lines_map[line_key]["bottom"] = max(lines_map[line_key]["bottom"], y + h)

    extracted_blocks = []
    full_text_lines = []
    total_conf = 0.0

    for line_key, line_info in lines_map.items():
        line_str = " ".join(line_info["words"]).strip()
        if not line_str:
            continue

        avg_conf = sum(line_info["confs"]) / len(line_info["confs"])
        normalized_conf = round(avg_conf / 100.0, 4)

        x = line_info["left"]
        y = line_info["top"]
        w = line_info["right"] - x
        h = line_info["bottom"] - y

        block_data = {
            "text": line_str,
            "confidence": normalized_conf,
            "bbox": {
                "x": round(float(x), 2),
                "y": round(float(y), 2),
                "width": round(float(w), 2),
                "height": round(float(h), 2)
            }
        }
        extracted_blocks.append(block_data)
        full_text_lines.append(line_str)
        total_conf += normalized_conf

    doc_conf = (total_conf / len(extracted_blocks)) if extracted_blocks else 0.0

    logger.info(f"Tesseract OCR extracted {len(extracted_blocks)} lines using lang='{lang}' (avg conf: {doc_conf:.2f})")

    return {
        "blocks": extracted_blocks,
        "full_text": "\n".join(full_text_lines),
        "avg_confidence": round(doc_conf, 4),
        "detected_languages": [lang]
    }

def run_paddle_ocr_on_image(pil_image: Image.Image, lang: str = "en") -> Dict[str, Any]:
    """
    Runs PaddleOCR on a PIL image and extracts text, confidence scores,
    and bounding boxes.
    """
    engine = get_paddle_ocr_engine(lang)
    img_np = np.array(pil_image)
    
    try:
        results = engine.ocr(img_np)
    except Exception as e:
        logger.error(f"PaddleOCR execution error: {e}")
        return {
            "blocks": [],
            "full_text": "",
            "avg_confidence": 0.0,
            "detected_languages": [lang]
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
        "detected_languages": [lang]
    }

def run_ocr_on_image(pil_image: Image.Image, preferred_lang: str = "gu") -> Dict[str, Any]:
    """
    Intelligent Multi-Engine OCR Router:
    - Gujarati ('gu', 'gujarati'): Routes to Tesseract with bilingual 'guj+eng' (best accuracy for Gujarati text + numbers/PAN).
    - Hindi ('hi', 'hindi'): Routes to Tesseract with bilingual 'hin+eng' or PaddleOCR.
    - English ('en'): Routes to PaddleOCR / Tesseract English.
    """
    norm_lang = (preferred_lang or "gu").strip().lower()

    # Route Gujarati to Tesseract guj+eng
    if norm_lang in ("gu", "guj", "gujarati"):
        logger.info("Routing image to Tesseract OCR with 'guj+eng' language model...")
        return run_tesseract_ocr(pil_image, lang="guj+eng")

    # Route Hindi to Tesseract hin+eng
    if norm_lang in ("hi", "hin", "hindi", "devanagari"):
        logger.info("Routing image to Tesseract OCR with 'hin+eng' language model...")
        return run_tesseract_ocr(pil_image, lang="hin+eng")

    # For English or other Latin scripts, use PaddleOCR with Tesseract fallback
    try:
        logger.info("Routing image to PaddleOCR (en)...")
        res = run_paddle_ocr_on_image(pil_image, lang="en")
        if res.get("blocks"):
            return res
    except Exception as e:
        logger.warning(f"PaddleOCR failed: {e}. Falling back to Tesseract...")

    return run_tesseract_ocr(pil_image, lang="eng")
