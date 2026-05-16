# Custom Wake-Word Training — "Leyna" ("laynuh")

## Colab Notebook

https://colab.research.google.com/github/dscripka/openWakeWord/blob/main/notebooks/automatic_model_training.ipynb

## Steps (10 minutes)

1. Open the Colab notebook (link above)
2. Runtime → Change runtime type → T4 GPU
3. Run all cells up to "Step 1" (cells 1-16)
4. In cell 13, modify the config:
   ```python
   config['target_word'] = 'laynuh'
   config['model_name'] = 'leyna'
   ```
5. Run cell 17: `!python ... --generate_clips` (~10 min, generates 500+ synthetic clips)
6. Run cell 18: `!python ... --augment_clips` (adds noise/reverb)
7. Run cell 19: `!python ... --train_model` (~2 min)
8. Download: Files panel → `openwakeword/openwakeword/training_output/leyna.onnx`
9. Place at: `D:\hermes\GemmaAssistant\leyna.onnx`

## Verification

Start the assistant — it should print:
```
✓ Custom Wake-Word geladen: D:\hermes\GemmaAssistant\leyna.onnx
```

## Fallback

Until custom model is trained, "alexa" (built-in openWakeWord) is used.
