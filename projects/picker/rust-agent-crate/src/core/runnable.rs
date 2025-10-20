// Runnable 接口定义 - 框架的核心概念
use std::collections::HashMap;
use std::pin::Pin;
use futures::stream::Stream;
use serde_json::Value;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

// Runnable 接口定义
pub trait Runnable<I: Send + 'static, O: Send + 'static>: Send + Sync {
    // 核心异步调用方法（主要入口点）
    fn invoke(&self, input: I) -> Pin<Box<dyn std::future::Future<Output = Result<O, anyhow::Error>> + Send>>;
    
    // 带配置的调用变体 - 可选实现
    fn invoke_with_config(
        &self, 
        input: I, 
        _config: Option<HashMap<String, Value>>
    ) -> Pin<Box<dyn std::future::Future<Output = Result<O, anyhow::Error>> + Send>> {
        self.invoke(input)
    }
    
    // 异步批量处理多个输入
    fn batch(&self, inputs: Vec<I>) -> Pin<Box<dyn std::future::Future<Output = Vec<Result<O, anyhow::Error>>> + Send>> {
        let self_clone = self.clone_to_owned();
        Box::pin(async move {
            // 提供默认实现，具体组件可覆盖优化
            futures::future::join_all(inputs.into_iter().map(|input| {
                let self_clone_inner = self_clone.clone_to_owned();
                async move {
                    self_clone_inner.invoke(input).await
                }
            })).await
        })
    }
    
    // 批量处理的变体 - 可选实现
    // 暂时简化实现，避免复杂的异步组合问题
    fn batch_with_config(
        &self, 
        inputs: Vec<I>, 
        _config: Option<HashMap<String, Value>>
    ) -> Pin<Box<dyn std::future::Future<Output = Vec<Result<O, anyhow::Error>>> + Send>> {
        // 直接调用 batch 方法
        self.batch(inputs)
    }
    
    // 流式处理接口 - 同步实现
    fn stream(&self, input: I) -> Box<dyn Stream<Item = Result<O, anyhow::Error>> + Send> {
        // 简单实现：使用futures的stream::once包装单个结果
        let self_clone = self.clone_to_owned();
        let (tx, rx) = tokio::sync::mpsc::channel::<Result<O, anyhow::Error>>(1);
        
        // 在单独的任务中执行invoke并发送结果
        tokio::spawn(async move {
            let result = self_clone.invoke(input).await;
            let _ = tx.send(result).await;
        });
        
        // 将mpsc接收器转换为Stream
        Box::new(tokio_stream::wrappers::ReceiverStream::new(rx))
    }
    
    // 异步流式处理 - 可选实现
    fn astream(
        &self, 
        _input: I
    ) -> Pin<Box<dyn std::future::Future<Output = Box<dyn Stream<Item = Result<O, anyhow::Error>> + Send>> + Send>> {
        let _self_clone = self.clone_to_owned();
        
        Box::pin(async move {
            // 简单实现：返回一个空的流
            let (_tx, rx) = mpsc::channel(10);
            // 创建并返回一个空流，添加显式类型转换
            let stream: Box<dyn Stream<Item = Result<O, anyhow::Error>> + Send> = Box::new(ReceiverStream::new(rx));
            stream
        })
    }
    
    // 用于astream默认实现的辅助方法，需要在实现时提供
    fn clone_to_owned(&self) -> Box<dyn Runnable<I, O> + Send + Sync>;
}

// Runnable扩展trait
pub trait RunnableExt<I: Send + 'static, O: Send + 'static> {
    fn pipe<NextO: Send + 'static>(
        self: Box<Self>,
        next: impl Runnable<O, NextO> + Send + Sync + 'static
    ) -> impl Runnable<I, NextO> + Send + Sync
    where
        Self: Sized + 'static + Send + Sync;
}

// 为Runnable提供扩展方法
impl<T: Runnable<I, O> + ?Sized, I: Send + 'static, O: Send + 'static> RunnableExt<I, O> for T {
    fn pipe<NextO: Send + 'static>(
        self: Box<Self>,
        next: impl Runnable<O, NextO> + Send + Sync + 'static
    ) -> impl Runnable<I, NextO> + Send + Sync
    where
        Self: Sized + 'static + Send + Sync,
    {
        // 调用pipe函数来组合两个Runnable
        pipe(*self, next)
    }
}

// 工具函数：创建管道连接两个Runnable
pub fn pipe<I: Send + 'static, O1: Send + 'static, O2: Send + 'static>(
    first: impl Runnable<I, O1> + Send + Sync + 'static,
    second: impl Runnable<O1, O2> + Send + Sync + 'static
) -> Box<dyn Runnable<I, O2> + Send + Sync> {
    // 实现组合逻辑：创建一个实现Runnable的结构体
    // 封装两个组件并按顺序执行
    struct PipeImpl<I: Send + 'static, O1: Send + 'static, O2: Send + 'static> {
        first: Box<dyn Runnable<I, O1> + Send + Sync>,
        second: Box<dyn Runnable<O1, O2> + Send + Sync>,
    }
    
    impl<I: Send + 'static, O1: Send + 'static, O2: Send + 'static> Runnable<I, O2> for PipeImpl<I, O1, O2> {
        fn invoke(&self, input: I) -> Pin<Box<dyn std::future::Future<Output = Result<O2, anyhow::Error>> + Send>> {
            let first_clone = self.first.clone_to_owned();
            let second_clone = self.second.clone_to_owned();
            
            Box::pin(async move {
                let intermediate = first_clone.invoke(input).await?;
                second_clone.invoke(intermediate).await
            })
        }
        
        fn clone_to_owned(&self) -> Box<dyn Runnable<I, O2> + Send + Sync> {
            // 注意：此处实现假设组件可以被克隆，实际实现可能需要调整
            Box::new(PipeImpl {
                first: self.first.clone_to_owned(),
                second: self.second.clone_to_owned(),
            })
        }
    }
    
    // Send 和 Sync 会自动推导，因为内部字段已经是 Send + Sync 的
    
    Box::new(PipeImpl {
        first: Box::new(first),
        second: Box::new(second),
    })
}

// RunnableSequence结构体
pub struct RunnableSequence<I, O> {
    // 在实际实现中，这里需要存储链中的各个组件
    // 例如：对于简单的双组件链
    // first: Box<dyn Runnable<I, O1> + Send + Sync>,
    // second: Box<dyn Runnable<O1, O> + Send + Sync>,
    
    // 实际实现可能更复杂，取决于支持的链长度
    inner: Box<dyn Runnable<I, O> + Send + Sync>,
}

// RunnableSequence的辅助方法
impl<I: Send + 'static, O: Send + 'static> RunnableSequence<I, O> {
    pub fn new(runnable: impl Runnable<I, O> + Send + Sync + 'static) -> Self {
        // 实际实现中需要将runnable存储在结构体中
        Self {
            inner: Box::new(runnable),
        }
    }
}

// 为RunnableSequence实现Runnable接口
impl<I: 'static + Send, O: 'static + Send> Runnable<I, O> for RunnableSequence<I, O> {
    fn invoke(&self, input: I) -> Pin<Box<dyn std::future::Future<Output = Result<O, anyhow::Error>> + Send>> {
        let inner = self.inner.clone_to_owned();
        inner.invoke(input)
    }
    
    fn clone_to_owned(&self) -> Box<dyn Runnable<I, O> + Send + Sync> {
        Box::new(RunnableSequence {
            inner: self.inner.clone_to_owned(),
        })
    }
}

// 为Box<dyn Runnable>实现clone_to_owned方法的示例
impl<I: Send + 'static, O: Send + 'static> Runnable<I, O> for Box<dyn Runnable<I, O> + Send + Sync> {
    fn invoke(&self, input: I) -> Pin<Box<dyn std::future::Future<Output = Result<O, anyhow::Error>> + Send>> {
        let self_clone = self.clone_to_owned();
        Box::pin(async move {
            self_clone.invoke(input).await
        })
    }
    
    fn clone_to_owned(&self) -> Box<dyn Runnable<I, O> + Send + Sync> {
        (**self).clone_to_owned()
    }
}