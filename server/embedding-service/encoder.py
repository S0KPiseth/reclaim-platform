"""CLIP encoder: the only place that knows how to load the fine-tuned model.

The model folder is a standard Hugging Face CLIP checkpoint (config.json,
model.safetensors, tokenizer files, preprocessor_config.json). Nothing is
loaded at import time -- the service loads it once in its FastAPI lifespan --
so this module stays importable without torch installed (CLI/unit tests).

Both ``text_vectors`` and ``image_vectors`` return L2-normalized float32
vectors, so cosine similarity is a plain dot product and vectors from text and
images live in the same 512-d space (CLIP is contrastively trained for this,
which is what makes text->image search possible).
"""

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageOps
from transformers import AutoTokenizer, CLIPImageProcessor, CLIPModel

MAX_TOKENS = 77  # CLIP's hard positional limit


def open_image(source):
    """Open an image from a path or file object as upright RGB.

    EXIF transpose matters for phone photos: without it a portrait shot is fed
    to the encoder sideways and matches the wrong things.
    """
    with Image.open(source) as image:
        rgb = ImageOps.exif_transpose(image).convert("RGB")
    return rgb


def load_encoder(model_dir, device):
    """Load model, image processor and tokenizer from a local folder."""
    model_dir = str(model_dir)
    model = CLIPModel.from_pretrained(model_dir).to(device).eval()
    processor = CLIPImageProcessor.from_pretrained(model_dir)
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    return model, processor, tokenizer


def tokenize(tokenizer, texts):
    return tokenizer(
        texts,
        padding=True,
        truncation=True,
        max_length=MAX_TOKENS,
        return_tensors="pt",
    )


def text_vectors(model, tokens):
    """(batch, 512) L2-normalized text embeddings."""
    pooled = model.text_model(**tokens).pooler_output
    return F.normalize(model.text_projection(pooled).float(), dim=-1)


def image_vectors(model, pixel_values):
    """(batch, 512) L2-normalized image embeddings."""
    pooled = model.vision_model(pixel_values=pixel_values).pooler_output
    return F.normalize(model.visual_projection(pooled).float(), dim=-1)


def to_response(vector, dim=None):
    """JSON-safe vector payload. Rounded to 6 dp to keep responses small."""
    values = [round(float(x), 6) for x in np.asarray(vector, dtype=np.float32).ravel()]
    return {"embedding": values, "dim": dim or len(values)}


def score_matrix(query, candidates):
    """Cosine scores of one query vector against many candidate vectors.

    Both sides are already normalized, so this is a dot product; the 0-1 clamp
    only removes float noise (a rescaled similarity can land on 1.0000001).
    """
    query = np.asarray(query, dtype=np.float32).ravel()
    matrix = np.atleast_2d(np.asarray(candidates, dtype=np.float32))
    if matrix.shape[0] == 0:
        return np.empty(0, dtype=np.float32)
    if matrix.shape[1] != query.shape[0]:
        raise ValueError(f"dimension mismatch: query {query.shape[0]} vs candidates {matrix.shape[1]}")
    return np.clip(matrix @ query, -1.0, 1.0)
