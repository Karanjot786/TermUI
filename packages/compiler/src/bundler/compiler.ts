/**
 * Main Compiler class
 * Orchestrates the entire compilation process
 */

import { Analyzer } from '../analyzer';
import { Bundler } from './index';
import { Generator } from '../generator';
import { Optimizer } from '../optimizer';
import { CompilerConfig, BinaryOutput } from '../types';

export class Compiler {
  private config: CompilerConfig;

  constructor(config: CompilerConfig) {
    this.config = config;
  }

  /**
   * Main compile function
   */
  async compile(): Promise<{
    size: number;
    binaries: BinaryOutput[];
  }> {
    console.log('🚀 Starting compilation...\n');

    // 1. Analyze
    console.log('📊 Phase 1: Analysis');
    const analyzer = new Analyzer(this.config.entry, process.cwd());
    const analysis = await analyzer.analyze();
    console.log(`   ✅ Found ${analysis.usedPackages.length} dependencies`);
    console.log(`   ✅ Detected ${analysis.components.length} components\n`);

    // 2. Bundle
    console.log('📦 Phase 2: Bundling');
    const bundler = new Bundler(this.config);
    const bundle = await bundler.bundle();
    console.log(`   ✅ Bundle size: ${(bundle.size / 1024).toFixed(2)} KB\n`);

    // 3. Optimize
    console.log('⚡ Phase 3: Optimization');
    const optimizer = new Optimizer(this.config);
    const optimized = await optimizer.optimize(bundle);
    console.log(`   ✅ Optimized size: ${(optimized.size / 1024).toFixed(2)} KB\n`);

    // 4. Generate binaries
    console.log('🛠️  Phase 4: Binary Generation');
    const generator = new Generator(optimized, this.config);
    const result = await generator.generate();
    console.log(`   ✅ Generated ${result.outputs.length} binaries\n`);

    // 5. Get binary info
    const binaries = await this.getBinaryInfo(result.outputs);

    console.log('🎉 Compilation complete!');
    return {
      size: optimized.size,
      binaries
    };
  }

  /**
   * Get information about generated binaries
   */
  private async getBinaryInfo(paths: string[]): Promise<BinaryOutput[]> {
    const fs = await import('fs-extra');
    const info: BinaryOutput[] = [];

    for (const path of paths) {
      const stats = await fs.stat(path);
      info.push({
        path,
        size: stats.size,
        target: this.config.targets.find(t => path.includes(t.os)) || this.config.targets[0],
        startupTime: 0, // Would measure this
        memoryUsage: 0
      });
    }

    return info;
  }
}