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
const ws_1 = __importDefault(require("ws")); // Default import
let wsServer = null;
let wsClient = null;
let isHosting = false;
function activate(context) {
    const startServerCommand = vscode.commands.registerCommand('colliv.startServer', () => {
        if (isHosting) {
            vscode.window.showInformationMessage('You are already hosting a session.');
            return;
        }
        // Start WebSocket server
        const portNum = 5000;
        const ip = '127.0.0.1'; // Localhost
        wsServer = new ws_1.default.Server({ host: ip, port: portNum });
        wsServer.on('connection', (socket) => {
            vscode.window.showInformationMessage('A client has joined the session.');
            socket.on('message', (message) => {
                console.log(`Received message: ${message}`);
            });
        });
        wsServer.on('listening', () => {
            vscode.window.showInformationMessage(`Server running on ws://${ip}:${portNum}. Anyone with this IP and port can connect!`);
        });
        isHosting = true;
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
            if (wsClient) {
                wsClient.send('Hello from the client!');
            }
        });
        wsClient.on('message', (message) => {
            vscode.window.showInformationMessage(`Received: ${message}`);
        });
        wsClient.on('error', (error) => {
            vscode.window.showInformationMessage(`Error: ${error}`);
        });
    });
    context.subscriptions.push(startServerCommand, joinSessionCommand);
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