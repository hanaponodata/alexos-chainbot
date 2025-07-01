# Backend API/Data Contract (Unified)

This document defines the unified API/data contract for the ChainBot GUI backend, covering workflows, plugins, analytics, and persistent memory. Use these interfaces and conventions for backend/frontend integration and future OpenAPI specs.

---

## Version
- **API Version:** v1
- **Format:** REST/JSON (OpenAPI compatible)

---

## Core Data Models (TypeScript)

### User
```ts
interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}
```

### Plugin
```ts
interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  type: 'panel' | 'tool' | 'workflow' | 'theme' | 'integration';
  entryPoint: string;
  config: Record<string, any>;
  dependencies: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Workflow
```ts
interface WorkflowStep {
  id: string;
  type: string;
  config: Record<string, any>;
}

interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}
```

### Persistent Memory
```ts
interface MemoryContext {
  id: string;
  type: 'conversation' | 'code' | 'workflow' | 'system' | 'user_preference';
  title: string;
  content: any;
  metadata: Record<string, any>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  priority: number;
  accessCount: number;
  lastAccessed: string;
}
```

### Analytics Event
```ts
interface AnalyticsEvent {
  id: string;
  type: string;
  userId: string;
  timestamp: string;
  data: Record<string, any>;
}
```

---

## REST API Endpoints (Sample)

### Plugins
- `GET /api/plugins` — List all plugins
- `POST /api/plugins` — Register a new plugin
- `PUT /api/plugins/{id}` — Update plugin config
- `DELETE /api/plugins/{id}` — Uninstall plugin

### Workflows
- `GET /api/workflows` — List workflows
- `POST /api/workflows` — Create workflow
- `PUT /api/workflows/{id}` — Update workflow
- `DELETE /api/workflows/{id}` — Delete workflow

### Memory
- `GET /api/memory/contexts` — List memory contexts
- `POST /api/memory/contexts` — Add context
- `PUT /api/memory/contexts/{id}` — Update context
- `DELETE /api/memory/contexts/{id}` — Delete context

### Analytics
- `GET /api/analytics/events` — List analytics events
- `POST /api/analytics/events` — Log new event

---

## Conventions
- All dates/times are ISO 8601 strings (UTC)
- All endpoints return JSON
- Use standard HTTP status codes
- Use pagination for list endpoints (e.g., `?limit=50&offset=0`)
- All POST/PUT endpoints accept and return the full resource object

---

## Example: Plugin API

### Request: Register Plugin
```http
POST /api/plugins
Content-Type: application/json

{
  "name": "MyPlugin",
  "version": "1.0.0",
  "description": "A sample plugin.",
  "author": "Alice",
  "type": "tool",
  "entryPoint": "./index.tsx",
  "config": {},
  "dependencies": [],
  "permissions": []
}
```

### Response
```json
{
  "id": "plugin_123",
  "name": "MyPlugin",
  "version": "1.0.0",
  "description": "A sample plugin.",
  "author": "Alice",
  "enabled": true,
  "type": "tool",
  "entryPoint": "./index.tsx",
  "config": {},
  "dependencies": [],
  "permissions": [],
  "createdAt": "2024-06-01T12:00:00Z",
  "updatedAt": "2024-06-01T12:00:00Z"
}
```

---

## See Also
- `openapi.yaml` for full OpenAPI/Swagger spec
- `BACKEND_API_CONTRACT.md` for data model reference 