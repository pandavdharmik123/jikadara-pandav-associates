import cv2
import numpy as np
from PIL import Image
import logging

logger = logging.getLogger(__name__)

def pil_to_cv2(pil_image: Image.Image) -> np.ndarray:
    """Converts PIL Image to OpenCV BGR numpy array."""
    open_cv_image = np.array(pil_image)
    if open_cv_image.ndim == 2:  # Grayscale
        return cv2.cvtColor(open_cv_image, cv2.COLOR_GRAY2BGR)
    elif open_cv_image.shape[2] == 4:  # RGBA
        return cv2.cvtColor(open_cv_image, cv2.COLOR_RGBA2BGR)
    return cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2BGR)

def cv2_to_pil(cv2_image: np.ndarray) -> Image.Image:
    """Converts OpenCV BGR image back to PIL RGB Image."""
    rgb = cv2.cvtColor(cv2_image, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)

def deskew_image(image: np.ndarray) -> np.ndarray:
    """
    Detects skew angle in scanned image using minimum area rectangle of text contours
    and corrects the rotation.
    """
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        # Invert gray image: text becomes white, background black
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        
        # Find contours of text blocks
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) < 10:
            return image
            
        angle = cv2.minAreaRect(coords)[-1]
        
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
            
        # Only rotate if skew is notable (> 0.5 degrees and < 45 degrees)
        if abs(angle) > 0.5 and abs(angle) < 45:
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
            )
            logger.info(f"Image deskewed by {angle:.2f} degrees")
            return rotated
    except Exception as e:
        logger.warning(f"Deskew failed, returning original image: {e}")
        
    return image

def enhance_contrast(image: np.ndarray) -> np.ndarray:
    """
    Enhances contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization).
    """
    try:
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_channel, a, b = cv2.split(lab)
        
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l_channel)
        
        limg = cv2.merge((cl, a, b))
        enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        return enhanced
    except Exception as e:
        logger.warning(f"Contrast enhancement failed: {e}")
        return image

def denoise_image(image: np.ndarray) -> np.ndarray:
    """
    Applies fast bilateral filter to clean scanned background noise while preserving sharp text edges.
    """
    try:
        return cv2.bilateralFilter(image, 5, 50, 50)
    except Exception as e:
        return image

def preprocess_scanned_image(pil_image: Image.Image) -> Image.Image:
    """
    Full OpenCV preprocessing pipeline for scanned page images:
    1. PIL to OpenCV BGR
    2. Deskew angle correction
    3. Denoise background artifacts
    4. CLAHE contrast enhancement
    5. OpenCV back to PIL Image
    """
    img_cv = pil_to_cv2(pil_image)
    
    # Apply pipeline
    img_cv = deskew_image(img_cv)
    img_cv = denoise_image(img_cv)
    img_cv = enhance_contrast(img_cv)
    
    return cv2_to_pil(img_cv)
