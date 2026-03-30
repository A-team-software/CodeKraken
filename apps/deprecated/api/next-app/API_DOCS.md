# 📚 Professional API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Authentication](#authentication)
4. [Architecture](#architecture)
5. [Rate Limiting & Quotas](#rate-limiting--quotas)
6. [Git Provider API](#git-provider-api-endpoints)
7. [Board Provider API](#board-provider-api-endpoints)
8. [Atlassian Connect Lifecycle](#atlassian-connect-lifecycle-api)
9. [AI Agent API](#ai-agent-api)
10. [Request/Response Formats](#requestresponse-formats)
11. [Error Handling](#error-handling)
12. [Best Practices](#best-practices)
13. [Webhooks Guide](#webhooks-guide)
14. [Pagination & Filtering](#pagination--filtering)
15. [Troubleshooting](#troubleshooting)

---

## Overview

The OliverAI Provider Integration API enables seamless integration with **Git providers** (GitHub, Bitbucket) and **Board providers** (Jira, Trello, Asana, Linear) for comprehensive repository and project management. This RESTful API provides secure OAuth authentication, real-time webhooks, and an AI-powered agent flow for autonomous task resolution.

**API Version:** 1.0.0  
**Base URL (Development):** `http://localhost:3000`  
**Base URL (Production):** `https://api.oliveraiapp.com`  
**Status:** ✅ Production Ready

---

## Quick Start

### 1. Initialize OAuth Flow

```bash
curl -X GET "http://localhost:3000/api/boards/jira/oauth" \
  -H "Content-Type: application/json"
```

### 2. Authorize with Provider

Visit the `loginUrl` returned in the response to authorize your account.

### 3. Access Protected Resources

```bash
curl -X GET "http://localhost:3000/api/boards/jira/boards" \
  -H "Cookie: board_provider_token_jira=YOUR_TOKEN"
```

### 4. Handle Webhooks

Set up your webhook endpoint to receive real-time events:

```bash
curl -X POST "http://localhost:3000/api/boards/jira/webhooks" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "boardId": "10001",
    "url": "https://your-domain.com/webhook",
    "events": ["jira:issue_created", "jira:issue_updated"]
  }'
```

---

## 🎯 Architecture Overview

The API is organized into four main categories:

### **Git Providers** (`/api/git/`)
Repository management and version control operations:
- GitHub (full support)
- Bitbucket (full support)
- GitLab (coming soon)

### **Board Providers** (`/api/boards/`)
Project/board management and issue tracking:
- Jira (full support with transitions)
- Trello (card management)
- Asana (project/task management)
- Linear (issue tracking with states)
- Atlassian Connect (app lifecycle)

### **Atlassian Connect** (`/api/connect/`)
Lifecycle management for Jira/Confluence apps:
- Installation events
- Uninstallation events
- JWT authentication

### **AI Agent Flow** (`/api/`)
Autonomous task resolution and code analysis:
- Task Solving (`/api/solve`)
- Session Management
- Code Generation & Execution

---

## � Authentication

### OAuth 2.0 (Recommended)

All providers support OAuth 2.0 authentication (Trello uses OAuth 1.0a). This is the recommended approach for production applications.

#### OAuth Flow Overview

**Step 1: Initiate Authorization**
```http
GET /api/[git|boards]/[provider]/oauth
```

**Response:**
```json
{
  "loginUrl": "https://github.com/login/oauth/authorize?client_id=...&scope=repo&state=...",
  "state": "random-state-token-for-csrf-protection",
  "provider": "github"
}
```

**Step 2: User Authorizes**
The user is redirected to the provider's authorization page. After authorization, they are automatically redirected back to your application via the callback endpoint.

**Step 3: Handle Callback**
```http
GET /api/[git|boards]/[provider]/callback?code=AUTH_CODE&state=STATE_TOKEN
```

The callback handler:
1. ✅ Validates the state token (CSRF protection)
2. ✅ Exchanges the authorization code for an access token
3. ✅ Verifies the token by authenticating with the provider
4. ✅ Sets a secure httpOnly cookie
5. ✅ Redirects to `/dashboard`

**Security Notes:**
- State tokens prevent CSRF attacks
- They expire after 10 minutes
- Mismatched states are rejected
- Tokens are encrypted before storage

#### OAuth Cookie Details

| Provider | Cookie Name | Secure | HttpOnly | SameSite | Domain |
|----------|------------|--------|----------|----------|--------|
| GitHub | `git_provider_token_github` | ✅ | ✅ | Lax | `.domain.com` |
| Bitbucket | `git_provider_token_bitbucket` | ✅ | ✅ | Lax | `.domain.com` |
| Jira | `board_provider_token_jira` | ✅ | ✅ | Lax | `.domain.com` |
| Trello | `board_provider_token_trello` | ✅ | ✅ | Lax | `.domain.com` |
| Asana | `board_provider_token_asana` | ✅ | ✅ | Lax | `.domain.com` |
| Linear | `board_provider_token_linear` | ✅ | ✅ | Lax | `.domain.com` |

### Bearer Token Authentication

For server-to-server communication or direct API access:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example:**
```bash
curl -X GET "https://api.oliveraiapp.com/api/boards/jira/issues?boardId=10001" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### JWT Authentication (Atlassian Connect)

Atlassian provides JWT tokens in request headers for app lifecycle events:

```http
Authorization: JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Our API automatically validates and processes these tokens.

### Multi-Provider Authentication

Authenticated requests automatically detect which provider's token to use based on:
1. The API endpoint path (e.g., `/api/boards/jira/...`)
2. The provider-specific cookie in the request
3. The Authorization header (if provided)

---

## 📊 Rate Limiting & Quotas

### Rate Limits

The API enforces rate limits to ensure fair usage and service stability:

| Endpoint Category | Requests per Minute | Burst Limit | Window |
|------------------|-------------------|------------|--------|
| Authentication | 5 | - | 1 minute |
| Repositories | 30 | 60 | 1 minute |
| Issues/Tasks | 60 | 120 | 1 minute |
| Webhooks | 100 | 200 | 1 minute |
| Search | 20 | 40 | 1 minute |

### Rate Limit Headers

Every response includes rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1645018500
X-RateLimit-RetryAfter: 12
```

### Handling Rate Limits

When rate limited (HTTP 429):

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "details": {
    "retryAfter": 12,
    "resetAt": "2026-02-17T12:35:00Z"
  }
}
```

**Best Practice: Implement exponential backoff:**

```javascript
async function makeRequestWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = error.headers.get('X-RateLimit-RetryAfter');
        const delay = Math.pow(2, i) * 1000 * parseInt(retryAfter);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### Quota System

Monthly quota limits based on API plan:

| Plan | Monthly Requests | Storage | Webhooks | Concurrent Sessions |
|------|-----------------|---------|----------|-------------------|
| Free | 10,000 | 1 GB | 5 | 1 |
| Pro | 100,000 | 10 GB | 50 | 10 |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited |

---

## 🔐 Security Best Practices

### 1. Token Storage

✅ **Recommended:**
- Store tokens in secure httpOnly cookies
- Use HTTPS only for cookie transmission
- Set appropriate expiration times (1 hour access, indefinite refresh)

❌ **Not Recommended:**
- Storing tokens in localStorage
- Passing tokens in URL parameters
- Committing tokens to version control

### 2. CSRF Protection

Our API implements CSRF protection through:
- State tokens for OAuth flows
- Same-Site cookie attributes
- CORS origin validation

### 3. Request Signing

For Atlassian Connect, all requests are signed with JWT tokens:

```javascript
const crypto = require('crypto');

function verifyJWT(token, secret) {
  const parts = token.split('.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  const signature = parts[2];
  
  const message = `${parts[0]}.${parts[1]}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return signature === expectedSignature;
}
```

---

## Git Provider API Endpoints

### Base URL: `/api/git/`

Supported providers: `github`, `bitbucket`

---

### 📌 OAuth Authentication

#### Initiate OAuth Flow

```http
GET /api/git/{provider}/oauth
```

**URL Parameters:**
- `provider` (required) - One of: `github`, `bitbucket`

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/git/github/oauth" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "loginUrl": "https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=repo%20admin%3Arepo_hook&state=abc123def456ghi789",
  "state": "abc123def456ghi789",
  "provider": "github"
}
```

**Response Fields:**
- `loginUrl` (string, required) - URL where user should be redirected to authorize
- `state` (string, required) - Unique state token for CSRF protection
- `provider` (string, required) - The provider name

---

#### OAuth Callback Handler

```http
GET /api/git/{provider}/callback?code={authorization_code}&state={state_token}
```

**Query Parameters:**
- `code` (required) - Authorization code from provider
- `state` (required) - State token from initial OAuth request

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/git/github/callback?code=github_auth_code_12345&state=abc123def456ghi789"
```

**Response (302 Redirect):**
- Redirects to `/dashboard`
- Sets secure httpOnly cookie: `git_provider_token_github`

**Error Responses:**

| Status | Code | Message | Solution |
|--------|------|---------|----------|
| 400 | `INVALID_STATE` | State mismatch (CSRF attack suspected) | Restart OAuth flow |
| 400 | `INVALID_CODE` | Invalid authorization code | Check that code isn't expired |
| 401 | `AUTH_FAILED` | Provider rejected credentials | Verify client credentials |
| 500 | `SERVER_ERROR` | Token exchange failed | Check server logs |

---

### 📌 Repository Management

#### List Repositories

```http
GET /api/git/{provider}/repositories
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number for pagination
- `perPage` (optional, default: 30, max: 100) - Results per page
- `sort` (optional, default: updated) - Sort by: `updated`, `created`, `pushed`, `name`
- `direction` (optional, default: desc) - Sort direction: `asc` or `desc`
- `type` (optional) - Filter by: `all`, `owner`, `member` (GitHub only)
- `search` (optional) - Text search filter

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/git/github/repositories?page=1&perPage=20&sort=updated&direction=desc" \
  -H "Cookie: git_provider_token_github=YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "repositories": [
    {
      "id": "123456789",
      "name": "my-awesome-repo",
      "slug": "my-awesome-repo",
      "owner": "octocat",
      "fullName": "octocat/my-awesome-repo",
      "description": "My awesome repository for code analysis",
      "isPrivate": false,
      "isFork": false,
      "isArchived": false,
      "htmlUrl": "https://github.com/octocat/my-awesome-repo",
      "cloneUrl": {
        "https": "https://github.com/octocat/my-awesome-repo.git",
        "ssh": "git@github.com:octocat/my-awesome-repo.git"
      },
      "language": "TypeScript",
      "defaultBranch": "main",
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2026-02-17T12:00:00Z",
      "pushedAt": "2026-02-16T08:45:00Z",
      "size": 2048,
      "stats": {
        "stars": 145,
        "forks": 23,
        "issues": 12,
        "watchers": 47,
        "openIssues": 5
      },
      "permissions": {
        "admin": true,
        "push": true,
        "pull": true
      },
      "topics": ["node", "javascript", "api"],
      "license": "MIT",
      "homepage": "https://docs.example.com"
    },
    {
      "id": "987654321",
      "name": "api-service",
      "slug": "api-service",
      "owner": "octocat",
      "fullName": "octocat/api-service",
      "description": null,
      "isPrivate": true,
      "isFork": false,
      "isArchived": false,
      "htmlUrl": "https://github.com/octocat/api-service",
      "cloneUrl": {
        "https": "https://github.com/octocat/api-service.git",
        "ssh": "git@github.com:octocat/api-service.git"
      },
      "language": "Python",
      "defaultBranch": "develop",
      "createdAt": "2024-06-20T14:22:00Z",
      "updatedAt": "2026-02-15T09:15:00Z",
      "pushedAt": "2026-02-17T11:30:00Z",
      "size": 5120,
      "stats": {
        "stars": 0,
        "forks": 0,
        "issues": 3,
        "watchers": 2,
        "openIssues": 1
      },
      "permissions": {
        "admin": true,
        "push": true,
        "pull": true
      },
      "topics": ["api", "backend", "python"],
      "license": "Apache-2.0",
      "homepage": null
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

**Response Fields:**
- `repositories` (array) - List of repository objects
  - `id` (string) - Unique repository identifier
  - `name` (string) - Repository name
  - `slug` (string) - URL-safe repository name
  - `owner` (string) - Repository owner username
  - `fullName` (string) - Full repository path (owner/name)
  - `description` (string, nullable) - Repository description
  - `isPrivate` (boolean) - Whether repository is private
  - `isFork` (boolean) - Whether repository is a fork
  - `isArchived` (boolean) - Whether repository is archived
  - `htmlUrl` (string) - Repository web URL
  - `cloneUrl` (object) - Clone URLs for HTTPS and SSH
  - `language` (string, nullable) - Primary programming language
  - `defaultBranch` (string) - Default branch name
  - `createdAt` (string, ISO 8601) - Creation timestamp
  - `updatedAt` (string, ISO 8601) - Last update timestamp
  - `pushedAt` (string, ISO 8601) - Last push timestamp
  - `size` (number) - Repository size in kilobytes
  - `stats` (object) - Repository statistics
  - `permissions` (object) - User's permissions
  - `topics` (array) - Repository topics/tags
  - `license` (string, nullable) - License SPDX identifier
  - `homepage` (string, nullable) - Repository homepage URL
- `pagination` (object) - Pagination info
  - `page` (number) - Current page
  - `perPage` (number) - Items per page
  - `total` (number) - Total repositories
  - `totalPages` (number) - Total pages

---

#### Get Single Repository

```http
GET /api/git/{provider}/repositories/{owner}/{slug}
Authorization: Bearer {token}
```

**URL Parameters:**
- `provider` (required) - Provider name
- `owner` (required) - Repository owner
- `slug` (required) - Repository name

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/git/github/repositories/octocat/my-awesome-repo" \
  -H "Cookie: git_provider_token_github=YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "repository": {
    "id": "123456789",
    "name": "my-awesome-repo",
    "slug": "my-awesome-repo",
    "owner": "octocat",
    "fullName": "octocat/my-awesome-repo",
    "description": "My awesome repository",
    "isPrivate": false,
    "isFork": false,
    "isArchived": false,
    "htmlUrl": "https://github.com/octocat/my-awesome-repo",
    "cloneUrl": {
      "https": "https://github.com/octocat/my-awesome-repo.git",
      "ssh": "git@github.com:octocat/my-awesome-repo.git"
    },
    "language": "TypeScript",
    "defaultBranch": "main",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2026-02-17T12:00:00Z",
    "pushedAt": "2026-02-16T08:45:00Z",
    "size": 2048,
    "stats": {
      "stars": 145,
      "forks": 23,
      "issues": 12,
      "watchers": 47,
      "openIssues": 5
    },
    "permissions": {
      "admin": true,
      "push": true,
      "pull": true
    },
    "topics": ["node", "javascript", "api"],
    "license": "MIT",
    "homepage": "https://docs.example.com"
  }
}
```

---

### 📌 Webhook Management

#### List Webhooks

```http
GET /api/git/{provider}/webhooks
Authorization: Bearer {token}
```

**Query Parameters:**
- `owner` (required) - Repository owner
- `slug` (required) - Repository name
- `page` (optional, default: 1) - Page number
- `perPage` (optional, default: 30) - Items per page

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/git/github/webhooks?owner=octocat&slug=my-awesome-repo" \
  -H "Cookie: git_provider_token_github=YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "webhooks": [
    {
      "id": "387463414",
      "url": "https://your-domain.com/webhooks/github",
      "active": true,
      "events": [
        "push",
        "pull_request",
        "issues",
        "repository"
      ],
      "contentType": "json",
      "insecureSsl": false,
      "createdAt": "2026-02-01T15:30:00Z",
      "updatedAt": "2026-02-10T10:00:00Z",
      "lastResponse": {
        "code": 200,
        "status": "ok",
        "message": null,
        "timestamp": "2026-02-17T11:45:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 30,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### Create Webhook

```http
POST /api/git/{provider}/webhooks
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "owner": "octocat",
  "slug": "my-awesome-repo",
  "url": "https://your-domain.com/webhooks/github",
  "events": [
    "push",
    "pull_request",
    "issues",
    "pull_request_review",
    "repository"
  ],
  "active": true,
  "secret": "my-webhook-secret",
  "contentType": "json",
  "insecureSsl": false
}
```

**Request Body Parameters:**
- `owner` (string, required) - Repository owner
- `slug` (string, required) - Repository name
- `url` (string, required) - Webhook endpoint URL (must be HTTPS in production)
- `events` (array, required) - Events to subscribe to
- `active` (boolean, optional, default: true) - Whether webhook is active
- `secret` (string, optional) - Secret token for payload signing
- `contentType` (string, optional) - Content type: `json` or `form`
- `insecureSsl` (boolean, optional, default: false) - Skip SSL verification

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/git/github/webhooks" \
  -H "Cookie: git_provider_token_github=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "octocat",
    "slug": "my-awesome-repo",
    "url": "https://your-domain.com/webhooks/github",
    "events": ["push", "pull_request"],
    "secret": "my-secret-key"
  }'
```

**Response (201 Created):**
```json
{
  "webhook": {
    "id": "387463415",
    "url": "https://your-domain.com/webhooks/github",
    "active": true,
    "events": ["push", "pull_request"],
    "contentType": "json",
    "insecureSsl": false,
    "createdAt": "2026-02-17T14:20:00Z",
    "updatedAt": "2026-02-17T14:20:00Z",
    "lastResponse": null
  }
}
```

---

#### Update Webhook

```http
PATCH /api/git/{provider}/webhooks/{webhookId}
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://new-domain.com/webhooks/github",
  "events": ["push", "pull_request", "issues"],
  "active": false
}
```

**Response (200 OK):**
```json
{
  "webhook": {
    "id": "387463415",
    "url": "https://new-domain.com/webhooks/github",
    "active": false,
    "events": ["push", "pull_request", "issues"],
    "contentType": "json",
    "insecureSsl": false,
    "createdAt": "2026-02-17T14:20:00Z",
    "updatedAt": "2026-02-17T15:45:00Z",
    "lastResponse": {
      "code": 200,
      "status": "ok",
      "message": null,
      "timestamp": "2026-02-17T11:45:00Z"
    }
  }
}
```

---

#### Delete Webhook

```http
DELETE /api/git/{provider}/webhooks/{webhookId}
Authorization: Bearer {token}
```

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/git/github/webhooks/387463415" \
  -H "Cookie: git_provider_token_github=YOUR_TOKEN"
```

**Response (204 No Content):**
```
<empty body>
```

---

#### GitHub Webhook Events

Supported events for GitHub:

| Event | Description | Payload Size |
|-------|-------------|--------------|
| `push` | Commit pushed to repository | ~2-5 KB |
| `pull_request` | Pull request opened/closed/synchronize | ~5-10 KB |
| `pull_request_review` | Review submitted on PR | ~3-8 KB |
| `issues` | Issue opened/closed/reopened | ~2-6 KB |
| `issue_comment` | Comment on issue | ~2-4 KB |
| `repository` | Repository settings changed | ~1-3 KB |
| `release` | Release created/published | ~3-6 KB |
| `create` | Branch or tag created | ~1-2 KB |
| `delete` | Branch or tag deleted | ~1-2 KB |
| `check_run` | Check run created/completed | ~4-8 KB |
| `check_suite` | Check suite created/completed | ~3-6 KB |

---

#### Webhook Payload Verification

Verify webhook authenticity using the `X-Hub-Signature-256` header:

```javascript
const crypto = require('crypto');

function verifyGitHubWebhook(req, secret) {
  const signature = req.headers['x-hub-signature-256'];
  const body = req.rawBody; // Must be raw body, not parsed JSON
  
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', secret)
      .update(body)
      .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Board Provider API Endpoints

### Base URL: `/api/boards/`

Supported providers: `jira`, `trello`, `asana`, `linear`

---

### 📌 OAuth Authentication

### Initiate OAuth Flow

```http
GET /api/boards/[provider]/oauth
```

**Examples:**

**Jira:**
```http
GET /api/boards/jira/oauth
```

**Trello:**
```http
GET /api/boards/trello/oauth
```

**Asana:**
```http
GET /api/boards/asana/oauth
```

**Linear:**
```http
GET /api/boards/linear/oauth
```

**Response:**
```json
{
  "loginUrl": "https://auth.provider.com/authorize?...",
  "state": "random-state-token",
  "provider": "trello"
}
```

### OAuth Callback

```http
GET /api/boards/[provider]/callback?code=...&state=...
```

**Process:**
1. Validates state token (CSRF protection)
2. Exchanges authorization code for access token
3. Verifies token by authenticating with provider
4. Sets secure httpOnly cookie: `board_provider_token_{provider}`
5. Redirects to `/dashboard`

**Cookie Names:**
- Jira: `board_provider_token_jira`
- Trello: `board_provider_token_trello`
- Asana: `board_provider_token_asana`
- Linear: `board_provider_token_linear`

---

## 2. List Boards/Projects

```http
GET /api/boards/[provider]/boards
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `perPage` (optional) - Items per page (default: 30)

### Jira Example Response:
```json
{
  "boards": [
    {
      "id": "10001",
      "name": "Development Team",
      "key": "DEV",
      "description": "Main development board",
      "type": "software",
      "htmlUrl": "https://company.atlassian.net/browse/DEV",
      "avatarUrl": "https://...",
      "lead": {
        "name": "John Doe",
        "avatarUrl": "https://..."
      },
      "permissions": {
        "admin": true,
        "write": true,
        "read": true
      }
    }
  ]
}
```

### Trello Example Response:
```json
{
  "boards": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Product Roadmap",
      "key": "507f1f77bcf86cd799439011",
      "description": "Q1 2026 Roadmap",
      "type": "board",
      "htmlUrl": "https://trello.com/b/abc123/product-roadmap",
      "avatarUrl": "",
      "lead": {
        "name": "Jane Smith",
        "avatarUrl": "https://..."
      },
      "permissions": {
        "admin": true,
        "write": true,
        "read": true
      }
    }
  ]
}
```

### Asana Example Response:
```json
{
  "boards": [
    {
      "id": "1202595191347278",
      "name": "Marketing Campaign",
      "key": "1202595191347278",
      "description": "Q1 marketing initiatives",
      "type": "project",
      "htmlUrl": "https://app.asana.com/0/1202595191347278",
      "avatarUrl": "https://...",
      "lead": {
        "name": "Alice Johnson",
        "avatarUrl": ""
      },
      "permissions": {
        "admin": true,
        "write": true,
        "read": true
      }
    }
  ]
}
```

### Linear Example Response:
```json
{
  "boards": [
    {
      "id": "e4a8f5d2-3b1c-4d6e-9a7b-2c8f1d3e5a6b",
      "name": "Engineering",
      "key": "e4a8f5d2-3b1c-4d6e-9a7b-2c8f1d3e5a6b",
      "description": "Core engineering team",
      "type": "project",
      "htmlUrl": "https://linear.app/company/project/engineering-e4a8f5d2",
      "avatarUrl": "⚙️",
      "lead": {
        "name": "Bob Wilson",
        "avatarUrl": "https://..."
      },
      "permissions": {
        "admin": true,
        "write": true,
        "read": true
      }
    }
  ]
}
```

---

## 3. Manage Issues/Tasks/Cards

### List Issues

```http
GET /api/boards/[provider]/issues?boardId={boardId}&status={status}&assignee={assignee}
Authorization: Bearer {token}
```

**Query Parameters:**
- `boardId` (required) - Board/project ID
- `status` (optional) - Comma-separated status values
- `assignee` (optional) - Assignee email/ID
- `type` (optional) - Comma-separated issue types
- `search` (optional) - Text search query

### Jira Example:
```http
GET /api/boards/jira/issues?boardId=10001&status=In+Progress,Done
```

**Response:**
```json
{
  "issues": [
    {
      "id": "10050",
      "key": "DEV-123",
      "summary": "Implement OAuth for Trello",
      "description": "Add Trello provider support",
      "type": "Task",
      "status": "In Progress",
      "priority": "High",
      "assignee": {
        "name": "John Doe",
        "avatarUrl": "https://..."
      },
      "reporter": {
        "name": "Jane Smith",
        "avatarUrl": "https://..."
      },
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-17T12:00:00Z",
      "htmlUrl": "https://company.atlassian.net/browse/DEV-123",
      "labels": ["backend", "oauth"],
      "boardId": "10001"
    }
  ]
}
```

### Trello Example:
```http
GET /api/boards/trello/issues?boardId=507f1f77bcf86cd799439011&search=feature
```

**Response:**
```json
{
  "issues": [
    {
      "id": "607f1f77bcf86cd799439022",
      "key": "607f1f77bcf86cd799439022",
      "summary": "New feature request",
      "description": "Implement dark mode",
      "type": "Card",
      "status": "To Do",
      "priority": undefined,
      "assignee": {
        "name": "Alice Brown",
        "avatarUrl": "https://..."
      },
      "reporter": undefined,
      "createdAt": "2026-02-16T14:30:00Z",
      "updatedAt": "2026-02-17T09:15:00Z",
      "htmlUrl": "https://trello.com/c/abc123/new-feature-request",
      "labels": ["enhancement", "ui"],
      "boardId": "507f1f77bcf86cd799439011"
    }
  ]
}
```

### Asana Example:
```http
GET /api/boards/asana/issues?boardId=1202595191347278&status=Incomplete
```

**Response:**
```json
{
  "issues": [
    {
      "id": "1202595191347290",
      "key": "1202595191347290",
      "summary": "Design landing page",
      "description": "Create mockups for new landing page",
      "type": "Task",
      "status": "Incomplete",
      "priority": undefined,
      "assignee": {
        "name": "Carol Davis",
        "avatarUrl": ""
      },
      "reporter": undefined,
      "createdAt": "2026-02-14T08:00:00Z",
      "updatedAt": "2026-02-16T16:45:00Z",
      "htmlUrl": "https://app.asana.com/0/1202595191347290",
      "labels": ["design", "marketing"],
      "boardId": "1202595191347278"
    }
  ]
}
```

### Linear Example:
```http
GET /api/boards/linear/issues?boardId=e4a8f5d2-3b1c-4d6e-9a7b-2c8f1d3e5a6b
```

**Response:**
```json
{
  "issues": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "key": "ENG-42",
      "summary": "Fix authentication bug",
      "description": "Users unable to log in with Google OAuth",
      "type": "Issue",
      "status": "In Progress",
      "priority": "Urgent",
      "assignee": {
        "name": "David Lee",
        "avatarUrl": "https://..."
      },
      "reporter": {
        "name": "Emma Wilson",
        "avatarUrl": "https://..."
      },
      "createdAt": "2026-02-17T10:30:00Z",
      "updatedAt": "2026-02-17T11:45:00Z",
      "htmlUrl": "https://linear.app/company/issue/ENG-42",
      "labels": ["bug", "authentication"],
      "boardId": "e4a8f5d2-3b1c-4d6e-9a7b-2c8f1d3e5a6b"
    }
  ]
}
```

---

### Create Issue

```http
POST /api/boards/[provider]/issues
Authorization: Bearer {token}
Content-Type: application/json

{
  "boardId": "board-id",
  "summary": "Issue title",
  "description": "Issue description",
  "type": "Task",
  "priority": "Medium",
  "assignee": "user-id",
  "labels": ["backend", "api"]
}
```

### Jira Example:
```http
POST /api/boards/jira/issues
Content-Type: application/json

{
  "boardId": "10001",
  "summary": "Add Linear integration",
  "description": "Implement Linear provider service",
  "type": "Task",
  "priority": "High"
}
```

### Trello Example:
```http
POST /api/boards/trello/issues
Content-Type: application/json

{
  "boardId": "507f1f77bcf86cd799439011",
  "summary": "Update documentation",
  "description": "Add API examples for new providers"
}
```

### Asana Example:
```http
POST /api/boards/asana/issues
Content-Type: application/json

{
  "boardId": "1202595191347278",
  "summary": "Create social media calendar",
  "description": "Plan posts for Q1 2026"
}
```

### Linear Example:
```http
POST /api/boards/linear/issues
Content-Type: application/json

{
  "boardId": "e4a8f5d2-3b1c-4d6e-9a7b-2c8f1d3e5a6b",
  "summary": "Optimize database queries",
  "description": "Improve performance of user search"
}
```

**Response (all providers):**
```json
{
  "issue": {
    "id": "new-issue-id",
    "key": "PROJ-125",
    "summary": "Issue title",
    ...
  }
}
```

---

### Update Issue

```http
PATCH /api/boards/[provider]/issues?issueId={issueId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "summary": "Updated title",
  "description": "Updated description"
}
```

### Delete Issue

```http
DELETE /api/boards/[provider]/issues?issueId={issueId}
Authorization: Bearer {token}
```

---

## 4. Issue Transitions (Jira & Linear only)

### Get Available Transitions

```http
GET /api/boards/[provider]/issues/transitions?issueId={issueId}
Authorization: Bearer {token}
```

**Jira Response:**
```json
{
  "transitions": [
    {
      "id": "21",
      "name": "To Do",
      "isFinal": false
    },
    {
      "id": "31",
      "name": "Done",
      "isFinal": true
    }
  ]
}
```

**Linear Response:**
```json
{
  "transitions": [
    {
      "id": "state-id-1",
      "name": "Backlog",
      "isFinal": false
    },
    {
      "id": "state-id-2",
      "name": "Completed",
      "isFinal": true
    }
  ]
}
```

### Transition Issue

```http
POST /api/boards/[provider]/issues/transition
Authorization: Bearer {token}
Content-Type: application/json

{
  "issueId": "issue-id",
  "transitionId": "transition-id"
}
```

**Note:** Trello and Asana do not support formal workflow transitions.

---

## 5. Manage Webhooks

### List Webhooks

```http
GET /api/boards/[provider]/webhooks?boardId={boardId}
Authorization: Bearer {token}
```

**Response (all providers):**
```json
{
  "webhooks": [
    {
      "id": "webhook-id",
      "url": "https://example.com/webhook",
      "active": true,
      "events": ["issue_created", "issue_updated"],
      "createdAt": "2026-02-16T20:00:00Z",
      "contentType": "json",
      "insecureSsl": false
    }
  ]
}
```

### Create Webhook

```http
POST /api/boards/[provider]/webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "boardId": "board-id",
  "url": "https://example.com/webhook",
  "events": ["issue_created", "issue_updated"],
  "active": true
}
```

### Provider-Specific Event Types

**Jira Events:**
- `jira:issue_created`
- `jira:issue_updated`
- `jira:issue_deleted`
- `comment_created`
- `comment_updated`

**Trello Events:**
- `createCard`
- `updateCard`
- `deleteCard`
- `addMemberToCard`
- `commentCard`

**Asana Events:**
- `task`
- `project`
- `story`

**Linear Events:**
- `Issue`
- `Comment`
- `Project`

### Delete Webhook

```http
DELETE /api/boards/[provider]/webhooks?boardId={boardId}&hookId={hookId}
Authorization: Bearer {token}
```

---

## 6. Activity/Events

### Get Recent Activity

```http
GET /api/boards/[provider]/activity?boardId={boardId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "events": [
    {
      "id": "event-id",
      "type": "issue_updated",
      "actor": {
        "name": "John Doe",
        "avatarUrl": "https://..."
      },
      "timestamp": "2026-02-17T12:30:00Z",
      "description": "Changed status from In Progress to Done",
      "metadata": {
        "issueKey": "PROJ-123"
      }
    }
  ]
}
```

---

---

## 📋 Request/Response Formats

### Standard Request Format

All requests should follow this structure:

```http
METHOD /api/path/to/resource HTTP/1.1
Host: api.oliveraiapp.com
Content-Type: application/json
Authorization: Bearer {token}
User-Agent: MyApp/1.0

{
  "field": "value"
}
```

### Standard Response Format

All responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Example"
  },
  "meta": {
    "timestamp": "2026-02-17T12:00:00Z",
    "version": "1.0",
    "requestId": "req_abc123def456"
  }
}
```

### Response Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource successfully created |
| 204 | No Content | Request succeeded, no body to return |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (duplicate, etc.) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | Upstream service unavailable |
| 503 | Service Unavailable | Maintenance or overload |

---

### Request Body Examples

#### Simple Create Request

```json
{
  "summary": "Add user authentication",
  "description": "Implement OAuth 2.0 flow",
  "type": "Feature",
  "priority": "High"
}
```

#### Request with Nested Objects

```json
{
  "title": "Create API documentation",
  "assignee": {
    "id": "user_123",
    "email": "user@example.com"
  },
  "labels": [
    "documentation",
    "high-priority"
  ],
  "metadata": {
    "sprint": "Q1-2026",
    "component": "api"
  }
}
```

#### Request with Array Operations

```json
{
  "action": "bulk_update",
  "operations": [
    {
      "id": "issue_1",
      "status": "Done",
      "assignee": "user_123"
    },
    {
      "id": "issue_2",
      "status": "In Progress",
      "assignee": "user_456"
    }
  ]
}
```

---

### Response Body Examples

#### Single Resource Response

```json
{
  "success": true,
  "data": {
    "id": "issue_12345",
    "key": "PROJ-123",
    "summary": "Fix login bug",
    "description": "Users unable to log in with Google",
    "status": "In Progress",
    "createdAt": "2026-02-15T10:00:00Z",
    "updatedAt": "2026-02-17T12:00:00Z"
  },
  "meta": {
    "timestamp": "2026-02-17T12:30:00Z",
    "version": "1.0",
    "requestId": "req_abc123def456"
  }
}
```

#### List Response with Pagination

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Project A",
      "createdAt": "2026-01-01T00:00:00Z"
    },
    {
      "id": "2",
      "name": "Project B",
      "createdAt": "2026-01-15T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 47,
    "totalPages": 3,
    "hasMore": true
  },
  "meta": {
    "timestamp": "2026-02-17T12:30:00Z",
    "version": "1.0",
    "requestId": "req_abc123def456"
  }
}
```

---

#### Batch Operation Response

```json
{
  "success": true,
  "data": {
    "successful": [
      {
        "id": "issue_1",
        "status": "updated"
      }
    ],
    "failed": [
      {
        "id": "issue_2",
        "error": "Permission denied",
        "code": "PERMISSION_DENIED"
      }
    ]
  },
  "meta": {
    "successCount": 1,
    "failureCount": 1,
    "timestamp": "2026-02-17T12:30:00Z"
  }
}
```

---

## 🔴 Error Handling

### Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "description",
      "suggestion": "Recommended action"
    }
  },
  "meta": {
    "timestamp": "2026-02-17T12:30:00Z",
    "requestId": "req_abc123def456"
  }
}
```

### Authentication Errors

#### Invalid Token (401 Unauthorized)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Access token is invalid or expired",
    "details": {
      "expiresAt": "2026-02-17T11:30:00Z",
      "suggestion": "Refresh your token or re-authenticate"
    }
  }
}
```

#### Missing Authentication (401 Unauthorized)

```json
{
  "success": false,
  "error": {
    "code": "MISSING_AUTH",
    "message": "No authorization header provided",
    "details": {
      "suggestion": "Include Authorization: Bearer {token} header"
    }
  }
}
```

#### Insufficient Permissions (403 Forbidden)

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to perform this action",
    "details": {
      "requiredRole": "admin",
      "userRole": "viewer",
      "resource": "projects/123/settings"
    }
  }
}
```

### Validation Errors

#### Invalid Request Body (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body contains invalid data",
    "details": {
      "violations": [
        {
          "field": "summary",
          "message": "Field is required",
          "rejectedValue": null
        },
        {
          "field": "priority",
          "message": "Must be one of: Low, Medium, High, Urgent",
          "rejectedValue": "Critical"
        }
      ]
    }
  }
}
```

#### Invalid Query Parameters (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Query parameters are invalid",
    "details": {
      "violations": [
        {
          "parameter": "page",
          "message": "Must be a positive integer",
          "rejectedValue": "0"
        },
        {
          "parameter": "status",
          "message": "Unknown status value",
          "rejectedValue": "InvalidStatus"
        }
      ]
    }
  }
}
```

### Resource Errors

#### Resource Not Found (404 Not Found)

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found",
    "details": {
      "resource": "Issue",
      "identifier": "PROJ-999",
      "suggestion": "Check that the resource ID is correct"
    }
  }
}
```

#### Conflict Error (409 Conflict)

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Resource conflict prevents this operation",
    "details": {
      "reason": "Duplicate resource",
      "conflictingId": "board_123",
      "suggestion": "A board with this name already exists in this space"
    }
  }
}
```

### Rate Limit Error (429 Too Many Requests)

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "You have exceeded the rate limit",
    "details": {
      "limit": 60,
      "current": 62,
      "window": "1 minute",
      "resetAt": "2026-02-17T12:31:00Z",
      "retryAfter": 30
    }
  }
}
```

### Server Errors

#### Internal Server Error (500)

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected server error occurred",
    "details": {
      "requestId": "req_abc123def456",
      "timestamp": "2026-02-17T12:30:00Z",
      "supportContact": "support@example.com",
      "suggestion": "Please contact support with the request ID"
    }
  }
}
```

#### Service Unavailable (503)

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "The service is temporarily unavailable",
    "details": {
      "reason": "Maintenance scheduled",
      "estimatedRecovery": "2026-02-17T14:00:00Z",
      "statusPage": "https://status.example.com"
    }
  }
}
```

---

## 📊 Pagination & Filtering

### Pagination Parameters

All list endpoints support pagination:

```http
GET /api/boards/jira/boards?page=2&perPage=25&sort=name&direction=asc
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number (1-indexed)
- `perPage` (optional, default: 30, max: 100) - Items per page
- `sort` (optional) - Field to sort by
- `direction` (optional, default: asc) - Sort direction: `asc` or `desc`

**Pagination Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "perPage": 25,
    "total": 87,
    "totalPages": 4,
    "hasMore": true,
    "hasPrevious": true
  }
}
```

### Cursor-Based Pagination

For large datasets, use cursor-based pagination:

```http
GET /api/boards/linear/issues?cursor=abc123def456&limit=50
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "xyz789uvw012",
    "previousCursor": "abc123def456",
    "hasMore": true,
    "limit": 50
  }
}
```

### Filtering Examples

#### Text Search

```http
GET /api/boards/jira/issues?search=authentication&boardId=10001
```

#### Status Filter

```http
GET /api/boards/jira/issues?status=In+Progress,Done&boardId=10001
```

#### Date Range Filter

```http
GET /api/boards/linear/issues?createdAfter=2026-02-01&createdBefore=2026-02-28
```

#### Multiple Filters

```http
GET /api/boards/asana/tasks?projectId=123&status=incomplete&assignee=user@example.com&priority=high&sort=dueDate&direction=asc
```

---

## 💡 Best Practices

### 1. Caching Strategies

Implement caching to improve performance:

```javascript
const cacheItems = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getBoards(provider, ttl = CACHE_TTL) {
  const cacheKey = `boards:${provider}`;
  const cached = cacheItems.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const response = await fetch(`/api/boards/${provider}/boards`);
  const data = await response.json();
  
  cacheItems.set(cacheKey, {
    data: data.data,
    timestamp: Date.now()
  });
  
  return data.data;
}
```

### 2. Error Retry Logic

Implement exponential backoff for transient failures:

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) throw new RateLimitError();
      if (response.status >= 500) throw new ServerError();
      return response;
    } catch (error) {
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### 3. Connection Pooling

Reuse HTTP connections:

```javascript
import http from 'http';
import https from 'https';

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

const response = await fetch(url, {
  agent: url.startsWith('https') ? httpsAgent : httpAgent
});
```

### 4. Webhook Batching

Process webhook events in batches:

```javascript
const webhookQueue = [];
const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 5000;

function queueWebhookEvent(event) {
  webhookQueue.push(event);
  if (webhookQueue.length >= BATCH_SIZE) {
    processBatch();
  }
}

setTimeout(() => {
  if (webhookQueue.length > 0) processBatch();
}, BATCH_TIMEOUT);

async function processBatch() {
  const batch = webhookQueue.splice(0, BATCH_SIZE);
  // Process batch of events
}
```

### 5. Concurrent Request Limiting

Limit concurrent requests to avoid overwhelming the server:

```javascript
class RequestQueue {
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  async add(fn) {
    while (this.running >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }
}

const queue = new RequestQueue(5);
const results = await Promise.all(
  items.map(item => queue.add(() => fetchItem(item)))
);
```

---

## 🔗 Webhooks Guide

### What are Webhooks?

Webhooks allow your application to receive real-time notifications when events occur in connected providers (GitHub, Jira, Trello, etc.)

### Setting Up Webhooks

**Step 1: Create an Endpoint**
```javascript
app.post('/webhooks/jira', (req, res) => {
  const event = req.body;
  console.log('Event received:', event.webhookEvent);
  // Process event
  res.sendStatus(200);
});
```

**Step 2: Register Webhook**
```bash
curl -X POST "http://localhost:3000/api/boards/jira/webhooks" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "boardId": "10001",
    "url": "https://your-domain.com/webhooks/jira",
    "events": ["jira:issue_created", "jira:issue_updated"]
  }'
```

### Webhook Event Structure

```json
{
  "timestamp": "2026-02-17T12:30:00Z",
  "webhookEvent": "jira:issue_created",
  "issue": {
    "id": "10050",
    "key": "PROJ-123",
    "summary": "Add authentication",
    "description": "Implement OAuth flow",
    "status": "TO_DO",
    "creator": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "user": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "changelog": {
    "items": [
      {
        "field": "status",
        "fromString": null,
        "toString": "To Do"
      }
    ]
  }
}
```

### Handling Webhook Failures

If your webhook endpoint returns a non-2xx status or times out:

1. **First Retry:** Immediate
2. **Second Retry:** After 1 minute
3. **Third Retry:** After 5 minutes
4. **Maximum:** 10 retries over 24 hours

---

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Issue: "Invalid State Token"
**Problem:** OAuth callback fails with invalid state token
**Causes:**
- State token expired (valid for 10 minutes)
- CSRF attack attempt
- Browser cookies disabled
- Multiple browser tabs simultaneously

**Solution:**
```javascript
// Ensure only one OAuth flow at a time
if (window.oauthInProgress) {
  console.error('OAuth already in progress');
  return;
}
window.oauthInProgress = true;
```

---

#### Issue: "Rate Limit Exceeded"
**Problem:** Request returns HTTP 429
**Causes:**
- Too many requests in short time
- Bulk operations without throttling
- Incorrectly configured automated tasks

**Solution:**
```javascript
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function apiCallWithThrottle(fn) {
  try {
    return await fn();
  } catch (error) {
    if (error.status === 429) {
      const waitSeconds = error.headers.get('X-RateLimit-RetryAfter') || 60;
      await delay(waitSeconds * 1000);
      return apiCallWithThrottle(fn);
    }
    throw error;
  }
}
```

---

#### Issue: "Token Expired"
**Problem:** Requests fail with 401 Unauthorized
**Causes:**
- Access token expired
- Refresh token expired
- Token revoked by user
- Token invalidated by provider

**Solution:**
```javascript
async function makeAuthenticatedRequest(url, options) {
  let response = await fetch(url, options);
  
  if (response.status === 401) {
    // Attempt to refresh token
    const refreshed = await refreshToken();
    if (refreshed) {
      response = await fetch(url, options);
    } else {
      // Re-authenticate
      redirectToLogin();
    }
  }
  
  return response;
}
```

---

#### Issue: "Permission Denied"
**Problem:** Request returns 403 Forbidden
**Causes:**
- Insufficient permissions in provider
- Token scope insufficient
- User role doesn't allow operation
- Board/project access restricted

**Solution:**
1. Check user's role in provider: Admin, Write, Read, or View
2. Re-authenticate to update scopes
3. Request access from board owner
4. Use personal token with correct scopes

```bash
# For GitHub: Check token scopes
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user \
  -I | grep X-OAuth-Scopes
```

---

#### Issue: "Webhook Not Receiving Events"
**Problem:** Webhooks registered but not triggering
**Causes:**
- Endpoint returns non-2xx status
- Network/firewall blocking
- Webhook not configured correctly
- Provider filtering events

**Solution:**
```javascript
// 1. Verify endpoint is accessible
curl -X POST https://your-domain.com/webhook -d '{"test": true}'

// 2. Check webhook configuration
curl -X GET "https://api.oliveraiapp.com/api/boards/jira/webhooks?boardId=10001"

// 3. Enable detailed logging
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', {
    timestamp: new Date(),
    event: req.body.webhookEvent,
    headers: req.headers
  });
  res.sendStatus(200);
});

// 4. Test webhook delivery
curl -X POST "https://your-domain.com/webhook" \
  -H "Content-Type: application/json" \
  -d '{"webhookEvent": "test", "timestamp": "2026-02-17T12:00:00Z"}'
```

---

#### Issue: "Invalid Response Format"
**Problem:** Response parsing fails or fields missing
**Causes:**
- Expecting old API format
- Field name changed in new API version
- Null/undefined values not handled
- Type mismatch (string vs number)

**Solution:**
```javascript
// Add type checking and defaults
function parseIssue(data) {
  return {
    id: data.id || data.key || null,
    summary: String(data.summary || data.title || ''),
    status: String(data.status || 'Unknown'),
    createdAt: new Date(data.createdAt || data.created || Date.now()),
    // Handle nested optional fields
    assignee: data.assignee ? {
      id: data.assignee.id || null,
      name: data.assignee.name || 'Unassigned'
    } : null
  };
}
```

---

### Debugging Tools

#### Enable Request Logging

```javascript
// Log all API requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('API Request:', args[0], args[1]);
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('API Response:', response.status, response.headers);
      return response;
    });
};
```

#### Monitor Network Activity

Use browser DevTools Network tab:
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by XHR
4. Make API requests
5. Click request to view headers and payload

#### Check Provider API Status

- **GitHub:** https://www.githubstatus.com/
- **Jira:** https://www.atlassian.com/trust/status
- **Asana:** https://asana.com/status
- **Linear:** https://status.linear.app/

---

## 📋 Atlassian Connect Lifecycle API

These endpoints are called by Jira/Confluence when the app is installed or uninstalled. They use JWT authentication provided by Atlassian.

### 1. App Installed
```http
POST /api/connect/installed
```
**Payload:**
```json
{
  "key": "com.oliverai.jira-integration",
  "clientKey": "unique-client-key",
  "sharedSecret": "shared-secret-for-jwt",
  "baseUrl": "https://tenant.atlassian.net",
  "productType": "jira",
  "eventType": "installed"
}
```

### 2. App Uninstalled
```http
POST /api/connect/uninstalled
```
**Payload:**
```json
{
  "clientKey": "unique-client-key",
  "eventType": "uninstalled"
}
```

---

## 📋 AI Agent API

### Solve Task
```http
POST /api/solve
Content-Type: application/json
```
**Request Body:**
```json
{
  "task": "Fix the bug in login service",
  "repoUrl": "https://github.com/org/repo",
  "githubToken": "ghp_...",
  "apiKey": "your-ai-api-key"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "sess_123",
  "logs": "...",
  "diff": "...",
  "changedFiles": ["src/login.ts"]
}
```

---

## 🔐 Authentication Methods

### 1. OAuth (Recommended)

All providers support OAuth 2.0 (or OAuth 1.0a for Trello):

1. Initiate flow: `GET /api/boards/[provider]/oauth`
2. User authorizes on provider's site
3. Callback handles token exchange
4. Token stored in secure httpOnly cookie

### 2. Direct Token (Development/Fallback)

For direct API access, include token in header:

```http
Authorization: Bearer {your-access-token}
```

Or rely on cookie authentication (automatically sent by browser).

---

## 🔒 Security Features

### CSRF Protection
- State tokens generated for each OAuth flow
- Validated on callback to prevent attacks

### Secure Cookies
- `httpOnly`: Prevents JavaScript access
- `secure`: HTTPS only (production)
- `sameSite: 'lax'`: CSRF protection
- Provider-specific naming prevents conflicts

### Token Storage
- Client secrets stored server-side only
- Access tokens in httpOnly cookies
- No sensitive data in localStorage

---

---

## 🔄 Token Management

### Refresh Token Support

The API supports long-lived sessions by securely storing refresh tokens and automatically refreshing access tokens when they expire.

- **Access Tokens**: Stored in `httpOnly` cookies (valid for ~1 hour).
- **Refresh Tokens**: Stored encrypted in the database (valid indefinitely or until revoked).
- **Auto-Refresh**: API routes automatically check validity and refresh if needed via the `tokenHelper` utility.

### Manual Token Refresh

Trigger a refresh manually if needed (e.g., to force an update).

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "provider": "github",
  "providerType": "git"
}
```

**Parameters:**
- `provider`: Provider name (`github`, `bitbucket`, `jira`, `asana`, `linear`).
- `providerType`: `git` or `board`.

**Response:**
```json
{
  "success": true,
  "expiresAt": "2026-02-17T15:30:00.000Z"
}
```
- Sets a new `httpOnly` access token cookie in the response.

---

## 📊 Provider Comparison

| Feature | Jira | Trello | Asana | Linear |
|---------|------|--------|-------|--------|
| API Type | REST | REST | REST | GraphQL |
| OAuth Version | 2.0 | 1.0a | 2.0 | 2.0 |
| Webhooks | ✅ | ✅ | ✅ | ✅ |
| Transitions | ✅ | ❌ | ❌ | ✅ |
| Priorities | ✅ | ❌ | ❌ | ✅ |
| Labels | ✅ | ✅ | ✅ | ✅ |
| Attachments | ✅ | ✅ | ✅ | ✅ |
| Comments | ✅ | ✅ | ✅ | ✅ |

---

## 🧪 Testing Examples

### Test OAuth Flow

```bash
# 1. Get OAuth URL
curl http://localhost:3000/api/boards/trello/oauth

# 2. Visit loginUrl in browser, authorize
# 3. You'll be redirected to callback
# 4. Cookie will be set automatically
```

### Test with Cookie Authentication

```bash
# Browser automatically sends cookie
curl http://localhost:3000/api/boards/trello/boards \
  -H "Cookie: board_provider_token_trello=YOUR_TOKEN"
```

### Test with Bearer Token

```bash
curl http://localhost:3000/api/boards/asana/boards \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🔗 External API Documentation

- **Jira**: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- **Trello**: https://developer.atlassian.com/cloud/trello/rest/
- **Asana**: https://developers.asana.com/docs
- **Linear**: https://developers.linear.app/docs

---

## 📄 API Versioning

### Current Version: 1.0

**Deprecation Policy:**
- API versions will be maintained for a minimum of 2 years
- 12-month notice before deprecation
- Migration guides provided for breaking changes

### Version Headers

Include version in requests:
```http
Accept: application/vnd.oliveraiapp.v1+json
X-API-Version: 1.0
```

---

## 📞 Support

### Getting Help

- **Documentation:** https://docs.oliveraiapp.com
- **Status Page:** https://status.oliveraiapp.com
- **Email Support:** support@oliveraiapp.com
- **Twitter:** @OliverAI_Team

### Report Issues

Found a bug or have a feature request?
- GitHub Issues: https://github.com/oliveraiapp/api/issues
- Email: bugs@oliveraiapp.com

---

**Last Updated:** February 17, 2026  
**API Version:** 1.0  
**Documentation Version:** 2.0  
**Status:** ✅ Production Ready
