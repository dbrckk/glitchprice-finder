import { useState, useMemo } from "react";
import { useGlitchItems } from "./hooks/useGlitchItems";
import { fetchGlitches, verifyItem } from "./api/glitchApi";

const API_URL = "https://deal-finder-backend-y9wb.onrender.com";

export default function App() {
  const { state, setItems, updateItem, setLoading, setError, setLastUpdated } = useGlitchItems();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const handleScan = async () => {
    setLoading(true);
    setError("");
    try {
      const results = await fetchGlitches(selectedCategory);
      const itemsWithStatus = results.map((item: any) => ({
        ...item,
        verificationStatus: "idle",
      }));
      setItems(itemsWithStatus);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError("Erreur lors du scan.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (item: any) => {
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
      : state.items.filter(i => i.category === selectedCategory);
  }, [state.items, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">GlitchPrice Finder</h1>

      <div className="flex justify-center mb-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border px-3 py-2 rounded mr-2"
        >
          <option value="all">All Categories</option>
          <option value="perfume">Perfume</option>
          <option value="electronics">Electronics</option>
          <option value="fashion">Fashion</option>
        </select>

        <button
          onClick={handleScan}
          disabled={state.loading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {state.loading ? "Scanning..." : "Scan"}
        </button>
      </div>

      {state.error && (
        <p className="text-red-500 text-center mb-4">{state.error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.url} className="bg-white shadow-md rounded p-4">
            <h3 className="font-bold text-lg mb-1">{item.name}</h3>
            <p className="text-sm text-gray-600 mb-1">{item.description}</p>
            <p className="text-red-500 font-semibold mb-2">-{item.savingsPercentage}%</p>

            <div className="flex gap-2">
              <button
                onClick={() => handleVerify(item)}
                className="bg-gray-200 px-3 py-1 rounded text-sm"
              >
                {item.verificationStatus === "loading" ? "Checking..." : "Verify"}
              </button>

              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 text-sm underline"
              >
                Buy
              </a>
            </div>

            {item.verificationStatus && item.verificationStatus !== "idle" && (
              <p className="text-xs mt-1 text-gray-500">
                Status: {item.verificationStatus}
                {item.verificationReason ? ` (${item.verificationReason})` : ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
