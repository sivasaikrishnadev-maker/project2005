# AI Interview Prep Assistant — API Reference

Base URL: `http://localhost:5000/api`

All protected routes require:
```
Authorization: Bearer <jwt_token>
```

---

## Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | No | Register a new user |
| POST | `/auth/login` | No | Login and receive JWT |
| GET | `/auth/me` | Yes | Get current user |

### POST /auth/signup
```json
Body:    { "name": "string", "email": "string", "password": "string" }
Returns: { "success": true, "token": "jwt", "user": { "id", "name", "email" } }
```

### POST /auth/login
```json
Body:    { "email": "string", "password": "string" }
Returns: { "success": true, "token": "jwt", "user": { "id", "name", "email" } }
```

---

## Resume

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/resume` | Yes | Upload resume (multipart/form-data, field: `resume`) |
| GET | `/resume` | Yes | List all resumes for current user |
| GET | `/resume/:id` | Yes | Get single resume with rawText + sections |
| DELETE | `/resume/:id` | Yes | Delete a resume |

### POST /resume
```
Content-Type: multipart/form-data
Field: resume (file — PDF, DOCX, DOC, TXT, max 5MB)
Returns: { "success": true, "resume": { "id", "originalName", "fileType", "parseStatus", "sections": ["skills","experience",...], "charCount" } }
```

---

## Skills

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/skills/extract/:resumeId` | Yes | Run NLP extraction on a parsed resume |
| GET | `/skills/:resumeId` | Yes | Get existing skill profile |

### POST /skills/extract/:resumeId
```json
Returns: { "success": true, "profile": { "id", "languages": [...], "frontend": [...], "backend": [...], "databases": [...], "cloud": [...], "tools": [...], "aiml": [...], "allSkills": [...], "totalSkillsFound": 29 } }
```
Each skill entry: `{ "name": "react", "source": "skills_section|description|both", "confidence": 1.0 }`

---

## Roles

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/roles/suggest/:resumeId` | Yes | Get top 5 role suggestions with scores |
| POST | `/roles/select` | Yes | Select a role and create an InterviewSession |

### POST /roles/select
```json
Body:    { "resumeId": "id", "skillProfileId": "id", "selectedRole": "fullstack_developer", "suggestedRoles": ["fullstack_developer","frontend_developer"] }
Returns: { "success": true, "session": { InterviewSession } }
```

---

## Questions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/questions/seed` | Yes | Seed question bank from JSON files (run once) |
| POST | `/questions/generate` | Yes | Generate personalised question set for a session |
| GET | `/questions/session/:sessionId` | Yes | Get all questions for a session |
| GET | `/questions/bank` | Yes | Browse question bank (query: type, skill, role, difficulty) |

### POST /questions/generate
```json
Body:    { "sessionId": "id", "resumeId": "id" }
Returns: { "success": true, "sessionId": "id", "totalQuestions": 15, "questions": [...] }
```

---

## Sessions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/sessions` | Yes | List all sessions for current user |
| GET | `/sessions/:id` | Yes | Get session with populated questions |
| PATCH | `/sessions/:id/complete` | Yes | Mark session as completed |

---

## Answers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/answers/submit` | Yes | Submit and evaluate an answer |
| GET | `/answers/session/:sessionId` | Yes | Get all answers for a session |
| GET | `/answers/:id` | Yes | Get single answer detail |

### POST /answers/submit
```json
Body:    { "sessionId": "id", "questionId": "id", "answerText": "string" }
Returns: { "success": true, "answer": { "score": 7.5, "keywordsMatched": [...], "rubricCovered": [...], "strengths": [...], "weaknesses": [...], "recommendations": [...] } }
```

---

## Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/analytics/generate` | Yes | Compute and save analytics after session |
| GET | `/analytics/me` | Yes | Get latest analytics for current user |
| GET | `/analytics/session/:sessionId` | Yes | Get analytics for a specific session |

### POST /analytics/generate
```json
Body:    { "sessionId": "id", "resumeId": "id" }
Returns: { "success": true, "analytics": { "readinessScore": 72, "skillGaps": [...], "companyReadiness": [...], "roadmap": [...], "heatmap": [...], "performanceTrend": [...] } }
```

---

## Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Server health check |
