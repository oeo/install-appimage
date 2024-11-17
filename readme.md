# Don't use this.
It's for personal use only, probably useless for you.

# cli/appimg

A command-line tool to install, manage, and uninstall AppImage applications on Linux systems.

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/oeo/install-appimage.git
   cd install-appimage
   ```

2. Install:
   ```
   bun install
   sudo ln -s $(pwd)/module.ts /usr/local/bin/appimg
   ```

3. Run it
   ```
   appimg --help
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

