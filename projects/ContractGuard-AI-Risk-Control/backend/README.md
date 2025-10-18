# AI策略模式 - 基于注解实现

## 📋 架构说明

使用 **@AIStrategy** 注解实现策略模式,Spring自动扫描并注册所有AI策略。

## 🎯 核心组件

### 1. 注解定义
```java
@AIStrategy(value = AIStrategyType.CLAUDE, priority = 10)
public class ClaudeAnalysisStrategy implements AIAnalysisStrategy {
    // 实现
}
```

### 2. 策略类型枚举
- CLAUDE (claude)
- CHATGPT (chatgpt)
- DEEPSEEK (deepseek)
- GEMINI (gemini)

### 3. 自动扫描
Spring启动时自动扫描所有 @AIStrategy 注解的Bean并注册

## 🚀 使用方法

### 配置文件 (application.yml)
```yaml
ai:
  strategy: claude  # 默认策略
  
  claude:
    api-key: ${CLAUDE_API_KEY}
    model: claude-3-5-sonnet-20241022
  
  openai:
    api-key: ${OPENAI_API_KEY}
    model: gpt-4
```

### 环境变量 (推荐)
```bash
export CLAUDE_API_KEY=sk-ant-xxx
export OPENAI_API_KEY=sk-xxx
```

## 📦 新增AI策略

只需3步:

### Step 1: 创建策略类
```java
@AIStrategy(value = AIStrategyType.DEEPSEEK, priority = 30)
@Slf4j
public class DeepSeekAnalysisStrategy implements AIAnalysisStrategy {
    
    @Value("${ai.deepseek.api-key:}")
    private String apiKey;
    
    @Override
    public AIAnalysisResponse analyze(AnalysisRequest request) {
        // 实现分析逻辑
    }
    
    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isEmpty();
    }
}
```

### Step 2: 添加枚举值
```java
public enum AIStrategyType {
    DEEPSEEK("DeepSeek", "deepseek");
}
```

### Step 3: 添加配置
```yaml
ai:
  deepseek:
    api-key: ${DEEPSEEK_API_KEY}
```

**就这么简单!Spring会自动扫描并注册!**

## 🎨 优势

1. **自动发现**: 不需要手动注册策略
2. **优先级**: 通过priority控制选择顺序
3. **解耦**: 新增策略不影响现有代码
4. **可扩展**: 轻松添加新的AI服务

## 📡 API接口

### 查询可用策略
```bash
GET http://localhost:8082/ai/strategies
```

返回:
```json
{
  "code": 200,
  "data": ["claude", "chatgpt"]
}
```

### 查询策略详情
```bash
GET http://localhost:8082/ai/strategies/info
```

返回:
```json
{
  "code": 200,
  "data": {
    "defaultStrategy": "claude",
    "totalStrategies": 2,
    "strategies": [
      {
        "code": "claude",
        "name": "Claude AI",
        "available": true
      },
      {
        "code": "chatgpt",
        "name": "ChatGPT",
        "available": false
      }
    ]
  }
}
```

## 🔄 策略选择逻辑

1. 使用配置的默认策略
2. 如果不可用,按priority查找备用
3. 如果都不可用,抛出异常

## 📝 完整文件清单

```
annotation/
  ├── AIStrategy.java          # 策略注解
  └── AIStrategyType.java      # 策略类型枚举

service/ai/
  ├── AIAnalysisStrategy.java         # 策略接口
  ├── ClaudeAnalysisStrategy.java     # Claude实现
  ├── ChatGPTAnalysisStrategy.java    # ChatGPT实现
  └── AIStrategyFactory.java          # 策略工厂

controller/
  └── AIStrategyController.java       # 策略查询API
```

## ✅ 启动验证

启动后端,查看日志:
```
🔍 开始扫描AI策略...
✅ 注册AI策略: Claude AI (优先级: 10, 可用: true)
✅ 注册AI策略: ChatGPT (优先级: 20, 可用: false)
🎯 共注册 2 个AI策略
```

访问: http://localhost:8080/ai/strategies/info 查看策略状态

## 🎯 核心优势

相比传统工厂模式:
- ❌ 传统: 手动new,手动注册,维护Map
- ✅ 注解: 自动扫描,自动注册,零维护


**只需加个注解,其他交给Spring!** 🚀
