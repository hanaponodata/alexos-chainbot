import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  MessageSquare, 
  Workflow, 
  Monitor, 
  Code, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Zap,
  Shield,
  Globe
} from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface OnboardingProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  color: string;
}

const Onboarding: React.FC<OnboardingProps> = ({ isOpen, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to ChainBot',
      description: 'Your AI-powered development companion',
      icon: <Bot className="w-12 h-12" />,
      features: [
        'Intelligent code assistance',
        'Multi-agent collaboration',
        'Workflow automation',
        'Real-time monitoring'
      ],
      color: 'from-blue-500 to-purple-600'
    },
    {
      id: 'chat',
      title: 'Smart Conversations',
      description: 'Chat with AI agents that understand your context',
      icon: <MessageSquare className="w-12 h-12" />,
      features: [
        'Context-aware responses',
        'Code generation & review',
        'Markdown & syntax highlighting',
        'File attachments support'
      ],
      color: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'workflows',
      title: 'Automated Workflows',
      description: 'Build and orchestrate complex automation pipelines',
      icon: <Workflow className="w-12 h-12" />,
      features: [
        'Visual workflow builder',
        'Drag & drop interface',
        'Conditional logic',
        'Integration capabilities'
      ],
      color: 'from-orange-500 to-red-600'
    },
    {
      id: 'monitoring',
      title: 'System Monitoring',
      description: 'Keep track of your infrastructure and applications',
      icon: <Monitor className="w-12 h-12" />,
      features: [
        'Real-time metrics',
        'Alert management',
        'Performance insights',
        'Health monitoring'
      ],
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'development',
      title: 'Code Development',
      description: 'Enhanced coding experience with AI assistance',
      icon: <Code className="w-12 h-12" />,
      features: [
        'Intelligent code completion',
        'Error detection & fixes',
        'Refactoring suggestions',
        'Best practices guidance'
      ],
      color: 'from-indigo-500 to-blue-600'
    }
  ];

  const currentStepData = steps[currentStep];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    onSkip();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={skipOnboarding}
          />

          {/* Onboarding Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-4 z-50 flex items-center justify-center"
          >
            <div className="w-full max-w-4xl h-full max-h-[600px] bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-white">Welcome to ChainBot</h1>
                </div>
                <button
                  onClick={skipOnboarding}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Skip
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-8">
                <div className="flex items-center justify-center mb-8">
                  {/* Step Icon */}
                  <motion.div
                    key={currentStep}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${currentStepData.color} flex items-center justify-center shadow-lg`}
                  >
                    <div className="text-white">
                      {currentStepData.icon}
                    </div>
                  </motion.div>
                </div>

                {/* Step Content */}
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="text-center mb-8"
                >
                  <h2 className="text-3xl font-bold text-white mb-4">
                    {currentStepData.title}
                  </h2>
                  <p className="text-xl text-gray-300 mb-8">
                    {currentStepData.description}
                  </p>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {currentStepData.features.map((feature, index) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                      >
                        <Card variant="glass" className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm text-gray-200">{feature}</span>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-center gap-2">
                    {steps.map((_, index) => (
                      <motion.div
                        key={index}
                        className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                          index <= currentStep ? 'bg-blue-500' : 'bg-gray-600'
                        }`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      />
                    ))}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    icon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">
                      {currentStep + 1} of {steps.length}
                    </span>
                    <Button
                      onClick={nextStep}
                      icon={currentStep === steps.length - 1 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    >
                      {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 bg-white/5">
                <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>Lightning Fast</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Secure & Private</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>Open Source</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Onboarding; 