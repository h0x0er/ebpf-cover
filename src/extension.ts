import * as vscode from "vscode";

import * as fs from "fs";
import * as path from "path";

import { GetWorkspacePath, Log, LogDebug, VerifierFileName } from "./utils";

let coverageDecor: vscode.TextEditorDecorationType =
  vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 200, 0, 0.3)",
    overviewRulerColor: "rgba(255, 200, 0, 0.8)", // <-- minimap highlight color
    overviewRulerLane: vscode.OverviewRulerLane.Center,
  });

let cachedRanges: Map<string, Array<vscode.Range>> = new Map();

export function activate(context: vscode.ExtensionContext) {
  Log("epbf-cover init");

  // Log(`[sub-files] ${BpfFiles()}`);

  let cover = vscode.commands.registerCommand("ebpf-cover.doCover", () => {
    doCover();
  });

  let unCover = vscode.commands.registerCommand(
    "ebpf-cover.unCover",
    doUncover
  );

  context.subscriptions.push(cover);
  context.subscriptions.push(unCover);

  // apply cover on current-file as well
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    doCover();
  });
}

// This method is called when your extension is deactivated
export function deactivate() {}

function doCover() {
  let seen = new Set<string>();

  let lastLine: vscode.TextLine | undefined = {
    firstNonWhitespaceCharacterIndex: 0,
    lineNumber: 0,
    text: "",
    isEmptyOrWhitespace: false,
    rangeIncludingLineBreak: new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0)
    ),
    range: new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0)
    ),
  };

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    LogDebug("[doUncover] no active editor");
    return;
  }

  const currentFile = editor.document.fileName;

  let hasValidExt = currentFile.endsWith(".c") || currentFile.endsWith(".h");
  if (!hasValidExt) {
    LogDebug("[doCover] extention not supported");
    return;
  }

  const currentFileName = path.basename(currentFile);
  const workspace = GetWorkspacePath();

  const currentRanges = cachedRanges.get(currentFileName);

  LogDebug(`[doCover] ${currentFile} ${workspace}`);

  if (cachedRanges.has(currentFileName)) {
    LogDebug("[doCover] cover already found !");
  } else {
    const verifierLogFile = path.join(workspace, VerifierFileName);

    if (!fs.existsSync(verifierLogFile)) {
      Log(`[doCover] verifier log-file not found path=${verifierLogFile}`);
    }

    const content = fs.readFileSync(verifierLogFile, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      let parseType = 0;
      if (line.indexOf("@") > -1 && line.indexOf(currentFileName) > -1) {
        parseType = 1;
      }

      switch (parseType) {
        case 1:
          LogDebug(`[doCover] ${line} parseType=${parseType}`);

          if (seen.has(line)) {
            continue;
          }
          seen.add(line);

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
          if (!line.startsWith("; ")) {
            continue;
          }

          line = line.slice(2);

          if (seen.has(line)) {
            continue;
          }
          seen.add(line);

          LogDebug(`[doCover] ${line} parseType=${parseType}`);

          let pos = editor.document.getText().indexOf(line);

          if (pos > -1) {
            lastLine = editor.document.lineAt(editor.document.positionAt(pos));

            if (!cachedRanges.has(currentFileName)) {
              cachedRanges.set(currentFileName, []);
            }

            cachedRanges.get(currentFileName)?.push(lastLine.range);
          }

          break;
      }
    }
  }

  let ranges = cachedRanges.get(currentFileName);
  if (ranges !== undefined) {
    LogDebug(`[doCover] lines covered: ${ranges.length}`);
    editor.setDecorations(coverageDecor, ranges);
  }

  // editor.setDecorations(coverageDecor, ranges);
}

function doUncover() {
  // vscode.window.showInformationMessage("ebpf-cover: uncovering");

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    LogDebug("[doUncover] no active editor");
    return;
  }

  editor.setDecorations(coverageDecor, []);
  cachedRanges = new Map();
}
