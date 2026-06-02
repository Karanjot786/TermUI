/** @jsxImportSource @termuijs/jsx */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@termuijs/testing'
import { useWebSocket } from './hooks.js'


// We keep track of all created sockets so our tests can trigger events on them
let activeSockets: MockWebSocket[] = []

class MockWebSocket {
    url: string
    readyState = 0 // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
    
    // Event listeners that the hook will attach
    onopen: (() => void) | null = null
    onclose: (() => void) | null = null
    onmessage: ((event: { data: any }) => void) | null = null
    onerror: (() => void) | null = null
    
    sentData: any[] = []
    isClosed = false

    constructor(url: string) {
        this.url = url
        activeSockets.push(this)
    }

    send(data: any) {
        this.sentData.push(data)
    }

    close() {
        this.isClosed = true
        this.readyState = 3
    }
}

describe('useWebSocket hook', () => {
    beforeEach(() => {
        // Reset our tracker before every test
        activeSockets = []
        // Intercept global WebSocket and replace with our mock
        vi.stubGlobal('WebSocket', MockWebSocket)
        // Take control of setTimeout
        vi.useFakeTimers() 
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.useRealTimers()
    })

    // We need a dummy component to execute the hook
    function TestComponent({ url }: { url: string }) {
        const { state, message, send } = useWebSocket(url)
        
        // We attach the hook's output to a global object so the test can read it
        ;(global as any).hookResult = { state, message, send }
        
        return null 
    }

    it('exposes the default state and connects', () => {
        render(<TestComponent url="wss://test.com" />)
        
        const result = (global as any).hookResult
        expect(result.state).toBe('connecting')
        expect(result.message).toBeNull()
        expect(activeSockets.length).toBe(1)
        expect(activeSockets[0].url).toBe('wss://test.com')
    })

    it('updates state on open and receives messages', async () => {
        render(<TestComponent url="wss://test.com" />)
        const socket = activeSockets[0]

        // Simulate a successful connection
        socket.onopen?.()
        await Promise.resolve() // Flush the microtask queue so state updates
        expect((global as any).hookResult.state).toBe('open')

        // Simulate the server sending a message
        socket.onmessage?.({ data: 'Hello TermUI' })
        await Promise.resolve() // Flush the microtask queue so state updates
        expect((global as any).hookResult.message).toBe('Hello TermUI')
    })

    it('reconnects after a drop using exponential backoff', async () => {
        render(<TestComponent url="wss://test.com" />)
        let socket = activeSockets[0]

        // Connect successfully first
        socket.onopen?.()
        await Promise.resolve()
        
        // Simulate a dropped connection
        socket.onclose?.()
        await Promise.resolve()
        expect((global as any).hookResult.state).toBe('closed')

        // At this exact moment, it should NOT have reconnected yet
        expect(activeSockets.length).toBe(1)

        // Fast-forward time by 1 second (1000ms) asynchronously
        await vi.advanceTimersByTimeAsync(1000) 
        
        // Now it should have created a second socket to retry
        expect(activeSockets.length).toBe(2)
        expect((global as any).hookResult.state).toBe('connecting')
    })

    it('closes the socket when the component unmounts', () => {
        const { unmount } = render(<TestComponent url="wss://test.com" />)
        const socket = activeSockets[0]

        expect(socket.isClosed).toBe(false)
        
        // Destroy the component
        unmount()
        
        // The cleanup function should have fired
        expect(socket.isClosed).toBe(true)
    })
})