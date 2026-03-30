import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Navigate } from 'react-router-dom';
import Header from '@/components/Header';
import PatientDashboard from './dashboards/PatientDashboard';
import DoctorDashboard from './dashboards/DoctorDashboard';
import PharmacistDashboard from './dashboards/PharmacistDashboard';
import LabDashboard from './dashboards/LabDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();

  if (!user) return <Navigate to="/auth" replace />;

  const dashboards = {
    patient: PatientDashboard,
    doctor: DoctorDashboard,
    pharmacist: PharmacistDashboard,
    lab: LabDashboard,
    radiology: LabDashboard,
  };

  const DashboardComponent = dashboards[user.role];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold">
            {t('dashboard.welcome')}, {user.name}
          </h1>
          <p className="text-muted-foreground capitalize">{t(`auth.role.${user.role}`)}</p>
        </div>
        <DashboardComponent />
      </div>
    </div>
  );
}
