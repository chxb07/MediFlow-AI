import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from './LanguageSwitcher';
import { ModeToggle } from './mode-toggle';
import { Activity, LogOut, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-border/30">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <motion.div
            className="relative gradient-primary rounded-xl p-1.5 glow-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Activity className="h-5 w-5 text-white" />
            {/* Animated ring */}
            <span className="absolute inset-0 rounded-xl border border-primary/40 animate-ping opacity-30" />
          </motion.div>
          <span className="font-display font-bold text-[1.1rem] tracking-tight">
            <span className="gradient-text">Medi</span>
            <span>Flow AI</span>
          </span>
        </Link>

        {/* Right nav */}
        <div className="flex items-center gap-2">
          <ModeToggle />
          <LanguageSwitcher />

          {user ? (
            <div className="flex items-center gap-1.5 ms-1">
              <Button
                variant="ghost"
                size="sm"
                className="nav-pill px-2 sm:px-3 text-xs sm:text-sm rounded-full"
                onClick={() => navigate('/dashboard')}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.dashboard')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="nav-pill px-2 sm:px-3 text-xs sm:text-sm rounded-full text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                onClick={() => { logout(); navigate('/'); }}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.logout')}</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 ms-1">
              <Button
                variant="ghost"
                size="sm"
                className="nav-pill px-2 sm:px-3 text-xs sm:text-sm rounded-full"
                onClick={() => navigate('/auth')}
              >
                {t('nav.login')}
              </Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="sm"
                  className="gradient-primary text-white border-0 rounded-full px-4 text-xs sm:text-sm glow-sm hover:glow-md transition-all"
                  onClick={() => navigate('/auth?mode=register')}
                >
                  {t('nav.register')}
                </Button>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
