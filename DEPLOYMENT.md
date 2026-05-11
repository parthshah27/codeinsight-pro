# Deployment

The recommended showcase deployment is one Render web service. Render builds the React app, starts the Express API, and Express serves the frontend from the same public URL.

## Render Blueprint

1. Push this repo to GitHub.
2. In Render, choose **New +** -> **Blueprint**.
3. Select this repository.
4. Render will read `render.yaml`.
5. Deploy the `codeinsight-pro` service.

The included `render.yaml` uses:

```yaml
AI_PROVIDER=mock
```

That is intentional for a public portfolio demo. It does not need OpenAI, Anthropic, Ollama, billing, or API keys.

## Will Ollama Work When Hosted?

Not by default. `http://localhost:11434` on Render means "inside the Render server", not your laptop.

Use:

- `AI_PROVIDER=mock` for the public hosted demo.
- `AI_PROVIDER=ollama` only for local development, or for a server where Ollama is installed and reachable by the backend.
- `AI_PROVIDER=openai` only if you add `OPENAI_API_KEY` in the host's environment variables.

## Manual Render Settings

If you do not use the blueprint, create a Web Service with:

```bash
Build Command:
cd frontend && npm ci && npm run build && cd ../backend && npm ci

Start Command:
cd backend && npm start
```

Environment variables:

```bash
NODE_VERSION=20
AI_PROVIDER=mock
```

After deployment, open:

```txt
https://your-render-service.onrender.com
```

Health check:

```txt
https://your-render-service.onrender.com/api/health
```
