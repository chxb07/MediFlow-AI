import Header from '@/components/Header';
import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import heroImage from '@/assets/hero-medical.jpg';
import { Brain, FileText, FlaskConical, Languages, ArrowRight, Shield, Zap, Users } from 'lucide-react';
import GlassCard from '@/components/GlassCard';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function Landing() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const features = [
    { icon: Brain, titleKey: 'landing.feature1.title', descKey: 'landing.feature1.desc', color: 'text-primary' },
    { icon: FileText, titleKey: 'landing.feature2.title', descKey: 'landing.feature2.desc', color: 'text-success' },
    { icon: FlaskConical, titleKey: 'landing.feature3.title', descKey: 'landing.feature3.desc', color: 'text-warning' },
    { icon: Languages, titleKey: 'landing.feature4.title', descKey: 'landing.feature4.desc', color: 'text-info' },
  ];

  const stats = [
    { value: '50K+', label: 'Active Users' },
    { value: '99.9%', label: 'Uptime' },
    { value: '200+', label: 'Clinics' },
    { value: '15M+', label: 'Records Secured' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute top-20 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-10 -left-20 w-72 h-72 rounded-full bg-info/5 blur-3xl animate-float" style={{ animationDelay: '3s' }} />

        <div className="relative container mx-auto px-4 py-24 md:py-36">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 text-sm font-medium text-muted-foreground">
              <Zap className="h-4 w-4 text-primary" />
              AI-Powered Healthcare Platform
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              {t('landing.hero.title')}{' '}
              <span className="gradient-text">{t('landing.hero.highlight')}</span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              {t('landing.hero.subtitle')}
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="gradient-primary text-primary-foreground border-0 glow-sm hover:glow-md transition-shadow text-base px-8"
                onClick={() => navigate('/auth?mode=register')}
              >
                {t('landing.cta')}
                <ArrowRight className="ms-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8"
              >
                {t('landing.cta2')}
              </Button>
            </motion.div>

            {/* Hero Image */}
            <motion.div
              className="mt-16 relative"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
            >
              <div className="glass rounded-2xl p-2 glow-md">
                <img
                  src={heroImage}
                  alt="MediFlow AI Dashboard"
                  width={1280}
                  height={720}
                  className="rounded-xl w-full"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="font-display text-3xl md:text-4xl font-bold gradient-text mb-1">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              A comprehensive suite of tools designed for modern healthcare delivery.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <GlassCard
                key={f.titleKey}
                className="group hover:glow-sm transition-all duration-300 cursor-default"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={`inline-flex p-3 rounded-xl bg-primary/10 mb-4 ${f.color}`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{t(f.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(f.descKey)}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 mb-6 text-primary">
              <Shield className="h-5 w-5" />
              <span className="font-medium text-sm">HIPAA Compliant & Secure</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Trusted by Healthcare Professionals
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-10">
              Built with security and compliance at its core. Your patient data is protected with enterprise-grade encryption.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">Join 200+ clinics already using MediFlow AI</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 MediFlow AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
