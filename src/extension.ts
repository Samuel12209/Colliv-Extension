import * as vscode from 'vscode';
import WebSocket from 'ws';  // Default import
import * as fs from 'fs';
import * as path from 'path';

let wsServer: WebSocket.Server | null = null;
let wsClient: WebSocket | null = null;
let isHosting = false;

export function activate(context: vscode.ExtensionContext) {

    const startServerCommand = vscode.commands.registerCommand('colliv.startServer', () => {
        if (isHosting) {
            vscode.window.showInformationMessage('You are already hosting a session.');
            return;
        }

        const portNum = 5000;
        const ip = '127.0.0.1'; // Localhost

        wsServer = new WebSocket.Server({ host: ip, port: portNum });

        wsServer.on('connection', (socket) => {
            vscode.window.showInformationMessage('A client has joined the session.');
            
            // Send initial files to the client
            const files = fs.readdirSync(vscode.workspace.rootPath || '');
            files.forEach((fileName) => {
                const filePath = path.join(vscode.workspace.rootPath || '', fileName);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                socket.send(JSON.stringify({ type: 'file', fileName, fileContent }));
            });

            socket.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'fileUpdate') {
                    // Handle file update
                    const filePath = path.join(vscode.workspace.rootPath || '', parsedMessage.fileName);
                    fs.writeFileSync(filePath, parsedMessage.fileContent);
                    vscode.window.showInformationMessage(`File ${parsedMessage.fileName} updated.`);
                }
            });

            socket.on('close', () => {
                vscode.window.showInformationMessage('A client has left the session.');
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
            const parsedMessage = JSON.parse(message.toString());
            if (parsedMessage.type === 'file') {
                // Receive file and create a temporary file to open
                const tempFilePath = path.join(vscode.workspace.rootPath || '', parsedMessage.fileName);
                fs.writeFileSync(tempFilePath, parsedMessage.fileContent);
                vscode.workspace.openTextDocument(tempFilePath).then(doc => {
                    vscode.window.showTextDocument(doc);
                });
            } else if (parsedMessage.type === 'fileUpdate') {
                // Handle file update from the client
                const filePath = path.join(vscode.workspace.rootPath || '', parsedMessage.fileName);
                fs.writeFileSync(filePath, parsedMessage.fileContent);
                vscode.window.showInformationMessage(`File ${parsedMessage.fileName} updated.`);
            }
        });

        wsClient.on('error', (error) => {
            vscode.window.showInformationMessage(`Error: ${error}`);
        });

        wsClient.on('close', () => {
            vscode.window.showInformationMessage('Disconnected from the session.');
        });
    });

    const stopSessionCommand = vscode.commands.registerCommand('colliv.stopSession', () => {
        if (isHosting && wsServer) {
            wsServer.close(() => {
                vscode.window.showInformationMessage('Server session has been stopped.');
            });
            isHosting = false;
        }
    
        if (wsClient) {
            wsClient.close();  // No callback function needed here
            vscode.window.showInformationMessage('Disconnected from the session.');
        }
    });
    

    context.subscriptions.push(startServerCommand, joinSessionCommand, stopSessionCommand);
}

export function deactivate() {
    if (wsServer) {
        wsServer.close();
    }

    if (wsClient) {
        wsClient.close();
    }
}
