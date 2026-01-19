# eBPF Cover

![ebpf-cover](https://github.com/user-attachments/assets/cdcc4d85-c481-4072-846c-5b62d65ecb62)

> Inspired by `go tool cover`.

> ⚠️ Coverage is based solely on `source-lines` present in verifier logs.

## Installation


### Within Vscode

- Click on `extentions icon`
    - search for `h0x0er.ebpf-cover` and install

### From Github-Releases

- Goto [latest-release](https://github.com/h0x0er/ebpf-cover/releases) and download the vsix file.

- Open vscode, hit `CTRL+SHIFT+p`,
   - type `install from vsix` hit-enter, then
   - choose the downloaded vsix file


## Usage

- Once the extention is installed
- Hit `CTRL+SHIFT+p` to open the command-field
    - type `ebpf-cover: `
      - choose `ebpf-cover: Add coverage` to add the coverage
          - then choose the verifier log file
      - choose `ebpf-cover: Remove coverage` to remove the coverage
