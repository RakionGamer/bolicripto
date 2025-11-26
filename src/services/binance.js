const BINANCE_API_URL =
  "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";

/**
 * @param {number} transAmount 
 * @param {number} minAds
 */
export const getPrecioBinance = async (transAmount = null, minAds = 5) => {
  const rows = 20;
  let page = 1;
  let allVerifiedAds = [];
  try {
    while (page <= 100) {
      const payload = {
        asset: "USDT",
        fiat: "VES",
        merchantCheck: true,
        page: page,
        payTypes: [],
        publisherType: null,
        rows: rows,
        tradeType: "SELL",
      };

      if (transAmount && transAmount > 0) {
        payload.transAmount = parseFloat(transAmount.toFixed(2));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(BINANCE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (!response.ok) {
          break;
        }

        const text = await response.text();
        if (!text || text.trim() === "") {
          break;
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error(
            `Error parseando JSON en página ${page}:`,
            parseError.message
          );
          break;
        }
        if (!data.success || !data.data || data.data.length === 0) {
          break;
        }

        const rawAds = data.data;
        console.log(
          `Página ${page}: ${rawAds.length} anuncios recibidos`
        );

        const verifiedAds = rawAds.filter((ad) => {
          const adv = ad?.advertiser;
          if (!adv) return false;
          // Solo anunciates verificados sea Bronce, Platino u Oro...
          return adv.userType === "merchant";
        });

        console.log(
          `Página ${page}: ${verifiedAds.length} verificados`
        );

        allVerifiedAds = allVerifiedAds.concat(verifiedAds);

        // Si ya tenemos anuncios suficientes, terminar
        if (allVerifiedAds.length >= minAds) {
          console.log(
            `Suficientes anuncios: ${allVerifiedAds.length} (mínimo: ${minAds})`
          );
          break;
        }
        page++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          throw new Error("Tiempo de espera agotado al conectar con Binance");
        }
        throw fetchError;
      }
    }

    if (allVerifiedAds.length === 0) {
      throw new Error("No se encontraron anuncios verificados");
    }

    if (allVerifiedAds.length < minAds) {
      console.warn(
        `Solo ${allVerifiedAds.length} anuncios (esperados: ${minAds})`
      );
    }

    const anuncios = allVerifiedAds.map((ad) => {
      const adv = ad.advertiser || {};
      const a = ad.adv || {};
      return {
        nickName: adv.nickName || adv.nick || "—",
        userType: adv.userType || null,
        userIdentity: adv.userIdentity || null,
        monthFinishRate: adv.monthFinishRate || null,
        monthOrderCount: adv.monthOrderCount || null,
        isVerified:
          adv.userType === "merchant" || adv.userIdentity === "verified",
        isMerchant: adv.userType === "merchant",
        price: parseFloat(a.price || 0),
        minSingleTransAmount: parseFloat(a.minSingleTransAmount || 0),
        maxSingleTransAmount: parseFloat(
          a.dynamicMaxSingleTransAmount || a.maxSingleTransAmount || 0
        ),
        availableUSDT: parseFloat(a.surplusAmount || 0),
        paymentMethods: a.tradeMethods || [],
        raw: ad,
      };
    });

    const precios = anuncios
      .map((a) => a.price)
      .filter((p) => typeof p === "number" && p > 0);

    if (precios.length === 0) {
      throw new Error("No hay precios válidos entre los anuncios verificados");
    }

    const precioPromedio =
      precios.reduce((sum, p) => sum + p, 0) / precios.length;

    console.log(
      `Proceso completado: ${precios.length} precios válidos de ${page} página(s)`
    );

    return {
      precio: parseFloat(precioPromedio.toFixed(2)),
      precioMinimo: Math.min(...precios).toFixed(2),
      precioMaximo: Math.max(...precios).toFixed(2),
      cantidadAnuncios: precios.length,
      moneda: "VES",
      fuente: "Binance P2P",
      anuncios,
      transAmount: transAmount || null,
      paginasConsultadas: page,
    };
  } catch (error) {
    console.error("Error fatal:", error.message);
    throw new Error(
      "No se pudo obtener el precio de Binance: " + error.message
    );
  }
};
