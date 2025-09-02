import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { ageYears, ageMonths, gender } = await request.json()

    if (ageYears === undefined && ageMonths === undefined) {
      return NextResponse.json({ error: "Age is required" }, { status: 400 })
    }

    const totalMonths = (ageYears || 0) * 12 + (ageMonths || 0)

    // WHO/CDC immunization schedule
    const vaccineSchedule: Record<string, any[]> = {
      "0": [
        {
          name: "BCG",
          purpose: "Protects against tuberculosis",
          schedule: "At birth",
          notes: "Single dose, given within 24 hours of birth",
        },
        {
          name: "Hepatitis B",
          purpose: "Protects against hepatitis B virus",
          schedule: "At birth",
          notes: "First dose within 24 hours, especially if mother is HBsAg positive",
        },
      ],
      "2": [
        {
          name: "DTP (Diphtheria, Tetanus, Pertussis)",
          purpose: "Protects against diphtheria, tetanus, and whooping cough",
          schedule: "1st dose at 2 months",
          notes: "Mild fever may occur after vaccination",
        },
        {
          name: "IPV (Inactivated Polio Vaccine)",
          purpose: "Protects against poliomyelitis",
          schedule: "1st dose at 2 months",
          notes: "Part of routine immunization schedule",
        },
        {
          name: "Hib (Haemophilus influenzae type b)",
          purpose: "Protects against serious bacterial infections",
          schedule: "1st dose at 2 months",
          notes: "Prevents meningitis and pneumonia",
        },
      ],
      "4": [
        {
          name: "DTP",
          purpose: "Protects against diphtheria, tetanus, and whooping cough",
          schedule: "2nd dose at 4 months",
          notes: "Continue series as scheduled",
        },
        {
          name: "IPV",
          purpose: "Protects against poliomyelitis",
          schedule: "2nd dose at 4 months",
          notes: "Continue series as scheduled",
        },
      ],
      "6": [
        {
          name: "DTP",
          purpose: "Protects against diphtheria, tetanus, and whooping cough",
          schedule: "3rd dose at 6 months",
          notes: "Complete primary series",
        },
        {
          name: "Hepatitis B",
          purpose: "Protects against hepatitis B virus",
          schedule: "2nd dose at 6 months",
          notes: "Continue series",
        },
      ],
      "12": [
        {
          name: "MMR (Measles, Mumps, Rubella)",
          purpose: "Protects against measles, mumps, and rubella",
          schedule: "1st dose at 12 months",
          notes: "Live vaccine, may cause mild fever and rash",
        },
        {
          name: "Varicella (Chickenpox)",
          purpose: "Protects against chickenpox",
          schedule: "1st dose at 12 months",
          notes: "Live vaccine, avoid in immunocompromised",
        },
      ],
      "180": [
        // 15 years
        {
          name: "Td (Tetanus, Diphtheria)",
          purpose: "Booster for tetanus and diphtheria",
          schedule: "Every 10 years after age 15",
          notes: "Important for wound protection",
        },
      ],
      "780": [
        // 65 years
        {
          name: "Influenza",
          purpose: "Protects against seasonal flu",
          schedule: "Annual vaccination",
          notes: "Especially important for seniors",
        },
        {
          name: "Pneumococcal",
          purpose: "Protects against pneumonia and meningitis",
          schedule: "One-time dose at 65+",
          notes: "Reduces risk of serious pneumococcal disease",
        },
      ],
    }

    // Find appropriate vaccines based on age
    let recommendations: any[] = []

    // Check exact age matches
    if (vaccineSchedule[totalMonths.toString()]) {
      recommendations = [...vaccineSchedule[totalMonths.toString()]]
    }

    // Add age-range recommendations
    if (totalMonths >= 12 && totalMonths < 24) {
      recommendations.push(...(vaccineSchedule["12"] || []))
    } else if (totalMonths >= 180 && totalMonths < 780) {
      recommendations.push(...(vaccineSchedule["180"] || []))
    } else if (totalMonths >= 780) {
      recommendations.push(...(vaccineSchedule["780"] || []))
    }

    // Gender-specific recommendations
    if (gender === "female" && totalMonths >= 108 && totalMonths <= 312) {
      // 9-26 years
      recommendations.push({
        name: "HPV (Human Papillomavirus)",
        purpose: "Protects against cervical cancer and genital warts",
        schedule: "2-3 doses between ages 9-26",
        notes: "Most effective when given before sexual activity begins",
      })
    }

    // If no specific recommendations, provide general guidance
    if (recommendations.length === 0) {
      recommendations = [
        {
          name: "Routine Check-up",
          purpose: "Consult healthcare provider for age-appropriate vaccines",
          schedule: "As recommended by healthcare provider",
          notes: "Vaccination needs vary by age, health status, and travel plans",
        },
      ]
    }

    return NextResponse.json({
      success: true,
      age: { years: ageYears || 0, months: ageMonths || 0 },
      gender,
      recommendations,
      total_vaccines: recommendations.length,
    })
  } catch (error) {
    console.error("Vaccine recommendations error:", error)
    return NextResponse.json({ error: "Failed to get vaccine recommendations" }, { status: 500 })
  }
}
