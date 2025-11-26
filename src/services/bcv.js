const API_URL = "https://bcv-api.rafnixg.dev/rates/";
/**
  @returns {Promise<{tasaUSD: number, fecha: string, fuente: string}>}
 **/
export const getTasaBCV = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    const tasaUSD = parseFloat(data.dollar);
    const fecha = data.date;

    return {
      tasaUSD: parseFloat(tasaUSD.toFixed(2)),
      fecha: new Date(fecha).toLocaleDateString("es-ES"),
      fechaISO: fecha,
      fuente: "BCV Oficial",
    };
  } catch (error) {
    console.error("Error al obtener tasa BCV:", error.message);

    if (error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado. Verifica tu conexión.");
    }

    if (error.message.includes("Network request failed")) {
      throw new Error("No se pudo conectar con el servidor BCV.");
    }

    throw new Error("Error al obtener la tasa del BCV: " + error.message);
  }
};

export const checkBCVHealth = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(API_URL, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { disponible: false, mensaje: "API no responde correctamente" };
    }
    const data = await response.json();
    return {
      disponible: true,
      tasa: data.dollar,
      fecha: data.date,
    };
  } catch (error) {
    return {
      disponible: false,
      mensaje: "API no disponible: " + error.message,
    };
  }
};
