import { useEffect, useState } from "react";

type Item = {
  title: string;
  price: number;
  old_price: number;
  discount: number;
  money_saved: number;
  website: string;
  buy_link: string;
  available?: boolean;
};

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Idle");
  const [category, setCategory] = useState("general");

  const categories = [
    "general",
    "tech",
    "outfit",
    "jewelry",
    "nearfree",
    "hugesaving",
    "forher",
  ];

  const startSearch = () => {
    setItems([]);
    setProgress(0);
    setStatus("Searching...");

    const evtSource = new EventSource(
      `https://glitchprice-finder-2oxjrj3s6-dbrckks-projects.vercel.app/search_stream?category=${category}`
    );

    evtSource.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.finished) {
        setStatus("Finished");
        evtSource.close();
      } else if (data.item) {
        setItems((prev) => {
          const newItems = [...prev, data.item];
          return newItems.slice(0, 5);
        });
        setProgress(data.progress);
      }
    };

    evtSource.onerror = () => {
      setStatus("Error or Connection Closed");
      evtSource.close();
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <h1 className="text-3xl font-bold mb-4">Glitch Price Finder</h1>

      {/* Category selector */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`px-4 py-2 rounded ${
              cat === category
                ? "bg-purple-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <button
        onClick={startSearch}
        className="mb-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Start Search
      </button>

      <div className="mb-4">
        <p>Status: {status}</p>
        <p>
          Found {items.length} / 5 items {progress > 0 && `- Progress: ${progress}`}
        </p>
      </div>

      {/* Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`p-4 rounded shadow ${
              item.available ? "bg-green-100" : "bg-purple-200 animate-pulse"
            }`}
          >
            <h2 className="font-semibold text-lg">{item.title}</h2>
            <p>
              Price: €{item.price}{" "}
              <span className="line-through text-gray-500">€{item.old_price}</span>
            </p>
            <p>
              Discount: {item.discount}% | Saved: €{item.money_saved}
            </p>
            <p>Website: {item.website}</p>
            <a
              href={item.buy_link}
              target="_blank"
              className="text-blue-600 hover:underline"
            >
              Buy Now
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
