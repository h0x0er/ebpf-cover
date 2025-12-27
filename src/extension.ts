import * as vscode from "vscode";

import * as fs from "fs";
import * as path from "path";

import {
  CreateLogger,
  ExtractFailedFunction,
  GetPatternRange,
  GetWorkspacePath,
  Log,
  Logger,
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

let failedFuncDecor: vscode.TextEditorDecorationType;
let failedFuncName = "";
let errorLines: [string] = [""];

let endLog = "-- END";

let coverLogger: Logger = CreateLogger("doCover");
let uncoverLogger: Logger = CreateLogger("doUncover");
let genericLogger: Logger = CreateLogger("generic");

let extensionPath = "";

export async function activate(context: vscode.ExtensionContext) {
  genericLogger.info("epbf-cover init");

  extensionPath = context.extensionPath;

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
    VerifierLogPath = await PickVerifierLogFile();
  }

  coverLogger.debug(`logPath=${VerifierLogPath}`);

  if (!fs.existsSync(VerifierLogPath)) {
    Log(`verifier log-file not found path=${VerifierLogPath}`);
    return;
  }

  let seen = new Set<string>();

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
  } else {
    const content = fs.readFileSync(VerifierLogPath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // extract failed line
      if (line.startsWith("libbpf:")) {
        if (failedFuncName.length === 0) {
          failedFuncName = ExtractFailedFunction(line);
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

          let mRange = GetPatternRange(editor.document, line);
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
  } else {
    Log("coverage not found");
  }

  if (failedFuncName.length > 0) {
    genericLogger.debug("[failedFunc] entering decorator");

    if (failedFuncDecor === undefined) {
      failedFuncDecor = vscode.window.createTextEditorDecorationType({
        gutterIconPath: vscode.Uri.file(
          path.join(extensionPath, "assets", "error.svg")
        ),
        gutterIconSize: "contain",

        backgroundColor: "rgba(233, 14, 14, 0.92)",
        overviewRulerColor: new vscode.ThemeColor("editorError.foreground"),
        overviewRulerLane: vscode.OverviewRulerLane.Right,
      });
    }

    let mRange = GetPatternRange(editor.document, " " + failedFuncName + "(");
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
