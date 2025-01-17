import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import WebSocket from 'ws'; // Default import

let wsServer: WebSocket.Server | null = null;
let wsClient: WebSocket | null = null;
let isHosting = false;
let workspacePath: string | undefined;
let saveTimeout: NodeJS.Timeout | null = null;
const SAVE_DELAY = 100; // Save every 0.1 second

export function activate(context: vscode.ExtensionContext) {
    // Command to start the server (host session)
    const startServerCommand = vscode.commands.registerCommand('colliv.startServer', () => {
        if (isHosting) {
            vscode.window.showInformationMessage('You are already hosting a session.');
            return;
        }

        const portNum = 5000;
        const ip = '127.0.0.1'; // Localhost

        wsServer = new WebSocket.Server({ host: ip, port: portNum });
        isHosting = true;

        wsServer.on('connection', (socket) => {
            vscode.window.showInformationMessage('A client has joined the session.');

            // Send folder structure and files to client
            if (workspacePath) {
                const files = getFilesRecursively(workspacePath);
                socket.send(JSON.stringify({ type: 'fileSync', files }));
            }

            // Handle incoming messages
            socket.on('message', (message) => {
                const data = JSON.parse(message.toString());
                if (data.type === 'fileUpdate' && workspacePath) {
                    const filePath = path.join(workspacePath, data.fileName);
                    // Only write if the content is different to avoid overwriting client changes
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

    // Command to join a session (client)
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
        });

        wsClient.on('message', (message) => {
            const data = JSON.parse(message.toString());

            if (data.type === 'fileSync' && workspacePath) {
                // Download files from the host
                data.files.forEach((file: any) => {
                    if (workspacePath) {
                        const filePath = path.join(workspacePath, file.path);
                        fs.mkdirSync(path.dirname(filePath), { recursive: true });
                        fs.writeFileSync(filePath, file.content, 'utf8');
                    } else {
                        vscode.window.showErrorMessage('Workspace path is not defined. Please open a folder in your workspace.');
                    }
                });
                vscode.window.showInformationMessage('Files synced from the host!');
            } else if (data.type === 'fileUpdate' && workspacePath) {
                // Update files based on host changes
                const filePath = path.join(workspacePath, data.fileName);
                fs.writeFileSync(filePath, data.content, 'utf8');
            }
        });

        wsClient.on('error', (error) => {
            vscode.window.showInformationMessage(`Error: ${error}`);
        });
    });

    // Command to stop hosting
    const stopSessionCommand = vscode.commands.registerCommand('colliv.stopSession', () => {
        if (wsServer) {
            wsServer.close();
            wsServer = null;
            isHosting = false;
            vscode.window.showInformationMessage('Stopped hosting the session.');
        }
    });

    // Command to leave a session
    const leaveSessionCommand = vscode.commands.registerCommand('colliv.leaveSession', () => {
        if (wsClient) {
            wsClient.close();
            wsClient = null;
            vscode.window.showInformationMessage('Left the session.');
        }
    });

    // Initialize workspace path
    workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    // Watch for file changes in the workspace to sync with the client
    if (workspacePath) {
        vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.scheme === 'file' && wsServer) {
                const filePath = e.document.uri.fsPath;
                const fileName = path.relative(workspacePath!, filePath); // Non-null assertion here
                const content = e.document.getText();

                if (saveTimeout) {
                    clearTimeout(saveTimeout);
                }

                saveTimeout = setTimeout(() => {
                    fs.writeFileSync(filePath, content, 'utf8');

                    // Check if wsServer is not null
                    if (wsServer && wsServer.clients) {
                        wsServer.clients.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'fileUpdate', fileName, content }));
                            }
                        });
                    }
                }, SAVE_DELAY);
            }
        });
    } else {
        vscode.window.showErrorMessage('Workspace path is not defined. Please open a folder in your workspace.');
    }

    context.subscriptions.push(startServerCommand, joinSessionCommand, stopSessionCommand, leaveSessionCommand);
}

// Recursively get files from a directory
function getFilesRecursively(dir: string): any[] {
    let results: any[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(filePath));
        } else {
            results.push({ path: path.relative(workspacePath!, filePath), content: fs.readFileSync(filePath, 'utf8') });
        }
    });
    return results;
}

export function deactivate() {
    if (wsServer) {
        wsServer.close();
    }
    if (wsClient) {
        wsClient.close();
    }
}
