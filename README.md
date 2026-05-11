# CodeInsight Pro

> A secure, enterprise-ready code review assistant that analyzes pull requests and code snippets to provide structured technical feedback on readability, maintainability, performance, and security.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/parthshah27/codeinsight-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/parthshah27/codeinsight-pro/actions)

## Links

- 🔗 [Live Demo](https://codeinsight-pro.onrender.com/)
- 📖 [API Docs](https://codeinsight-pro.onrender.com/api/docs)
- 🧾 [OpenAPI JSON](https://codeinsight-pro.onrender.com/api/openapi.json)
  
![CodeInsight Pro demo](docs/demo.gif)

---

## Why this exists

Code review is one of the highest-leverage activities in software engineering, but reviewers are often time-pressured and inconsistent. CodeInsight Pro acts as a "first-pass reviewer" that catches the obvious issues — security smells, readability problems, missing error handling — so human reviewers can focus on architecture and intent.

It's built with privacy-first defaults: code never leaves your infrastructure unless you explicitly opt in to a managed LLM provider, and all submissions are scrubbed of secrets before analysis.

## Features

- **Snippet analysis** — paste any code block and receive structured feedback across four dimensions: readability, maintainability, performance, security.
- **Pull request analysis** — point it at a GitHub PR URL and get a consolidated review covering all changed files.
- **Severity scoring** — every finding is tagged `critical | major | minor | info` so you can triage at a glance.
- **Secret scanning** — incoming code is scanned for API keys, tokens, and credentials before being sent to any LLM.
- **Pluggable LLM backend** — switch between mock mode, local Ollama, or OpenAI via config.
- **Rate-limited API** — token-bucket limiter prevents abuse and controls LLM cost.

## Architecture

```
┌──────────────┐      ┌─────────────────┐      ┌──────────────┐
│   Client /   │─────▶│  Express API    │─────▶│  Secret      │
│   GitHub PR  │      │  (Node + TS)    │      │  Scanner     │
└──────────────┘      └────────┬────────┘      └──────┬───────┘
                               │                      │
                               ▼                      ▼
                      ┌─────────────────┐    ┌──────────────┐
                      │  Rate Limiter   │    │  LLM Adapter │
                      │  (Redis)        │    │  (OpenAI/etc)│
                      └─────────────────┘    └──────┬───────┘
                                                    │
                                                    ▼
                                           ┌──────────────┐
                                           │  Structured  │
                                           │  Findings    │
                                           └──────────────┘
```

**Key design decisions**

- Stateless API behind a Redis-backed rate limiter so it scales horizontally.
- LLM calls are wrapped in an adapter interface — swapping providers is a one-file change.
- Findings are returned as structured JSON, not free text, so the response is machine-consumable (a future GitHub bot can comment directly on PR lines).

## Tech stack

| Layer       | Technology                          |
| ----------- | ----------------------------------- |
| Runtime     | Node.js 20, TypeScript              |
| Framework   | Express                             |
| LLM         | Mock / Ollama / OpenAI (pluggable)  |
| Cache & rate limit | Redis                        |
| Validation  | Zod                                 |
| Testing     | Jest, Supertest                     |
| Container   | Docker, docker-compose              |
| CI/CD       | GitHub Actions                      |
| Deployment  | Render / Fly.io                     |

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/parthshah27/codeinsight-pro.git
cd codeinsight-pro
npm install

# 2. Configure the backend
cd backend
cp .env.example .env
# Default is AI_PROVIDER=mock, so no API key is required.

# 3. Run with Docker (recommended — brings up Redis too)
docker-compose up

# Or run locally (requires Redis on localhost:6379)
npm run dev
```

Backend starts on `http://localhost:5000`.

## API usage

**Analyze a snippet**

```bash
curl -X POST http://localhost:3000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "language": "javascript",
    "code": "function getUser(id) { return db.query(`SELECT * FROM users WHERE id=${id}`) }"
  }'
```

**Response**

```json
{
  "summary": "1 critical issue, 1 minor issue",
  "findings": [
    {
      "severity": "critical",
      "category": "security",
      "line": 1,
      "message": "SQL injection: user input is interpolated directly into query.",
      "suggestion": "Use parameterized queries: db.query('SELECT * FROM users WHERE id=?', [id])"
    },
    {
      "severity": "minor",
      "category": "maintainability",
      "line": 1,
      "message": "Function lacks input validation and error handling.",
      "suggestion": "Validate that id is a number before querying."
    }
  ]
}
```

Full schema in [`docs/api.md`](docs/api.md) or the live Swagger UI.

## Testing

```bash
npm test               # unit + integration tests
npm run test:coverage  # with coverage report
```

Currently {XX}% line coverage. Coverage thresholds are enforced in CI.


## Deployment

For a public portfolio showcase, deploy the included single Render web service. It builds the React frontend, starts the Express backend, and serves everything from one URL with `AI_PROVIDER=mock`.

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for exact Render steps.

The repo includes a production `Dockerfile` and a GitHub Actions workflow that:

1. Lints and type-checks
2. Runs the test suite
3. Builds and pushes a Docker image to GHCR
4. Triggers a deploy to Render on `main`

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### Provider modes

Set `AI_PROVIDER=mock` in the backend environment to skip LLM calls and return a deterministic heuristic review. This is the recommended public deployment mode when no paid LLM credentials are available.

Set `AI_PROVIDER=ollama` for local development with a local model. Install Ollama, start it with `ollama serve`, pull a model such as `ollama pull deepseek-coder`, then keep:

```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-coder
```

Ollama mode does not use an API key.

Set `AI_PROVIDER=openai` only when you want hosted model calls:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```


## Roadmap

- [ ] GitHub App that posts review comments directly on PR lines
- [ ] VS Code extension for in-editor analysis
- [x] Self-hosted model support (Ollama)
- [ ] Per-repo configuration (severity thresholds, ignored rules)
- [ ] Web dashboard for team-wide trends

## Contributing

Issues and PRs are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

## License

MIT — see [`LICENSE`](LICENSE).

## About the author

Built by [Parth Shah](https://github.com/parthshah27) — backend developer focused on Node.js, AWS, and scalable systems. Open to freelance and full-time opportunities. Reach me at [pshah947795@gmail.com](mailto:pshah947795@gmail.com) or on [LinkedIn](https://linkedin.com/in/parth-r-shah).
