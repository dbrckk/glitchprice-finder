import React, { useState, useEffect } from "react";
import "./styles/index.css";

type Item = {
  title: string;
  price: number;
  old_price: number;
  discount: number;
  coupon: number | null;
  cashback: number | null;
  money_saved: number;
  score: number;
  website: string;
  buy_link: string;
  available?: boolean;
};

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = useState("general");
  const [progress, setProgress] = useState({ keyword: "", count: 0, finished: false });

  const startSearch = (selectedCategory: string) => {
    setItems([]);
    setProgress({ keyword: "", count: 0, finished: false });
    const eventSource = new EventSource(
      `https://glitch-price-backend.onrender.com/search_stream?category=${selectedCategory}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.item) {
        setItems((prev) => {
          const newItems = [...prev, data.item];
          return newItems.slice(0, 5);
        });
        setProgress({ keyword: data.keyword, count: data.progress, finished: false });
      }

      if (data.finished) {
        setProgress((prev) => ({ ...prev, finished: true }));
        eventSource.close();
      }
    };
  };

  useEffect(() => {
    startSearch(category);
  }, [category]);

  return (
    <div className="app-container">
      <h1>Glitch Price Finder</h1>

      {/* Category selection */}
      <div className="category-selector">
        {["general", "tech", "nearfree", "forher"].map((cat) => (
          <button
            key={cat}
            className={cat === category ? "selected" : ""}
            onClick={() => setCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-info">
          {progress.finished
            ? "Search Complete!"
            : `Searching "${progress.keyword}" (${progress.count}/5)`}
        </div>
        <div className="progress-line" style={{ width: `${(progress.count / 5) * 100}%` }}></div>
      </div>

      {/* Items List */}
      <div className="items-list">
        {items.map((item, idx) => (
          <div key={idx} className={`item-card ${item.available ? "available" : "verifying"}`}>
            <a href={item.buy_link} target="_blank" rel="noopener noreferrer">
              <h2>{item.title}</h2>
            </a>
            <div className="price-info">
              <span className="price">€{item.price}</span>
              {item.old_price && <span className="old-price">€{item.old_price}</span>}
            </div>
            <div className="discount-info">
              Discount: {item.discount}% | Saved: €{item.money_saved}
            </div>
            {item.coupon && <div className="coupon">Coupon: {item.coupon}%</div>}
            {item.cashback && <div className="cashback">Cashback: €{item.cashback}</div>}
            <div className="website">{item.website}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
