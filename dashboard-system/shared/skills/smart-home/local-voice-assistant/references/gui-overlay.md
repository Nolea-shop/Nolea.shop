# GUI Overlay (tkinter Notch)

A system-level always-on-top notification notch that shows:
- **Status dot** (color-coded): idle / listening / transcribing / thinking / speaking / hermes
- **Live transcription text**: shows what the user said and the assistant's response
- **Drag capability**: click-and-drag to reposition the notch

## Key Techniques

### Always-on-Top Transparent Window

```python
root = tk.Tk()
root.overrideredirect(True)                    # No frame/title bar
root.attributes('-topmost', True)              # Stay above all windows
root.attributes('-transparentcolor', '#000001')  # Make a color transparent
root.configure(bg='#000001')
```

### Rounded Rectangle via Canvas Polygon

Use `create_polygon` with `smooth=True` and `joinstyle="round"`. The polygon traces the outline of a rectangle with rounded corners:

```python
def rounded_rect(canvas, x1, y1, x2, y2, r, **kwargs):
    """Draw a rectangle with rounded corners using a polygon"""
    points = [
        x1+r, y1, x2-r, y1,          # top edge
        x2-r, y1, x2, y1+r,          # top-right corner
        x2, y1+r, x2, y2-r,          # right edge
        x2, y2-r, x2-r, y2,          # bottom-right corner
        x2-r, y2, x1+r, y2,          # bottom edge
        x1+r, y2, x1, y2-r,          # bottom-left corner
        x1, y2-r, x1, y1+r,          # left edge
        x1, y1+r, x1+r, y1,          # top-left corner
    ]
    return canvas.create_polygon(points, **kwargs, smooth=True, joinstyle="round")
```

### Drag-to-Move

Bind mouse events on the background shape:

```python
canvas.tag_bind(shape, "<Button-1>", drag_start)
canvas.tag_bind(shape, "<B1-Motion>", drag_move)

def drag_start(event):
    root._drag_x = event.x
    root._drag_y = event.y

def drag_move(event):
    x = root.winfo_x() + event.x - root._drag_x
    y = root.winfo_y() + event.y - root._drag_y
    root.geometry(f"+{x}+{y}")
```

### Thread-Safe UI Updates

Tkinter is NOT thread-safe. Use a queue + `after()` polling pattern:

```python
import queue
self.update_queue = queue.Queue()

def _poll_queue(self):
    try:
        while True:
            fn = self.update_queue.get_nowait()
            fn()  # Execute the update function on main thread
    except queue.Empty:
        pass
    self.root.after(50, self._poll_queue)  # Poll every 50ms

def _update(self, fn):
    self.update_queue.put(fn)

# Usage from any thread:
self._update(lambda: canvas.itemconfig(dot, fill="#00cc44"))
```

### Status Dot Color Mapping

| State    | Hex      | Intent                              |
|----------|----------|-------------------------------------|
| Idle     | `#666666` | Waiting for wake-word              |
| Listen   | `#00cc44` | Recording voice                    |
| Think    | `#ffaa00` | Transcribing or LLM processing    |
| Speak    | `#4488ff` | TTS audio output                   |
| Hermes   | `#ff4400` | Delegated to Hermes Agent         |

## Complete Overlay Class Structure

```python
class NotchOverlay:
    def __init__(self):
        # Window setup (transparent, topmost, no frame)
        # Canvas with rounded rect background
        # Status dot (oval)
        # Text elements (transcription, status line)
        # Close button + drag handlers
        # Queue for thread-safe updates
    
    def set_idle(self):     ...  # Gray dot, "Warte auf Wake-Word"
    def set_listening(self): ...  # Green dot
    def set_transcribing(self): ...  # Yellow dot
    def set_thinking(self):  ...  # Yellow dot, "Denke..."
    def set_speaking(self):  ...  # Blue dot
    def set_hermes(self):    ...  # Orange dot
    def show_text(self, text, is_user=True):  # Update live text
    def stop(self):  # Clean shutdown
    def run(self):   # Start mainloop
```

## Startup in Separate Thread

The tkinter mainloop blocks. Run it in a daemon thread:

```python
import threading, time

overlay = None
def start_overlay():
    global overlay
    overlay = NotchOverlay()
    overlay.run()  # blocks — runs in thread

t = threading.Thread(target=start_overlay, daemon=True)
t.start()
time.sleep(1)  # Wait for tkinter initialisation
```

## Pitfalls

- **tkinter is not thread-safe**: ALL widget modifications must go through the queue. Direct calls from worker threads will cause crashes or visual corruption.
- **Windows DPI scaling**: On high-DPI displays, the notch may appear smaller than expected. Set `tkinter.font.nametofont("TkDefaultFont").configure(size=11)`.
- **Close button**: A hard close (`root.quit(); root.destroy()`) is needed for clean shutdown since `overrideredirect(True)` removes the window manager close button.
