import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { login, UserRole } from '@/lib/auth';
import Header from '@/components/Header';
import GlassCard from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Stethoscope, Pill, FlaskConical, ScanLine, ArrowRight, Loader2, Sparkles, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const roles: { value: UserRole; icon: typeof User; labelKey: string; color: string; bg: string }[] = [
  { value: 'patient', icon: User, labelKey: 'auth.role.patient', color: 'text-primary', bg: 'bg-primary/10' },
  { value: 'doctor', icon: Stethoscope, labelKey: 'auth.role.doctor', color: 'text-[hsl(262_83%_68%)]', bg: 'bg-[hsl(262_83%_68%/0.1)]' },
  { value: 'pharmacist', icon: Pill, labelKey: 'auth.role.pharmacist', color: 'text-warning', bg: 'bg-warning/10' },
  { value: 'lab', icon: FlaskConical, labelKey: 'auth.role.lab', color: 'text-[hsl(158_80%_45%)]', bg: 'bg-[hsl(158_80%_45%/0.1)]' },
  { value: 'radiology', icon: ScanLine, labelKey: 'auth.role.radiology', color: 'text-destructive', bg: 'bg-destructive/10' },
];

export default function Auth() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [isRegister, setIsRegister] = useState(params.get('mode') === 'register');
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: selectedRole,
              age: parseInt(age) || 30,
            },
          },
        });
        if (error) throw error;
        toast({
          title: 'Registration successful',
          description: 'Please check your email to confirm your account.',
        });
        if (data.user) {
          login({
            id: data.user.id,
            name: name || email.split('@')[0],
            email,
            role: selectedRole,
          });
          navigate('/dashboard');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const role = data.user.user_metadata?.role || 'patient';
        login({
          id: data.user.id,
          name: data.user.user_metadata?.full_name || email.split('@')[0],
          email,
          role: role as UserRole,
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({ title: 'Authentication error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="orb orb-cyan absolute top-20 -right-40 w-[500px] h-[500px] animate-float" />
      <div className="orb orb-violet absolute bottom-10 -left-40 w-[400px] h-[400px] animate-float-delay" />

      <div className="relative">
        <Header />
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={isRegister ? 'register' : 'login'}
                initial={{ opacity: 0, x: isRegister ? 30 : -30, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: isRegister ? -30 : 30, scale: 0.98 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="glass-card rounded-3xl p-8 border-neon">
                  {/* Header */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="gradient-primary rounded-xl p-2 glow-sm">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">MediFlow AI</span>
                    </div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1.5 tracking-tight">
                      {isRegister ? t('auth.register') : t('auth.login')}
                    </h1>
                    <p className="text-muted-foreground text-sm">{t('app.tagline')}</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {isRegister && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-4"
                      >
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('auth.name')}</Label>
                          <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Sarah Johnson"
                            className="rounded-xl border-border/50 bg-background/60 focus:border-primary/50"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('auth.age')}</Label>
                          <Input
                            type="number"
                            value={age}
                            onChange={e => setAge(e.target.value)}
                            placeholder="25"
                            className="rounded-xl border-border/50 bg-background/60 focus:border-primary/50"
                          />
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('auth.email')}</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="rounded-xl border-border/50 bg-background/60 focus:border-primary/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('auth.password')}</Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="rounded-xl border-border/50 bg-background/60 focus:border-primary/50"
                      />
                    </div>

                    {isRegister && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2"
                      >
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('auth.role')}</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {roles.map(r => (
                            <motion.button
                              type="button"
                              key={r.value}
                              onClick={() => setSelectedRole(r.value)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              className={`flex items-center gap-2.5 p-3 rounded-xl text-sm font-medium transition-all border ${
                                selectedRole === r.value
                                  ? `border-primary/50 ${r.bg} ${r.color} shadow-md`
                                  : 'border-border/40 bg-background/40 text-muted-foreground hover:border-primary/20 hover:bg-background/70'
                              }`}
                            >
                              <r.icon className="h-4 w-4 shrink-0" />
                              {t(r.labelKey)}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full gradient-primary text-white border-0 rounded-xl h-11 glow-sm hover:glow-md transition-all font-semibold"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                        {t('auth.submit')}
                        {!isLoading && <ArrowRight className="ms-2 h-4 w-4" />}
                      </Button>
                    </motion.div>
                  </form>

                  <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground">
                      {isRegister ? t('auth.switch.login') : t('auth.switch.register')}{' '}
                    </span>
                    <button
                      className="text-primary font-semibold hover:underline transition-all"
                      onClick={() => setIsRegister(!isRegister)}
                    >
                      {isRegister ? t('auth.login') : t('auth.register')}
                    </button>
                  </div>

                  {/* Trust badge */}
                  <div className="mt-6 pt-5 border-t border-border/30 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    <Shield className="h-3 w-3 text-success" />
                    <span>HIPAA Compliant · End-to-End Encrypted</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
