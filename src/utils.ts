import * as path from "path";
import * as vscode from "vscode";

import * as fs from "fs";

const IsDebug = true;

// const errFile = "local/investigations/load-errors/err.log";

let logger: vscode.OutputChannel =
  vscode.window.createOutputChannel("ebpf-cover");

export function Log(text: any) {
  logger.appendLine(text);
}

export function LogDebug(text: any) {
  if (!IsDebug) {
    return;
  }
  logger.appendLine(`[debug] ${text}`);
}

export function GetWorkspacePath(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
}

export async function PickVerifierLogFile(): Promise<string> {
  const result = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: "Select verifier log",
  });

  if (!result || result.length === 0) {
    return "";
  }

  const fileUri = result[0];
  return fileUri.fsPath;
}
