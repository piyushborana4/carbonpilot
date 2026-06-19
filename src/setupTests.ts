import "@testing-library/jest-dom";

// Mock fetch globally
const mockFetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
  })
);
global.fetch = mockFetch;
(window as any).fetch = mockFetch;

class MockHeaders {
  append() {}
  delete() {}
  get() { return null; }
  has() { return false; }
  set() {}
  forEach() {}
}
class MockRequest {
  url = "";
  method = "GET";
  headers = new MockHeaders();
}
class MockResponse {
  ok = true;
  status = 200;
  statusText = "OK";
  headers = new MockHeaders();
  json() { return Promise.resolve({}); }
  text() { return Promise.resolve(""); }
}

global.Headers = MockHeaders as any;
global.Request = MockRequest as any;
global.Response = MockResponse as any;
(window as any).Headers = MockHeaders as any;
(window as any).Request = MockRequest as any;
(window as any).Response = MockResponse as any;

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver;

// Mock standard storage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});
