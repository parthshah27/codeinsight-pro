import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const AI_PROVIDER = String(process.env.AI_PROVIDER || "mock").toLowerCase();
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "deepseek-coder";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";


function heuristicDemoReview({ title, description, codeSnippet }) {
  const code = String(codeSnippet || "");
  const findings = [];

  const hasEval = /\beval\b\s*\(/i.test(code);
  const hasSqlConcat = /SELECT\b[\s\S]*\+|INSERT\b[\s\S]*\+|UPDATE\b[\s\S]*\+|DELETE\b[\s\S]*\+|\bFROM\b[\s\S]*\+/i.test(code);
  const hasFetchWithoutCatch = /fetch\(.*\)/i.test(code);
  const hasConsoleLog = /console\.log\s*\(/i.test(code);
  const hasSecretsLike = /(api[_-]?key|secret|token|authorization|bearer)\s*[:=]/i.test(code);
  const hasNoTryCatch = /await[\s\S]*\{[\s\S]*await[\s\S]*\}/i.test(code) && !/try\s*\{/.test(code);

  if (hasEval) {
    findings.push({
      severity: "critical",
      category: "security",
      message: "Use of eval detected. This can lead to code injection vulnerabilities.",
      suggestion: "Avoid eval. Prefer safe parsing or whitelisted interpreters."
    });
  }

  if (hasSqlConcat) {
    findings.push({
      severity: "critical",
      category: "security",
      message: "Potential SQL query construction via concatenation detected.",
      suggestion: "Use parameterized queries/prepared statements instead of concatenating user input."
    });
  }

  if (hasSecretsLike) {
    findings.push({
      severity: "major",
      category: "security",
      message: "Possible credentials/secrets referenced in code.",
      suggestion: "Move secrets to environment variables/secret manager and avoid committing tokens/keys."
    });
  }

  // lightweight heuristic: if fetch is present, but no explicit error handling keywords are found, flag it
  const hasErrorHandling = /(catch\b|throw\b|status\b|ok\b|res\.status\b|reject\b)/i.test(code);
  if (hasFetchWithoutCatch && !hasErrorHandling) {
    findings.push({
      severity: "major",
      category: "reliability",
      message: "Network call may be missing robust error handling.",
      suggestion: "Add try/catch (or .catch) and handle non-2xx responses explicitly."
    });
  }

  if (hasNoTryCatch) {
    findings.push({
      severity: "minor",
      category: "maintainability",
      message: "Async logic appears without explicit try/catch safeguards.",
      suggestion: "Wrap awaited operations with try/catch and return meaningful errors."
    });
  }

  if (hasConsoleLog) {
    findings.push({
      severity: "info",
      category: "maintainability",
      message: "console.log detected; may leak internal state or clutter logs.",
      suggestion: "Use a logger with levels (debug/info/warn) or remove in production."
    });
  }

  if (findings.length === 0) {
    findings.push({
      severity: "minor",
      category: "readability",
      message: "Demo review: no obvious patterns detected in the provided snippet.",
      suggestion: "Provide a larger diff for deeper review (or enable real LLM mode for best results)."
    });
  }

  const counts = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

  const summary = `${counts.critical ? `${counts.critical} critical` : "0 critical"}, ${counts.major ? `${counts.major} major` : "0 major"}, ${counts.minor ? `${counts.minor} minor` : "0 minor"}`;

  return {
    mode: "mock",
    title: title || undefined,
    description: description || undefined,
    summary,
    findings
  };
}

function buildReviewPrompt({ title, description, codeChanges, userPrompt }) {
  if (userPrompt) {
    return userPrompt;
  }

  return `You are a senior code reviewer. Review the following code changes or PR diff and provide:
- Code quality feedback
- Potential bugs or improvements
- Security issues
- Suggested best practices

Return concise, actionable feedback.

${title ? `Title: ${title}` : ""}
${description ? `Description: ${description}` : ""}
Code changes:
${codeChanges}`;
}

async function reviewWithOllama(prompt) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    mode: "ollama",
    provider: "ollama",
    model: OLLAMA_MODEL,
    summary: "AI-generated review from local Ollama model.",
    content: data.response || ""
  };
}

async function reviewWithOpenAI(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    mode: "openai",
    provider: "openai",
    model: OPENAI_MODEL,
    summary: "AI-generated review from OpenAI.",
    content: data.choices?.[0]?.message?.content || ""
  };
}

async function generateReview({ title, description, codeSnippet, userPrompt }) {
  const codeChanges = codeSnippet || "";

  if (AI_PROVIDER === "mock") {
    return heuristicDemoReview({ title, description, codeSnippet: codeChanges });
  }

  const finalPrompt = buildReviewPrompt({ title, description, codeChanges, userPrompt });

  if (AI_PROVIDER === "ollama") {
    return reviewWithOllama(finalPrompt);
  }

  if (AI_PROVIDER === "openai") {
    return reviewWithOpenAI(finalPrompt);
  }

  throw new Error(`Unsupported AI_PROVIDER "${AI_PROVIDER}". Use mock, ollama, or openai.`);
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    provider: AI_PROVIDER,
    ollamaBaseUrl: AI_PROVIDER === "ollama" ? OLLAMA_BASE_URL : undefined,
    model: AI_PROVIDER === "ollama" ? OLLAMA_MODEL : AI_PROVIDER === "openai" ? OPENAI_MODEL : undefined
  });
});

const apiSpec = {
  openapi: "3.0.0",
  info: {
    title: "CodeInsight Pro API",
    version: "1.0.0",
    description: "Code review assistant API with mock, Ollama, and OpenAI provider modes."
  },
  paths: {
    "/api/health": {
      get: {
        summary: "Check API health and active provider",
        responses: {
          200: {
            description: "Current API status"
          }
        }
      }
    },
    "/api/review": {
      post: {
        summary: "Review a code snippet or pull request diff",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["codeSnippet"],
                properties: {
                  title: {
                    type: "string",
                    example: "Fix user lookup"
                  },
                  description: {
                    type: "string",
                    example: "Adds endpoint logic for fetching users."
                  },
                  codeSnippet: {
                    type: "string",
                    example: "function getUser(id) { return db.query(`SELECT * FROM users WHERE id=${id}`) }"
                  },
                  userPrompt: {
                    type: "string",
                    example: "Review this code for security and reliability issues."
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Review feedback"
          },
          500: {
            description: "Review generation failed"
          }
        }
      }
    }
  }
};

app.get("/api/openapi.json", (req, res) => {
  res.json(apiSpec);
});

app.get("/api/docs", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CodeInsight Pro API Docs</title>
    <style>
      body {
        background: #f6f8fa;
        color: #111827;
        font-family: Arial, sans-serif;
        margin: 0;
      }

      main {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        margin: 2rem auto;
        max-width: 920px;
        padding: 2rem;
        width: min(920px, calc(100% - 2rem));
      }

      h1,
      h2 {
        margin-top: 0;
      }

      code,
      pre {
        background: #f3f4f6;
        border-radius: 8px;
        font-family: Consolas, monospace;
      }

      code {
        padding: 0.15rem 0.35rem;
      }

      pre {
        overflow-x: auto;
        padding: 1rem;
      }

      .endpoint {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-top: 1rem;
        padding: 1rem;
      }

      .method {
        color: #1d4ed8;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>CodeInsight Pro API Docs</h1>
      <p>Active provider: <code>${AI_PROVIDER}</code></p>

      <section class="endpoint">
        <h2><span class="method">GET</span> /api/health</h2>
        <p>Returns API status and active provider configuration.</p>
      </section>

      <section class="endpoint">
        <h2><span class="method">POST</span> /api/review</h2>
        <p>Reviews a code snippet or pull request diff.</p>
        <pre><code>curl -X POST ${req.protocol}://${req.get("host")}/api/review \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Fix user lookup",
    "codeSnippet": "function getUser(id) { return db.query(\\\`SELECT * FROM users WHERE id=\\\${id}\\\`) }"
  }'</code></pre>
      </section>

      <section class="endpoint">
        <h2><span class="method">GET</span> /api/openapi.json</h2>
        <p>Returns the machine-readable OpenAPI-style API summary.</p>
      </section>
    </main>
  </body>
</html>`);
});


app.post("/api/review", async (req, res) => {
  try {
    const { title, description, codeSnippet, userPrompt } = req.body;

    const review = await generateReview({ title, description, codeSnippet, userPrompt });
    res.json({ review });
  } catch (error) {
    console.error("AI Review Error:", error);
    res.status(500).json({
      error: "Something went wrong while generating review feedback.",
      details: error.message,
    });
  }
});

const frontendBuildPath = path.resolve(__dirname, "../frontend/build");

if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`AI provider: ${AI_PROVIDER}`);
});
