import { useState, useMemo } from "react";

const BASE_URL = "https://deal-finder-backend-y9wb.onrender.com";

type GlitchItem = {
  name: string;
  description: string;
  savingsPercentage: number;
  url: string;
  category: string;
  verificationStatus?: "idle" | "loading" | "available" | "unavailable";
  verificationReason?: string;
};

export default function App() {
  const [items, setItems] = useState<GlitchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("perfume");

  // =========================
  // SCAN (LLM → backend)
  // =========================
  const handleScan = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${BASE_URL}/generate-keywords`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: selectedCategory,
        }),
      });

      if (!response.ok) {
        throw new Error("Backend error");
      }

      const data = await response.json();

      const itemsWithStatus: GlitchItem[] =
        data.generated_keywords?.map((keyword: string, index: number) => ({
          name: keyword,
          description: "Produit détecté par IA",
          savingsPercentage: Math.floor(Math.random() * 70) + 10,
          url: `https://example.com/product-${index}`,
          category: selectedCategory,
          verificationStatus: "idle",
        })) || [];

      setItems(itemsWithStatus);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Erreur lors du scan.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // VERIFY ITEM
  // =========================
  const handleVerify = async (item: GlitchItem) => {
    setItems(prev =>
      prev.map(i =>
        i.url === item.url
          ? { ...i, verificationStatus: "loading" }
          : i
      )
    );

    try {
      const response = await fetch(`${BASE_URL}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: item.url,
        }),
      });

      if (!response.ok) {
        throw new Error("Verification error");
      }

      const data = await response.json();

      setItems(prev =>
        prev.map(i =>
          i.url === item.url
            ? {
                ...i,
                verificationStatus: data.status,
                verificationReason: data.reason,
              }
            : i
        )
      );
    } catch {
      setItems(prev =>
        prev.map(i =>
          i.url === item.url
            ? {
                ...i,
                verificationStatus: "unavailable",
                verificationReason: "Erreur vérification",
              }
            : i
        )
      );
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(i => i.category === selectedCategory);
  }, [items, selectedCategory]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        GlitchPrice Finder
      </h1>

      {/* Category Selector */}
      <div className="mb-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="perfume">Perfume</option>
          <option value="jewelry">Jewelry</option>
        </select>
      </div>

      {/* Scan Button */}
      <button
        onClick={handleScan}
        disabled={loading}
        className="bg-black text-white px-5 py-2 rounded"
      >
        {loading ? "Scan..." : "Lancer le Scan"}
      </button>

      {error && (
        <p className="text-red-500 mt-4">{error}</p>
      )}

      {lastUpdated && (
        <p className="text-gray-400 text-sm mt-2">
          Dernier scan : {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {/* Results */}
      <div className="mt-6 space-y-4">
        {filteredItems.map((item) => (
          <div
            key={item.url}
            className="border p-4 rounded shadow-sm"
          >
            <h3 className="font-bold text-lg">
              {item.name}
            </h3>

            <p className="text-sm text-gray-600">
              {item.description}
            </p>

            <p className="text-green-600 font-bold mt-2">
              -{item.savingsPercentage}%
            </p>

            {/* Verify */}
            <button
              onClick={() => handleVerify(item)}
              className="mt-3 bg-gray-200 px-3 py-1 rounded"
            >
              {item.verificationStatus === "loading"
                ? "Vérification..."
                : "Vérifier"}
            </button>

            {item.verificationStatus === "available" && (
              <p className="text-green-600 text-sm mt-2">
                Disponible
              </p>
            )}

            {item.verificationStatus === "unavailable" && (
              <p className="text-red-500 text-sm mt-2">
                {item.verificationReason}
              </p>
            )}

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-blue-500"
            >
              Acheter
            </a>
          </div>
        ))}
      </div>
    </div>
  );
    }
