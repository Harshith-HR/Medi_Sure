from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import json
import os

app = FastAPI(title="Drug Interaction Detection API", version="1.0.0")

class PatientData(BaseModel):
    patient_age: int
    drug_name: str
    weight: Optional[float] = None
    gender: Optional[str] = None
    medical_conditions: Optional[str] = None

class DosageRecommendation(BaseModel):
    dosage_range: str
    frequency: str
    safety_score: int
    warnings: List[str]
    interactions: List[str]
    alternatives: List[str]
    explanation: str

# Mock drug database
DRUG_DATABASE = {
    "warfarin": {
        "base_dose": 5,
        "elderly_reduction": 0.5,
        "interactions": ["aspirin", "ibuprofen"],
        "warnings": ["Monitor INR levels", "Bleeding risk"],
        "alternatives": ["apixaban", "rivaroxaban"]
    },
    "aspirin": {
        "base_dose": 81,
        "elderly_reduction": 1.0,
        "interactions": ["warfarin", "ibuprofen"],
        "warnings": ["GI bleeding risk", "Avoid with peptic ulcers"],
        "alternatives": ["clopidogrel"]
    },
    "metformin": {
        "base_dose": 500,
        "elderly_reduction": 0.75,
        "interactions": [],
        "warnings": ["Monitor kidney function", "Lactic acidosis risk"],
        "alternatives": ["sitagliptin"]
    }
}

def calculate_dosage(drug_name: str, age: int, weight: Optional[float] = None) -> dict:
    """Calculate age-appropriate dosage"""
    drug_name_lower = drug_name.lower()
    
    if drug_name_lower not in DRUG_DATABASE:
        return {
            "dosage_range": "Consult physician",
            "frequency": "As prescribed",
            "safety_score": 50,
            "warnings": ["Unknown drug - consult healthcare provider"],
            "interactions": [],
            "alternatives": [],
            "explanation": "Drug not found in database"
        }
    
    drug_info = DRUG_DATABASE[drug_name_lower]
    base_dose = drug_info["base_dose"]
    
    # Age-based adjustments
    if age >= 65:
        adjusted_dose = base_dose * drug_info["elderly_reduction"]
        frequency = "once daily"
        safety_score = 72
        warnings = drug_info["warnings"] + ["Reduce dose for elderly patients"]
    else:
        adjusted_dose = base_dose
        frequency = "twice daily"
        safety_score = 85
        warnings = drug_info["warnings"]
    
    # Weight-based adjustments for pediatric patients
    if age < 18 and weight:
        adjusted_dose = min(adjusted_dose, weight * 2)  # Max 2mg/kg
        warnings.append("Pediatric dosing - monitor closely")
    
    dosage_range = f"{int(adjusted_dose * 0.8)}-{int(adjusted_dose * 1.2)} mg"
    
    return {
        "dosage_range": dosage_range,
        "frequency": frequency,
        "safety_score": safety_score,
        "warnings": warnings,
        "interactions": [f"{drug_name} + {interaction}: Potential interaction" 
                        for interaction in drug_info["interactions"]],
        "alternatives": drug_info["alternatives"],
        "explanation": f"Dosage calculated based on age ({age}) and standard protocols"
    }

@app.post("/dose/recommend", response_model=DosageRecommendation)
async def recommend_dosage(patient_data: PatientData):
    """Main endpoint for dosage recommendations"""
    try:
        result = calculate_dosage(
            patient_data.drug_name,
            patient_data.patient_age,
            patient_data.weight
        )
        
        return DosageRecommendation(**result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Drug Interaction Detection API is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
