import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// --- Configuration ---
// ... rest of the file ...

// --- Configuration ---

// Output directory for GitHub Pages
const outputDir = 'docs';

// Sub-projects to include
//  - path: Relative path to the sub-project's root directory
//  - name: The name of the subdirectory it will occupy in 'outputDir'
const subProjects = [
  {
    path: 'traffic-light-frontend', // Path to the traffic light app source
    name: 'traffic-light',   // Will be deployed to /docs/traffic-light/
  },
  // Add more projects here as needed:
  {
    path: 'todo-app-frontend', // Path to the new todo app source
    name: 'todo-app',        // Will be deployed to /docs/todo-app/
  },
  {
    path: 'hdf5visualizer-frontend', // Path to the hdf5visualizer source
    name: 'hdf5visualizer', // Will be deployed to /docs/hdf5visualizer/
  },
  // {
  //   path: 'path/to/another-app',
  //   name: 'another-app-name',
  // },
];

const rootDir = process.cwd();
const docsPath = path.join(rootDir, outputDir);

// Helper function to run shell commands
function runCommand(command, cwd = rootDir) {
  console.log(`\nExecuting in ${cwd}: ${command}`);
  try {
    execSync(command, { cwd, stdio: 'inherit' });
    console.log(`Successfully executed: ${command}`);
  } catch (error) {
    console.error(`\nFailed to execute command: ${command}`);
    console.error(error.message);
    process.exit(1); // Exit script with error
  }
}

// --- Main Deployment Steps ---

console.log('Starting deployment preparation...');

// 1. Clean existing output directory
console.log(`\nCleaning output directory: ${docsPath}`);
if (fs.existsSync(docsPath)) {
  fs.rmSync(docsPath, { recursive: true, force: true });
  console.log('Cleaned existing docs directory.');
} else {
  console.log('Docs directory does not exist, skipping clean.');
}
// We don't create it here; the first build step should do that.

// 2. Build the main landing page
// Assumes 'npm run build' in the root uses Vite and respects outputDir/base overrides
// Adjust if your build command or tool is different
console.log('\nBuilding main landing page...');
// Build directly into the 'docs' folder with base '/'
runCommand(`npm run build -- --outDir ${outputDir} --base /`, rootDir);

// 3. Build and copy sub-projects
console.log('\nProcessing sub-projects...');
for (const project of subProjects) {
  const projectPath = path.join(rootDir, project.path);
  const projectBuildDir = path.join(projectPath, 'dist'); // Assume sub-project builds to 'dist'
  const targetDir = path.join(docsPath, project.name);
  const baseHref = `/${project.name}/`;

  console.log(`\n--- Building sub-project: ${project.name} ---`);

  // Clean previous build output for the sub-project (optional but recommended)
  if (fs.existsSync(projectBuildDir)) {
      console.log(`Cleaning previous build in ${projectBuildDir}...`);
      fs.rmSync(projectBuildDir, { recursive: true, force: true });
  }

  // Build the sub-project with correct base path, outputting to its own 'dist'
  // Adjust command if needed (e.g., different build script name)
  runCommand(`npm run build -- --base ${baseHref}`, projectPath);

  console.log(`\nCopying build output from ${projectBuildDir} to ${targetDir}`);
  if (!fs.existsSync(projectBuildDir)) {
      console.error(`Build output directory not found: ${projectBuildDir}`);
      console.error(`Did the build for '${project.name}' fail or output elsewhere?`);
      process.exit(1);
  }
  // Ensure target directory exists (it might not if root build didn't create docs)
  if (!fs.existsSync(docsPath)) {
      fs.mkdirSync(docsPath);
  }
  fs.mkdirSync(targetDir, { recursive: true }); // Create the specific sub-directory
  fs.cpSync(projectBuildDir, targetDir, { recursive: true }); // Copy contents

  console.log(`Successfully copied ${project.name} build to ${targetDir}`);
}

console.log('\n-----------------------------------------');
console.log('Deployment preparation finished successfully!');
console.log(`Output ready in '${outputDir}' directory.`);
// console.log('Commit and push the contents of the `docs` directory to GitHub Pages.'); // Removed manual instruction
console.log('-----------------------------------------');

// --- Automatic Git Add, Commit, Push ---

console.log('\nAttempting to automatically add, commit, and push changes...');

// 1. Add changes in the output directory
// Use path.relative to ensure we only add the specific dir even if outputDir is absolute
const relativeDocsPath = path.relative(rootDir, docsPath);
runCommand(`git add ${relativeDocsPath}`);

// 2. Commit the changes
// Check if there are staged changes before committing
try {
  // Use --quiet to avoid output if nothing to commit, --exit-code to set status
  execSync('git diff --cached --quiet', { cwd: rootDir, stdio: 'ignore' });
  // If the above command succeeds (exit code 0), there are no staged changes
  console.log('\nNo changes staged in docs directory. Nothing to commit.');
} catch (error) {
  // If the above command fails (non-zero exit code), there are staged changes
  if (error.status === 1) {
    const commitMessage = `Deploy: Build site and update ${outputDir} - ${new Date().toISOString()}`;
    runCommand(`git commit -m "${commitMessage}"`);

    // 3. Push the commit
    // Assumes the current branch is configured to push to the correct remote
    runCommand('git push');

    console.log('\n-----------------------------------------');
    console.log('Git add, commit, and push completed successfully!');
    console.log('-----------------------------------------');
  } else {
    // Handle other potential errors from git diff
    console.error('\nError checking for staged changes:', error.message);
    process.exit(1);
  }
} 