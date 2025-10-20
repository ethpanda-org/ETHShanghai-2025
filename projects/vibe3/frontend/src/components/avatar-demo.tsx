'use client';

import { Avatar } from './avatar';

export function AvatarDemo() {
  return (
    <div className="bg-card border rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">头像组件演示</h2>
      
      <div className="space-y-6">
        {/* 不同尺寸 */}
        <div>
          <h3 className="text-lg font-medium mb-3">不同尺寸</h3>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <Avatar name="张三" size="sm" />
              <span className="text-xs text-muted-foreground">sm</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar name="李四" size="md" />
              <span className="text-xs text-muted-foreground">md</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar name="王五" size="lg" />
              <span className="text-xs text-muted-foreground">lg</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar name="赵六" size="xl" />
              <span className="text-xs text-muted-foreground">xl</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar name="钱七" size={24} />
              <span className="text-xs text-muted-foreground">24px</span>
            </div>
          </div>
        </div>

        {/* 带图片的头像 */}
        <div>
          <h3 className="text-lg font-medium mb-3">带图片的头像</h3>
          <div className="flex items-center gap-4">
            <Avatar 
              name="张三" 
              size="lg" 
              url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
            />
            <Avatar 
              name="李四" 
              size="lg" 
              url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
            />
            <Avatar 
              name="王五" 
              size="lg" 
              url="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
            />
          </div>
        </div>

        {/* 不同名字的首字母 */}
        <div>
          <h3 className="text-lg font-medium mb-3">不同名字的首字母</h3>
          <div className="flex items-center gap-4">
            <Avatar name="张三" size="lg" />
            <Avatar name="李四" size="lg" />
            <Avatar name="王五" size="lg" />
            <Avatar name="赵六" size="lg" />
            <Avatar name="钱七" size="lg" />
            <Avatar name="孙八" size="lg" />
            <Avatar name="周九" size="lg" />
            <Avatar name="吴十" size="lg" />
          </div>
        </div>

        {/* 英文名字 */}
        <div>
          <h3 className="text-lg font-medium mb-3">英文名字</h3>
          <div className="flex items-center gap-4">
            <Avatar name="John Doe" size="lg" />
            <Avatar name="Jane Smith" size="lg" />
            <Avatar name="Michael Johnson" size="lg" />
            <Avatar name="Sarah Wilson" size="lg" />
            <Avatar name="David Brown" size="lg" />
          </div>
        </div>

        {/* 错误图片处理 */}
        <div>
          <h3 className="text-lg font-medium mb-3">错误图片处理（自动回退到首字母）</h3>
          <div className="flex items-center gap-4">
            <Avatar 
              name="张三" 
              size="lg" 
              url="https://invalid-url-that-will-fail.com/image.jpg"
            />
            <Avatar 
              name="李四" 
              size="lg" 
              url="https://another-invalid-url.com/avatar.png"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
