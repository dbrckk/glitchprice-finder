const API_URL = "https://deal-finder-backend-y9wb.onrender.com";

export async function fetchGlitches(category: string) {
  try {
    const res = await fetch(`${API_URL}/glitches?category=${category}`);
    if (!res.ok) {
      throw new Error("Erreur backend");
    }
    const data = await res.json();
    return data.items; // IMPORTANT: return items array
  } catch (err) {
    console.error("fetchGlitches error:", err);
    return [];
  }
}

export async function verifyItem(url: string) {
  try {
    const res = await fetch(`${API_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      throw new Error("Erreur vérification");
    }

    return await res.json(); // expected: {status: "verified" | "unavailable", reason?: string}
  } catch (err) {
    console.error("verifyItem error:", err);
    return { status: "unavailable", reason: "Erreur vérification" };
  }
}
