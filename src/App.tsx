import { useState, useMemo } from "react";
import { fetchGlitches, verifyItem, GlitchItem } from "./glitchApi";
import { useGlitchItems } from "./hooks/useGlitchItems";

export default function App() {
  const { state, setItems, updateItem, setLoading, setError, setLastUpdated } = useGlitchItems();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const handleScan = async () => {
    setLoading(true);
    setError("");
    try {
      const results = await fetchGlitches(selectedCategory);
      const itemsWithStatus: GlitchItem[] = results.map((item) => ({
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

  const handleVerify = async (item: GlitchItem) => {
    updateItem(item.url, { verificationStatus: "loading" });
    try {
      const res = await verifyItem(item.url);
      updateItem(item.url, {
        verificationStatus: res.status as GlitchItem["verificationStatus"],
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
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">GlitchPrice Finder</h1>

      <div className="mb-4">
        <label className="mr-2 font-semibold">Category:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="all">All</option>
          <option value="perfume">Perfume</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
        </select>
      </div>

      <button
        onClick={handleScan}
        disabled={state.loading}
        className="bg-black text-white px-4 py-2 rounded mb-4"
      >
        {state.loading ? "Scan..." : "Lancer le Scan"}
      </button>

      {state.error && <p className="text-red-500 mb-4">{state.error}</p>}

      <div className="space-y-4">
        {filteredItems.map((item) => (
          <div key={item.url} className="border p-4 rounded shadow">
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p>{item.description}</p>
            <p className="text-green-600 font-semibold">-{item.savingsPercentage}%</p>

            <div className="flex items-center space-x-2 mt-2">
              <button
                onClick={() => handleVerify(item)}
                className="bg-gray-200 px-3 py-1 rounded"
              >
                {item.verificationStatus === "loading"
                  ? "Vérification..."
                  : "Vérifier"}
              </button>

              {item.verificationStatus === "verified" && (
                <span className="text-green-600">✅ Vérifié</span>
              )}
              {item.verificationStatus === "unavailable" && (
                <span className="text-red-600">❌ Indisponible</span>
              )}
            </div>

            <a
              href={item.url}
              target="_blank"
              className="block mt-2 text-blue-500 underline"
            >
              Acheter
            </a>
          </div>
        ))}
      </div>
    </div>
  );
      }
