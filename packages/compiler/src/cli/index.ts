#!/usr/bin/env node

/**
 * CLI interface for the compiler
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { Compiler } from '../bundler';
import { Analyzer } from '../analyzer';
import { Generator } from '../generator';
import { CompilerConfig } from '../types';

const program = new Command();

program
  .name('termui-compile')
  .description('Compile TermUI applications to standalone binaries')
  .version('0.1.0');

program
  .command('build')
  .description('Build the application')
  .option('-c, --config <path>', 'Path to config file', 'termui.config.ts')
  .option('-e, --entry <path>', 'Entry file')
  .option('-o, --output <path>', 'Output directory')
  .option('--minify', 'Minify output')
  .option('--no-minify', 'Do not minify output')
  .option('--tree-shake', 'Enable tree shaking')
  .option('--no-tree-shake', 'Disable tree shaking')
  .option('--target <target>', 'Target platform (win32-x64, linux-arm64, etc.)')
  .option('-w, --watch', 'Watch for changes')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      await buildCommand(options);
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze the application without building')
  .option('-e, --entry <path>', 'Entry file', 'index.tsx')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      await analyzeCommand(options);
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new TermUI project with compiler config')
  .option('-t, --template <name>', 'Template to use', 'default')
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (error) {
      console.error('❌ Init failed:', error);
      process.exit(1);
    }
  });

async function buildCommand(options: any) {
  console.log('🚀 TermUI Compiler v0.1.0');
  console.log('📦 Building your application...\n');

  // Load config
  const config = await loadConfig(options.config);
  
  // Override with CLI options
  if (options.entry) config.entry = options.entry;
  if (options.output) config.output = options.output;
  if (options.minify !== undefined) config.minify = options.minify;
  if (options.treeShake !== undefined) config.treeShake = options.treeShake;
  
  if (options.target) {
    const [os, arch] = options.target.split('-');
    config.targets = [{ os, arch }];
  }

  if (options.verbose) {
    console.log('Configuration:', JSON.stringify(config, null, 2));
  }

  // Compile
  const compiler = new Compiler(config);
  const result = await compiler.compile();

  console.log('\n✅ Build complete!');
  console.log(`📊 Size: ${(result.size / 1024).toFixed(2)} KB`);
  console.log(`📁 Output: ${config.output}`);
  
  if (result.binaries) {
    console.log('\n📦 Binaries created:');
    for (const binary of result.binaries) {
      console.log(`   ${binary.path} (${(binary.size / 1024).toFixed(2)} KB)`);
    }
  }
}

async function analyzeCommand(options: any) {
  console.log('🔍 Analyzing your application...\n');

  const entryPath = path.resolve(options.entry);
  const projectRoot = path.dirname(entryPath);
  
  const analyzer = new Analyzer(entryPath, projectRoot);
  const result = await analyzer.analyze();

  console.log('📊 Analysis Results:');
  console.log(`   Used packages: ${result.usedPackages.length}`);
  for (const pkg of result.usedPackages) {
    console.log(`     - ${pkg}`);
  }
  
  console.log(`\n   Components: ${result.components.length}`);
  for (const component of result.components) {
    console.log(`     - ${component}`);
  }
  
  console.log(`\n   Terminal capabilities: ${result.terminalCapabilities.length}`);
  console.log(`   Bundle size: ${(result.bundleSize / 1024).toFixed(2)} KB`);
  console.log(`   Tree shakeable: ${result.treeShakeable ? '✅ Yes' : '❌ No'}`);
}

async function initCommand(options: any) {
  console.log('🌟 Creating new TermUI project...\n');

  const templateDir = path.join(__dirname, '../../templates', options.template);
  const targetDir = process.cwd();

  if (!await fs.pathExists(templateDir)) {
    console.error(`❌ Template "${options.template}" not found`);
    process.exit(1);
  }

  // Copy template files
  await fs.copy(templateDir, targetDir);

  console.log('✅ Project initialized!');
  console.log('\nNext steps:');
  console.log('  1. Edit termui.config.ts');
  console.log('  2. Run: termui-compile build');
}

async function loadConfig(configPath: string): Promise<CompilerConfig> {
  const fullPath = path.resolve(configPath);
  
  if (!await fs.pathExists(fullPath)) {
    // Return default config
    return {
      entry: 'index.tsx',
      output: 'dist/app',
      targets: [
        { os: 'win32', arch: 'x64' },
        { os: 'linux', arch: 'x64' },
        { os: 'darwin', arch: 'x64' }
      ],
      minify: true,
      treeShake: true,
      optimize: {
        staticRendering: true,
        inlineConstants: true,
        removeDevTools: true,
        deadCodeElimination: true,
        constantFolding: true,
        resourceMinimization: true
      }
    };
  }

  // Import the config dynamically
  const configModule = await import(fullPath);
  return configModule.default || configModule;
}

// Run the program
program.parse();