// Onde Studio, version Windows : ouvre le logiciel (app/onde-studio.html, copie de
// dist/onde-studio.html) dans sa propre fenêtre. F11 ou Alt+Entrée : plein écran ;
// Ctrl+molette / Ctrl+0 : taille de l'interface. Les projets (« Mes projets ») sont rangés par
// Electron dans le dossier de l'application (%APPDATA%\Onde Studio).
const { app, BrowserWindow, Menu, session, shell, dialog } = require('electron');
const path = require('node:path');

// Le son doit pouvoir démarrer sans attendre un clic, et le micro / les claviers MIDI être autorisés.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#12151b',
    title: `Onde Studio ${app.getVersion()}`,
    icon: path.join(__dirname, 'app', 'onde-studio.ico'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
    if (input.control && input.key === 'F12') win.webContents.openDevTools({ mode: 'detach' });
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  // Exports (WAV, MIDI, projets) : boîte « Enregistrer sous » de Windows.
  session.defaultSession.on('will-download', (event, item) => {
    const target = dialog.showSaveDialogSync(win, { defaultPath: path.join(app.getPath('music'), item.getFilename()) });
    if (target) item.setSavePath(target); else item.cancel();
  });
  win.on('close', (e) => {
    // Laisse la page enregistrer le projet en cours avant de fermer.
    if (win.forceClose) return;
    e.preventDefault();
    const done = () => { win.forceClose = true; win.close(); };
    const timer = setTimeout(done, 4000);
    win.webContents.executeJavaScript('window.ondeBeforeClose ? window.ondeBeforeClose() : true')
      .catch(() => {})
      .finally(() => { clearTimeout(timer); done(); });
  });
  win.loadFile(path.join(__dirname, 'app', 'onde-studio.html'));
}

app.whenReady().then(() => {
  const allowed = new Set(['media', 'midi', 'midiSysex', 'fileSystem', 'clipboard-sanitized-write']);
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => callback(allowed.has(permission)));
  session.defaultSession.setPermissionCheckHandler((wc, permission) => allowed.has(permission));
  createWindow();
});
app.on('window-all-closed', () => app.quit());
