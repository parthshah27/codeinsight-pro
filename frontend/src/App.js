import React from "react";
import ReviewForm from "./components/ReviewForm";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <h1>CodeInsight Pro</h1>
      <p className="subtitle">Automated Code Review Assistant</p>
      <ReviewForm />
    </div>
  );
}

export default App;
