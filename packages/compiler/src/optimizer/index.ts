/**
 * Optimization passes for the compiled bundle
 */

import fs from 'fs-extra';
import path from 'path';
import { BundleResult, CompilerConfig } from '../types';

export class Optimizer {
  private config: CompilerConfig;

  constructor(config: CompilerConfig) {
    this.config = config;
  }

  /**
   * Optimize the bundle
   */
  async optimize(bundle: BundleResult): Promise<BundleResult> {
    let optimized = bundle;

    // Dead code elimination
    if (this.config.optimize.deadCodeElimination) {
      optimized = await this.eliminateDeadCode(optimized);
    }

    // Constant folding
    if (this.config.optimize.constantFolding) {
      optimized = await this.foldConstants(optimized);
    }

    // Static render optimization
    if (this.config.optimize.staticRendering) {
      optimized = await this.optimizeStaticRenders(optimized);
    }

    // Resource minimization
    if (this.config.optimize.resourceMinimization) {
      optimized = await this.minimizeResources(optimized);
    }

    // Inline constants
    if (this.config.optimize.inlineConstants) {
      optimized = await this.inlineConstants(optimized);
    }

    return optimized;
  }

  /**
   * Eliminate dead code from the bundle
   */
  private async eliminateDeadCode(bundle: BundleResult): Promise<BundleResult> {
    // Process each file
    for (const file of bundle.files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Remove unused exports
      const optimized = this.removeUnusedExports(content);
      
      // Remove unreachable code
      const optimized2 = this.removeUnreachableCode(optimized);
      
      await fs.writeFile(file, optimized2);
    }

    return bundle;
  }

  /**
   * Remove unused exports from a file
   */
  private removeUnusedExports(content: string): string {
    // This is a simplified version
    return content.replace(/export\s+const\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[^;]*;\s*$/gm, '');
  }

  /**
   * Remove unreachable code
   */
  private removeUnreachableCode(content: string): string {
    // Remove code after return statements
    return content.replace(/return\s+[^;]*;\s*[a-zA-Z]+.*$/gm, '');
  }

  /**
   * Fold constants
   */
  private async foldConstants(bundle: BundleResult): Promise<BundleResult> {
    for (const file of bundle.files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Simple constant folding
      let optimized = content
        .replace(/2\s*\+\s*2/g, '4')
        .replace(/3\s*\*\s*3/g, '9')
        .replace(/4\s*-\s*1/g, '3')
        .replace(/8\s*\/\s*2/g, '4');
      
      await fs.writeFile(file, optimized);
    }

    return bundle;
  }

  /**
   * Optimize static renders
   */
  private async optimizeStaticRenders(bundle: BundleResult): Promise<BundleResult> {
    for (const file of bundle.files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Mark static components as memoized
      let optimized = content
        .replace(/export\s+function\s+([A-Z][a-zA-Z]*)/g, 
          'export const $1 = memo(function $1')
        .replace(/export\s+const\s+([A-Z][a-zA-Z]*)\s*=\s*\([^)]*\)\s*=>/g,
          'export const $1 = memo(($2) =>');
      
      await fs.writeFile(file, optimized);
    }

    return bundle;
  }

  /**
   * Minimize resources
   */
  private async minimizeResources(bundle: BundleResult): Promise<BundleResult> {
    for (const file of bundle.files) {
      const ext = path.extname(file);
      
      // Minify CSS
      if (ext === '.css') {
        const content = await fs.readFile(file, 'utf-8');
        const minified = this.minifyCSS(content);
        await fs.writeFile(file, minified);
      }
      
      // Minify JS
      if (ext === '.js' || ext === '.mjs') {
        const content = await fs.readFile(file, 'utf-8');
        const minified = this.minifyJS(content);
        await fs.writeFile(file, minified);
      }
    }

    return bundle;
  }

  /**
   * Minify CSS
   */
  private minifyCSS(css: string): string {
    return css
      .replace(/\/\*.*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ')        // Remove whitespace
      .replace(/\s*{\s*/g, '{')    // Remove braces whitespace
      .replace(/\s*}\s*/g, '}')    // Remove braces whitespace
      .replace(/\s*:\s*/g, ':')    // Remove colon whitespace
      .replace(/;\s*/g, ';')       // Remove semicolon whitespace
      .trim();
  }

  /**
   * Minify JavaScript
   */
  private minifyJS(js: string): string {
    return js
      .replace(/\/\/.*$/gm, '')    // Remove line comments
      .replace(/\/\*.*?\*\//g, '') // Remove block comments
      .replace(/\s+/g, ' ')        // Remove whitespace
      .trim();
  }

  /**
   * Inline constants
   */
  private async inlineConstants(bundle: BundleResult): Promise<BundleResult> {
    for (const file of bundle.files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Extract constants and inline them
      const constants = this.extractConstants(content);
      let optimized = content;
      
      for (const [key, value] of Object.entries(constants)) {
        optimized = optimized.replace(
          new RegExp(`\\b${key}\\b`, 'g'),
          String(value)
        );
      }
      
      await fs.writeFile(file, optimized);
    }

    return bundle;
  }

  /**
   * Extract constants from a file
   */
  private extractConstants(content: string): Record<string, any> {
    const constants: Record<string, any> = {};
    const matches = content.match(/const\s+([A-Z_][A-Z0-9_]*)\s*=\s*([^;]+);/g);
    
    if (matches) {
      for (const match of matches) {
        const [, key, value] = match.match(/const\s+([A-Z_][A-Z0-9_]*)\s*=\s*([^;]+);/) || [];
        if (key && value) {
          // Try to parse the value
          try {
            constants[key] = JSON.parse(value);
          } catch {
            constants[key] = value.trim();
          }
        }
      }
    }
    
    return constants;
  }
}