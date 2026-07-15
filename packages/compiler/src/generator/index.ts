/**
 * Binary generator for TermUI applications
 * Creates standalone executables for different platforms
 */

import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BundleResult } from '../types';
import { TargetConfig } from '../types';

const execAsync = promisify(exec);

export class Generator {
  private bundle: BundleResult;
  private config: any;

  constructor(bundle: BundleResult, config: any) {
    this.bundle = bundle;
    this.config = config;
  }

  /**
   * Generate binaries for all targets
   */
  async generate(): Promise<{ outputs: string[] }> {
    const outputs: string[] = [];

    for (const target of this.config.targets) {
      console.log(`🛠️  Building for ${target.os}-${target.arch}...`);
      const output = await this.generateForTarget(target);
      outputs.push(output);
    }

    return { outputs };
  }

  /**
   * Generate binary for a specific target
   */
  private async generateForTarget(target: TargetConfig): Promise<string> {
    const outputPath = target.output || 
      path.join(this.config.output, `myapp-${target.os}-${target.arch}`);
    
    // Create the output directory
    await fs.ensureDir(path.dirname(outputPath));

    // Use pkg or node's native compilation
    await this.compileWithPkg(target, outputPath);

    return outputPath;
  }

  /**
   * Compile using pkg (node binary packaging)
   */
  private async compileWithPkg(target: TargetConfig, outputPath: string): Promise<void> {
    const pkgConfig = {
      name: 'termui-app',
      version: '1.0.0',
      description: 'TermUI compiled application',
      main: this.bundle.entry,
      scripts: {
        start: 'node ./bundle.js'
      },
      dependencies: {
        '@termuijs/core': '*'
      },
      pkg: {
        assets: this.bundle.files,
        targets: [`node18-${target.os}-${target.arch}`],
        outputPath: outputPath
      }
    };

    // Write package.json for pkg
    const pkgPath = path.join(path.dirname(outputPath), 'package.json');
    await fs.writeJson(pkgPath, pkgConfig, { spaces: 2 });

    // Run pkg
    try {
      const cmd = `npx pkg ${pkgPath} --targets node18-${target.os}-${target.arch} --output ${outputPath}`;
      await execAsync(cmd, { cwd: path.dirname(outputPath) });
    } catch (error) {
      console.error('Failed to compile with pkg:', error);
      throw error;
    }

    // Clean up package.json
    await fs.remove(pkgPath);
  }

  /**
   * Optimize the binary
   */
  private async optimizeBinary(binaryPath: string): Promise<void> {
    // Strip debug symbols
    try {
      await execAsync(`strip ${binaryPath}`);
    } catch (error) {
      // strip might not be available on all platforms
    }

    // Compress with upx if available
    try {
      await execAsync(`upx -9 ${binaryPath}`);
    } catch (error) {
      // upx might not be available
    }
  }
}