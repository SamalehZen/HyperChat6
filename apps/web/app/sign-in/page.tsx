'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Input } from '@repo/ui';
import { motion } from 'framer-motion';
import { IconBolt } from '@repo/common/components';
import { AnimatedForm } from '@/sandbox/modern-animated-sign-in';

export default function LocalSignIn() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Échec de connexion');
        setLoading(false);
        return;
      }
      window.location.href = '/chat';
    } catch (e) {
      setError('Erreur réseau');
      setLoading(false);
    }
  };

  const features = [
    {
      icon: IconBolt,
      title: 'Intelligence Artificielle Avancée',
      description: 'Accédez à des modèles de langage de dernière génération pour tous vos besoins professionnels.'
    },
    {
      icon: IconShieldCheck,
      title: 'Sécurité Entreprise',
      description: 'Vos données sont protégées par les plus hauts standards de sécurité et de confidentialité.'
    },
    {
      icon: IconUsers,
      title: 'Collaboration Équipe',
      description: 'Travaillez ensemble efficacement avec des outils collaboratifs intégrés.'
    },
    {
      icon: IconChartBar,
      title: 'Analytiques Détaillées',
      description: 'Suivez vos performances et optimisez votre productivité avec des insights précis.'
    },
  ]; // ✅ point-virgule ajouté ici

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950">
      {/* Background Grid (simplified to avoid parser issues) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden />
      
      <div className="flex min-h-screen">
        {/* Left Panel - Features & Branding */}
        <div className="hidden md:flex md:flex-1 md:flex-col md:justify-center md:px-10 lg:px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-md"
          >
            <div className="mb-8">
              <motion.div 
                className="inline-flex items-center gap-3 mb-4"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <IconBolt size={24} strokeWidth={2} className="text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  HyperFix
                </h1>
              </motion.div>
              <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
                L'intelligence artificielle polyvalente développée pour maximiser votre productivité professionnelle.
              </p>
            </div>
            
            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:-translate-y-0.5 hover:shadow-md will-change-transform transition-all duration-300"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon size={18} strokeWidth={2} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
        
        {/* Right Panel - Login Form */}
        <div className="flex flex-1 flex-col justify-center px-6 py-10 md:px-8 lg:px-10 md:flex-none md:w-[26rem] lg:w-[28rem] xl:w-[30rem]">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="mx-auto w-full max-w-sm lg:max-w-md"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden mb-8 text-center">
              <motion.div 
                className="inline-flex items-center gap-3 mb-4"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <IconBolt size={20} strokeWidth={2} className="text-white" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  HyperFix
                </h1>
              </motion.div>
            </div>

            <div className="glass-card bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl p-8 md:p-9 lg:p-10 shadow-2xl">
              <AnimatedForm
                header="Bon retour !"
                subHeader="Connectez-vous à votre compte pour accéder à vos outils IA."
                fields={[
                  { label: "Identifiant ou email", type: "text", required: true, placeholder: "votre@email.com", onChange: (e) => setIdentifier(e.target.value) },
                  { label: "Mot de passe", type: "password", required: true, placeholder: "••••••••", onChange: (e) => setPassword(e.target.value) },
                ]}
                submitButton={loading ? "Connexion en cours…" : "Se connecter"}
                errorField={error ?? undefined}
                onSubmit={onSubmit}
              />

              <div className="mt-6 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
