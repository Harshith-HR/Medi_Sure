import { type NextRequest, NextResponse } from "next/server"

const GROQ_API_KEY = "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"

export async function POST(request: NextRequest) {
  try {
    const { drugName, patientAge, weight, medicalHistory, currentMedications } = await request.json()

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content:
              "You are a clinical pharmacist providing dosage recommendations. Consider patient age, weight, medical history, and drug interactions. Provide safe, evidence-based dosing guidelines.",
          },
          {
            role: "user",
            content: `Recommend appropriate dosage for ${drugName} for a ${patientAge}-year-old patient weighing ${weight}kg. Medical history: ${medicalHistory?.join(", ") || "None"}. Current medications: ${currentMedications?.join(", ") || "None"}. Include starting dose, maximum dose, frequency, and any special considerations.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data = await response.json()
    const recommendation = data.choices[0].message.content

    return NextResponse.json({
      success: true,
      dosage_plan: {
        drug: drugName,
        patient_age: patientAge,
        weight,
        recommendation,
        generated_at: new Date().toISOString(),
        considerations: recommendation.includes("Considerations:")
          ? recommendation.split("Considerations:")[1]
          : "Follow standard prescribing guidelines",
      },
    })
  } catch (error) {
    console.error("Dosage planning error:", error)
    return NextResponse.json({ success: false, error: "Failed to generate dosage plan" }, { status: 500 })
  }
}
