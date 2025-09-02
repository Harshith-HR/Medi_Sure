import { type NextRequest, NextResponse } from "next/server"

interface WatsonAnalysisRequest {
  text: string
  patientAge?: number
  medicalHistory?: string[]
}

interface DrugEntity {
  text: string
  type: string
  confidence: number
  mentions: Array<{
    text: string
    location: [number, number]
  }>
}

interface WatsonResponse {
  entities: DrugEntity[]
  sentiment: {
    document: {
      score: number
      label: string
    }
  }
  concepts: Array<{
    text: string
    relevance: number
    dbpedia_resource?: string
  }>
  keywords: Array<{
    text: string
    relevance: number
    emotion?: {
      sadness: number
      joy: number
      fear: number
      disgust: number
      anger: number
    }
  }>
}

async function mockWatsonAnalysis(text: string): Promise<WatsonResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Extract potential drug names using simple pattern matching
  const drugPatterns = [
    /\b(aspirin|ibuprofen|acetaminophen|tylenol|advil|motrin)\b/gi,
    /\b(lisinopril|metformin|atorvastatin|amlodipine|metoprolol)\b/gi,
    /\b(omeprazole|levothyroxine|albuterol|prednisone|warfarin)\b/gi,
    /\b(gabapentin|tramadol|hydrocodone|oxycodone|morphine)\b/gi,
  ]

  const entities: DrugEntity[] = []
  const foundDrugs = new Set<string>()

  drugPatterns.forEach((pattern) => {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach((match) => {
        if (!foundDrugs.has(match.toLowerCase())) {
          foundDrugs.add(match.toLowerCase())
          entities.push({
            text: match,
            type: "DRUG",
            confidence: 0.85 + Math.random() * 0.1,
            mentions: [
              {
                text: match,
                location: [text.indexOf(match), text.indexOf(match) + match.length],
              },
            ],
          })
        }
      })
    }
  })

  // Generate realistic sentiment analysis
  const hasNegativeWords = /\b(pain|severe|emergency|urgent|critical)\b/i.test(text)
  const sentiment = {
    document: {
      score: hasNegativeWords ? -0.3 - Math.random() * 0.4 : 0.1 + Math.random() * 0.3,
      label: hasNegativeWords ? "negative" : "neutral",
    },
  }

  // Generate medical concepts
  const concepts = [
    { text: "medication", relevance: 0.9, dbpedia_resource: "http://dbpedia.org/resource/Medication" },
    { text: "dosage", relevance: 0.8 },
    { text: "side effects", relevance: 0.7 },
    { text: "drug interaction", relevance: 0.6 },
  ]

  // Generate keywords with emotions
  const keywords = entities.map((entity) => ({
    text: entity.text,
    relevance: entity.confidence,
    emotion: {
      sadness: Math.random() * 0.3,
      joy: Math.random() * 0.2,
      fear: hasNegativeWords ? Math.random() * 0.4 : Math.random() * 0.1,
      disgust: Math.random() * 0.1,
      anger: Math.random() * 0.1,
    },
  }))

  return {
    entities,
    sentiment,
    concepts,
    keywords,
  }
}

async function getDrugAlternatives(drugName: string, patientAge: number, medicalHistory: string[]): Promise<any[]> {
  return getEnhancedAlternatives(drugName, patientAge, medicalHistory)
}

function getEnhancedAlternatives(drugName: string, patientAge: number, medicalHistory: string[]): any[] {
  const alternatives = [
    {
      original: "aspirin",
      alternatives: [
        {
          drug: "acetaminophen",
          reason: "Lower bleeding risk, suitable for pain relief",
          contraindications: ["liver disease"],
          ageAppropriate: patientAge >= 12,
          watsonConfidence: 0.85,
        },
        {
          drug: "celecoxib",
          reason: "COX-2 selective, reduced GI risk",
          contraindications: ["cardiovascular disease"],
          ageAppropriate: patientAge >= 18,
          watsonConfidence: 0.78,
        },
      ],
    },
    {
      original: "ibuprofen",
      alternatives: [
        {
          drug: "naproxen",
          reason: "Longer duration of action, less frequent dosing",
          contraindications: ["kidney disease", "heart failure"],
          ageAppropriate: patientAge >= 12,
          watsonConfidence: 0.82,
        },
        {
          drug: "acetaminophen",
          reason: "Safer for stomach, no anti-inflammatory effect",
          contraindications: ["liver disease"],
          ageAppropriate: patientAge >= 6,
          watsonConfidence: 0.79,
        },
      ],
    },
    {
      original: "warfarin",
      alternatives: [
        {
          drug: "apixaban",
          reason: "No routine monitoring required, fewer drug interactions",
          contraindications: ["severe renal impairment"],
          ageAppropriate: patientAge >= 18,
          watsonConfidence: 0.92,
        },
        {
          drug: "rivaroxaban",
          reason: "Once daily dosing, predictable anticoagulation",
          contraindications: ["severe hepatic impairment"],
          ageAppropriate: patientAge >= 18,
          watsonConfidence: 0.88,
        },
      ],
    },
    {
      original: "metformin",
      alternatives: [
        {
          drug: "sitagliptin",
          reason: "Lower risk of hypoglycemia, weight neutral",
          contraindications: ["pancreatitis history"],
          ageAppropriate: patientAge >= 18,
          watsonConfidence: 0.86,
        },
        {
          drug: "empagliflozin",
          reason: "Cardiovascular benefits, weight loss",
          contraindications: ["diabetic ketoacidosis risk"],
          ageAppropriate: patientAge >= 18,
          watsonConfidence: 0.84,
        },
      ],
    },
  ]

  const drugAlternatives = alternatives.find((alt) => alt.original.toLowerCase() === drugName.toLowerCase())

  if (drugAlternatives) {
    return drugAlternatives.alternatives.filter((alt) => {
      // Filter based on age appropriateness and medical history
      if (!alt.ageAppropriate) return false

      // Check contraindications against medical history
      const hasContraindication = alt.contraindications.some((contra) =>
        medicalHistory.some((condition) => condition.toLowerCase().includes(contra.toLowerCase())),
      )

      return !hasContraindication
    })
  }

  return []
}

async function calculateSafetyScore(
  drugs: string[],
  patientAge: number,
  watsonAnalysis: WatsonResponse,
): Promise<number> {
  let score = 100

  // Deduct points based on Watson sentiment analysis
  if (watsonAnalysis.sentiment.document.label === "negative") {
    score -= Math.abs(watsonAnalysis.sentiment.document.score) * 20
  }

  // Deduct points for high-risk drug entities detected by Watson
  watsonAnalysis.entities.forEach((entity) => {
    if (entity.type === "DRUG" && entity.confidence > 0.8) {
      // Check if it's a high-risk drug
      const highRiskDrugs = ["warfarin", "digoxin", "lithium", "phenytoin"]
      if (highRiskDrugs.some((drug) => entity.text.toLowerCase().includes(drug))) {
        score -= 15
      }
    }
  })

  // Age-based adjustments
  if (patientAge < 18) {
    score -= 10 // Pediatric patients need extra caution
  } else if (patientAge > 65) {
    score -= 8 // Elderly patients have higher risk
  }

  // Watson keyword emotion analysis
  watsonAnalysis.keywords.forEach((keyword) => {
    if (keyword.emotion) {
      if (keyword.emotion.fear > 0.5 || keyword.emotion.anger > 0.5) {
        score -= 5
      }
    }
  })

  return Math.max(0, Math.min(100, score))
}

export async function POST(request: NextRequest) {
  try {
    const body: WatsonAnalysisRequest = await request.json()
    const { text, patientAge = 30, medicalHistory = [] } = body

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const watsonAnalysis = await mockWatsonAnalysis(text)

    // Extract drug entities from Watson analysis
    const drugEntities = watsonAnalysis.entities.filter(
      (entity) => entity.type === "DRUG" || entity.type === "MEDICATION",
    )

    // Get alternatives for each drug using enhanced rule-based system
    const alternatives = []
    for (const entity of drugEntities) {
      const drugAlternatives = await getDrugAlternatives(entity.text, patientAge, medicalHistory)
      if (drugAlternatives.length > 0) {
        alternatives.push({
          original: entity.text,
          alternatives: drugAlternatives,
          confidence: entity.confidence,
        })
      }
    }

    // Calculate enhanced safety score
    const drugs = drugEntities.map((entity) => entity.text)
    const safetyScore = await calculateSafetyScore(drugs, patientAge, watsonAnalysis)

    // Generate insights using Watson concepts
    const insights = watsonAnalysis.concepts.map((concept) => ({
      concept: concept.text,
      relevance: concept.relevance,
      recommendation: generateRecommendation(concept.text, patientAge),
    }))

    const response = {
      watsonAnalysis: {
        entities: drugEntities,
        sentiment: watsonAnalysis.sentiment,
        concepts: watsonAnalysis.concepts,
        keywords: watsonAnalysis.keywords,
      },
      drugAlternatives: alternatives,
      safetyScore,
      insights,
      recommendations: generatePersonalizedRecommendations(drugs, patientAge, medicalHistory),
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Watson analytics error:", error)
    return NextResponse.json(
      {
        error: `Failed to analyze with Watson AI: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}

function generateRecommendation(concept: string, patientAge: number): string {
  const recommendations = {
    medication: patientAge > 65 ? "Consider reduced dosages for elderly patients" : "Follow standard dosing guidelines",
    "side effects": "Monitor for adverse reactions and report to healthcare provider",
    "drug interaction": "Review all medications with pharmacist before starting new treatments",
    dosage: "Ensure proper timing and administration as prescribed",
  }

  return recommendations[concept.toLowerCase()] || "Consult healthcare provider for personalized advice"
}

function generatePersonalizedRecommendations(drugs: string[], patientAge: number, medicalHistory: string[]): string[] {
  const recommendations = []

  if (patientAge > 65) {
    recommendations.push("Elderly patients should have regular medication reviews")
    recommendations.push("Consider pill organizers to improve medication adherence")
  }

  if (patientAge < 18) {
    recommendations.push("Pediatric dosing requires careful calculation based on weight")
    recommendations.push("Liquid formulations may be preferred for children")
  }

  if (medicalHistory.includes("diabetes")) {
    recommendations.push("Monitor blood glucose levels when starting new medications")
  }

  if (medicalHistory.includes("hypertension")) {
    recommendations.push("Regular blood pressure monitoring is recommended")
  }

  if (drugs.length > 3) {
    recommendations.push("Multiple medications increase interaction risk - consider medication review")
  }

  return recommendations
}
