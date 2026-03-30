import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import GlassCard from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { Loader2, CalendarDays, FileText, ClipboardList, MessageCircle, Send, Clock, CheckCircle2, AlertCircle, Paperclip, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";

const symptomQuestions = [
  'What symptoms are you experiencing?',
  'How long have you had these symptoms?',
  'Rate your pain level (1-10)',
  'Do you have any allergies?',
];

export default function PatientDashboard() {
  const { t } = useI18n();
  const { supabase } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<{ role: 'system' | 'user'; text: string }[]>([
    { role: 'system', text: symptomQuestions[0] },
  ]);
  const [input, setInput] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [bookingSymptom, setBookingSymptom] = useState('');
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch real prescriptions
        const { data: prescData } = await supabase
          .from('prescriptions')
          .select('*')
          .order('created_at', { ascending: false });
        setPrescriptions(prescData || []);

        // 2. Fetch real tests (Lab + Radiology)
        const [labRes, radRes] = await Promise.all([
          supabase.from('lab_tests').select('*').order('created_at', { ascending: false }),
          supabase.from('radiology_reports').select('*').order('created_at', { ascending: false })
        ]);

        const allTests = (labRes.data || []).map(t => ({ ...t, type: 'lab', name: t.test_name }))
          .concat((radRes.data || []).map(r => ({ ...r, type: 'radiology', name: r.request_type })));
        
        setTests(allTests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

        // 3. Fetch real consultations for appointment list
        const { data: consData } = await supabase
          .from('consultations')
          .select('id, created_at, status, symptoms, doctor:profiles!doctor_id(full_name)')
          .neq('status', 'completed')
          .order('created_at', { ascending: false });

        // 4. Fetch doctors for booking selection
        const { data: docsData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'doctor');
        setDoctors(docsData || []);

        const mappedApps = (consData || []).map(c => ({
          id: c.id,
          doctor: (c as any).doctor?.full_name || 'Assigned Doctor',
          specialty: Array.isArray(c.symptoms) ? c.symptoms.join(', ') : (c.symptoms || 'General Checkup'),
          date: new Date(c.created_at).toLocaleDateString(),
          time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: c.status === 'new' ? 'pending' : (c.status === 'urgent' ? 'urgent' : 'confirmed')
        }));
        setAppointments(mappedApps);

      } catch (err: any) {
        console.error("Error fetching patient data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [supabase]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMessages = [...chatMessages, { role: 'user' as const, text: input }];
    const nextQ = questionIndex + 1;
    
    if (nextQ < symptomQuestions.length) {
      newMessages.push({ role: 'system', text: symptomQuestions[nextQ] });
      setQuestionIndex(nextQ);
      setChatMessages(newMessages);
    } else {
      newMessages.push({ role: 'system', text: 'Recording your symptoms...' });
      setChatMessages(newMessages);
      
      const allSymptoms = newMessages
        .filter(m => m.role === 'user')
        .map(m => m.text);
      
      setBookingSymptom(allSymptoms.join(' \n'));
      setIsBookingOpen(true);
      
      setChatMessages([...newMessages.slice(0, -1), { 
        role: 'system', 
        text: 'Great! I have recorded your symptoms. Now, please select your preferred doctor in the booking window to finalize your request.' 
      }]);
    }
    setInput('');
  };

  const handleBookSubmit = async () => {
    if (!selectedDoctorId || !bookingSymptom.trim()) {
      toast({ title: "Missing Info", description: "Please select a doctor and describe your symptoms.", variant: "destructive" });
      return;
    }
    setIsSavingAppointment(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Auth required");

      const { error } = await supabase
        .from('consultations')
        .insert({
          patient_id: userData.user.id,
          doctor_id: selectedDoctorId,
          symptoms: [bookingSymptom],
          status: 'new'
        });

      if (error) throw error;
      
      toast({ title: "Appointment Requested", description: "Your request has been sent to the doctor." });
      setBookingSymptom('');
      setSelectedDoctorId('');
      setChatMessages([{ role: 'system', text: symptomQuestions[0] }]);
      setQuestionIndex(0);
      // Trigger refresh
      window.location.reload(); 
    } catch (err: any) {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingAppointment(false);
    }
  };

  const stats = [
    { label: t('stats.appointments'), value: appointments.length.toString(), icon: CalendarDays, color: 'text-primary' },
    { label: t('stats.prescriptions'), value: prescriptions.length.toString(), icon: FileText, color: 'text-success' },
    { label: t('stats.tests'), value: tests.length.toString(), icon: ClipboardList, color: 'text-warning' },
  ];

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

      {/* Unified Symptom & Booking Section */}
      <GlassCard className="flex flex-col" transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">{t('patient.symptoms.title')}</h2>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-1 space-y-3 mb-4 max-h-80 overflow-y-auto">
          {chatMessages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                m.role === 'user'
                  ? 'gradient-primary text-primary-foreground rounded-br-sm'
                  : 'bg-secondary text-secondary-foreground rounded-bl-sm'
              }`}>
                {m.text}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Doctor Selection */}
        <div className="mb-4">
          <Label htmlFor="doctor" className="text-sm font-medium mb-2 block">Select Doctor</Label>
          <Select onValueChange={setSelectedDoctorId} value={selectedDoctorId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a physician" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doc) => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Input and Book Button */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('patient.symptoms.placeholder')}
            className="min-h-[44px] max-h-24 resize-none"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <Button 
            size="icon" 
            className="gradient-primary text-primary-foreground border-0 shrink-0" 
            onClick={handleSend}
            disabled={!selectedDoctorId || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Book Appointment Button */}
        <Button 
          className="mt-4 gradient-primary text-primary-foreground border-0 w-full" 
          onClick={() => {
            if (!selectedDoctorId) {
              toast({ title: "Select a Doctor", description: "Please choose a physician first.", variant: "destructive" });
              return;
            }
            if (!bookingSymptom.trim()) {
              toast({ title: "Describe Symptoms", description: "Please describe your symptoms first.", variant: "destructive" });
              return;
            }
            handleBookSubmit();
          }}
          disabled={isSavingAppointment || !selectedDoctorId || !bookingSymptom.trim()}
        >
          {isSavingAppointment ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin me-2" />
              Processing...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 me-2" />
              {t('patient.book')}
            </>
          )}
        </Button>
      </GlassCard>

      {/* Appointments List */}
      <GlassCard transition={{ delay: 0.3 }}>
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">{t('dashboard.appointments')}</h2>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : appointments.length > 0 ? (
            appointments.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium text-sm">{a.doctor}</p>
                  <p className="text-xs text-muted-foreground">{a.specialty}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {a.date} • {a.time}
                  </div>
                </div>
                <Badge variant={a.status === 'confirmed' ? 'default' : 'secondary'} className={a.status === 'confirmed' ? 'bg-success/10 text-success border-success/20' : ''}>
                  {a.status === 'confirmed' ? <CheckCircle2 className="h-3 w-3 me-1" /> : <AlertCircle className="h-3 w-3 me-1" />}
                  {a.status}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No appointments found.
            </div>
          )}
        </div>
      </GlassCard>

      {/* Prescriptions */}
      <GlassCard transition={{ delay: 0.4 }}>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">{t('dashboard.prescriptions')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-start py-2 font-medium">Medications</th>
                <th className="text-start py-2 font-medium">Date</th>
                <th className="text-start py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.length > 0 ? prescriptions.map(p => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-3 font-medium">{(p.medications || []).join(', ')}</td>
                  <td className="py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="py-3">
                    <Badge variant="secondary" className={p.status === 'delivered' ? 'bg-success/10 text-success' : ''}>
                      {p.status}
                    </Badge>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">
                    No prescriptions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Tests and Results */}
      <GlassCard transition={{ delay: 0.5 }}>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="h-5 w-5 text-warning" />
          <h2 className="font-display font-semibold text-lg">Medical Reports & Tests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-start py-2 font-medium">Test Name</th>
                <th className="text-start py-2 font-medium">Type</th>
                <th className="text-start py-2 font-medium">Status</th>
                <th className="text-start py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {tests.length > 0 ? tests.map(t => (
                <tr key={t.id} className="border-b border-border/50">
                  <td className="py-3 font-medium">{t.name}</td>
                  <td className="py-3 text-muted-foreground capitalize">{t.type}</td>
                  <td className="py-3">
                    <Badge variant="outline" className={t.status === 'completed' ? 'bg-success/10 text-success border-success/20' : ''}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="py-3">
                    {t.document_url ? (
                      <Button 
                        size="sm" 
                        variant="link" 
                        className="p-0 h-auto text-primary"
                        onClick={() => window.open(t.document_url, '_blank')}
                      >
                        <Paperclip className="h-3 w-3 me-1" />
                        View Report
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No file attached</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No medical reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>


    </div>
  );
}
