import React, { useState, useRef } from "react";

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
  const eventSourceRef = useRef<EventSource | null>(null);

  const startSearch = (category: string) => {
    setItems([]);
    setLoading(true);
    setStatus("Starting search...");

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(
      `${BACKEND_URL}/search_stream?category=${category}`
    );

    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.finished) {
          setLoading(false);
          setStatus("Search completed");
          es.close();
          return;
        }

        if (data.item) {
          setItems((prev) => {
            const updated = [...prev, data.item];

            updated.sort(
              (a, b) =>
                b.money_saved + b.discount - (a.money_saved + a.discount)
            );

            return updated.slice(0, 5);
          });

          setStatus("Finding best glitch prices...");
        }
      } catch (e) {
        console.error("Error parsing SSE", e);
      }
    };

    es.onerror = () => {
      setLoading(false);
      setStatus("Connection closed or error");
      es.close();
    };
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f6f9",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center", color: "#333" }}>
        🔥 Glitch Price Finder
      </h1>

      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <button
          onClick={() => startSearch("general")}
          style={buttonStyle}
        >
          General
        </button>
        <button
          onClick={() => startSearch("tech")}
          style={buttonStyle}
        >
          Tech
        </button>
        <button
          onClick={() => startSearch("nearfree")}
          style={buttonStyle}
        >
          Near Free
        </button>
        <button
          onClick={() => startSearch("forher")}
          style={buttonStyle}
        >
          For Her
        </button>
      </div>

      <p style={{ textAlign: "center", color: "#666" }}>{status}</p>

      {loading && (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div className="loader" />
        </div>
      )}

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "grid",
          gap: 20,
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              background: "#e8f8f1",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              border: "2px solid #2ecc71",
              animation: "fadeIn 0.5s ease",
            }}
          >
            <h3 style={{ margin: 0 }}>{item.title}</h3>
            <p style={{ margin: "8px 0" }}>
              💰 {item.price}€{" "}
              {item.old_price > item.price && (
                <span
                  style={{
                    textDecoration: "line-through",
                    marginLeft: 10,
                    color: "#888",
                  }}
                >
                  {item.old_price}€
                </span>
              )}
            </p>

            {item.discount > 0 && (
              <p style={{ color: "#27ae60", fontWeight: "bold" }}>
                🔥 {item.discount}% OFF — Save {item.money_saved}€
              </p>
            )}

            <p style={{ fontSize: 14, color: "#555" }}>
              Website: {item.website}
            </p>

            <a
              href={item.buy_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: 10,
                padding: "10px 20px",
                background: "#2ecc71",
                color: "white",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Buy Now
            </a>
          </div>
        ))}
      </div>

      <style>{`
        .loader {
          border: 6px solid #f3f3f3;
          border-top: 6px solid #9b59b6;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  margin: "0 8px",
  padding: "10px 16px",
  background: "#9b59b6",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};
