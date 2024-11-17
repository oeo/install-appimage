# AppImage Installer

A command-line tool to install, manage, and uninstall AppImage applications on Linux systems.

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/oeo/install-appimage.git
   cd install-appimage ```

2. Install dependencies:
   ```
   bun install
   ```

3. Install the tool globally:
   ```
   bun link
   ```

## Usage

After installation, you can use the `appimg` command:

```bash
appimg [command] [options]
```

### Commands:

- `install <path> [--icon, --params]`: Install an AppImage
- `remove <name>`: Uninstall an AppImage (accepts wildcard input)
- `ls [--details]`: List installed AppImages

### Options:

- `--help`: Show help message
- `--icon <url>`: Specify an icon URL for the AppImage
- `--params <params>`: Specify additional CLI parameters
- `--details`: Show details when listing AppImages

## Examples:

```bash
appimg install ./Redis-Insight-linux-x86_64.AppImage
appimg ls --details
appimg remove Redis-Insight-linux-x86_64
```

## Requirements

- Bun runtime
- Linux system with sudo privileges

## Note

Requires sudo privileges for installation and uninstallation operations.

## Development

The main script is located in `module.ts`. To make changes, edit this file and then run `bun link` again to update the global installation.

