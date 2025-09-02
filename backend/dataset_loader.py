import pandas as pd
import json
from typing import List, Dict, Any
import os
from pathlib import Path

class DatasetLoader:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.data_path = self.base_path / "data"
        self.hoddi_data = None
        self.drug_mapping = None
        self.load_datasets()
    
    def load_datasets(self):
        """Load all required datasets on initialization"""
        try:
            # Load HODDI sample CSV
            hoddi_path = self.data_path / "hoddi_sample.csv"
            if hoddi_path.exists():
                self.hoddi_data = pd.read_csv(hoddi_path)
                print(f"Loaded HODDI dataset with {len(self.hoddi_data)} interactions")
            else:
                print(f"Warning: HODDI sample file not found at {hoddi_path}")
                self.hoddi_data = pd.DataFrame()
            
            # Load drug mapping JSON
            mapping_path = self.data_path / "drug_mapping.json"
            if mapping_path.exists():
                with open(mapping_path, 'r') as f:
                    self.drug_mapping = json.load(f)
                print(f"Loaded drug mapping with {len(self.drug_mapping)} entries")
            else:
                print(f"Warning: Drug mapping file not found at {mapping_path}")
                self.drug_mapping = {}
                
        except Exception as e:
            print(f"Error loading datasets: {e}")
            self.hoddi_data = pd.DataFrame()
            self.drug_mapping = {}
    
    def get_drugbank_id(self, drug_name: str) -> str:
        """Get DrugBank ID for a drug name"""
        drug_name_lower = drug_name.lower().strip()
        
        # Direct mapping lookup
        if drug_name_lower in self.drug_mapping:
            return self.drug_mapping[drug_name_lower]
        
        # Fuzzy matching for common variations
        for mapped_name, drugbank_id in self.drug_mapping.items():
            if drug_name_lower in mapped_name or mapped_name in drug_name_lower:
                return drugbank_id
        
        return f"DB_UNKNOWN_{drug_name.upper()}"
    
    def check_drug_interaction(self, drug1: str, drug2: str) -> str:
        """Check interaction between two drugs using HODDI dataset"""
        if self.hoddi_data.empty:
            return "Dataset not available"
        
        drug1_id = self.get_drugbank_id(drug1)
        drug2_id = self.get_drugbank_id(drug2)
        
        # Check both directions of interaction
        interaction = self.hoddi_data[
            ((self.hoddi_data['drug1_drugbank_id'] == drug1_id) & 
             (self.hoddi_data['drug2_drugbank_id'] == drug2_id)) |
            ((self.hoddi_data['drug1_drugbank_id'] == drug2_id) & 
             (self.hoddi_data['drug2_drugbank_id'] == drug1_id))
        ]
        
        if not interaction.empty:
            severity = interaction.iloc[0].get('severity', 'Unknown')
            description = interaction.iloc[0].get('description', 'Drug interaction detected')
            return f"{severity}: {description}"
        
        return "None"
    
    def get_interaction(self, drugs: List[str]) -> List[Dict[str, Any]]:
        """
        Check interactions for a list of drugs and return formatted results
        
        Args:
            drugs: List of drug names to check for interactions
            
        Returns:
            List of dictionaries with drug info and interaction warnings
        """
        results = []
        
        for i, drug in enumerate(drugs):
            drug_result = {
                "drug": drug.strip(),
                "drugbank_id": self.get_drugbank_id(drug),
                "interaction": "None"
            }
            
            # Check interactions with all other drugs in the list
            interactions = []
            for j, other_drug in enumerate(drugs):
                if i != j:  # Don't check drug against itself
                    interaction = self.check_drug_interaction(drug, other_drug)
                    if interaction != "None":
                        interactions.append(f"with {other_drug}: {interaction}")
            
            if interactions:
                drug_result["interaction"] = "; ".join(interactions)
            
            results.append(drug_result)
        
        return results
    
    def get_dataset_info(self) -> Dict[str, Any]:
        """Get information about loaded datasets"""
        return {
            "hoddi_loaded": not self.hoddi_data.empty,
            "hoddi_records": len(self.hoddi_data) if not self.hoddi_data.empty else 0,
            "drug_mapping_loaded": bool(self.drug_mapping),
            "mapped_drugs": len(self.drug_mapping) if self.drug_mapping else 0
        }

# Global instance for easy import
dataset_loader = DatasetLoader()

# Convenience function for direct use
def get_interaction(drugs: List[str]) -> List[Dict[str, Any]]:
    """Convenience function to get drug interactions"""
    return dataset_loader.get_interaction(drugs)

if __name__ == "__main__":
    # Test the loader
    loader = DatasetLoader()
    print("Dataset Info:", loader.get_dataset_info())
    
    # Test interaction checking
    test_drugs = ["aspirin", "warfarin", "ibuprofen"]
    results = loader.get_interaction(test_drugs)
    
    print("\nTest Results:")
    for result in results:
        print(f"Drug: {result['drug']}")
        print(f"DrugBank ID: {result['drugbank_id']}")
        print(f"Interactions: {result['interaction']}")
        print("-" * 40)
