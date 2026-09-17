import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

export const HistogramChart = ({ histogramData }) => {
  if (!histogramData || !histogramData.frequencies) {
    return null;
  }

  // Downsample 256 bins down to 8 representative sample points for clean chart rendering
  const totalBins = histogramData.frequencies.length;
  const sampleCount = 8;
  const step = Math.floor(totalBins / sampleCount);

  const sampledFrequencies = [];
  const sampledLabels = [];

  for (let i = 0; i < totalBins; i += step) {
    sampledFrequencies.push(histogramData.frequencies[i] || 0);
    sampledLabels.push(`${i}`);
  }

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#f8fafc",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 12,
    },
    propsForDots: {
      r: "3",
      strokeWidth: "1",
      stroke: "#1d4ed8",
    },
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grayscale Pixel Intensity Distribution</Text>
      <Text style={styles.subtitle}>
        Frequency of pixel values (0 = Black, 255 = White)
      </Text>

      <LineChart
        data={{
          labels: sampledLabels,
          datasets: [{ data: sampledFrequencies }],
        }}
        width={screenWidth - 48}
        height={190}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 10,
  },
  chart: {
    marginVertical: 4,
    borderRadius: 8,
  },
});
