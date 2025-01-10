import * as vscode from 'vscode';
import * as net from 'net';

export function activate(context: vscode.ExtensionContext) {
    console.log('colliv is now active');

    const hostport = vscode.commands.registerCommand('colliv.hostport', async () => {
        const port = await vscode.window.showInputBox({
            placeHolder: "Enter a port number (1-65535)",
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
                        vscode.window.showInformationMessage(`Port ${port} is available.`);
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
                resolve(false); // Port is in use
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

export function deactivate() {}
