# StarBorder 星星边框特效组件

## 简介

`StarBorder` 是一个可复用的 React 组件，为任何内容添加动态的星星边框动画效果。星星会沿着容器边框移动，并带有发光效果。

## 特性

- ✨ 动态星星粒子沿边框移动
- 🎨 可自定义颜色、数量、速度
- 🔧 完全的 TypeScript 支持
- 📦 零外部依赖（仅使用 Canvas API）
- 🎯 高性能动画（使用 requestAnimationFrame）
- 💎 支持自定义边框圆角和样式

## 基础用法

```tsx
import { StarBorder } from './components/StarBorder';

function MyComponent() {
  return (
    <StarBorder>
      <div className="p-6">
        <h2>你的内容</h2>
        <p>这里可以放任何内容</p>
      </div>
    </StarBorder>
  );
}
```

## API 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `children` | `React.ReactNode` | - | 必需，要包裹的内容 |
| `className` | `string` | `''` | 额外的 CSS 类名 |
| `speed` | `number` | `0.5` | 星星移动速度（0.1 - 2.0） |
| `starCount` | `number` | `5` | 星星数量（1 - 20） |
| `starColor` | `string` | `'#60a5fa'` | 星星颜色（蓝色） |
| `glowColor` | `string` | `'#3b82f6'` | 发光颜色 |
| `borderRadius` | `string` | `'1rem'` | 边框圆角 |
| `as` | `keyof JSX.IntrinsicElements` | `'div'` | 容器元素类型 |

## 使用示例

### 1. 应用到信用分数卡片

```tsx
<StarBorder
  className="p-8"
  starCount={8}
  speed={0.6}
  starColor="#60a5fa"
  glowColor="#3b82f6"
>
  <div className="text-center">
    <div className="text-6xl font-bold text-white">850</div>
    <p className="text-gray-300">信用分数</p>
  </div>
</StarBorder>
```

### 2. 紫色主题

```tsx
<StarBorder
  starColor="#a78bfa"
  glowColor="#8b5cf6"
>
  <YourContent />
</StarBorder>
```

### 3. 金色快速动画

```tsx
<StarBorder
  starCount={10}
  speed={0.8}
  starColor="#fbbf24"
  glowColor="#f59e0b"
>
  <YourContent />
</StarBorder>
```

### 4. 慢速平静效果

```tsx
<StarBorder
  starCount={3}
  speed={0.3}
  starColor="#34d399"
  glowColor="#10b981"
>
  <YourContent />
</StarBorder>
```

## 在 CrediNet 项目中的应用场景

### 1. 仪表盘卡片

将边框应用到主要的数据展示卡片：

```tsx
// 在 Dashboard.tsx 中
<StarBorder className="mb-6">
  <CRNBalanceCard />
</StarBorder>

<StarBorder>
  <CreditScoreCard />
</StarBorder>
```

### 2. SBT 展示

突出显示用户的 SBT：

```tsx
// 在 SBT 相关页面中
<StarBorder
  starColor="#a78bfa"
  glowColor="#8b5cf6"
>
  <SBTCard />
</StarBorder>
```

### 3. 重要通知或警报

```tsx
<StarBorder
  starCount={8}
  speed={0.7}
  starColor="#f59e0b"
  glowColor="#f97316"
>
  <div className="p-6">
    <h3>重要通知</h3>
    <p>您的信用分数已更新！</p>
  </div>
</StarBorder>
```

### 4. 信用可视化组件

```tsx
// 包裹 CreditOrbitVisualizer 或 CreditRadarChart
<StarBorder
  starCount={12}
  speed={0.4}
  starColor="#60a5fa"
  glowColor="#3b82f6"
>
  <CreditOrbitVisualizer />
</StarBorder>
```

## 性能优化建议

1. **限制星星数量**：在移动设备上建议使用 3-5 个星星
2. **调整速度**：较慢的速度（0.3-0.5）更加优雅且性能更好
3. **避免嵌套**：不要在一个 StarBorder 内嵌套另一个
4. **按需使用**：仅在需要突出显示的重要元素上使用

## 浏览器兼容性

- ✅ Chrome/Edge 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ 所有现代移动浏览器

## 示例页面

运行项目后访问 `/star-border-demo` 查看完整示例（需要先添加路由）。

或者直接导入 `StarBorderExample` 组件查看各种效果：

```tsx
import { StarBorderExample } from './components/StarBorderExample';

// 在某个页面中展示
<StarBorderExample />
```

## 技术细节

- 使用 Canvas API 渲染星星和发光效果
- 使用 `requestAnimationFrame` 实现流畅动画
- 响应式设计，自动适应容器尺寸变化
- 在组件卸载时正确清理动画资源

