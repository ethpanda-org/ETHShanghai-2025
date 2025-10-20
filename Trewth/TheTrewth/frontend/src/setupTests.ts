// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// 解决 axios 在 Jest 中 ESM 解析报错，提供简单 mock
jest.mock('axios', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn(() => Promise.resolve({ data: [] })),
      post: jest.fn(() => Promise.resolve({ data: {} })),
    }
  };
});
