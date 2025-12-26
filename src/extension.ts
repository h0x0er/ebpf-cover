import * as vscode from "vscode";

import * as fs from "fs";
import * as path from "path";

import {
  CreateLogger,
  GetWorkspacePath,
  Log,
  PickVerifierLogFile,
} from "./utils";

let coverageDecor: vscode.TextEditorDecorationType =
  vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 200, 0, 0.3)",
    overviewRulerColor: "rgba(255, 200, 0, 0.8)", // <-- minimap highlight color
    overviewRulerLane: vscode.OverviewRulerLane.Center,
  });

let cachedRanges: Map<string, Array<vscode.Range>> = new Map();
let VerifierLogPath: string = "";

let coverLogger = CreateLogger("doCover");
let uncoverLogger = CreateLogger("doUncover");
let log = CreateLogger("generic");

export async function activate(context: vscode.ExtensionContext) {
  log("epbf-cover init");

  let cover = vscode.commands.registerCommand("ebpf-cover.doCover", () => {
    doCover();
  });

  let unCover = vscode.commands.registerCommand(
    "ebpf-cover.unCover",
    doUncover
  );

  context.subscriptions.push(cover);
  context.subscriptions.push(unCover);

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    doCover();
  });
}

export async function deactivate() {}

async function doCover() {
  const workspace = GetWorkspacePath();

  if (VerifierLogPath.length == 0) {
    VerifierLogPath = path.join(workspace, "verifier.log2"); // default log path
  }

  coverLogger(`logPath=${VerifierLogPath}`);
  if (!fs.existsSync(VerifierLogPath)) {
    VerifierLogPath = await PickVerifierLogFile();
  }

  if (!fs.existsSync(VerifierLogPath)) {
    Log(`verifier log-file not found path=${VerifierLogPath}`);
    return;
  }

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
    coverLogger("[doUncover] no active editor");
    return;
  }

  const currentFile = editor.document.fileName;

  let hasValidExt = currentFile.endsWith(".c") || currentFile.endsWith(".h");
  if (!hasValidExt) {
    coverLogger("extention not supported");
    return;
  }

  const currentFileName = path.basename(currentFile);

  coverLogger(`${currentFile} ${workspace}`);

  if (cachedRanges.has(currentFileName)) {
    coverLogger("cover already found !");
  } else {
    const content = fs.readFileSync(VerifierLogPath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      let parseType = 0;
      if (line.indexOf("@") > -1 && line.indexOf(currentFileName) > -1) {
        parseType = 1;
      }

      switch (parseType) {
        case 1:
          coverLogger(`${line} parseType=${parseType}`);

          if (!line.startsWith("; ")) {
            continue;
          }

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

          coverLogger(`${line} parseType=${parseType}`);

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
    coverLogger(`lines covered: ${ranges.length}`);
    editor.setDecorations(coverageDecor, ranges);
  } else {
    Log("coverage not found");
  }
}

function doUncover() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    uncoverLogger("no active editor");
    return;
  }

  uncoverLogger("removing coverage");
  editor.setDecorations(coverageDecor, []);
  cachedRanges = new Map();
  VerifierLogPath = "";
}
