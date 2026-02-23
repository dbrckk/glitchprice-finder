
import { useState, useMemo } from "react";
import { useGlitchItems } from "./hooks/useGlitchItems";
import { fetchGlitches, verifyItem } from "./api/glitchApi";

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">GlitchPrice Finder</h1>

      <button
        onClick={handleScan}
        disabled={state.loading}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {state.loading ? "Scan..." : "Lancer le Scan"}
      </button>

      {state.error && (
        <p className="text-red-500 mt-4">{state.error}</p>
      )}

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
              Vérifier
            </button>

            <a
              href={item.url}
              target="_blank"
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
