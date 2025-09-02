import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { drugName, dosage, form } = await request.json()

    if (!drugName) {
      return NextResponse.json({ error: "Drug name is required" }, { status: 400 })
    }

    // Enhanced generic alternatives database with Indian pricing
    const alternativesDatabase: Record<string, any> = {
      amoxicillin: {
        generic: "Amoxicillin Trihydrate",
        price: "₹30 for 10 capsules",
        purpose: "Treats bacterial infections such as respiratory tract infections and urinary tract infections",
        precautions: "Avoid in case of penicillin allergy",
        alternatives: ["Azithromycin", "Cephalexin", "Doxycycline"],
      },
      paracetamol: {
        generic: "Acetaminophen",
        price: "₹15 for 10 tablets",
        purpose: "Pain relief and fever reduction",
        precautions: "Do not exceed 4g per day to avoid liver damage",
        alternatives: ["Ibuprofen", "Aspirin", "Diclofenac"],
      },
      metformin: {
        generic: "Metformin Hydrochloride",
        price: "₹25 for 15 tablets",
        purpose: "Controls blood sugar levels in type 2 diabetes",
        precautions: "Monitor kidney function regularly",
        alternatives: ["Glimepiride", "Pioglitazone", "Sitagliptin"],
      },
      atorvastatin: {
        generic: "Atorvastatin Calcium",
        price: "₹45 for 10 tablets",
        purpose: "Lowers cholesterol and prevents heart disease",
        precautions: "Monitor liver enzymes and muscle pain",
        alternatives: ["Rosuvastatin", "Simvastatin", "Pravastatin"],
      },
    }

    const drugKey = drugName.toLowerCase().replace(/\s+/g, "")
    const alternative = alternativesDatabase[drugKey] || {
      generic: `Generic ${drugName}`,
      price: "₹20-50 (estimated)",
      purpose: "Consult healthcare provider for specific indication",
      precautions: "Follow prescribed dosage and consult doctor",
      alternatives: ["Consult pharmacist for available generics"],
    }

    return NextResponse.json({
      success: true,
      original_drug: drugName,
      dosage,
      form,
      alternative: {
        ...alternative,
        savings: "Up to 70% cost savings with generic alternatives",
      },
    })
  } catch (error) {
    console.error("Alternative medicines error:", error)
    return NextResponse.json({ error: "Failed to find alternatives" }, { status: 500 })
  }
}
