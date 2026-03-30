/**
 * Medical AI Assistant Service
 * 
 * STRICT RULES:
 * - MUST NOT provide a final diagnosis.
 * - MUST NOT prescribe medications.
 * - MUST NOT address the patient directly.
 * - Output is ONLY for the doctor.
 * - Always act cautiously and conservatively.
 */

export type Confidence = 'low' | 'medium' | 'high';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface PossibleCondition {
  name: string;
  confidence: Confidence;
  reason: string;
}

export interface SuggestedMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
}

export interface PatientAnalysis {
  possible_conditions: PossibleCondition[];
  missing_information: string[];
  recommended_next_steps: string[];
  risk_level: RiskLevel;
  notes_for_doctor: string;
  clinical_findings_summary: string;
  suggested_medications: SuggestedMedication[];
}

export interface PatientData {
  age: number;
  gender: 'male' | 'female';
  symptoms: string[];
  duration: string;
  medical_history?: string;
  clinical_history?: {
    prescriptions: any[];
    tests: any[];
  };
  additional_info?: string;
}

/**
 * In a real application, this would call an LLM with the system prompt provided.
 * For this UI demonstration, we provide a structured template and mock analysis.
 */
export const SYSTEM_PROMPT = `
You are an advanced medical AI assistant designed ONLY to support licensed doctors.

⚠️ STRICT RULES:
* You MUST NOT provide a final diagnosis.
* You MUST NOT prescribe medications.
* You MUST NOT address the patient directly.
* Your output is ONLY for the doctor.
* Always act cautiously and conservatively.

🎯 OBJECTIVE:
Analyze patient symptoms and provide:
1. Possible medical considerations (NOT definitive diagnosis)
2. Missing or unclear information
3. Suggested next steps (tests, exams, or questions)
4. Risk level (Low / Medium / High)

🧠 BEHAVIOR:
* If data is insufficient -> prioritize asking for more information
* IMPORTANT: Always explicitly mention if you have reviewed laboratory or radiology findings from the clinical history.
* If symptoms suggest risk -> flag clearly
* Prefer recommending tests over conclusions
* Be structured and concise
`;

export async function analyzePatientData(data: PatientData): Promise<PatientAnalysis> {
  const apiKey = (import.meta as any).env.VITE_GROQ_API_KEY;
  
  if (!apiKey) {
    console.error("Groq API key not found in environment variables.");
    throw new Error("API configuration missing");
  }

  const prompt = `
PATIENT DATA:
${JSON.stringify({
  age: data.age,
  gender: data.gender,
  current_symptoms: data.symptoms,
  duration: data.duration,
  clinical_history: data.clinical_history 
    ? {
        past_medications: data.clinical_history.prescriptions.map(p => ({ meds: p.medications, instructions: p.instructions })),
        past_tests: data.clinical_history.tests.map(t => ({ 
          name: t.test_name || t.request_type, 
          status: t.status, 
          findings: t.findings || t.result_notes,
          file_content: t.extracted_text || "No text extracted from file"
        }))
      }
    : "No history provided"
}, null, 2)}

INSTRUCTION:
Analyze the current symptoms in the context of the clinical history.
IMPORTANT: If 'file_content' is present for a test, treat it as the primary medical evidence for that test. 
Correlate any abnormal values or impressions from the 'file_content' with the patient's current symptoms.

Analyze this data and return ONLY a valid JSON object matching this structure:
{
  "possible_conditions": [
    { "name": "string", "confidence": "low | medium | high", "reason": "short explanation" }
  ],
  "missing_information": ["question or missing data"],
  "recommended_next_steps": ["lab test, imaging, or clinical step"],
  "risk_level": "low | medium | high",
  "notes_for_doctor": "short summary insight",
  "clinical_findings_summary": "Detailed analysis and interpretation of laboratory and radiology results found in the clinical history, correlating them with current symptoms.",
  "suggested_medications": [
    { "name": "Medication name", "dosage": "e.g., 500mg", "frequency": "e.g., Twice daily", "duration": "e.g., 7 days", "notes": "Any special instructions or warnings" }
  ]
}
`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        temperature: 0.2, // Low temperature for consistent medical support
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to fetch from Groq");
    }

    const json = await response.json();
    const content = json.choices[0]?.message?.content;
    
    if (!content) throw new Error("Empty response from AI");
    
    return JSON.parse(content) as PatientAnalysis;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
}
