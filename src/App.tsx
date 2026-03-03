import React, { useState, useRef } from "react";

const API_URL = "https://deal-finder-backend-y9wb.onrender.com";

interface ScanResult {
  url: string;
  status: number | string;
  title: string;
}

function App() {
  const [websitesInput, setWebsitesInput] = useState("");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const startScan = async () => {
    const websites = websitesInput
      .split("\n")
      .map((w) => w.trim())
      .filter((w) => w !== "");

    if (websites.length === 0) {
      alert("Please enter at least one website.");
      return;
    }

    setResults([]);
    setProgress(0);
    setStatus("Starting...");

    try {
      const response = await fetch(`${API_URL}/start-scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ websites }),
      });

      const data = await response.json();

      if (!data.job_id) {
        alert("Failed to start scan.");
        return;
      }

      const jobId = data.job_id;

      // Poll every 3 seconds
      pollingRef.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${API_URL}/status/${jobId}`
          );

          const statusData = await statusResponse.json();

          if (statusData.error) {
            setStatus("Error");
            clearInterval(pollingRef.current!);
            return;
          }

          setProgress(statusData.progress);
          setResults(statusData.results);
          setStatus(statusData.status);

          if (statusData.status === "finished") {
            clearInterval(pollingRef.current!);
            setStatus("Finished ✅");
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);

    } catch (error) {
      console.error(error);
      alert("Error connecting to backend.");
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Deal Finder Scanner</h1>

      <textarea
        rows={10}
        style={{ width: "100%", marginBottom: 20 }}
        placeholder="Enter one website per line"
        value={websitesInput}
        onChange={(e) => setWebsitesInput(e.target.value)}
      />

      <button onClick={startScan} style={{ padding: 10, fontSize: 16 }}>
        Start Scan
      </button>

      <h2>Status: {status}</h2>

      <div
        style={{
          width: "100%",
          backgroundColor: "#eee",
          height: 20,
          marginTop: 10,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            backgroundColor: "green",
            height: "100%",
          }}
        />
      </div>

      <p>{progress}%</p>

      <h2>Results</h2>

      <ul>
        {results.map((result, index) => (
          <li key={index}>
            <strong>{result.url}</strong> — {result.status} — {result.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
