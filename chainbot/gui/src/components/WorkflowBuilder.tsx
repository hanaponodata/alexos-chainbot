import React, { useState } from 'react';
import { useWorkflows } from '../contexts/WorkflowContext';
import type { Workflow, WorkflowStep } from '../contexts/WorkflowContext';
import { v4 as uuidv4 } from 'uuid';

const STEP_TYPES = [
  { value: 'codegen', label: 'AI Code Generation' },
  { value: 'test', label: 'Run Tests' },
  { value: 'commit', label: 'Git Commit' },
  { value: 'chat', label: 'AI Chat' },
];

const WorkflowBuilder: React.FC = () => {
  const { workflows, addWorkflow, updateWorkflow, deleteWorkflow, runWorkflow } = useWorkflows();
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string>('');

  // Start editing a workflow
  const handleEdit = (wf: Workflow) => {
    setEditing(wf);
    setName(wf.name);
    setSteps(wf.steps);
  };

  // Save workflow
  const handleSave = () => {
    const wf: Workflow = {
      id: editing ? editing.id : uuidv4(),
      name,
      steps,
    };
    if (editing) {
      updateWorkflow(wf);
    } else {
      addWorkflow(wf);
    }
    setEditing(null);
    setName('');
    setSteps([]);
  };

  // Add a new step
  const handleAddStep = () => {
    setSteps(prev => [
      ...prev,
      { id: uuidv4(), type: STEP_TYPES[0].value, config: {} },
    ]);
  };

  // Remove a step
  const handleRemoveStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  // Change step type
  const handleStepType = (id: string, type: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, type } : s));
  };

  // Move step up/down
  const moveStep = (idx: number, dir: -1 | 1) => {
    setSteps(prev => {
      const arr = [...prev];
      const [removed] = arr.splice(idx, 1);
      arr.splice(idx + dir, 0, removed);
      return arr;
    });
  };

  // Run workflow
  const handleRun = async (id: string) => {
    setRunningId(id);
    setRunStatus('Running...');
    await runWorkflow(id);
    setRunStatus('Completed!');
    setTimeout(() => setRunStatus(''), 2000);
    setRunningId(null);
  };

  return (
    <div className="p-8 text-white max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Workflow Builder</h1>
      {/* List Workflows */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Saved Workflows</h2>
        <ul className="space-y-2">
          {workflows.map(wf => (
            <li key={wf.id} className="flex items-center gap-3 bg-[#18181b] rounded p-3 border border-gray-800">
              <span className="font-semibold flex-1">{wf.name}</span>
              <button onClick={() => handleRun(wf.id)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs" disabled={runningId === wf.id}>
                {runningId === wf.id ? runStatus || 'Running...' : 'Run'}
              </button>
              <button onClick={() => handleEdit(wf)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Edit</button>
              <button onClick={() => deleteWorkflow(wf.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">Delete</button>
            </li>
          ))}
        </ul>
      </div>
      {/* Create/Edit Workflow */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">{editing ? 'Edit Workflow' : 'New Workflow'}</h2>
        <div className="flex flex-col gap-3 mb-3">
          <input
            className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
            placeholder="Workflow Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <div>
            <h3 className="font-semibold mb-1">Steps</h3>
            <ul className="space-y-2">
              {steps.map((step, idx) => (
                <li key={step.id} className="flex items-center gap-2">
                  <select
                    className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-white"
                    value={step.type}
                    onChange={e => handleStepType(step.id, e.target.value)}
                  >
                    {STEP_TYPES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="px-2 py-1 text-xs bg-gray-700 rounded disabled:opacity-50">↑</button>
                  <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} className="px-2 py-1 text-xs bg-gray-700 rounded disabled:opacity-50">↓</button>
                  <button onClick={() => handleRemoveStep(step.id)} className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded">Remove</button>
                </li>
              ))}
            </ul>
            <button onClick={handleAddStep} className="mt-2 px-3 py-1 bg-green-700 hover:bg-green-800 rounded text-xs">Add Step</button>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
          disabled={!name || steps.length === 0}
        >
          {editing ? 'Save Changes' : 'Create Workflow'}
        </button>
        {editing && (
          <button
            onClick={() => { setEditing(null); setName(''); setSteps([]); }}
            className="ml-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-semibold"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkflowBuilder; 