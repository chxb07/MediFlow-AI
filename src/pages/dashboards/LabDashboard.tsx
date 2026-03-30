import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import GlassCard from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, FlaskConical, Upload, Clock, CheckCircle2, Paperclip, FileImage, ScanLine, Brain } from 'lucide-react';

export default function LabDashboard() {
  const { t } = useI18n();
  const { user, supabase } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [findings, setFindings] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isRadiology = user?.role === 'radiology';

  const extractTextFromPDF = async (file: File): Promise<{text: string, images?: string[]}> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'] || (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error("PDF.js not loaded");
      
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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

      if (!textFound && pdf.numPages > 0) {
        // Render first page for Vision AI
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 }); // Reduced scale
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context!, viewport }).promise;
        return { text: "", images: [canvas.toDataURL('image/jpeg', 0.8)] };
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

  const generateAISummary = async (text: string) => {
    if (!text || text.length < 50) return;
    
    setIsSaving(true);
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { 
              role: "system", 
              content: "You are a medical lab assistant. Summarize the following lab/radiology report findings into 2-3 concise bullet points for a doctor. Focus on abnormal values or critical impressions." 
            },
            { role: "user", content: text }
          ],
          temperature: 0.1,
          max_tokens: 150
        })
      });

      if (!response.ok) throw new Error("AI Summary failed");
      
      const json = await response.json();
      const content = json.choices[0]?.message?.content;
      if (content) setFindings(content.trim());
    } catch (err: any) {
      toast({ title: "AI Summary failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const table = isRadiology ? 'radiology_reports' : 'lab_tests';
      console.log(`Fetching from ${table} as role ${user?.role}`);
      
      const selectCols = isRadiology 
        ? 'id, status, created_at, request_type, document_url' 
        : 'id, status, created_at, test_name, document_url';
      
      const { data, error } = await supabase
        .from(table)
        .select(`
          ${selectCols},
          consultation:consultations (
            id,
            patient:profiles!patient_id (full_name),
            doctor:profiles!doctor_id (full_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      if (data) {
        setRequests(data.map((r: any) => ({
          id: r.id.slice(0, 8).toUpperCase(),
          realId: r.id,
          test: isRadiology ? r.request_type : r.test_name,
          patient: (r.consultation as any)?.patient?.full_name || 'Unknown',
          doctor: (r.consultation as any)?.doctor?.full_name || 'MD',
          date: new Date(r.created_at).toLocaleDateString(),
          status: r.status || 'pending',
          documentUrl: r.document_url,
          clinical_indication: r.clinical_indication,
          body_part: r.body_part,
          imaging_type: r.imaging_type
        })));
      }
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [supabase, user?.role]);

  const handleAttachResult = async () => {
    if (!selectedRequest || !findings.trim()) return;
    
    setIsSaving(true);
    try {
      let documentUrl = null;
      let extractedText = "";

      if (file) {
        let extractedData: {text: string, images?: string[]} = { text: "" };
        
        if (file.type === 'application/pdf') {
          toast({ title: "Analyzing Document", description: "Processing PDF content..." });
          extractedData = await extractTextFromPDF(file);
        } else if (file.type.includes('word') || file.name.endsWith('.docx')) {
          toast({ title: "Analyzing Document", description: "Extracting text..." });
          const text = await extractTextFromWord(file);
          extractedData = { text };
        } else if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          extractedData = { text: "", images: [base64] };
        }

        const isVision = !!(extractedData.images && extractedData.images.length > 0);
        extractedText = extractedData.text;

        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedRequest.realId}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('medical-results')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('medical-results')
          .getPublicUrl(filePath);
        
        documentUrl = publicUrl;

        // AI Summary specifically for technicians
        if (isVision || (extractedText && extractedText.length > 50)) {
          const apiKey = import.meta.env.VITE_GROQ_API_KEY;
          const messages = [
            { 
              role: "system", 
              content: "You are a medical lab assistant. Summarize the following lab/radiology report findings into 2-3 concise bullet points for a doctor. Focus on abnormal values or critical impressions." 
            }
          ];

          if (isVision) {
            messages.push({
              role: "user",
              content: [
                { type: "text", text: "Please summarize this report scan." },
                { type: "image_url", image_url: { url: extractedData.images![0] } }
              ]
            } as any);
          } else {
            messages.push({
              role: "user",
              content: extractedText
            } as any);
          }

          const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: isVision ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
              messages,
              temperature: 0.1,
              max_tokens: 200
            })
          });

          if (aiResponse.ok) {
            const aiJson = await aiResponse.json();
            extractedText = aiJson.choices[0]?.message?.content || extractedText;
          } else {
            const errorJson = await aiResponse.json().catch(() => ({}));
            console.warn("AI Lab Summary failed:", errorJson.error?.message);
          }
        }
      }

      const table = isRadiology ? 'radiology_reports' : 'lab_tests';
      const updateData = isRadiology 
        ? { findings: findings, status: 'completed', document_url: documentUrl, extracted_text: extractedText }
        : { result_notes: findings, status: 'completed', document_url: documentUrl, extracted_text: extractedText };

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', selectedRequest.realId);

      if (error) throw error;
      
      toast({ title: "Result Attached", description: "The findings and document have been saved." });
      setIsAttaching(false);
      setFindings('');
      setFile(null);
      fetchRequests();
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string) => {
    try {
      const table = isRadiology ? 'radiology_reports' : 'lab_tests';
      const { error } = await supabase
        .from(table)
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Status Updated", description: "Request marked as completed." });
      fetchRequests();
    } catch (error: any) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const completedToday = requests.filter(r => r.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{isRadiology ? 'Pending Reports' : t('lab.pending')}</p>
              <p className="font-display text-2xl font-bold mt-1">{pendingCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              {isRadiology ? <ScanLine className="h-5 w-5" /> : <FlaskConical className="h-5 w-5" />}
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed Today</p>
              <p className="font-display text-2xl font-bold mt-1">{completedToday}</p>
            </div>
            <div className="p-3 rounded-xl bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">{t('lab.pending')}</h2>
        </div>
        <div className="space-y-3">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 mb-4">
              Error: {errorMsg} - Check if latest SQL is applied.
            </div>
          )}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requests.length > 0 ? (
            requests.map(request => (
              <div key={request.realId} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{isRadiology ? 'RAD' : 'LAB'}-{request.id}</span>
                    <Badge variant="outline" className={request.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'}>
                      {request.status === 'pending' ? <Clock className="h-3 w-3 me-1" /> : <CheckCircle2 className="h-3 w-3 me-1" />}
                      {request.status}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm">{request.test}</p>
                  {request.clinical_indication && (
                    <p className="text-[10px] text-primary bg-primary/5 px-2 py-1 rounded mt-1 mb-1 border border-primary/10">
                      <strong>Indication:</strong> {request.clinical_indication}
                    </p>
                  )}
                  {isRadiology && request.body_part && (
                    <div className="flex gap-2 text-[9px] mb-1">
                      <span className="bg-secondary px-1.5 py-0.5 rounded">Area: {request.body_part}</span>
                      <span className="bg-secondary px-1.5 py-0.5 rounded">Type: {request.imaging_type}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Patient: {request.patient} • Ordered by: {request.doctor}</p>
                  <p className="text-xs text-muted-foreground">{request.date}</p>
                </div>
                {request.status === 'pending' ? (
                  <div className="flex gap-2 shrink-0 ms-3">
                    <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(request.realId)}>
                      <CheckCircle2 className="h-3 w-3 me-1" />
                      Complete
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="hidden sm:flex"
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsAttaching(true);
                      }}
                    >
                      <Paperclip className="h-3 w-3 me-1" />
                      {t('lab.attach')}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="shrink-0 ms-3"
                    disabled={!request.documentUrl}
                    onClick={() => request.documentUrl && window.open(request.documentUrl, '_blank')}
                  >
                    <FileImage className="h-3 w-3 me-1" />
                    {request.documentUrl ? 'View Report' : 'No Report'}
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No pending {isRadiology ? 'radiology' : 'laboratory'} requests found.
            </div>
          )}
        </div>
      </GlassCard>

      <Dialog open={isAttaching} onOpenChange={setIsAttaching}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Attach Result - {selectedRequest?.test}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file">Final Report (PDF/Word)</Label>
              <div className="flex gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={async (e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    if (f) {
                      // Auto-extract and optionally summarize
                      const text = f.type === 'application/pdf' 
                        ? await extractTextFromPDF(f) 
                        : await extractTextFromWord(f);
                      if (text) {
                        toast({ title: "Document Processed", description: "Click 'Analyze with AI' to summarize." });
                        // We store it temporarily for summarization
                        (e.target as any)._extractedText = text;
                      }
                    }
                  }}
                  className="cursor-pointer"
                />

              </div>
              <p className="text-[10px] text-muted-foreground">Upload the official signed report for AI analysis.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="findings">{isRadiology ? 'Summary Findings' : 'Summary Notes'}</Label>
              <Textarea
                id="findings"
                placeholder={isRadiology ? "Key observations..." : "Key lab values..."}
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttaching(false)}>Cancel</Button>
            <Button 
              className="gradient-primary" 
              onClick={handleAttachResult}
              disabled={isSaving || !findings.trim()}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <CheckCircle2 className="h-4 w-4 me-2" />}
              Complete Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
