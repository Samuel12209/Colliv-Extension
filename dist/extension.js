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
const net = __importStar(require("net"));
const http = __importStar(require("http"));
const lt = __importStar(require("localtunnel"));
function activate(context) {
    console.log('colliv is now active Bigmans');
    const hostport = vscode.commands.registerCommand('colliv.ServerStart', async () => {
        // Then prompt for port
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
        server.listen(port, '127.0.0.1');
    });
}
async function startServer(port) {
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Colliv Server Running!');
    });
    server.listen(port, '127.0.0.1', async () => {
        try {
            const tunnel = await lt({ port });
            vscode.window.showInformationMessage(`Server running globally at: ${tunnel.url}\nShare this URL with anyone worldwide!`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to create tunnel: ${errorMessage}`);
        }
    });
    return server;
}
function deactivate() {
}
//# sourceMappingURL=extension.js.map