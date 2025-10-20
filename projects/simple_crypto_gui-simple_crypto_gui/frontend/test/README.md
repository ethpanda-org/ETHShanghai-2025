# 测试说明

## 测试框架

本项目使用以下测试框架和工具：

- [Jest](https://jestjs.io/) - JavaScript测试运行器
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - React组件测试工具
- [@testing-library/jest-dom](https://testing-library.com/docs/ecosystem-jest-dom/) - DOM测试断言扩展

## 安装依赖

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom babel-jest @babel/preset-env @babel/preset-react
```

## 运行测试

### 运行所有测试

```bash
npm test
```

### 运行测试并生成覆盖率报告

```bash
npm run test:coverage
```

### 运行特定测试文件

```bash
npm test -- test/App.test.jsx
```

## 测试文件结构

```
test/
├── components/          # 组件测试
├── pages/               # 页面测试
├── utils/               # 工具函数测试
├── setupTests.js        # 测试环境设置
└── README.md            # 测试说明文档
```

## 测试编写指南

1. 组件测试应该关注组件的行为而不是实现细节
2. 使用Jest的mock功能来模拟外部依赖
3. 测试应该是独立的、可重复的
4. 为关键功能和边缘情况编写测试