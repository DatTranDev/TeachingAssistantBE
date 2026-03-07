# WEB-004 — API Service Layer & HTTP Client

## Objective
Build the typed API service layer: an Axios instance with request/response interceptors, automatic token injection, automatic token refresh on 401, error normalization, and typed service modules for every backend domain. This is the single interface through which all frontend code communicates with the Express.js backend.

## Background
Without a centralized API layer, every feature ticket would implement its own fetch logic, leading to duplicated error handling, inconsistent auth header injection, and impossible-to-maintain token refresh logic. This ticket makes backend communication a one-line call in any component or hook.

## Scope
- Install and configure Axios
- Create typed Axios instance with base URL from env
- Request interceptor: inject `Authorization: Bearer <token>` from Zustand auth store
- Response interceptor: catch 401 → attempt token refresh → retry original request once → if still 401, sign out
- Error normalization: `ApiError` class with `status`, `message`, `code`
- Type-safe service modules for all backend domains:
  - `auth.ts` — login, register, changePassword
  - `subjects.ts` — all subject endpoints
  - `classSessions.ts`
  - `cAttend.ts` — attendance sessions
  - `attendRecords.ts`
  - `absenceRequests.ts`
  - `discussions.ts`
  - `reactions.ts`
  - `questions.ts`
  - `channels.ts`
  - `posts.ts`
  - `reviews.ts`
  - `groups.ts`
  - `groupMessages.ts`
  - `documents.ts`
  - `notifications.ts`
  - `upload.ts`
  - `firebase.ts` — FCM topic subscriptions
  - `service.ts` — email/OTP
  - `tokens.ts` — refresh token
- TanStack Query (React Query) setup: `QueryClient` configuration, `QueryProvider`
- Typed query key factory: `queryKeys` object

## Out of Scope
- Auth state management (Zustand store — WEB-008)
- Socket.IO client (WEB-005)
- Any UI components

## Dependencies
- WEB-001 (for TypeScript types, env, folder structure)

## User Flow Context
Transparent to users — powers every API interaction in every feature flow.

## Functional Requirements
1. Axios instance reads base URL from `env.NEXT_PUBLIC_API_URL`
2. All requests automatically include `Authorization: Bearer <token>` if user is authenticated
3. On 401 response: call refresh token API once → update stored token → retry original request
4. On second consecutive 401: call sign-out action → redirect to `/login`
5. All API errors normalized to `ApiError` with structured `message` and `statusCode`
6. All service functions are `async` and return typed response data (not the Axios response wrapper)
7. `QueryProvider` wraps the app with configured `QueryClient` (staleTime: 5min, retry: 1)
8. `queryKeys` factory provides typed, consistent cache keys across all features
9. All service modules export a plain object with typed async functions (not classes)
10. Upload service handles `multipart/form-data` automatically

## UI Requirements
No UI in this ticket.

## API Requirements
This ticket defines the client-side wrappers for all existing backend APIs. No new backend endpoints needed. See `API Requirements` in each feature ticket for specific endpoint details.

## Backend Changes
None in this ticket. Backend CORS configuration is handled in WEB-006.

## Technical Implementation Notes

### Install Dependencies
```bash
npm install axios @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

### Axios Client (`src/lib/api/client.ts`)
```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '@/lib/env';

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

export const apiClient = axios.create({
  baseURL: `${env.NEXT_PUBLIC_API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor — inject token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Token injected from Zustand store (lazy import to avoid circular dep)
  const { accessToken } = getAuthStore().getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor — handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }
      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken(); // calls /api/auth/refresh
        getAuthStore().getState().setAccessToken(newToken);
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        getAuthStore().getState().signOut();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(normalizeError(error));
  }
);
```

### Error Normalization
```typescript
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function normalizeError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as { message?: string } | undefined;
  return new ApiError(data?.message ?? 'An unexpected error occurred', status);
}
```

### Service Module Pattern (`src/lib/api/subjects.ts`)
```typescript
import { apiClient } from './client';
import type { Subject, ClassSession, PaginatedResponse } from '@/types/domain';

export const subjectsApi = {
  getByUserId: async (userId: string): Promise<Subject[]> => {
    const { data } = await apiClient.get(`/subject/findByUserId/${userId}`);
    return data.subjects;
  },

  getById: async (id: string): Promise<{ subject: Subject; classSessions: ClassSession[] }> => {
    const { data } = await apiClient.get(`/subject/${id}`);
    return data;
  },

  create: async (payload: CreateSubjectPayload): Promise<Subject> => {
    const { data } = await apiClient.post('/subject/add', payload);
    return data.subject;
  },

  join: async (payload: { studentId: string; joinCode: string }): Promise<void> => {
    await apiClient.post('/subject/join', payload);
  },

  leave: async (payload: { studentId: string; subjectId: string }): Promise<void> => {
    await apiClient.post('/subject/leave', payload);
  },

  update: async (id: string, payload: Partial<Subject>): Promise<void> => {
    await apiClient.patch(`/subject/update/${id}`, payload);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/subject/delete/${id}`);
  },

  getStudents: async (subjectId: string): Promise<User[]> => {
    const { data } = await apiClient.get(`/subject/${subjectId}/students`);
    return data.students;
  },

  getAvgReview: async (subjectId: string): Promise<AvgReview> => {
    const { data } = await apiClient.get(`/subject/avgReview/${subjectId}`);
    return data;
  },

  notifyCancel: async (payload: CancelPayload): Promise<void> => {
    await apiClient.post('/subject/notify/classCancel', payload);
  },

  notifyReschedule: async (payload: ReschedulePayload): Promise<void> => {
    await apiClient.post('/subject/notify/classReschedule', payload);
  },

  getTopParticipants: async (subjectId: string, top = 5) => {
    const { data } = await apiClient.get(`/subject/top-participants/${subjectId}`, { params: { top } });
    return data.topParticipants;
  },

  getTopReactors: async (subjectId: string, top = 5) => {
    const { data } = await apiClient.get(`/subject/top-reactors/${subjectId}`, { params: { top } });
    return data.topReactors;
  },

  getTopReviewers: async (subjectId: string, top = 5) => {
    const { data } = await apiClient.get(`/subject/top-reviewers/${subjectId}`, { params: { top } });
    return data.topReviewers;
  },

  getTopAbsentees: async (subjectId: string, top = 5) => {
    const { data } = await apiClient.get(`/subject/top-absentees/${subjectId}`, { params: { top } });
    return data.topAbsentStudents;
  },

  exportStudents: (subjectId: string): string => {
    return `${env.NEXT_PUBLIC_API_URL}/api/v1/subject/${subjectId}/students/exportExcel`;
  },
};
```

### Query Keys Factory (`src/lib/api/queryKeys.ts`)
```typescript
export const queryKeys = {
  subjects: {
    all: ['subjects'] as const,
    byUser: (userId: string) => ['subjects', 'user', userId] as const,
    byId: (id: string) => ['subjects', id] as const,
    students: (subjectId: string) => ['subjects', subjectId, 'students'] as const,
    avgReview: (subjectId: string) => ['subjects', subjectId, 'avgReview'] as const,
    topStats: (subjectId: string, type: string) => ['subjects', subjectId, 'top', type] as const,
  },
  classSessions: {
    byUser: (userId: string) => ['classSessions', 'user', userId] as const,
    bySubject: (subjectId: string) => ['classSessions', 'subject', subjectId] as const,
  },
  cAttend: {
    bySubject: (subjectId: string) => ['cAttend', 'subject', subjectId] as const,
    byId: (id: string) => ['cAttend', id] as const,
    students: (cAttendId: string) => ['cAttend', cAttendId, 'students'] as const,
  },
  discussions: {
    byCAttend: (cAttendId: string) => ['discussions', 'cAttend', cAttendId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
  },
  // ... all domains
} as const;
```

### QueryProvider (`src/providers/QueryProvider.tsx`)
```tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,   // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

### Upload Service
```typescript
// src/lib/api/upload.ts
export const uploadApi = {
  image: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('image', file);
    const { data } = await apiClient.post('/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.downloadURL;
  },

  images: async (files: File[]): Promise<string[]> => {
    const form = new FormData();
    files.forEach((f) => form.append('image', f));
    const { data } = await apiClient.post('/upload/images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.downloadURLs;
  },

  file: async (file: File, meta: { name: string; type: string; cAttendId: string }): Promise<Document> => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(meta).forEach(([k, v]) => form.append(k, v));
    const { data } = await apiClient.post('/upload/file', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.document;
  },
};
```

## Acceptance Criteria
- [ ] Axios instance is created with correct base URL from env
- [ ] All requests include `Authorization: Bearer` header when user is logged in
- [ ] On 401: token refresh is attempted once; original request retried with new token
- [ ] On second 401: user is signed out and redirected to `/login`
- [ ] Multiple concurrent 401s are queued (not multiple refresh calls)
- [ ] `ApiError` is thrown with correct `statusCode` and `message` for all error responses
- [ ] All service modules exist for every backend domain
- [ ] `queryKeys` factory covers all domains
- [ ] `QueryProvider` is exported and ready to wrap the root layout
- [ ] Upload service sends `multipart/form-data` correctly

## Testing Requirements
- **Unit tests (Vitest):**
  - Mock `apiClient` and verify service functions call correct endpoints with correct payloads
  - Test 401 interceptor: mock first call as 401 → mock refresh → verify retry with new token
  - Test second 401: verify sign-out is called
  - Test `normalizeError`: verify `ApiError` with correct fields for various HTTP status codes
- **Integration test (optional):**
  - Against a running backend (or MSW mock), verify `subjectsApi.getById()` returns typed data

## Definition of Done
- All service modules exist and export typed functions
- Interceptors work for token injection and refresh
- `QueryProvider` wraps the app
- All unit tests pass

## Risks / Notes
- The Axios interceptor imports the Zustand store — use a lazy import or accessor function to avoid circular dependencies (store imports apiClient → apiClient imports store)
- `getAuthStore` should be a function that returns the store instance lazily, called at runtime not import time
- For the refresh call, use a plain `fetch()` or separate Axios instance without interceptors to avoid infinite loop
- `isRefreshing` flag prevents multiple concurrent refresh calls — this is a standard pattern
