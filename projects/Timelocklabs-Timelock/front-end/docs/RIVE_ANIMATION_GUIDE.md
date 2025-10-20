# Rive 动画使用指南

本指南将帮助您在项目中使用 Rive 动画效果。

## 已完成的设置

### 1. 依赖安装
项目已安装 `@rive-app/react-canvas` 包，用于在 React 中渲染 Rive 动画。

### 2. 组件结构

#### RiveAnimation 组件 (`components/ui/RiveAnimation.tsx`)
通用的 Rive 动画组件，支持以下功能：
- 自动播放控制
- 状态机和动画控制
- 事件回调（加载、播放、暂停等）
- 自定义样式

#### HomeAnimation 组件 (`components/ui/HomeAnimation.tsx`)
专门用于首页的动画组件，使用项目中的 `homeAnimation.riv` 文件。

## 使用方法

### 基础用法

```tsx
import RiveAnimation from '@/components/ui/RiveAnimation';

// 基础使用
<RiveAnimation 
  src="/your-animation.riv"
  className="w-64 h-64"
/>

// 带回调的使用
<RiveAnimation 
  src="/your-animation.riv"
  className="w-64 h-64"
  autoplay={true}
  onLoad={() => console.log('动画加载完成')}
  onLoadError={(error) => console.error('动画加载失败:', error)}
/>
```

### 高级用法

```tsx
import { useRiveAnimation } from '@/components/ui/RiveAnimation';

// 使用 hook 进行更精细的控制
function MyComponent() {
  const { rive, RiveComponent } = useRiveAnimation({
    src: '/my-animation.riv',
    stateMachines: 'State Machine 1',
    autoplay: false,
    onLoad: () => {
      // 动画加载后的自定义逻辑
      if (rive) {
        rive.play();
      }
    }
  });

  const handlePlay = () => {
    rive?.play();
  };

  const handlePause = () => {
    rive?.pause();
  };

  return (
    <div>
      <RiveComponent className="w-full h-64" />
      <button onClick={handlePlay}>播放</button>
      <button onClick={handlePause}>暂停</button>
    </div>
  );
}
```

### 状态机控制

```tsx
<RiveAnimation 
  src="/interactive-animation.riv"
  stateMachines={['State Machine 1', 'State Machine 2']}
  onStateChange={(event) => {
    console.log('状态变化:', event);
  }}
/>
```

## 组件属性

### RiveAnimation Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `src` | `string` | - | Rive 文件路径（必需） |
| `className` | `string` | - | CSS 类名 |
| `autoplay` | `boolean` | `true` | 是否自动播放 |
| `stateMachines` | `string \| string[]` | - | 要使用的状态机 |
| `animations` | `string \| string[]` | - | 要播放的动画 |
| `artboard` | `string` | - | 要使用的画板 |
| `onLoad` | `() => void` | - | 动画加载完成回调 |
| `onLoadError` | `(error: any) => void` | - | 动画加载失败回调 |
| `onPlay` | `() => void` | - | 动画开始播放回调 |
| `onPause` | `() => void` | - | 动画暂停回调 |
| `onStop` | `() => void` | - | 动画停止回调 |
| `onLoop` | `() => void` | - | 动画循环回调 |
| `onStateChange` | `(event: any) => void` | - | 状态变化回调 |

## 最佳实践

### 1. 文件管理
- 将 `.riv` 文件放在 `public` 目录下
- 使用描述性的文件名，如 `homeAnimation.riv`、`loadingSpinner.riv`

### 2. 性能优化
- 对于大型动画文件，考虑懒加载
- 在组件卸载时停止动画以释放资源

```tsx
import { useEffect } from 'react';
import { useRiveAnimation } from '@/components/ui/RiveAnimation';

function MyComponent() {
  const { rive, RiveComponent } = useRiveAnimation({
    src: '/large-animation.riv',
    autoplay: false
  });

  useEffect(() => {
    return () => {
      // 组件卸载时停止动画
      rive?.stop();
    };
  }, [rive]);

  return <RiveComponent className="w-full h-64" />;
}
```

### 3. 错误处理
- 始终提供 `onLoadError` 回调
- 为动画加载失败提供备用方案

```tsx
function AnimationWithFallback() {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-64 h-64 flex items-center justify-center bg-gray-100">
        <span>动画加载失败</span>
      </div>
    );
  }

  return (
    <RiveAnimation 
      src="/animation.riv"
      className="w-64 h-64"
      onLoadError={() => setHasError(true)}
    />
  );
}
```

### 4. 响应式设计
- 使用 Tailwind CSS 类进行响应式布局
- 考虑在移动设备上禁用复杂动画以提升性能

```tsx
<RiveAnimation 
  src="/animation.riv"
  className="w-full h-32 md:h-64 lg:h-96"
  autoplay={!isMobile} // 移动设备上不自动播放
/>
```

## 示例场景

### 1. 加载动画
```tsx
<RiveAnimation 
  src="/loading-spinner.riv"
  className="w-16 h-16"
  autoplay={isLoading}
/>
```

### 2. 交互式按钮
```tsx
<button 
  onMouseEnter={() => rive?.play('hover')}
  onMouseLeave={() => rive?.play('idle')}
>
  <RiveAnimation 
    src="/button-animation.riv"
    className="w-8 h-8"
    stateMachines="Button States"
  />
</button>
```

### 3. 页面装饰
```tsx
<div className="relative">
  <RiveAnimation 
    src="/background-animation.riv"
    className="absolute inset-0 -z-10"
    autoplay={true}
  />
  <div className="relative z-10">
    {/* 页面内容 */}
  </div>
</div>
```

## 故障排除

### 常见问题

1. **动画不显示**
   - 检查文件路径是否正确
   - 确认 `.riv` 文件在 `public` 目录下
   - 查看浏览器控制台是否有错误信息

2. **动画性能问题**
   - 减少同时播放的动画数量
   - 使用 `autoplay={false}` 并手动控制播放
   - 考虑使用更简单的动画

3. **状态机不工作**
   - 确认 Rive 文件中包含指定的状态机
   - 检查状态机名称是否正确

## 更多资源

- [Rive 官方文档](https://rive.app/community/doc/)
- [React Canvas 文档](https://github.com/rive-app/rive-react)
- [Rive 社区](https://rive.app/community/)

---

现在您可以在项目中自由使用 Rive 动画了！如有问题，请参考本指南或查阅官方文档。