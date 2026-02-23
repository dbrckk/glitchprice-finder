export const fetchGlitches = async (category: string) => {
  const res = await fetch("https://deal-finder-backend-y9wb.onrender.com/api/glitches?category=" + category);
  if (!res.ok) throw new Error("Failed to fetch glitches");
  return res.json();
};

export const verifyItem = async (url: string) => {
  const res = await fetch("https://YOUR-RENDER-URL/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) throw new Error("Verification failed");
  return res.json();
};
