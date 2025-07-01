import React from 'react';
import { useSuggestions } from '../contexts/SuggestionsContext';

const SuggestionsPanel: React.FC = () => {
  const { suggestions, dismissSuggestion } = useSuggestions();
  const active = suggestions.filter(s => !s.dismissed);
  if (active.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#23232a] border border-blue-700 rounded-lg shadow-xl p-4 w-80">
      <h2 className="text-lg font-semibold text-blue-400 mb-2">Suggestions</h2>
      <ul className="space-y-3">
        {active.map(s => (
          <li key={s.id} className="bg-[#18181b] rounded p-3 border border-gray-800 flex flex-col gap-2">
            <span>{s.message}</span>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => dismissSuggestion(s.id, 'accepted')}
                className="px-3 py-1 bg-green-700 hover:bg-green-800 text-white rounded text-xs"
                aria-label="Accept suggestion"
              >
                Accept
              </button>
              <button
                onClick={() => dismissSuggestion(s.id, 'dismissed')}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                aria-label="Dismiss suggestion"
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SuggestionsPanel; 