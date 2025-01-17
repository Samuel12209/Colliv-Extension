"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ws_1 = __importDefault(require("ws"));
let wsServer = null;
let wsClient = null;
let isHosting = false;
let workspacePath;
let saveTimeout = null;
const SAVE_DELAY = 100;
function activate(context) {
    const startServerCommand = vscode.commands.registerCommand('colliv.startServer', () => {
        if (isHosting) {
            vscode.window.showInformationMessage('You are already hosting a session.');
            return;
        }
        const portNum = 5000;
        const ip = '127.0.0.1';
        wsServer = new ws_1.default.Server({ host: ip, port: portNum });
        isHosting = true;
        wsServer.on('connection', (socket) => {
            vscode.window.showInformationMessage('A client has joined the session.');
            if (workspacePath) {
                const files = getFilesRecursively(workspacePath);
                socket.send(JSON.stringify({ type: 'fileSync', files }));
            }
            socket.on('message', (message) => {
                const data = JSON.parse(message.toString());
                if (data.type === 'fileUpdate' && workspacePath) {
                    const filePath = path.join(workspacePath, data.fileName);
                    const currentContent = fs.readFileSync(filePath, 'utf8');
                    if (currentContent !== data.content) {
                        fs.writeFileSync(filePath, data.content, 'utf8');
                        // After writing to file, send updated content to the client
                        socket.send(JSON.stringify({ type: 'fileUpdate', fileName: data.fileName, content: data.content }));
                    }
                }
            });
        });
        wsServer.on('listening', () => {
            vscode.window.showInformationMessage(`Server running on ws://${ip}:${portNum}.`);
        });
    });
    const joinSessionCommand = vscode.commands.registerCommand('colliv.joinSession', async () => {
        if (isHosting) {
            vscode.window.showInformationMessage('You cannot join a session while hosting.');
            return;
        }
        const ip = await vscode.window.showInputBox({ prompt: 'Enter the server IP to join' });
        const port = await vscode.window.showInputBox({ prompt: 'Enter the server port' });
        if (!ip || !port) {
            vscode.window.showInformationMessage('Invalid IP or port.');
            return;
        }
        wsClient = new ws_1.default(`ws://${ip}:${port}`);
        wsClient.on('open', () => {
            vscode.window.showInformationMessage('Connected to the session!');
        });
        wsClient.on('message', (message) => {
            const data = JSON.parse(message.toString());
            if (data.type === 'fileSync' && workspacePath) {
                data.files.forEach((file) => {
                    if (workspacePath) {
                        const filePath = path.join(workspacePath, file.path);
                        fs.mkdirSync(path.dirname(filePath), { recursive: true });
                        fs.writeFileSync(filePath, file.content, 'utf8');
                    }
                    else {
                        vscode.window.showErrorMessage('Workspace path is not defined. Please open a folder in your workspace.');
                    }
                });
                vscode.window.showInformationMessage('Files synced from the host!');
            }
            else if (data.type === 'fileUpdate' && workspacePath) {
                const filePath = path.join(workspacePath, data.fileName);
                fs.writeFileSync(filePath, data.content, 'utf8');
            }
        });
        wsClient.on('error', (error) => {
            vscode.window.showInformationMessage(`Error: ${error}`);
        });
    });
    const stopSessionCommand = vscode.commands.registerCommand('colliv.stopSession', () => {
        if (wsServer) {
            wsServer.close();
            wsServer = null;
            isHosting = false;
            vscode.window.showInformationMessage('Stopped hosting the session.');
        }
    });
    const leaveSessionCommand = vscode.commands.registerCommand('colliv.leaveSession', () => {
        if (wsClient) {
            wsClient.close();
            wsClient = null;
            vscode.window.showInformationMessage('Left the session.');
        }
    });
    workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspacePath) {
        vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.scheme === 'file' && wsServer) {
                const filePath = e.document.uri.fsPath;
                const fileName = path.relative(workspacePath, filePath);
                const content = e.document.getText();
                if (saveTimeout) {
                    clearTimeout(saveTimeout);
                }
                saveTimeout = setTimeout(() => {
                    fs.writeFileSync(filePath, content, 'utf8');
                    // Check if wsServer is not null
                    if (wsServer && wsServer.clients) {
                        wsServer.clients.forEach((client) => {
                            if (client.readyState === ws_1.default.OPEN) {
                                client.send(JSON.stringify({ type: 'fileUpdate', fileName, content }));
                            }
                        });
                    }
                }, SAVE_DELAY);
            }
        });
    }
    else {
        vscode.window.showErrorMessage('Workspace path is not defined. Please open a folder in your workspace.');
    }
    context.subscriptions.push(startServerCommand, joinSessionCommand, stopSessionCommand, leaveSessionCommand);
}
function getFilesRecursively(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(filePath));
        }
        else {
            results.push({ path: path.relative(workspacePath, filePath), content: fs.readFileSync(filePath, 'utf8') });
        }
    });
    return results;
}
function deactivate() {
    if (wsServer) {
        wsServer.close();
    }
    if (wsClient) {
        wsClient.close();
    }
}
//# sourceMappingURL=extension.js.map