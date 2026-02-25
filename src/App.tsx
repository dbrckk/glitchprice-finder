import { useState, useMemo } from "react";
import { useGlitchItems } from "./hooks/useGlitchItems";
import { fetchGlitches, verifyItem, GlitchItem } from "./api/glitchApi";

export default function App() {
  const { state, setItems, updateItem, setLoading, setError, setLastUpdated } =
    useGlitchItems();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const handleScan = async () => {
    setLoading(true);
    setError("");
    try {
      const results: GlitchItem[] = await fetchGlitches(selectedCategory);
      const itemsWithStatus = results.map((item) => ({
        ...item,
        verificationStatus: "idle",
      }));
      setItems(itemsWithStatus);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Erreur lors du scan.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (item: GlitchItem) => {
    updateItem(item.url, { verificationStatus: "loading" });
    try {
      const res = await verifyItem(item.url);
      updateItem(item.url, {
        verificationStatus: res.status,
        verificationReason: res.reason,
      });
    } catch {
      updateItem(item.url, {
        verificationStatus: "unavailable",
        verificationReason: "Erreur vérification",
      });
    }
  };

  const filteredItems = useMemo(() => {
    return selectedCategory === "all"
      ? state.items
      : state.items.filter((i) => i.category === selectedCategory);
  }, [state.items, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">GlitchPrice Finder</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-100 px-3 py-2 rounded"
        >
          <option value="all">All Categories</option>
          <option value="perfume">Perfume</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
        </select>

        <button
          onClick={handleScan}
          disabled={state.loading}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
        >
          {state.loading ? "Scanning..." : "Lancer le Scan"}
        </button>
      </div>

      {state.error && (
        <p className="text-red-500 mb-4 text-center">{state.error}</p>
      )}

      {state.lastUpdated && (
        <p className="text-gray-400 mb-4 text-sm text-center">
          Last updated: {state.lastUpdated.toLocaleTimeString()}
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {filteredItems.length === 0 && !state.loading && (
          <p className="text-gray-400 col-span-full text-center">
            No items found.
          </p>
        )}

        {filteredItems.map((item) => (
          <div
            key={item.url}
            className="bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
          >
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p className="text-gray-300 mt-1">{item.description}</p>
            <p className="text-green-400 font-semibold mt-1">
              -{item.savingsPercentage}%
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => handleVerify(item)}
                className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
              >
                {item.verificationStatus === "loading"
                  ? "Vérification..."
                  : "Vérifier"}
              </button>

              {item.verificationStatus === "verified" && (
                <span className="text-green-400 text-sm font-semibold">✅ Vérifié</span>
              )}
              {item.verificationStatus === "unavailable" && (
                <span className="text-red-500 text-sm font-semibold">
                  ❌ Indisponible
                </span>
              )}
            </div>

            {item.verificationReason && (
              <p className="text-gray-400 text-xs mt-1">
                {item.verificationReason}
              </p>
            )}

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-blue-400 hover:underline text-sm"
            >
              Acheter
            </a>
          </div>
        ))}
      </div>
    </div>
  );
                  }
