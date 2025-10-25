import React, { useState } from "react";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

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
        <div className="result">
          <h3>Review Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
