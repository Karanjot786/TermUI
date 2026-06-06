import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@termuijs/testing';
import { createElement } from '@termuijs/jsx';
import { useMutation, HttpMethod } from './useMutation.js';

describe('useMutation', () => {
    let mockFetch: any;

    beforeEach(() => {
        // Mock the global fetch API before each test
        mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);
        (global as any).hookResult = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        (global as any).hookResult = null;
    });

    // Dummy component to extract the hook's return values
    function TestComponent({ url, method }: { url: string, method?: HttpMethod }) {
        const result = useMutation(url, method);
        (global as any).hookResult = result;
        return null;
    }

    // Utility to wait for TermUI's state updates to process
    const flushPromises = async () => {
        for (let i = 0; i < 5; i++) {
            await Promise.resolve();
        }
    };

    it('Initial State is not loading', () => {
        render(createElement(TestComponent, { url: '/api/test' }));
        
        const result = (global as any).hookResult;
        
        // Mutations do not start on mount, so loading must be false
        expect(result.loading).toBe(false); 
        expect(result.data).toBeNull();
        expect(result.error).toBeNull();
        expect(typeof result.mutate).toBe('function');
    });

    it('Success State after mutation executes', async () => {
        const mockResponseData = { success: true, id: 123 };
        
        // Setup the mock fetch to simulate a successful API call
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => mockResponseData
        });

        render(createElement(TestComponent, { url: '/api/test', method: 'PUT' }));
        
        const mutate = (global as any).hookResult.mutate;
        const payload = { title: 'New Item' };
        
        // Execute the mutation
        const returnData = await mutate(payload);
        await flushPromises();

        // 1. Verify fetch was called with correct arguments
        expect(mockFetch).toHaveBeenCalledWith('/api/test', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 2. Verify the hook state updated correctly
        const result = (global as any).hookResult;
        expect(result.loading).toBe(false);
        expect(result.data).toEqual(mockResponseData);
        expect(result.error).toBeNull();
        
        // 3. Verify the mutate function returns the data directly
        expect(returnData).toEqual(mockResponseData);
    });

    it('Error Handling on failed HTTP status', async () => {
        // Setup the mock fetch to simulate a 404 error
        mockFetch.mockResolvedValue({
            ok: false,
            status: 404
        });

        render(createElement(TestComponent, { url: '/api/test' }));
        
        const mutate = (global as any).hookResult.mutate;
        
        // Execute the mutation and catch the expected error
        try {
            await mutate({});
        } catch (e) {
            // Error is expected, do nothing
        }
        await flushPromises();

        const result = (global as any).hookResult;
        expect(result.loading).toBe(false);
        expect(result.data).toBeNull();
        
        // Verify the error state was captured
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error?.message).toBe('HTTP error! status: 404');
    });

    it('Error Handling on network failure', async () => {
        const networkError = new Error('Network offline');
        mockFetch.mockRejectedValue(networkError);

        render(createElement(TestComponent, { url: '/api/test' }));
        
        const mutate = (global as any).hookResult.mutate;
        
        try {
            await mutate({});
        } catch (e) {
            // Expected
        }
        await flushPromises();

        const result = (global as any).hookResult;
        expect(result.loading).toBe(false);
        expect(result.data).toBeNull();
        expect(result.error).toBe(networkError);
    });
});