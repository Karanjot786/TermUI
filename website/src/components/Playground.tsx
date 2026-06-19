import React, { useState, useEffect, useRef } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/themes/prism-tomorrow.css';
import * as Babel from '@babel/standalone';
import * as termuijsWidgets from '@termuijs/widgets';
import * as termuijsCore from '@termuijs/core';
import * as termuijsJsx from '@termuijs/jsx';
import { EXAMPLES } from '../examples';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// Fix for React inside the eval scope
const globalReact = React;

export default function Playground() {
  const [activeExample, setActiveExample] = useState('dashboard');
  const [code, setCode] = useState(EXAMPLES['dashboard'].code);
  const [error, setError] = useState<string | null>(null);
  
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const termuiAppRef = useRef<any>(null);

  const handleExampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value;
    setActiveExample(key);
    setCode(EXAMPLES[key].code);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  const handleInstall = () => {
    const cmd = `npx create-termui-app add ${EXAMPLES[activeExample].name.toLowerCase().replace(/\s+/g, '-')}`;
    navigator.clipboard.writeText(cmd);
    alert(`Copied install command: ${cmd}`);
  };

  // Initialize xterm.js once
  useEffect(() => {
    if (terminalContainerRef.current && !xtermRef.current) {
      const xterm = new XTerm({
        cols: 80,
        rows: 24,
        theme: {
          background: '#0c0c0c',
          foreground: '#cccccc',
        },
      });
      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);
      xterm.open(terminalContainerRef.current);
      fitAddon.fit();
      
      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      const handleResize = () => {
        if (fitAddonRef.current) fitAddonRef.current.fit();
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Compile and run the code whenever it changes
  useEffect(() => {
    let unmounted = false;

    if (termuiAppRef.current) {
      try {
        termuiAppRef.current.unmount();
      } catch (e) {
        // ignore
      }
      termuiAppRef.current = null;
    }


    try {
      // Prepare evaluation scope
      const customRequire = (moduleName: string) => {
        if (moduleName === '@termuijs/widgets') return termuijsWidgets;
        if (moduleName === '@termuijs/core') return termuijsCore;
        if (moduleName === '@termuijs/jsx') return termuijsJsx;
        if (moduleName === 'react') return globalReact;
        throw new Error(`Cannot find module '${moduleName}'`);
      };

      const exports = {};
      const module = { exports };

      // Transpile TSX to JS for TermUI
      const termuiTranspiled = Babel.transform(code, {
        presets: ['env', 'typescript'],
        plugins: [
          'transform-modules-commonjs',
          ['transform-react-jsx', {
            runtime: 'classic',
            pragma: 'TermUI.createElement',
            pragmaFrag: 'TermUI.Fragment'
          }]
        ],
        filename: 'code.tsx',
      }).code;

      if (!termuiTranspiled) throw new Error('Compilation failed.');

      // Provide TermUI scope
      const scope = {
        exports,
        module,
        require: customRequire,
        TermUI: termuijsJsx,
      };

      // Execute code
      const fn = new Function(...Object.keys(scope), termuiTranspiled);
      fn(...Object.values(scope));

      // Get Default Export
      const AppComponent = (module.exports as any).default;
      if (typeof AppComponent !== 'function') {
        throw new Error('Default export must be a function/component.');
      }

      // We need to construct a custom App because termuijsJsx.render doesn't allow custom stdout
      const element = termuijsJsx.createElement(AppComponent, null);
      let rootWidget = termuijsJsx.reconcile(element);
      
      const rootBox = new termuijsWidgets.Box({
          flexDirection: 'column',
          width: '100%',
          height: '100%',
      });
      rootBox.addChild(rootWidget);

      // Create a mock WriteStream that pipes to xterm
      const mockStdout = Object.assign(new termuijsCore.EventEmitter(), {
        write: (chunk: string) => {
          if (!unmounted && xtermRef.current) {
            xtermRef.current.write(chunk);
          }
          return true;
        },
        columns: xtermRef.current?.cols || 80,
        rows: xtermRef.current?.rows || 24,
        isTTY: true,
      });

      // Create a mock ReadStream for stdin
      const mockStdin = Object.assign(new termuijsCore.EventEmitter(), {
        isTTY: true,
        setRawMode: () => {},
        resume: () => {},
        pause: () => {},
      });

      // Listen for xterm inputs to feed into stdin
      if (xtermRef.current) {
        xtermRef.current.onData(data => {
          if (!unmounted) {
            mockStdin.emit('data', Buffer.from(data));
          }
        });
      }

      const app = new termuijsCore.App(rootBox, { 
        fullscreen: true,
        stdout: mockStdout as any,
        stdin: mockStdin as any,
        mouse: true,
        skipFallback: true,
      });

      // Mount and start
      termuijsJsx.setCurrentApp(app);
      app.mount().catch(err => {
        console.error("Mount error:", err);
      });
      termuiAppRef.current = app;

      // Handle re-renders similarly to standard termuijsJsx.render
      termuijsJsx.setRequestRender(() => {
        const instances = (globalThis as any).__termuijs_instances;
        const rootInstance = instances?.get(rootWidget);
        let newRoot;
        if (rootInstance) {
            newRoot = termuijsJsx.reRenderComponent(rootInstance);
        } else {
            newRoot = termuijsJsx.reconcile(element);
        }
        rootBox.clearChildren();
        rootBox.addChild(newRoot);
        rootBox.markDirty();
        rootWidget = newRoot;
        app.screen.invalidate();
        app.requestRender();
      });

      setError(null);

    } catch (err: any) {
      console.error(err);
      setError(err.message || String(err));
    }

    return () => {
      if (termuiAppRef.current) {
        try {
          termuiAppRef.current.unmount();
        } catch (e) { }
      }
      try {
        termuijsJsx.unmountAll();
      } catch (e) { }
      unmounted = true;
    };
  }, [code]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0a0a0a', color: '#e5e5e5', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '1rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>TermUI Playground</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={activeExample} 
            onChange={handleExampleChange}
            style={{ padding: '0.5rem', backgroundColor: '#1f1f1f', color: '#e5e5e5', border: '1px solid #333', borderRadius: '4px' }}
          >
            {Object.entries(EXAMPLES).map(([key, ex]) => (
              <option key={key} value={key}>{ex.name}</option>
            ))}
          </select>
          <button onClick={handleCopy} style={{ padding: '0.5rem 1rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Copy Code</button>
          <button onClick={handleInstall} style={{ padding: '0.5rem 1rem', background: '#007acc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Install Example</button>
        </div>
      </header>

      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <div style={{ width: '50%', borderRight: '1px solid #333', overflowY: 'auto', backgroundColor: '#1e1e1e' }}>
          <Editor
            value={code}
            onValueChange={setCode}
            highlight={c => Prism.highlight(c, Prism.languages.tsx, 'tsx')}
            padding={16}
            style={{
              fontFamily: '"Fira Code", "Menlo", "Monaco", "Consolas", monospace',
              fontSize: 14,
              minHeight: '100%',
            }}
          />
        </div>
        
        <div style={{ width: '50%', backgroundColor: '#000', padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', backgroundColor: '#0c0c0c', border: '1px solid #333', padding: '1rem', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
            {error && (
              <pre style={{ color: '#ff5555', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxWidth: '80ch', marginBottom: '1rem' }}>
                {error}
              </pre>
            )}
            <div style={{ flexGrow: 1, position: 'relative' }} ref={terminalContainerRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
