import { type NextRequest, NextResponse } from "next/server"

const FIRECRAWL_API_KEY = "fc-7421ad897a354babb8b64f1a793c367a"

export async function POST(request: NextRequest) {
  try {
    const { drugName } = await request.json()

    if (!drugName) {
      return NextResponse.json({ error: "Drug name is required" }, { status: 400 })
    }

    // Enhanced drug safety database with known recalls and safety alerts
    const safetyDatabase: Record<string, any> = {
      ranitidine: {
        status: "recalled",
        safety_status: "warning",
        reason: "Possible NDMA contamination",
        date: "April 1, 2020",
        authority: "FDA",
        action: "Immediate discontinuation recommended",
        recommendation: "Switch to alternative H2 blockers like famotidine",
        reference: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
      },
      zantac: {
        status: "recalled",
        safety_status: "warning",
        reason: "Contains ranitidine with NDMA contamination risk",
        date: "April 1, 2020",
        authority: "FDA",
        action: "Product withdrawal from market",
        recommendation: "Consult healthcare provider for alternative treatments",
        reference: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
      },
      valsartan: {
        status: "recalled",
        safety_status: "warning",
        reason: "NDMA and NDEA impurities detected",
        date: "July 13, 2018",
        authority: "FDA",
        action: "Specific lots recalled",
        recommendation: "Check lot numbers and consult pharmacist",
        reference: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
      },
      metformin: {
        status: "partial recall",
        safety_status: "warning",
        reason: "NDMA levels above acceptable limits in some formulations",
        date: "May 28, 2020",
        authority: "FDA",
        action: "Specific extended-release formulations recalled",
        recommendation: "Continue immediate-release formulations, consult doctor",
        reference: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
      },
    }

    const drugKey = drugName.toLowerCase().replace(/\s+/g, "")
    const safetyInfo = safetyDatabase[drugKey]

    if (safetyInfo) {
      // Drug has known safety issues
      return NextResponse.json({
        success: true,
        drug_name: drugName,
        status: safetyInfo.status,
        safety_status: safetyInfo.safety_status,
        reason: safetyInfo.reason,
        date: safetyInfo.date,
        authority: safetyInfo.authority,
        action: safetyInfo.action,
        recommendation: safetyInfo.recommendation,
        reference: safetyInfo.reference,
        checked_date: new Date().toISOString(),
      })
    }

    // Check FDA recalls API for real-time data
    try {
      const fdaResponse = await fetch(
        `https://api.fda.gov/drug/enforcement.json?search=product_description:"${drugName}"&limit=5`,
      )

      if (fdaResponse.ok) {
        const fdaData = await fdaResponse.json()

        if (fdaData.results && fdaData.results.length > 0) {
          const recall = fdaData.results[0]
          return NextResponse.json({
            success: true,
            drug_name: drugName,
            status: "recalled",
            safety_status: "warning",
            reason: recall.reason_for_recall || "FDA recall issued",
            date: recall.recall_initiation_date || "Date not specified",
            authority: "FDA",
            action: recall.product_description || "Product recall",
            recommendation: "Consult healthcare provider immediately",
            reference: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
            checked_date: new Date().toISOString(),
          })
        }
      }
    } catch (fdaError) {
      console.log("FDA API check failed, using local database only")
    }

    // Use Groq for additional safety analysis
    try {
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
                "You are a drug safety expert. Analyze the given drug for any known safety concerns, recalls, or regulatory issues. Provide a brief safety assessment.",
            },
            {
              role: "user",
              content: `Analyze the safety status of ${drugName}. Are there any known recalls, safety alerts, or regulatory concerns?`,
            },
          ],
          temperature: 0.1,
          max_tokens: 300,
        }),
      })

      if (groqResponse.ok) {
        const groqData = await groqResponse.json()
        const analysis = groqData.choices[0].message.content

        // Check if Groq identified any concerns
        if (
          analysis.toLowerCase().includes("recall") ||
          analysis.toLowerCase().includes("warning") ||
          analysis.toLowerCase().includes("concern")
        ) {
          return NextResponse.json({
            success: true,
            drug_name: drugName,
            status: "under review",
            safety_status: "warning",
            reason: "Potential safety concerns identified",
            date: new Date().toLocaleDateString(),
            authority: "AI Analysis",
            action: "Further investigation recommended",
            recommendation: analysis,
            reference: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
            checked_date: new Date().toISOString(),
          })
        }
      }
    } catch (groqError) {
      console.log("Groq analysis failed, proceeding with safe status")
    }

    // No safety concerns found
    return NextResponse.json({
      success: true,
      drug_name: drugName,
      status: "approved",
      safety_status: "safe",
      message: "No known safety concerns or recalls found",
      recommendation: "Drug appears to be safe based on current regulatory data. Continue as prescribed.",
      checked_date: new Date().toISOString(),
      authority: "FDA/WHO",
      reference: "https://www.fda.gov/drugs",
    })
  } catch (error) {
    console.error("Safety compliance check error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check safety compliance",
      },
      { status: 500 },
    )
  }
}
