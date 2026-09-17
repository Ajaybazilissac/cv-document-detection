import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { uploadAndProcessDocument } from "../services/scannerService";

export const useScannerController = () => {
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Converts any image URI to a compressed JPEG Base64 payload.
   * This neutralizes iOS HEIC decode issues before transmission.
   */
  const convertToJpegBase64 = async (uri) => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [], // Keep original dimensions
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    return manipResult.base64;
  };

  /**
   * Launches native camera interface.
   */
  const captureWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Denied",
          "Camera access is required to scan documents.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const base64Data = await convertToJpegBase64(result.assets[0].uri);
        await handleProcessBase64(base64Data);
      }
    } catch (err) {
      console.error("Camera capture error:", err);
      Alert.alert("Error", "Could not capture photo from camera.");
    }
  };

  /**
   * Launches native photo library / gallery picker.
   */
  const pickFromGallery = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Denied", "Media library access is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const base64Data = await convertToJpegBase64(result.assets[0].uri);
        await handleProcessBase64(base64Data);
      }
    } catch (err) {
      console.error("Gallery pick error:", err);
      Alert.alert("Error", "Could not process selected image.");
    }
  };

  /**
   * Sends Base64 payload to backend FastAPI service.
   */
  const handleProcessBase64 = async (base64String) => {
    if (!base64String || base64String.length < 100) {
      Alert.alert("Error", "Invalid image payload.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await uploadAndProcessDocument(base64String);
      setScanResult(response);
    } catch (err) {
      setError(err.message || "Failed to process document.");
      Alert.alert(
        "Scan Failed",
        err.message || "Error processing document with backend.",
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Saves the final scanned PNG image to local sandbox and triggers native share sheet.
   */
  const downloadProcessedImage = async () => {
    if (!scanResult || !scanResult.final_scanned_image) {
      Alert.alert("Error", "No processed document available to download.");
      return;
    }

    try {
      const base64Data = scanResult.final_scanned_image.replace(
        /^data:image\/\w+;base64,/,
        "",
      );

      const filename = `scanned_doc_${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "image/png",
          dialogTitle: "Save Scanned Document",
          UTI: "public.png",
        });
      } else {
        Alert.alert("Saved", `Saved locally at: ${fileUri}`);
      }
    } catch (err) {
      console.error("Download Image Error:", err);
      Alert.alert("Error", "Failed to save or share image.");
    }
  };

  /**
   * Compiles the binarized scan image and recognized OCR text into a formatted PDF document.
   */
  const downloadDocumentPdf = async () => {
    if (!scanResult) {
      Alert.alert("Error", "No scan data available to export.");
      return;
    }

    const ocrText = scanResult.extracted_text || "No text recognized.";
    const imageUri = scanResult.final_scanned_image;

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { margin: 18mm 15mm; }
            body {
              font-family: Arial, sans-serif;
              color: #2d3748;
              margin: 0;
              padding: 0;
            }
            .header {
              border-bottom: 2px solid #2b6cb0;
              padding-bottom: 8px;
              margin-bottom: 16px;
            }
            h1 {
              font-size: 18pt;
              color: #1a365d;
              margin: 0 0 4px 0;
            }
            .meta {
              font-size: 9pt;
              color: #718096;
            }
            .section-title {
              font-size: 12pt;
              font-weight: bold;
              color: #2b6cb0;
              margin-top: 18px;
              margin-bottom: 8px;
            }
            .image-box {
              text-align: center;
              margin-bottom: 16px;
            }
            .scanned-img {
              max-width: 100%;
              max-height: 380px;
              border: 1px solid #cbd5e0;
              border-radius: 4px;
            }
            .ocr-box {
              background-color: #f7fafc;
              border: 1px solid #e2e8f0;
              padding: 12px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 10pt;
              white-space: pre-wrap;
              word-break: break-word;
              line-height: 1.45;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Document Scan & OCR Report</h1>
            <div class="meta">Exported on: ${new Date().toLocaleString()}</div>
          </div>

          <div class="section-title">1. Binarized Scanned Document</div>
          <div class="image-box">
            <img src="${imageUri}" class="scanned-img" />
          </div>

          <div class="section-title">2. Extracted OCR Text</div>
          <div class="ocr-box">${ocrText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: "Save Scanned PDF Document",
        });
      } else {
        Alert.alert("PDF Generated", `Document saved at: ${uri}`);
      }
    } catch (err) {
      console.error("PDF Export Error:", err);
      Alert.alert("Export Failed", "Could not generate PDF document.");
    }
  };

  /**
   * Exports the extracted OCR text as a plain text (.txt) file via native share sheet.
   */
  const downloadOcrTextFile = async () => {
    if (
      !scanResult ||
      !scanResult.extracted_text ||
      scanResult.extracted_text.trim() === ""
    ) {
      Alert.alert("No Text Found", "No OCR text available to export.");
      return;
    }

    try {
      const filename = `ocr_extracted_${Date.now()}.txt`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, scanResult.extracted_text, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/plain",
          dialogTitle: "Save Extracted Text (.txt)",
          UTI: "public.plain-text",
        });
      } else {
        Alert.alert("Saved", `Text document saved at: ${fileUri}`);
      }
    } catch (err) {
      console.error("TXT Export Error:", err);
      Alert.alert("Error", "Failed to save plain text document.");
    }
  };

  /**
   * Resets scan state to allow fresh capture.
   */
  const resetScan = () => {
    setScanResult(null);
    setError(null);
  };

  return {
    loading,
    scanResult,
    error,
    captureWithCamera,
    pickFromGallery,
    downloadProcessedImage,
    downloadDocumentPdf,
    downloadOcrTextFile,
    resetScan,
  };
};
