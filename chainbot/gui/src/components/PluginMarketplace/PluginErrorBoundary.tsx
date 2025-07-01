import React from 'react';

interface PluginErrorBoundaryProps {
  children: React.ReactNode;
  pluginName: string;
}

interface PluginErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class PluginErrorBoundary extends React.Component<PluginErrorBoundaryProps, PluginErrorBoundaryState> {
  constructor(props: PluginErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ hasError: true, error, errorInfo });
    // Optionally log error to analytics or server here
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-900/90 text-white p-6 rounded shadow-lg border border-red-700">
          <h3 className="text-lg font-bold mb-2">Plugin Error: {this.props.pluginName}</h3>
          <p className="mb-2">This plugin has crashed. See details below:</p>
          <pre className="bg-red-950/80 p-3 rounded text-xs overflow-x-auto mb-2">
            {this.state.error?.toString()}
            {this.state.errorInfo?.componentStack}
          </pre>
          <p className="text-sm text-red-200">Disable or update the plugin to resolve persistent issues.</p>
        </div>
      );
    }
    return this.props.children;
  }
} 