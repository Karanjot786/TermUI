import { describe, it, expect } from 'vitest'
import { generateProject, type ProjectConfig } from './templates.js'

const baseConfig: ProjectConfig = {
    name: 'test-app',
    template: 'empty',
    theme: 'default',
    features: {
        router: false,
        dataProviders: false,
        hotReload: false,
    },
}

describe('generateProject', () => {
    it('generates files for empty template', () => {
        const files = generateProject(baseConfig)
        expect(files.length).toBeGreaterThan(0)
        const paths = files.map((f) => f.path)
        expect(paths).toContain('package.json')
        expect(paths).toContain('tsconfig.json')
    })

    it('package.json contains the project name', () => {
        const files = generateProject(baseConfig)
        const pkg = files.find((f) => f.path === 'package.json')!
        const parsed = JSON.parse(pkg.content)
        expect(parsed.name).toBe('test-app')
    })

    it('generates an entry point file', () => {
        const files = generateProject(baseConfig)
        const paths = files.map((f) => f.path)
        const hasEntry = paths.some(
            (p) => p.includes('index.tsx') || p.includes('index.ts'),
        )
        expect(hasEntry).toBe(true)
    })

    it('dashboard template includes data dependencies', () => {
        const files = generateProject({
            ...baseConfig,
            template: 'dashboard',
            features: { ...baseConfig.features, dataProviders: true },
        })
        const pkg = files.find((f) => f.path === 'package.json')!
        const parsed = JSON.parse(pkg.content)
        const deps = {
            ...parsed.dependencies,
            ...parsed.devDependencies,
        }
        expect('@termuijs/core' in deps).toBe(true)
    })

    it('interactive-tool template generates files', () => {
        const files = generateProject({
            ...baseConfig,
            template: 'interactive-tool',
        })
        expect(files.length).toBeGreaterThan(0)
    })

    it('cli-wrapper template generates files', () => {
        const files = generateProject({
            ...baseConfig,
            template: 'cli-wrapper',
        })
        expect(files.length).toBeGreaterThan(0)
    })
    
    it('file-manager template generates a focused package.json', () => {
        const files = generateProject({
            ...baseConfig,
            template: 'file-manager',
        })

        const paths = files.map((f) => f.path)
        expect(paths).toContain('package.json')
        expect(paths).toContain('src/index.tsx')

        const pkg = files.find((f) => f.path === 'package.json')!
        const parsed = JSON.parse(pkg.content)
        expect(parsed.dependencies['@termuijs/quick']).toBeUndefined()
        expect(parsed.dependencies['@termuijs/motion']).toBeUndefined()
        expect(parsed.dependencies['@termuijs/ui']).toBe('latest')
        expect(parsed.dependencies['@termuijs/widgets']).toBe('latest')
    })

    it('cli-tool template generates a minimal entry under 15 source lines', () => {
        const files = generateProject({
            ...baseConfig,
            template: 'cli-tool',
        })
        const entry = files.find((f) => f.path === 'src/index.tsx')!
        expect(entry).toBeDefined()
        expect(entry.content).toContain("from '@termuijs/jsx'")
        expect(entry.content).toContain('useKeymap')
        expect(entry.content).toContain("key: 'q'")
        const sourceLines = entry.content
            .split('\n')
            .filter((l) => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('/**'))
        expect(sourceLines.length).toBeLessThanOrEqual(15)
    })

    it('each generated file has non-empty content', () => {
        const files = generateProject(baseConfig)
        for (const file of files) {
            expect(file.content.length).toBeGreaterThan(0)
        }
    })

    it('tsconfig.json has jsx settings', () => {
        const files = generateProject(baseConfig)
        const tsconfig = files.find((f) => f.path === 'tsconfig.json')!
        expect(tsconfig.content).toContain('jsx')
    })
})
