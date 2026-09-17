// const BACKEND_URL = "http://192.168.1.45:8000";
const BACKEND_URL = "http://192.168.168.254:8000";

//const BACKEND_URL = 'https://calm-badger-22.loca.lt';

/**
 * Sends image data via a JSON payload to the FastAPI backend.
 */
export const uploadAndProcessDocument = async (base64Content) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/scanner/process-base64`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_base64: base64Content,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Server responded with status ${response.status}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("ScanService Error:", error.message);
    throw error;
  }
};
