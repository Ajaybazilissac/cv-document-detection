import io
import cv2
import numpy as np
import base64
from PIL import Image

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

def bytes_to_cv2_image(image_bytes: bytes) -> np.ndarray:
    """
    Converts raw incoming file bytes into an OpenCV BGR numpy array.
    Supports JPEG, PNG, HEIC, and WebP.
    """
    # Try OpenCV directly
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Fallback to PIL with HEIC support enabled
    if image is None:
        try:
            pil_image = Image.open(io.BytesIO(image_bytes))
            rgb_image = np.array(pil_image.convert("RGB"))
            image = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR)
        except Exception as e:
            raise ValueError(f"Uploaded file is not a valid or readable image: {str(e)}")

    return image

def cv2_image_to_base64(image: np.ndarray, format_ext: str = ".png") -> str:
    """
    Converts an OpenCV image array to a base64 string formatted for React Native.
    """
    success, encoded_buffer = cv2.imencode(format_ext, image)
    if not success:
        raise RuntimeError("Failed to encode image to buffer.")

    base64_str = base64.b64encode(encoded_buffer).decode("utf-8")
    mime_type = "image/png" if format_ext == ".png" else "image/jpeg"
    return f"data:{mime_type};base64,{base64_str}"



'''
Here is an explanation of these functions using a complete, real-world example trace:

The Scenario
Imagine you take a tiny $2 \times 2$ pixel color image with your phone and upload it.

The image travels across the network as raw binary bytes, enters Python, gets transformed into a numerical matrix (NumPy array), gets edited with OpenCV, and is finally converted into a string format that your frontend can render directly.

1. np.frombuffer(image_bytes, np.uint8)
 What is happening under the hood:
When FastAPI receives an uploaded file, it arrives as raw Python bytes (e.g., b'\xff\xd8\xff\xe0...'). OpenCV does not understand Python's internal byte wrapper directly; it requires a NumPy array.
--> np.frombuffer: Reads those raw bytes directly from RAM without copying them.
--> np.uint8: Tells NumPy that every single byte represents an integer from $0$ to $255$ (8-bit unsigned integer). 

Concrete Example:

# Raw file bytes arriving from a request
raw_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF'
This data is the binary header of a JPEG image file represented as a Python bytes object.
Breakdown of the Bytes
--> \xff\xd8: Start of Image (SOI) marker. Every valid JPEG file begins with these two bytes.
--> \xff\xe0: Application marker (APP0), used for metadata like JFIF.
--> \x00\x10: Length of the APP0 header segment (16 bytes in hexadecimal).
--> JFIF: The ASCII text identifier for the JPEG File Interchange Format. 

# Convert bytes to a 1D NumPy array
byte_array = np.frombuffer(raw_bytes, dtype=np.uint8)

print(byte_array)
# Output: array([255, 216, 255, 224,   0,  16,  74,  70,  73,  70], dtype=uint8)
print(byte_array.shape)
# Output: (10,)  <-- 1D array of 10 raw bytes
------------------------------------------------------------------------------------------------------------------------------
2. cv2.imdecode(byte_array, cv2.IMREAD_COLOR)
What is happening under the hood:
byte_array above is still a compressed file structure (like JPEG or PNG compression tags), not actual pixel values.
cv2.imread() normally reads a file saved on your hard drive. cv2.imdecode() does the exact same decompression, but in memory, without needing to save a temporary file to your disk. It reconstructs the 3D matrix (Height, Width, 3 Color Channels).

Concrete Example:
# Decompress the in-memory array into a 3D pixel matrix
img = cv2.imdecode(byte_array, cv2.IMREAD_COLOR)

print(img.shape)
# Output: (2, 2, 3) -> 2 rows, 2 columns, 3 channels (BGR)

print(img)
# Output:
# [
#   [[255, 0, 0],   [0, 255, 0]],    <- Row 1: [Blue pixel, Green pixel]
#   [[0, 0, 255], [255, 255, 255]]   <- Row 2: [Red pixel,  White pixel]
# ]

-------------------------------------------------------------------------------------------------------------------------------
3. cv2.imencode('.png', image)
What is happening under the hood:
After you process the image in Python (e.g., running Canny edge detection or thresholding), you have a raw numerical NumPy array.
You cannot send a raw $(H, W, C)$ matrix directly as an image over the web. cv2.imencode() compresses the pixels back into an image format (such as .png or .jpg) and stores it in a byte buffer in memory.

Concrete Example:
# Assume 'processed_image' is a 2x2 thresholded binary image
processed_image = np.array([
    [0, 255],
    [255, 0]
], dtype=np.uint8)

# Compress the pixel array into PNG format in memory
success, encoded_buffer = cv2.imencode('.png', processed_image)

print(success)
# Output: True

print(type(encoded_buffer))
# Output: <class 'numpy.ndarray'>

print(encoded_buffer[:8].flatten())
# Output: [137  80  78  71  13  10  26  10]  <-- The official file header bytes of a PNG!
---------------------------------------------------------------------------------------------------------------------------
4. base64.b64encode(encoded_buffer).decode('utf-8')
What is happening under the hood:
JSON only allows standard text characters; it cannot transmit raw binary bytes (bytes like \x89PNG\r\n will corrupt the JSON packet).
--> base64.b64encode(): Translates binary bytes into safe, printable ASCII characters (A–Z, a–z, 0–9, +, /).
--> .decode('utf-8'): Converts the Base64 bytes object into a standard Python string.

Concrete Example:
import base64

# Encode the PNG buffer into base64 bytes, then decode to a string
base64_bytes = base64.b64encode(encoded_buffer)
base64_str = base64_bytes.decode('utf-8')

print(type(base64_str))
# Output: <class 'str'>

print(base64_str[:30])
# Output: "iVBORw0KGgoAAAANSUhEUgAAAAIAAA..."
-----------------------------------------------------------------------------------------------------------------------------------
5. f"data:{mime_type};base64,{base64_str}"
What is happening under the hood:
A Base64 string on its own is just a block of characters. A web browser or a mobile framework (React Native) does not know if that text represents an image, a PDF, or an audio clip.

The Data URI scheme adds metadata instructing the frontend on how to parse the string:
data:[<media type>][;base64],<data>

Concrete Example:
mime_type = "image/png"
data_uri = f"data:{mime_type};base64,{base64_str}"

print(data_uri[:50])
# Output: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAA..."

How the Frontend Uses This
Because we formatted the string into a Data URI, React Native can display it directly on the screen without downloading it from a file URL:

// React Native component
<Image 
  source={{ uri: data_uri }} 
  style={{ width: 200, height: 200 }} 
/>
'''