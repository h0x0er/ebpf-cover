import * as path from "path";
import * as vscode from "vscode";

import * as fs from "fs";

// const errFile = "local/investigations/load-errors/err.log";
export const VerifierFileName = "verifier.log";

let logger: vscode.OutputChannel =
  vscode.window.createOutputChannel("ebpf-cover");

export function Log(text: any) {
  logger.appendLine(text);
}

const BpfFolder: string = "bpf";

export function BpfFiles() {
  let bpfFolder = path.join(GetWorkspacePath(), BpfFolder);
  return fs.readdirSync(bpfFolder, {recursive: true, withFileTypes: true}).filter(item => !item.isDirectory()).map(item => item.parentPath)
}

export function GetWorkspacePath(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
}
