import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StatusBar,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTasaBCV } from "../services/bcv";
import { getPrecioBinance } from "../services/binance";
import Ionicons from "@expo/vector-icons/Ionicons";

const SkeletonLoader = () => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3, 4, 5].map((i) => (
      <View key={i} style={styles.skeletonCard}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonBadge} />
          <View style={styles.skeletonName} />
          <View style={styles.skeletonPrice} />
        </View>
        <View style={styles.skeletonStats}>
          <View style={styles.skeletonStatItem} />
          <View style={styles.skeletonStatItem} />
        </View>
        <View style={styles.skeletonDetails}>
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLine} />
        </View>
      </View>
    ))}
  </View>
);

export default function CalculatorScreen() {
  const [amount, setAmount] = useState("");
  const [tasaBCV, setTasaBCV] = useState(null);
  const [tasaBinance, setTasaBinance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingBinance, setLoadingBinance] = useState(false);
  const [error, setError] = useState(null);
  const { height } = Dimensions.get("window");
  const debounceTimer = useRef(null);
  useEffect(() => {
    cargarTasas();
  }, []);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    const numValue = parseFloat(amount);
    if (!amount || !numValue || numValue <= 0 || !tasaBCV) {
      return;
    }

    debounceTimer.current = setTimeout(() => {
      actualizarBinancePorMonto(numValue);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [amount, tasaBCV]);

  const cargarTasas = async () => {
    try {
      setLoading(true);
      setError(null);

      const bcv = await getTasaBCV();
      setTasaBCV(bcv);

      const binance = await getPrecioBinance(null, 5, 3);
      setTasaBinance(binance);
    } catch (err) {
      setError(err.message);
      console.error("Error al cargar tasas:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const actualizarBinancePorMonto = async (numValue) => {
    if (!tasaBCV) return;

    const bsDelBCV = parseFloat((numValue * tasaBCV.tasaUSD).toFixed(2));

    try {
      setLoadingBinance(true);

      try {
        const binanceData = await getPrecioBinance(bsDelBCV, 5, 3);
        setTasaBinance(binanceData);
      } catch (errWithAmount) {
        const binanceDataGeneral = await getPrecioBinance(null, 5, 3);
        setTasaBinance(binanceDataGeneral);
      }
    } catch (err) {
      setError(`Error al buscar anuncios: ${err.message}`);
    } finally {
      setLoadingBinance(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarTasas();
  };

  const handleAmountChange = (value) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const calcularResultados = () => {
    const numValue = parseFloat(amount) || 0;
    const bcvRate = tasaBCV?.tasaUSD || 0;
    const binanceRate = tasaBinance?.precio || 0;

    const bsDelBCV = numValue * bcvRate;
    const usdtAGastar = binanceRate > 0 ? bsDelBCV / binanceRate : 0;
    const diferencia = binanceRate - bcvRate;
    const porcentajeDiferencia = bcvRate > 0 ? (diferencia / bcvRate) * 100 : 0;

    return {
      bolivaresBCV: bsDelBCV.toFixed(2),
      usdtAGastar: usdtAGastar.toFixed(2),
      diferencia: diferencia.toFixed(2),
      porcentaje: porcentajeDiferencia.toFixed(2),
    };
  };

  const resultados = calcularResultados();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Cargando tasas...</Text>
          <Text style={styles.loadingSubtext}>
            Buscando mejores ofertas verificadas
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <ScrollView
        contentContainerStyle={{
          minHeight: height,
          paddingHorizontal: 20,
          paddingVertical: 40,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#60a5fa"
            colors={["#60a5fa"]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>$</Text>
          </View>
          <Text style={styles.title}>
            Boli
            <Text style={styles.colorGreen}>Cripto</Text>
          </Text>
          <Text style={styles.subtitle}>Haz tus conversiones de Bs a USDT</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={cargarTasas} style={styles.retryButton}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.ratesContainer}>
          <View style={styles.rateCard}>
            <Text style={styles.rateLabel}>Tasa BCV</Text>
            <Text style={styles.rateValue}>
              {tasaBCV?.tasaUSD.toFixed(2)} Bs
            </Text>
            <Text style={styles.rateDate}>{tasaBCV?.fecha}</Text>
          </View>

          <View style={styles.rateCard}>
            <View style={styles.rateCardHeader}>
              <Text style={styles.rateLabel}>
                Tasa USDT ≈ <Text style={styles.colorGreen}>VES</Text>
              </Text>
              {loadingBinance && (
                <ActivityIndicator size="small" color="#22c55e" />
              )}
            </View>
            <Text style={styles.rateValueBinance}>
              {tasaBinance?.precio.toFixed(2)} Bs
            </Text>
            <Text style={styles.rateDate}>
              {tasaBinance?.cantidadAnuncios} anuncios{" "}
            </Text>
          </View>
        </View>

        <View style={styles.analysisContainer}>
          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>Diferencia:</Text>
            <Text
              style={[
                styles.analysisValue,
                parseFloat(resultados.diferencia) > 0
                  ? styles.positiveValue
                  : styles.negativeValue,
              ]}
            >
              {parseFloat(resultados.diferencia) > 0 ? "+" : ""}
              {resultados.diferencia} Bs ({resultados.porcentaje}%)
            </Text>
          </View>

          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>Rango Binance:</Text>
            <Text style={styles.rangeText}>
              {tasaBinance?.precioMinimo} - {tasaBinance?.precioMaximo} Bs
            </Text>
          </View>
        </View>

        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            <View style={styles.labelContainer}>
              <Ionicons
                style={styles.dollarIcon}
                name={"wallet-outline"}
                size={24}
                color={"#22c55e"}
              />
              <Text style={styles.label}>¿Cuántos USD quieres convertir?</Text>
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputPrefixContainer}>
                <Text style={styles.inputPrefix}>$</Text>
              </View>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor="#475569"
                keyboardType="decimal-pad"
                returnKeyType="done"
                selectionColor="#22c55e"
              />
            </View>

            <View style={styles.resultContainer}>
              <View style={styles.resultHeader}>
                <View style={styles.usdtDot} />
                <Text style={styles.resultLabel}>USDT a vender en Binance</Text>
              </View>
              <Text style={styles.resultAmount}>
                {resultados.usdtAGastar} USDT
              </Text>
              <Text style={styles.resultSubtext}>
                Equivalente a {resultados.bolivaresBCV} Bs, según la tasa BCV
              </Text>
            </View>

            <View style={styles.merchantsSection}>
              <View style={styles.merchantsHeader}>
                <Text style={styles.merchantsTitle}>
                  Anunciantes Verificados
                </Text>
                {!loadingBinance && (
                  <Text style={styles.merchantsCount}>
                    {tasaBinance?.anuncios?.length || 0}
                  </Text>
                )}
              </View>

              {loadingBinance ? (
                <SkeletonLoader />
              ) : tasaBinance?.anuncios && tasaBinance.anuncios.length > 0 ? (
                tasaBinance.anuncios.slice(0, 5).map((a, idx) => (
                  <View key={idx} style={styles.merchantCard}>
                    <View style={styles.merchantHeader}>
                      <View style={styles.merchantTitleRow}>
                        <View style={[styles.merchantBadge, a.isMerchant]}>
                          <Text style={styles.merchantBadgeText}>
                            <Ionicons
                              name={
                                a.isMerchant
                                  ? "shield-checkmark"
                                  : "checkmark-done"
                              }
                              size={24}
                              color={"#22c55e"}
                            />
                          </Text>
                        </View>
                        <Text style={styles.merchantNick}>{a.nickName}</Text>
                      </View>
                      <Text style={styles.merchantPrice}>
                        {a.price?.toFixed(2)} Bs
                      </Text>
                    </View>

                    {(a.monthFinishRate !== null ||
                      a.monthOrderCount !== null) && (
                      <View style={styles.merchantStats}>
                        {a.monthFinishRate !== null && (
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Tasa:</Text>
                            <Text style={styles.statValue}>
                              {(parseFloat(a.monthFinishRate) * 100).toFixed(0)}
                              %
                            </Text>
                          </View>
                        )}
                        {a.monthOrderCount !== null && (
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Órdenes:</Text>
                            <Text style={styles.statValue}>
                              {a.monthOrderCount}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={styles.merchantDetails}>
                      <View style={styles.detailRow}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Ionicons
                            name="wallet-outline"
                            size={14}
                            color="#9ca3af"
                          />
                          <Text style={styles.detailLabel}>Disponible:</Text>
                        </View>
                        <Text style={styles.detailValue}>
                          {a.availableUSDT !== undefined
                            ? `${a.availableUSDT.toFixed(2)} USDT`
                            : "—"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Ionicons
                            name="stats-chart-outline"
                            size={14}
                            color="#9ca3af"
                          />
                          <Text style={styles.detailLabel}>Límites:</Text>
                        </View>
                        <Text style={styles.detailValue}>
                          {a.minSingleTransAmount?.toFixed(0) || "—"} -{" "}
                          {a.maxSingleTransAmount?.toFixed(0) || "—"} Bs
                        </Text>
                      </View>
                    </View>

                    {idx === 0 && (
                      <View style={styles.bestPriceBadge}>
                        <Text style={styles.bestPriceText}>Mejor precio</Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.noMerchantsContainer}>
                  <Text style={styles.noMerchantsText}>
                    No se encontraron anunciantes verificados
                  </Text>
                </View>
              )}

              {tasaBinance?.transAmount && !loadingBinance && (
                <View style={styles.searchInfo}>
                  <Text style={styles.searchInfoText}>
                    Resultados filtrados por {resultados.bolivaresBCV} Bs
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Actualizar tasas</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  colorGreen: {
    color: "#22c55e"
  },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    color: "#9ca3af",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },
  loadingSubtext: { color: "#6b7280", marginTop: 8, fontSize: 14 },
  header: { alignItems: "center", marginBottom: 32 },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    elevation: 8,
  },
  logoText: { fontSize: 48, fontWeight: "bold", color: "#ffffff" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: "#2a2a2a",
    padding: 8,
    borderRadius: 8,
    alignSelf: "center",
  },
  retryText: { color: "#fca5a5", fontSize: 14, fontWeight: "600" },
  ratesContainer: { flexDirection: "row", gap: 12, marginBottom: 16 },
  rateCard: {
    flex: 1,
    backgroundColor: "#111111",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  rateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rateLabel: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "600",
    marginBottom: 8,
  },
  rateValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#60a5fa",
    marginBottom: 4,
  },
  rateValueBinance: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#22c55e",
    marginBottom: 4,
  },
  rateDate: { fontSize: 10, color: "#6b7280" },
  analysisContainer: {
    backgroundColor: "#111111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  analysisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  analysisLabel: { fontSize: 14, color: "#e5e7eb", fontWeight: "600" },
  analysisValue: { fontSize: 16, fontWeight: "bold" },
  positiveValue: { color: "#22c55e" },
  negativeValue: { color: "#34d399" },
  rangeText: { fontSize: 14, color: "#9ca3af", fontWeight: "600" },
  cardWrapper: {
    width: "100%",
    maxWidth: 448,
    alignSelf: "center",
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#262626",
    position: "relative",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dollarIcon: {
    marginRight: 8,
  },
  label: { fontSize: 14, color: "#e5e7eb", fontWeight: "600" },
  inputWrapper: { position: "relative", marginBottom: 24 },
  inputPrefixContainer: { position: "absolute", left: 16, top: 24, zIndex: 10 },
  inputPrefix: { fontSize: 28, fontWeight: "bold", color: "#6b7280" },
  input: {
    width: "100%",
    backgroundColor: "#0a0a0a",
    borderWidth: 2,
    borderColor: "#262626",
    borderRadius: 16,
    paddingLeft: 48,
    paddingRight: 24,
    paddingVertical: 20,
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
  },

  resultContainer: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  resultHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  usdtDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: 8,
  },
  resultLabel: { fontSize: 13, color: "#86efac", fontWeight: "600" },
  resultAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#22c55e",
    marginBottom: 4,
  },
  resultSubtext: { fontSize: 12, color: "#86efac" },
  tipContainer: {
    flexDirection: "row",
    backgroundColor: "#0a0a0a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  tipIcon: { fontSize: 16, marginRight: 8 },
  tipText: { flex: 1, fontSize: 12, color: "#9ca3af", lineHeight: 18 },

  skeletonContainer: {
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: "#0f0f0f",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  skeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  skeletonBadge: {
    width: 50,
    height: 20,
    backgroundColor: "#1a1a1a",
    borderRadius: 6,
    marginRight: 8,
  },
  skeletonName: {
    flex: 1,
    height: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    marginRight: 12,
  },
  skeletonPrice: {
    width: 80,
    height: 20,
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
  },
  skeletonStats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
  },
  skeletonStatItem: {
    width: 70,
    height: 14,
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
  },
  skeletonDetails: {
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
  },

  merchantsSection: {
    marginTop: 8,
  },
  merchantsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  merchantsTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  merchantsCount: {
    backgroundColor: "#1a1a1a",
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  merchantCard: {
    backgroundColor: "#0f0f0f",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    marginBottom: 12,
    position: "relative",
  },
  merchantHeader: {
    marginBottom: 12,
  },
  merchantTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  merchantBadge: {
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 2,
  },

  merchantBadgeText: {
    color: "#60a5fa",
    fontSize: 10,
    fontWeight: "700",
  },
  merchantNick: {
    color: "#e5e7eb",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  merchantPrice: {
    color: "#22c55e",
    fontSize: 20,
    fontWeight: "800",
  },
  merchantStats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "600",
  },
  statValue: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
  },
  merchantDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
  },
  detailValue: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  bestPriceBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  bestPriceText: {
    color: "#22c55e",
    fontSize: 10,
    fontWeight: "700",
  },
  noMerchantsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noMerchantsText: {
    color: "#6b7280",
    fontSize: 13,
    textAlign: "center",
  },
  searchInfo: {
    backgroundColor: "#0a0a0a",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  searchInfoText: {
    color: "#60a5fa",
    fontSize: 11,
    textAlign: "center",
    fontWeight: "600",
  },
  refreshButton: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  refreshText: {
    textAlign: "center",
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "600",
  },
  footerNote: {
    textAlign: "center",
    fontSize: 11,
    color: "#6b7280",
    marginTop: 12,
    marginBottom: 20,
  },
});
