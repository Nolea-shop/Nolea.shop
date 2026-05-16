# openWakeWord Custom Model Training

Train custom wake-word models (`leyna_wakeword.onnx`, `jeff_wakeword.onnx`, etc.) for use with `openwakeword.Model`.

## When to Use

- Custom wake word needed (beyond Porcupine's built-in "Computer" / "Hey Google")
- Fully local inference with openWakeWord ONNX runtime
- 200+ TTS samples available per wake word

## Pipeline

```
TTS Generation (Edge-TTS) → Audio Augmentation
  → Feature Extraction (openWakeWord)
  → PyTorch DNN Training (3 sequences)
  → ONNX Export
```

## Step-by-Step

### 1. Synthetic Data via Edge-TTS

15 German voices available. Use **async concurrency** to avoid ~50min sequential generation:

```python
import asyncio, edge_tts
sem = asyncio.Semaphore(5)

async def gen_tts(text, path, voice, retries=3):
    for attempt in range(retries):
        try:
            c = edge_tts.Communicate(text, voice)
            await c.save(path)
            return
        except Exception:
            await asyncio.sleep(1 if attempt < retries-1 else 0)

# Concurrent batch:
tasks = [gen_tts(t, out_path, random.choice(VOICES)) for t in texts]
for f in tqdm(asyncio.as_completed(tasks), total=len(tasks)):
    await f
```

**German voices:** KatjaNeural, ConradNeural, AmalaNeural, BerndNeural, ChristophNeural, ElkeNeural, GiselaNeural, KasperNeural, KillianNeural, KlarissaNeural, LouisaNeural, MajaNeural, RalfNeural, SeraphinaNeural, TanjaNeural (all `de-DE-*`).

**Adversarial phrases:** Include phonetically similar words AND general speech from the target domain.

### 2. Audio Augmentation

Standard openWakeWord augmentation set:

```python
import audiomentations as A
augmenter = A.Compose([
    A.SevenBandParametricEQ(min_gain_db=-6, max_gain_db=6, p=0.25),
    A.TanhDistortion(min_distortion=0.01, max_distortion=0.3, p=0.25),
    A.PitchShift(min_semitones=-3, max_semitones=3, p=0.25),
    A.BandStopFilter(min_center_freq=500, max_center_freq=4000, p=0.25),
    A.AddColorNoise(min_snr_db=15, max_snr_db=45, p=0.25),
    A.Gain(min_gain_db=-6, max_gain_db=6, p=1.0),
    A.AddGaussianNoise(min_amplitude=0.001, max_amplitude=0.015, p=0.3),
])
```

**Pitfall:** `AddColorNoise` (not `AddColoredNoise`). Params are `min_snr_db`/`max_snr_db` (not `min_snr_in_db`). Renamed in newer audiomentations.

### 3. Feature Extraction

```python
from openwakeword.utils import AudioFeatures

# Newer versions: no device/inference_framework params
feature_extractor = AudioFeatures(ncpu=2)

# Input: int16 PCM, 16kHz, 2 sec (32000 samples)
# Output: (1, 16, 96) — 16 frames × 96 embedding dims
features = feature_extractor.embed_clips(audio_int16[None, :], batch_size=1)
```

**Pitfall:** Older `AudioFeatures(device='cpu', ncpu=2, inference_framework='onnx')` fails on newer versions. Constructor is just `AudioFeatures(ncpu=N)`.

### 4. Model Architecture

Identical to openWakeWord `train.py`:

```
Input (16, 96) → Flatten → Linear(1536→128) → LayerNorm → ReLU
  → [FCNBlock(128)] ×3  (each: Linear→LayerNorm→ReLU)
  → Linear(128→1) → Sigmoid → Score(0-1)
```

### 5. Training

Three-sequence training with cosine decay LR:

| Seq | LR | Steps | NegWeight | Purpose |
|-----|----|-------|-----------|---------|
| 1 | 1e-4 | 3000 | 1→500 | Primary |
| 2 | 1e-5 | 300 | 2× prev | Fine-tune, reduce FP |
| 3 | 1e-6 | 300 | 2× prev | Polish |

**Key techniques:**
- **Weighted loss:** Negative weight ramps from 1× to 500× during sequence 1
- **High-loss filtering:** Only backpropagate samples with `loss > 0.001` (openWakeWord approach)
- **Checkpoint merging:** Average top checkpoints (by validation recall percentile)

### 6. ONNX Export

```python
model.eval()
model.to("cpu")
dummy = torch.randn(1, 16, 96)
torch.onnx.export(model, dummy, "model.onnx",
    input_names=["input"], output_names=["score"],
    opset_version=18)
```

**Pitfall (PyTorch 2.12+):** Requires `pip install onnxscript`. New exporter uses `torch.export.export()`. Opset defaults to 18+.

### 7. Usage

```python
from openwakeword import Model
oww = Model(
    wakeword_models=["leyna_wakeword.onnx", "jeff_wakeword.onnx"],
    inference_framework="onnx"
)
result = oww.predict(audio_frame_16khz_int16)
if result["leyna_wakeword"] > 0.5: ...
```

## Expected Quality

| Data | Acc | Recall |
|------|-----|--------|
| 200 TTS only | ~60% | ~45% |
| TTS + 50 real | ~75% | ~70% |
| 500+ real | ~90%+ | ~85%+ |

## Pitfalls

- **Sequential TTS is too slow:** Always use `asyncio.as_completed` + `Semaphore(5)`. Sequential = ~50min, concurrent = ~10min.
- **Library version mismatches:**
  - `AddColoredNoise` → `AddColorNoise`, params `min_snr_in_db` → `min_snr_db`
  - `AudioFeatures(device=..., inference_framework=...)` → `AudioFeatures(ncpu=...)`
  - PyTorch 2.12+ needs `onnxscript` for ONNX export
- **Synthetic-only data is too clean:** Mix in real mic recordings for production. Real-world room acoustics and mic artifacts aren't captured by TTS.
- **False positive tuning:** Increase negative samples or max_negative_weight if model triggers too often.