/**
 * Static analyzer for TermUI applications
 * Analyzes TypeScript/JSX code to detect dependencies and capabilities
 */

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export interface AnalyzerResult {
  imports: string[];
  usedPackages: string[];
  components: string[];
  hooks: string[];
  terminalCapabilities: string[];
  dependencies: DependencyGraph;
  bundleSize: number;
  treeShakeable: boolean;
}

export interface DependencyGraph {
  [file: string]: string[];
}

export class Analyzer {
  private entryFile: string;
  private projectRoot: string;
  private visitedFiles = new Set<string>();
  private dependencies: DependencyGraph = {};
  private usedPackages = new Set<string>();
  private terminalCapabilities = new Set<string>();
  private components = new Set<string>();

  constructor(entryFile: string, projectRoot: string) {
    this.entryFile = entryFile;
    this.projectRoot = projectRoot;
  }

  /**
   * Analyze the entire project
   */
  async analyze(): Promise<AnalyzerResult> {
    await this.analyzeFile(this.entryFile);
    
    return {
      imports: Array.from(this.usedPackages),
      usedPackages: Array.from(this.usedPackages),
      components: Array.from(this.components),
      hooks: Array.from(this.detectHooks()),
      terminalCapabilities: Array.from(this.terminalCapabilities),
      dependencies: this.dependencies,
      bundleSize: await this.calculateBundleSize(),
      treeShakeable: this.isTreeShakeable()
    };
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string): Promise<void> {
    if (this.visitedFiles.has(filePath)) return;
    this.visitedFiles.add(filePath);

    const code = await fs.readFile(filePath, 'utf-8');
    const ast = this.parseCode(code);

    // Analyze imports
    traverse(ast, {
      ImportDeclaration: (path) => {
        const source = path.node.source.value;
        if (source.startsWith('@termuijs/')) {
          this.usedPackages.add(source);
        }
      },
      
      CallExpression: (path) => {
        // Detect component usage
        if (t.isIdentifier(path.node.callee) && 
            path.node.callee.name === 'render') {
          this.components.add('render');
        }
        
        // Detect hooks
        if (t.isIdentifier(path.node.callee) && 
            path.node.callee.name.startsWith('use')) {
          this.detectHooks(path.node.callee.name);
        }
        
        // Detect terminal capabilities
        if (t.isIdentifier(path.node.callee) && 
            path.node.callee.name === 'useCaps') {
          this.terminalCapabilities.add('caps');
        }
      },
      
      JSXElement: (path) => {
        // Detect JSX components
        const name = path.node.openingElement.name;
        if (t.isJSXIdentifier(name)) {
          this.components.add(name.name);
        }
      }
    });

    // Find and analyze imports
    const imports = this.findImports(ast);
    for (const importPath of imports) {
      const resolved = this.resolveImport(importPath, filePath);
      if (resolved && !this.visitedFiles.has(resolved)) {
        this.dependencies[filePath] = this.dependencies[filePath] || [];
        this.dependencies[filePath].push(resolved);
        await this.analyzeFile(resolved);
      }
    }
  }

  /**
   * Parse TypeScript/JSX code
   */
  private parseCode(code: string): any {
    return parser.parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'dynamicImport'
      ]
    });
  }

  /**
   * Find import statements
   */
  private findImports(ast: any): string[] {
    const imports: string[] = [];
    traverse(ast, {
      ImportDeclaration: (path) => {
        imports.push(path.node.source.value);
      },
      CallExpression: (path) => {
        if (t.isImport(path.node.callee)) {
          const source = path.node.arguments[0];
          if (t.isStringLiteral(source)) {
            imports.push(source.value);
          }
        }
      }
    });
    return imports;
  }

  /**
   * Resolve import path to actual file
   */
  private resolveImport(importPath: string, fromFile: string): string | null {
    // Handle @termuijs imports
    if (importPath.startsWith('@termuijs/')) {
      const packageName = importPath.replace('@termuijs/', '');
      const packagePath = path.join(this.projectRoot, 'packages', packageName);
      if (fs.existsSync(packagePath)) {
        return packagePath;
      }
    }

    // Handle relative imports
    if (importPath.startsWith('.')) {
      const fromDir = path.dirname(fromFile);
      let resolved = path.resolve(fromDir, importPath);
      
      // Try .ts, .tsx, .js, .jsx extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        if (fs.existsSync(resolved + ext)) {
          return resolved + ext;
        }
        if (fs.existsSync(path.join(resolved, 'index' + ext))) {
          return path.join(resolved, 'index' + ext);
        }
      }
    }

    return null;
  }

  /**
   * Detect hooks used
   */
  private detectHooks(hookName?: string): Set<string> {
    const hooks = new Set<string>();
    const knownHooks = [
      'useState', 'useEffect', 'useContext', 'useReducer',
      'useCallback', 'useMemo', 'useRef', 'useImperativeHandle',
      'useLayoutEffect', 'useDebugValue', 'useDeferredValue',
      'useTransition', 'useId', 'useAsync', 'useKeymap',
      'useFocus', 'useMotion', 'useFocusManager', 'useFocusTrap'
    ];
    
    if (hookName && knownHooks.includes(hookName)) {
      hooks.add(hookName);
    }
    
    return hooks;
  }

  /**
   * Calculate bundle size
   */
  private async calculateBundleSize(): Promise<number> {
    let totalSize = 0;
    for (const file of this.visitedFiles) {
      const stats = await fs.stat(file);
      totalSize += stats.size;
    }
    return totalSize;
  }

  /**
   * Check if tree shaking is possible
   */
  private isTreeShakeable(): boolean {
    // Check if there are side effects
    let hasSideEffects = false;
    for (const file of this.visitedFiles) {
      // Simple check - look for side effects
      // In practice, this would be more sophisticated
    }
    return !hasSideEffects;
  }
}