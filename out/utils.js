"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.CreateLogger = CreateLogger;
exports.Log = Log;
exports.LogDebug = LogDebug;
exports.GetWorkspacePath = GetWorkspacePath;
exports.PickVerifierLogFile = PickVerifierLogFile;
exports.ExtractFailedFunction = ExtractFailedFunction;
exports.GetPatternRange = GetPatternRange;
const vscode = require("vscode");
const IsDebug = false;
// const errFile = "local/investigations/load-errors/err.log";
let logger = vscode.window.createOutputChannel("ebpf-cover");
class Logger {
    constructor(tag) {
        this.tag = tag;
        this.isDebug = IsDebug;
    }
    info(text) {
        logger.appendLine(`[info] [${this.tag}] ${text}`);
    }
    debug(text) {
        if (this.isDebug) {
            logger.appendLine(`[debug] [${this.tag}] ${text}`);
        }
    }
}
exports.Logger = Logger;
function CreateLogger(tag) {
    return new Logger(tag);
}
function Log(text) {
    logger.appendLine(text);
}
function LogDebug(text) {
    if (!IsDebug) {
        return;
    }
    logger.appendLine(`[debug] ${text}`);
}
function GetWorkspacePath() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
}
async function PickVerifierLogFile() {
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
function ExtractFailedFunction(line) {
    const re = /^libbpf:\s+prog\s+'([^']+)':\s+failed\s+to\s+load:\s+-?\d+$/;
    // const line = "libbpf: prog 'handle_egress': failed to load: -22";
    const m = line.match(re);
    if (m) {
        return m[1]; // handle_egress
    }
    return "";
}
function GetPatternRange(document, pattern) {
    let pos = document.getText().indexOf(pattern);
    if (pos < 0) {
        return undefined;
    }
    let txtLine = document.lineAt(document.positionAt(pos));
    return txtLine.range;
}
//# sourceMappingURL=utils.js.map