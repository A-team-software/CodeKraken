# 🧪 ApiDog Testing Guide - Local Development

This guide provides step-by-step instructions for testing the OliverAI Provider Integration API on **localhost** using [ApiDog](https://apidog.com/) (the modern Postman alternative).

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Project Configuration](#project-configuration)
3. [Environment Variables](#environment-variables)
4. [Authentication Setup](#authentication-setup)
5. [API Collection Structure](#api-collection-structure)
6. [Testing Workflows](#testing-workflows)
7. [Cookie & Token Management](#cookie--token-management)
8. [Debugging Tips](#debugging-tips)
9. [Common Issues & Solutions](#common-issues--solutions)

---

## Installation & Setup

### 1. Download & Install ApiDog

**Option A: Desktop App** (Recommended)
- Visit [apidog.com](https://apidog.com/)
- Download for your OS (Windows, macOS, Linux)
- Install and launch the application

**Option B: Web Version**
- Visit [app.apidog.com](https://app.apidog.com/)
- Sign up for a free account
- Create a new project

### 2. Create a New Project

1. Open ApiDog
2. Click **"Create Project"** or **"New"**
3. Name it: `OliverAI Local Testing`
4. Set type to **"REST API"**
5. Click **Create**

### 3. Start Your Local API Server

```bash
# In your project directory
npm run dev
```

This should start the Next.js server on `http://localhost:3000`

Verify it's running:
```bash
curl http://localhost:3000/api/health
```

---

## Project Configuration

### 1. Add Base URL

In ApiDog, configure your localhost base URL:

1. Click **"Settings"** ⚙️ (top-right)
2. Go to **"Environments"**
3. Click **"+ Create Environment"**
4. Name it: `Local Development`
5. Add these variables:

| Variable | Value |
|----------|-------|
| `base_url` | `http://localhost:3000` |
| `api_version` | `v1` |

6. Click **Save**

### 2. Select Default Environment

1. Top-left dropdown showing environment name
2. Select **"Local Development"**
3. Verify base URL updates to `http://localhost:3000`

---

## Environment Variables

Create environment variables in ApiDog for common test data:

### Local Development Environment Variables

```json
{
  "base_url": "http://localhost:3000",
  "api_version": "v1",
  
  "github_provider": "github",
  "bitbucket_provider": "bitbucket",
  "jira_provider": "jira",
  "trello_provider": "trello",
  "asana_provider": "asana",
  "linear_provider": "linear",
  
  "test_repo_owner": "octocat",
  "test_repo_slug": "my-awesome-repo",
  "test_issue_key": "PROJ-123",
  "test_board_id": "10001",
  
  "github_cookie": "git_provider_token_github",
  "jira_cookie": "board_provider_token_jira"
}
```

**How to add in ApiDog:**
1. Settings ⚙️ → Environments
2. Click "Local Development"
3. Add each variable in the table
4. Save

---

## Authentication Setup

### OAuth Flow Testing

#### Step 1: Get OAuth URL

Create a new request in ApiDog:

**Request Name:** `[GitHub] Get OAuth URL`

```
GET {{base_url}}/api/git/{{github_provider}}/oauth
```

- **Method:** GET
- **URL:** `{{base_url}}/api/git/{{github_provider}}/oauth`
- **Headers:** 
  - `Content-Type: application/json`

**Click Send** → You'll get a response with `loginUrl` and `state`:

```json
{
  "loginUrl": "https://github.com/login/oauth/authorize?client_id=...&state=...",
  "state": "xyz123state",
  "provider": "github"
}
```

#### Step 2: Manual Authorization

1. **Copy the `loginUrl`** from response
2. **Open in browser** and authorize the app
3. **Browser redirects** to callback with `code` and `state` parameters
4. The API automatically sets cookies in your browser

#### Step 3: Capture Cookie

After authorization, the API sets a secure cookie. In ApiDog:

1. Open **"Cookie Manager"** (if available in your ApiDog version)
2. Or manually get the cookie via browser DevTools:
   - Press `F12` → Application → Cookies
   - Find cookie: `git_provider_token_github`
   - Copy its value

**Alternative: Check Response Headers**
Some APIs echo back cookies in response headers. Look for `Set-Cookie` headers.

---

## API Collection Structure

### Organize Your Requests

Structure your ApiDog project like this:

```
📁 OliverAI Local Testing
  📁 Git Providers
    📁 GitHub - OAuth
      🔹 [1] Get OAuth URL
      🔹 [2] Callback (manual step)
    📁 GitHub - Repositories
      🔹 List Repositories
      🔹 Get Repository Details
      🔹 Get Repository Stats
    📁 GitHub - Webhooks
      🔹 List Webhooks
      🔹 Create Webhook
      🔹 Update Webhook
      🔹 Delete Webhook
  📁 Board Providers
    📁 Jira - OAuth
      🔹 [1] Get OAuth URL
      🔹 [2] Callback (manual step)
    📁 Jira - Boards
      🔹 List Boards
      🔹 Get Board Details
      🔹 Create Issue
      🔹 Update Issue
  📁 Health Checks
    🔹 API Health
```

### Create a Folder

1. Right-click in left panel
2. Select **"New Folder"**
3. Name it and add requests to it

---

## Testing Workflows

### 🔐 Workflow 1: OAuth & Authentication

**Goal:** Test complete OAuth flow and verify token storage

**Prerequisites:**
- Local API running
- GitHub account with OAuth app configured (see GITHUB_OAUTH_SETUP.md)

**Steps:**

1. **[1] Get OAuth URL**
   - Send request to `GET /api/git/github/oauth`
   - Copy `loginUrl` from response

2. **[2] Manual Authorization**
   - Paste `loginUrl` in browser
   - Click "Authorize"
   - Browser redirects to callback
   - Check cookies are set

3. **[3] Verify Token**
   - Send any authenticated endpoint
   - Should work without additional auth
   - Check `X-RateLimit-*` headers

**Example Request - Verify Auth:**
```
GET {{base_url}}/api/git/{{github_provider}}/repositories
```

Expected: `200 OK` with repositories list

---

### 📦 Workflow 2: Repository Management

**Goal:** Test Git provider endpoints

**Requests:**

#### List Repositories
```
GET {{base_url}}/api/git/{{github_provider}}/repositories?page=1&perPage=20
```

**Query Params:**
- `page`: 1
- `perPage`: 20
- `sort`: updated
- `direction`: desc

Expected Response:
```json
{
  "repositories": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

#### Get Repository Details
```
GET {{base_url}}/api/git/{{github_provider}}/repositories/{{test_repo_owner}}/{{test_repo_slug}}
```

Expected Response:
```json
{
  "repository": {
    "id": "123456789",
    "name": "my-awesome-repo",
    "fullName": "octocat/my-awesome-repo",
    "description": "...",
    "stats": {
      "stars": 145,
      "forks": 23,
      "openIssues": 5
    }
  }
}
```

---

### 🎯 Workflow 3: Board Provider Testing

**Goal:** Test Jira/Trello board endpoints

#### Get Jira OAuth URL
```
GET {{base_url}}/api/boards/{{jira_provider}}/oauth
```

Response:
```json
{
  "loginUrl": "https://auth.atlassian.com/authorize?...",
  "state": "abc123",
  "provider": "jira"
}
```

#### List Boards
```
GET {{base_url}}/api/boards/{{jira_provider}}/boards
```

Expected Response:
```json
{
  "boards": [
    {
      "id": "10001",
      "name": "Project Alpha",
      "key": "PROJ",
      "type": "software"
    }
  ]
}
```

#### Create Issue
```http
POST {{base_url}}/api/boards/{{jira_provider}}/issues/{{test_board_id}}/create
Content-Type: application/json

{
  "summary": "Test issue from ApiDog",
  "description": "This is a test issue",
  "issueType": "Bug",
  "priority": "High",
  "assignee": "user@example.com"
}
```

---

### 🪝 Workflow 4: Webhook Management

**Goal:** Test webhook endpoints

#### List Webhooks
```
GET {{base_url}}/api/git/{{github_provider}}/webhooks?owner={{test_repo_owner}}&slug={{test_repo_slug}}
```

#### Create Webhook
```http
POST {{base_url}}/api/git/{{github_provider}}/webhooks
Content-Type: application/json

{
  "owner": "{{test_repo_owner}}",
  "slug": "{{test_repo_slug}}",
  "url": "https://webhook.example.com/github",
  "events": ["push", "pull_request", "issues"],
  "active": true
}
```

Expected Response:
```json
{
  "id": "12345",
  "url": "https://webhook.example.com/github",
  "events": ["push", "pull_request", "issues"],
  "active": true,
  "createdAt": "2026-02-28T10:30:00Z"
}
```

#### Delete Webhook
```
DELETE {{base_url}}/api/git/{{github_provider}}/webhooks/{{webhook_id}}?owner={{test_repo_owner}}&slug={{test_repo_slug}}
```

---

## Cookie & Token Management

### Automatic Cookie Handling (Recommended)

ApiDog automatically handles cookies across requests in the same session:

1. After OAuth authorization, cookie is set
2. ApiDog includes it in subsequent requests
3. You can see it in **"Response Headers"** → `Set-Cookie`

### Manual Cookie Injection

If you need to manually set a cookie:

#### Option 1: Via Request Headers

In any request, add:
```
Cookie: git_provider_token_github=YOUR_TOKEN_VALUE
```

#### Option 2: Via ApiDog Cookie Manager

1. Click **Settings** ⚙️
2. Go to **"Cookies"**
3. Click **"+ Add Cookie"**
4. Fill in:
   - **Domain:** `localhost`
   - **Path:** `/`
   - **Name:** `git_provider_token_github`
   - **Value:** `YOUR_TOKEN_VALUE`
   - **Secure:** OFF (for localhost)
   - **HttpOnly:** ON
   - **SameSite:** Lax

### Token Storage

**For Testing with Developer Tools:**

1. Open Browser DevTools: `F12`
2. Go to **"Application"** tab
3. **"Cookies"** → Select `localhost:3000`
4. Find cookies starting with:
   - `git_provider_token_*` (Git providers)
   - `board_provider_token_*` (Board providers)
5. Copy the value
6. Use in ApiDog as shown above

---

## Testing Common Scenarios

### ✅ Test 1: Verify Rate Limiting

Send multiple requests rapidly to test rate limit headers:

```
GET {{base_url}}/api/git/{{github_provider}}/repositories
```

Check response headers for:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1645018500
```

### ✅ Test 2: Error Handling (401 Unauthorized)

Send request WITHOUT authentication:

```
GET {{base_url}}/api/git/{{github_provider}}/repositories
```

Expected Response (401):
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED",
  "message": "Authentication required. Please authorize with the provider."
}
```

### ✅ Test 3: Error Handling (404 Not Found)

Request non-existent repository:

```
GET {{base_url}}/api/git/{{github_provider}}/repositories/invalid-owner/invalid-repo
```

Expected Response (404):
```json
{
  "error": "Not Found",
  "code": "REPOSITORY_NOT_FOUND",
  "message": "Repository not found"
}
```

### ✅ Test 4: Pagination

Test pagination parameters:

```
GET {{base_url}}/api/git/{{github_provider}}/repositories?page=2&perPage=10
```

Expected: Second page with 10 items per page

### ✅ Test 5: Sorting

Test sorting options:

```
GET {{base_url}}/api/git/{{github_provider}}/repositories?sort=stars&direction=desc
```

Expected: Repositories sorted by stars in descending order

---

## Debugging Tips

### 1. View Request/Response Flow

In ApiDog:
- Click a completed request
- **"Response"** tab shows status, headers, body
- **"Request"** tab shows what was sent
- **"Timeline"** shows request duration

### 2. Enable Request Logging

On server side, check console output:

```bash
# Terminal where you ran `npm run dev`
GET /api/git/github/repositories 200 45ms
POST /api/boards/jira/issues/create 201 120ms
```

### 3. Inspect Cookies

ApiDog shows cookies in:
- **"Request"** tab → Scroll down to see Cookie header
- **"Response"** tab → `Set-Cookie` header

Browser DevTools (F12):
- **"Application"** tab → **"Cookies"** → `localhost:3000`

### 4. Check Response Status Codes

Expected codes by operation:
- `200 OK` - Successful GET/update
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid auth
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `429 Too Many Requests` - Rate limited
- `500 Internal Server Error` - Server error

---

## Common Issues & Solutions

### ❌ Issue 1: "Cannot GET /api/..." (404)

**Problem:** Endpoint returns 404

**Solutions:**
- ✅ Verify endpoint path is spelled correctly
- ✅ Check provider name is lowercase: `github`, `jira`
- ✅ Ensure `base_url` environment variable is set
- ✅ Confirm API server is running: `curl http://localhost:3000/`

---

### ❌ Issue 2: "Unauthorized" or "Missing Auth"

**Problem:** 401 Unauthorized response

**Solutions:**
- ✅ Complete OAuth flow first (follow Workflow 1)
- ✅ Verify cookie is set in browser DevTools
- ✅ Check cookie in ApiDog request headers
- ✅ Ensure request includes `Cookie` or `Authorization` header
- ✅ Verify token hasn't expired

---

### ❌ Issue 3: CORS Errors in Browser

**Problem:** "Access to XMLHttpRequest blocked by CORS policy"

**Solutions:**
- ✅ This is expected in browser; ApiDog doesn't have CORS issues
- ✅ Use ApiDog instead of browser for API testing
- ✅ Or configure CORS in API (already done in production)

---

### ❌ Issue 4: Cookies Not Being Set

**Problem:** Subsequent requests don't include auth cookie

**Solutions:**
- ✅ Check if cookie domain matches: Should be `localhost`
- ✅ Verify "Secure" flag is OFF for localhost
- ✅ Ensure "HttpOnly" is ON
- ✅ Look for `Set-Cookie` in response headers
- ✅ Try manually adding cookie via ApiDog Cookie Manager

---

### ❌ Issue 5: Request Timeout

**Problem:** Requests take too long or timeout

**Solutions:**
- ✅ Increase ApiDog timeout: Settings → Request (default 30s)
- ✅ Check server logs for errors
- ✅ Verify network connectivity
- ✅ Try simpler request first (e.g., `GET /api/health`)
- ✅ Restart API server: `npm run dev`

---

### ❌ Issue 6: "Invalid State Token" in OAuth

**Problem:** OAuth callback fails with state validation error

**Solutions:**
- ✅ State tokens expire after 10 minutes; try again
- ✅ Don't reuse the same OAuth URL; get a fresh one
- ✅ Ensure you're using the exact `state` from the OAuth URL
- ✅ Check browser cookies for state token

---

## Quick Reference: Essential Requests

### Health Check
```
GET {{base_url}}/api/health
```

### GitHub OAuth Flow
```
GET {{base_url}}/api/git/github/oauth
→ Browser authorize
→ Check cookies
```

### List GitHub Repos
```
GET {{base_url}}/api/git/github/repositories?page=1&perPage=20
```

### List Jira Boards
```
GET {{base_url}}/api/boards/jira/boards
```

### Create Jira Issue
```
POST {{base_url}}/api/boards/jira/issues/{{board_id}}/create
Content-Type: application/json
{
  "summary": "Test Issue",
  "description": "Description",
  "issueType": "Bug"
}
```

### Create GitHub Webhook
```
POST {{base_url}}/api/git/github/webhooks
Content-Type: application/json
{
  "owner": "octocat",
  "slug": "my-repo",
  "url": "https://webhook.site/abc123",
  "events": ["push", "pull_request"]
}
```

---

## Next Steps

1. ✅ **Set up environment** using this guide
2. ✅ **Complete OAuth flow** for at least one provider
3. ✅ **Test basic endpoints** (list repos, boards)
4. ✅ **Run all workflows** sequentially
5. ✅ **Document any issues** in project
6. ✅ **Share collection** with team (Export → OpenAPI)

For additional help, see:
- [API_DOCS.md](API_DOCS.md) - Complete API reference
- [GITHUB_OAUTH_SETUP.md](GITHUB_OAUTH_SETUP.md) - OAuth configuration
- [ApiDog Documentation](https://docs.apidog.com/)
