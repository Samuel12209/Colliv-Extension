import * as vscode from 'vscode';
import * as net from 'net';
import 'ws
'

export function activate(context: vscode.ExtensionContext) {

	console.log('colliv is now active');

	const disposable = vscode.commands.registerCommand('colliv.helloWorld', () => {

		vscode.window.showInformationMessage('Hello World from Colliv!');
	});

	const hostport = vscode.commands.registerCommand('colliv.hostport', () => {

		vscode.window.showInputBox({
			placeHolder: "3000",
			validateInput: text => {
				const num = Number(text);
				if (isNaN(num)) {
					return "Please enter a valid number.";
				}
				if (num <= 1 || num >= 5000) {
					return "Number must be greater than 1 and less than 5000.";
				}
				return null;
			
		  }});
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(hostport);
}

export function deactivate() {}