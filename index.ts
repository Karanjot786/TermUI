import { App, Screen } from '@termuijs/core'
import { Box, Text } from '@termuijs/widgets'
 
// Build a simple widget tree
const root = new Box({ border: 'round', padding: 1 })
root.addChild(new Text('Hello from TermUI!'))
 
// Create and mount the app
const app = new App(root, { fullscreen: true })
await app.mount()