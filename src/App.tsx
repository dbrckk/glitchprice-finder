import React, { useState } from "react";

type Item = {
  title: string;
  price: number;
  old_price: number;
  discount: number;
  money_saved: number;
  website: string;
  buy_link: string;
};

const BACKEND_URL = "https://glitchprice-backend.onrender.com";

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Idle");

  const startScan = async () => {
    setItems([]);
    setLoading(true);
    setStatus("Starting scan...");

    const start = await fetch(`${BACKEND_URL}/start_scan`, {
      method: "POST",
    });

    const data = await start.json();
    const jobId = data.job_id;

    const interval = setInterval(async () => {
      const res = await fetch(`${BACKEND_URL}/scan_status/${jobId}`);
      const result = await res.json();

      setItems(result.items || []);

      if (result.finished) {
        clearInterval(interval);
        setLoading(false);
        setStatus("Scan finished");
      } else {
        setStatus("Scanning websites...");
      }
    }, 3000);
  };

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>🔥 Glitch Price Finder</h1>

      <button onClick={startScan} disabled={loading}>
        {loading ? "Scanning..." : "Start Scan"}
      </button>

      <p>{status}</p>

      {items.map((item, i) => (
        <div key={i} style={{ marginTop: 20, padding: 20, border: "1px solid #ccc" }}>
          <h3>{item.title}</h3>
          <p>{item.price}€</p>
          <p>{item.website}</p>
          <a href={item.buy_link} target="_blank">Buy</a>
        </div>
      ))}
    </div>
  );
}
