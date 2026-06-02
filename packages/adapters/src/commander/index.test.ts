import { describe, it, expect } from 'vitest'
import { Command } from 'commander'
import { useCommander } from './index.js'

describe('useCommander', () => {
  it('parses a --file option from mock argv', () => {
    const program = new Command()
      .option('--file <path>', 'initial file path')

    const { options, args } = useCommander(program, ['node', 'app', '--file', 'foo.txt'])

    expect(options.file).toBe('foo.txt')
    expect(args).toEqual([])
  })

  it('returns empty options when no flags passed', () => {
    const program = new Command()
      .option('--file <path>', 'initial file path')

    const { options, args } = useCommander(program, ['node', 'app'])

    expect(options.file).toBeUndefined()
    expect(args).toEqual([])
  })

  it('parses positional args', () => {
    const program = new Command()
      .argument('[name]', 'project name')

    const { args } = useCommander(program, ['node', 'app', 'myproject'])

    expect(args).toEqual(['myproject'])
  })

  it('parses multiple options', () => {
    const program = new Command()
      .option('--file <path>', 'file path')
      .option('--verbose', 'enable verbose mode')

    const { options } = useCommander(program, ['node', 'app', '--file', 'bar.ts', '--verbose'])

    expect(options.file).toBe('bar.ts')
    expect(options.verbose).toBe(true)
  })
})