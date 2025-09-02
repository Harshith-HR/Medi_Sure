import { type NextRequest, NextResponse } from "next/server"

const DRUG_INTERACTIONS = [
  {
    drug1: "warfarin",
    drug2: "aspirin",
    severity: "Dangerous",
    mechanism: "Both drugs affect blood clotting mechanisms",
    clinical_significance: "Significantly increased bleeding risk",
    recommendations: "Avoid combination. If necessary, use lowest effective doses and monitor INR closely",
    monitoring: "INR, bleeding signs, complete blood count",
    alternatives: "Consider acetaminophen for pain relief instead of aspirin",
    confidence: "High",
  },
  {
    drug1: "metformin",
    drug2: "alcohol",
    severity: "Caution",
    mechanism: "Both can affect lactate metabolism",
    clinical_significance: "Increased risk of lactic acidosis",
    recommendations: "Limit alcohol consumption, monitor for symptoms of lactic acidosis",
    monitoring: "Lactate levels, kidney function, liver function",
    alternatives: "Consider other antidiabetic medications if alcohol use is frequent",
    confidence: "High",
  },
  {
    drug1: "lisinopril",
    drug2: "potassium",
    severity: "Caution",
    mechanism: "ACE inhibitors reduce potassium excretion",
    clinical_significance: "Risk of hyperkalemia",
    recommendations: "Monitor potassium levels regularly, adjust potassium supplementation",
    monitoring: "Serum potassium, kidney function",
    alternatives: "Use potassium-sparing diuretics with caution",
    confidence: "High",
  },
  {
    drug1: "simvastatin",
    drug2: "grapefruit",
    severity: "Dangerous",
    mechanism: "Grapefruit inhibits CYP3A4 enzyme, increasing statin levels",
    clinical_significance: "Increased risk of muscle toxicity and rhabdomyolysis",
    recommendations: "Avoid grapefruit juice completely while on simvastatin",
    monitoring: "Muscle pain, CK levels, liver enzymes",
    alternatives: "Switch to pravastatin or rosuvastatin (less affected by grapefruit)",
    confidence: "High",
  },
  {
    drug1: "digoxin",
    drug2: "furosemide",
    severity: "Caution",
    mechanism: "Furosemide can cause hypokalemia, increasing digoxin toxicity",
    clinical_significance: "Increased risk of digoxin toxicity",
    recommendations: "Monitor potassium levels and digoxin levels closely",
    monitoring: "Digoxin levels, potassium, magnesium, kidney function",
    alternatives: "Consider potassium-sparing diuretics",
    confidence: "High",
  },
  {
    drug1: "phenytoin",
    drug2: "warfarin",
    severity: "Caution",
    mechanism: "Phenytoin can increase warfarin metabolism initially, then inhibit it",
    clinical_significance: "Unpredictable effects on anticoagulation",
    recommendations: "Monitor INR frequently when starting or stopping phenytoin",
    monitoring: "INR, phenytoin levels, bleeding signs",
    alternatives: "Consider alternative anticonvulsants or anticoagulants",
    confidence: "High",
  },
  {
    drug1: "omeprazole",
    drug2: "clopidogrel",
    severity: "Caution",
    mechanism: "Omeprazole inhibits CYP2C19, reducing clopidogrel activation",
    clinical_significance: "Reduced antiplatelet effect of clopidogrel",
    recommendations: "Use alternative PPI like pantoprazole, or H2 blocker",
    monitoring: "Cardiovascular events, platelet function if available",
    alternatives: "Pantoprazole, famotidine, or ranitidine",
    confidence: "High",
  },
]

function normalizedrugName(drugName: string): string {
  return drugName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
}

function findInteraction(drug1: string, drug2: string) {
  const normalizedDrug1 = normalizedrugName(drug1)
  const normalizedDrug2 = normalizedrugName(drug2)

  return DRUG_INTERACTIONS.find((interaction) => {
    const interactionDrug1 = normalizedrugName(interaction.drug1)
    const interactionDrug2 = normalizedrugName(interaction.drug2)

    return (
      (interactionDrug1 === normalizedDrug1 && interactionDrug2 === normalizedDrug2) ||
      (interactionDrug1 === normalizedDrug2 && interactionDrug2 === normalizedDrug1)
    )
  })
}

function getAgeSpecificRecommendations(patientAge: number, interaction: any) {
  let ageSpecificNote = ""

  if (patientAge >= 65) {
    ageSpecificNote =
      " Elderly patients may be at higher risk due to decreased drug clearance and multiple comorbidities."
  } else if (patientAge < 18) {
    ageSpecificNote = " Pediatric patients may have different drug metabolism and require adjusted monitoring."
  }

  return interaction.recommendations + ageSpecificNote
}

export async function POST(request: NextRequest) {
  try {
    const { drug1, drug2, patientAge, medicalHistory } = await request.json()

    if (!drug1 || !drug2) {
      return NextResponse.json(
        {
          success: false,
          error: "Both drug names are required",
        },
        { status: 400 },
      )
    }

    const interaction = findInteraction(drug1, drug2)

    if (interaction) {
      const ageSpecificRecommendations = getAgeSpecificRecommendations(patientAge || 30, interaction)

      return NextResponse.json({
        success: true,
        interaction: {
          drug1,
          drug2,
          patientAge: patientAge || 30,
          medicalHistory: medicalHistory || [],
          severity: interaction.severity,
          mechanism: interaction.mechanism,
          clinicalSignificance: interaction.clinical_significance,
          recommendations: ageSpecificRecommendations,
          monitoring: interaction.monitoring,
          alternatives: interaction.alternatives,
          confidence: interaction.confidence,
          fullAnalysis: `Drug Interaction Analysis: ${drug1} + ${drug2}\n\nSeverity: ${interaction.severity}\nMechanism: ${interaction.mechanism}\nClinical Significance: ${interaction.clinical_significance}\nRecommendations: ${ageSpecificRecommendations}\nMonitoring: ${interaction.monitoring}\nAlternatives: ${interaction.alternatives}`,
          timestamp: new Date().toISOString(),
          source: "Local Drug Interaction Database",
        },
      })
    } else {
      return NextResponse.json({
        success: true,
        interaction: {
          drug1,
          drug2,
          patientAge: patientAge || 30,
          medicalHistory: medicalHistory || [],
          severity: "Safe",
          mechanism: "No known significant interaction mechanism identified",
          clinicalSignificance: "No clinically significant interaction found in database",
          recommendations:
            "No specific precautions required based on current database. However, always consult healthcare provider for comprehensive medication review.",
          monitoring: "Standard monitoring as per individual drug requirements",
          alternatives: "No alternatives needed due to interaction",
          confidence: "Medium",
          fullAnalysis: `Drug Interaction Analysis: ${drug1} + ${drug2}\n\nNo significant interaction found in database.\nBoth medications appear to be safe to use together based on available data.\nContinue standard monitoring for each medication individually.`,
          timestamp: new Date().toISOString(),
          source: "Local Drug Interaction Database",
        },
      })
    }
  } catch (error) {
    console.error("Interaction check error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to analyze drug interaction",
      },
      { status: 500 },
    )
  }
}
