import { type NextRequest, NextResponse } from "next/server"

// Mock drug interaction database
const DRUG_INTERACTIONS = [
  {
    drug1: "warfarin",
    drug2: "aspirin",
    severity: "high" as const,
    description: "Increased risk of bleeding. Monitor INR closely and consider dose adjustment.",
  },
  {
    drug1: "metformin",
    drug2: "alcohol",
    severity: "moderate" as const,
    description: "May increase risk of lactic acidosis. Limit alcohol consumption.",
  },
  {
    drug1: "lisinopril",
    drug2: "potassium",
    severity: "moderate" as const,
    description: "May cause hyperkalemia. Monitor potassium levels regularly.",
  },
  {
    drug1: "simvastatin",
    drug2: "grapefruit",
    severity: "high" as const,
    description: "Grapefruit increases statin levels, raising risk of muscle toxicity.",
  },
]

// Mock dosage guidelines by age
const DOSAGE_GUIDELINES = {
  acetaminophen: { maxDaily: { adult: 4000, elderly: 3000, child: 75 } },
  ibuprofen: { maxDaily: { adult: 3200, elderly: 2400, child: 40 } },
  aspirin: { maxDaily: { adult: 4000, elderly: 2600, child: 0 } },
}

// Mock alternative medications
const ALTERNATIVES = [
  {
    original: "aspirin",
    alternative: "acetaminophen",
    reason: "Lower bleeding risk, suitable for pain relief",
  },
  {
    original: "ibuprofen",
    alternative: "acetaminophen",
    reason: "Better for elderly patients, less GI irritation",
  },
]

function extractDrugsFromText(text: string): string[] {
  const commonDrugs = [
    "acetaminophen",
    "ibuprofen",
    "aspirin",
    "warfarin",
    "metformin",
    "lisinopril",
    "simvastatin",
    "atorvastatin",
    "omeprazole",
    "levothyroxine",
    "amlodipine",
    "metoprolol",
    "hydrochlorothiazide",
    "prednisone",
    "albuterol",
  ]

  const foundDrugs: string[] = []
  const lowerText = (text || "").toLowerCase()

  commonDrugs.forEach((drug) => {
    if (lowerText.includes(drug)) {
      foundDrugs.push(drug)
    }
  })

  return foundDrugs
}

function checkInteractions(drugs: string[]) {
  const interactions = []

  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const interaction = DRUG_INTERACTIONS.find(
        (int) =>
          (int.drug1 === drugs[i] && int.drug2 === drugs[j]) || (int.drug1 === drugs[j] && int.drug2 === drugs[i]),
      )
      if (interaction) {
        interactions.push(interaction)
      }
    }
  }

  return interactions
}

function checkDosageWarnings(drugs: string[], age: number) {
  const warnings = []
  const ageGroup = age >= 65 ? "elderly" : age >= 18 ? "adult" : "child"

  drugs.forEach((drug) => {
    if (drug === "aspirin" && age < 18) {
      warnings.push({
        drug,
        warning: "Not recommended for children under 18 due to Reye syndrome risk",
      })
    }
    if (drug === "ibuprofen" && age >= 65) {
      warnings.push({
        drug,
        warning: "Use with caution in elderly patients - increased GI and cardiovascular risks",
      })
    }
  })

  return warnings
}

function getSaferAlternatives(drugs: string[]) {
  return ALTERNATIVES.filter((alt) => drugs.includes(alt.original))
}

function calculateSafetyScore(drugs: string[], interactions: any[], warnings: any[]) {
  let score = 100

  // Deduct points for interactions
  interactions.forEach((interaction) => {
    if (interaction.severity === "high") score -= 30
    else if (interaction.severity === "moderate") score -= 15
    else score -= 5
  })

  // Deduct points for warnings
  warnings.forEach(() => (score -= 10))

  return Math.max(0, score)
}

// Mock OCR function
async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  // In a real implementation, this would use OCR like Tesseract.js
  // For demo purposes, return mock prescription text
  return "Prescription: Acetaminophen 500mg twice daily, Ibuprofen 400mg as needed for pain"
}

export async function POST(request: NextRequest) {
  try {
    let text = ""
    let patientAge = 30

    const contentType = request.headers.get("content-type")

    if (contentType?.includes("multipart/form-data")) {
      // Handle image upload
      const formData = await request.formData()
      const image = formData.get("image") as File
      const ageStr = formData.get("patientAge") as string

      if (image) {
        const buffer = Buffer.from(await image.arrayBuffer())
        text = await extractTextFromImage(buffer)
      }

      patientAge = Number.parseInt(ageStr) || 30
    } else {
      // Handle JSON request
      const body = await request.json()
      text = body.text || ""
      patientAge = body.patientAge || 30
    }

    if (!text || typeof text !== "string") {
      text = ""
    }

    // Extract drugs from text
    const drugs = extractDrugsFromText(text)

    // Check for interactions
    const interactions = checkInteractions(drugs)

    // Check dosage warnings
    const dosageWarnings = checkDosageWarnings(drugs, patientAge)

    // Get safer alternatives
    const alternatives = getSaferAlternatives(drugs)

    // Calculate safety score
    const safetyScore = calculateSafetyScore(drugs, interactions, dosageWarnings)

    const result = {
      drugs,
      interactions,
      dosageWarnings,
      alternatives,
      safetyScore,
      extractedText: text,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze prescription" }, { status: 500 })
  }
}
