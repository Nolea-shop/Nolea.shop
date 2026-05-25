import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, X, Shield, ChevronDown } from 'lucide-react';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = 'nolea-cookie-consent';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setIsVisible(true);
    } else {
      try {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
      } catch {
        setIsVisible(true);
      }
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setIsVisible(false);
  };

  const acceptAll = () => {
    saveConsent({ essential: true, analytics: true, marketing: true });
  };

  const acceptEssential = () => {
    saveConsent({ essential: true, analytics: false, marketing: false });
  };

  const saveCustom = () => {
    saveConsent(preferences);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
      >
        <div className="max-w-4xl mx-auto">
          <div className="liquid-glass-strong rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-2xl">
            {/* Main Content */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center">
              <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-[#7A8F4E]/10 rounded-xl flex items-center justify-center">
                <Cookie size={20} className="text-[#7A8F4E]" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm md:text-base font-semibold text-[#1F1D1A] mb-1">
                  Your Privacy Matters
                </h3>
                <p className="text-xs md:text-sm text-[#5C5748] leading-relaxed">
                  We use cookies to enhance your experience, analyze site traffic, and personalize content.
                  You can customize your preferences or accept all cookies.{' '}
                  <a href="/privacy" className="text-[#7A8F4E] hover:underline font-medium">
                    Privacy Policy
                  </a>
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-[#5C5748] hover:text-[#1F1D1A] bg-white/60 hover:bg-white rounded-xl transition-colors border border-[#E5E2D9]"
                >
                  <Shield size={14} />
                  Customize
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}
                  />
                </button>
                <button
                  onClick={acceptEssential}
                  className="px-4 py-2.5 text-xs font-medium text-[#5C5748] hover:text-[#1F1D1A] bg-white/60 hover:bg-white rounded-xl transition-colors border border-[#E5E2D9]"
                >
                  Essential Only
                </button>
                <button
                  onClick={acceptAll}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#7A8F4E] hover:bg-[#5C6F3A] rounded-xl transition-colors shadow-sm"
                >
                  Accept All
                </button>
              </div>
            </div>

            {/* Detailed Preferences */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 pt-5 border-t border-[#E5E2D9] space-y-3">
                    {[
                      {
                        key: 'essential' as const,
                        title: 'Essential Cookies',
                        desc: 'Required for the website to function properly. Cannot be disabled.',
                        required: true,
                      },
                      {
                        key: 'analytics' as const,
                        title: 'Analytics Cookies',
                        desc: 'Help us understand how visitors interact with our website.',
                        required: false,
                      },
                      {
                        key: 'marketing' as const,
                        title: 'Marketing Cookies',
                        desc: 'Used to deliver personalized advertisements and measure their effectiveness.',
                        required: false,
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-3 bg-white/50 rounded-xl"
                      >
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#1F1D1A]">
                              {item.title}
                            </span>
                            {item.required && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A8F4E] bg-[#7A8F4E]/10 px-2 py-0.5 rounded-full">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#5C5748] mt-0.5">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences[item.key]}
                            disabled={item.required}
                            onChange={(e) =>
                              setPreferences((prev) => ({
                                ...prev,
                                [item.key]: e.target.checked,
                              }))
                            }
                            className="sr-only peer"
                          />
                          <div
                            className={`w-11 h-6 rounded-full transition-colors ${
                              item.required
                                ? 'bg-[#7A8F4E] cursor-not-allowed opacity-60'
                                : preferences[item.key]
                                ? 'bg-[#7A8F4E]'
                                : 'bg-[#E5E2D9]'
                            }`}
                          >
                            <div
                              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                                preferences[item.key] ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </div>
                        </label>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={saveCustom}
                        className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#1F1D1A] hover:bg-black rounded-xl transition-colors"
                      >
                        Save Preferences
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
