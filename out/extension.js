"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const utils_1 = require("./utils");
let coverageDecor = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 200, 0, 0.3)",
    overviewRulerColor: "rgba(255, 200, 0, 0.8)", // <-- minimap highlight color
    overviewRulerLane: vscode.OverviewRulerLane.Center,
});
let cachedRanges = new Map();
let VerifierLogPath = "";
let failedFuncDecor;
let failedFuncName = "";
let errorLines = [""];
let endLog = "-- END";
let coverLogger = (0, utils_1.CreateLogger)("doCover");
let uncoverLogger = (0, utils_1.CreateLogger)("doUncover");
let genericLogger = (0, utils_1.CreateLogger)("generic");
let extensionPath = "";
async function activate(context) {
    genericLogger.info("epbf-cover init");
    extensionPath = context.extensionPath;
    let cover = vscode.commands.registerCommand("ebpf-cover.doCover", () => {
        doCover();
    });
    let unCover = vscode.commands.registerCommand("ebpf-cover.unCover", doUncover);
    context.subscriptions.push(cover);
    context.subscriptions.push(unCover);
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        doCover();
    });
}
async function deactivate() { }
async function doCover() {
    const workspace = (0, utils_1.GetWorkspacePath)();
    if (VerifierLogPath.length == 0) {
        VerifierLogPath = path.join(workspace, "verifier.log"); // default log path
    }
    coverLogger.debug(`logPath=${VerifierLogPath}`);
    if (!fs.existsSync(VerifierLogPath)) {
        VerifierLogPath = await (0, utils_1.PickVerifierLogFile)();
    }
    if (!fs.existsSync(VerifierLogPath)) {
        (0, utils_1.Log)(`verifier log-file not found path=${VerifierLogPath}`);
        return;
    }
    let seen = new Set();
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        coverLogger.debug("[doUncover] no active editor");
        return;
    }
    const currentFile = editor.document.fileName;
    let hasValidExt = currentFile.endsWith(".c") || currentFile.endsWith(".h");
    if (!hasValidExt) {
        coverLogger.debug("extention not supported");
        return;
    }
    const currentFileName = path.basename(currentFile);
    coverLogger.debug(`${currentFile} ${workspace}`);
    if (cachedRanges.has(currentFileName)) {
        coverLogger.debug("cover already found !");
    }
    else {
        const content = fs.readFileSync(VerifierLogPath, "utf8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            // extract failed line
            if (line.startsWith("libbpf:")) {
                if (failedFuncName.length === 0) {
                    failedFuncName = (0, utils_1.ExtractFailedFunction)(line);
                    genericLogger.debug(`[failedFunc] found ${failedFuncName}`);
                }
                if (line.indexOf(endLog) > -1 || errorLines.length > 0) {
                    errorLines.push(line);
                }
            }
            // skip if not the C-source
            if (!line.startsWith("; ")) {
                continue;
            }
            let parseType = 0;
            if (line.indexOf("@") > -1 && line.indexOf(currentFileName) > -1) {
                parseType = 1;
            }
            switch (parseType) {
                case 1:
                    coverLogger.debug(`${line} parseType=${parseType}`);
                    let parts = line.split("@ ");
                    let parts2 = parts[1].split(":"); // map_utils.h:9
                    let curFileFromLine = parts2[0].trim();
                    if (!cachedRanges.has(curFileFromLine)) {
                        cachedRanges.set(curFileFromLine, []);
                    }
                    let lineNum = parseInt(parts2[1], 10) - 1;
                    if (lineNum < 0) {
                        lineNum = 0;
                    }
                    cachedRanges
                        .get(curFileFromLine)
                        ?.push(editor.document.lineAt(lineNum).range);
                    break;
                case 0:
                    line = line.slice(2);
                    if (seen.has(line)) {
                        continue;
                    }
                    seen.add(line);
                    coverLogger.debug(`${line} parseType=${parseType}`);
                    let mRange = (0, utils_1.GetPatternRange)(editor.document, line);
                    if (mRange != undefined) {
                        if (!cachedRanges.has(currentFileName)) {
                            cachedRanges.set(currentFileName, []);
                        }
                        cachedRanges.get(currentFileName)?.push(mRange);
                    }
                    break;
            }
        }
    }
    let ranges = cachedRanges.get(currentFileName);
    if (ranges !== undefined) {
        coverLogger.debug(`lines covered: ${ranges.length}`);
        editor.setDecorations(coverageDecor, ranges);
    }
    else {
        (0, utils_1.Log)("coverage not found");
    }
    if (failedFuncName.length > 0) {
        genericLogger.debug("[failedFunc] entering decorator");
        if (failedFuncDecor === undefined) {
            failedFuncDecor = vscode.window.createTextEditorDecorationType({
                gutterIconPath: vscode.Uri.file(path.join(extensionPath, "assets", "error.svg")),
                gutterIconSize: "contain",
                backgroundColor: "rgba(233, 14, 14, 0.92)",
                overviewRulerColor: new vscode.ThemeColor("editorError.foreground"),
                overviewRulerLane: vscode.OverviewRulerLane.Right,
            });
        }
        let mRange = (0, utils_1.GetPatternRange)(editor.document, " " + failedFuncName + "(");
        if (mRange != undefined) {
            genericLogger.debug("[failedFunc] decorating");
            editor.setDecorations(failedFuncDecor, [
                {
                    range: mRange,
                    hoverMessage: new vscode.MarkdownString(errorLines.join("\n\n")),
                },
            ]);
        }
    }
}
function doUncover() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        uncoverLogger.debug("no active editor");
        return;
    }
    uncoverLogger.debug("removing coverage");
    editor.setDecorations(coverageDecor, []);
    editor.setDecorations(failedFuncDecor, []);
    cachedRanges = new Map();
    VerifierLogPath = "";
}
//# sourceMappingURL=extension.js.map