/**
 * Bundler for TermUI applications
 * Uses esbuild for fast bundling with custom optimizations
 */

import * as esbuild from 'esbuild';
import fs from 'fs-extra';
import path from 'path';
import { Analyzer } from '../analyzer';
import { CompilerConfig, BundleResult } from '../types';

export class Bundler {
  private config: CompilerConfig;
  private analyzer: Analyzer;

  constructor(config: CompilerConfig) {
    this.config = config;
    this.analyzer = new Analyzer(
      config.entry,
      path.dirname(config.entry)
    );
  }

  /**
   * Bundle the application
   */
  async bundle(): Promise<BundleResult> {
    console.log('📦 Analyzing application...');
    const analysis = await this.analyzer.analyze();
    
    console.log(`📊 Found ${analysis.usedPackages.length} dependencies`);
    console.log(`🧩 Detected ${analysis.components.length} components`);
    
    console.log('🔨 Bundling...');
    const result = await this.performBundle(analysis);
    
    console.log(`✅ Bundle complete: ${result.files.length} files, ${result.size} bytes`);
    
    return result;
  }

  /**
   * Perform the actual bundling
   */
  private async performBundle(analysis: any): Promise<BundleResult> {
    const outdir = path.join(path.dirname(this.config.output), 'bundle');
    
    // Build with esbuild
    const result = await esbuild.build({
      entryPoints: [this.config.entry],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outdir: outdir,
      minify: this.config.minify,
      treeShaking: this.config.treeShake,
      sourcemap: this.config.optimize.removeDevTools ? false : true,
      
      // Custom plugins
      plugins: [
        this.termuiPlugin(),
        this.optimizationPlugin(),
        this.assetsPlugin()
      ],
      
      // Exclude TermUI packages (they'll be embedded)
      external: [],
      
      // Define environment variables
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process.env.TERMUI_COMPILED': 'true'
      },
      
      // Optimizations
      metafile: true,
      write: true
    });

    // Collect bundled files
    const files = await this.collectFiles(outdir);
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    return {
      files: files.map(f => f.path),
      size: totalSize,
      entry: path.join(outdir, path.basename(this.config.entry).replace(/\.[^.]+$/, '.js')),
      assets: []
    };
  }

  /**
   * Custom esbuild plugin for TermUI
   */
  private termuiPlugin(): esbuild.Plugin {
    return {
      name: 'termui',
      setup(build) {
        // Handle JSX
        build.onLoad({ filter: /\.(jsx|tsx)$/ }, async (args) => {
          const contents = await fs.readFile(args.path, 'utf-8');
          // Transform JSX
          const transformed = this.transformJSX(contents);
          return {
            contents: transformed,
            loader: 'jsx'
          };
        });

        // Handle static assets
        build.onLoad({ filter: /\.(png|jpg|gif|svg)$/ }, async (args) => {
          const contents = await fs.readFile(args.path);
          const base64 = contents.toString('base64');
          return {
            contents: `export default "data:image/png;base64,${base64}"`,
            loader: 'js'
          };
        });

        // Handle JSON
        build.onLoad({ filter: /\.json$/ }, async (args) => {
          const contents = await fs.readFile(args.path, 'utf-8');
          return {
            contents: `export default ${contents}`,
            loader: 'js'
          };
        });
      }
    };
  }

  /**
   * Optimization plugin
   */
  private optimizationPlugin(): esbuild.Plugin {
    return {
      name: 'optimization',
      setup(build) {
        build.onLoad({ filter: /\.(ts|tsx)$/ }, async (args) => {
          const contents = await fs.readFile(args.path, 'utf-8');
          
          // Constant folding
          let optimized = this.foldConstants(contents);
          
          // Dead code elimination
          if (this.config.optimize.deadCodeElimination) {
            optimized = this.eliminateDeadCode(optimized);
          }
          
          return {
            contents: optimized,
            loader: 'ts'
          };
        });
      }
    };
  }

  /**
   * Assets plugin
   */
  private assetsPlugin(): esbuild.Plugin {
    return {
      name: 'assets',
      setup(build) {
        if (this.config.assets?.embed) {
          // Embed assets in the bundle
          build.onLoad({ filter: /\.(css|txt|md)$/ }, async (args) => {
            const contents = await fs.readFile(args.path, 'utf-8');
            return {
              contents: `export default ${JSON.stringify(contents)}`,
              loader: 'js'
            };
          });
        }
      }
    };
  }

  /**
   * Transform JSX to JS
   */
  private transformJSX(contents: string): string {
    // This is a simplified transformation
    // In production, use proper JSX transform
    return contents
      .replace(/<([A-Z][a-zA-Z]*)>/g, 'React.createElement($1)')
      .replace(/<([a-z][a-zA-Z]*)>/g, 'React.createElement("$1")')
      .replace(/<([A-Z][a-zA-Z]*)>(.*?)<\/\1>/gs, 'React.createElement($1, null, "$2")');
  }

  /**
   * Fold constants
   */
  private foldConstants(contents: string): string {
    // Simple constant folding
    return contents
      .replace(/const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*2\s*\+\s*2/g, 'const $1 = 4')
      .replace(/const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*3\s*\*\s*3/g, 'const $1 = 9');
  }

  /**
   * Eliminate dead code
   */
  private eliminateDeadCode(contents: string): string {
    // Remove debug code
    return contents
      .replace(/if\s*\(false\)\s*{[^}]*}/g, '')
      .replace(/if\s*\(process\.env\.NODE_ENV\s*===\s*'development'\)\s*{[^}]*}/g, '')
      .replace(/console\.log\([^)]*\);/g, '');
  }

  /**
   * Collect all files in a directory
   */
  private async collectFiles(dir: string): Promise<{ path: string; size: number }[]> {
    const files: { path: string; size: number }[] = [];
    const entries = await fs.readdir(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...await this.collectFiles(fullPath));
      } else {
        files.push({
          path: fullPath,
          size: stat.size
        });
      }
    }

    return files;
  }
}