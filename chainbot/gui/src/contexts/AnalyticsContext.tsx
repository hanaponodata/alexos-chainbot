import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface AnalyticsEvent {
  type: string;
  payload?: Record<string, any>;
  timestamp: number;
}

interface AnalyticsContextType {
  events: AnalyticsEvent[];
  trackEvent: (type: string, payload?: Record<string, any>) => void;
  trackAudit: (action: string, details?: Record<string, any>) => void;
  clearEvents: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

const ANALYTICS_STORAGE_KEY = 'chainbot-analytics-events';

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<AnalyticsEvent[]>(() => {
    try {
      const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const trackEvent = useCallback((type: string, payload?: Record<string, any>) => {
    setEvents(prev => [...prev, { type, payload, timestamp: Date.now() }]);
  }, []);

  // Track audit events
  const trackAudit = useCallback((action: string, details?: Record<string, any>) => {
    setEvents(prev => [...prev, { type: 'audit', payload: { action, ...details }, timestamp: Date.now() }]);
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);

  return (
    <AnalyticsContext.Provider value={{ events, trackEvent, trackAudit, clearEvents }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalytics must be used within an AnalyticsProvider');
  return ctx;
}; 