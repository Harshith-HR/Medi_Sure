"""
Medical NER Extractor using GatorTron and other medical models
Extracts drug names, dosages, frequencies, and routes from prescription text
"""

import re
import json
import requests
from typing import List, Dict, Any, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MedicalNERExtractor:
    """
    Medical NER Extractor using GatorTron and other specialized medical models
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or "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"
        self.gatortron_url = "https://api-inference.huggingface.co/models/UFNLP/gatortron-medium"
        self.headers = {"Authorization": f"Bearer {self.api_key}"}
        
        # Drug name patterns for regex fallback
        self.drug_patterns = [
            r'\b(?:paracetamol|acetaminophen|ibuprofen|aspirin|amoxicillin|metformin|lisinopril|atorvastatin|omeprazole|amlodipine)\b',
            r'\b[A-Z][a-z]+(?:cillin|mycin|prazole|statin|sartan|olol|pine|zide|mab|nib)\b',
            r'\b[A-Z][a-z]{3,}(?:\s+[A-Z][a-z]+)?\b(?=\s+\d+\s*(?:mg|g|ml|mcg|units?))'
        ]
        
        # Dosage patterns
        self.dosage_patterns = [
            r'\b(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|μg|units?|IU|mEq)\b',
            r'\b(\d+(?:\.\d+)?)\s*(milligrams?|grams?|milliliters?|micrograms?|international\s+units?)\b'
        ]
        
        # Frequency patterns
        self.frequency_patterns = [
            r'\b(\d+)\s*(?:times?|x)\s*(?:per\s+|a\s+)?day\b',
            r'\b(\d+)/day\b',
            r'\bevery\s+(\d+)\s+hours?\b',
            r'\b(?:once|twice|thrice)\s+(?:daily|a\s+day)\b',
            r'\b(?:morning|evening|night|bedtime)\b',
            r'\b(?:BID|TID|QID|QD|PRN|q\d+h)\b'
        ]
        
        # Route patterns
        self.route_patterns = [
            r'\b(?:orally|oral|by\s+mouth|PO)\b',
            r'\b(?:intravenously|IV|intravenous)\b',
            r'\b(?:intramuscularly|IM|intramuscular)\b',
            r'\b(?:subcutaneously|SC|SQ|subcut)\b',
            r'\b(?:topically|topical|apply\s+to\s+skin)\b',
            r'\b(?:inhaled|inhalation|nebulized)\b',
            r'\b(?:rectally|rectal|PR)\b',
            r'\b(?:sublingually|sublingual|SL)\b'
        ]

    def query_gatortron(self, text: str) -> Dict[str, Any]:
        """
        Query GatorTron model for medical NER
        """
        prompt = f"""
        Extract all medication-related details from the text below. 
        For each drug, provide:
        - drug_name
        - dosage
        - frequency
        - route (if present)

        Return the result ONLY as a JSON array. 
        Text: "{text}"
        """

        payload = {"inputs": prompt}
        
        try:
            response = requests.post(self.gatortron_url, headers=self.headers, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            
            # Handle different response formats
            if isinstance(result, list) and len(result) > 0:
                generated_text = result[0].get('generated_text', '')
                return self._parse_json_from_text(generated_text)
            elif isinstance(result, dict):
                if 'generated_text' in result:
                    return self._parse_json_from_text(result['generated_text'])
                else:
                    return result
            
            return {"error": "Unexpected response format", "raw": result}
            
        except requests.exceptions.RequestException as e:
            logger.error(f"GatorTron API request failed: {e}")
            return {"error": f"API request failed: {str(e)}"}
        except Exception as e:
            logger.error(f"GatorTron query failed: {e}")
            return {"error": f"Query failed: {str(e)}"}

    def _parse_json_from_text(self, text: str) -> Dict[str, Any]:
        """
        Extract JSON from generated text
        """
        try:
            # Look for JSON array or object in the text
            json_start = text.find('[')
            json_end = text.rfind(']') + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = text[json_start:json_end]
                parsed = json.loads(json_str)
                return {"drugs": parsed if isinstance(parsed, list) else [parsed]}
            
            # Try to find JSON object
            json_start = text.find('{')
            json_end = text.rfind('}') + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = text[json_start:json_end]
                parsed = json.loads(json_str)
                if "drugs" in parsed:
                    return parsed
                else:
                    return {"drugs": [parsed]}
            
            # If no JSON found, return empty result
            return {"drugs": []}
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed: {e}")
            return {"drugs": []}

    def _rule_based_extraction(self, text: str) -> List[Dict[str, str]]:
        """
        Fallback rule-based extraction using regex patterns
        """
        drugs = []
        text_lower = text.lower()
        
        # Find potential drug names
        drug_candidates = set()
        
        for pattern in self.drug_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                drug_candidates.add(match.group().strip())
        
        # Common drug names for better matching
        common_drugs = [
            'paracetamol', 'acetaminophen', 'ibuprofen', 'aspirin', 'amoxicillin',
            'metformin', 'lisinopril', 'atorvastatin', 'omeprazole', 'amlodipine',
            'simvastatin', 'levothyroxine', 'azithromycin', 'hydrochlorothiazide',
            'gabapentin', 'clopidogrel', 'montelukast', 'rosuvastatin', 'escitalopram',
            'warfarin', 'prednisone', 'furosemide', 'tramadol', 'sertraline'
        ]
        
        for drug in common_drugs:
            if drug in text_lower:
                drug_candidates.add(drug.title())
        
        # Extract information for each drug candidate
        for drug_name in drug_candidates:
            drug_info = {
                "drug_name": drug_name,
                "dosage": self._extract_dosage_near_drug(text, drug_name),
                "frequency": self._extract_frequency_near_drug(text, drug_name),
                "route": self._extract_route_near_drug(text, drug_name)
            }
            drugs.append(drug_info)
        
        return drugs

    def _extract_dosage_near_drug(self, text: str, drug_name: str) -> str:
        """Extract dosage information near a specific drug name"""
        drug_pos = text.lower().find(drug_name.lower())
        if drug_pos == -1:
            return ""
        
        search_window = text[max(0, drug_pos-25):drug_pos+75]
        
        for pattern in self.dosage_patterns:
            match = re.search(pattern, search_window, re.IGNORECASE)
            if match:
                return f"{match.group(1)}{match.group(2)}"
        
        return ""

    def _extract_frequency_near_drug(self, text: str, drug_name: str) -> str:
        """Extract frequency information near a specific drug name"""
        drug_pos = text.lower().find(drug_name.lower())
        if drug_pos == -1:
            return ""
        
        search_window = text[max(0, drug_pos-25):drug_pos+100]
        
        for pattern in self.frequency_patterns:
            match = re.search(pattern, search_window, re.IGNORECASE)
            if match:
                if 'times' in match.group() or 'x' in match.group() or '/day' in match.group():
                    return f"{match.group(1)}/day" if match.group(1).isdigit() else match.group()
                elif 'every' in match.group():
                    return f"Every {match.group(1)} hours"
                else:
                    return match.group()
        
        # Check for common frequency terms
        frequency_terms = {
            'once daily': '1/day',
            'twice daily': '2/day', 
            'thrice daily': '3/day',
            'morning': '1/day (morning)',
            'evening': '1/day (evening)',
            'bedtime': '1/day (bedtime)',
            'bid': '2/day',
            'tid': '3/day',
            'qid': '4/day',
            'qd': '1/day',
            'prn': 'As needed'
        }
        
        search_lower = search_window.lower()
        for term, freq in frequency_terms.items():
            if term in search_lower:
                return freq
        
        return ""

    def _extract_route_near_drug(self, text: str, drug_name: str) -> str:
        """Extract route information near a specific drug name"""
        drug_pos = text.lower().find(drug_name.lower())
        if drug_pos == -1:
            return ""
        
        search_window = text[max(0, drug_pos-25):drug_pos+100]
        
        for pattern in self.route_patterns:
            match = re.search(pattern, search_window, re.IGNORECASE)
            if match:
                route_map = {
                    'orally': 'oral', 'oral': 'oral', 'by mouth': 'oral', 'po': 'oral',
                    'intravenously': 'intravenous', 'iv': 'intravenous', 'intravenous': 'intravenous',
                    'intramuscularly': 'intramuscular', 'im': 'intramuscular', 'intramuscular': 'intramuscular',
                    'subcutaneously': 'subcutaneous', 'sc': 'subcutaneous', 'sq': 'subcutaneous', 'subcut': 'subcutaneous',
                    'topically': 'topical', 'topical': 'topical', 'apply to skin': 'topical',
                    'inhaled': 'inhalation', 'inhalation': 'inhalation', 'nebulized': 'inhalation',
                    'rectally': 'rectal', 'rectal': 'rectal', 'pr': 'rectal',
                    'sublingually': 'sublingual', 'sublingual': 'sublingual', 'sl': 'sublingual'
                }
                return route_map.get(match.group().lower(), match.group())
        
        return ""

    def extract_drug_info(self, medical_text: str) -> List[Dict[str, str]]:
        """
        Main method to extract drug information from medical text
        
        Args:
            medical_text (str): The medical text to analyze
            
        Returns:
            List of dictionaries with drug information in the format:
            [{"drug_name": "...", "dosage": "...", "frequency": "...", "route": "..."}]
        """
        if not medical_text or not medical_text.strip():
            return []
        
        try:
            # Try GatorTron model first
            result = self.query_gatortron(medical_text)
            
            if "error" not in result and "drugs" in result:
                drugs = result["drugs"]
                
                # Ensure all drugs have the required fields
                standardized_drugs = []
                for drug in drugs:
                    if isinstance(drug, dict):
                        standardized_drug = {
                            "drug_name": drug.get("drug_name", drug.get("name", "")),
                            "dosage": drug.get("dosage", ""),
                            "frequency": drug.get("frequency", ""),
                            "route": drug.get("route", "")
                        }
                        # Only add if we have a drug name
                        if standardized_drug["drug_name"]:
                            standardized_drugs.append(standardized_drug)
                
                if standardized_drugs:
                    return standardized_drugs
            
        except Exception as e:
            logger.error(f"GatorTron extraction failed: {e}")
        
        # Fallback to rule-based extraction
        logger.info("Using rule-based extraction as fallback")
        return self._rule_based_extraction(medical_text)


# Global extractor instance
_extractor = None

def get_extractor() -> MedicalNERExtractor:
    """Get or create global extractor instance"""
    global _extractor
    if _extractor is None:
        _extractor = MedicalNERExtractor()
    return _extractor

def extract_drugs_from_text(text: str) -> List[Dict[str, str]]:
    """
    Convenience function to extract drug information from text
    
    Args:
        text (str): Medical text to analyze
        
    Returns:
        List of dictionaries with drug information
    """
    extractor = get_extractor()
    return extractor.extract_drug_info(text)


# Example usage and testing
if __name__ == "__main__":
    # Test the extractor
    sample_prescriptions = [
        "Patient prescribed Amoxicillin 500mg twice daily orally for 7 days.",
        "Take Paracetamol 500mg twice daily for pain relief",
        "Warfarin 5mg once daily orally, Aspirin 81mg once daily",
        "Ibuprofen 400mg every 6 hours as needed for inflammation, apply topically",
        "Metformin 850mg once daily with breakfast for diabetes"
    ]
    
    extractor = MedicalNERExtractor()
    
    for prescription in sample_prescriptions:
        print(f"\nPrescription: {prescription}")
        result = extractor.extract_drug_info(prescription)
        print(f"Extracted: {json.dumps(result, indent=2)}")
