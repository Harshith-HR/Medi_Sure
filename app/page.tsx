"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  FileText,
  Brain,
  Users,
  Search,
  Calculator,
  Pill,
  Shield,
  ArrowLeft,
  CheckCircle,
} from "lucide-react"

interface ExtractedDrug {
  name: string
  dosage: string
  frequency: string
}

interface DrugInteraction {
  drug: string
  drugbank_id: string
  interaction: string
  severity?: "low" | "moderate" | "high"
  analysis?: string
  recommendations?: string[]
  monitoring?: string[]
  alternatives?: any[]
}

interface AnalysisResult {
  extracted_drugs: ExtractedDrug[]
  interactions: DrugInteraction[]
  dosage_advice: string[]
  alternatives: Array<{
    original: string
    alternative: string
    reason: string
  }>
  safety_score?: number
  extracted_text?: string
  overall_risk?: string
  risk_factors?: string[]
  drugs?: any[]
  recommendations?: string[]
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function DrugSafetyAnalyzer() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentModule, setCurrentModule] = useState<string | null>(null)
  const [sharedData, setSharedData] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showDemo, setShowDemo] = useState(false)
  const [showDrugInteractionModal, setShowDrugInteractionModal] = useState(false)
  const [showDosageModal, setShowDosageModal] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [patientRecords, setPatientRecords] = useState(false)
  const [safetyCompliance, setSafetyCompliance] = useState(false)
  const [drugInteractionResult, setDrugInteractionResult] = useState<any>({
    recommendations: [],
  })
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false)
  const [drug1, setDrug1] = useState("")
  const [drug2, setDrug2] = useState("")
  const [patientAge, setPatientAge] = useState("")
  const [currentStep, setCurrentStep] = useState(1)
  const [activeTab, setActiveTab] = useState("text")
  const [age, setAge] = useState("")
  const [prescriptionText, setPrescriptionText] = useState("")
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState("")
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your AI medical assistant. I can help you with drug interactions, dosage questions, side effects, and medication safety. What would you like to know?",
      timestamp: new Date(),
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [isAIThinking, setIsAIThinking] = useState(false)

  const [watsonAnalysisResult, setWatsonAnalysisResult] = useState<any>(null)
  const [isWatsonAnalyzing, setIsWatsonAnalyzing] = useState(false)
  const [watsonAlternatives, setWatsonAlternatives] = useState<any>(null)

  const [samplePrescription, setSamplePrescription] = useState(`Patient: John Doe, Age: 45
Rx: Warfarin 5mg once daily
Rx: Aspirin 81mg once daily  
Rx: Ibuprofen 400mg twice daily as needed for pain
Rx: Metformin 500mg twice daily with meals`)
  const [showDetailedReport, setShowDetailedReport] = useState(false)

  const [additionalDrugs, setAdditionalDrugs] = useState<string[]>([])
  const [showAdditionalDrugs, setShowAdditionalDrugs] = useState(false)

  const [dosagePlannerData, setDosagePlannerData] = useState({
    patient: {
      age: "",
      sex: "",
      weight: "",
      height: "",
      pregnancy: false,
      lactation: false,
      allergies: [],
      conditions: [],
      labs: {
        scr: "",
        ast: "",
        alt: "",
        bilirubin: "",
      },
    },
    drugs: [],
    results: null,
    isComputing: false,
    showResults: false,
  })

  const frequencySuggestions = [
    "Once daily",
    "Twice daily (BID)",
    "Three times daily (TID)",
    "Four times daily (QID)",
    "Every 6 hours",
    "Every 8 hours",
    "Every 12 hours",
    "As needed (PRN)",
    "Before meals",
    "After meals",
    "At bedtime",
    "In the morning",
    "With food",
    "On empty stomach",
  ]

  const [patientAllergies, setPatientAllergies] = useState<string[]>([])
  const [allergyCheckResult, setAllergyCheckResult] = useState<any>(null)
  const [safetyCheckResult, setSafetyCheckResult] = useState<any>(null)
  const [vaccineAge, setVaccineAge] = useState({ years: 0, months: 0 })
  const [vaccineGender, setVaccineGender] = useState("male")
  const [vaccineRecommendations, setVaccineRecommendations] = useState<any>(null)
  const [alternativeMedicineResult, setAlternativeMedicineResult] = useState<any>(null)

  // Moved saveToRecords function inside component scope
  const saveToRecords = async () => {
    try {
      // In a real implementation, this would save to a database
      const recordData = {
        patient: dosagePlannerData.patient,
        medications: dosagePlannerData.drugs,
        results: dosagePlannerData.results,
        timestamp: new Date().toISOString(),
      }

      // For now, save to localStorage as demo
      const existingRecords = JSON.parse(localStorage.getItem("medicalRecords") || "[]")
      existingRecords.push(recordData)
      localStorage.setItem("medicalRecords", JSON.stringify(existingRecords))

      alert("Record saved successfully!")
    } catch (error) {
      console.error("Save error:", error)
      alert("Failed to save record")
    }
  }

  // Moved exportToPDF function inside component scope
  const exportToPDF = async () => {
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisResult,
          patientData: dosagePlannerData.patient,
          dosageResults: dosagePlannerData.results,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) throw new Error("PDF generation failed")

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `prescription-analysis-${new Date().toISOString().split("T")[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export error:", error)
      alert("Failed to export PDF")
    }
  }

  const loadSamplePrescription = () => {
    setPrescriptionText(samplePrescription)
    setAge("45")
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      setUploadedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      setUploadedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setIsAIThinking(true)

    // Simulate AI response with medical knowledge
    setTimeout(() => {
      const aiResponse = generateAIResponse(chatInput)
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, assistantMessage])
      setIsAIThinking(false)
    }, 1500)
  }

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase()

    if (input.includes("interaction") || input.includes("combine")) {
      return "Drug interactions can be serious. Common dangerous combinations include:\n\n• Warfarin + Aspirin: Increased bleeding risk\n• ACE inhibitors + NSAIDs: Kidney damage risk\n• Statins + Certain antibiotics: Muscle toxicity\n\nAlways consult your pharmacist or doctor before combining medications. Would you like me to check specific drug combinations?"
    }

    if (input.includes("dosage") || input.includes("dose")) {
      return "Proper dosing depends on several factors:\n\n• Patient age and weight\n• Kidney and liver function\n• Other medications\n• Medical conditions\n\nNever adjust doses without medical supervision. Elderly patients often need lower doses. What specific medication dosage are you concerned about?"
    }

    if (input.includes("side effect") || input.includes("adverse")) {
      return "Common medication side effects include:\n\n• Gastrointestinal: Nausea, stomach upset\n• Neurological: Dizziness, headache\n• Cardiovascular: Blood pressure changes\n• Allergic reactions: Rash, swelling\n\nSerious side effects require immediate medical attention. Which medication's side effects are you asking about?"
    }

    if (input.includes("elderly") || input.includes("older")) {
      return "Elderly patients require special medication considerations:\n\n• Slower drug metabolism\n• Increased sensitivity to side effects\n• Higher risk of drug interactions\n• Kidney function changes\n\nThe Beers Criteria lists potentially inappropriate medications for older adults. Always review medications regularly with healthcare providers."
    }

    if (input.includes("pregnancy") || input.includes("pregnant")) {
      return "Medication safety during pregnancy is critical:\n\n• Category A: Safest options\n• Category B: Generally safe\n• Category C: Use with caution\n• Category D & X: Avoid or use only if benefits outweigh risks\n\nAlways consult your obstetrician before taking any medication during pregnancy or while breastfeeding."
    }

    return "I can help you with various medication-related questions including:\n\n• Drug interactions and safety\n• Dosage guidelines and adjustments\n• Side effects and adverse reactions\n• Age-specific considerations\n• Pregnancy and medication safety\n• Alternative medication options\n\nPlease ask me about any specific medications or concerns you have. Remember, this is for educational purposes only - always consult healthcare professionals for medical advice."
  }

  const analyzeTextPrescription = async () => {
    setIsAnalyzing(true)
    setCurrentStep(2)

    try {
      const response = await fetch("/api/analyze-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: Number.parseInt(age) || 30,
          prescription_text: prescriptionText,
        }),
      })
      const result = await response.json()
      setAnalysisResult(result)

      await performWatsonAnalysis(prescriptionText, Number.parseInt(age) || 30)

      setTimeout(() => {
        setCurrentStep(3)
        setIsAnalyzing(false)
      }, 2000)
    } catch (error) {
      console.error("Analysis failed:", error)
      setIsAnalyzing(false)
      setCurrentStep(1)
    }
  }

  const analyzeImagePrescription = async (file: File) => {
    setCurrentStep(2)
    setIsAnalyzing(true)
    setIsWatsonAnalyzing(true)
    setError("")

    try {
      // Step 1: Extract text using Watson OCR
      const formData = new FormData()
      formData.append("image", file)

      const ocrResponse = await fetch("/api/watson-ocr", {
        method: "POST",
        body: formData,
      })

      if (!ocrResponse.ok) {
        throw new Error("OCR extraction failed")
      }

      const ocrData = await ocrResponse.json()

      if (!ocrData.success) {
        throw new Error(ocrData.error || "Failed to extract text from image")
      }

      setExtractedText(ocrData.extracted_text)

      const patientDetails = ocrData.patient_details
      const medications = ocrData.medications

      // Auto-populate dosage planner data
      setDosagePlannerData((prev) => ({
        ...prev,
        patient: {
          ...prev.patient,
          age: patientDetails.age || "",
          sex: patientDetails.sex || "",
          weight: patientDetails.weight || "",
          height: patientDetails.height || "",
        },
        drugs: medications.map((med: any) => ({
          name: med.name,
          dose: med.strength,
          route: "oral",
          frequency: med.frequency,
        })),
      }))

      // Step 2: Analyze extracted drugs for interactions
      const analysisResponse = await fetch("/api/analyze-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: patientDetails.age ? Number.parseInt(patientDetails.age) : 30,
          prescription_text: ocrData.extracted_text,
        }),
      })

      if (!analysisResponse.ok) {
        throw new Error("Drug analysis failed")
      }

      const analysisData = await analysisResponse.json()

      const enhancedResult = {
        ...analysisData,
        extracted_text: ocrData.extracted_text,
        patient_details: patientDetails,
        ocr_medications: medications,
        ocr_confidence: ocrData.confidence,
        ocr_method: ocrData.method,
      }

      setAnalysisResult(enhancedResult)
      setCurrentStep(3)
    } catch (error) {
      console.error("Image analysis failed:", error)
      setError(error instanceof Error ? error.message : "Image analysis failed")
      setCurrentStep(1)
    } finally {
      setIsAnalyzing(false)
      setIsWatsonAnalyzing(false)
    }
  }

  const performWatsonAnalysis = async (text: string, patientAge: number) => {
    try {
      setIsWatsonAnalyzing(true)

      const watsonResponse = await fetch("/api/watson-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          patientAge: patientAge,
          medicalHistory: [], // Could be enhanced with patient history
        }),
      })

      if (watsonResponse.ok) {
        const watsonData = await watsonResponse.json()
        setWatsonAnalysisResult(watsonData)
      }
    } catch (error) {
      console.error("Watson analysis failed:", error)
    } finally {
      setIsWatsonAnalyzing(false)
    }
  }

  const getWatsonAlternatives = async (drugName: string, patientAge: number) => {
    try {
      const response = await fetch("/api/watson-drug-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugName: drugName,
          patientAge: patientAge,
          medicalConditions: [],
          allergies: [],
          currentMedications: analysisResult?.extracted_drugs?.map((d) => d.name) || [],
        }),
      })

      if (response.ok) {
        const alternatives = await response.json()
        setWatsonAlternatives(alternatives)
      }
    } catch (error) {
      console.error("Watson alternatives failed:", error)
    }
  }

  const resetAnalysis = () => {
    setCurrentStep(1)
    setAnalysisResult(null)
    setPrescriptionText("")
    setAge("")
    setUploadedImage(null)
    setImagePreview(null)
    setExtractedText("")
    setShowDemo(false)
    setWatsonAnalysisResult(null)
    setWatsonAlternatives(null)
  }

  const canAnalyze = () => {
    if (activeTab === "text") {
      return prescriptionText.trim() && age
    } else {
      return uploadedImage && age
    }
  }

  const handleAnalyze = () => {
    if (activeTab === "text") {
      analyzeTextPrescription()
    } else {
      analyzeImagePrescription()
    }
  }

  const handleDrugInteractionClick = () => {
    setShowDrugInteractionModal(true)
  }

  const handleSidebarNavigation = (module: string) => {
    setCurrentModule(module)
    setError(null)

    switch (module) {
      case "drug-interaction":
        setShowDrugInteractionModal(true)
        break
      case "prescription-scanner":
        setShowDemo(true)
        break
      case "dosage-planner":
        setShowDosageModal(true)
        break
      case "alternatives":
        setShowAlternatives(true)
        break
      case "ai-assistant":
        setShowAIChat(true)
        break
      case "patient-records":
        setPatientRecords(true)
        break
      case "safety-compliance":
        setSafetyCompliance(true)
        break
    }
  }

  const checkAlternativeMedicines = async (drugName: string, dosage: string, form: string) => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/alternative-medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drugName, dosage, form }),
      })
      const result = await response.json()
      setAlternativeMedicineResult(result)
    } catch (error) {
      setError("Failed to find alternative medicines")
    } finally {
      setIsLoading(false)
    }
  }

  const getVaccineRecommendations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/vaccine-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageYears: vaccineAge.years,
          ageMonths: vaccineAge.months,
          gender: vaccineGender,
        }),
      })
      const result = await response.json()
      setVaccineRecommendations(result)
    } catch (error) {
      setError("Failed to get vaccine recommendations")
    } finally {
      setIsLoading(false)
    }
  }

  const checkAllergies = async (prescriptions: string[]) => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/allergy-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allergies: patientAllergies, prescriptions }),
      })
      const result = await response.json()
      setAllergyCheckResult(result)
    } catch (error) {
      setError("Failed to check allergies")
    } finally {
      setIsLoading(false)
    }
  }

  const checkDrugSafety = async (drugName: string) => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/safety-compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drugName }),
      })
      const result = await response.json()
      setSafetyCheckResult(result)
    } catch (error) {
      setError("Failed to check drug safety")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAnotherDrug = () => {
    setShowAdditionalDrugs(true)
    setAdditionalDrugs((prev) => [...prev, ""])
  }

  const handleAdditionalDrugChange = (index: number, value: string) => {
    setAdditionalDrugs((prev) => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  const handleRemoveAdditionalDrug = (index: number) => {
    setAdditionalDrugs((prev) => prev.filter((_, i) => i !== index))
    if (additionalDrugs.length === 1) {
      setShowAdditionalDrugs(false)
    }
  }

  const checkDrugInteractions = async () => {
    if (!drug1 || !drug2) {
      setError("Please enter both drug names")
      return
    }

    setIsCheckingInteractions(true)
    setError(null)

    try {
      const response = await fetch("/api/groq-interaction-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drug1,
          drug2,
          patientAge: Number.parseInt(patientAge) || 30,
          medicalHistory: sharedData.medicalHistory || [],
        }),
      })

      const result = await response.json()

      if (result.success) {
        setDrugInteractionResult(result.interaction)
        // Share data with other modules
        setSharedData((prev) => ({
          ...prev,
          lastInteractionCheck: result.interaction,
        }))
      } else {
        setError(result.error || "Failed to check interactions")
      }
    } catch (error) {
      console.error("Interaction check failed:", error)
      setError("Network error occurred")
    } finally {
      setIsCheckingInteractions(false)
    }
  }

  const launchDosageSystem = () => {
    window.open("http://localhost:8501", "_blank")
  }

  const handleViewDetailedReport = () => {
    setShowDetailedReport(true)
  }

  const handleExportReport = () => {
    if (!drugInteractionResult) return

    const reportData = {
      timestamp: new Date().toLocaleString(),
      drugs: `${drug1} + ${drug2}`,
      patientAge: patientAge || "Not specified",
      severity: drugInteractionResult.severity,
      analysis: drugInteractionResult.analysis,
      recommendations: Array.isArray(drugInteractionResult.recommendations)
        ? drugInteractionResult.recommendations
        : [],
      monitoring: Array.isArray(drugInteractionResult.monitoring) ? drugInteractionResult.monitoring : [],
      alternatives: Array.isArray(drugInteractionResult.alternatives) ? drugInteractionResult.alternatives : [],
    }

    // Create downloadable text report
    const reportContent = `
DRUG INTERACTION REPORT
Generated: ${reportData.timestamp}

DRUG COMBINATION: ${reportData.drugs}
PATIENT AGE: ${reportData.patientAge}
SEVERITY: ${reportData.severity.toUpperCase()}

ANALYSIS:
${reportData.analysis}

${
  reportData.recommendations.length > 0
    ? `
RECOMMENDATIONS:
${reportData.recommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join("\n")}
`
    : ""
}

${
  reportData.monitoring.length > 0
    ? `
MONITORING REQUIREMENTS:
${reportData.monitoring.map((mon: string, i: number) => `${i + 1}. ${mon}`).join("\n")}
`
    : ""
}

${
  reportData.alternatives.length > 0
    ? `
ALTERNATIVE MEDICATIONS:
${reportData.alternatives.map((alt: any, i: number) => `${i + 1}. ${alt.name} - ${alt.reason}`).join("\n")}
`
    : ""
}

---
This report is generated by MediSure AI Medical Prescription Verification System.
For medical advice, please consult with healthcare professionals.
    `.trim()

    // Create and download file
    const blob = new Blob([reportContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `drug-interaction-report-${drug1}-${drug2}-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const computeDosage = async () => {
    setDosagePlannerData((prev) => ({ ...prev, isComputing: true }))

    try {
      const response = await fetch("/api/dosage/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: dosagePlannerData.patient,
          drugs: dosagePlannerData.drugs,
        }),
      })

      if (!response.ok) throw new Error("Dosage computation failed")

      const results = await response.json()
      setDosagePlannerData((prev) => ({
        ...prev,
        results,
        showResults: true,
        isComputing: false,
      }))
    } catch (error) {
      console.error("Dosage computation error:", error)
      setError("Failed to compute dosage recommendations")
      setDosagePlannerData((prev) => ({ ...prev, isComputing: false }))
    }
  }

  const planDosageFromOCR = () => {
    if (analysisResult?.ocr_medications) {
      const ocrDrugs = analysisResult.ocr_medications.map((drug: any) => ({
        name: drug.name,
        dose: drug.strength || "",
        route: "oral",
        frequency: drug.frequency || "",
      }))
      setDosagePlannerData((prev) => ({ ...prev, drugs: ocrDrugs }))
    }
    setShowDosageModal(true)
  }

  if (
    !showDemo &&
    !showDrugInteractionModal &&
    !showDosageModal &&
    !showAIChat &&
    !showAlternatives &&
    !patientRecords &&
    !safetyCompliance
  ) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <div
            className={`${sidebarCollapsed ? "w-16" : "w-64"} bg-white border-r border-gray-200 min-h-screen flex flex-col py-6 transition-all duration-300 ease-in-out`}
          >
            <div className="px-6 mb-8 flex items-center justify-between">
              <div className={`flex items-center gap-3 ${sidebarCollapsed ? "justify-center" : ""}`}>
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                {!sidebarCollapsed && <h2 className="font-bold text-xl text-gray-900">MediSure</h2>}
              </div>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
                  />
                </svg>
              </button>
            </div>

            <nav className="flex-1 px-4">
              <div className="space-y-2">
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group"
                  onClick={() => handleSidebarNavigation("drug-interaction")}
                  title="Check for dangerous drug combinations and interactions"
                >
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="text-gray-700 font-medium">Drug Interaction</span>}
                </div>
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group"
                  onClick={() => handleSidebarNavigation("prescription-scanner")}
                  title="Scan and analyze prescription images with OCR technology"
                >
                  <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="text-gray-700 font-medium">Prescription Scanner</span>}
                </div>
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group"
                  onClick={() => handleSidebarNavigation("dosage-planner")}
                  title="Get AI-recommended dosages based on patient profile"
                >
                  <Calculator className="h-5 w-5 text-teal-500 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="text-gray-700 font-medium">Dosage & Age Planner</span>}
                </div>
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group"
                  onClick={() => handleSidebarNavigation("alternatives")}
                  title="Find safe alternative medicines and generic options"
                >
                  <Pill className="h-5 w-5 text-green-500 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="text-gray-700 font-medium">Alternative Medicines</span>}
                </div>
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group"
                  onClick={() => handleSidebarNavigation("ai-assistant")}
                  title="Ask medical questions to IBM Watson AI assistant"
                >
                  <Brain className="h-5 w-5 text-purple-500 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="text-gray-700 font-medium">AI Medical Assistant</span>}
                </div>
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group"
                  onClick={() => handleSidebarNavigation("patient-records")}
                  title="Manage patient medical history and medication profiles"
                >
                  <Users className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="text-gray-700 font-medium">Patient Medical Records</span>}
                </div>
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group"
                  onClick={() => handleSidebarNavigation("safety-compliance")}
                  title="Monitor drug safety and regulatory compliance"
                >
                  <Shield className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="text-gray-700 font-medium">Safety & Compliance</span>}
                </div>
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <header className="bg-white border-b border-gray-200 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h1 className="font-bold text-3xl text-gray-900">AI Medical Prescription Verification</h1>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search modules..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label="Search modules"
                    />
                  </div>
                </div>
              </div>
            </header>

            {error && (
              <div className="mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800 font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Dashboard Content */}
            <main className="p-8">
              <div className="mb-8">
                <div className="bg-blue-600 rounded-2xl p-8 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">Welcome to MediSure</h2>
                    <p className="text-blue-100 text-lg">
                      Your comprehensive AI-powered medical prescription verification system
                    </p>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full transform -translate-y-32 translate-x-32"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full transform translate-y-24 -translate-x-24"></div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Prescriptions Analyzed</p>
                      <p className="text-2xl font-bold text-gray-900">1,247</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Drug Interactions Found</p>
                      <p className="text-2xl font-bold text-gray-900">23</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Patients Monitored</p>
                      <p className="text-2xl font-bold text-gray-900">456</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Safety Score</p>
                      <p className="text-2xl font-bold text-gray-900">98.5%</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Shield className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Drug Interaction Check */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertTriangle className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full font-medium">
                      High Priority
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">Drug Interaction Check</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    Detects harmful drug combinations with detailed reports and color-coded severity ratings.
                  </p>
                  <Button
                    className="w-full bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
                    onClick={handleDrugInteractionClick}
                  >
                    Open Module →
                  </Button>
                </div>

                {/* Prescription Scanner */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
                      OCR Powered
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">Prescription Scanner</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    Upload prescription images for OCR-based drug extraction with IBM Watson AI integration.
                  </p>
                  <Button
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                    onClick={() => setShowDemo(true)}
                  >
                    Open Module →
                  </Button>
                </div>

                {/* Dosage & Age Planner */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-teal-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Calculator className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded-full font-medium">
                      AI Recommended
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">Dosage & Age Planner</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    AI-recommended dosages based on patient profile with age, weight, and medical history.
                  </p>
                  <Button
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium"
                    onClick={() => setShowDosageModal(true)}
                  >
                    Open Module →
                  </Button>
                </div>

                {/* Alternative Medicines */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Pill className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                      Cost Effective
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">Alternative Medicines</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    Suggests safe alternative medicines when needed with generic options and pricing info.
                  </p>
                  <Button
                    className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
                    onClick={() => setShowAlternatives(true)}
                  >
                    Open Module →
                  </Button>
                </div>

                {/* AI Medical Assistant */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Brain className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full font-medium">
                      Watson AI
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">AI Medical Assistant</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    Ask medical questions or clarify prescriptions with IBM Watson-powered AI assistant.
                  </p>
                  <Button
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium"
                    onClick={() => setShowAIChat(true)}
                  >
                    Open Module →
                  </Button>
                </div>

                {/* Patient Medical Records */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full font-medium">
                      Secure
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">Patient Medical Records</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    View and update patient history, allergies, and medication profiles with conflict warnings.
                  </p>
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
                    onClick={() => setPatientRecords(true)}
                  >
                    Open Module →
                  </Button>
                </div>

                {/* Safety & Compliance Monitor */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Shield className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full font-medium">
                      Real-time
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">Safety & Compliance Monitor</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    Checks prescriptions against bans and recalls with WHO/OpenFDA API integration.
                  </p>
                  <Button
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium"
                    onClick={() => setSafetyCompliance(true)}
                  >
                    Open Module →
                  </Button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    )
  }

  // OCR Prescription Scanner Demo
  if (showDemo) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowDemo(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="font-bold text-3xl text-gray-900">OCR Prescription Scanner</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-8">
          <div className="max-w-4xl mx-auto">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-8">
                <div className={`flex items-center ${currentStep >= 1 ? "text-blue-600" : "text-gray-400"}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                  >
                    1
                  </div>
                  <span className="ml-2 font-medium">Upload Image</span>
                </div>
                <div className={`w-16 h-1 ${currentStep >= 2 ? "bg-blue-600" : "bg-gray-200"} rounded`}></div>
                <div className={`flex items-center ${currentStep >= 2 ? "text-blue-600" : "text-gray-400"}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                  >
                    2
                  </div>
                  <span className="ml-2 font-medium">OCR Analysis</span>
                </div>
                <div className={`w-16 h-1 ${currentStep >= 3 ? "bg-blue-600" : "bg-gray-200"} rounded`}></div>
                <div className={`flex items-center ${currentStep >= 3 ? "text-blue-600" : "text-gray-400"}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                  >
                    3
                  </div>
                  <span className="ml-2 font-medium">Safety Report</span>
                </div>
              </div>
            </div>

            {/* Step 1: Image Upload */}
            {currentStep === 1 && (
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Prescription Image</h2>

                {/* Age Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Patient Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="Age"
                    min="1"
                    max="120"
                  />
                </div>

                {/* Image Upload Area */}
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer text-emerald-700 bg-stone-50"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("image-upload")?.click()}
                >
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Prescription preview"
                        className="max-w-md mx-auto rounded-lg shadow-md"
                      />
                      <p className="text-sm text-gray-600">Click to change image</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <FileText className="h-16 w-16 mx-auto text-orange-200" />
                      <div>
                        <p className="text-lg font-medium text-gray-900">Drop prescription image here</p>
                        <p className="text-sm text-gray-500">or click to browse (JPG, PNG)</p>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  id="image-upload"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Action Buttons */}
                <div className="flex gap-4 mt-6">
                  <Button
                    onClick={() => analyzeImagePrescription(uploadedImage!)}
                    disabled={!uploadedImage || !age}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Analyze Prescription
                  </Button>
                  <Button
                    onClick={() => setShowDemo(false)}
                    variant="outline"
                    className="px-6 py-2 rounded-lg font-medium"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Analysis in Progress */}
            {currentStep === 2 && (
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <div className="space-y-6">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Prescription</h2>
                    <p className="text-gray-600">
                      {isWatsonAnalyzing
                        ? "Running IBM Watson AI analysis..."
                        : "Extracting text using OCR technology..."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Results */}
            {currentStep === 3 && analysisResult && (
              <div className="space-y-6">
                <div className="flex justify-end mb-4">
                  <Button onClick={planDosageFromOCR} className="bg-teal-600 hover:bg-teal-700 text-white">
                    Plan Dosage →
                  </Button>
                </div>

                {/* Extracted Text */}
                {extractedText && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Extracted Text (OCR)</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{extractedText}</p>
                    </div>
                  </div>
                )}

                {/* Risk Assessment */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        analysisResult.overall_risk === "Critical"
                          ? "bg-red-600"
                          : analysisResult.overall_risk === "High"
                            ? "bg-red-500"
                            : analysisResult.overall_risk === "Moderate"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                      }`}
                    ></div>
                    <h3 className="text-lg font-bold text-gray-900">Overall Risk: {analysisResult.overall_risk}</h3>
                  </div>

                  {analysisResult.risk_factors && analysisResult.risk_factors.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium text-gray-700">Risk Factors:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {analysisResult.risk_factors.map((factor, index) => (
                          <li key={index} className="text-sm text-gray-600">
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Extracted Drugs */}
                {analysisResult.drugs && analysisResult.drugs.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Detected Medications</h3>
                    <div className="grid gap-4">
                      {analysisResult.drugs.map((drug, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{drug.drug_name}</h4>
                            <span className="text-sm text-gray-500">{drug.dosage}</span>
                          </div>
                          <p className="text-sm text-gray-600">Frequency: {drug.frequency}</p>
                          {drug.route && <p className="text-sm text-gray-600">Route: {drug.route}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drug Interactions */}
                {analysisResult.interactions && analysisResult.interactions.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Drug Interactions</h3>
                    <div className="space-y-4">
                      {analysisResult.interactions.map((interaction, index) => (
                        <div
                          key={index}
                          className={`border-l-4 pl-4 py-2 ${
                            interaction.severity === "high"
                              ? "border-red-500 bg-red-50"
                              : interaction.severity === "moderate"
                                ? "border-yellow-500 bg-yellow-50"
                                : "border-blue-500 bg-blue-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{interaction.drug}</span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                interaction.severity === "high"
                                  ? "bg-red-100 text-red-800"
                                  : interaction.severity === "moderate"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {interaction.severity} risk
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{interaction.interaction}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Recommendations</h3>
                    <ul className="space-y-2">
                      {analysisResult.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      setCurrentStep(1)
                      setUploadedImage(null)
                      setImagePreview(null)
                      setExtractedText("")
                      setAnalysisResult(null)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    Analyze Another Prescription
                  </Button>
                  <Button
                    onClick={() => setShowDemo(false)}
                    variant="outline"
                    className="px-6 py-2 rounded-lg font-medium"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  if (showDosageModal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dosage & Age Planner</h1>
              <p className="text-gray-600 mt-1">AI-recommended dosages based on patient profile</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowDosageModal(false)}
              className="border-gray-200 hover:bg-gray-50"
            >
              ← Back to Dashboard
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Information Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 sticky top-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Patient Information</h2>

                {/* Basic Info */}
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age (years) *</label>
                      <input
                        type="number"
                        value={dosagePlannerData.patient.age}
                        onChange={(e) =>
                          setDosagePlannerData((prev) => ({
                            ...prev,
                            patient: { ...prev.patient, age: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        placeholder="25"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sex *</label>
                      <select
                        value={dosagePlannerData.patient.sex}
                        onChange={(e) =>
                          setDosagePlannerData((prev) => ({
                            ...prev,
                            patient: { ...prev.patient, sex: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg) *</label>
                      <input
                        type="number"
                        value={dosagePlannerData.patient.weight}
                        onChange={(e) =>
                          setDosagePlannerData((prev) => ({
                            ...prev,
                            patient: { ...prev.patient, weight: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        placeholder="74"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                      <input
                        type="number"
                        value={dosagePlannerData.patient.height}
                        onChange={(e) =>
                          setDosagePlannerData((prev) => ({
                            ...prev,
                            patient: { ...prev.patient, height: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        placeholder="180"
                      />
                    </div>
                  </div>

                  {dosagePlannerData.patient.sex === "Female" && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="pregnancy"
                          checked={dosagePlannerData.patient.pregnancy}
                          onChange={(e) =>
                            setDosagePlannerData((prev) => ({
                              ...prev,
                              patient: { ...prev.patient, pregnancy: e.target.checked },
                            }))
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="pregnancy" className="text-sm text-gray-700">
                          Pregnancy
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="lactation"
                          checked={dosagePlannerData.patient.lactation}
                          onChange={(e) =>
                            setDosagePlannerData((prev) => ({
                              ...prev,
                              patient: { ...prev.patient, lactation: e.target.checked },
                            }))
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="lactation" className="text-sm text-gray-700">
                          Lactation
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={computeDosage}
                    disabled={
                      dosagePlannerData.isComputing ||
                      !dosagePlannerData.patient.age ||
                      !dosagePlannerData.patient.weight
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {dosagePlannerData.isComputing ? "Computing..." : "Compute Dosage"}
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={saveToRecords} className="text-sm bg-emerald-400">
                      Save to Records
                    </Button>
                    <Button variant="outline" onClick={exportToPDF} className="text-sm bg-black">
                      Export PDF
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Drugs & Results Panel */}
            <div className="lg:col-span-2">
              {/* Drugs Table */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Medications</h2>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setDosagePlannerData((prev) => ({
                        ...prev,
                        drugs: [...prev.drugs, { name: "", dose: "", route: "oral", frequency: "" }],
                      }))
                    }
                    className="text-sm"
                  >
                    + Add Drug
                  </Button>
                </div>

                {dosagePlannerData.drugs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No medications added yet.</p>
                    <p className="text-sm mt-1">Add drugs manually or import from OCR analysis.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Drug Name</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Dose</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Route</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Frequency</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dosagePlannerData.drugs.map((drug, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={drug.name}
                                onChange={(e) => {
                                  const newDrugs = [...dosagePlannerData.drugs]
                                  newDrugs[index].name = e.target.value
                                  setDosagePlannerData((prev) => ({ ...prev, drugs: newDrugs }))
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black"
                                placeholder="Drug name"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={drug.dose}
                                onChange={(e) => {
                                  const newDrugs = [...dosagePlannerData.drugs]
                                  newDrugs[index].dose = e.target.value
                                  setDosagePlannerData((prev) => ({ ...prev, drugs: newDrugs }))
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black"
                                placeholder="10mg"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={drug.route}
                                onChange={(e) => {
                                  const newDrugs = [...dosagePlannerData.drugs]
                                  newDrugs[index].route = e.target.value
                                  setDosagePlannerData((prev) => ({ ...prev, drugs: newDrugs }))
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black"
                              >
                                <option value="oral">Oral</option>
                                <option value="iv">IV</option>
                                <option value="im">IM</option>
                                <option value="topical">Topical</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={drug.frequency}
                                onChange={(e) => {
                                  const newDrugs = [...dosagePlannerData.drugs]
                                  newDrugs[index].frequency = e.target.value
                                  setDosagePlannerData((prev) => ({ ...prev, drugs: newDrugs }))
                                }}
                                list={`frequency-suggestions-${index}`}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-black"
                                placeholder="e.g., Twice daily, BID, Every 8 hours"
                              />
                              <datalist id={`frequency-suggestions-${index}`}>
                                {frequencySuggestions.map((suggestion, i) => (
                                  <option key={i} value={suggestion} />
                                ))}
                              </datalist>
                            </td>
                            <td className="py-2 px-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newDrugs = dosagePlannerData.drugs.filter((_, i) => i !== index)
                                  setDosagePlannerData((prev) => ({ ...prev, drugs: newDrugs }))
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                ×
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Results Table */}
              {dosagePlannerData.showResults && dosagePlannerData.results && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Dosage Recommendations</h2>

                  <div className="overflow-x-auto mb-6">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-3 font-medium text-gray-700">Drug</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-700">Standard</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-700">Patient-Adjusted</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-700">Max Daily</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-700">Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dosagePlannerData.results.recommendations?.map((rec, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 px-3 font-medium text-black">{rec.drug}</td>
                            <td className="py-3 px-3 text-gray-600">{rec.standard_dose}</td>
                            <td className="py-3 px-3 font-medium text-blue-600">{rec.adjusted_dose}</td>
                            <td className="py-3 px-3 text-gray-600">{rec.max_daily}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  rec.flag === "contraindication"
                                    ? "bg-red-100 text-red-800"
                                    : rec.flag === "adjustment"
                                      ? "bg-orange-100 text-orange-800"
                                      : rec.flag === "caution"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-green-100 text-green-800"
                                }`}
                              >
                                {rec.flag === "contraindication"
                                  ? "🚫"
                                  : rec.flag === "adjustment"
                                    ? "⚠️"
                                    : rec.flag === "caution"
                                      ? " "
                                      : "✅"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {dosagePlannerData.results.warnings && dosagePlannerData.results.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-yellow-800 mb-2">Warnings</h3>
                      <ul className="list-disc list-inside space-y-2">
                        {dosagePlannerData.results.warnings.map((warning, index) => (
                          <li key={index} className="text-sm text-gray-700">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showDrugInteractionModal) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Check Drug Interactions</h3>
            <div className="px-4 py-3">
              {error && <div className="text-red-500">{error}</div>}

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="drug1">
                  Drug 1
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="drug1"
                  type="text"
                  placeholder="Enter drug name"
                  value={drug1}
                  onChange={(e) => setDrug1(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="drug2">
                  Drug 2
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="drug2"
                  type="text"
                  placeholder="Enter drug name"
                  value={drug2}
                  onChange={(e) => setDrug2(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="patientAge">
                  Patient Age
                </label>
                <input
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  id="patientAge"
                  type="number"
                  placeholder="Enter patient age"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                />
              </div>

              {showAdditionalDrugs && (
                <div>
                  {additionalDrugs.map((drug, index) => (
                    <div key={index} className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={`additionalDrug-${index}`}>
                        Additional Drug {index + 1}
                      </label>
                      <div className="flex items-center">
                        <input
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          id={`additionalDrug-${index}`}
                          type="text"
                          placeholder="Enter drug name"
                          value={drug}
                          onChange={(e) => handleAdditionalDrugChange(index, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveAdditionalDrug(index)}
                          className="ml-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700 focus:outline-none focus:shadow-outline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddAnotherDrug}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Add Another Drug
              </button>
            </div>

            <div className="items-center px-4 py-3">
              <Button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={checkDrugInteractions}
                disabled={isCheckingInteractions}
              >
                {isCheckingInteractions ? "Checking..." : "Check Interactions"}
              </Button>
              <Button
                variant="outline"
                className="ml-3 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                onClick={() => setShowDrugInteractionModal(false)}
              >
                Close
              </Button>
            </div>

            {drugInteractionResult && (
              <div className="mt-6 p-4 border rounded-md shadow-sm">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Interaction Analysis</h4>
                <p className="text-gray-700 mb-3">{drugInteractionResult.analysis}</p>

                {drugInteractionResult.severity && (
                  <div className="mb-2">
                    <span className="font-medium">Severity:</span>
                    <span className="ml-1 text-red-600 font-semibold">{drugInteractionResult.severity}</span>
                  </div>
                )}

                {drugInteractionResult?.recommendations &&
                  Array.isArray(drugInteractionResult.recommendations) &&
                  drugInteractionResult.recommendations.length > 0 && (
                    <div className="mb-2">
                      <span className="font-medium">Recommendations:</span>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {drugInteractionResult.recommendations.map((rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {drugInteractionResult.monitoring &&
                  Array.isArray(drugInteractionResult.monitoring) &&
                  drugInteractionResult.monitoring.length > 0 && (
                    <div className="mb-2">
                      <span className="font-medium">Monitoring:</span>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {drugInteractionResult.monitoring.map((mon: string, index: number) => (
                          <li key={index}>{mon}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {drugInteractionResult.alternatives && drugInteractionResult.alternatives.length > 0 && (
                  <div>
                    <span className="font-medium">Alternatives:</span>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {drugInteractionResult.alternatives.map((alt: any, index: number) => (
                        <li key={index}>
                          {alt.name} - {alt.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button onClick={handleExportReport} className="mt-4 bg-green-500 hover:bg-green-700 text-white">
                  Export Report
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (showAIChat) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAIChat(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="font-bold text-3xl text-gray-900">AI Medical Assistant</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-8">
          <div className="max-w-4xl mx-auto">
            {/* Chat Interface */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="space-y-4">
                {/* Chat Messages */}
                <div className="space-y-3">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {message.content}
                      </div>
                      <span className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                  {isAIThinking && (
                    <div className="flex items-start">
                      <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800">Thinking...</div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Ask me anything..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage()
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (patientRecords) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Patient Medical Records & Allergy Checker</h2>
              <Button onClick={() => setPatientRecords(false)} variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Patient Allergies</h3>
                <div className="space-y-2">
                  {patientAllergies.map((allergy, index) => (
                    <div key={index} className="flex items-center justify-between bg-red-50 p-2 rounded">
                      <span>{allergy}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPatientAllergies((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add allergy (e.g., Penicillin)"
                    className="flex-1 px-3 py-2 border rounded-md"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        const value = (e.target as HTMLInputElement).value.trim()
                        if (value && !patientAllergies.includes(value)) {
                          setPatientAllergies((prev) => [...prev, value])
                          ;(e.target as HTMLInputElement).value = ""
                        }
                      }
                    }}
                  />
                </div>

                <h3 className="text-lg font-semibold mt-6">Check Prescriptions</h3>
                <textarea
                  placeholder="Enter prescriptions to check (one per line)"
                  className="w-full px-3 py-2 border rounded-md h-32"
                  onChange={(e) => {
                    const prescriptions = e.target.value.split("\n").filter((p) => p.trim())
                    if (prescriptions.length > 0 && patientAllergies.length > 0) {
                      checkAllergies(prescriptions)
                    }
                  }}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Allergy Check Results</h3>
                {allergyCheckResult ? (
                  <div className="space-y-3">
                    <div
                      className={`p-4 rounded-lg ${allergyCheckResult.safe ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                    >
                      <p className="font-medium">{allergyCheckResult.message}</p>
                    </div>
                    {allergyCheckResult.warnings?.map((warning: any, index: number) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                        <p className="font-medium text-red-600">{warning.warning}</p>
                        <p className="text-sm text-gray-600 mt-1">{warning.recommendation}</p>
                        {warning.symptoms && <p className="text-sm text-gray-500 mt-1">Symptoms: {warning.symptoms}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Add allergies and prescriptions to check for interactions</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (safetyCompliance) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Real-time Safety & Compliance Monitor</h2>
              <Button onClick={() => setSafetyCompliance(false)} variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter drug name to check safety status"
                  className="flex-1 px-4 py-2 border rounded-md text-black"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      const drugName = (e.target as HTMLInputElement).value.trim()
                      if (drugName) {
                        checkDrugSafety(drugName)
                      }
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="drug name"]') as HTMLInputElement
                    if (input?.value.trim()) {
                      checkDrugSafety(input.value.trim())
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? "Checking..." : "Check Safety"}
                </Button>
              </div>

              {safetyCheckResult && (
                <div className="space-y-4">
                  <div
                    className={`p-6 rounded-lg border-2 ${
                      safetyCheckResult.safety_status === "safe"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {safetyCheckResult.safety_status === "safe" ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      )}
                      <h3 className="text-xl font-semibold">
                        {safetyCheckResult.drug_name} - {safetyCheckResult.status?.toUpperCase()}
                      </h3>
                    </div>

                    {safetyCheckResult.safety_status === "warning" ? (
                      <div className="space-y-3">
                        <p className="text-red-700 font-medium">⚠️ {safetyCheckResult.reason}</p>
                        <p className="text-sm text-gray-600">
                          <strong>Date:</strong> {safetyCheckResult.date}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Authority:</strong> {safetyCheckResult.authority}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Action Required:</strong> {safetyCheckResult.action}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Recommendation:</strong> {safetyCheckResult.recommendation}
                        </p>
                        {safetyCheckResult.reference && (
                          <a
                            href={safetyCheckResult.reference}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View Official Reference →
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-green-700">{safetyCheckResult.message}</p>
                        <p className="text-sm text-gray-600">{safetyCheckResult.recommendation}</p>
                        <p className="text-xs text-gray-500">
                          Last checked: {new Date(safetyCheckResult.checked_date).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">About Safety Monitoring</h4>
                <p className="text-sm text-blue-800">
                  This system checks drugs against FDA recalls, WHO safety alerts, and regulatory compliance databases.
                  Always consult your healthcare provider before making any changes to your medication regimen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showAlternatives) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Alternative Medicines & Vaccines</h2>
              <Button onClick={() => setShowAlternatives(false)} variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Cost-Effective Alternatives Section */}
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold text-green-600 mb-2">💊 Cost-Effective Drug Alternatives</h3>
                  <p className="text-gray-600">Find generic alternatives with significant cost savings</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Drug name"
                      className="px-3 py-2 border rounded-md text-black"
                      id="drug-name-input"
                    />
                    <input
                      type="text"
                      placeholder="Dosage"
                      className="px-3 py-2 border rounded-md text-black"
                      id="drug-dosage-input"
                    />
                    <input
                      type="text"
                      placeholder="Form"
                      className="px-3 py-2 border rounded-md text-black"
                      id="drug-form-input"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      const drugName = (document.getElementById("drug-name-input") as HTMLInputElement)?.value
                      const dosage = (document.getElementById("drug-dosage-input") as HTMLInputElement)?.value
                      const form = (document.getElementById("drug-form-input") as HTMLInputElement)?.value
                      if (drugName) {
                        checkAlternativeMedicines(drugName, dosage || "", form || "")
                      }
                    }}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Finding Alternatives..." : "Find Alternatives"}
                  </Button>
                </div>

                {alternativeMedicineResult && (
                  <div className="border border-green-200 p-4 rounded-lg bg-slate-400">
                    <h4 className="font-semibold mb-3 text-black">Alternative Found</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Generic Name:</strong> {alternativeMedicineResult.alternative.generic}
                      </p>
                      <p>
                        <strong>Price:</strong> {alternativeMedicineResult.alternative.price}
                      </p>
                      <p>
                        <strong>Purpose:</strong> {alternativeMedicineResult.alternative.purpose}
                      </p>
                      <p>
                        <strong>Precautions:</strong> {alternativeMedicineResult.alternative.precautions}
                      </p>
                      <p className="font-medium text-red-300">{alternativeMedicineResult.alternative.savings}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Vaccine Recommendations Section */}
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold text-blue-600 mb-2">💉 Vaccine Recommendations</h3>
                  <p className="text-gray-600">Age-appropriate vaccine schedule based on WHO/CDC guidelines</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Age (years)"
                      className="px-3 py-2 border rounded-md text-black"
                      value={vaccineAge.years}
                      onChange={(e) =>
                        setVaccineAge((prev) => ({ ...prev, years: Number.parseInt(e.target.value) || 0 }))
                      }
                    />
                    <input
                      type="number"
                      placeholder="Months"
                      className="px-3 py-2 border rounded-md text-black"
                      value={vaccineAge.months}
                      onChange={(e) =>
                        setVaccineAge((prev) => ({ ...prev, months: Number.parseInt(e.target.value) || 0 }))
                      }
                    />
                    <select
                      className="px-3 py-2 border rounded-md text-black"
                      value={vaccineGender}
                      onChange={(e) => setVaccineGender(e.target.value)}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <Button onClick={getVaccineRecommendations} disabled={isLoading} className="w-full">
                    {isLoading ? "Getting Recommendations..." : "Get Vaccine Recommendations"}
                  </Button>
                </div>

                {vaccineRecommendations && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-blue-800">
                      Recommendations for {vaccineRecommendations.age.years} years, {vaccineRecommendations.age.months}{" "}
                      months ({vaccineRecommendations.gender})
                    </h4>
                    {vaccineRecommendations.recommendations.map((vaccine: any, index: number) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 p-3 rounded">
                        <p className="font-medium text-blue-900">{vaccine.name}</p>
                        <p className="text-sm text-blue-700">{vaccine.purpose}</p>
                        <p className="text-xs text-blue-600">Schedule: {vaccine.schedule}</p>
                        <p className="text-xs text-gray-600">{vaccine.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
