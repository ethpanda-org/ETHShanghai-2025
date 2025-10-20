# 测试说明 / Testing Instructions

## 测试框架 / Testing Frameworks

本项目使用以下测试框架和工具：
This project uses the following testing frameworks and tools:

- [Jest](https://jestjs.io/) - JavaScript测试运行器 / JavaScript testing runner
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - React组件测试工具 / React component testing tool
- [@testing-library/jest-dom](https://testing-library.com/docs/ecosystem-jest-dom/) - DOM测试断言扩展 / DOM testing assertion extensions

## 安装依赖 / Install Dependencies

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom babel-jest @babel/preset-env @babel/preset-react
```

## 运行测试 / Running Tests

### 运行所有测试 / Run All Tests

```bash
npm test
```

### 运行测试并生成覆盖率报告 / Run Tests with Coverage Report

```bash
npm run test:coverage
```

### 运行特定测试文件 / Run Specific Test Files

```bash
npm test -- test/App.test.jsx
```

## 测试文件结构 / Test File Structure

```
test/
├── components/          # 组件测试 / Component tests
├── pages/               # 页面测试 / Page tests
├── utils/               # 工具函数测试 / Utility function tests
├── setupTests.js        # 测试环境设置 / Test environment setup
└── README.md            # 测试说明文档 / Test documentation
```

## 测试编写指南 / Test Writing Guidelines

1. 组件测试应该关注组件的行为而不是实现细节 / Component tests should focus on component behavior rather than implementation details
2. 使用Jest的mock功能来模拟外部依赖 / Use Jest's mock functionality to simulate external dependencies
3. 测试应该是独立的、可重复的 / Tests should be independent and repeatable
4. 为关键功能和边缘情况编写测试 / Write tests for key functionality and edge cases