import io
import os
import logging
from typing import List, Dict, Any, Optional
import requests
from PIL import Image
import torch

logger = logging.getLogger("classifier")

# Curated list of art movements / categories
DEFAULT_ART_STYLES = [
    "Impressionism",
    "Post-Impressionism",
    "Baroque",
    "Renaissance",
    "Realism",
    "Romanticism",
    "Abstract",
    "Cubism",
    "Expressionism",
    "Surrealism",
    "Japanese Art",
    "Minimalism",
    "Contemporary",
    "Art Nouveau",
    "Pop Art"
]

STYLE_PROMPTS = [
    f"a painting in {style} style" for style in DEFAULT_ART_STYLES
]

class ArtClassifier:
    def __init__(self, model_name: str = "openai/clip-vit-base-patch32"):
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
        self.model = None
        self.processor = None
        self.is_ready = False
        self.styles = DEFAULT_ART_STYLES
        self.text_prompts = STYLE_PROMPTS
        self.text_features = None

    def load_model(self):
        """Initializes the CLIP model and pre-computes text embeddings for fast classification."""
        try:
            from transformers import CLIPProcessor, CLIPModel
            logger.info(f"Loading vision-language model: {self.model_name} on {self.device}...")
            self.model = CLIPModel.from_pretrained(self.model_name).to(self.device)
            self.processor = CLIPProcessor.from_pretrained(self.model_name)
            self.model.eval()

            # Precompute text embeddings for all art style prompts
            with torch.no_grad():
                text_inputs = self.processor(
                    text=self.text_prompts,
                    return_tensors="pt",
                    padding=True
                ).to(self.device)
                text_features = self.model.get_text_features(**text_inputs)
                self.text_features = text_features / text_features.norm(dim=-1, keepdim=True)

            self.is_ready = True
            logger.info("AI Art Classifier model loaded and ready.")
        except Exception as e:
            logger.error(f"Failed to load CLIP model: {e}")
            self.is_ready = False
            raise e

    def extract_dominant_colors(self, image: Image.Image, num_colors: int = 4) -> List[str]:
        """Extract dominant colors as hex codes from the image."""
        try:
            # Resize image to speed up processing
            small_img = image.convert("RGB").resize((120, 120))
            # Quantize to reduce number of colors
            quantized = small_img.quantize(colors=num_colors, method=Image.Quantize.MEDIANCUT)
            palette = quantized.getpalette()[:num_colors * 3]
            
            colors = []
            for i in range(num_colors):
                r = palette[i * 3]
                g = palette[i * 3 + 1]
                b = palette[i * 3 + 2]
                hex_color = f"#{r:02x}{g:02x}{b:02x}"
                colors.append(hex_color)
            return colors
        except Exception as e:
            logger.warning(f"Failed to extract dominant colors: {e}")
            return ["#2a2a2a", "#8c8c8c", "#e0e0e0"]

    def load_image_from_source(self, image_source: str) -> Image.Image:
        """Loads a PIL image from an HTTP URL or local filesystem path."""
        if image_source.startswith("/img/"):
            local_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../apps/web-gateway/public", image_source.lstrip("/")))
            scratch_path = os.path.abspath(os.path.join(
                os.path.expanduser("~"),
                ".gemini/antigravity-ide/brain/45c8cd9c-f1cb-496f-a335-c4ab0b204bf0/scratch/Atelier-database/public",
                image_source.lstrip("/")
            ))
            if os.path.exists(local_path):
                image_source = local_path
            elif os.path.exists(scratch_path):
                image_source = scratch_path
            else:
                image_source = f"http://localhost:3000{image_source}"

        if image_source.startswith("http://") or image_source.startswith("https://"):
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; AtelierClassifier/1.0; +http://localhost)"
            }
            resp = requests.get(image_source, headers=headers, timeout=15)
            resp.raise_for_status()
            image = Image.open(io.BytesIO(resp.content))
        elif os.path.exists(image_source):
            image = Image.open(image_source)
        else:
            raise ValueError(f"Image source not found or invalid: {image_source}")

        return image.convert("RGB")

    def classify(self, image: Image.Image, top_k: int = 3) -> Dict[str, Any]:
        """Classifies the given image against art styles and returns predictions."""
        if not self.is_ready or self.model is None or self.processor is None:
            raise RuntimeError("Model is not initialized.")

        # Extract dominant colors
        dominant_colors = self.extract_dominant_colors(image)

        # Process image with CLIP
        with torch.no_grad():
            image_inputs = self.processor(images=image, return_tensors="pt").to(self.device)
            image_features = self.model.get_image_features(**image_inputs)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            # Cosine similarity between image and precomputed text prompts
            similarity = (image_features @ self.text_features.T).squeeze(0)
            probs = torch.softmax(similarity * 100.0, dim=-1).cpu().numpy()

        # Build results
        scored_styles = [
            {"style": self.styles[i], "confidence": round(float(probs[i]), 4)}
            for i in range(len(self.styles))
        ]
        # Sort descending by confidence
        scored_styles.sort(key=lambda x: x["confidence"], reverse=True)

        primary_style = scored_styles[0]["style"]
        top_styles = scored_styles[:top_k]

        # Orientation detection
        w, h = image.size
        ratio = w / h
        if 0.9 <= ratio <= 1.1:
            orientation = "square"
        elif ratio > 1.1:
            orientation = "landscape"
        else:
            orientation = "portrait"

        return {
            "primaryStyle": primary_style,
            "topStyles": top_styles,
            "detectedStyles": [s["style"] for s in top_styles if s["confidence"] >= 0.10] or [primary_style],
            "dominantColors": dominant_colors,
            "orientation": orientation,
            "width": w,
            "height": h
        }

classifier_instance = ArtClassifier()
