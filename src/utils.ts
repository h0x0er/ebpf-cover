import * as vscode from "vscode";

const IsDebug = false;

// const errFile = "local/investigations/load-errors/err.log";

let logger: vscode.OutputChannel =
  vscode.window.createOutputChannel("ebpf-cover");

export class Logger {
  tag: string;
  isDebug: boolean;
  constructor(tag: string) {
    this.tag = tag;
    this.isDebug = IsDebug;
  }
  info(text: any) {
    logger.appendLine(`[info] [${this.tag}] ${text}`);
  }
  debug(text: any) {
    if (this.isDebug) {
      logger.appendLine(`[debug] [${this.tag}] ${text}`);
    }
  }
}

export function CreateLogger(tag: string): Logger {
  return new Logger(tag);
}

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

export function ExtractFailedFunction(line: string): string {
  const re = /^libbpf:\s+prog\s+'([^']+)':\s+failed\s+to\s+load:\s+-?\d+$/;

  // const line = "libbpf: prog 'handle_egress': failed to load: -22";

  const m = line.match(re);
  if (m) {
    return m[1]; // handle_egress
  }

  return "";
}

export function GetPatternRange(
  document: vscode.TextDocument,
  pattern: string
): vscode.Range | undefined {
  let pos = document.getText().indexOf(pattern);

  if (pos < 0) {
    return undefined;
  }

  let txtLine = document.lineAt(document.positionAt(pos));

  return txtLine.range;
}
