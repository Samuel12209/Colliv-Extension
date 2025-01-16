import * as vscode from 'vscode';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as os from 'os';
import * as net from 'net';

export function activate(context: vscode.ExtensionContext) {
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
                .then(async isAvailable => {
                    if (isAvailable) {
                        await startServer(Number(port));
                    } else {
                        vscode.window.showErrorMessage(`Port ${port} is in use.`);
                    }
                })
                .catch(err => vscode.window.showErrorMessage(`Error checking port: ${err.message}`));
        }
    });

    context.subscriptions.push(hostport);
}

function checkPort(port: number): Promise<boolean> {
    return new Promise(resolve => {
        const server = net.createServer();

        server.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
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

async function startServer(port: number) {
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
        vscode.window.showInformationMessage(
            `Server running globally at: ${serverUrl}\nShare this URL with anyone to collaborate!`
        );
    });

    return server;
}

// Function to get the public IP address of the machine (for WAN access)
async function getPublicIp(): Promise<string> {
    // This can be an external service to get the public IP if not behind a NAT.
    // For local testing, you can use a local network IP discovery
    const fetch = require('node-fetch');
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || '127.0.0.1'; // fallback to localhost if no public IP is found
}

export function deactivate() {
}
