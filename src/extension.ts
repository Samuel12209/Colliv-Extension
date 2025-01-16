import * as vscode from 'vscode';
import * as net from 'net';
import * as http from 'http';

export function activate(context: vscode.ExtensionContext) {
    console.log('colliv is now active Bigmans');

    const hostport = vscode.commands.registerCommand('colliv.ServerStart', async () => {
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
                .then(isAvailable => {
                    if (isAvailable) {
                        startServer(Number(port));
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
                resolve(false); // Port is being used
            } else {
                vscode.window.showErrorMessage(`Unexpected error: ${err.message}`);
            }
        });

        server.once('listening', () => {
            server.close();
            resolve(true);
        });

        server.listen(port, '127.0.0.1');
    });
}

function startServer(port: number) {
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Colliv Server Running!');
    });

    server.listen(port, '127.0.0.1', () => {
        vscode.window.showInformationMessage(`Server running at http://localhost:${port}`);
    });

    return server;
}

export function deactivate() {}