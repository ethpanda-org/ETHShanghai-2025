# Poster Component

一个基于GSAP的3D旋转文字海报组件，具有交互式控制和截图功能。

## 功能特性

- 🎨 **3D旋转文字动画** - 使用GSAP实现的平滑3D旋转效果
- 🎯 **拖拽交互** - 支持鼠标和触摸拖拽控制旋转
- 🎲 **随机化视觉效果** - 一键随机化背景、颜色和贴纸
- ⏸️ **暂停/播放控制** - 控制动画的播放状态
- 📸 **截图功能** - 导出高质量PNG图片
- 📱 **响应式设计** - 适配各种屏幕尺寸
- 🎭 **多种视觉效果** - 支持多种渐变背景和贴纸样式

## 使用方法

```tsx
import { Poster } from '@/components/ui/poster';

export default function MyPage() {
  return (
    <div>
      <Poster className="my-poster" />
    </div>
  );
}
```

## 依赖要求

确保项目中已安装以下依赖：

```json
{
  "gsap": "^3.13.0",
  "html-to-image": "^1.11.11"
}
```

## 组件属性

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `className` | `string` | `''` | 自定义CSS类名 |

## 控制按钮

- **暂停/播放按钮** - 控制3D旋转动画的播放状态
- **截图按钮** - 导出当前视觉效果为PNG图片
- **随机化按钮** - 随机改变背景、颜色和贴纸样式

## 技术实现

- 使用GSAP进行高性能动画
- 支持Draggable和InertiaPlugin插件
- 使用html-to-image库进行截图
- 完全使用TypeScript编写，提供类型安全
- 使用React Hooks进行状态管理

## 样式定制

组件使用CSS变量进行样式定制，可以通过修改CSS变量来改变视觉效果：

```css
:root {
  --gradient-macha: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  --color-shockingly-green: #00ff88;
  --grey-dark: #333333;
}
```

## 注意事项

- 组件需要在客户端环境中运行（使用'use client'指令）
- 确保GSAP插件正确注册
- 截图功能需要现代浏览器支持
- 建议在移动设备上测试触摸交互
