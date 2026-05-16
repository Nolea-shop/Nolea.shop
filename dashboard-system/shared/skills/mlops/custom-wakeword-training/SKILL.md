---
name: custom-wakeword-training
description: "Train custom openWakeWord wake word models (e.g. 'Leyna', 'Jeff') using synthetic TTS data, audio augmentation, and the openWakeWord PyTorch DNN pipeline — exportable as ONNX for voice assistant integration."
version: 1.0.0
author: Hermes Agent
tags: [openwakeword, wake-word, keyword-spotting, audio, training, colab, onnx, tts, pytorch]
---

# Custom Wake-Word Training (openWakeWord)

Train binary wake-word classifiers for arbitrary phrases using the same pipeline openWakeWord uses: synthetic TTS data → audio augmentation → openWakeWord feature extraction → PyTorch DNN → ONNX export.

## Architecture

The model is a **fully-connected DNN** (from `openwakeword/train.py`):

```
Input: (batch, 16, 96)    ← 16 time frames × 96 embedding dims
  ↓ Flatten
  ↓ Linear(1536 → 128) + LayerNorm + ReLU
  ↓ [FCNBlock(128)] × 3   (Linear + LayerNorm + ReLU)
  ↓ Linear(128 → 1) + Sigmoid
Output: score ∈ [0, 1]
```

- **Input features**: computed by two ONNX models (mel-spectrogram + speech_embedding) bundled with openWakeWord. 96-dim vector per 80ms frame.
- **16 frames ≈ 1.28s** context per prediction.
- **Binary output**: score > 0.5 = wake word detected.

## Training Pipeline

### 1. Synthetic Data (Edge-TTS)
- **Positive**: wake word in normal/UPPER/lower case, 15+ German Edge-TTS voices
- **Negative/adversarial**: phonetically similar phrases (e.g. "Lehne" for "Leyna", "Chef" for "Jeff") + common voice commands

### 2. Audio Augmentation
Uses `audiomentations` with openWakeWord's probability map:

| Augmentation | P | Effect |
|---|---|---|
| SevenBandParametricEQ | 0.25 | ±6 dB EQ |
| TanhDistortion | 0.25 | 0.01–0.3 distortion |
| PitchShift | 0.25 | ±3 semitones |
| BandStopFilter | 0.25 | 500–4000 Hz notch |
| AddColoredNoise | 0.25 | SNR 15–45 dB |
| Gain | 1.0 | ±6 dB |
| AddGaussianNoise | 0.3 | amp 0.001–0.015 |

Clips trimmed/padded to 32000 samples (2s @ 16kHz). 5 augmentation rounds for training, 2 for validation.

### 3. Features
`openwakeword.utils.AudioFeatures` (ONNX mode) converts int16 PCM → (n_frames, 96). 2-second clips produce ~25 frames. Training uses 16-frame windows.

### 4. Training (Multi-Sequence)
Three sequential rounds with decaying LR:

| Seq | LR | NegWeight | Steps |
|---|---|---|---|
| 1 | 1e-4 | 1→500 | 3000 |
| 2 | 1e-5 | 1→1000 | 300 |
| 3 | 1e-6 | 1→2000 | 300 |

Techniques:
- Cosine LR decay + warmup (1/5 steps) + hold (1/3 steps)
- High-loss filtering: backprop only on misclassified samples (pred ≥ 0.001 for neg, < 0.999 for pos)
- Dynamic negative weighting: negative loss weight scales up (1 → 500+) to suppress FPs
- Checkpoint merging: average all checkpoints above 90th percentile recall / below 10th percentile FP

### 5. ONNX Export
`torch.onnx.export(opset=13)` with dynamic batch dimension.

## Colab Notebook

A complete 10-cell Google Colab notebook is available at: `references/colab-openwakeword-training.py`

Copy cells into new Colab notebook → **Runtime → Run all** (T4 GPU recommended).

### Expected Runtime
- Data gen: 3–5 min | Augmentation: 2–4 min | Features: 5–8 min | Training: 5–10 min
- **Total: ~20–30 min** for 2 models, full pipeline.

## Local Deployment

```python
from openwakeword import Model
oww = Model(
    wakeword_models=["/path/to/leyna_wakeword.onnx", "/path/to/jeff_wakeword.onnx"],
    inference_framework="onnx"
)
# In 16kHz int16 audio loop:
result = oww.predict(frame)
if result["leyna_wakeword"] > 0.5: ...
```

## Pitfalls

- **Edge-TTS needs internet** — offline swap: Coqui TTS or Piper
- **Adversarial phrase coverage** — model only rejects phrases in training. Missing a similar-sounding phrase = FP
- **Feature model version lock** — openWakeWord's feature ONNX models ship with pip. Pin `openwakeword==0.7.0` in Colab to avoid shape mismatches
- **GPU memory** — batch 64 fits T4 (16GB). OOM? Reduce to 32
- **VOICES list in notebook is German** — swap for other languages
- **Colab `await` caveat**: top-level `await` works in Colab cells because IPython wraps each cell in an async context. Don't run the cells as a .py script directly without wrapping in `asyncio.run()`

## File Structure

The Colab reference creates this directory layout during training:
```
/content/
├── training_data/
│   ├── leyna/train/{positive,negative}/
│   ├── leyna/val/{positive,negative}/
│   ├── jeff/train/{positive,negative}/
│   └── jeff/val/{positive,negative}/
├── features/
│   └── {leyna,jeff}_{train_aug,val_aug}_{positive,negative}.npy
└── {leyna,jeff}_wakeword.onnx
```

Outputs go to Google Drive `MyDrive/Leyna_WakeWord_Models/` plus a ZIP download.

## Related

- `voice-assistant` — Integrating wake word into full voice pipeline
- `local-voice-assistant` — WSL/local voice assistant build
- `hermes-agent` — Hermes config, including per-platform model overrides
