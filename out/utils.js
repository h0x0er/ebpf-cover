"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifierFileName = void 0;
exports.Log = Log;
exports.BpfFiles = BpfFiles;
exports.GetWorkspacePath = GetWorkspacePath;
const path = require("path");
const vscode = require("vscode");
const fs = require("fs");
// const errFile = "local/investigations/load-errors/err.log";
exports.VerifierFileName = "verifier.log";
let logger = vscode.window.createOutputChannel("ebpf-cover");
function Log(text) {
    logger.appendLine(text);
}
const BpfFolder = "bpf";
function BpfFiles() {
    let bpfFolder = path.join(GetWorkspacePath(), BpfFolder);
    return fs.readdirSync(bpfFolder, { recursive: true, withFileTypes: true }).filter(item => !item.isDirectory()).map(item => item.parentPath);
}
function GetWorkspacePath() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
}
//# sourceMappingURL=utils.js.map