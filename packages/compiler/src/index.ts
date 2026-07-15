/**
 * Native TUI Compiler for TermUI
 * Bundles TermUI apps into standalone binaries
 */

export { Compiler } from './bundler';
export { Analyzer } from './analyzer';
export { Generator } from './generator';
export { Optimizer } from './optimizer';
export { compile, compileProject } from './cli';

export type {
  CompilerConfig,
  CompilerOptions,
  TargetConfig,
  BinaryOutput,
  AnalyzerResult,
  BundleResult
} from './types';

export { version } from '../package.json';