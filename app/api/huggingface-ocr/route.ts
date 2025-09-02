import { type NextRequest, NextResponse } from "next/server"

const HF_API_KEY = "5e1162223b2e89b1643d52229d2f7c04"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    const imageBuffer = await image.arrayBuffer()

    // Use Hugging Face OCR model
    const response = await fetch("https://api-inference.huggingface.co/models/microsoft/trocr-base-printed", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/octet-stream",
      },
      body: imageBuffer,
    })

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`)
    }

    const result = await response.json()

    // Extract text from the OCR result
    const extractedText = Array.isArray(result) ? result[0]?.generated_text : result.generated_text || ""

    // Use Groq to extract structured drug information from the OCR text
    const drugExtractionResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer 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`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content:
              "Extract drug information from prescription text. Return JSON with drugs array containing name, dosage, frequency, and instructions for each medication.",
          },
          {
            role: "user",
            content: `Extract drug information from this prescription text: "${extractedText}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    })

    let structuredDrugs = []
    if (drugExtractionResponse.ok) {
      const drugData = await drugExtractionResponse.json()
      try {
        const drugInfo = JSON.parse(drugData.choices[0].message.content)
        structuredDrugs = drugInfo.drugs || []
      } catch (e) {
        // Fallback to simple parsing if JSON parsing fails
        structuredDrugs = [{ name: extractedText, dosage: "Unknown", frequency: "Unknown" }]
      }
    }

    return NextResponse.json({
      success: true,
      extracted_text: extractedText,
      drugs: structuredDrugs,
      bounding_boxes: result.bounding_boxes || [],
      confidence: result.confidence || 0.8,
    })
  } catch (error) {
    console.error("OCR processing error:", error)
    return NextResponse.json({ success: false, error: "Failed to process image" }, { status: 500 })
  }
}
