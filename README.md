# Multi-Modal Drug Safety Analyzer

A comprehensive drug safety analysis tool that analyzes both typed and image-based prescriptions to detect drug interactions, verify dosages based on age, and recommend safe alternative medications. Built with FastAPI backend and Next.js frontend, integrating IBM Granite 3.0 NLP models and OCR for prescription image text recognition.

## 🚀 Features

### Core Functionality
- **Multi-Modal Analysis**: Process both typed prescriptions and prescription images
- **IBM Granite 3.0 NLP**: Advanced drug extraction using ≤3B parameter models
- **Drug Interaction Detection**: Identify potentially harmful drug combinations with severity levels
- **Age-Based Dosage Verification**: Check dosages against age-specific medical guidelines
- **Alternative Medication Suggestions**: Recommend safer drug alternatives when risks detected
- **OCR Integration**: Extract text from prescription images using Tesseract
- **PDF Report Generation**: Downloadable analysis reports for sharing

### Technical Features
- **FastAPI Backend** with async processing
- **Next.js 14 Frontend** with App Router and TypeScript
- **IBM Watson ML Integration** for Granite model access
- **Hugging Face Transformers** fallback support
- **Medical Dataset Integration** (HODDI, DrugBank mapping)
- **RESTful API** with comprehensive error handling

## 📁 Project Structure

\`\`\`
├── backend/
│   ├── main.py                    # FastAPI application
│   ├── nlp_extractor.py          # IBM Granite NLP drug extraction
│   ├── dataset_loader.py         # Medical dataset loading & interaction checks
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Multi-step UI interface
│   │   └── api/
│   │       ├── analyze-prescription/route.ts
│   │       └── generate-pdf/route.ts
│   └── components/ui/
│       └── components.tsx        # Reusable UI components
├── data/
│   ├── hoddi_sample.csv          # Drug interaction dataset
│   ├── drug_mapping.json        # DrugBank ID mappings
│   ├── dosage_guidelines.json   # Age-based dosage guidelines
│   └── drug_alternatives.json   # Alternative medication data
└── README.md
\`\`\`

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 18+
- IBM Watson ML credentials (optional, has fallback)

### Backend Setup

1. **Navigate to backend directory:**
   \`\`\`bash
   cd backend
   \`\`\`

2. **Install Python dependencies:**
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

3. **Set environment variables (optional):**
   \`\`\`bash
   export IBM_WATSON_ML_API_KEY="your_api_key"
   export IBM_WATSON_ML_URL="your_watson_ml_url"
   export IBM_WATSON_ML_PROJECT_ID="your_project_id"
   \`\`\`

### Frontend Setup

1. **Navigate to frontend directory:**
   \`\`\`bash
   cd frontend
   \`\`\`

2. **Install Node.js dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

## 🚀 Running Locally

### Start Backend Server
\`\`\`bash
cd backend
uvicorn main:app --reload
\`\`\`
Backend will be available at: `http://localhost:8000`

### Start Frontend Application
\`\`\`bash
cd frontend
npm run dev
\`\`\`
Frontend will be available at: `http://localhost:3000`

### API Health Check
\`\`\`bash
curl http://localhost:8000/ping
\`\`\`

## 📡 API Usage

### Sample Request
\`\`\`bash
curl -X POST "http://localhost:8000/analyze-prescription" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 45,
    "prescription_text": "Take Paracetamol 500mg twice daily and Ibuprofen 200mg as needed for pain"
  }'
\`\`\`

### Sample Response
\`\`\`json
{
  "extracted_drugs": [
    {
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "twice daily"
    },
    {
      "name": "Ibuprofen", 
      "dosage": "200mg",
      "frequency": "as needed"
    }
  ],
  "interactions": [
    {
      "drug": "Paracetamol",
      "drugbank_id": "DB00316",
      "interaction": "None"
    },
    {
      "drug": "Ibuprofen",
      "drugbank_id": "DB01050", 
      "interaction": "Warning: Combined use with Paracetamol may increase risk of kidney damage with long-term use"
    }
  ],
  "dosage_advice": {
    "age_group": "adult",
    "recommendations": [
      "Paracetamol 500mg twice daily is within safe limits for adults",
      "Monitor Ibuprofen usage - avoid prolonged use without medical supervision"
    ]
  },
  "alternatives": [
    {
      "original": "Ibuprofen",
      "alternative": "Naproxen",
      "reason": "Lower risk of kidney complications when combined with Paracetamol"
    }
  ],
  "safety_score": 75,
  "risk_level": "moderate"
}
\`\`\`

## 🧠 IBM Granite 3.0 Integration

This application leverages **IBM Granite 3.0 models (≤3B parameters)** for advanced natural language processing:

- **Drug Name Extraction**: Identifies medication names from unstructured text
- **Dosage Recognition**: Extracts dosage amounts and units (mg, ml, tablets)
- **Frequency Parsing**: Understands dosing schedules (daily, twice daily, as needed)
- **Medical Context Understanding**: Processes prescription language and medical terminology

The system includes fallback mechanisms using Hugging Face transformers and rule-based extraction for robust performance.

## 🎨 Frontend Features

### Multi-Step Interface
1. **Step 1**: Enter patient age and prescription text with sample prescription option
2. **Step 2**: AI analysis with animated progress indicator
3. **Step 3**: Results displayed in organized cards with risk color-coding

### Advanced UI Elements
- **Dark/Light Theme Toggle**: Modern theme switching
- **Keyword Highlighting**: Extracted drugs highlighted in prescription text
- **Risk Color Coding**: Red (high risk), Yellow (moderate), Green (safe)
- **PDF Export**: Downloadable analysis reports
- **IBM Granite Branding**: "Powered by IBM Granite AI" footer

## ⚠️ Medical Disclaimer

**This tool is for educational and demonstration purposes only.**

- Not intended for actual medical diagnosis or treatment decisions
- Always consult qualified healthcare professionals for medical advice
- Drug interaction data is for demonstration - not comprehensive medical database
- Real medical applications require extensive validation and regulatory approval

## 🔮 Future Enhancements

- Real-time medical database integration (FDA, DrugBank API)
- Advanced OCR with prescription format recognition
- Multi-language prescription support
- Healthcare provider dashboard
- Patient history tracking
- Integration with electronic health records (EHR)
- Clinical decision support system integration

## 🤝 Contributing

This project demonstrates multi-modal AI applications in healthcare. Contributions for educational improvements are welcome.

## 📄 License

MIT License - See LICENSE file for details.

---

**Powered by IBM Granite AI** - Advanced NLP for medical text understanding
