import os
import cv2
import numpy as np
from paddleocr import PaddleOCR
from app.models.scanner_model import ImageProperties, HistogramData, ScanResponse
from app.utils.image_helpers import bytes_to_cv2_image, cv2_image_to_base64


class VisionService:
    _ocr_engine = None

    @classmethod
    def get_ocr_engine(cls):
        """Lazy-load PaddleOCR singleton only when requested."""
        if cls._ocr_engine is None:
            print("[PaddleOCR] Initializing deep learning models...")
            cls._ocr_engine = PaddleOCR(use_angle_cls=True, lang='en')
            print("[PaddleOCR] Engine ready.")
        return cls._ocr_engine

    @classmethod
    def extract_text_with_paddle(cls, image: np.ndarray) -> str:
        """
        Runs deep-learning OCR using PaddleOCR on cropped document image.
        Supports both modern PaddleOCR/PaddleX pipeline structures and legacy list structures.
        """
        try:
            engine = cls.get_ocr_engine()
            result = engine.ocr(image)

            if not result:
                return ""

            extracted_lines = []

            # Format 1: Modern PaddleOCR/PaddleX pipeline result (list of dicts/Result objects)
            if isinstance(result, list) and len(result) > 0 and (isinstance(result[0], dict) or hasattr(result[0], "keys")):
                for item in result:
                    rec_texts = (
                        item.get("rec_texts")
                        if isinstance(item, dict)
                        else getattr(item, "rec_texts", None)
                    )
                    if not rec_texts:
                        rec_texts = (
                            item.get("rec_text")
                            if isinstance(item, dict)
                            else getattr(item, "rec_text", None)
                        )

                    if isinstance(rec_texts, list):
                        extracted_lines.extend([str(t).strip() for t in rec_texts if str(t).strip()])
                    elif isinstance(rec_texts, str) and rec_texts.strip():
                        extracted_lines.append(rec_texts.strip())

            # Format 2: Standard/Legacy format [[[box, (text, score)], ...]]
            elif isinstance(result, list) and len(result) > 0 and result[0] is not None:
                for line in result[0]:
                    if isinstance(line, (list, tuple)) and len(line) >= 2:
                        val = line[1]
                        if isinstance(val, (list, tuple)) and len(val) >= 1:
                            extracted_lines.append(str(val[0]).strip())
                        elif isinstance(val, str):
                            extracted_lines.append(val.strip())
                    elif isinstance(line, str):
                        extracted_lines.append(line.strip())

            return "\n".join(extracted_lines).strip()

        except Exception as err:
            print(f"[PaddleOCR Warning] Recognition failed: {err}")
            return ""

    @classmethod
    def process_document(cls, image_bytes: bytes) -> ScanResponse:
        # 1. Decode raw bytes to OpenCV BGR numpy array
        img_bgr = bytes_to_cv2_image(image_bytes)
        h, w, c = img_bgr.shape

        props = ImageProperties(
            height=int(h),
            width=int(w),
            channels=int(c),
            data_type=str(img_bgr.dtype),
            min_intensity=int(img_bgr.min()),
            max_intensity=int(img_bgr.max())
        )

        # 2. Color Conversion: BGR -> Grayscale
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        # 3. Histogram Analysis (8 downsampled buckets for frontend chart)
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
        bins = [0, 32, 64, 96, 128, 160, 192, 224]
        frequencies = [int(np.sum(hist[i:i + 32])) for i in bins]
        histogram_data = HistogramData(bins=bins, frequencies=frequencies)

        # =========================================================================
        # 4. Standardized scale for edge & contour analysis (800px target)
        # =========================================================================
        TARGET_H = 800.0
        scale = TARGET_H / float(h)
        target_w = int(w * scale)
        small_gray = cv2.resize(gray, (target_w, int(TARGET_H)), interpolation=cv2.INTER_AREA)

        blurred_small = cv2.GaussianBlur(small_gray, (5, 5), 0)

        v = np.median(blurred_small)
        lower_t = int(max(0, 0.66 * v))
        upper_t = int(min(255, 1.33 * v))
        small_edges = cv2.Canny(blurred_small, lower_t, upper_t)

        close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
        closed_small = cv2.morphologyEx(small_edges, cv2.MORPH_CLOSE, close_kernel, iterations=2)

        contours, _ = cv2.findContours(closed_small, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)

        small_total_area = target_w * TARGET_H
        best_box = None

        # Tier 1: Quadrilateral search (5% - 98% image area)
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if 0.05 * small_total_area < area < 0.98 * small_total_area:
                peri = cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
                if len(approx) in [4, 5]:
                    best_box = cv2.boundingRect(cnt)
                    break

        # Tier 2: Largest contour fallback
        if best_box is None and contours:
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if 0.05 * small_total_area < area < 0.98 * small_total_area:
                    best_box = cv2.boundingRect(cnt)
                    break

        # Tier 3: Threshold background contrast fallback
        if best_box is None:
            _, thresh_fallback = cv2.threshold(
                blurred_small, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )
            cnts_fallback, _ = cv2.findContours(thresh_fallback, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if cnts_fallback:
                largest_fb = max(cnts_fallback, key=cv2.contourArea)
                if cv2.contourArea(largest_fb) > 0.05 * small_total_area:
                    best_box = cv2.boundingRect(largest_fb)

        # =========================================================================
        # 5. Scale coordinates back to original image
        # =========================================================================
        if best_box is not None:
            sx, sy, sw, sh = best_box
            orig_scale = 1.0 / scale
            crop_x = int(sx * orig_scale)
            crop_y = int(sy * orig_scale)
            crop_w = int(sw * orig_scale)
            crop_h = int(sh * orig_scale)
        else:
            margin_x = int(w * 0.05)
            margin_y = int(h * 0.05)
            crop_x, crop_y = margin_x, margin_y
            crop_w, crop_h = w - (2 * margin_x), h - (2 * margin_y)

        crop_x = max(0, min(crop_x, w - 10))
        crop_y = max(0, min(crop_y, h - 10))
        crop_w = min(crop_w, w - crop_x)
        crop_h = min(crop_h, h - crop_y)

        # =========================================================================
        # 6. Draw dynamic thickness green bounding box
        # =========================================================================
        img_bbox = img_bgr.copy()
        box_thickness = max(int(min(h, w) / 120), 8)
        cv2.rectangle(
            img_bbox,
            (crop_x, crop_y),
            (crop_x + crop_w, crop_y + crop_h),
            (0, 255, 0),
            box_thickness
        )

        # =========================================================================
        # 7. Crop ROI and compute adaptive Gaussian thresholding
        # =========================================================================
        cropped_color = img_bgr[crop_y:crop_y + crop_h, crop_x:crop_x + crop_w]
        if cropped_color.size == 0:
            cropped_color = img_bgr

        cropped_gray = cv2.cvtColor(cropped_color, cv2.COLOR_BGR2GRAY)
        block_size = max(int(cropped_gray.shape[0] / 30) | 1, 21)
        final_binary = cv2.adaptiveThreshold(
            cropped_gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            block_size,
            11
        )

        # =========================================================================
        # 8. Run PaddleOCR
        # =========================================================================
        ocr_text = cls.extract_text_with_paddle(cropped_color)

        if not ocr_text:
            ocr_text = cls.extract_text_with_paddle(final_binary)

        full_edges = cv2.resize(closed_small, (w, h), interpolation=cv2.INTER_NEAREST)

        return ScanResponse(
            success=True,
            message="Document processed and PaddleOCR completed successfully.",
            properties=props,
            histogram=histogram_data,
            original_image=cv2_image_to_base64(img_bgr, ".jpg"),
            grayscale_image=cv2_image_to_base64(gray, ".png"),
            edges_image=cv2_image_to_base64(full_edges, ".png"),
            bounding_box_image=cv2_image_to_base64(img_bbox, ".jpg"),
            cropped_document=cv2_image_to_base64(cropped_color, ".jpg"),
            final_scanned_image=cv2_image_to_base64(final_binary, ".png"),
            extracted_text=ocr_text
        )