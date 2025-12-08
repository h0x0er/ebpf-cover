// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import * as fs from "fs";
import * as path from "path";

import { GetWorkspacePath, Log, VerifierFileName } from "./utils";

let coverageDecor: vscode.TextEditorDecorationType;
let verifierLastDecor: vscode.TextEditorDecorationType;

let cachedRanges: Map<string, Array<vscode.TextLine>> = new Map();
let cachedLastLines: Map<string, vscode.TextLine> = new Map();

export function activate(context: vscode.ExtensionContext) {
  Log("epbf-cover init");

  // Log(`[sub-files] ${BpfFiles()}`);

  let cover = vscode.commands.registerCommand("ebpf-cover.doCover", () => {
    doCover(context);
  });

  let unCover = vscode.commands.registerCommand(
    "ebpf-cover.unCover",
    doUncover
  );

  context.subscriptions.push(cover);
  context.subscriptions.push(unCover);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function doCover(context: vscode.ExtensionContext) {
  let ranges: Array<vscode.TextLine> = [];
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

  coverageDecor = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 200, 0, 0.3)",
    overviewRulerColor: "rgba(255, 200, 0, 0.8)", // <-- minimap highlight color
    overviewRulerLane: vscode.OverviewRulerLane.Center,
  });

  verifierLastDecor = vscode.window.createTextEditorDecorationType({
    color: "red",
    overviewRulerColor: "red", // <-- minimap highlight color
    overviewRulerLane: vscode.OverviewRulerLane.Center,
    // gutterIconPath: context.asAbsolutePath("media/gutter-slashred.svg"),
  });

  vscode.window.showInformationMessage("Adding coverage");

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage("No active editor.");
    return;
  }

  const currentFile = editor.document.fileName;
  const currentFileName = path.basename(currentFile);
  const workspace = GetWorkspacePath();

  const currentRanges = cachedRanges.get(currentFileName);
  const currentLastLine = cachedLastLines.get(currentFileName);

  Log(`[doCover] ${currentFile} ${workspace}`);

  if (currentRanges !== undefined) {
    Log("[doCover] cover already found !");
    ranges = currentRanges;
    lastLine = currentLastLine;
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
          Log(`[doCover] ${line} parseType=${parseType}`);

          if (seen.has(line)) {
            continue;
          }
          seen.add(line);

          let parts = line.split("@ ");
          let parts2 = parts[1].split(":"); // map_utils.h:9

          let lineNum = parseInt(parts2[1], 10) - 1;
          if (lineNum < 0) {
            lineNum = 0;
          }

          ranges.push(editor.document.lineAt(lineNum));

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

          Log(`[doCover] ${line} parseType=${parseType}`);

          let pos = editor.document.getText().indexOf(line);

          if (pos > -1) {
            lastLine = editor.document.lineAt(editor.document.positionAt(pos));
            ranges.push(lastLine);
          }

          break;
      }
    }

    cachedRanges.set(currentFileName, ranges);
    cachedLastLines.set(currentFile, lastLine);
  }

  Log(`[doCover] lines covered: ${ranges.length}`);

  editor.setDecorations(coverageDecor, ranges);

  if (lastLine !== undefined) {
    let opt: vscode.DecorationOptions = {
      range: lastLine.range,
      hoverMessage: "Verifier stopped here",
    };

    editor.setDecorations(verifierLastDecor, [opt]);
  }
}

function doUncover() {
  vscode.window.showInformationMessage("ebpf-cover: uncovering");

  coverageDecor.dispose();
  verifierLastDecor.dispose();
  cachedLastLines = new Map();
  cachedRanges = new Map();
}
