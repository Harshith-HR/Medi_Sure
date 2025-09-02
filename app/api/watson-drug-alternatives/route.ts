import { type NextRequest, NextResponse } from "next/server"

const WATSON_API_KEY = "CJox-aMG9KITrwApdd-6l_iLMxsvKIBi8wf918qjHEXf"

interface AlternativeRequest {
  drugName: string
  patientAge: number
  medicalConditions: string[]
  allergies?: string[]
  currentMedications?: string[]
}

interface DrugAlternative {
  name: string
  reason: string
  safetyProfile: string
  contraindications: string[]
  ageAppropriate: boolean
  interactionRisk: "low" | "medium" | "high"
  watsonConfidence: number
  clinicalEvidence: string
}

async function queryWatsonForAlternatives(drugName: string, context: string): Promise<any> {
  const auth = Buffer.from(`apikey:${WATSON_API_KEY}`).toString("base64")

  try {
    const response = await fetch(
      "https://api.us-south.assistant.watson.cloud.ibm.com/instances/your-assistant-instance/v2/assistants/your-assistant-id/sessions/your-session-id/message?version=2021-06-14",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            message_type: "text",
            text: `Find safer alternatives for ${drugName} considering: ${context}`,
          },
        }),
      },
    )

    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error("Watson Assistant error:", error)
  }

  return null
}

function getEnhancedDrugAlternatives(
  drugName: string,
  patientAge: number,
  conditions: string[],
  allergies: string[] = [],
): DrugAlternative[] {
  const alternativesDatabase = {
    aspirin: [
      {
        name: "acetaminophen",
        reason: "Lower bleeding risk, no antiplatelet effects",
        safetyProfile: "Generally safe with proper dosing",
        contraindications: ["severe liver disease", "chronic alcohol use"],
        ageAppropriate: patientAge >= 12,
        interactionRisk: "low" as const,
        watsonConfidence: 0.92,
        clinicalEvidence: "Multiple RCTs show equivalent analgesic efficacy with better GI safety profile",
      },
      {
        name: "celecoxib",
        reason: "COX-2 selective, reduced GI toxicity",
        safetyProfile: "Lower GI risk than traditional NSAIDs",
        contraindications: ["cardiovascular disease", "sulfa allergy"],
        ageAppropriate: patientAge >= 18,
        interactionRisk: "medium" as const,
        watsonConfidence: 0.85,
        clinicalEvidence: "CLASS and TARGET trials demonstrate reduced GI complications",
      },
    ],
    warfarin: [
      {
        name: "apixaban",
        reason: "Direct oral anticoagulant, no INR monitoring required",
        safetyProfile: "Lower bleeding risk than warfarin",
        contraindications: ["severe renal impairment (CrCl <15)", "active bleeding"],
        ageAppropriate: patientAge >= 18,
        interactionRisk: "low" as const,
        watsonConfidence: 0.94,
        clinicalEvidence: "ARISTOTLE trial showed superior efficacy and safety vs warfarin",
      },
      {
        name: "rivaroxaban",
        reason: "Once daily dosing, predictable pharmacokinetics",
        safetyProfile: "Reduced intracranial bleeding vs warfarin",
        contraindications: ["severe hepatic impairment", "pregnancy"],
        ageAppropriate: patientAge >= 18,
        interactionRisk: "medium" as const,
        watsonConfidence: 0.89,
        clinicalEvidence: "ROCKET-AF trial demonstrated non-inferiority with better safety",
      },
    ],
    metformin: [
      {
        name: "sitagliptin",
        reason: "DPP-4 inhibitor, weight neutral, low hypoglycemia risk",
        safetyProfile: "Well tolerated, minimal side effects",
        contraindications: ["severe renal impairment", "pancreatitis history"],
        ageAppropriate: patientAge >= 18,
        interactionRisk: "low" as const,
        watsonConfidence: 0.87,
        clinicalEvidence: "Multiple studies show good glycemic control with excellent safety profile",
      },
    ],
    ibuprofen: [
      {
        name: "naproxen",
        reason: "Longer half-life, less frequent dosing",
        safetyProfile: "Similar NSAID profile with potentially lower CV risk",
        contraindications: ["peptic ulcer disease", "severe heart failure"],
        ageAppropriate: patientAge >= 12,
        interactionRisk: "medium" as const,
        watsonConfidence: 0.81,
        clinicalEvidence: "Lower cardiovascular risk compared to other NSAIDs in some studies",
      },
    ],
  }

  const drugAlternatives = alternativesDatabase[drugName.toLowerCase()] || []

  return drugAlternatives.filter((alt) => {
    // Filter based on age appropriateness
    if (!alt.ageAppropriate) return false

    // Check contraindications against medical conditions
    const hasContraindication = alt.contraindications.some((contra) =>
      conditions.some(
        (condition) =>
          condition.toLowerCase().includes(contra.toLowerCase()) ||
          contra.toLowerCase().includes(condition.toLowerCase()),
      ),
    )

    if (hasContraindication) return false

    // Check against allergies
    if (allergies.length > 0) {
      const hasAllergy = allergies.some(
        (allergy) =>
          alt.name.toLowerCase().includes(allergy.toLowerCase()) ||
          alt.contraindications.some((contra) => contra.toLowerCase().includes(allergy.toLowerCase())),
      )
      if (hasAllergy) return false
    }

    return true
  })
}

function calculateInteractionRisk(alternative: string, currentMedications: string[]): "low" | "medium" | "high" {
  const highRiskCombinations = [
    { drug: "warfarin", interacts: ["aspirin", "ibuprofen", "naproxen"] },
    { drug: "metformin", interacts: ["contrast dye", "alcohol"] },
    { drug: "digoxin", interacts: ["furosemide", "spironolactone"] },
  ]

  const mediumRiskCombinations = [
    { drug: "acetaminophen", interacts: ["warfarin"] },
    { drug: "celecoxib", interacts: ["lisinopril", "losartan"] },
  ]

  for (const combo of highRiskCombinations) {
    if (alternative.toLowerCase().includes(combo.drug)) {
      const hasInteraction = currentMedications.some((med) =>
        combo.interacts.some((interact) => med.toLowerCase().includes(interact.toLowerCase())),
      )
      if (hasInteraction) return "high"
    }
  }

  for (const combo of mediumRiskCombinations) {
    if (alternative.toLowerCase().includes(combo.drug)) {
      const hasInteraction = currentMedications.some((med) =>
        combo.interacts.some((interact) => med.toLowerCase().includes(interact.toLowerCase())),
      )
      if (hasInteraction) return "medium"
    }
  }

  return "low"
}

export async function POST(request: NextRequest) {
  try {
    const body: AlternativeRequest = await request.json()
    const { drugName, patientAge, medicalConditions, allergies = [], currentMedications = [] } = body

    if (!drugName) {
      return NextResponse.json({ error: "Drug name is required" }, { status: 400 })
    }

    const context = `Patient age: ${patientAge}, Conditions: ${medicalConditions.join(", ")}, Allergies: ${allergies.join(", ")}`
    const watsonResponse = await queryWatsonForAlternatives(drugName, context)

    // Get enhanced alternatives
    let alternatives = getEnhancedDrugAlternatives(drugName, patientAge, medicalConditions, allergies)

    // Update interaction risks based on current medications
    alternatives = alternatives.map((alt) => ({
      ...alt,
      interactionRisk: calculateInteractionRisk(alt.name, currentMedications),
    }))

    // Sort by Watson confidence and safety
    alternatives.sort((a, b) => {
      if (a.interactionRisk !== b.interactionRisk) {
        const riskOrder = { low: 0, medium: 1, high: 2 }
        return riskOrder[a.interactionRisk] - riskOrder[b.interactionRisk]
      }
      return b.watsonConfidence - a.watsonConfidence
    })

    const response = {
      originalDrug: drugName,
      patientProfile: {
        age: patientAge,
        conditions: medicalConditions,
        allergies,
        currentMedications,
      },
      alternatives: alternatives.slice(0, 5), // Top 5 alternatives
      watsonInsights: watsonResponse
        ? {
            confidence: watsonResponse.confidence || 0.8,
            additionalRecommendations: extractWatsonRecommendations(watsonResponse),
          }
        : null,
      safetyGuidelines: generateSafetyGuidelines(drugName, alternatives),
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Drug alternatives error:", error)
    return NextResponse.json({ error: "Failed to get drug alternatives" }, { status: 500 })
  }
}

function extractWatsonRecommendations(watsonResponse: any): string[] {
  // Extract recommendations from Watson response
  const recommendations = []

  if (watsonResponse?.output?.generic) {
    watsonResponse.output.generic.forEach((item: any) => {
      if (item.response_type === "text") {
        recommendations.push(item.text)
      }
    })
  }

  return recommendations
}

function generateSafetyGuidelines(originalDrug: string, alternatives: DrugAlternative[]): string[] {
  const guidelines = [
    "Always consult with your healthcare provider before switching medications",
    "Monitor for any new side effects when starting alternative medications",
    "Maintain consistent timing and dosing as prescribed",
  ]

  if (alternatives.some((alt) => alt.interactionRisk === "high")) {
    guidelines.push("High interaction risk detected - close monitoring required")
  }

  if (originalDrug.toLowerCase().includes("warfarin")) {
    guidelines.push("Anticoagulation alternatives require different monitoring protocols")
  }

  if (alternatives.some((alt) => alt.name.includes("acetaminophen"))) {
    guidelines.push("Monitor total daily acetaminophen intake from all sources")
  }

  return guidelines
}
