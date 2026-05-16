# Colab Notebook: openWakeWord Training für "Leyna" & "Jeff"
# Kopiere die folgenden 10 Zellen in ein neues Google Colab Notebook.
# Runtime → Run all (T4 GPU empfohlen).
# =============================================================================
# ZELLE 1: Google Drive mounten
# =============================================================================
from google.colab import drive
drive.mount('/content/drive')
DRIVE_MODEL_DIR = "/content/drive/MyDrive/Leyna_WakeWord_Models"
import os; os.makedirs(DRIVE_MODEL_DIR, exist_ok=True)
print(f"✅ Google Drive gemountet → {DRIVE_MODEL_DIR}")

# =============================================================================
# ZELLE 2: Abhängigkeiten installieren
# =============================================================================
!pip install -q edge-tts
!pip install -q openwakeword
!pip install -q audiomentations torch-audiomentations
!pip install -q soundfile librosa numpy scipy tqdm
!pip install -q torch torchinfo torchmetrics
!pip install -q onnx onnxruntime
print("✅ Alle Abhängigkeiten installiert")

# =============================================================================
# ZELLE 3: Feature-Extraktoren laden
# =============================================================================
from openwakeword.utils import AudioFeatures
print("📥 Lade openWakeWord Feature-Modelle...")
feature_extractor = AudioFeatures(device='cpu', ncpu=2, inference_framework='onnx')
print("✅ Feature-Extraktoren bereit")

# =============================================================================
# ZELLE 4: Parameter & Verzeichnisse
# =============================================================================
SAMPLE_RATE = 16000
TARGET_LENGTH = 32000       # 2 Sekunden @ 16 kHz
N_TRAIN_POS = 250           # Positive Trainings-Samples pro Wort
N_TRAIN_NEG = 250           # Negative Trainings-Samples
N_VAL_POS = 60
N_VAL_NEG = 60
AUG_ROUNDS_TRAIN = 5
AUG_ROUNDS_VAL = 2

DATA_DIR = "/content/training_data"
for sub in ["leyna/train/positive","leyna/train/negative",
            "leyna/val/positive","leyna/val/negative",
            "jeff/train/positive","jeff/train/negative",
            "jeff/val/positive","jeff/val/negative"]:
    os.makedirs(os.path.join(DATA_DIR, sub), exist_ok=True)
print(f"📁 {DATA_DIR}: {N_TRAIN_POS}+{N_TRAIN_NEG} Train / {N_VAL_POS}+{N_VAL_NEG} Val")

# =============================================================================
# ZELLE 5: Synthetische Daten (TTS)
# =============================================================================
import asyncio, edge_tts, numpy as np, soundfile as sf
import random, uuid
from pathlib import Path
from tqdm import tqdm

VOICES = [
    "de-DE-KatjaNeural","de-DE-ConradNeural","de-DE-AmalaNeural",
    "de-DE-BerndNeural","de-DE-ChristophNeural","de-DE-ElkeNeural",
    "de-DE-GiselaNeural","de-DE-KasperNeural","de-DE-KillianNeural",
    "de-DE-KlarissaNeural","de-DE-LouisaNeural","de-DE-MajaNeural",
    "de-DE-RalfNeural","de-DE-SeraphinaNeural","de-DE-TanjaNeural",
]

ADV_PHRASES = [
    "Lehne","Lehnen","Lehnt","Lena","Leina","Laine","Leine","Bleibe",
    "Kleine","Beine","Scheine","Meine","Deine","eine","keine","Meyna",
    "Reina","Sehne","zehne","weine","Heino","Steine","Elena","Helena",
    "Chef","Schäf","Steff","Stefan","Steffen","Steffi","Jeffrey","Geff",
    "Gef","Saft","Schaff","Treff","Treffer","Schlaff","Pfiff","Griff",
    "Brief","rief","lief","schlief","trief",
    "Hallo","Guten Tag","Wie geht es dir","Danke","Bitte",
    "Entschuldigung","Auf Wiedersehen","Tschüss","Computer","Musik",
    "Licht","Lampe","Temperatur","Heizung","Rolladen","Garage",
    "Alarmanlage","Start","Stopp","Wecker","Timer","Lautsprecher",
    "Fernseher","Radio","Heute","Morgen","Gestern","Wetter","Nachrichten"
]

async def gen_tts(text, path, voice):
    await edge_tts.Communicate(text, voice).save(path)

async def gen_positives(word, out_dir, n):
    exist = len(list(Path(out_dir).glob("*.wav")))
    need = n - exist
    if need <= 0: return
    texts = ([word]*(need//3) + [word.upper()]*(need//3) +
             [word.lower()]*(need - 2*(need//3)))[:need]
    for t in tqdm(texts, desc=f"'{word}'"):
        await gen_tts(t, os.path.join(out_dir, f"{uuid.uuid4().hex}.wav"),
                      random.choice(VOICES))

async def gen_negatives(phrases, out_dir, n):
    need = n - len(list(Path(out_dir).glob("*.wav")))
    if need <= 0: return
    for _ in tqdm(range(need), desc="Negatives"):
        await gen_tts(random.choice(phrases),
                      os.path.join(out_dir, f"{uuid.uuid4().hex}.wav"),
                      random.choice(VOICES))

async def generate_all():
    for w, wd in [("Leyna","leyna"),("Jeff","jeff")]:
        print(f"\n🔊 {w}:")
        await gen_positives(w, f"{DATA_DIR}/{wd}/train/positive", N_TRAIN_POS)
        await gen_positives(w, f"{DATA_DIR}/{wd}/val/positive", N_VAL_POS)
        await gen_negatives(ADV_PHRASES, f"{DATA_DIR}/{wd}/train/negative", N_TRAIN_NEG)
        await gen_negatives(ADV_PHRASES, f"{DATA_DIR}/{wd}/val/negative", N_VAL_NEG)
        print(f"  ✅ {w}")

await generate_all()
for r,_,fs in os.walk(DATA_DIR):
    w = [f for f in fs if f.endswith('.wav')]
    if w: print(f"  {r}: {len(w)} WAVs")

# =============================================================================
# ZELLE 6: Audio-Augmentation
# =============================================================================
import audiomentations as A
from concurrent.futures import ThreadPoolExecutor

augmenter = A.Compose([
    A.SevenBandParametricEQ(min_gain_db=-6, max_gain_db=6, p=0.25),
    A.TanhDistortion(min_distortion=0.01, max_distortion=0.3, p=0.25),
    A.PitchShift(min_semitones=-3, max_semitones=3, p=0.25),
    A.BandStopFilter(min_center_freq=500, max_center_freq=4000, p=0.25),
    A.AddColoredNoise(min_snr_in_db=15, max_snr_in_db=45, p=0.25),
    A.Gain(min_gain_db=-6, max_gain_db=6, p=1.0),
    A.AddGaussianNoise(min_amplitude=0.001, max_amplitude=0.015, p=0.3),
])

def load_audio(path):
    import librosa
    d, sr = sf.read(path)
    if len(d.shape) > 1: d = d.mean(axis=1)
    if sr != SAMPLE_RATE: d = librosa.resample(d, orig_sr=sr, target_sr=SAMPLE_RATE)
    return d.astype(np.float32)

def fix_len(audio):
    if len(audio) >= TARGET_LENGTH: return audio[:TARGET_LENGTH]
    pb = np.random.randint(0, 3000)
    pa = TARGET_LENGTH - len(audio) - pb
    return np.pad(audio, (max(0,pb), max(0,pa)), mode='constant')

def aug_one(args):
    inp, out = args
    try:
        a = load_audio(inp); a = fix_len(a)
        a = augmenter(samples=a, sample_rate=SAMPLE_RATE)
        sf.write(out, a, SAMPLE_RATE)
    except: pass

def augment_dir(in_dir, out_dir, rounds):
    os.makedirs(out_dir, exist_ok=True)
    wavs = list(Path(in_dir).glob("*.wav"))
    if not wavs: return 0
    tasks = [(str(w), os.path.join(out_dir, w.name)) for w in wavs]
    for w in wavs:
        for r in range(rounds):
            tasks.append((str(w), os.path.join(out_dir, f"{w.stem}_aug{r}.wav")))
    with ThreadPoolExecutor(max_workers=4) as ex:
        list(tqdm(ex.map(aug_one, tasks), total=len(tasks)))
    return len(tasks)

print("\n🎛 Augmentiere...")
for ww in ["leyna","jeff"]:
    for sp in ["train","val"]:
        r = AUG_ROUNDS_TRAIN if sp=="train" else AUG_ROUNDS_VAL
        for cl in ["positive","negative"]:
            n = augment_dir(f"{DATA_DIR}/{ww}/{sp}/{cl}",
                            f"{DATA_DIR}/{ww}/{sp}_aug/{cl}", r)
            print(f"  {ww}/{sp}/{cl}: {n}")
print("✅ Augmentation done")

# =============================================================================
# ZELLE 7: Feature-Extraktion
# =============================================================================
FEATURE_DIR = "/content/features"
os.makedirs(FEATURE_DIR, exist_ok=True)

def compute_features(wavs):
    all_f = []
    for fp in tqdm(wavs, desc="Features"):
        try:
            a = load_audio(fp); a = fix_len(a)
            f = feature_extractor.embed_clips(
                (a * 32767).astype(np.int16)[None,:], batch_size=1)
            all_f.append(f[0])
        except Exception as e:
            print(f"  ⚠ {Path(fp).name}: {e}")
    return np.array(all_f) if all_f else np.array([])

for ww in ["leyna","jeff"]:
    print(f"\n📊 {ww}:")
    for sp in ["train_aug","val_aug"]:
        for cl in ["positive","negative"]:
            d = f"{DATA_DIR}/{ww}/{sp}/{cl}"
            if not os.path.exists(d): continue
            w = [str(p) for p in Path(d).glob("*.wav")]
            if not w: continue
            f = compute_features(w)
            if f.size > 0:
                np.save(f"{FEATURE_DIR}/{ww}_{sp}_{cl}.npy", f)
                print(f"  {sp}/{cl}: {f.shape}")
print("✅ Features done")

# =============================================================================
# ZELLE 8: Modell & Trainer (PyTorch DNN)
# =============================================================================
import torch, torch.nn as nn
from torch import optim
from torch.utils.data import Dataset, DataLoader
import torchmetrics, collections, copy

class FCNB(nn.Module):
    def __init__(self, d):
        super().__init__()
        self.fc = nn.Linear(d,d); self.r = nn.ReLU(); self.ln = nn.LayerNorm(d)
    def forward(self, x): return self.r(self.ln(self.fc(x)))

class OWWNet(nn.Module):
    def __init__(self, ish=(16,96), d=128, b=3, c=1):
        super().__init__()
        self.flat = nn.Flatten()
        self.fc1 = nn.Linear(ish[0]*ish[1], d)
        self.r1 = nn.ReLU(); self.ln1 = nn.LayerNorm(d)
        self.bs = nn.ModuleList([FCNB(d) for _ in range(b)])
        self.out = nn.Linear(d, c); self.sig = nn.Sigmoid()
    def forward(self, x):
        x = self.r1(self.ln1(self.fc1(self.flat(x))))
        for b in self.bs: x = b(x)
        return self.sig(self.out(x))

class DS(Dataset):
    def __init__(self, fp, fn):
        X = np.vstack([fp,fn]) if len(fp) and len(fn) else (fp if len(fp) else fn)
        y = np.array([1]*len(fp)+[0]*len(fn))
        ix = np.random.permutation(len(X)); self.X, self.y = X[ix], y[ix]
    def __len__(self): return len(self.X)
    def __getitem__(self, i):
        return torch.from_numpy(self.X[i]).float(), torch.tensor(self.y[i], dtype=torch.float32)

class TR:
    def __init__(self, ish=(16,96)):
        self.d = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"📦 {self.d}")
        self.m = OWWNet(ish).to(self.d); self.ish = ish
        self.lf = nn.BCELoss(reduction='none')
        self.op = optim.Adam(self.m.parameters(), lr=1e-4)
        self.rec = torchmetrics.Recall(task='binary').to(self.d)
        self.acc = torchmetrics.Accuracy(task='binary').to(self.d)
        self.h = collections.defaultdict(list)
        self.bm = []; self.bs = []
    def _lr(self, s, w, h, t, tl=1e-4):
        if s < w: return tl*s/w
        if s < w+h: return tl
        p = (s-w-h)/(t-w-h); return 0.5*tl*(1+np.cos(np.pi*p))
    def ts(self, dl, mnw=500, off=0, steps=3000, wm=600, hd=1000):
        self.m.train(); tl=0
        for st,(x,y) in enumerate(dl):
            gs=off+st
            if gs>=steps: break
            x,y=x.to(self.d),y.to(self.d)
            nw=1+(mnw-1)*(gs/steps)
            wt=torch.ones_like(y); wt[y==0]=nw
            lr=self._lr(gs,wm,hd,steps)
            for g in self.op.param_groups: g['lr']=lr
            self.op.zero_grad()
            pr=self.m(x).squeeze()
            mk=((y==0)&(pr>=0.001))|((y==1)&(pr<0.999))
            if mk.sum()==0: continue
            L=(self.lf(pr[mk],y[mk])*wt[mk]).mean()
            L.backward(); self.op.step(); tl+=L.item()
            if gs%500==0 and gs>0: print(f"  Step {gs:5d} | Loss: {tl/(st+1):.4f}")
    def val(self, dl):
        self.m.eval(); prs,lbs=[],[]
        with torch.no_grad():
            for x,y in dl:
                x,y=x.to(self.d),y.to(self.d)
                prs.append(self.m(x).squeeze().cpu()); lbs.append(y.cpu())
        prs=torch.cat(prs); lbs=torch.cat(lbs)
        return self.acc(prs,lbs.long()).item(), self.rec(prs,lbs.long()).item()
    def auto(self, dl, vdl, seq=3, sps=3000):
        print("\n"+"="*60); print("🏋️ TRAINING"); print("="*60)
        mnw, off = 500, 0
        for s in range(seq):
            print(f"\nSeq {s+1}/{seq} | NegW: {mnw}")
            self.ts(dl, mnw=mnw, off=off, steps=sps)
            va, vr = self.val(vdl)
            print(f"  📊 Acc={va:.4f} | Recall={vr:.4f}")
            self.h["va"].append(va); self.h["vr"].append(vr)
            if vr >= np.percentile(self.h["vr"], 5):
                self.bm.append(copy.deepcopy(self.m.state_dict()))
                self.bs.append({"va":va,"vr":vr})
            mnw *= 2; off += sps
        if self.bm:
            print(f"🧬 Merge {len(self.bm)} checkpoints...")
            a = copy.deepcopy(self.bm[0])
            for k in a: a[k] = sum(m[k].float() for m in self.bm)/len(self.bm)
            self.m.load_state_dict(a)
        va,vr = self.val(vdl)
        print(f"🏆 Acc={va:.4f} | Recall={vr:.4f}")
        return self.m
    def onnx(self, p):
        self.m.eval()
        d = torch.randn(1,self.ish[0],self.ish[1])
        torch.onnx.export(self.m.to("cpu"), d, p,
            input_names=["input"], output_names=["score"],
            dynamic_axes={"input":{0:"batch"}}, opset_version=13)
        print(f"✅ ONNX: {p}")

# =============================================================================
# ZELLE 9: Training "Leyna" + "Jeff"
# =============================================================================
def train_one(name, label):
    print(f"\n{'#'*70}\n##  {label}\n{'#'*70}")
    tp=np.load(f"{FEATURE_DIR}/{name}_train_aug_positive.npy")
    tn=np.load(f"{FEATURE_DIR}/{name}_train_aug_negative.npy")
    vp=np.load(f"{FEATURE_DIR}/{name}_val_aug_positive.npy")
    vn=np.load(f"{FEATURE_DIR}/{name}_val_aug_negative.npy")
    print(f"  Train: {len(tp)} pos + {len(tn)} neg")
    print(f"  Val:   {len(vp)} pos + {len(vn)} neg")
    T = TR()
    dl = DataLoader(DS(tp,tn), batch_size=64, shuffle=True)
    vdl = DataLoader(DS(vp,vn), batch_size=64, shuffle=False)
    T.auto(dl, vdl, seq=3, sps=3000)
    T.onnx(f"/content/{name}_wakeword.onnx")
    T.onnx(f"{DRIVE_MODEL_DIR}/{name}_wakeword.onnx")

train_one("leyna", "Leyna 👩")
train_one("jeff",  "Jeff 🧔")
print("✅✅ BEIDE MODELLE FERTIG!")

# =============================================================================
# ZELLE 10: Drive-Sicherung + ZIP + Anleitung
# =============================================================================
from datetime import datetime; from google.colab import files; import shutil
ts = datetime.now().strftime("%Y%m%d_%H%M%S")
for src, nm in [("/content/leyna_wakeword.onnx","leyna"),("/content/jeff_wakeword.onnx","jeff")]:
    shutil.copy2(src, f"{DRIVE_MODEL_DIR}/{nm}_wakeword_{ts}.onnx")

readme = f"""openWakeWord Modelle: Leyna & Jeff (Trainiert: {datetime.now().strftime("%d.%m.%Y %H:%M")})
Dateien: leyna_wakeword.onnx, jeff_wakeword.onnx
Verwendung: from openwakeword import Model
  oww = Model(wakeword_models=["leyna_wakeword.onnx","jeff_wakeword.onnx"], inference_framework="onnx")
  result = oww.predict(audio_frame_16khz_int16)
  if result["leyna_wakeword"] > 0.5: ...
  if result["jeff_wakeword"] > 0.5: ...
"""
with open(f"{DRIVE_MODEL_DIR}/README.txt","w") as f: f.write(readme)

zip_p = f"/content/Leyna_Jeff_WakeWord_{ts}.zip"
with shutil.ZipFile(zip_p,"w") as z:
    for f in ["/content/leyna_wakeword.onnx","/content/jeff_wakeword.onnx"]:
        z.write(f, os.path.basename(f))
    for r,_,fs in os.walk(DRIVE_MODEL_DIR):
        for f in fs: z.write(os.path.join(r,f), f"drive/{f}")

print(f"📦 {zip_p}"); files.download(zip_p)
print("""
╔══════════════════════════════════════════════════════╗
║  Modelle → D:\\hermes\\Leyna\\ kopieren               ║
╚══════════════════════════════════════════════════════╝
In WSL: /mnt/d/hermes/Leyna/leyna_wakeword.onnx
        /mnt/d/hermes/Leyna/jeff_wakeword.onnx
""")
