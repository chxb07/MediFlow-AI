import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import GlassCard from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import {
  Users, Brain, FileText, FlaskConical, ScanLine, AlertTriangle,
  ChevronRight, Lightbulb, ClipboardCheck, TrendingUp, ShieldAlert,
  Loader2, Pill, Paperclip
} from 'lucide-react';
import { PatientAnalysis, analyzePatientData } from '@/lib/ai-service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Upload, Scan, Zap, Info, Trash2, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";






const aiSuggestions: PatientAnalysis = {
  possible_conditions: [
    { name: 'Angina Pectoris', confidence: 'high', reason: 'Symptoms and age suggest cardiac workload mismatch.' },
    { name: 'Costochondritis', confidence: 'low', reason: 'Consider if pain is reproducible by palpation.' },
    { name: 'Anxiety-related chest pain', confidence: 'low', reason: 'Diagnosis of exclusion.' },
  ],
  recommended_next_steps: [
    'Order ECG/EKG immediately',
    'Check troponin levels',
    'Review cardiac history',
    'Consider stress test',
  ],
  missing_information: [
    'Blood pressure reading',
    'Family cardiac history',
    'Recent physical activity level',
  ],
  risk_level: 'high',
  notes_for_doctor: 'Patient presents with high-risk symptoms. Immediate intervention and cardiac monitoring are recommended.',
  clinical_findings_summary: 'All recent laboratory tests are within normal ranges. No acute radiology findings detected.',
  suggested_medications: [
    { name: 'Aspirin', dosage: '81mg', frequency: 'Once daily', duration: 'Ongoing', notes: 'Low-dose for cardiac protection' },
    { name: 'Nitroglycerin', dosage: '0.4mg', frequency: 'As needed', duration: 'As needed', notes: 'For chest pain relief' }
  ]
};

const statusColors: Record<string, string> = {
  urgent: 'bg-destructive/10 text-destructive border-destructive/20',
  review: 'bg-warning/10 text-warning border-warning/20',
  new: 'bg-primary/10 text-primary border-primary/20',
  'follow-up': 'bg-muted text-muted-foreground',
};



export default function DoctorDashboard() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { supabase } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PatientAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'history' | 'analyze'>('ai');
  const [history, setHistory] = useState<{prescriptions: any[], tests: any[]}>({ prescriptions: [], tests: [] });
  
  // New Document Analysis State
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [docAnalysisResult, setDocAnalysisResult] = useState<string | null>(null);

  // Advanced Ordering State
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderType, setOrderType] = useState<'lab' | 'radiology'>('lab');
  const [orderFormData, setOrderFormData] = useState({
    testName: '',
    clinicalIndication: '',
    bodyPart: '',
    imagingType: ''
  });

  const extractTextFromPDF = async (file: File): Promise<{text: string, images?: string[]}> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'] || (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error("PDF.js library failed to load. Please refresh.");
      }
      
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      if (pdf.numPages === 0) throw new Error("The PDF is empty.");

      let fullText = "";
      let textFound = false;

      for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        if (textContent.items.length > 0) {
          textFound = true;
          fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
        }
      }

      // If no text found, render first page to image for Vision AI
      if (!textFound) {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 }); // Reduced scale for stability
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context!, viewport }).promise;
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        return { text: "", images: [imageData] };
      }

      return { text: fullText };
    } catch (err: any) {
      console.error("PDF Extraction failed:", err);
      throw err;
    }
  };

  const extractTextFromWord = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = (window as any).mammoth;
      if (!mammoth) return "";
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || "";
    } catch (err) {
      console.error("Word Extraction failed:", err);
      return "";
    }
  };

  const handleDocumentAnalysis = async (file: File) => {
    if (!selectedPatient) return;
    setIsAnalyzingDoc(true);
    setDocAnalysisResult(null);
    try {
      let extractedData: {text: string, images?: string[]} = { text: "" };
      
      if (file.type === 'application/pdf') {
        extractedData = await extractTextFromPDF(file);
      } else if (file.type.includes('word') || file.name.endsWith('.docx')) {
        const text = await extractTextFromWord(file);
        extractedData = { text };
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        extractedData = { text: "", images: [base64] };
      } else {
        throw new Error("Unsupported format. Please upload PDF, Word, or clear medical scan images.");
      }

      const isVision = !!(extractedData.images && extractedData.images.length > 0);
      const textForAI = extractedData.text;

      if (!isVision && (!textForAI || textForAI.trim().length < 10)) {
        throw new Error("Insufficient data extracted for analysis.");
      }

      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      
      const messages = [
        { 
          role: "system", 
          content: "You are a senior clinical consultant. Analyze the provided clinical document (lab/radiology report, digital or scan) for a patient. Provide a professional, deep clinical interpretation. Identify critical values, abnormal trends, and provide high-confidence differential diagnosis based on the report. Suggest immediate next steps and specific medical queries for the attending physician. Use precise clinical terminology." 
        }
      ];

      if (isVision) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: `Patient: ${selectedPatient.name}, Age: ${selectedPatient.age}. Please perform OCR and analyze this clinical report scan.` },
            { type: "image_url", image_url: { url: extractedData.images![0] } }
          ]
        } as any);
      } else {
        messages.push({
          role: "user",
          content: `Patient: ${selectedPatient.name}, Age: ${selectedPatient.age}\n\nClinical Document Text:\n${textForAI}`
        } as any);
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: isVision ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
          messages,
          temperature: 0.2,
          max_tokens: 1200
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || "AI Analysis service failed.");
      }
      const json = await response.json();
      setDocAnalysisResult(json.choices[0]?.message?.content || "No analysis generated.");
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setIsAnalyzingDoc(false);
    }
  };
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isPrescribing, setIsPrescribing] = useState(false);
  const [meds, setMeds] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSavingPrescription, setIsSavingPrescription] = useState(false);
  const [stats, setStats] = useState([
    { label: t('stats.patients'), value: '0', icon: Users, color: 'text-primary' },
    { label: t('stats.appointments'), value: '0', icon: ClipboardCheck, color: 'text-success' },
    { label: t('stats.tests'), value: '0', icon: FlaskConical, color: 'text-warning' },
  ]);

  const fetchPatients = async () => {
    setIsLoadingPatients(true);
    
    // 1. Fetch Real Stats
    const { count: patientCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'patient');
    
    const { count: consultationCount } = await supabase
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new');

    setStats([
      { label: t('stats.patients'), value: (patientCount || 0).toString(), icon: Users, color: 'text-primary' },
      { label: t('stats.appointments'), value: (consultationCount || 0).toString(), icon: ClipboardCheck, color: 'text-success' },
      { label: t('stats.tests'), value: '0', icon: FlaskConical, color: 'text-warning' },
    ]);

    // 2. Fetch Real Consultations (Patient Requests)
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        id,
        symptoms,
        status,
        created_at,
        patient:profiles!patient_id (
          full_name,
          email,
          age
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching consultations:", error);
    } else if (data && data.length > 0) {
      const mapped = data.map(c => ({
        id: c.id,
        name: (c.patient as any)?.full_name || (c.patient as any)?.email?.split('@')[0] || 'Unknown',
        age: (c.patient as any)?.age || 30,
        symptoms: Array.isArray(c.symptoms) ? c.symptoms.join(' | ') : c.symptoms,
        status: c.status,
        lastVisit: new Date(c.created_at).toLocaleDateString()
      }));
      setPatients(mapped);
      setSelectedPatient(mapped[0]);
    } else {
      setPatients([]);
      setSelectedPatient(null);
    }
    setIsLoadingPatients(false);
  };

  useEffect(() => {
    fetchPatients();
  }, [supabase]);

  const fetchPatientHistory = async (consultationId: string) => {
    // 1. Fetch Existing AI Analysis
    const { data: aiData } = await supabase
      .from('ai_analysis')
      .select('*')
      .eq('consultation_id', consultationId)
      .single();
    
    if (aiData) {
      setAnalysis({
        possible_conditions: aiData.possible_conditions || [],
        recommended_next_steps: aiData.recommended_next_steps || [],
        missing_information: aiData.missing_information || [],
        risk_level: aiData.risk_level || 'low',
        notes_for_doctor: aiData.notes_for_doctor || '',
        clinical_findings_summary: aiData.clinical_findings_summary || '',
        suggested_medications: aiData.suggested_medications || []
      });
    } else {
      setAnalysis(null);
    }

    // 2. Fetch Prescriptions and Tests
    const [prescRes, labRes, radRes] = await Promise.all([
      supabase.from('prescriptions').select('*').eq('consultation_id', consultationId),
      supabase.from('lab_tests').select('*').eq('consultation_id', consultationId),
      supabase.from('radiology_reports').select('*').eq('consultation_id', consultationId)
    ]);

    const newHistory = {
      prescriptions: prescRes.data || [],
      tests: (labRes.data || []).map(t => ({
        ...t,
        type: 'lab',
        name: t.test_name,
        documentUrl: t.document_url
      })).concat((radRes.data || []).map(r => ({
        ...r,
        type: 'radiology',
        name: r.request_type,
        documentUrl: r.document_url
      })))
    };

    setHistory(newHistory);
    return { aiData, history: newHistory };
  };

  const handleSelectPatient = async (patient: any) => {
    setSelectedPatient(patient);
    setActiveTab('ai');
    setIsAnalyzing(true);
    await fetchPatientHistory(patient.id);
    setIsAnalyzing(false);
  };

  const handleAnalyze = async (patient: any) => {
    setIsAnalyzing(true);
    try {
      // Re-fetch history to ensure we have the latest lab/rad results
      const { history: latestHistory } = await fetchPatientHistory(patient.id);
      
      const result = await analyzePatientData({
        age: patient.age,
        gender: 'male',
        symptoms: patient.symptoms,
        duration: patient.duration,
        clinical_history: latestHistory,
        medical_history: '',
        additional_info: 'Requested via dashboard'
      });
      
      // Save analysis to DB so it can be viewed later
      await supabase.from('ai_analysis').insert({
        consultation_id: patient.id,
        possible_conditions: result.possible_conditions,
        missing_information: result.missing_information,
        recommended_next_steps: result.recommended_next_steps,
        risk_level: result.risk_level,
        notes_for_doctor: result.notes_for_doctor,
        clinical_findings_summary: result.clinical_findings_summary
      });

      setAnalysis(result);
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to communicate with AI Assistant.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePrescribe = async () => {
    if (!selectedPatient) return;
    setIsSavingPrescription(true);
    try {
      const { error } = await supabase
        .from('prescriptions')
        .insert({
          consultation_id: selectedPatient.id,
          medications: meds.split(',').map(m => m.trim()),
          instructions: instructions
        });

      if (error) throw error;

      toast({
        title: "Prescription Saved",
        description: `Prescription for ${selectedPatient.name} has been recorded.`,
      });
      setIsPrescribing(false);
      setMeds('');
      setInstructions('');
    } catch (error: any) {
      toast({
        title: "Failed to save prescription",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSavingPrescription(false);
    }
  };

  const handleRequestTest = (type: 'lab' | 'radiology') => {
    if (!selectedPatient) {
      toast({ title: "No patient selected", variant: "destructive" });
      return;
    }
    setOrderType(type);
    setOrderFormData({
      testName: type === 'lab' ? '' : 'X-Ray',
      clinicalIndication: '',
      bodyPart: '',
      imagingType: type === 'radiology' ? 'X-Ray' : ''
    });
    setIsOrdering(true);
  };

  const handleOrderSubmit = async () => {
    if (!selectedPatient) return;
    setIsSavingPrescription(true); // Re-using this state for loading
    try {
      if (orderType === 'lab') {
        const { error } = await supabase.from('lab_tests').insert({
          consultation_id: selectedPatient.id,
          test_name: orderFormData.testName,
          clinical_indication: orderFormData.clinicalIndication
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('radiology_reports').insert({
          consultation_id: selectedPatient.id,
          request_type: `${orderFormData.imagingType} - ${orderFormData.bodyPart}`,
          body_part: orderFormData.bodyPart,
          imaging_type: orderFormData.imagingType,
          clinical_indication: orderFormData.clinicalIndication
        });
        if (error) throw error;
      }

      toast({
        title: "Request Sent Successfully",
        description: `Your ${orderType} request for ${selectedPatient.name} has been processed.`,
      });
      setIsOrdering(false);
      fetchPatientHistory(selectedPatient.id);
    } catch (err: any) {
      toast({ title: "Request failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingPrescription(false);
    }
  };

  const handleDeletePatient = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to remove this patient request?")) return;
    
    try {
      const { error } = await supabase.from('consultations').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Patient Removed", description: "The consultation request has been deleted." });
      if (selectedPatient?.id === id) setSelectedPatient(null);
      fetchPatients();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdatePatientStatus = async (e: React.MouseEvent, id: string, status: string) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('consultations').update({ status }).eq('id', id);
      if (error) throw error;
      toast({ title: "Status Updated", description: `Patient marked as ${status}.` });
      fetchPatients();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <GlassCard key={s.label} transition={{ delay: i * 0.1 }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="font-display text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-primary/10 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Patient List - 3 cols */}
        <div className="lg:col-span-3 space-y-4">
          <GlassCard transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold text-lg">{t('doctor.patients')}</h2>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {isLoadingPatients ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : patients.length > 0 ? (
                patients.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    onClick={() => handleSelectPatient(p)}
                    className={`flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors cursor-pointer group ${selectedPatient?.id === p.id ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{p.name}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${statusColors[p.status as keyof typeof statusColors] || ''}`}>
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{p.symptoms}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right flex flex-col items-end">
                        <div className="text-[10px] text-muted-foreground mb-1">
                          Age: {p.age} • Last: {p.lastVisit}
                        </div>
                        <div className="flex items-center gap-2">
                          {p.status !== 'completed' && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-success hover:bg-success/10"
                              onClick={(e) => handleUpdatePatientStatus(e, p.id, 'completed')}
                              title="Mark as Completed"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDeletePatient(e, p.id)}
                            title="Delete Request"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t('doctor.noPatients')}
                </div>
              )}
            </div>
          </GlassCard>

          {/* Actions */}
          <div className="grid sm:grid-cols-3 gap-3">
            <Button 
              className="gradient-primary text-primary-foreground border-0 h-auto py-3"
              onClick={() => setIsPrescribing(true)}
              disabled={!selectedPatient}
            >
              <FileText className="h-4 w-4 me-2" />
              {t('doctor.prescribe')}
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3"
              onClick={() => handleRequestTest('lab')}
              disabled={!selectedPatient}
            >
              <FlaskConical className="h-4 w-4 me-2" />
              {t('doctor.request_lab')}
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3"
              onClick={() => handleRequestTest('radiology')}
              disabled={!selectedPatient}
            >
              <ScanLine className="h-4 w-4 me-2" />
              {t('doctor.request_rad')}
            </Button>
          </div>
        </div>

        {/* AI Panel - 2 cols */}
        <div className="lg:col-span-2">
          <GlassCard glow className="border-primary/20 min-h-[500px]" transition={{ delay: 0.3 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold text-lg">Patient Center</h2>
              </div>
              <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
                <Button 
                  variant={activeTab === 'ai' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-7 text-xs px-3"
                  onClick={() => setActiveTab('ai')}
                >
                  AI Insight
                </Button>
                <Button 
                  variant={activeTab === 'history' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-7 text-xs px-3"
                  onClick={() => setActiveTab('history')}
                >
                  History
                </Button>
                <Button 
                  variant={activeTab === 'analyze' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-7 text-xs px-3"
                  onClick={() => setActiveTab('analyze')}
                >
                  Analyze Doc
                </Button>
              </div>
            </div>

            {activeTab === 'ai' ? (
              <>
                <div className="text-xs text-muted-foreground flex items-center mb-4">
                  #{selectedPatient?.id.slice(0, 8)} | Age: {selectedPatient?.age}
                  {analysis && (
                    <> | Risk: <Badge variant="outline" className={`ms-1 text-[10px] py-0 h-4 ${analysis.risk_level === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-success/10 text-success border-success/20'}`}>{analysis.risk_level.toUpperCase()}</Badge></>
                  )}
                </div>

                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-sm">Groq AI is analyzing symptoms...</p>
                  </div>
                ) : analysis ? (
                  <div className="space-y-4">
                    {/* Symptoms at the top */}
                    <div>
                      <h3 className="text-sm font-medium flex items-center mb-2">
                        <Users className="h-4 w-4 me-2 text-primary" />
                        Patient Symptoms
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(selectedPatient?.symptoms) ? (
                          selectedPatient.symptoms.map((s: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                          ))
                        ) : typeof selectedPatient?.symptoms === 'string' ? (
                          selectedPatient.symptoms.split(',').map((s: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{s.trim()}</Badge>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">No symptoms recorded</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium flex items-center">
                          <AlertTriangle className="h-4 w-4 me-2 text-yellow-500" />
                          Possible Medical Considerations
                        </h3>
                        <div className="space-y-2">
                          {analysis.possible_conditions.map((c: any, i: number) => (
                            <div key={i} className="p-2 rounded-lg bg-secondary/50 border border-secondary">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold">{c.name}</span>
                                <Badge variant={c.confidence === 'high' ? 'destructive' : 'secondary'} className="text-[9px] px-1 h-4">
                                  {c.confidence}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground">{c.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium flex items-center mb-2">
                            <ChevronRight className="h-4 w-4 me-2 text-primary" />
                            Suggested Next Steps
                          </h3>
                          <ul className="space-y-1">
                            {analysis.recommended_next_steps.map((step: string, i: number) => (
                              <li key={i} className="text-[11px] flex items-start">
                                <span className="me-2 text-primary">•</span>
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium flex items-center mb-2">
                            <Lightbulb className="h-4 w-4 me-2 text-yellow-500" />
                            Missing Information
                          </h3>
                          <ul className="space-y-1">
                            {analysis.missing_information.map((info: string, i: number) => (
                              <li key={i} className="text-[11px] flex items-start">
                                <span className="me-2 text-yellow-500">?</span>
                                {info}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium flex items-center mb-2">
                        <ClipboardCheck className="h-4 w-4 me-2 text-green-500" />
                        Notes for Doctor
                      </h3>
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs italic">
                        {analysis.notes_for_doctor}
                      </div>
                    </div>

                    {/* Suggested Medications Section */}
                    {analysis.suggested_medications && analysis.suggested_medications.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium flex items-center mb-2">
                          <Pill className="h-4 w-4 me-2 text-purple-500" />
                          Suggested Medications
                        </h3>
                        <div className="space-y-2">
                          {analysis.suggested_medications.map((med: any, i: number) => (
                            <div key={i} className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold">{med.name}</span>
                                <Badge variant="outline" className="text-[9px] px-1 h-4">{med.dosage}</Badge>
                              </div>
                              <div className="text-[10px] text-muted-foreground space-y-0.5">
                                <p><span className="font-medium">Frequency:</span> {med.frequency}</p>
                                <p><span className="font-medium">Duration:</span> {med.duration}</p>
                                {med.notes && <p><span className="font-medium">Notes:</span> {med.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New Clinical Test Analysis Section */}
                    {analysis.clinical_findings_summary && (
                      <div>
                        <h3 className="text-sm font-medium flex items-center mb-2">
                          <FlaskConical className="h-4 w-4 me-2 text-blue-500" />
                          Test Request Analysis (AI)
                        </h3>
                        <div 
                          className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs md:text-[13px] leading-relaxed whitespace-pre-wrap font-medium"
                          dangerouslySetInnerHTML={{
                            __html: analysis.clinical_findings_summary
                              .replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-blue-600 dark:text-blue-400">$1</span>')
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Brain className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm text-center">No AI analysis for this session yet.</p>
                    {selectedPatient && (
                      <Button variant="ghost" size="sm" className="mt-4" onClick={() => handleAnalyze(selectedPatient)}>
                        Run AI Diagnostic
                      </Button>
                    )}
                  </div>
                )}
              </>
            ) : activeTab === 'history' ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5 text-primary">
                    <Pill className="h-4 w-4" />
                    Prescriptions
                  </h3>
                  <div className="space-y-2">
                    {history.prescriptions.length > 0 ? history.prescriptions.map((p: any, i: number) => (
                      <div key={i} className="p-2 rounded-lg bg-secondary/30 border border-secondary text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{Array.isArray(p.medications) ? p.medications.join(', ') : p.medications}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-muted-foreground">{p.instructions}</p>
                      </div>
                    )) : <p className="text-xs text-muted-foreground italic">No past prescriptions</p>}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5 text-success">
                    <FlaskConical className="h-4 w-4" />
                    Test Requests
                  </h3>
                  <div className="space-y-2">
                    {history.tests.length > 0 ? history.tests.map((t: any, i: number) => (
                      <div key={i} className="flex flex-col p-2 rounded-lg bg-secondary/30 border border-secondary text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">{t.name}</span>
                          <Badge variant="outline" className="text-[10px] py-0 h-4">{t.status}</Badge>
                        </div>
                        {t.documentUrl && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 text-primary self-start text-[10px]"
                            onClick={() => window.open(t.documentUrl, '_blank')}
                          >
                            <Paperclip className="h-2.5 w-2.5 me-1" />
                            View Document
                          </Button>
                        )}
                        {(t.result_notes || t.findings) && (
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                            {t.result_notes || t.findings}
                          </p>
                        )}
                      </div>
                    )) : <p className="text-xs text-muted-foreground italic">No past requests</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border rounded-xl bg-secondary/20 mb-4">
                  <div className="p-3 rounded-full bg-background mb-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">External Document Analysis</p>
                  <p className="text-[10px] text-muted-foreground mt-1 mb-4 text-center px-4">Upload lab results or radiology reports from other facilities for clinical AI interpretation.</p>
                  
                  <input
                    type="file"
                    id="doc-upload"
                    className="hidden"
                    accept=".pdf,.docx"
                    disabled={!selectedPatient || isAnalyzingDoc}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDocumentAnalysis(file);
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('doc-upload')?.click()}
                    disabled={!selectedPatient || isAnalyzingDoc}
                  >
                    {isAnalyzingDoc ? <Loader2 className="h-3 w-3 animate-spin me-2" /> : <Upload className="h-3 w-3 me-2" />}
                    Upload PDF/Word
                  </Button>
                </div>

                {isAnalyzingDoc ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Scan className="h-10 w-10 text-primary animate-pulse" />
                    <p className="text-sm text-muted-foreground">AI is interpreting the clinical data...</p>
                  </div>
                ) : docAnalysisResult ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 rounded-xl bg-primary/5 border border-primary/10"
                  >
                    <div className="flex items-center gap-2 mb-3 text-primary">
                      <Zap className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Clinical Consultant Analysis</span>
                    </div>
                    <div 
                      className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90 font-medium tracking-wide prose-headings:font-display"
                      dangerouslySetInnerHTML={{
                        __html: docAnalysisResult
                          .replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-primary">$1</span>')
                          .replace(/### (.*?)\n/g, '<h3 class="text-base font-bold text-primary mt-4 mb-2">$1</h3>')
                          .replace(/## (.*?)\n/g, '<h2 class="text-lg font-bold text-primary mt-5 mb-2">$1</h2>')
                          .replace(/# (.*?)\n/g, '<h1 class="text-xl font-bold text-primary mt-5 mb-2">$1</h1>')
                      }}
                    />
                  </motion.div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs italic">
                    Select a file to begin clinical analysis.
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <div className="mt-auto pt-6">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20">
                <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{t('doctor.ai.disclaimer')}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <Dialog open={isPrescribing} onOpenChange={setIsPrescribing}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Write Prescription - {selectedPatient?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="meds">Medications (comma separated)</Label>
              <Input
                id="meds"
                placeholder="e.g. Paracetamol 500mg, Amoxicillin 250mg"
                value={meds}
                onChange={(e) => setMeds(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="e.g. 1 pill 3 times a day for 5 days"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrescribing(false)}>Cancel</Button>
            <Button 
              className="gradient-primary" 
              onClick={handlePrescribe}
              disabled={isSavingPrescription || !meds.trim()}
            >
              {isSavingPrescription ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Prescription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOrdering} onOpenChange={setIsOrdering}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request {orderType === 'lab' ? 'Laboratory Test' : 'Radiology Scan'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{orderType === 'lab' ? 'Test Name' : 'Imaging Type'}</Label>
              {orderType === 'lab' ? (
                <Input
                  placeholder="e.g. Full Blood Count, Lipid Profile"
                  value={orderFormData.testName}
                  onChange={(e) => setOrderFormData({...orderFormData, testName: e.target.value})}
                />
              ) : (
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={orderFormData.imagingType}
                  onChange={(e) => setOrderFormData({...orderFormData, imagingType: e.target.value})}
                >
                  <option value="X-Ray">Simple X-Ray</option>
                  <option value="CT Scan">CT Scanner</option>
                  <option value="MRI">MRI</option>
                  <option value="Ultrasound">Ultrasound</option>
                  <option value="ECG">ECG</option>
                </select>
              )}
            </div>
            {orderType === 'radiology' && (
              <div className="grid gap-2">
                <Label>Body Part / Area</Label>
                <Input
                  placeholder="e.g. Chest, Abdomen, Left Knee"
                  value={orderFormData.bodyPart}
                  onChange={(e) => setOrderFormData({...orderFormData, bodyPart: e.target.value})}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Clinical Indication (Reason)</Label>
              <Textarea
                placeholder="What exactly do you want to find out?"
                value={orderFormData.clinicalIndication}
                onChange={(e) => setOrderFormData({...orderFormData, clinicalIndication: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrdering(false)}>Cancel</Button>
            <Button 
              className="gradient-primary" 
              onClick={handleOrderSubmit}
              disabled={isSavingPrescription || (orderType === 'lab' ? !orderFormData.testName : !orderFormData.bodyPart)}
            >
              {isSavingPrescription ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
