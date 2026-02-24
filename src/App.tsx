// src/App.tsx
import { useState, useEffect } from "react";
import { fetchGlitches, verifyItem, GlitchItem } from "./api/glitchApi";

export default function App() {
  const [items, setItems] = useState<GlitchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch glitches from backend
  const handleScan = async () => {
    setLoading(true);
    setError("");
    try {
      const results = await fetchGlitches(selectedCategory);
      // Add verificationStatus to each item
      const itemsWithStatus = results.map((item) => ({
        ...item,
        verificationStatus: "idle" as GlitchItem["verificationStatus"],
      }));
      setItems(itemsWithStatus);
    } catch (err) {
      setError("Erreur lors du scan.");
    } finally {
      setLoading(false);
    }
  };

  // Verify a single item
  const handleVerify = async (item: GlitchItem) => {
    // Set item to loading
    setItems((prev) =>
      prev.map((i) =>
        i.url === item.url ? { ...i, verificationStatus: "loading" } : i
      )
    );

    try {
      const res = await verifyItem(item.url);
      setItems((prev) =>
        prev.map((i) =>
          i.url === item.url
            ? { ...i, verificationStatus: res.status, verificationReason: res.reason }
            : i
        )
      );
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i.url === item.url
            ? { ...i, verificationStatus: "unavailable", verificationReason: "Erreur vérification" }
            : i
        )
      );
    }
  };

  // Filtered items by category
  const filteredItems = selectedCategory === "all"
    ? items
    : items.filter((i) => i.category === selectedCategory);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">GlitchPrice Finder</h1>

      {/* Category selector */}
      <div className="mb-4 flex gap-2">
        {["all", "perfume", "electronics", "fashion"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded ${
              selectedCategory === cat ? "bg-black text-white" : "bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Scan button */}
      <button
        onClick={handleScan}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded mb-4"
      >
        {loading ? "Scan..." : "Lancer le Scan"}
      </button>

      {/* Error */}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Results */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <div key={item.url} className="border p-4 rounded shadow-sm">
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p>{item.description}</p>
            <p>-{item.savingsPercentage}%</p>

            {/* Verify button */}
            <button
              onClick={() => handleVerify(item)}
              disabled={item.verificationStatus === "loading"}
              className={`mt-2 px-3 py-1 rounded ${
                item.verificationStatus === "available"
                  ? "bg-green-500 text-white"
                  : item.verificationStatus === "loading"
                  ? "bg-yellow-400 text-black"
                  : "bg-gray-200"
              }`}
            >
              {item.verificationStatus === "loading"
                ? "Vérification..."
                : item.verificationStatus === "available"
                ? "Confirmé en stock"
                : "Vérifier"}
            </button>

            {/* Verification reason */}
            {item.verificationStatus === "unavailable" && (
              <p className="text-red-500 text-sm mt-1">{item.verificationReason}</p>
            )}

            {/* Buy link */}
            <a
              href={item.url}
              target="_blank"
              className="block mt-2 text-blue-500 underline"
            >
              Acheter
            </a>
          </div>
        ))}

        {filteredItems.length === 0 && !loading && (
          <p className="text-gray-500">Aucun glitch trouvé pour cette catégorie.</p>
        )}
      </div>
    </div>
  );
  }
