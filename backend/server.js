import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import Puter from "puter-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize Puter instance (only used when not in demo mode)
const puter = new Puter();

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
    mode: "demo",
    title: title || undefined,
    description: description || undefined,
    summary,
    findings
  };
}


app.post("/api/review", async (req, res) => {
  try {
    const { title, description, codeSnippet, userPrompt } = req.body;

    const demoMode = String(process.env.DEMO_MODE || "").toLowerCase() === "true";

    // Use codeSnippet as codeChanges
    const codeChanges = codeSnippet;

    if (demoMode) {
      const review = heuristicDemoReview({ title, description, codeSnippet: codeChanges });
      return res.json({ review });
    }

    let finalPrompt = userPrompt
      ? userPrompt
      : `You are a senior code reviewer. Review the following code changes or PR diff and provide:\r\n        - Code quality feedback\r\n        - Potential bugs or improvements\r\n        - Suggested best practices\r\n        ${title ? `Title: ${title}` : ''}\r\n        ${description ? `Description: ${description}` : ''}\r\n        Code changes:\r\n        ${codeChanges}\r\n      `;

    const response = await puter.ai.chat(finalPrompt, {
      model: "gpt-5-nano", // free model
    });
    console.log("AI Review Response:", response);
    res.json({ review: response });
  } catch (error) {
    console.error("AI Review Error:", error);
    res.status(500).json({
      error: "Something went wrong while generating review feedback.",
      details: error.message,
    });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
