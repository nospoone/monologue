'use strict';

const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;
let nodeEditorWindow = null;
const path = require('path');

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		minWidth: 475,
		minHeight: 300,
		frame: false,
		icon: path.resolve('./img/icon.png')
	});

	// and load the index.html of the app.
	mainWindow.loadURL(path.join('file://', __dirname, `/views/index.html?id=${mainWindow.id}`));

	// Open the DevTools.
	mainWindow.webContents.openDevTools();

	// Emitted when the window is closed.
	mainWindow.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});

	// debug
	nodeEditorWindow = new BrowserWindow({
		width: 835,
		height: 600,
		minWidth: 835,
		minHeight: 600,
		frame: false,
		icon: path.resolve('./img/icon.png'),
		show: false
	});

	// and load the index.html of the app.
	nodeEditorWindow.loadURL(path.join('file://', __dirname, `/views/editor.html?id=${nodeEditorWindow.id}`));

	// Open the DevTools.
	nodeEditorWindow.webContents.openDevTools();

	// Emitted when the window is closed.
	nodeEditorWindow.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		nodeEditorWindow = null;
	});
});

electron.ipcMain.on('openNodeEditor', () => {
	nodeEditorWindow.show();
});

electron.ipcMain.on('closeNodeEditor', () => {
	nodeEditorWindow.hide();
});
