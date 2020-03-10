import * as vscode from "vscode";
import cp = require("child_process");
import path = require("path");

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("granule");

  const rewriteHoles = vscode.commands.registerCommand(
    "granule.rewriteHoles",
    granuleCommandRunner(outputChannel, "--rewrite-holes")
  );

  const rewriteHole = vscode.commands.registerCommand(
    "granule.rewriteHole",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.selection.isEmpty) {
        const { character, line } = editor.selection.active;
        granuleCommandRunner(
          outputChannel,
          "--rewrite-holes",
          "--hole-line",
          (line + 1).toString(),
          "--hole-column",
          (character + 1).toString()
        )();
      } else {
        vscode.window.showWarningMessage("Could not retrieve position under cursor.");
      }
    }
  );

  const asciiToUnicode = vscode.commands.registerCommand(
    "granule.asciiToUnicode",
    granuleCommandRunner(outputChannel, "--ascii-to-unicode")
  );

  const unicodeToAscii = vscode.commands.registerCommand(
    "granule.unicodeToAscii",
    granuleCommandRunner(outputChannel, "--unicode-to-ascii")
  );

  context.subscriptions.push(
    rewriteHoles,
    rewriteHole,
    asciiToUnicode,
    unicodeToAscii
  );
}

export function deactivate() { }

function granuleCommandRunner(outputChannel: vscode.OutputChannel, ...args: string[]): () => void {
  return () => {
    const currentDocument = vscode.window.activeTextEditor?.document;

    const execCommand = (filename : string) => {
      const dirname = path.dirname(filename);
      const basename = path.basename(filename);
      const command = args.join(" ");

      const fullCommand = `gr ${command} --no-colour ${basename}`;
      vscode.window.showInformationMessage(`Running ${fullCommand}`);
      outputChannel.appendLine(`${dirname} > ${fullCommand}`);

      cp.exec(fullCommand, { cwd: dirname }, (err, stdout, stderr) => {
        const errString = err?.toString();
        if (errString && !errString.includes("Type checking failed")) {
          outputChannel.append(errString);
        } else {
          outputChannel.append(stdout);
          outputChannel.append(stderr);
        }
      });
    }

    if (!currentDocument || currentDocument.isUntitled) {
      vscode.window.showWarningMessage("Please save the file first.");
    } else if (!currentDocument.fileName.endsWith(".gr")) {
      vscode.window.showErrorMessage("Command only supported on .gr files.");
    } else {
      if (currentDocument.isDirty) {
        currentDocument.save().then(() => execCommand(currentDocument.fileName));
      } else {
        Promise.resolve().then(() => execCommand(currentDocument.fileName));
      }
    }
  };
}
