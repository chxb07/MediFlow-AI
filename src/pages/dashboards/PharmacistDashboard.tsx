import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import GlassCard from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pill, QrCode, CheckCircle2, Clock, Package, Loader2 } from 'lucide-react';

export default function PharmacistDashboard() {
  const { t } = useI18n();
  const { supabase } = useAuth();
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState([
    { label: t('pharma.prescriptions'), value: '0', icon: Pill, color: 'text-primary' },
    { label: 'Delivered Today', value: '0', icon: Package, color: 'text-success' },
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPrescriptions = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Step 1: Let's fetch just the raw prescriptions first to see if they exist
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          id,
          medications,
          instructions,
          status,
          created_at,
          consultation_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Step 2: For each prescription, fetch the patient name separately to avoid complex join errors
        const prescriptionsWithDetails = await Promise.all(data.map(async (p) => {
          const { data: consultData } = await supabase
            .from('consultations')
            .select(`
              patient:profiles!patient_id (full_name),
              doctor:profiles!doctor_id (full_name)
            `)
            .eq('id', p.consultation_id)
            .single();

          return {
            id: p.id.slice(0, 8).toUpperCase(),
            realId: p.id,
            patient: (consultData as any)?.patient?.full_name || 'Unknown Patient',
            doctor: (consultData as any)?.doctor?.full_name || 'Doctor',
            medications: p.medications || [],
            date: new Date(p.created_at).toLocaleDateString(),
            status: p.status || 'pending'
          };
        }));

        setPrescriptions(prescriptionsWithDetails);
        
        const pendingCount = prescriptionsWithDetails.filter(p => p.status === 'pending').length;
        const deliveredToday = prescriptionsWithDetails.filter(p => p.status === 'delivered').length;
        
        setStats([
          { label: t('pharma.prescriptions'), value: pendingCount.toString(), icon: Pill, color: 'text-primary' },
          { label: 'Delivered Today', value: deliveredToday.toString(), icon: Package, color: 'text-success' },
        ]);
      } else {
        setPrescriptions([]);
      }
    } catch (error: any) {
      console.error("Error fetching prescriptions:", error);
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [supabase]);

  const handleConfirmDelivery = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status: 'delivered' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Delivery Confirmed",
        description: "Prescription marked as delivered.",
      });
      fetchPrescriptions();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <div className="flex gap-3">
        <Button className="gradient-primary text-primary-foreground border-0">
          <QrCode className="h-4 w-4 me-2" />
          {t('pharma.verify')}
        </Button>
      </div>

      <GlassCard transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-2 mb-4">
          <Pill className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">{t('pharma.prescriptions')}</h2>
        </div>
        <div className="space-y-3">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 mb-4">
              Error: {errorMsg} - Tip: Ensure you have run the latest SQL update.
            </div>
          )}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : prescriptions.length > 0 ? (
            prescriptions.map(p => (
              <div key={p.realId} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">RX-{p.id}</span>
                    <Badge variant="outline" className={p.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'}>
                      {p.status === 'pending' ? <Clock className="h-3 w-3 me-1" /> : <CheckCircle2 className="h-3 w-3 me-1" />}
                      {p.status}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm">{p.patient}</p>
                  <p className="text-xs text-muted-foreground">{p.doctor} • {p.date}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.medications.map((m: string) => (
                      <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                    ))}
                  </div>
                </div>
                {p.status === 'pending' && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="shrink-0 ms-3"
                    onClick={() => handleConfirmDelivery(p.realId)}
                  >
                    {t('pharma.confirm')}
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No recent prescriptions found.
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
