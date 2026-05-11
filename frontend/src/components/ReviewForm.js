import React, { useState } from "react";
import axios from "axios";

const configuredApiBaseUrl = process.env.REACT_APP_API_BASE_URL || "";
const API_BASE_URL = configuredApiBaseUrl.includes("your-deployed-backend-url")
  ? ""
  : configuredApiBaseUrl;

function ReviewResult({ result }) {
  if (result.error) {
    return (
      <div className="result result-error">
        <h3>Review Result</h3>
        <p>{result.error}</p>
      </div>
    );
  }

  const review = result.review || result;
  const findings = Array.isArray(review.findings) ? review.findings : [];

  return (
    <div className="result">
      <div className="result-header">
        <div>
          <h3>Review Result</h3>
          {review.summary && <p className="result-summary">{review.summary}</p>}
        </div>
        {review.mode && <span className="provider-badge">{review.mode}</span>}
      </div>

      {review.content && <p className="ai-review-text">{review.content}</p>}

      {findings.length > 0 && (
        <div className="findings-list">
          {findings.map((finding, index) => (
            <article className="finding-card" key={`${finding.message}-${index}`}>
              <div className="finding-meta">
                <span className={`severity severity-${finding.severity || "info"}`}>
                  {finding.severity || "info"}
                </span>
                {finding.category && <span className="category">{finding.category}</span>}
              </div>
              <p className="finding-message">{finding.message}</p>
              {finding.suggestion && (
                <p className="finding-suggestion">
                  <strong>Suggestion:</strong> {finding.suggestion}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReviewForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/review`,
        {
          title,
          description,
          codeSnippet: code,
        }
      );
      setResult(response.data);
    } catch (err) {
        console.error(err);
      setResult({ error: "Failed to fetch review. Try again later." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-container">
      <form onSubmit={handleSubmit}>
        <label>Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter PR title or leave blank"
        />

        <label>Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter PR description or notes"
          rows="3"
        />

        <label>Code Changes / Diff</label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code or diff here..."
          rows="10"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Analyzing..." : "Review Code"}
        </button>
      </form>

      {result && (
        <ReviewResult result={result} />
      )}
    </div>
  );
}
