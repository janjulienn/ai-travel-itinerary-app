# AI Travel Itinerary Mobile App - AI Agent Instructions

## Architecture Overview

This repository is an **Expo + React Native + TypeScript** mobile client for the AI itinerary platform.

Core architecture:
- **Navigation shell** in `App.tsx` (bottom tabs + nested native stacks)
- **Feature-oriented structure** in `src/` (`screens`, `components`, `services/api`, `hooks`, `store`, `types`)
- **Context + reducer global state** for auth/session in `src/store/store.tsx`
- **Axios-based API layer** in `src/services/api/`
- **React Native Paper theme system** in `src/theme/index.ts`

## Product and UX Scope

The app supports:
- browsing provinces and places
- generating itinerary plans
- viewing/updating trip activities
- profile/auth entry points

Auth/social auth should be treated as **experimental/beta** (not production-stable).
Do not assume every auth UX path is finalized.

## Key Components

### Navigation

`App.tsx` defines four tabs:
- Home
- Generate
- My Trips
- Profile

Each tab has its own stack; screen additions should preserve this structure unless explicitly requested.

### State Management

`src/store/store.tsx` handles:
- token/refresh token lifecycle
- persisted storage via AsyncStorage
- profile bootstrap on app load
- guest-mode behavior

Rules:
- keep auth side effects in store/provider layer
- avoid duplicating token logic in screens/components

### API Layer

- `src/services/api/apiClient.ts` centralizes axios config and refresh-token retry behavior.
- `src/services/api/*.ts` files define endpoint-specific functions.

Rules:
- Keep HTTP concerns in API services, not UI components.
- Reuse shared client; do not create ad-hoc axios instances in screens.

### Types and Contracts

- DTOs in `src/types/dtos/` represent backend payload contracts.
- Keep DTOs aligned with backend serializer responses.

When backend contract changes, update DTOs and API mappers together.

## Critical Conventions

### 1) Backend Error Envelope Normalization (Mandatory)

Backend error format:

```json
{
  "error": {
    "code": "string_code",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Frontend requirement:
- Normalize this envelope consistently across all API surfaces.
- Screens/components should consume a stable UI error shape (not raw axios payloads).
- Avoid one-off error parsing logic in individual screens.

### 2) Screen vs Component Responsibilities

- **Screens** orchestrate data fetching, navigation, and high-level actions.
- **Components** remain presentational/reusable with minimal side effects.
- Keep business decisions (status handling, retries, API branching) out of visual-only components.

### 3) Theming and Visual Consistency

- Use tokens from `src/theme/index.ts` and existing design primitives.
- Prefer existing component patterns before introducing new UI abstractions.
- Avoid hard-coded visual values unless matching established project style.

### 4) API Base URL and Environment

Current API base URL is configured in `src/constants/index.ts`.
The README may not fully match the current runtime configuration.
Treat **source code constants + running environment** as the current source of truth.

### 5) Auth Maturity

Treat auth/social login as beta:
- keep flows resilient to backend mismatch states
- provide graceful fallback messaging
- avoid assumptions that social providers are fully wired end-to-end

## Development Workflow

### Install and Run

```bash
npm install
npm start
npm run ios
npm run android
npm run web
```

### Build Context

- Expo SDK 54
- React Native 0.81
- TypeScript strict mode (`tsconfig.json`)

No formal lint/test scripts are currently configured in `package.json`.

## Data Flow Patterns

### Typical read flow

1. Screen calls custom hook or API service.
2. API service uses shared axios client.
3. Response is mapped to typed DTO usage.
4. UI renders loading, error, or data states.

### Typical auth flow

1. Login/register response returns tokens + user.
2. Store persists tokens and sets api client auth state.
3. Profile refresh bootstraps session on app startup.
4. Refresh token interceptor retries failed 401 requests.

## Testing Expectations

Current status:
- No established automated test suite in this repo.

Guidance:
- **Encourage tests when feasible** for critical logic paths (auth reducer behavior, API normalization helpers, and complex hooks).
- If adding tests is not practical for a change, keep scope tight and validate behavior manually in target screens.

## Coding Guidelines for Agents

- Keep changes feature-scoped and avoid broad rewrites.
- Prefer extending existing hooks/services/components over creating parallel patterns.
- Preserve TypeScript strictness and explicit typing.
- Maintain navigation contract types in `src/types/navigation.ts` when adding routes.
- Keep optimistic assumptions minimal when dealing with network/auth failures.

## Common Change Patterns

### Add a new backend endpoint consumption

1. Add typed request/response DTO updates in `src/types/dtos/`.
2. Add/extend API function in `src/services/api/*`.
3. Normalize backend error envelope in shared layer.
4. Wire into screen via existing hook/state pattern.
5. Add loading/error UI handling consistent with existing screens.

### Add a new trip interaction UI

1. Keep orchestration in screen (`ItineraryDetailScreen`-style).
2. Put reusable UI into `src/components/`.
3. Reuse current modal/card patterns where possible.
4. Keep payload/date/time transformations near API boundary.

### Adjust auth behavior

1. Update `src/store/store.tsx` and `src/services/api/auth.ts` together.
2. Verify token refresh interceptor interactions.
3. Keep guest mode functional as a fallback path.

## Integration Notes with Backend Repo

- Backend routes are under `/api/v1/`.
- Itinerary generation may be slow because backend AI flow is synchronous in current MVP architecture.
- Backend guarantees a standard error envelope; frontend must normalize and present user-friendly messages.
- DTO parity with backend serializers is required for reliability.
