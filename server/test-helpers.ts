/**
 * Test Helpers for tRPC Testing
 * 
 * Provides utilities for creating tRPC callers in tests
 * with proper context and authentication.
 */

import { appRouter } from './routers/_app';

/**
 * Create a tRPC caller for testing
 * 
 * @param opts - Context options including headers
 * @returns tRPC caller instance
 */
export function createCaller(opts: { req?: { headers?: Record<string, string> } } = {}) {
  // Create a mock context based on the headers provided
  const storeId = opts.req?.headers?.['x-store-id'];
  
  // Create a mock Request object
  const mockHeaders = new Headers();
  if (storeId) {
    mockHeaders.set('x-store-id', storeId);
  }
  
  const mockRequest = new Request('http://localhost:3000', {
    headers: mockHeaders,
  });
  
  const context = {
    storeId: storeId || undefined,
    user: null,
    session: null,
    req: mockRequest,
    resHeaders: new Headers(),
  };

  return appRouter.createCaller(context);
}

