# Custom Electron Window Controls Setup
When removing native Electron title bar (frame: false), follow these steps to add custom window controls:

## 1. Electron Main Process (main.cjs)
Set `frame: false` in BrowserWindow options, add IPC handlers for minimize/maximize/close:
```javascript
const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    frame: false, // Remove native title bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Window control IPC handlers
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window-close', () => mainWindow.close());
}
```

## 2. Preload Script (preload.cjs)
Expose window.api for renderer process:
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close')
});
```

## 3. React Frontend (App.tsx)
Add custom title bar with draggable region per app style:
```tsx
<div 
  className="flex items-center justify-between mb-6 pb-3 border-b border-white/10" 
  style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
>
  <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
    <button className="text-xs text-white/50 hover:text-white transition" onClick={() => (window as any).api?.windowMinimize()}>−</button>
    <button className="text-xs text-white/50 hover:text-white transition" onClick={() => (window as any).api?.windowMaximize()}>□</button>
    <button className="text-xs text-red-400 hover:text-red-300 transition" onClick={() => (window as any).api?.windowClose()}>×</button>
  </div>
  <span className="text-[10px] uppercase tracking-[0.32em] text-white/35">APP_NAME</span>
</div>
```

## Key Notes
- Use `WebkitAppRegion: 'drag'` for draggable areas, `no-drag` for interactive elements (buttons)
- Keep UI style consistent with existing app (dense layout, #e85d04 accent, no emojis, SVG only)
- Migrate removed header/nav functionality to existing sidebar instead of deleting features