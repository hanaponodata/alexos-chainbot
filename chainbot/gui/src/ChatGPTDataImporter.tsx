import React, { useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import './ChatGPTDataImporter.css';

interface ImportedContext {
  context_id: string;
  source_type: string;
  source_name: string;
  conversations_count: number;
  summary: {
    total_conversations: number;
    total_messages: number;
    date_range: {
      earliest: string;
      latest: string;
    };
    topics: Array<{
      topic: string;
      frequency: number;
      percentage: number;
    }>;
  };
  created_at: string;
}

interface SearchResult {
  conversation_id: string;
  title: string;
  relevance_score: number;
  message_count: number;
  created_at: string;
  updated_at: string;
  matched_messages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
}

const ChatGPTDataImporter: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState({
    max_messages: 1000,
    include_metadata: true,
    filter_by_date: false,
    date_from: '',
    date_to: ''
  });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importedContexts, setImportedContexts] = useState<ImportedContext[]>([]);
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.json')) {
        setUploadedFile(file);
        setError('');
      } else {
        setError('Please select a JSON file');
        setUploadedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      setError('Please select a file to upload');
      return;
    }

    setImporting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('import_options', JSON.stringify(importOptions));

      const response = await fetch(`${API_BASE}/api/chatgpt-import/upload-dump`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setImportResult(result);
        setSelectedContext(result.context_id);
        await loadImportedContexts();
        setActiveTab('contexts');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Upload failed');
      }
    } catch (error) {
      setError('Upload failed: ' + (error as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const loadImportedContexts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/chatgpt-import/list-contexts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setImportedContexts(data.contexts);
      }
    } catch (error) {
      console.error('Failed to load contexts:', error);
    }
  };

  const handleSearch = async () => {
    if (!selectedContext || !searchQuery.trim()) {
      setError('Please select a context and enter a search query');
      return;
    }

    setSearching(true);
    setError('');

    try {
      const params = new URLSearchParams({
        context_id: selectedContext,
        query: searchQuery,
        limit: '50'
      });

      const response = await fetch(`${API_BASE}/api/chatgpt-import/search-conversations?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Search failed');
      }
    } catch (error) {
      setError('Search failed: ' + (error as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const deleteContext = async (contextId: string) => {
    if (!confirm('Are you sure you want to delete this context?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/chatgpt-import/context/${contextId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await loadImportedContexts();
        if (selectedContext === contextId) {
          setSelectedContext('');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Delete failed');
      }
    } catch (error) {
      setError('Delete failed: ' + (error as Error).message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="chatgpt-importer">
      <div className="importer-header">
        <h2>ChatGPT Data Importer</h2>
        <p>Import ChatGPT conversation dumps and use them as context for chained agents</p>
      </div>

      <div className="importer-tabs">
        <button 
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Dump
        </button>
        <button 
          className={`tab-btn ${activeTab === 'contexts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contexts')}
        >
          Imported Contexts
        </button>
        <button 
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Search Conversations
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="importer-content">
        {activeTab === 'upload' && (
          <div className="upload-tab">
            <div className="upload-section">
              <h3>Upload ChatGPT Data Dump</h3>
              
              <div className="file-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button 
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose JSON File
                </button>
                {uploadedFile && (
                  <div className="file-info">
                    <span>📄 {uploadedFile.name}</span>
                    <span>📏 {formatFileSize(uploadedFile.size)}</span>
                  </div>
                )}
              </div>

              <div className="import-options">
                <h4>Import Options</h4>
                
                <div className="option-group">
                  <label>
                    <input
                      type="number"
                      value={importOptions.max_messages}
                      onChange={(e) => setImportOptions(prev => ({
                        ...prev,
                        max_messages: parseInt(e.target.value) || 1000
                      }))}
                    />
                    Max Messages per Conversation
                  </label>
                </div>

                <div className="option-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={importOptions.include_metadata}
                      onChange={(e) => setImportOptions(prev => ({
                        ...prev,
                        include_metadata: e.target.checked
                      }))}
                    />
                    Include Metadata
                  </label>
                </div>

                <div className="option-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={importOptions.filter_by_date}
                      onChange={(e) => setImportOptions(prev => ({
                        ...prev,
                        filter_by_date: e.target.checked
                      }))}
                    />
                    Filter by Date Range
                  </label>
                </div>

                {importOptions.filter_by_date && (
                  <div className="date-filters">
                    <input
                      type="date"
                      value={importOptions.date_from}
                      onChange={(e) => setImportOptions(prev => ({
                        ...prev,
                        date_from: e.target.value
                      }))}
                      placeholder="From Date"
                    />
                    <input
                      type="date"
                      value={importOptions.date_to}
                      onChange={(e) => setImportOptions(prev => ({
                        ...prev,
                        date_to: e.target.value
                      }))}
                      placeholder="To Date"
                    />
                  </div>
                )}
              </div>

              <button
                className="import-btn"
                onClick={handleUpload}
                disabled={!uploadedFile || importing}
              >
                {importing ? 'Importing...' : 'Import Data Dump'}
              </button>
            </div>

            {importResult && (
              <div className="import-result">
                <h4>Import Result</h4>
                <div className="result-summary">
                  <div className="result-item">
                    <span className="label">Context ID:</span>
                    <span className="value">{importResult.context_id}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Conversations:</span>
                    <span className="value">{importResult.conversations_count}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Total Messages:</span>
                    <span className="value">{importResult.summary.total_messages}</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Date Range:</span>
                    <span className="value">
                      {formatDate(importResult.summary.date_range.earliest)} - {formatDate(importResult.summary.date_range.latest)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'contexts' && (
          <div className="contexts-tab">
            <div className="contexts-header">
              <h3>Imported Contexts</h3>
              <button 
                className="refresh-btn"
                onClick={loadImportedContexts}
              >
                Refresh
              </button>
            </div>

            <div className="contexts-list">
              {importedContexts.length === 0 ? (
                <div className="empty-state">
                  <p>No imported contexts found. Upload a ChatGPT data dump to get started.</p>
                </div>
              ) : (
                importedContexts.map((context) => (
                  <div key={context.context_id} className="context-item">
                    <div className="context-header">
                      <h4>{context.source_name}</h4>
                      <div className="context-actions">
                        <button
                          className="delete-btn"
                          onClick={() => deleteContext(context.context_id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <div className="context-details">
                      <div className="detail-item">
                        <span className="label">ID:</span>
                        <span className="value">{context.context_id}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Conversations:</span>
                        <span className="value">{context.conversations_count}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Total Messages:</span>
                        <span className="value">{context.summary.total_messages}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Created:</span>
                        <span className="value">{formatDate(context.created_at)}</span>
                      </div>
                    </div>

                    {context.summary.topics && context.summary.topics.length > 0 && (
                      <div className="context-topics">
                        <h5>Key Topics:</h5>
                        <div className="topics-list">
                          {context.summary.topics.slice(0, 5).map((topic, index) => (
                            <span key={index} className="topic-tag">
                              {topic.topic} ({topic.frequency})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="search-tab">
            <div className="search-section">
              <h3>Search Conversations</h3>
              
              <div className="search-controls">
                <div className="context-selector">
                  <label>Select Context:</label>
                  <select
                    value={selectedContext}
                    onChange={(e) => setSelectedContext(e.target.value)}
                  >
                    <option value="">Choose a context...</option>
                    {importedContexts.map((context) => (
                      <option key={context.context_id} value={context.context_id}>
                        {context.source_name} ({context.conversations_count} conversations)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="search-input">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter search query..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    className="search-btn"
                    onClick={handleSearch}
                    disabled={!selectedContext || !searchQuery.trim() || searching}
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h4>Search Results ({searchResults.length})</h4>
                
                <div className="results-list">
                  {searchResults.map((result, index) => (
                    <div key={index} className="search-result-item">
                      <div className="result-header">
                        <h5>{result.title}</h5>
                        <span className="relevance-score">
                          {(result.relevance_score * 100).toFixed(1)}% relevant
                        </span>
                      </div>
                      
                      <div className="result-meta">
                        <span>Messages: {result.message_count}</span>
                        <span>Created: {formatDate(result.created_at)}</span>
                        <span>Updated: {formatDate(result.updated_at)}</span>
                      </div>

                      {result.matched_messages.length > 0 && (
                        <div className="matched-messages">
                          <h6>Matched Messages:</h6>
                          {result.matched_messages.slice(0, 3).map((msg, msgIndex) => (
                            <div key={msgIndex} className="matched-message">
                              <span className="message-role">{msg.role}:</span>
                              <span className="message-content">
                                {msg.content.length > 200 
                                  ? msg.content.substring(0, 200) + '...' 
                                  : msg.content
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatGPTDataImporter; 