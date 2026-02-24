// src/App.tsx
import { useState, useMemo } from "react";
import { useGlitchItems } from "./hooks/useGlitchItems";

export default function App() {
  const { state, scanItems, verifySingleItem } = useGlitchItems();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredItems = useMemo(() => {
    return selectedCategory === "all"
      ? state.items
      : state.items.filter((i) => i.category === selectedCategory);
  }, [state.items, selectedCategory]);

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">GlitchPrice Finder</h1>

      {/* Category selector */}
      <div className="flex gap-3 mb-6">
        {["all", "perfume", "electronics", "fashion"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded ${
              selectedCategory === cat
                ? "bg-black text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Scan button */}
      <button
        onClick={() => scanItems(selectedCategory)}
        disabled={state.loading}
        className="bg-black text-white px-6 py-3 rounded mb-4"
      >
        {state.loading ? "Scan en cours..." : "Lancer le Scan"}
      </button>

      {/* Error */}
      {state.error && <p className="text-red-500 mb-4">{state.error}</p>}

      {/* Last update */}
      {state.lastUpdated && (
        <p className="text-sm text-gray-500 mb-4">
          Dernier scan: {state.lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {/* Items grid */}
      <div className="grid gap-6">
        {filteredItems.length === 0 && !state.loading && (
          <p className="text-gray-500">Aucun glitch trouvé pour cette catégorie.</p>
        )}

        {filteredItems.map((item) => (
          <div
            key={item.url}
            className="border rounded p-4 bg-white shadow-sm"
          >
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p className="text-gray-600">{item.description}</p>
            <p className="font-bold text-green-600 mt-1">-{item.savingsPercentage}%</p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => verifySingleItem(item.url)}
                disabled={item.verificationStatus === "loading"}
                className={`px-3 py-1 rounded text-sm ${
                  item.verificationStatus === "available"
                    ? "bg-green-600 text-white"
                    : item.verificationStatus === "loading"
                    ? "bg-yellow-400 text-white animate-pulse"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {item.verificationStatus === "loading"
                  ? "Vérification..."
                  : item.verificationStatus === "available"
                  ? "Confirmé"
                  : "Vérifier"}
              </button>

              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
              >
                Acheter
              </a>
            </div>

            {item.verificationReason && (
              <p className="text-red-500 text-xs mt-1">
                {item.verificationReason}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
