import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from './LanguageSwitcher';
import { ModeToggle } from './mode-toggle';
import { Activity, LogOut, LayoutDashboard } from 'lucide-react';

export default function Header() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="gradient-primary rounded-lg p-1.5">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">{t('app.name')}</span>
        </Link>

        <div className="flex items-center gap-3">
          <ModeToggle />
          <LanguageSwitcher />
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <LayoutDashboard className="h-4 w-4 me-1" />
                {t('nav.dashboard')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }}>
                <LogOut className="h-4 w-4 me-1" />
                {t('nav.logout')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                {t('nav.login')}
              </Button>
              <Button size="sm" className="gradient-primary text-primary-foreground border-0" onClick={() => navigate('/auth?mode=register')}>
                {t('nav.register')}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
