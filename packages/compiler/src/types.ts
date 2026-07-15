/**
 * Compiler type definitions
 */

export interface CompilerConfig {
  entry: string;
  output: string;
  targets: TargetConfig[];
  minify: boolean;
  treeShake: boolean;
  optimize: OptimizationConfig;
  assets?: AssetConfig;
  runtime?: RuntimeConfig;
}

export interface TargetConfig {
  os: 'win32' | 'linux' | 'darwin';
  arch: 'x64' | 'arm64' | 'wasm';
  output?: string;
}

export interface OptimizationConfig {
  staticRendering: boolean;
  inlineConstants: boolean;
  removeDevTools: boolean;
  deadCodeElimination: boolean;
  constantFolding: boolean;
  resourceMinimization: boolean;
}

export interface AssetConfig {
  include: string[];
  exclude: string[];
  embed: boolean;
}

export interface RuntimeConfig {
  version: string;
  minMemory: number;
  maxMemory: number;
}

export interface BinaryOutput {
  path: string;
  size: number;
  target: TargetConfig;
  startupTime: number;
  memoryUsage: number;
}

export interface AnalyzerResult {
  dependencies: string[];
  usedPackages: string[];
  terminalCapabilities: string[];
  bundleSize: number;
  treeShakeable: boolean;
}

export interface BundleResult {
  files: string[];
  size: number;
  entry: string;
  assets: string[];
}

export interface CompilerOptions {
  watch?: boolean;
  verbose?: boolean;
  noMinify?: boolean;
  noTreeShake?: boolean;
  debug?: boolean;
}