import { useState, useMemo } from "react";
import { useGlitchItems } from "./hooks/useGlitchItems";
import { fetchGlitches, verifyItem, GlitchItem } from "./api/glitchApi";

export default function App() {
  const { state, setItems, updateItem, setLoading, setError, setLastUpdated } =
    useGlitchItems();
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch glitches from backend
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

  // Verify a single item
  const handleVerify = async (item: GlitchItem & { verificationStatus?: string }) => {
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

  // Filter items by category
  const filteredItems = useMemo(() => {
    return selectedCategory === "all"
      ? state.items
      : state.items.filter((i) => i.category === selectedCategory);
  }, [state.items, selectedCategory]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">GlitchPrice Finder</h1>

      <div className="mb-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="all">All Categories</option>
          <option value="perfume">Perfume</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
        </select>
      </div>

      <button
        onClick={handleScan}
        disabled={state.loading}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {state.loading ? "Scan..." : "Lancer le Scan"}
      </button>

      {state.error && <p className="text-red-500 mt-4">{state.error}</p>}

      <div className="mt-6 space-y-4">
        {filteredItems.map((item) => (
          <div key={item.url} className="border p-4 rounded">
            <h3 className="font-bold">{item.name}</h3>
            <p>{item.description}</p>
            <p>-{item.savingsPercentage}%</p>

            <button
              onClick={() => handleVerify(item)}
              className="mt-2 bg-gray-200 px-3 py-1 rounded"
            >
              {item.verificationStatus === "loading"
                ? "Vérification..."
                : "Vérifier"}
            </button>

            {item.verificationStatus && item.verificationStatus !== "idle" && (
              <p className="mt-1 text-sm">
                Statut: {item.verificationStatus}{" "}
                {item.verificationReason && `(${item.verificationReason})`}
              </p>
            )}

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-blue-500"
            >
              Acheter
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
