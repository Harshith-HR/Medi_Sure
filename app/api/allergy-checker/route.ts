import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { allergies, prescriptions } = await request.json()

    if (!allergies || !prescriptions) {
      return NextResponse.json({ error: "Allergies and prescriptions are required" }, { status: 400 })
    }

    const allergyList = Array.isArray(allergies) ? allergies : [allergies]
    const prescriptionList = Array.isArray(prescriptions) ? prescriptions : [prescriptions]

    // Drug allergy database with cross-reactions
    const allergyDatabase: Record<string, any> = {
      penicillin: {
        crossReactions: ["amoxicillin", "ampicillin", "cloxacillin", "flucloxacillin"],
        severity: "severe",
        symptoms: "Rash, hives, difficulty breathing, anaphylaxis",
      },
      sulfa: {
        crossReactions: ["sulfamethoxazole", "trimethoprim-sulfamethoxazole", "furosemide"],
        severity: "moderate to severe",
        symptoms: "Skin rash, fever, liver problems",
      },
      aspirin: {
        crossReactions: ["ibuprofen", "naproxen", "diclofenac", "celecoxib"],
        severity: "moderate",
        symptoms: "Asthma, nasal polyps, skin reactions",
      },
      codeine: {
        crossReactions: ["morphine", "oxycodone", "hydrocodone"],
        severity: "severe",
        symptoms: "Respiratory depression, nausea, constipation",
      },
    }

    const warnings: any[] = []

    // Check each prescription against allergies
    prescriptionList.forEach((prescription: string) => {
      const prescriptionLower = prescription.toLowerCase()

      allergyList.forEach((allergy: string) => {
        const allergyLower = allergy.toLowerCase()

        // Direct match
        if (prescriptionLower.includes(allergyLower)) {
          warnings.push({
            type: "direct",
            severity: "high",
            allergy: allergy,
            prescription: prescription,
            warning: `Direct allergy match: ${prescription} contains ${allergy}`,
            recommendation: `AVOID - Patient is allergic to ${allergy}`,
          })
        }

        // Cross-reaction check
        const allergyData = allergyDatabase[allergyLower]
        if (allergyData) {
          allergyData.crossReactions.forEach((crossReaction: string) => {
            if (prescriptionLower.includes(crossReaction.toLowerCase())) {
              warnings.push({
                type: "cross-reaction",
                severity: allergyData.severity,
                allergy: allergy,
                prescription: prescription,
                crossReaction: crossReaction,
                warning: `${prescription} may cause allergic reaction due to ${allergy} allergy`,
                symptoms: allergyData.symptoms,
                recommendation: `CAUTION - Monitor for allergic reactions. Consider alternative medication.`,
              })
            }
          })
        }
      })
    })

    return NextResponse.json({
      success: true,
      allergies: allergyList,
      prescriptions: prescriptionList,
      warnings,
      safe: warnings.length === 0,
      total_warnings: warnings.length,
      message:
        warnings.length === 0
          ? "No known allergic reactions detected with current prescriptions"
          : `${warnings.length} potential allergic reaction(s) detected`,
    })
  } catch (error) {
    console.error("Allergy checker error:", error)
    return NextResponse.json({ error: "Failed to check allergies" }, { status: 500 })
  }
}
