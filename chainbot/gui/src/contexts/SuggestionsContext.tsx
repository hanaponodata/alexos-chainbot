import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAnalytics } from './AnalyticsContext';
import { useWorkflows } from './WorkflowContext';

export interface Suggestion {
  id: string;
  message: string;
  type: 'feature' | 'workflow' | 'plugin';
  data?: any;
  dismissed?: boolean;
  feedback?: 'accepted' | 'dismissed';
}

interface SuggestionsContextType {
  suggestions: Suggestion[];
  dismissSuggestion: (id: string, feedback?: 'accepted' | 'dismissed') => void;
}

const SuggestionsContext = createContext<SuggestionsContextType | undefined>(undefined);

export const SuggestionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { events } = useAnalytics();
  const { workflows } = useWorkflows();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Helper: count frequency and recency
  function getEventStats(type: string) {
    const filtered = events.filter(e => e.type === type);
    return {
      count: filtered.length,
      last: filtered.length > 0 ? filtered[filtered.length - 1].timestamp : null,
    };
  }

  // Helper: get most/least used features
  function getFeatureUsage() {
    const counts: Record<string, number> = {};
    events.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
    return counts;
  }

  // Generate advanced suggestions
  useEffect(() => {
    const usedFeatures = new Set(events.map(e => e.type));
    const workflowCount = workflows.length;
    const featureUsage = getFeatureUsage();
    const newSuggestions: Suggestion[] = [];

    // Suggest chat if rarely used
    if ((featureUsage['chat_opened'] || 0) < 2) {
      newSuggestions.push({
        id: 'try-chat',
        message: 'Try using the AI Chat feature for coding help or brainstorming.',
        type: 'feature',
      });
    }
    // Suggest split if never used
    if (!usedFeatures.has('editor_split')) {
      newSuggestions.push({
        id: 'try-split',
        message: 'Try splitting the code editor for side-by-side editing.',
        type: 'feature',
      });
    }
    // Suggest creating a workflow if none exist
    if (workflowCount === 0) {
      newSuggestions.push({
        id: 'try-workflows',
        message: 'Create your first workflow to automate repetitive tasks.',
        type: 'workflow',
      });
    }
    // Suggest running a workflow if created but never run
    if (workflowCount > 0 && !usedFeatures.has('workflow_run')) {
      newSuggestions.push({
        id: 'run-workflow',
        message: 'Run a saved workflow to boost your productivity.',
        type: 'workflow',
      });
    }
    // Suggest commit after running tests
    const lastTest = getEventStats('test_run').last;
    const lastCommit = getEventStats('commit').last;
    if (lastTest && (!lastCommit || lastCommit < lastTest)) {
      newSuggestions.push({
        id: 'commit-after-test',
        message: 'You recently ran tests. Consider committing your code if all tests passed.',
        type: 'feature',
      });
    }
    // Suggest creating a new workflow after running one
    const lastWorkflowRun = getEventStats('workflow_run').last;
    if (lastWorkflowRun && Date.now() - lastWorkflowRun < 1000 * 60 * 10) {
      newSuggestions.push({
        id: 'new-workflow-after-run',
        message: 'You just ran a workflow. Would you like to create or refine another workflow?',
        type: 'workflow',
      });
    }
    // Suggest trying least used feature
    const allFeatures = ['chat_opened', 'editor_split', 'test_run', 'commit', 'workflow_run'];
    const leastUsed = allFeatures
      .map(f => ({ f, count: featureUsage[f] || 0 }))
      .sort((a, b) => a.count - b.count)[0];
    if (leastUsed && leastUsed.count === 0) {
      newSuggestions.push({
        id: `try-${leastUsed.f}`,
        message: `You haven't tried the '${leastUsed.f.replace('_', ' ')}' feature yet. Give it a go!`,
        type: 'feature',
      });
    }
    // Score/rank suggestions (simple: most relevant first)
    const ranked = newSuggestions.sort((a, b) => {
      // Prioritize workflow suggestions if user has never used workflows
      if (a.type === 'workflow' && b.type !== 'workflow') return -1;
      if (b.type === 'workflow' && a.type !== 'workflow') return 1;
      return 0;
    });
    setSuggestions(ranked);
  }, [events, workflows]);

  const dismissSuggestion = useCallback((id: string, feedback?: 'accepted' | 'dismissed') => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, dismissed: true, feedback } : s));
  }, []);

  return (
    <SuggestionsContext.Provider value={{ suggestions, dismissSuggestion }}>
      {children}
    </SuggestionsContext.Provider>
  );
};

export const useSuggestions = () => {
  const ctx = useContext(SuggestionsContext);
  if (!ctx) throw new Error('useSuggestions must be used within a SuggestionsProvider');
  return ctx;
}; 