import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import Puter from "puter-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize Puter instance
const puter = new Puter();

app.post("/api/review", async (req, res) => {
  try {
    const { title, description, codeSnippet, userPrompt } = req.body;

    // Use codeSnippet as codeChanges
    const codeChanges = codeSnippet;

    let finalPrompt = userPrompt
      ? userPrompt
      : `You are a senior code reviewer. Review the following code changes or PR diff and provide:
        - Code quality feedback
        - Potential bugs or improvements
        - Suggested best practices
        ${title ? `Title: ${title}` : ''}
        ${description ? `Description: ${description}` : ''}
        Code changes:
        ${codeChanges}
      `;

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
