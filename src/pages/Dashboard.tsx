import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Navigate } from 'react-router-dom';
import Header from '@/components/Header';
import PatientDashboard from './dashboards/PatientDashboard';
import DoctorDashboard from './dashboards/DoctorDashboard';
import PharmacistDashboard from './dashboards/PharmacistDashboard';
import LabDashboard from './dashboards/LabDashboard';
import { motion } from 'framer-motion';
import { User, Stethoscope, Pill, FlaskConical, ScanLine } from 'lucide-react';

const roleConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  patient: { label: 'Patient', icon: User, color: 'text-primary', bg: 'bg-primary/10' },
  doctor: { label: 'Doctor', icon: Stethoscope, color: 'text-[hsl(262_83%_68%)]', bg: 'bg-[hsl(262_83%_68%/0.1)]' },
  pharmacist: { label: 'Pharmacist', icon: Pill, color: 'text-warning', bg: 'bg-warning/10' },
  lab: { label: 'Lab Technician', icon: FlaskConical, color: 'text-[hsl(158_80%_45%)]', bg: 'bg-[hsl(158_80%_45%/0.1)]' },
  radiology: { label: 'Radiologist', icon: ScanLine, color: 'text-destructive', bg: 'bg-destructive/10' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();

  if (!user) return <Navigate to="/auth" replace />;

  const dashboards: Record<string, any> = {
    patient: PatientDashboard,
    doctor: DoctorDashboard,
    pharmacist: PharmacistDashboard,
    lab: LabDashboard,
    radiology: LabDashboard,
  };

  const DashboardComponent = dashboards[user.role];
  const config = roleConfig[user.role] || roleConfig.patient;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle background */}
      <div className="fixed inset-0 gradient-hero pointer-events-none" />
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="orb orb-cyan fixed top-20 right-0 w-[500px] h-[500px] animate-float opacity-40 pointer-events-none" />
      <div className="orb orb-violet fixed bottom-0 left-0 w-[400px] h-[400px] animate-float-delay opacity-30 pointer-events-none" />

      <div className="relative">
        <Header />
        <div className="container mx-auto px-4 py-8">
          {/* Welcome Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4">
              <motion.div
                className={`p-3 rounded-2xl ${config.bg} shrink-0`}
                whileHover={{ rotate: [0, -5, 5, 0], scale: 1.05 }}
                transition={{ duration: 0.4 }}
              >
                <Icon className={`h-7 w-7 ${config.color}`} />
              </motion.div>
              <div>
                <p className="text-sm text-muted-foreground mb-0.5 font-medium uppercase tracking-wide">
                  {config.label} Dashboard
                </p>
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                  {t('dashboard.welcome')},{' '}
                  <span className="gradient-text">{user.name}</span>
                </h1>
              </div>
            </div>
          </motion.div>

          <DashboardComponent />
        </div>
      </div>
    </div>
  );
}
