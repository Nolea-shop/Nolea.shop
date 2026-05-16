#!/usr/bin/env python3
"""
notch-overlay.py — tkinter GUI Notch for Voice Assistant
=========================================================
Standalone widget: a rounded, always-on-top, transparent overlay
with a status dot and live text display.

Usage:
    overlay = NotchOverlay()
    overlay.run()                         # blocking (own thread)
    # or
    overlay = start_overlay()             # non-blocking thread
    overlay.set_listening()
    overlay.show_text("User said: hello", is_user=True)

Colors:
    DOT_IDLE   "#666666" — waiting for wake-word
    DOT_LISTEN "#00cc44" — recording
    DOT_THINK  "#ffaa00" — transcribing / computing
    DOT_SPEAK  "#4488ff" — speaking via TTS
    DOT_HERMES "#ff4400" — delegating to Hermes
"""

import tkinter as tk
import threading
import queue

BG = "#1a1a1a"
DOT_IDLE = "#666666"
DOT_LISTEN = "#00cc44"
DOT_THINK = "#ffaa00"
DOT_SPEAK = "#4488ff"
DOT_HERMES = "#ff4400"


class NotchOverlay:
    def __init__(self, width=520, height=72, y_offset=8):
        self.root = tk.Tk()
        self.root.overrideredirect(True)
        self.root.attributes("-topmost", True)
        self.root.attributes("-transparentcolor", "#000001")
        self.root.configure(bg="#000001")

        self.running = True
        self._queue = queue.Queue()

        x = (self.root.winfo_screenwidth() - width) // 2
        self.root.geometry(f"{width}x{height}+{x}+{y_offset}")

        self.canvas = tk.Canvas(
            self.root, width=width, height=height,
            bg="#000001", highlightthickness=0
        )
        self.canvas.pack()

        # Rounded background rect
        r = 20
        pts = [
            10+r, 10, width-10-r, 10,
            width-10, 10+r, width-10, height-10-r,
            width-10-r, height-10, 10+r, height-10,
            10, height-10-r, 10, 10+r,
        ]
        self._bg = self.canvas.create_polygon(
            pts, fill=BG, outline="", smooth=True, joinstyle="round"
        )

        # Status dot + ring
        self._dot = self.canvas.create_oval(24, 26, 48, 50, fill=DOT_IDLE)
        self._ring = self.canvas.create_oval(20, 22, 52, 54, outline="", width=2)

        # Text
        self._text = self.canvas.create_text(
            width // 2, 26, text="Bereit...", fill="#888888",
            font=("Segoe UI", 11), anchor="center", width=440
        )
        self._status = self.canvas.create_text(
            width // 2, 52, text="🔇 Warte auf Wake-Word", fill="#555555",
            font=("Segoe UI", 9), anchor="center"
        )

        # Close button
        self._close = self.canvas.create_text(
            width - 20, 18, text="X", fill="#555555",
            font=("Segoe UI", 10, "bold"), anchor="center"
        )
        self.canvas.tag_bind(self._close, "<Button-1>", lambda e: self.stop())

        # Drag
        self.canvas.tag_bind(self._bg, "<Button-1>", self._drag_start)
        self.canvas.tag_bind(self._bg, "<B1-Motion>", self._drag_move)

        self.root.after(100, self._poll_queue)

    # --- Drag ---
    def _drag_start(self, e):
        self._dx, self._dy = e.x, e.y

    def _drag_move(self, e):
        cx = self.root.winfo_x() + e.x - self._dx
        cy = self.root.winfo_y() + e.y - self._dy
        self.root.geometry(f"+{cx}+{cy}")

    # --- Queue thread-safety ---
    def _poll_queue(self):
        if not self.running:
            return
        while True:
            try:
                self._queue.get_nowait()()
            except queue.Empty:
                break
        self.root.after(50, self._poll_queue)

    def _schedule(self, fn):
        self._queue.put(fn)

    # --- Public API ---
    def set_idle(self):
        self._schedule(lambda: self.canvas.itemconfig(self._dot, fill=DOT_IDLE))
        self._schedule(lambda: self.canvas.itemconfig(self._ring, outline=""))
        self._schedule(lambda: self.canvas.itemconfig(
            self._text, text="Bereit...", fill="#888888"))
        self._schedule(lambda: self.canvas.itemconfig(
            self._status, text="🔇 Warte auf Wake-Word", fill="#555555"))

    def set_listening(self):
        self._schedule(lambda: self.canvas.itemconfig(self._dot, fill=DOT_LISTEN))
        self._schedule(lambda: self.canvas.itemconfig(self._ring, outline=DOT_LISTEN))
        self._schedule(lambda: self.canvas.itemconfig(
            self._status, text="🎙 Sprich jetzt...", fill=DOT_LISTEN))

    def set_transcribing(self):
        self._schedule(lambda: self.canvas.itemconfig(self._dot, fill=DOT_THINK))
        self._schedule(lambda: self.canvas.itemconfig(self._ring, outline=DOT_THINK))
        self._schedule(lambda: self.canvas.itemconfig(
            self._status, text="📝 Transkribiere...", fill=DOT_THINK))

    def set_thinking(self):
        self._schedule(lambda: self.canvas.itemconfig(self._dot, fill=DOT_THINK))
        self._schedule(lambda: self.canvas.itemconfig(self._ring, outline=DOT_THINK))
        self._schedule(lambda: self.canvas.itemconfig(
            self._status, text="🤖 Denke...", fill=DOT_THINK))

    def set_speaking(self):
        self._schedule(lambda: self.canvas.itemconfig(self._dot, fill=DOT_SPEAK))
        self._schedule(lambda: self.canvas.itemconfig(self._ring, outline=DOT_SPEAK))
        self._schedule(lambda: self.canvas.itemconfig(
            self._status, text="🔊 Antworte...", fill=DOT_SPEAK))

    def set_hermes(self):
        self._schedule(lambda: self.canvas.itemconfig(self._dot, fill=DOT_HERMES))
        self._schedule(lambda: self.canvas.itemconfig(self._ring, outline=DOT_HERMES))
        self._schedule(lambda: self.canvas.itemconfig(
            self._status, text="⚡ Hermes arbeitet...", fill=DOT_HERMES))

    def show_text(self, text, is_user=True):
        fill = "#00cc44" if is_user else "#ffffff"
        display = text[:60] + "..." if len(text) > 60 else text
        self._schedule(lambda: self.canvas.itemconfig(
            self._text, text=display, fill=fill))

    def stop(self):
        self.running = False
        self.root.quit()
        self.root.destroy()

    def run(self):
        self.root.mainloop()


# --- Singleton Constructor ---

_overlay = None

def get_overlay():
    global _overlay
    if _overlay is None:
        _overlay = NotchOverlay()
    return _overlay

def start_overlay():
    """Start overlay in a daemon thread, return the overlay handle."""
    t = threading.Thread(target=lambda: get_overlay().run(), daemon=True)
    t.start()
    import time
    time.sleep(0.5)  # Wait for tkinter init
    return get_overlay()


# --- Self-Test ---
if __name__ == "__main__":
    g = start_overlay()
    g.set_idle()
    import time
    time.sleep(2)
    g.set_listening()
    g.show_text("Spotify nächsten Song", is_user=True)
    time.sleep(2)
    g.set_thinking()
    time.sleep(2)
    g.set_speaking()
    g.show_text("Nächster Song!", is_user=False)
    time.sleep(2)
    g.set_hermes()
    time.sleep(2)
    g.set_idle()
    get_overlay().root.mainloop()
