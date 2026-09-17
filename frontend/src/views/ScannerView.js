import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { LineChart } from "react-native-chart-kit";
import { useScannerController } from "../controllers/useScannerController";

const SCREEN_WIDTH = Dimensions.get("window").width;

const ScannerView = () => {
  const {
    loading,
    scanResult,
    error,
    captureWithCamera,
    pickFromGallery,
    downloadProcessedImage,
    downloadDocumentPdf,
    downloadOcrTextFile,
    resetScan,
  } = useScannerController();

  const handleCopyToClipboard = async () => {
    if (
      scanResult &&
      scanResult.extracted_text &&
      scanResult.extracted_text.trim() !== ""
    ) {
      await Clipboard.setStringAsync(scanResult.extracted_text);
      Alert.alert("Copied!", "Extracted OCR text copied to clipboard.");
    } else {
      Alert.alert("Empty", "No text available to copy.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7fafc" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Title Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>CV Document Scanner</Text>
          <Text style={styles.appSubtitle}>
            Edge Detection • Noise Reduction • Binarization • OCR
          </Text>
        </View>

        {/* Primary Action Buttons (Camera / Gallery) */}
        <View style={styles.topActionRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.cameraBtn]}
            onPress={captureWithCamera}
            disabled={loading}
          >
            <Text style={styles.btnText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, styles.galleryBtn]}
            onPress={pickFromGallery}
            disabled={loading}
          >
            <Text style={styles.btnText}>Upload Image</Text>
          </TouchableOpacity>
        </View>

        {/* Loading Spinner */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2b6cb0" />
            <Text style={styles.loadingText}>
              Processing CV Pipeline & Running OCR...
            </Text>
          </View>
        )}

        {/* Error Alert Box */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Scan Result Contents */}
        {scanResult && !loading && (
          <>
            {/* Quick Action Control Bar */}
            <View style={styles.subControlRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, styles.saveImgBtn]}
                onPress={downloadProcessedImage}
              >
                <Text style={styles.secondaryBtnText}>Save / Download</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, styles.resetBtn]}
                onPress={resetScan}
              >
                <Text style={[styles.secondaryBtnText, { color: "#e53e3e" }]}>
                  Reset
                </Text>
              </TouchableOpacity>
            </View>

            {/* 1. Image Properties Card */}
            {scanResult.properties && (
              <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>Image Properties</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Dimensions:</Text>
                  <Text style={styles.metaValue}>
                    {scanResult.properties.width} ×{" "}
                    {scanResult.properties.height}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Channels:</Text>
                  <Text style={styles.metaValue}>
                    {scanResult.properties.channels}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Data Type:</Text>
                  <Text style={styles.metaValue}>
                    {scanResult.properties.data_type}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Intensity Range:</Text>
                  <Text style={styles.metaValue}>
                    [{scanResult.properties.min_intensity},{" "}
                    {scanResult.properties.max_intensity}]
                  </Text>
                </View>
              </View>
            )}

            {/* 2. Grayscale Intensity Distribution Chart */}
            {scanResult.histogram && (
              <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>
                  Grayscale Intensity Distribution
                </Text>
                <Text style={styles.cardSubText}>
                  Pixel frequency distribution across downsampled bins (0–255)
                </Text>

                <LineChart
                  data={{
                    labels: scanResult.histogram.bins.map(String),
                    datasets: [
                      {
                        data: scanResult.histogram.frequencies,
                      },
                    ],
                  }}
                  width={SCREEN_WIDTH - 64}
                  height={190}
                  yAxisInterval={1}
                  chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(43, 108, 176, ${opacity})`,
                    labelColor: (opacity = 1) =>
                      `rgba(113, 128, 150, ${opacity})`,
                    style: {
                      borderRadius: 8,
                    },
                    propsForDots: {
                      r: "4",
                      strokeWidth: "1.5",
                      stroke: "#2b6cb0",
                    },
                  }}
                  bezier
                  style={styles.chartStyle}
                />
              </View>
            )}

            {/* 3. Extracted Text (OCR) Section & Export Controls */}
            <View style={styles.ocrCard}>
              <View style={styles.ocrHeaderRow}>
                <Text style={styles.ocrSectionTitle}>Extracted Text (OCR)</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyToClipboard}
                >
                  <Text style={styles.copyButtonText}>Copy Text</Text>
                </TouchableOpacity>
              </View>

              {/* Editable / Scrollable OCR Output Area */}
              <TextInput
                multiline
                editable={true}
                value={
                  scanResult.extracted_text &&
                  scanResult.extracted_text.trim() !== ""
                    ? scanResult.extracted_text
                    : "No legible text detected."
                }
                placeholder="Extracted text will appear here..."
                style={styles.ocrTextInput}
              />

              {/* Document Export Buttons */}
              <View style={styles.actionButtonGroup}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.pdfBtn]}
                  onPress={downloadDocumentPdf}
                >
                  <Text style={styles.actionBtnText}>
                    📄 Export PDF Document
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.txtBtn]}
                  onPress={downloadOcrTextFile}
                >
                  <Text style={styles.actionBtnText}>📝 Export .TXT</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.imgBtn]}
                  onPress={downloadProcessedImage}
                >
                  <Text style={styles.actionBtnText}>🖼️ Save Image (PNG)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. Multi-Stage Pipeline Breakdown */}
            <Text style={styles.sectionHeaderTitle}>
              Computer Vision Pipeline Steps
            </Text>

            {/* Step 1: Original Image */}
            <View style={styles.stepCard}>
              <View style={styles.stepBadgeRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Step 1</Text>
                </View>
                <Text style={styles.stepTitle}>Original Captured Document</Text>
              </View>
              <Text style={styles.stepDesc}>
                Raw input image received from camera or device album.
              </Text>
              <Image
                source={{ uri: scanResult.original_image }}
                style={styles.stepImage}
                resizeMode="contain"
              />
            </View>

            {/* Step 2: Grayscale */}
            <View style={styles.stepCard}>
              <View style={styles.stepBadgeRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Step 2</Text>
                </View>
                <Text style={styles.stepTitle}>Grayscale Conversion</Text>
              </View>
              <Text style={styles.stepDesc}>
                Luminance channel reduction for single-channel intensity
                analysis.
              </Text>
              <Image
                source={{ uri: scanResult.grayscale_image }}
                style={styles.stepImage}
                resizeMode="contain"
              />
            </View>

            {/* Step 3: Canny Edges & Morphological Closing */}
            <View style={styles.stepCard}>
              <View style={styles.stepBadgeRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Step 3</Text>
                </View>
                <Text style={styles.stepTitle}>
                  Canny Edges & Morphological Closing
                </Text>
              </View>
              <Text style={styles.stepDesc}>
                Noise reduction via Gaussian Blur (5x5) and gradient
                thresholding.
              </Text>
              <Image
                source={{ uri: scanResult.edges_image }}
                style={styles.stepImage}
                resizeMode="contain"
              />
            </View>

            {/* Step 4: Bounding Box */}
            <View style={styles.stepCard}>
              <View style={styles.stepBadgeRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Step 4</Text>
                </View>
                <Text style={styles.stepTitle}>Contour Bounding Box</Text>
              </View>
              <Text style={styles.stepDesc}>
                Prominent document quad identified and bounded via
                cv2.boundingRect.
              </Text>
              <Image
                source={{ uri: scanResult.bounding_box_image }}
                style={styles.stepImage}
                resizeMode="contain"
              />
            </View>

            {/* Step 5: Cropped Document */}
            <View style={styles.stepCard}>
              <View style={styles.stepBadgeRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Step 5</Text>
                </View>
                <Text style={styles.stepTitle}>
                  Cropped Document Region (ROI)
                </Text>
              </View>
              <Text style={styles.stepDesc}>
                Sub-matrix sliced directly around the localized bounding
                coordinates.
              </Text>
              <Image
                source={{ uri: scanResult.cropped_document }}
                style={styles.stepImage}
                resizeMode="contain"
              />
            </View>

            {/* Step 6: Final Binarized Scan */}
            <View style={[styles.stepCard, styles.finalStepCard]}>
              <View style={styles.stepBadgeRow}>
                <View
                  style={[styles.stepBadge, { backgroundColor: "#2b6cb0" }]}
                >
                  <Text style={styles.stepBadgeText}>Step 6</Text>
                </View>
                <Text style={[styles.stepTitle, { color: "#1a365d" }]}>
                  Final Binarized Document
                </Text>
              </View>
              <Text style={styles.stepDesc}>
                Otsu's global thresholding separates ink text from background
                shadows.
              </Text>
              <Image
                source={{ uri: scanResult.final_scanned_image }}
                style={styles.stepImage}
                resizeMode="contain"
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ScannerView;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7fafc",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 6,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a365d",
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 12,
    color: "#718096",
    marginTop: 4,
    textAlign: "center",
  },
  topActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cameraBtn: {
    backgroundColor: "#1d4ed8",
  },
  galleryBtn: {
    backgroundColor: "#0f172a",
  },
  btnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#4a5568",
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#fed7d7",
    borderColor: "#feb2b2",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#9b2c2c",
    fontSize: 13,
    fontWeight: "500",
  },
  subControlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  saveImgBtn: {
    backgroundColor: "#2f855a",
    borderColor: "#276749",
  },
  resetBtn: {
    backgroundColor: "#edf2f7",
    borderColor: "#cbd5e0",
  },
  secondaryBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: 6,
  },
  cardSubText: {
    fontSize: 11,
    color: "#718096",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#edf2f7",
  },
  metaLabel: {
    fontSize: 13,
    color: "#718096",
  },
  metaValue: {
    fontSize: 13,
    color: "#2d3748",
    fontWeight: "600",
  },
  chartStyle: {
    marginTop: 8,
    borderRadius: 8,
  },
  ocrCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginVertical: 14,
    borderWidth: 1.5,
    borderColor: "#cbd5e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ocrHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  ocrSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a365d",
  },
  copyButton: {
    backgroundColor: "#edf2f7",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e0",
  },
  copyButtonText: {
    fontSize: 12,
    color: "#2b6cb0",
    fontWeight: "600",
  },
  ocrTextInput: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e0",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: "#2d3748",
    minHeight: 110,
    maxHeight: 220,
    textAlignVertical: "top",
    lineHeight: 18,
    fontFamily: "monospace",
  },
  actionButtonGroup: {
    flexDirection: "column",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfBtn: {
    backgroundColor: "#2b6cb0",
  },
  txtBtn: {
    backgroundColor: "#2f855a",
  },
  imgBtn: {
    backgroundColor: "#4a5568",
  },
  actionBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a365d",
    marginTop: 10,
    marginBottom: 12,
  },
  stepCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  finalStepCard: {
    borderColor: "#2b6cb0",
    borderWidth: 2,
  },
  stepBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  stepBadge: {
    backgroundColor: "#4a5568",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  stepBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2d3748",
  },
  stepDesc: {
    fontSize: 12,
    color: "#718096",
    marginBottom: 10,
  },
  stepImage: {
    width: "100%",
    height: 240,
    borderRadius: 6,
    backgroundColor: "#edf2f7",
  },
});
