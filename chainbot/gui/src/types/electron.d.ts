declare global {
  interface Window {
    electronAPI?: {
      checkForUpdates: (channel: string) => Promise<any>;
      downloadUpdate: (url: string) => Promise<any>;
      installUpdate: () => Promise<any>;
      restartApp: () => void;
      watchtowerStatus: () => Promise<any>;
      watchtowerTargets: () => Promise<any>;
      watchtowerAlerts: () => Promise<any>;
      watchtowerLogs: (limit: number) => Promise<any>;
      watchtowerConfig: () => Promise<any>;
      watchtowerMetrics: () => Promise<any>;
      watchtowerDashboardUrl: () => Promise<any>;
      watchtowerStart: () => Promise<any>;
      watchtowerStop: () => Promise<any>;
      watchtowerRestart: () => Promise<any>;
      watchtowerUpdateConfig: (config: any) => Promise<any>;
      watchtowerTestConnection: () => Promise<any>;
    };
  }
}

export {}; 