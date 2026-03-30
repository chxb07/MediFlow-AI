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
import { User, Stethoscope, Pill, FlaskConical, ScanLine, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const roles: { value: UserRole; icon: typeof User; labelKey: string }[] = [
  { value: 'patient', icon: User, labelKey: 'auth.role.patient' },
  { value: 'doctor', icon: Stethoscope, labelKey: 'auth.role.doctor' },
  { value: 'pharmacist', icon: Pill, labelKey: 'auth.role.pharmacist' },
  { value: 'lab', icon: FlaskConical, labelKey: 'auth.role.lab' },
  { value: 'radiology', icon: ScanLine, labelKey: 'auth.role.radiology' },
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
          title: "Registration successful",
          description: "Please check your email to confirm your account.",
        });
        // If auto-confirm is enabled in Supabase, we can navigate
        if (data.user) {
          login({
            id: data.user.id,
            name: name || email.split('@')[0],
            email: email,
            role: selectedRole,
          });
          navigate('/dashboard');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        const role = data.user.user_metadata?.role || 'patient';
        login({
          id: data.user.id,
          name: data.user.user_metadata?.full_name || email.split('@')[0],
          email: email,
          role: role as UserRole,
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: "Authentication error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={isRegister ? 'register' : 'login'}
              initial={{ opacity: 0, x: isRegister ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRegister ? -20 : 20 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-8">
                <h1 className="font-display text-2xl font-bold mb-1">
                  {isRegister ? t('auth.register') : t('auth.login')}
                </h1>
                <p className="text-muted-foreground text-sm mb-8">{t('app.tagline')}</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {isRegister && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('auth.name')}</Label>
                        <Input
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Sarah Johnson"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('auth.age')}</Label>
                        <Input
                          type="number"
                          value={age}
                          onChange={e => setAge(e.target.value)}
                          placeholder="25"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{t('auth.email')}</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('auth.password')}</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  {isRegister && (
                    <div className="space-y-2">
                      <Label>{t('auth.role')}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {roles.map(r => (
                          <button
                            type="button"
                            key={r.value}
                            onClick={() => setSelectedRole(r.value)}
                            className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-all border ${
                              selectedRole === r.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background text-muted-foreground hover:border-primary/30'
                            }`}
                          >
                            <r.icon className="h-4 w-4" />
                            {t(r.labelKey)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={isLoading} className="w-full gradient-primary text-primary-foreground border-0">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                    {t('auth.submit')}
                    {!isLoading && <ArrowRight className="ms-2 h-4 w-4" />}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <span className="text-muted-foreground">
                    {isRegister ? t('auth.switch.login') : t('auth.switch.register')}{' '}
                  </span>
                  <button
                    className="text-primary font-medium hover:underline"
                    onClick={() => setIsRegister(!isRegister)}
                  >
                    {isRegister ? t('auth.login') : t('auth.register')}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
