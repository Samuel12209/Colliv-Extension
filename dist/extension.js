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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const http = __importStar(require("http"));
const WebSocket = __importStar(require("ws"));
const net = __importStar(require("net"));
function activate(context) {
    console.log('Colliv extension is now active!');
    const hostport = vscode.commands.registerCommand('colliv.ServerStart', async () => {
        // Prompt for port
        const port = await vscode.window.showInputBox({
            placeHolder: "Enter a port number (1-65535) to host",
            validateInput: text => {
                const num = Number(text);
                if (isNaN(num)) {
                    return "Please enter a valid number.";
                }
                if (num < 1 || num > 65535) {
                    return "Number must be between 1 and 65535.";
                }
                return null;
            }
        });
        if (port) {
            checkPort(Number(port))
                .then(async (isAvailable) => {
                if (isAvailable) {
                    await startServer(Number(port));
                }
                else {
                    vscode.window.showErrorMessage(`Port ${port} is in use.`);
                }
            })
                .catch(err => vscode.window.showErrorMessage(`Error checking port: ${err.message}`));
        }
    });
    context.subscriptions.push(hostport);
}
function checkPort(port) {
    return new Promise(resolve => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            }
            else {
                vscode.window.showErrorMessage(`Unexpected error: ${err.message}`);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port, '0.0.0.0');
    });
}
async function startServer(port) {
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Colliv Server Running!');
    });
    // Create WebSocket server to accept other connections
    const wss = new WebSocket.Server({ noServer: true });
    // Handle WebSocket connections from clients (other users)
    wss.on('connection', ws => {
        console.log('New client connected');
        ws.on('message', (message) => {
            // Handle messages from clients here (file edits, etc.)
            console.log(`Received message: ${message}`);
        });
        ws.send('Welcome to the Colliv Server!');
    });
    // Handle HTTP upgrade requests (for WebSocket)
    server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
    // Get the public IP or public hostname
    const publicIp = await getPublicIp();
    // Listen on the specified port
    server.listen(port, '0.0.0.0', () => {
        const serverUrl = `ws://${publicIp}:${port}`;
        vscode.window.showInformationMessage(`Server running globally at: ${serverUrl}\nShare this URL with anyone to collaborate!`);
    });
    return server;
}
// Function to get the public IP address of the machine (for WAN access)
async function getPublicIp() {
    // This can be an external service to get the public IP if not behind a NAT.
    // For local testing, you can use a local network IP discovery
    const fetch = require('node-fetch');
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || '127.0.0.1'; // fallback to localhost if no public IP is found
}
function deactivate() {
}
//# sourceMappingURL=extension.js.map