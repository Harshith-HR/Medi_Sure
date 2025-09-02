import os
import io
import logging
from typing import Optional, Union, List, Dict, Any
from PIL import Image
import numpy as np
from paddleocr import PaddleOCR
import pytesseract
from ibm_watson import VisualRecognitionV4
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from ibm_cloud_sdk_core.api_exception import ApiException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedOCRReader:
    """
    Enhanced OCR Reader for extracting text from prescription images.
    Uses PaddleOCR as primary OCR with IBM Watson and Tesseract fallbacks.
    Optimized for handwritten prescriptions and medical documents.
    """
    
    def __init__(self):
        self.paddle_ocr = None
        self.watson_ocr = None
        self.tesseract_available = False
        
        # Initialize OCR engines in order of preference
        self._init_paddle_ocr()
        self._init_watson_ocr()
        self._check_tesseract()
    
    def _init_paddle_ocr(self):
        """Initialize PaddleOCR for handwritten prescription recognition."""
        try:
            # Initialize PaddleOCR with English language support
            # use_angle_cls=True helps with rotated text
            # use_gpu=False for CPU inference (set to True if GPU available)
            self.paddle_ocr = PaddleOCR(
                use_angle_cls=True, 
                lang='en',
                use_gpu=False,
                show_log=False
            )
            logger.info("PaddleOCR initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {str(e)}")
            self.paddle_ocr = None
    
    def _init_watson_ocr(self):
        """Initialize IBM Watson Visual Recognition OCR service."""
        try:
            api_key = os.getenv('IBM_WATSON_VISUAL_RECOGNITION_API_KEY')
            service_url = os.getenv('IBM_WATSON_VISUAL_RECOGNITION_URL', 
                                  'https://api.us-south.visual-recognition.watson.cloud.ibm.com')
            
            if api_key:
                authenticator = IAMAuthenticator(api_key)
                self.watson_ocr = VisualRecognitionV4(
                    version='2019-02-11',
                    authenticator=authenticator
                )
                self.watson_ocr.set_service_url(service_url)
                logger.info("IBM Watson Visual Recognition OCR initialized successfully")
            else:
                logger.warning("IBM Watson API key not found")
                
        except Exception as e:
            logger.error(f"Failed to initialize IBM Watson OCR: {str(e)}")
            self.watson_ocr = None
    
    def _check_tesseract(self):
        """Check if Tesseract is available as fallback."""
        try:
            pytesseract.get_tesseract_version()
            self.tesseract_available = True
            logger.info("Tesseract OCR available as fallback")
        except Exception as e:
            logger.error(f"Tesseract not available: {str(e)}")
            self.tesseract_available = False
    
    def _preprocess_image_for_ocr(self, image: Image.Image) -> Image.Image:
        """
        Advanced preprocessing for medical prescription images.
        
        Args:
            image: PIL Image object
            
        Returns:
            Preprocessed PIL Image optimized for OCR
        """
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize for optimal OCR (PaddleOCR works well with larger images)
        width, height = image.size
        if width < 1000 or height < 800:
            scale_factor = max(1000/width, 800/height)
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Convert to numpy array for advanced processing
        img_array = np.array(image)
        
        # Enhance contrast for better text recognition
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.2)
        
        return image
    
    def _extract_with_paddle_ocr(self, image: Image.Image) -> Optional[Dict[str, Any]]:
        """
        Extract text using PaddleOCR (primary method for handwritten prescriptions).
        
        Args:
            image: PIL Image object
            
        Returns:
            Dictionary with extracted text and confidence scores
        """
        if not self.paddle_ocr:
            return None
            
        try:
            # Convert PIL Image to numpy array
            img_array = np.array(image)
            
            # Run PaddleOCR
            result = self.paddle_ocr.ocr(img_array, cls=True)
            
            if not result or not result[0]:
                return None
            
            # Process results
            extracted_lines = []
            full_text = ""
            total_confidence = 0
            line_count = 0
            
            for line in result[0]:
                if line:
                    # Each line contains: [[[x1,y1],[x2,y2],[x3,y3],[x4,y4]], (text, confidence)]
                    bbox, (text, confidence) = line
                    
                    if confidence > 0.5:  # Filter low-confidence results
                        extracted_lines.append({
                            'text': text,
                            'confidence': confidence,
                            'bbox': bbox
                        })
                        full_text += text + " "
                        total_confidence += confidence
                        line_count += 1
            
            if line_count == 0:
                return None
            
            avg_confidence = total_confidence / line_count
            
            return {
                'text': full_text.strip(),
                'confidence': avg_confidence,
                'lines': extracted_lines,
                'method': 'PaddleOCR'
            }
            
        except Exception as e:
            logger.error(f"PaddleOCR extraction error: {str(e)}")
            return None
    
    def _extract_with_watson(self, image_bytes: bytes) -> Optional[Dict[str, Any]]:
        """
        Extract text using IBM Watson Visual Recognition OCR.
        
        Args:
            image_bytes: Image data as bytes
            
        Returns:
            Dictionary with extracted text and metadata
        """
        if not self.watson_ocr:
            return None
            
        try:
            # Analyze image with Watson OCR
            result = self.watson_ocr.analyze(
                images_file=io.BytesIO(image_bytes),
                collection_ids=[],
                features=['text'],
                images_file_content_type='image/jpeg'
            ).get_result()
            
            # Extract text from results
            extracted_text = ""
            if 'images' in result and len(result['images']) > 0:
                image_result = result['images'][0]
                if 'text' in image_result:
                    text_annotations = image_result['text']['text_annotations']
                    for annotation in text_annotations:
                        extracted_text += annotation['description'] + " "
            
            if not extracted_text.strip():
                return None
            
            return {
                'text': extracted_text.strip(),
                'confidence': 0.8,  # Watson doesn't provide confidence scores
                'method': 'IBM Watson'
            }
            
        except ApiException as e:
            logger.error(f"IBM Watson OCR API error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"IBM Watson OCR unexpected error: {str(e)}")
            return None
    
    def _extract_with_tesseract(self, image: Image.Image) -> Optional[Dict[str, Any]]:
        """
        Extract text using Tesseract OCR as final fallback.
        
        Args:
            image: PIL Image object
            
        Returns:
            Dictionary with extracted text and metadata
        """
        if not self.tesseract_available:
            return None
            
        try:
            # Enhanced Tesseract configuration for medical prescriptions
            custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,()/-:mg μg ml tablets capsules twice daily once morning evening '
            
            # Extract text with confidence data
            data = pytesseract.image_to_data(image, config=custom_config, output_type=pytesseract.Output.DICT)
            
            # Filter and combine text with confidence > 30
            extracted_text = ""
            confidences = []
            
            for i, conf in enumerate(data['conf']):
                if int(conf) > 30:  # Filter low confidence
                    text = data['text'][i].strip()
                    if text:
                        extracted_text += text + " "
                        confidences.append(int(conf))
            
            if not extracted_text.strip() or not confidences:
                return None
            
            avg_confidence = sum(confidences) / len(confidences) / 100.0  # Convert to 0-1 scale
            
            return {
                'text': extracted_text.strip(),
                'confidence': avg_confidence,
                'method': 'Tesseract'
            }
            
        except Exception as e:
            logger.error(f"Tesseract OCR error: {str(e)}")
            return None
    
    def extract_text_from_image(self, image_file: Union[bytes, str, Image.Image]) -> Dict[str, Any]:
        """
        Extract text from prescription image using multiple OCR methods.
        
        Args:
            image_file: Image data (bytes, file path, or PIL Image)
            
        Returns:
            Dictionary with extracted text and metadata
            
        Raises:
            ValueError: If image format is not supported
            RuntimeError: If all OCR methods fail
        """
        try:
            # Handle different input types
            if isinstance(image_file, bytes):
                image = Image.open(io.BytesIO(image_file))
                image_bytes = image_file
            elif isinstance(image_file, str):
                # File path
                image = Image.open(image_file)
                with open(image_file, 'rb') as f:
                    image_bytes = f.read()
            elif isinstance(image_file, Image.Image):
                image = image_file
                # Convert PIL Image to bytes
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format='JPEG')
                image_bytes = img_byte_arr.getvalue()
            else:
                raise ValueError("Unsupported image input type")
            
            # Validate image format
            if image.format and image.format not in ['JPEG', 'PNG', 'JPG']:
                raise ValueError(f"Unsupported image format: {image.format}")
            
            # Preprocess image for optimal OCR
            processed_image = self._preprocess_image_for_ocr(image)
            
            # Try OCR methods in order of preference
            ocr_results = []
            
            # 1. Try PaddleOCR first (best for handwritten text)
            paddle_result = self._extract_with_paddle_ocr(processed_image)
            if paddle_result and paddle_result['confidence'] > 0.6:
                logger.info(f"Text extracted successfully using PaddleOCR (confidence: {paddle_result['confidence']:.2f})")
                return paddle_result
            elif paddle_result:
                ocr_results.append(paddle_result)
            
            # 2. Try IBM Watson OCR
            watson_result = self._extract_with_watson(image_bytes)
            if watson_result:
                logger.info("Text extracted successfully using IBM Watson OCR")
                return watson_result
            
            # 3. Try Tesseract as final fallback
            tesseract_result = self._extract_with_tesseract(processed_image)
            if tesseract_result and tesseract_result['confidence'] > 0.4:
                logger.info(f"Text extracted successfully using Tesseract OCR (confidence: {tesseract_result['confidence']:.2f})")
                return tesseract_result
            elif tesseract_result:
                ocr_results.append(tesseract_result)
            
            # If we have any results, return the best one
            if ocr_results:
                best_result = max(ocr_results, key=lambda x: x['confidence'])
                logger.info(f"Returning best available result from {best_result['method']} (confidence: {best_result['confidence']:.2f})")
                return best_result
            
            # If all methods fail
            raise RuntimeError("Failed to extract text using all available OCR methods")
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {str(e)}")
            raise RuntimeError(f"OCR extraction failed: {str(e)}")

# Global enhanced OCR reader instance
enhanced_ocr_reader = EnhancedOCRReader()

def extract_text_from_image(image_file: Union[bytes, str, Image.Image]) -> str:
    """
    Convenience function to extract text from prescription image.
    
    Args:
        image_file: Image data (bytes, file path, or PIL Image)
        
    Returns:
        Extracted text as string
    """
    result = enhanced_ocr_reader.extract_text_from_image(image_file)
    return result['text']

def extract_text_with_metadata(image_file: Union[bytes, str, Image.Image]) -> Dict[str, Any]:
    """
    Extract text with full metadata including confidence scores.
    
    Args:
        image_file: Image data (bytes, file path, or PIL Image)
        
    Returns:
        Dictionary with text, confidence, and method used
    """
    return enhanced_ocr_reader.extract_text_from_image(image_file)

# Example usage and testing
if __name__ == "__main__":
    # Test with sample prescription text
    sample_prescription = """
    Dr. Sarah Johnson, MD
    City General Hospital
    
    Patient: John Smith
    DOB: 01/15/1980
    Date: 03/20/2024
    
    Rx:
    1. Amoxicillin 500mg
       Take 1 capsule 3 times daily for 7 days
       
    2. Ibuprofen 400mg
       Take 1 tablet every 6-8 hours as needed for pain
       Max 3 tablets per day
       
    3. Omeprazole 20mg
       Take 1 capsule daily before breakfast
       
    Refills: 0
    
    Dr. Sarah Johnson, MD
    License: MD12345
    """
    
    print("Enhanced OCR System Initialized")
    print("Sample prescription text:")
    print(sample_prescription)
    print("\nOCR methods available:")
    print(f"- PaddleOCR: {'✓' if enhanced_ocr_reader.paddle_ocr else '✗'}")
    print(f"- IBM Watson: {'✓' if enhanced_ocr_reader.watson_ocr else '✗'}")
    print(f"- Tesseract: {'✓' if enhanced_ocr_reader.tesseract_available else '✗'}")
