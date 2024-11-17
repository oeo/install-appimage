import minimist from 'minimist';
import { exec, execSync } from 'child_process';
import { existsSync, promises as fs } from 'fs';
import path from 'path';
import readline from 'readline';

const APPIMAGE_DIR = '/usr/share/AppImages';
const APPLICATIONS_DIR = '/usr/share/applications';
const LOCAL_APPLICATIONS_DIR = `${process.env.HOME}/.local/share/applications`;

interface AppImageOptions {
  iconUrl?: string;
  cliParams?: string;
  showDetails?: boolean;
  uninstallPattern?: string;
}

async function runWithSudo(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`sudo -S ${command}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      resolve();
    });
  });
}

function showHelp() {
  console.log(`
Usage: install-appimage [command] [options]

Commands:
  install <path>     Install an AppImage (default if <path> is provided)
  ls, --list         List installed AppImages
  remove, --uninstall <name>  Uninstall an AppImage (supports wildcards)

Options:
  --help             Show this help message
  --icon <url>       Specify an icon URL for the AppImage
  --params <params>  Specify additional CLI parameters for the AppImage
  --details          Show details when listing AppImages

Examples:
  install-appimage install /path/to/app.AppImage --icon https://example.com/icon.png
  install-appimage ls --details
  install-appimage remove app-name
  install-appimage --uninstall 'redis*'
  `);
}

import { existsSync } from 'fs';

async function installAppImage(appImagePath: string, options: AppImageOptions) {
  // Resolve the full path of the AppImage
  const fullAppImagePath = path.resolve(appImagePath);

  // Check if the file exists
  if (!existsSync(fullAppImagePath)) {
    console.error(`Error: The file "${fullAppImagePath}" does not exist.`);
    process.exit(1);
  }

  const appName = path.basename(fullAppImagePath, '.AppImage');

  await runWithSudo(`mkdir -p "${APPIMAGE_DIR}"`);
  const appDir = `${APPIMAGE_DIR}/${appName}`;
  await runWithSudo(`mkdir -p "${appDir}"`);

  await runWithSudo(`mv "${fullAppImagePath}" "${appDir}/${appName}.AppImage"`);
  await runWithSudo(`chmod +x "${appDir}/${appName}.AppImage"`);

  let iconPath = '';
  if (options.iconUrl) {
    iconPath = `${appDir}/${appName}.png`;
    await runWithSudo(`curl -o "${iconPath}" "${options.iconUrl}"`);
  }

  const desktopEntry = `
[Desktop Entry]
Name=${appName}
Exec="${appDir}/${appName}.AppImage" ${options.cliParams || ''}
${iconPath ? `Icon=${iconPath}` : ''}
Type=Application
Categories=Utility;
Terminal=false
Comment=AppImage application
`;

  const tempDesktopFile = `/tmp/${appName}.desktop`;
  await fs.writeFile(tempDesktopFile, desktopEntry);
  await runWithSudo(`mv "${tempDesktopFile}" "${APPLICATIONS_DIR}/${appName}.desktop"`);
  await runWithSudo(`chmod +x "${APPLICATIONS_DIR}/${appName}.desktop"`);

  // Create symbolic link in user's local applications directory
  const userLocalDir = `${process.env.HOME}/.local/share/applications`;
  await runWithSudo(`mkdir -p "${userLocalDir}"`);
  await runWithSudo(`ln -sf "${APPLICATIONS_DIR}/${appName}.desktop" "${userLocalDir}/${appName}.desktop"`);

  // Update desktop database
  await runWithSudo('update-desktop-database /usr/share/applications');

  console.log(`${appName} has been installed successfully!`);
  console.log(`Desktop entry created at: ${APPLICATIONS_DIR}/${appName}.desktop`);
  console.log(`Symlink created at: ${userLocalDir}/${appName}.desktop`);
}

async function listAppImages(showDetails: boolean) {
  const appImages = await fs.readdir(APPIMAGE_DIR);

  if (appImages.length === 0) {
    console.log('No AppImages installed.');
    return;
  }

  console.log('Installed AppImages:');
  for (const appName of appImages) {
    console.log(`- ${appName}`);
    if (showDetails) {
      const desktopFilePath = `${APPLICATIONS_DIR}/${appName}.desktop`;
      try {
        const desktopFile = await fs.readFile(desktopFilePath, 'utf-8');
        const execLine = desktopFile.split('\n').find(line => line.startsWith('Exec='));
        const iconLine = desktopFile.split('\n').find(line => line.startsWith('Icon='));
        console.log(`  Desktop Entry: ${desktopFilePath}`);
        console.log(`  Exec: ${execLine?.split('=')[1] || 'N/A'}`);
        console.log(`  Icon: ${iconLine?.split('=')[1] || 'N/A'}`);
        console.log(`  AppImage Path: ${APPIMAGE_DIR}/${appName}/${appName}.AppImage`);
        console.log('');
      } catch (error) {
        console.log(`  Error reading desktop file: ${error.message}`);
      }
    }
  }
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function uninstallAppImage(pattern: string) {
  const appImages = await fs.readdir(APPIMAGE_DIR);
  const matchingApps = appImages.filter(app => app.match(new RegExp(pattern.replace('*', '.*'))));

  if (matchingApps.length === 0) {
    console.log('No matching AppImages found.');
    return;
  }

  console.log('Matching AppImages:');
  matchingApps.forEach(app => console.log(`- ${app}`));

  const shouldProceed = await confirm('Are you sure you want to uninstall these AppImages? (y/n) ');

  if (!shouldProceed) {
    console.log('Uninstallation cancelled.');
    return;
  }

  for (const app of matchingApps) {
    await runWithSudo(`rm -rf ${APPIMAGE_DIR}/${app}`);
    await runWithSudo(`rm ${APPLICATIONS_DIR}/${app}.desktop`);
    await runWithSudo(`rm ${LOCAL_APPLICATIONS_DIR}/${app}.desktop`);
    console.log(`Uninstalled ${app}`);
  }

  console.log('Uninstallation complete.');
}

async function main() {
  const args = minimist(process.argv.slice(2), {
    string: ['icon', 'params', 'uninstall'],
    boolean: ['help', 'list', 'details'],
    alias: { list: 'ls', uninstall: 'remove' }
  });

  if (args.help || args._.length === 0 && Object.keys(args).length === 1) {
    showHelp();
    return;
  }

  const command = args._[0];
  const options: AppImageOptions = {
    iconUrl: args.icon,
    cliParams: args.params,
    showDetails: args.details,
    uninstallPattern: args.uninstall
  };

  switch (command) {
    case 'install':
      if (args._.length < 2) {
        console.error('Please provide the path to the AppImage file.');
        process.exit(1);
      }
      await installAppImage(args._[1], options);
      break;
    case 'ls':
    case 'list':
      await listAppImages(options.showDetails);
      break;
    case 'remove':
    case 'uninstall':
      const pattern = options.uninstallPattern || args._[1];
      if (!pattern) {
        console.error('Please provide an AppImage name or pattern to uninstall.');
        process.exit(1);
      }
      await uninstallAppImage(pattern);
      break;
    default:
      if (args._.length > 0) {
        await installAppImage(args._[0], options);
      } else {
        showHelp();
        process.exit(1);
      }
  }
}

main().catch(console.error);

// vim: set ts=2 sw=2 et
