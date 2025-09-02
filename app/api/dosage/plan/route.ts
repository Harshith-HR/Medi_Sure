import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { patient, drugs } = await request.json()

    // Validate required patient data
    if (!patient.age || !patient.weight) {
      return NextResponse.json(
        { success: false, error: "Missing required patient data: age and weight" },
        { status: 400 },
      )
    }

    // Mock dosage computation with realistic clinical logic
    const recommendations = drugs.map((drug: any) => {
      const standardDose = getStandardDose(drug.name)
      const adjustedDose = calculateAdjustedDose(drug, patient)
      const maxDaily = getMaxDailyDose(drug.name)
      const flag = assessDosageFlag(drug, patient, adjustedDose)

      return {
        drug: drug.name,
        standard_dose: standardDose,
        adjusted_dose: adjustedDose,
        max_daily: maxDaily,
        flag: flag,
        rationale: getDosageRationale(drug, patient, flag),
      }
    })

    // Generate AI summary using Groq
    const aiSummary = await generatePatientSummary(patient, recommendations)

    return NextResponse.json({
      success: true,
      recommendations,
      ai_summary: aiSummary,
      computed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Dosage planning error:", error)
    return NextResponse.json({ success: false, error: "Failed to compute dosage recommendations" }, { status: 500 })
  }
}

function getStandardDose(drugName: string): string {
  const standardDoses: Record<string, string> = {
    metformin: "500mg BID",
    lisinopril: "10mg daily",
    atorvastatin: "20mg daily",
    amlodipine: "5mg daily",
    omeprazole: "20mg daily",
    levothyroxine: "50mcg daily",
    metoprolol: "50mg BID",
    hydrochlorothiazide: "25mg daily",
    simvastatin: "20mg daily",
    losartan: "50mg daily",
  }

  return standardDoses[drugName.toLowerCase()] || "1 tablet daily"
}

function calculateAdjustedDose(drug: any, patient: any): string {
  const age = Number.parseInt(patient.age)
  const weight = Number.parseFloat(patient.weight)
  const drugName = drug.name.toLowerCase()

  // Age-based adjustments
  let adjustment = 1.0
  if (age >= 65) adjustment *= 0.75 // Reduce dose for elderly
  if (age < 18) adjustment *= 0.5 // Reduce dose for pediatric

  // Weight-based adjustments for specific drugs
  if (["metformin", "lisinopril"].includes(drugName) && weight < 50) {
    adjustment *= 0.75
  }

  // Pregnancy/lactation adjustments
  if (patient.pregnancy || patient.lactation) {
    adjustment *= 0.8
  }

  // Lab-based adjustments
  if (patient.labs?.scr && Number.parseFloat(patient.labs.scr) > 1.5) {
    adjustment *= 0.6 // Reduce for kidney impairment
  }

  // Apply adjustment to standard dose
  const standardDose = getStandardDose(drug.name)
  if (adjustment === 1.0) return standardDose

  // Parse and adjust dose
  const doseMatch = standardDose.match(/(\d+(?:\.\d+)?)(mg|mcg)/i)
  if (doseMatch) {
    const originalDose = Number.parseFloat(doseMatch[1])
    const unit = doseMatch[2]
    const adjustedDose = Math.round(originalDose * adjustment * 10) / 10
    return standardDose.replace(doseMatch[0], `${adjustedDose}${unit}`)
  }

  return standardDose
}

function getMaxDailyDose(drugName: string): string {
  const maxDoses: Record<string, string> = {
    metformin: "2000mg",
    lisinopril: "40mg",
    atorvastatin: "80mg",
    amlodipine: "10mg",
    omeprazole: "40mg",
    levothyroxine: "200mcg",
    metoprolol: "400mg",
    hydrochlorothiazide: "50mg",
    simvastatin: "40mg",
    losartan: "100mg",
  }

  return maxDoses[drugName.toLowerCase()] || "See prescribing info"
}

function assessDosageFlag(drug: any, patient: any, adjustedDose: string): string {
  const age = Number.parseInt(patient.age)
  const drugName = drug.name.toLowerCase()

  // Contraindications
  if (patient.pregnancy && ["atorvastatin", "simvastatin", "lisinopril"].includes(drugName)) {
    return "contraindication"
  }

  // Adjustment needed
  if (age >= 65 || (patient.labs?.scr && Number.parseFloat(patient.labs.scr) > 1.5)) {
    return "adjustment"
  }

  // Caution
  if (patient.lactation || age < 18) {
    return "caution"
  }

  return "ok"
}

function getDosageRationale(drug: any, patient: any, flag: string): string {
  const age = Number.parseInt(patient.age)

  switch (flag) {
    case "contraindication":
      return "Contraindicated in pregnancy - consider alternative therapy"
    case "adjustment":
      return age >= 65 ? "Dose reduced for elderly patient" : "Dose adjusted for renal impairment"
    case "caution":
      return "Monitor closely - special population"
    default:
      return "Standard dosing appropriate"
  }
}

async function generatePatientSummary(patient: any, recommendations: any[]): Promise<string> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content:
              "You are a clinical pharmacist explaining medication dosing to patients in simple, reassuring terms. Keep explanations brief and patient-friendly.",
          },
          {
            role: "user",
            content: `Explain these medication recommendations for a ${patient.age}-year-old patient weighing ${patient.weight}kg: ${JSON.stringify(recommendations)}. Focus on why doses were adjusted and what the patient should know.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.choices[0].message.content
    }
  } catch (error) {
    console.error("AI summary generation failed:", error)
  }

  return "Your medication doses have been carefully calculated based on your age, weight, and medical profile. Please follow the adjusted recommendations and consult your healthcare provider if you have any questions."
}
