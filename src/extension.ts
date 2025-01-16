import * as vscode from 'vscode';
import WebSocket from 'ws';  // Default import

let wsServer: WebSocket.Server | null = null;
let wsClient: WebSocket | null = null;
let isHosting = false;

export function activate(context: vscode.ExtensionContext) {
    const startServerCommand = vscode.commands.registerCommand('colliv.startServer', () => {
        if (isHosting) {
            vscode.window.showInformationMessage('You are already hosting a session.');
            return;
        }

        // Start WebSocket server
        const portNum = 5000;
        const ip = '127.0.0.1'; // Localhost

        wsServer = new WebSocket.Server({ host: ip, port: portNum });
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

        wsClient = new WebSocket(`ws://${ip}:${port}`);
        
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

export function deactivate() {
    if (wsServer) {
        wsServer.close();
    }

    if (wsClient) {
        wsClient.close();
    }
}
