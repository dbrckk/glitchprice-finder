import { useState, useEffect } from "react";
import { useGlitchItems } from "./hooks/useGlitchItems";
import { GlitchItem, searchGlitchItems, verifyItem } from "./api/glitchApi";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  general: ["montre", "sac", "bague", "chaussures", "bijoux", "perfume", "tech"],
  outfit: ["sac", "chaussures", "vetement"],
  tech: ["smartphone", "laptop", "casque", "montre connectée"],
  jewelry_perfume: ["bague", "collier", "bracelet", "parfum"],
  points_card: ["carte cadeau", "points bonus"],
  huge_saving: ["offre", "réduction", "promotion"],
  near_free: ["bon plan", "prix minime", "quasi gratuit"],
  gift_for_her: ["sac", "chaussures", "bijoux", "lingerie"],
};

const WEBSITES = [
  "site1.com","site2.com","site3.com","site4.com","site5.com",
  "site6.com","site7.com","site8.com","site9.com","site10.com",
  "site11.com","site12.com","site13.com","site14.com","site15.com",
  "site16.com","site17.com","site18.com","site19.com","site20.com",
  "site21.com","site22.com","site23.com","site24.com","site25.com",
  "site26.com","site27.com","site28.com","site29.com","site30.com",
  "site31.com","site32.com","site33.com","site34.com","site35.com",
  "site36.com","site37.com","site38.com","site39.com","site40.com",
];

export default function App() {
  const { state, setItems, addOrReplaceItem, updateItem, setLoading, setError, setLastUpdated, setProgress } =
    useGlitchItems();
  const [selectedCategory, setSelectedCategory] = useState("general");

  const performSearch = async () => {
    setLoading(true);
    setError("");
    setItems([]);
    setLastUpdated(null);

    const keywords = CATEGORY_KEYWORDS[selectedCategory] || ["montre"];
    try {
      for (const keyword of keywords) {
        for (const website of WEBSITES) {
          setProgress(`Searching on ${website} with "${keyword}"`);
          const items = await searchGlitchItems(selectedCategory, keyword, website);

          for (const item of items) {
            item.verificationStatus = "loading";
            addOrReplaceItem(item);

            // Auto verify
            verifyItem(item.url)
              .then((res) => {
                if (res.status === "verified") updateItem(item.url, { verificationStatus: "verified", verificationReason: res.reason });
                else {
                  updateItem(item.url, { verificationStatus: "unavailable" });
                  performReplacement(item); // replace immediately
                }
              })
              .catch(() => {
                updateItem(item.url, { verificationStatus: "unavailable" });
                performReplacement(item);
              });
          }

          // Stop searching if we already have 5 verified items
          const verifiedCount = state.items.filter(i => i.verificationStatus === "verified").length;
          if (verifiedCount >= 5) return;
        }
      }
    } catch {
      setError("Erreur lors du scan.");
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
      setProgress("");
    }
  };

  const performReplacement = async (oldItem: GlitchItem) => {
    // Try to find a new item for the slot
    const keywords = CATEGORY_KEYWORDS[selectedCategory] || ["montre"];
    for (const keyword of keywords) {
      for (const website of WEBSITES) {
        const items = await searchGlitchItems(selectedCategory, keyword, website);
        for (const item of items) {
          item.verificationStatus = "loading";
          addOrReplaceItem(item);

          verifyItem(item.url)
            .then((res) => {
              if (res.status === "verified") updateItem(item.url, { verificationStatus: "verified", verificationReason: res.reason });
              else updateItem(item.url, { verificationStatus: "unavailable" });
            })
            .catch(() => updateItem(item.url, { verificationStatus: "unavailable" }));

          const verifiedCount = state.items.filter(i => i.verificationStatus === "verified").length;
          if (verifiedCount >= 5) return;
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">GlitchPrice Finder</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-100 px-3 py-2 rounded"
        >
          {Object.keys(CATEGORY_KEYWORDS).map(cat => (
            <option key={cat} value={cat}>{cat.replace("_", " ")}</option>
          ))}
        </select>

        <button
          onClick={performSearch}
          disabled={state.loading}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
        >
          {state.loading ? "Scanning..." : "Lancer le Scan"}
        </button>
      </div>

      {state.progress && (
        <p className="text-purple-400 mb-4 text-center">{state.progress}</p>
      )}

      {state.error && (
        <p className="text-red-500 mb-4 text-center">{state.error}</p>
      )}

      {state.lastUpdated && (
        <p className="text-gray-400 mb-4 text-sm text-center">
          Last updated: {state.lastUpdated.toLocaleTimeString()}
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {state.items.map((item) => (
          <div
            key={item.url}
            className={`p-4 rounded-lg shadow transition-shadow duration-200 ${
              item.verificationStatus === "verified" ? "bg-green-800" :
              item.verificationStatus === "loading" ? "bg-purple-700 animate-pulse" :
              "bg-gray-800"
            }`}
          >
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p className="text-gray-300 mt-1">{item.description}</p>
            <p className="text-green-400 font-semibold mt-1">
              -{item.savingsPercentage}%
            </p>

            {item.nextBestPrice && (
              <p className="text-gray-400 text-sm">
                Next best: {item.nextBestPrice.price}€ ({item.nextBestPrice.store})
              </p>
            )}

            {item.verificationReason && (
              <p className="text-gray-400 text-xs mt-1">{item.verificationReason}</p>
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
