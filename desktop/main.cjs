// Anyem, version Windows : ouvre le jeu (game/anyem.html, copie de dist/anyem.html) dans sa
// propre fenêtre, sans barre d'adresse ni menu. F11 : plein écran ; Alt+Entrée aussi.
// Les sauvegardes (stockage local du jeu) sont rangées par Electron dans le dossier de
// l'application (%APPDATA%\Anyem) : elles ne dépendent plus de l'emplacement du fichier.
const { app, BrowserWindow, Menu } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#07080f',
    title: `Anyem ${app.getVersion()}`,
    icon: path.join(__dirname, 'game', 'anyem.ico'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  // Les liens externes (crédits…) s'ouvrent dans le navigateur, pas dans le jeu.
  win.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadFile(path.join(__dirname, 'game', 'anyem.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
