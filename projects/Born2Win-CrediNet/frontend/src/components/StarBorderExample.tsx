import React from 'react';
import { StarBorder } from './StarBorder';

/**
 * StarBorder 使用示例
 * 展示如何将星星边框特效应用到不同的组件中
 */

export const StarBorderExample: React.FC = () => {
  return (
    <div className="space-y-8 p-8">
      <h1 className="text-3xl font-bold text-white mb-8">星星边框特效示例</h1>

      {/* 基础示例 */}
      <StarBorder className="p-6">
        <h2 className="text-xl font-semibold text-white mb-2">基础示例</h2>
        <p className="text-gray-300">
          这是一个带有默认配置的星星边框效果
        </p>
      </StarBorder>

      {/* 自定义颜色 */}
      <StarBorder
        className="p-6"
        starColor="#a78bfa"
        glowColor="#8b5cf6"
      >
        <h2 className="text-xl font-semibold text-white mb-2">紫色主题</h2>
        <p className="text-gray-300">
          自定义星星颜色为紫色
        </p>
      </StarBorder>

      {/* 更多星星 */}
      <StarBorder
        className="p-6"
        starCount={10}
        speed={0.8}
        starColor="#fbbf24"
        glowColor="#f59e0b"
      >
        <h2 className="text-xl font-semibold text-white mb-2">金色主题 - 更多星星</h2>
        <p className="text-gray-300">
          增加星星数量和移动速度
        </p>
      </StarBorder>

      {/* 慢速动画 */}
      <StarBorder
        className="p-8"
        starCount={3}
        speed={0.3}
        starColor="#34d399"
        glowColor="#10b981"
      >
        <h2 className="text-xl font-semibold text-white mb-2">绿色主题 - 慢速</h2>
        <p className="text-gray-300">
          减少星星数量，放慢移动速度，营造平静氛围
        </p>
      </StarBorder>

      {/* 应用到卡片 */}
      <StarBorder
        className="p-6"
        starColor="#ec4899"
        glowColor="#db2777"
        borderRadius="1.5rem"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full"></div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">粉色卡片</h2>
            <p className="text-gray-300">
              可以包含任何内容的容器
            </p>
          </div>
        </div>
      </StarBorder>

      {/* 信用分数卡片示例 */}
      <StarBorder
        className="p-8"
        starCount={8}
        speed={0.6}
        starColor="#60a5fa"
        glowColor="#3b82f6"
      >
        <div className="text-center">
          <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-4">
            850
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">信用分数</h2>
          <p className="text-gray-300">
            优秀的信用表现
          </p>
        </div>
      </StarBorder>
    </div>
  );
};

export default StarBorderExample;

