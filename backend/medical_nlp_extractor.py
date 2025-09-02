import os
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import torch
from transformers import (
    AutoTokenizer, AutoModel, AutoModelForTokenClassification,
    pipeline, BertTokenizer, BertForTokenClassification
)
import numpy as np
from ibm_watson import NaturalLanguageUnderstandingV1
from ibm_watson.natural_language_understanding_v1 import Features, EntitiesOptions, KeywordsOptions
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DrugEntity:
    """Structured drug entity with medical details."""
    name: str
    dosage: str
    frequency: str
    route: str = ""
    duration: str = ""
    instructions: str = ""
    confidence: float = 0.0

@dataclass
class MedicalExtraction:
    """Complete medical prescription extraction result."""
    drugs: List[DrugEntity]
    patient_info: Dict[str, str]
    doctor_info: Dict[str, str]
    raw_text: str
    confidence_score: float
    extraction_method: str

class MedicalNLPExtractor:
    """
    Advanced NLP extractor for medical prescriptions using BioBERT, PubMedBERT,
    and IBM Watson for comprehensive drug information extraction.
    """
    
    def __init__(self):
        self.biobert_model = None
        self.biobert_tokenizer = None
        self.pubmedbert_pipeline = None
        self.watson_nlu = None
        self.drug_ner_pipeline = None
        
        # Initialize models
        self._init_biobert()
        self._init_pubmedbert()
        self._init_watson_nlu()
        self._init_drug_ner()
        
        # Medical patterns for rule-based extraction
        self._init_medical_patterns()
    
    def _init_biobert(self):
        """Initialize BioBERT model for biomedical text understanding."""
        try:
            model_name = "dmis-lab/biobert-base-cased-v1.2"
            self.biobert_tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.biobert_model = AutoModel.from_pretrained(model_name)
            logger.info("BioBERT model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize BioBERT: {str(e)}")
    
    def _init_pubmedbert(self):
        """Initialize PubMedBERT for medical entity recognition."""
        try:
            # Use a medical NER model based on PubMedBERT
            model_name = "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"
            self.pubmedbert_pipeline = pipeline(
                "token-classification",
                model=model_name,
                tokenizer=model_name,
                aggregation_strategy="simple"
            )
            logger.info("PubMedBERT NER pipeline initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize PubMedBERT: {str(e)}")
    
    def _init_watson_nlu(self):
        """Initialize IBM Watson Natural Language Understanding."""
        try:
            api_key = os.getenv('IBM_WATSON_NLU_API_KEY')
            service_url = os.getenv('IBM_WATSON_NLU_URL', 
                                  'https://api.us-south.natural-language-understanding.watson.cloud.ibm.com')
            
            if api_key:
                authenticator = IAMAuthenticator(api_key)
                self.watson_nlu = NaturalLanguageUnderstandingV1(
                    version='2022-04-07',
                    authenticator=authenticator
                )
                self.watson_nlu.set_service_url(service_url)
                logger.info("IBM Watson NLU initialized successfully")
            else:
                logger.warning("IBM Watson NLU API key not found")
        except Exception as e:
            logger.error(f"Failed to initialize Watson NLU: {str(e)}")
    
    def _init_drug_ner(self):
        """Initialize specialized drug NER pipeline."""
        try:
            # Use a medical NER model specifically trained for drug recognition
            self.drug_ner_pipeline = pipeline(
                "ner",
                model="d4data/biomedical-ner-all",
                tokenizer="d4data/biomedical-ner-all",
                aggregation_strategy="simple"
            )
            logger.info("Drug NER pipeline initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Drug NER: {str(e)}")
    
    def _init_medical_patterns(self):
        """Initialize regex patterns for medical information extraction."""
        self.patterns = {
            'drug_names': [
                r'\b([A-Z][a-z]+(?:cillin|mycin|prazole|olol|pine|ide|ine|ate|ium))\b',
                r'\b([A-Z][a-z]+)\s+(?:\d+\s*(?:mg|mcg|g|ml|μg))',
                r'(?:Rx:|Take:|Medication:)\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)'
            ],
            'dosages': [
                r'(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|μg|units?))',
                r'(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|μg|units?)',
                r'(\d+/\d+\s*(?:mg|mcg|g|ml))'
            ],
            'frequencies': [
                r'(?:take|use)\s+(\d+)\s+(?:time|tablet|capsule|dose)s?\s+(?:per\s+)?(?:day|daily)',
                r'(\d+)\s+(?:time|tablet|capsule|dose)s?\s+(?:per\s+)?(?:day|daily)',
                r'(once|twice|three times|four times)\s+(?:per\s+)?(?:day|daily)',
                r'every\s+(\d+)\s+hours?',
                r'(morning|evening|night|bedtime)',
                r'(before|after)\s+(?:meals?|food|eating)'
            ],
            'routes': [
                r'\b(oral|orally|by mouth|PO)\b',
                r'\b(topical|topically|apply)\b',
                r'\b(injection|inject|IV|IM|SC)\b',
                r'\b(inhale|inhalation|nebulizer)\b'
            ],
            'duration': [
                r'for\s+(\d+)\s+(?:day|week|month)s?',
                r'(\d+)\s+(?:day|week|month)\s+(?:course|treatment)',
                r'until\s+(finished|gone|empty)'
            ]
        }
    
    def _extract_with_biobert(self, text: str) -> Dict[str, Any]:
        """Extract medical entities using BioBERT."""
        if not self.biobert_model or not self.biobert_tokenizer:
            return {}
        
        try:
            # Tokenize and encode text
            inputs = self.biobert_tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
            
            # Get embeddings
            with torch.no_grad():
                outputs = self.biobert_model(**inputs)
                embeddings = outputs.last_hidden_state
            
            # Use embeddings for similarity-based drug detection
            # This is a simplified approach - in practice, you'd use a trained classifier
            tokens = self.biobert_tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])
            
            # Extract potential drug names based on token patterns
            drug_candidates = []
            for i, token in enumerate(tokens):
                if token.startswith('##'):
                    continue
                if any(suffix in token.lower() for suffix in ['cillin', 'mycin', 'prazole', 'olol']):
                    drug_candidates.append(token)
            
            return {
                'method': 'BioBERT',
                'drug_candidates': drug_candidates,
                'confidence': 0.7
            }
            
        except Exception as e:
            logger.error(f"BioBERT extraction error: {str(e)}")
            return {}
    
    def _extract_with_pubmedbert(self, text: str) -> Dict[str, Any]:
        """Extract medical entities using PubMedBERT NER."""
        if not self.pubmedbert_pipeline:
            return {}
        
        try:
            # Run NER pipeline
            entities = self.pubmedbert_pipeline(text)
            
            # Filter and categorize entities
            drugs = []
            medical_terms = []
            
            for entity in entities:
                if entity['score'] > 0.5:  # Filter low confidence
                    entity_text = entity['word'].replace('##', '')
                    if any(keyword in entity_text.lower() for keyword in ['drug', 'medication', 'medicine']):
                        drugs.append({
                            'text': entity_text,
                            'confidence': entity['score'],
                            'label': entity['entity_group']
                        })
                    else:
                        medical_terms.append({
                            'text': entity_text,
                            'confidence': entity['score'],
                            'label': entity['entity_group']
                        })
            
            return {
                'method': 'PubMedBERT',
                'drugs': drugs,
                'medical_terms': medical_terms,
                'confidence': 0.8
            }
            
        except Exception as e:
            logger.error(f"PubMedBERT extraction error: {str(e)}")
            return {}
    
    def _extract_with_watson_nlu(self, text: str) -> Dict[str, Any]:
        """Extract entities using IBM Watson NLU."""
        if not self.watson_nlu:
            return {}
        
        try:
            response = self.watson_nlu.analyze(
                text=text,
                features=Features(
                    entities=EntitiesOptions(limit=50),
                    keywords=KeywordsOptions(limit=50)
                )
            ).get_result()
            
            # Process entities
            medical_entities = []
            for entity in response.get('entities', []):
                if entity['confidence'] > 0.5:
                    medical_entities.append({
                        'text': entity['text'],
                        'type': entity['type'],
                        'confidence': entity['confidence']
                    })
            
            # Process keywords
            medical_keywords = []
            for keyword in response.get('keywords', []):
                if keyword['relevance'] > 0.5:
                    medical_keywords.append({
                        'text': keyword['text'],
                        'relevance': keyword['relevance']
                    })
            
            return {
                'method': 'Watson NLU',
                'entities': medical_entities,
                'keywords': medical_keywords,
                'confidence': 0.75
            }
            
        except Exception as e:
            logger.error(f"Watson NLU extraction error: {str(e)}")
            return {}
    
    def _extract_with_drug_ner(self, text: str) -> Dict[str, Any]:
        """Extract drug entities using specialized drug NER."""
        if not self.drug_ner_pipeline:
            return {}
        
        try:
            entities = self.drug_ner_pipeline(text)
            
            drugs = []
            for entity in entities:
                if entity['score'] > 0.6 and 'DRUG' in entity.get('entity_group', '').upper():
                    drugs.append({
                        'name': entity['word'],
                        'confidence': entity['score'],
                        'start': entity['start'],
                        'end': entity['end']
                    })
            
            return {
                'method': 'Drug NER',
                'drugs': drugs,
                'confidence': 0.85
            }
            
        except Exception as e:
            logger.error(f"Drug NER extraction error: {str(e)}")
            return {}
    
    def _extract_with_patterns(self, text: str) -> Dict[str, Any]:
        """Extract medical information using regex patterns."""
        results = {
            'drugs': [],
            'dosages': [],
            'frequencies': [],
            'routes': [],
            'durations': []
        }
        
        # Extract drug names
        for pattern in self.patterns['drug_names']:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                results['drugs'].append(match.group(1))
        
        # Extract dosages
        for pattern in self.patterns['dosages']:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                results['dosages'].append(match.group(0))
        
        # Extract frequencies
        for pattern in self.patterns['frequencies']:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                results['frequencies'].append(match.group(1) if match.groups() else match.group(0))
        
        # Extract routes
        for pattern in self.patterns['routes']:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                results['routes'].append(match.group(0))
        
        # Extract duration
        for pattern in self.patterns['duration']:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                results['durations'].append(match.group(0))
        
        return {
            'method': 'Pattern Matching',
            'results': results,
            'confidence': 0.6
        }
    
    def extract_medical_entities(self, text: str) -> MedicalExtraction:
        """
        Comprehensive medical entity extraction using multiple NLP methods.
        
        Args:
            text: Prescription text to analyze
            
        Returns:
            MedicalExtraction object with structured drug information
        """
        logger.info("Starting comprehensive medical entity extraction")
        
        # Run all extraction methods
        extraction_results = []
        
        # 1. BioBERT extraction
        biobert_result = self._extract_with_biobert(text)
        if biobert_result:
            extraction_results.append(biobert_result)
        
        # 2. PubMedBERT NER
        pubmedbert_result = self._extract_with_pubmedbert(text)
        if pubmedbert_result:
            extraction_results.append(pubmedbert_result)
        
        # 3. Watson NLU
        watson_result = self._extract_with_watson_nlu(text)
        if watson_result:
            extraction_results.append(watson_result)
        
        # 4. Specialized Drug NER
        drug_ner_result = self._extract_with_drug_ner(text)
        if drug_ner_result:
            extraction_results.append(drug_ner_result)
        
        # 5. Pattern-based extraction
        pattern_result = self._extract_with_patterns(text)
        extraction_results.append(pattern_result)
        
        # Combine and deduplicate results
        combined_drugs = self._combine_drug_extractions(extraction_results, text)
        
        # Extract patient and doctor information
        patient_info = self._extract_patient_info(text)
        doctor_info = self._extract_doctor_info(text)
        
        # Calculate overall confidence
        if extraction_results:
            avg_confidence = sum(r.get('confidence', 0) for r in extraction_results) / len(extraction_results)
        else:
            avg_confidence = 0.0
        
        # Determine best extraction method
        best_method = max(extraction_results, key=lambda x: x.get('confidence', 0))['method'] if extraction_results else 'Pattern Matching'
        
        return MedicalExtraction(
            drugs=combined_drugs,
            patient_info=patient_info,
            doctor_info=doctor_info,
            raw_text=text,
            confidence_score=avg_confidence,
            extraction_method=best_method
        )
    
    def _combine_drug_extractions(self, results: List[Dict], text: str) -> List[DrugEntity]:
        """Combine and deduplicate drug extractions from multiple methods."""
        all_drugs = {}
        
        # Collect all drug mentions
        for result in results:
            method = result.get('method', 'Unknown')
            confidence = result.get('confidence', 0.0)
            
            # Handle different result formats
            if 'drugs' in result:
                for drug in result['drugs']:
                    if isinstance(drug, dict):
                        name = drug.get('name', drug.get('text', ''))
                    else:
                        name = str(drug)
                    
                    if name and len(name) > 2:
                        name_key = name.lower().strip()
                        if name_key not in all_drugs or all_drugs[name_key]['confidence'] < confidence:
                            all_drugs[name_key] = {
                                'name': name,
                                'confidence': confidence,
                                'method': method
                            }
            
            elif 'drug_candidates' in result:
                for drug in result['drug_candidates']:
                    name_key = drug.lower().strip()
                    if name_key not in all_drugs or all_drugs[name_key]['confidence'] < confidence:
                        all_drugs[name_key] = {
                            'name': drug,
                            'confidence': confidence,
                            'method': method
                        }
            
            elif 'results' in result:
                for drug in result['results'].get('drugs', []):
                    name_key = drug.lower().strip()
                    if name_key not in all_drugs or all_drugs[name_key]['confidence'] < confidence:
                        all_drugs[name_key] = {
                            'name': drug,
                            'confidence': confidence,
                            'method': method
                        }
        
        # Create DrugEntity objects with additional information
        drug_entities = []
        pattern_result = next((r for r in results if r.get('method') == 'Pattern Matching'), {})
        pattern_data = pattern_result.get('results', {})
        
        for drug_data in all_drugs.values():
            # Try to match dosage and frequency for each drug
            dosage = self._find_closest_match(drug_data['name'], pattern_data.get('dosages', []), text)
            frequency = self._find_closest_match(drug_data['name'], pattern_data.get('frequencies', []), text)
            route = self._find_closest_match(drug_data['name'], pattern_data.get('routes', []), text)
            duration = self._find_closest_match(drug_data['name'], pattern_data.get('durations', []), text)
            
            drug_entity = DrugEntity(
                name=drug_data['name'],
                dosage=dosage,
                frequency=frequency,
                route=route,
                duration=duration,
                confidence=drug_data['confidence']
            )
            drug_entities.append(drug_entity)
        
        return drug_entities
    
    def _find_closest_match(self, drug_name: str, candidates: List[str], text: str) -> str:
        """Find the closest dosage/frequency match for a drug in the text."""
        if not candidates:
            return ""
        
        # Find drug position in text
        drug_pos = text.lower().find(drug_name.lower())
        if drug_pos == -1:
            return candidates[0] if candidates else ""
        
        # Find closest candidate
        closest_candidate = ""
        min_distance = float('inf')
        
        for candidate in candidates:
            candidate_pos = text.lower().find(candidate.lower())
            if candidate_pos != -1:
                distance = abs(candidate_pos - drug_pos)
                if distance < min_distance:
                    min_distance = distance
                    closest_candidate = candidate
        
        return closest_candidate
    
    def _extract_patient_info(self, text: str) -> Dict[str, str]:
        """Extract patient information from prescription text."""
        patient_info = {}
        
        # Patient name patterns
        name_patterns = [
            r'Patient:\s*([A-Za-z\s]+)',
            r'Name:\s*([A-Za-z\s]+)',
            r'For:\s*([A-Za-z\s]+)'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                patient_info['name'] = match.group(1).strip()
                break
        
        # Date of birth
        dob_patterns = [
            r'DOB:\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'Born:\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'Birth:\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
        ]
        
        for pattern in dob_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                patient_info['dob'] = match.group(1).strip()
                break
        
        return patient_info
    
    def _extract_doctor_info(self, text: str) -> Dict[str, str]:
        """Extract doctor information from prescription text."""
        doctor_info = {}
        
        # Doctor name patterns
        name_patterns = [
            r'Dr\.\s*([A-Za-z\s]+)(?:,\s*MD)?',
            r'Doctor:\s*([A-Za-z\s]+)',
            r'Physician:\s*([A-Za-z\s]+)'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                doctor_info['name'] = match.group(1).strip()
                break
        
        # License number
        license_patterns = [
            r'License:\s*([A-Z0-9]+)',
            r'Lic\.\s*([A-Z0-9]+)',
            r'MD\s*([0-9]+)'
        ]
        
        for pattern in license_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                doctor_info['license'] = match.group(1).strip()
                break
        
        return doctor_info

# Global medical NLP extractor instance
medical_nlp_extractor = MedicalNLPExtractor()

def extract_medical_entities(text: str) -> Dict[str, Any]:
    """
    Convenience function to extract medical entities from prescription text.
    
    Args:
        text: Prescription text to analyze
        
    Returns:
        Dictionary with structured drug information
    """
    extraction = medical_nlp_extractor.extract_medical_entities(text)
    
    return {
        "drugs": [
            {
                "name": drug.name,
                "dosage": drug.dosage,
                "frequency": drug.frequency,
                "route": drug.route,
                "duration": drug.duration,
                "confidence": drug.confidence
            }
            for drug in extraction.drugs
        ],
        "patient_info": extraction.patient_info,
        "doctor_info": extraction.doctor_info,
        "confidence_score": extraction.confidence_score,
        "extraction_method": extraction.extraction_method
    }

# Example usage
if __name__ == "__main__":
    sample_prescription = """
    Dr. Sarah Johnson, MD
    City General Hospital
    License: MD12345
    
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
    """
    
    print("Testing Medical NLP Extraction:")
    result = extract_medical_entities(sample_prescription)
    
    print(f"\nExtraction Method: {result['extraction_method']}")
    print(f"Confidence Score: {result['confidence_score']:.2f}")
    print(f"\nDrugs Found: {len(result['drugs'])}")
    
    for i, drug in enumerate(result['drugs'], 1):
        print(f"\n{i}. {drug['name']}")
        print(f"   Dosage: {drug['dosage']}")
        print(f"   Frequency: {drug['frequency']}")
        print(f"   Confidence: {drug['confidence']:.2f}")
    
    print(f"\nPatient: {result['patient_info']}")
    print(f"Doctor: {result['doctor_info']}")
