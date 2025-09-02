import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { analysisResult, patientData, dosageResults, timestamp } = data

    // Create comprehensive HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Comprehensive Prescription Analysis Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
            .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .patient-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 15px 0; }
            .drug-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .drug-table th, .drug-table td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            .drug-table th { background: #f3f4f6; font-weight: bold; }
            .flag-ok { background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .flag-caution { background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .flag-adjustment { background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .flag-contraindication { background: #fecaca; color: #dc2626; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .interaction-safe { background: #dcfce7; color: #166534; padding: 12px; border-radius: 6px; margin: 8px 0; }
            .interaction-warning { background: #fef3c7; color: #92400e; padding: 12px; border-radius: 6px; margin: 8px 0; }
            .interaction-danger { background: #fecaca; color: #dc2626; padding: 12px; border-radius: 6px; margin: 8px 0; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            .prescription-box { background: #f8f9fa; padding: 20px; border-left: 4px solid #2563eb; margin: 15px 0; font-family: monospace; }
            .ai-summary { background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; }
            .logo { font-size: 2em; color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🏥 MediSure AI</div>
            <h1>Comprehensive Prescription Analysis Report</h1>
            <p><strong>Generated:</strong> ${new Date(timestamp).toLocaleString()}</p>
            <p><strong>OCR Method:</strong> ${analysisResult?.ocr_method || "IBM Watson OCR"}</p>
          </div>

          ${
            patientData
              ? `
          <div class="section">
            <h2>👤 Patient Information</h2>
            <div class="patient-info">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div><strong>Age:</strong> ${patientData.age} years</div>
                <div><strong>Sex:</strong> ${patientData.sex}</div>
                <div><strong>Weight:</strong> ${patientData.weight} kg</div>
                <div><strong>Height:</strong> ${patientData.height} cm</div>
                ${patientData.pregnancy ? "<div><strong>Status:</strong> Pregnant</div>" : ""}
                ${patientData.lactation ? "<div><strong>Status:</strong> Lactating</div>" : ""}
              </div>
            </div>
          </div>
          `
              : ""
          }

          ${
            analysisResult?.extracted_text
              ? `
          <div class="section">
            <h2>📄 Original Prescription (OCR Extracted)</h2>
            <div class="prescription-box">
              ${analysisResult.extracted_text.replace(/\n/g, "<br>")}
            </div>
            <p><small><strong>OCR Confidence:</strong> ${Math.round((analysisResult.ocr_confidence || 0.85) * 100)}%</small></p>
          </div>
          `
              : ""
          }

          ${
            dosageResults?.recommendations
              ? `
          <div class="section">
            <h2>💊 Dosage Recommendations</h2>
            <table class="drug-table">
              <thead>
                <tr>
                  <th>Drug</th>
                  <th>Standard Dose</th>
                  <th>Patient-Adjusted Dose</th>
                  <th>Max Daily</th>
                  <th>Flag</th>
                  <th>Rationale</th>
                </tr>
              </thead>
              <tbody>
                ${dosageResults.recommendations
                  .map(
                    (rec: any) => `
                  <tr>
                    <td><strong>${rec.drug}</strong></td>
                    <td>${rec.standard_dose}</td>
                    <td><strong>${rec.adjusted_dose}</strong></td>
                    <td>${rec.max_daily}</td>
                    <td><span class="flag-${rec.flag}">${rec.flag.toUpperCase()}</span></td>
                    <td>${rec.rationale}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          `
              : ""
          }

          ${
            dosageResults?.ai_summary
              ? `
          <div class="section">
            <h2>🤖 AI Patient Summary</h2>
            <div class="ai-summary">
              <p>${dosageResults.ai_summary}</p>
            </div>
          </div>
          `
              : ""
          }

          <div class="section">
            <h2>⚠️ Drug Interactions</h2>
            ${
              analysisResult?.interactions?.length > 0
                ? analysisResult.interactions
                    .map((interaction: any) => {
                      const severity = interaction.severity || "low"
                      const cssClass =
                        severity === "high"
                          ? "interaction-danger"
                          : severity === "moderate"
                            ? "interaction-warning"
                            : "interaction-safe"
                      return `
                  <div class="${cssClass}">
                    <strong>${interaction.drug}</strong> (${interaction.drugbank_id})<br>
                    <strong>Interaction:</strong> ${interaction.interaction}<br>
                    ${interaction.analysis ? `<strong>Analysis:</strong> ${interaction.analysis}` : ""}
                  </div>
                `
                    })
                    .join("")
                : '<div class="interaction-safe"><strong>✅ No dangerous interactions detected</strong></div>'
            }
          </div>

          ${
            analysisResult?.alternatives?.length > 0
              ? `
          <div class="section">
            <h2>🔄 Alternative Medications</h2>
            ${analysisResult.alternatives
              .map(
                (alt: any) => `
              <div style="background: #f0f9ff; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #0ea5e9;">
                <strong>${alt.original} → ${alt.alternative}</strong><br>
                <em>Reason:</em> ${alt.reason}
              </div>
            `,
              )
              .join("")}
          </div>
          `
              : ""
          }

          <div class="footer">
            <p><strong>⚠️ Medical Disclaimer:</strong> This analysis is for educational and informational purposes only. Always consult with qualified healthcare professionals before making any changes to medication regimens.</p>
            <p><strong>Technology:</strong> Powered by IBM Watson OCR • Groq AI Analysis • Advanced Medical NLP</p>
            <p><strong>Report ID:</strong> ${Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
          </div>
        </body>
      </html>
    `

    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="prescription-analysis-${new Date().toISOString().split("T")[0]}.html"`,
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "Failed to generate PDF report" }, { status: 500 })
  }
}
