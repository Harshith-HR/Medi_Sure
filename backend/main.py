from fastapi import FastAPI, HTTPException, File, UploadFile
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import tempfile
import os

# Import our custom modules
from nlp_extractor import DrugExtractor
from dataset_loader import DatasetLoader
from ocr_reader import OCRReader

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Drug Safety Analysis API",
    description="Multi-modal drug safety analysis with interaction detection and dosage recommendations",
    version="1.0.0"
)

# Initialize services
drug_extractor = DrugExtractor()
dataset_loader = DatasetLoader()
ocr_reader = OCRReader()

class PrescriptionRequest(BaseModel):
    age: int
    prescription_text: str

class DrugInfo(BaseModel):
    name: str
    dosage: str
    frequency: str
    drugbank_id: Optional[str] = None
    interaction: Optional[str] = None

class DosageAdvice(BaseModel):
    drug: str
    current_dosage: str
    recommended_dosage: str
    advice: str
    risk_level: str

class Alternative(BaseModel):
    original_drug: str
    alternative: str
    reason: str

class AnalysisResponse(BaseModel):
    extracted_drugs: List[DrugInfo]
    interactions: List[Dict[str, Any]]
    dosage_advice: List[DosageAdvice]
    alternatives: List[Alternative]
    overall_risk: str
    timestamp: str

class ImageAnalysisResponse(BaseModel):
    extracted_text: str
    drugs: List[DrugInfo]
    interactions: List[Dict[str, Any]]
    dosage_advice: List[DosageAdvice]
    alternatives: List[Alternative]
    overall_risk: str
    timestamp: str

@app.get("/ping")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/analyze-prescription", response_model=AnalysisResponse)
async def analyze_prescription(request: PrescriptionRequest):
    """
    Analyze prescription text for drug safety
    
    Steps:
    1. Extract drug entities using NLP
    2. Check drug interactions
    3. Apply age-based dosage recommendations
    4. Suggest safe alternatives if risks found
    """
    try:
        logger.info(f"Analyzing prescription for age {request.age}")
        
        # Step 1: Extract drug entities using NLP
        logger.info("Step 1: Extracting drug entities")
        extraction_result = drug_extractor.extract_drugs(request.prescription_text)
        extracted_drugs = extraction_result.get("drugs", [])
        
        if not extracted_drugs:
            raise HTTPException(status_code=400, detail="No drugs found in prescription text")
        
        # Step 2: Check drug interactions
        logger.info("Step 2: Checking drug interactions")
        drug_names = [drug["name"] for drug in extracted_drugs]
        interaction_results = dataset_loader.get_interaction(drug_names)
        
        # Enhance extracted drugs with interaction info
        enhanced_drugs = []
        for drug in extracted_drugs:
            # Find matching interaction result
            interaction_info = next(
                (result for result in interaction_results if result["drug"].lower() == drug["name"].lower()),
                {"drugbank_id": None, "interaction": "None"}
            )
            
            enhanced_drug = DrugInfo(
                name=drug["name"],
                dosage=drug["dosage"],
                frequency=drug["frequency"],
                drugbank_id=interaction_info.get("drugbank_id"),
                interaction=interaction_info.get("interaction")
            )
            enhanced_drugs.append(enhanced_drug)
        
        # Step 3: Apply age-based dosage recommendations
        logger.info("Step 3: Applying age-based dosage recommendations")
        dosage_advice = _get_age_based_dosage_advice(enhanced_drugs, request.age)
        
        # Step 4: Suggest alternatives if risks found
        logger.info("Step 4: Suggesting alternatives for high-risk drugs")
        alternatives = _suggest_alternatives(enhanced_drugs, interaction_results)
        
        # Determine overall risk level
        overall_risk = _calculate_overall_risk(interaction_results, dosage_advice)
        
        # Prepare interactions summary
        interactions_summary = []
        for result in interaction_results:
            if result["interaction"] != "None":
                interactions_summary.append({
                    "drug": result["drug"],
                    "drugbank_id": result["drugbank_id"],
                    "interaction": result["interaction"],
                    "severity": _extract_severity(result["interaction"])
                })
        
        response = AnalysisResponse(
            extracted_drugs=enhanced_drugs,
            interactions=interactions_summary,
            dosage_advice=dosage_advice,
            alternatives=alternatives,
            overall_risk=overall_risk,
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Analysis completed successfully. Overall risk: {overall_risk}")
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing prescription: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/analyze-prescription-image", response_model=ImageAnalysisResponse)
async def analyze_prescription_image(age: int, image: UploadFile = File(...)):
    """
    Analyze prescription image for drug safety
    
    Steps:
    1. Save image temporarily
    2. Pass to OCR reader to extract text
    3. Pass extracted text to NLP extractor
    4. Check drug interactions
    5. Apply age-based dosage rules
    6. Suggest safe alternatives if risky
    """
    try:
        logger.info(f"Analyzing prescription image for age {age}")
        
        # Validate image format
        if not image.content_type or not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Invalid image format. Please upload JPG or PNG.")
        
        # Step 1: Save image temporarily
        logger.info("Step 1: Saving image temporarily")
        temp_file = None
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(image.filename)[1]) as temp_file:
                content = await image.read()
                temp_file.write(content)
                temp_file_path = temp_file.name
            
            # Step 2: Extract text using OCR
            logger.info("Step 2: Extracting text from image using OCR")
            extracted_text = ocr_reader.extract_text_from_image(temp_file_path)
            
            if not extracted_text or len(extracted_text.strip()) < 10:
                raise HTTPException(status_code=400, detail="Could not extract readable text from image. Please ensure the image is clear and contains prescription text.")
            
            logger.info(f"Extracted text: {extracted_text[:100]}...")
            
            # Step 3: Extract drug entities using NLP
            logger.info("Step 3: Extracting drug entities from OCR text")
            extraction_result = drug_extractor.extract_drugs(extracted_text)
            extracted_drugs = extraction_result.get("drugs", [])
            
            if not extracted_drugs:
                raise HTTPException(status_code=400, detail="No drugs found in prescription image. Please ensure the image contains a valid prescription.")
            
            # Step 4: Check drug interactions
            logger.info("Step 4: Checking drug interactions")
            drug_names = [drug["name"] for drug in extracted_drugs]
            interaction_results = dataset_loader.get_interaction(drug_names)
            
            # Enhance extracted drugs with interaction info
            enhanced_drugs = []
            for drug in extracted_drugs:
                interaction_info = next(
                    (result for result in interaction_results if result["drug"].lower() == drug["name"].lower()),
                    {"drugbank_id": None, "interaction": "None"}
                )
                
                enhanced_drug = DrugInfo(
                    name=drug["name"],
                    dosage=drug["dosage"],
                    frequency=drug["frequency"],
                    drugbank_id=interaction_info.get("drugbank_id"),
                    interaction=interaction_info.get("interaction")
                )
                enhanced_drugs.append(enhanced_drug)
            
            # Step 5: Apply age-based dosage recommendations
            logger.info("Step 5: Applying age-based dosage recommendations")
            dosage_advice = _get_age_based_dosage_advice(enhanced_drugs, age)
            
            # Step 6: Suggest alternatives if risks found
            logger.info("Step 6: Suggesting alternatives for high-risk drugs")
            alternatives = _suggest_alternatives(enhanced_drugs, interaction_results)
            
            # Determine overall risk level
            overall_risk = _calculate_overall_risk(interaction_results, dosage_advice)
            
            # Prepare interactions summary
            interactions_summary = []
            for result in interaction_results:
                if result["interaction"] != "None":
                    interactions_summary.append({
                        "drug": result["drug"],
                        "drugbank_id": result["drugbank_id"],
                        "interaction": result["interaction"],
                        "severity": _extract_severity(result["interaction"])
                    })
            
            response = ImageAnalysisResponse(
                extracted_text=extracted_text,
                drugs=enhanced_drugs,
                interactions=interactions_summary,
                dosage_advice=dosage_advice,
                alternatives=alternatives,
                overall_risk=overall_risk,
                timestamp=datetime.now().isoformat()
            )
            
            logger.info(f"Image analysis completed successfully. Overall risk: {overall_risk}")
            return response
            
        finally:
            # Clean up temporary file
            if temp_file and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                logger.info("Temporary image file cleaned up")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing prescription image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")

def _get_age_based_dosage_advice(drugs: List[DrugInfo], age: int) -> List[DosageAdvice]:
    """Apply dummy age-based dosage recommendations"""
    advice_list = []
    
    for drug in drugs:
        current_dosage = drug.dosage
        advice_text = ""
        recommended_dosage = current_dosage
        risk_level = "Low"
        
        # Age-based dosage adjustments (simplified rules)
        if age < 18:  # Pediatric
            if "500mg" in current_dosage:
                recommended_dosage = current_dosage.replace("500mg", "250mg")
                advice_text = "Reduced dosage recommended for pediatric patients"
                risk_level = "Medium"
            elif "1000mg" in current_dosage:
                recommended_dosage = current_dosage.replace("1000mg", "500mg")
                advice_text = "Significantly reduced dosage for pediatric use"
                risk_level = "High"
            else:
                advice_text = "Verify pediatric dosing guidelines"
                risk_level = "Medium"
                
        elif age > 65:  # Geriatric
            if "1000mg" in current_dosage:
                recommended_dosage = current_dosage.replace("1000mg", "750mg")
                advice_text = "Reduced dosage recommended for elderly patients"
                risk_level = "Medium"
            elif "500mg" in current_dosage and "3/day" in drug.frequency:
                recommended_dosage = current_dosage
                advice_text = "Consider reducing frequency for elderly patients"
                risk_level = "Medium"
            else:
                advice_text = "Standard adult dosage appropriate"
                risk_level = "Low"
        else:  # Adult
            advice_text = "Standard adult dosage appropriate"
            risk_level = "Low"
        
        advice_list.append(DosageAdvice(
            drug=drug.name,
            current_dosage=current_dosage,
            recommended_dosage=recommended_dosage,
            advice=advice_text,
            risk_level=risk_level
        ))
    
    return advice_list

def _suggest_alternatives(drugs: List[DrugInfo], interaction_results: List[Dict]) -> List[Alternative]:
    """Suggest 1-2 safe alternatives if risks found"""
    alternatives = []
    
    # Simple alternative mapping (in real implementation, this would be more sophisticated)
    alternative_map = {
        "paracetamol": "ibuprofen",
        "acetaminophen": "ibuprofen", 
        "aspirin": "paracetamol",
        "ibuprofen": "naproxen",
        "warfarin": "rivaroxaban",
        "metformin": "glipizide"
    }
    
    for result in interaction_results:
        if result["interaction"] != "None" and "severe" in result["interaction"].lower():
            drug_name = result["drug"].lower()
            if drug_name in alternative_map:
                alternatives.append(Alternative(
                    original_drug=result["drug"],
                    alternative=alternative_map[drug_name].title(),
                    reason=f"Safer alternative due to interaction risk: {result['interaction']}"
                ))
    
    # Limit to 2 alternatives as requested
    return alternatives[:2]

def _extract_severity(interaction_text: str) -> str:
    """Extract severity level from interaction text"""
    interaction_lower = interaction_text.lower()
    if "severe" in interaction_lower or "major" in interaction_lower:
        return "High"
    elif "moderate" in interaction_lower or "warning" in interaction_lower:
        return "Medium"
    else:
        return "Low"

def _calculate_overall_risk(interaction_results: List[Dict], dosage_advice: List[DosageAdvice]) -> str:
    """Calculate overall risk level"""
    high_risk_count = 0
    medium_risk_count = 0
    
    # Check interaction risks
    for result in interaction_results:
        if result["interaction"] != "None":
            severity = _extract_severity(result["interaction"])
            if severity == "High":
                high_risk_count += 1
            elif severity == "Medium":
                medium_risk_count += 1
    
    # Check dosage risks
    for advice in dosage_advice:
        if advice.risk_level == "High":
            high_risk_count += 1
        elif advice.risk_level == "Medium":
            medium_risk_count += 1
    
    if high_risk_count > 0:
        return "High"
    elif medium_risk_count > 0:
        return "Medium"
    else:
        return "Low"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
