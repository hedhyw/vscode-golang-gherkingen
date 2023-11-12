import * as vscode from 'vscode';
import { promisify } from 'util';
import { exec, PromiseWithChild } from "child_process";

const dockerImage = 'hedhyw/gherkingen:v3.0.3';
const execCommand = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
	let disposableGenerateCommand = vscode.commands.registerCommand(
		'golang-gherkingen.generate',
		runGenerateCommand,
	);

	context.subscriptions.push(disposableGenerateCommand);
};

function runGenerateCommand(): any {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage('No editor is active.');

		return false;
	}

	return vscode.window.withProgress({
		location: vscode.ProgressLocation.Window,
		cancellable: false,
		title: 'Generating code...'
	}, async (progress) => {
		progress.report({ increment: 0 });

		return editor.document
			.save()
			.then((_) => {
				progress.report({ increment: 50 });

				return pullDockerImage(dockerImage);
			})
			.then((_) => {
				progress.report({ increment: 70 });

				return runDockerGenerator(editor.document.fileName);
			}).then((output) => {
				progress.report({ increment: 90 });

				return createGoFile(output.stderr + output.stdout);
			}).then((document) => {
				progress.report({ increment: 100 });

				vscode.window.showTextDocument(document, 1, false);
			});
	}).then(undefined, (err: any) => {
		console.error(err);

		return Promise.resolve(false);
	});
}

function createGoFile(content: string): Promise<vscode.TextDocument> {
	return Promise.resolve(vscode.workspace.openTextDocument({
		language: 'go',
		content: content,
	}));
}

function dockerInspect(image: string): PromiseWithChild<Output> {
	const command = [
		'docker',
		'pull',
		image,
	];

	return execCommand(command.join(' '));
}

function runDockerGenerator(fileName: string): Thenable<Output> {
	return new Promise<Output>((resolve) => {
		const command = [
			'docker',
			'run',
			'--rm',
			'--tty',
			'--read-only',
			'--network',
			'none',
			'--volume',
			'"' + fileName + '":"/host/feature":ro',
			dockerImage,
			'/host/feature',
		];

		execCommand(command.join(' ')).then((data) => {
			console.log("code generated", fileName, data);

			resolve(data);
		}).catch((err) => {
			console.error(err);

			resolve({
				stderr: String(err),
				stdout: "",
			});
		});
	});
}

interface Output {
	stdout: string;
	stderr: string;
}

function pullDockerImage(image: string): Thenable<Output> {
	return new Promise<Output>((resolve) => {
		dockerInspect(image).then((data) => {
			console.log("image inspected", image, data);

			resolve(data);
		}).catch(() => {
			const command = [
				'docker',
				'pull',
				image,
			];

			execCommand(command.join(' ')).then((data) => {
				console.log("image pulled", image, data);

				resolve(data);
			}).catch((err) => {
				console.error(err);

				resolve({
					stderr: String(err),
					stdout: "",
				});
			});
		});
	});
}

export function deactivate() { }
