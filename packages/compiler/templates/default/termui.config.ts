/**
 * TermUI Compiler Configuration
 * This file defines how your application will be compiled
 */

import { CompilerConfig } from '@termuijs/compiler';

export default {
  // Entry point of your application
  entry: 'src/index.tsx',
  
  // Output directory
  output: 'dist/app',
  
  // Target platforms
  targets: [
    { os: 'win32', arch: 'x64' },   // Windows x64
    { os: 'linux', arch: 'x64' },   // Linux x64
    { os: 'linux', arch: 'arm64' }, // Linux ARM64 (Raspberry Pi)
    { os: 'darwin', arch: 'x64' },  // macOS x64
    { os: 'darwin', arch: 'arm64' }, // macOS ARM64 (Apple Silicon)
  ],
  
  // Build options
  minify: true,
  treeShake: true,
  
  // Optimization options
  optimize: {
    staticRendering: true,   // Pre-render static components
    inlineConstants: true,   // Inline constant values
    removeDevTools: true,    // Remove development tools
    deadCodeElimination: true, // Remove unused code
    constantFolding: true,   // Fold compile-time constants
    resourceMinimization: true // Minimize resources
  },
  
  // Asset handling
  assets: {
    include: ['**/*.png', '**/*.jpg', '**/*.css'],
    exclude: ['**/*.test.ts', '**/*.spec.ts'],
    embed: true // Embed assets in the binary
  },
  
  // Runtime configuration
  runtime: {
    version: '0.1.0',
    minMemory: 64, // MB
    maxMemory: 512 // MB
  }
} satisfies CompilerConfig;