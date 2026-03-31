import Header from '@/components/Header';
import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import heroImage from '@/assets/hero-medical.jpg';
import { Brain, FileText, FlaskConical, Languages, ArrowRight, Shield, Zap, Users, Sparkles, Activity, Lock } from 'lucide-react';
import GlassCard from '@/components/GlassCard';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: 'easeOut' as const },
  }),
};

export default function Landing() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const features = [
    { icon: Brain, titleKey: 'landing.feature1.title', descKey: 'landing.feature1.desc', color: 'text-primary', bg: 'bg-primary/10', glow: 'glow-sm' },
    { icon: FileText, titleKey: 'landing.feature2.title', descKey: 'landing.feature2.desc', color: 'text-[hsl(158_80%_45%)]', bg: 'bg-[hsl(158_80%_45%/0.1)]', glow: 'glow-emerald' },
    { icon: FlaskConical, titleKey: 'landing.feature3.title', descKey: 'landing.feature3.desc', color: 'text-warning', bg: 'bg-warning/10', glow: '' },
    { icon: Languages, titleKey: 'landing.feature4.title', descKey: 'landing.feature4.desc', color: 'text-accent', bg: 'bg-accent/10', glow: 'glow-violet' },
  ];

  const stats = [
    { value: '50K+', label: 'Active Users', icon: Users },
    { value: '99.9%', label: 'Uptime', icon: Activity },
    { value: '200+', label: 'Clinics', icon: Shield },
    { value: '15M+', label: 'Records Secured', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 grid-bg opacity-40" />

        {/* Floating orbs */}
        <div className="orb orb-cyan absolute top-10 -right-32 w-[600px] h-[600px] animate-float" />
        <div className="orb orb-violet absolute bottom-0 -left-32 w-[500px] h-[500px] animate-float-delay" />
        <div className="orb orb-emerald absolute top-1/2 left-1/2 -translate-x-1/2 w-[300px] h-[300px] animate-float-slow" />

        <div className="relative container mx-auto px-4 pt-24 pb-16 md:pt-36 md:pb-24">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div variants={fadeUp} custom={0}>
              <div className="inline-flex items-center gap-2 glass rounded-full px-5 py-2 mb-8 text-sm font-medium border border-primary/20 glow-sm">
                <span className="dot-pulse" />
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">AI-Powered Healthcare Platform</span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05]"
            >
              {t('landing.hero.title')}{' '}
              <span className="gradient-text">{t('landing.hero.highlight')}</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              {t('landing.hero.subtitle')}
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="gradient-primary text-white border-0 rounded-full glow-md hover:glow-lg transition-all text-base px-8 h-12"
                  onClick={() => navigate('/auth?mode=register')}
                >
                  {t('landing.cta')}
                  <ArrowRight className="ms-2 h-4 w-4" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full text-base px-8 h-12 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  {t('landing.cta2')}
                </Button>
              </motion.div>
            </motion.div>

            {/* Hero Image */}
            <motion.div
              className="mt-16 relative"
              initial={{ opacity: 0, y: 50, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Glow under image */}
              <div className="absolute -inset-4 gradient-primary opacity-20 blur-3xl rounded-3xl" />
              <div className="relative glass rounded-3xl p-2 glow-md border border-primary/15">
                {/* Top bar decoration */}
                <div className="flex items-center gap-1.5 px-3 py-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
                  <div className="flex-1 h-5 glass rounded-full mx-4 border border-border/30" />
                </div>
                <div className="scan-overlay rounded-2xl overflow-hidden">
                  <img
                    src={heroImage}
                    alt="MediFlow AI Dashboard"
                    className="rounded-2xl w-full"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────── */}
      <section className="py-20 border-y border-border/40 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="text-center p-6 glass-card rounded-2xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -4 }}
              >
                <div className="inline-flex p-2 rounded-xl gradient-primary-soft mb-3">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="font-display text-3xl md:text-4xl font-bold gradient-text mb-1">{s.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden">
        <div className="orb orb-cyan absolute top-0 right-0 w-[400px] h-[400px] animate-float opacity-60" />
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 text-primary text-sm font-semibold mb-4 glass px-4 py-1.5 rounded-full border border-primary/20">
              <Zap className="h-3.5 w-3.5" />
              <span>Core Features</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              A comprehensive suite of tools designed for modern healthcare delivery.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <GlassCard
                key={f.titleKey}
                className="group cursor-default"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <motion.div
                  className={`inline-flex p-3 rounded-2xl ${f.bg} mb-4`}
                  whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                  transition={{ duration: 0.4 }}
                >
                  <f.icon className={`h-6 w-6 ${f.color}`} />
                </motion.div>
                <h3 className="font-display font-bold text-lg mb-2 group-hover:gradient-text transition-all">{t(f.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(f.descKey)}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust ─────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="orb orb-violet absolute bottom-0 left-1/4 w-[500px] h-[500px] animate-float-delay opacity-50" />

        <div className="relative container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 mb-6 text-primary glass px-4 py-1.5 rounded-full border border-primary/20 text-sm font-semibold">
              <Shield className="h-3.5 w-3.5" />
              <span>HIPAA Compliant & Secure</span>
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-6 leading-tight">
              Trusted by Healthcare
              <br />
              <span className="gradient-text">Professionals Worldwide</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
              Built with security and compliance at its core. Your patient data is protected with enterprise-grade encryption.
            </p>
            <motion.div
              className="glass-card rounded-2xl p-6 border-neon inline-flex flex-col sm:flex-row items-center gap-4"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex -space-x-2">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full gradient-primary border-2 border-background flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                ))}
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Join 200+ clinics already using MediFlow AI</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1,2,3,4,5].map(i => (
                    <span key={i} className="text-warning text-xs">★</span>
                  ))}
                  <span className="text-muted-foreground text-xs ms-1">4.9/5 rating</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="py-10 border-t border-border/40">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="gradient-primary rounded-lg p-1">
              <Activity className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-display font-bold text-sm">
              <span className="gradient-text">Medi</span>Flow AI
            </span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 MediFlow AI. All rights reserved.</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>HIPAA Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
