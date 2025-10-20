//! RAG (Retrieval-Augmented Generation) 知识检索系统
//! 
//! 用于检索合约模板、安全模式和最佳实践

use crate::error::AgentError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// RAG 知识检索系统
pub struct RAGKnowledgeSystem {
    /// 知识库文档
    documents: Vec<KnowledgeDocument>,
    
    /// 文档索引
    index: HashMap<String, Vec<usize>>,
    
    /// 嵌入模型配置
    embedding_config: EmbeddingConfig,
}

impl RAGKnowledgeSystem {
    /// 创建新的 RAG 知识系统
    pub async fn new(config: EmbeddingConfig) -> Result<Self, AgentError> {
        let mut system = Self {
            documents: Vec::new(),
            index: HashMap::new(),
            embedding_config: config,
        };
        
        // 加载预置的知识文档
        system.load_default_knowledge().await?;
        
        // 构建索引
        system.build_index().await?;
        
        Ok(system)
    }
    
    /// 加载默认知识库
    async fn load_default_knowledge(&mut self) -> Result<(), AgentError> {
        // 加载合约模板描述
        self.add_document(KnowledgeDocument {
            id: "erc20_basic".to_string(),
            title: "ERC-20 基础代币合约".to_string(),
            content: include_str!("../../knowledge/contracts/erc20_basic.md").to_string(),
            category: KnowledgeCategory::ContractTemplate,
            tags: vec!["erc20".to_string(), "token".to_string(), "fungible".to_string()],
            metadata: HashMap::new(),
        })?;
        
        self.add_document(KnowledgeDocument {
            id: "erc721_basic".to_string(),
            title: "ERC-721 NFT 合约".to_string(),
            content: include_str!("../../knowledge/contracts/erc721_basic.md").to_string(),
            category: KnowledgeCategory::ContractTemplate,
            tags: vec!["erc721".to_string(), "nft".to_string(), "non-fungible".to_string()],
            metadata: HashMap::new(),
        })?;
        
        self.add_document(KnowledgeDocument {
            id: "erc1155_multi".to_string(),
            title: "ERC-1155 多代币合约".to_string(),
            content: include_str!("../../knowledge/contracts/erc1155_multi.md").to_string(),
            category: KnowledgeCategory::ContractTemplate,
            tags: vec!["erc1155".to_string(), "multi-token".to_string()],
            metadata: HashMap::new(),
        })?;
        
        // 加载安全最佳实践
        self.add_document(KnowledgeDocument {
            id: "reentrancy_protection".to_string(),
            title: "重入攻击防护".to_string(),
            content: include_str!("../../knowledge/security/reentrancy.md").to_string(),
            category: KnowledgeCategory::SecurityPattern,
            tags: vec!["security".to_string(), "reentrancy".to_string(), "protection".to_string()],
            metadata: HashMap::new(),
        })?;
        
        self.add_document(KnowledgeDocument {
            id: "access_control".to_string(),
            title: "访问控制模式".to_string(),
            content: include_str!("../../knowledge/security/access_control.md").to_string(),
            category: KnowledgeCategory::SecurityPattern,
            tags: vec!["security".to_string(), "access-control".to_string(), "permissions".to_string()],
            metadata: HashMap::new(),
        })?;
        
        // 加载 Gas 优化技巧
        self.add_document(KnowledgeDocument {
            id: "gas_optimization".to_string(),
            title: "Gas 优化技巧".to_string(),
            content: include_str!("../../knowledge/optimization/gas_optimization.md").to_string(),
            category: KnowledgeCategory::Optimization,
            tags: vec!["gas".to_string(), "optimization".to_string(), "efficiency".to_string()],
            metadata: HashMap::new(),
        })?;
        
        // 加载 DeFi 模式
        self.add_document(KnowledgeDocument {
            id: "defi_patterns".to_string(),
            title: "DeFi 常见模式".to_string(),
            content: include_str!("../../knowledge/patterns/defi_patterns.md").to_string(),
            category: KnowledgeCategory::DesignPattern,
            tags: vec!["defi".to_string(), "patterns".to_string(), "finance".to_string()],
            metadata: HashMap::new(),
        })?;
        
        Ok(())
    }
    
    /// 添加文档到知识库
    pub fn add_document(&mut self, document: KnowledgeDocument) -> Result<(), AgentError> {
        let doc_id = document.id.clone();
        self.documents.push(document);
        
        // 更新索引
        let doc_index = self.documents.len() - 1;
        self.index.entry(doc_id).or_insert_with(Vec::new).push(doc_index);
        
        Ok(())
    }
    
    /// 构建文档索引
    async fn build_index(&mut self) -> Result<(), AgentError> {
        // 为每个文档构建关键词索引
        for (idx, doc) in self.documents.iter().enumerate() {
            // 索引标题
            for word in doc.title.to_lowercase().split_whitespace() {
                self.index.entry(word.to_string()).or_insert_with(Vec::new).push(idx);
            }
            
            // 索引标签
            for tag in &doc.tags {
                self.index.entry(tag.clone()).or_insert_with(Vec::new).push(idx);
            }
            
            // 索引类别
            let category_key = format!("category:{:?}", doc.category);
            self.index.entry(category_key).or_insert_with(Vec::new).push(idx);
        }
        
        Ok(())
    }
    
    /// 检索相关文档
    pub async fn retrieve(
        &self,
        query: &str,
        top_k: usize,
    ) -> Result<Vec<RetrievalResult>, AgentError> {
        // 简单的关键词匹配检索
        let query_lower = query.to_lowercase();
        let mut scores: HashMap<usize, f32> = HashMap::new();
        
        // 计算每个文档的相关性分数
        for (idx, doc) in self.documents.iter().enumerate() {
            let mut score = 0.0;
            
            // 标题匹配
            if doc.title.to_lowercase().contains(&query_lower) {
                score += 10.0;
            }
            
            // 内容匹配
            let content_lower = doc.content.to_lowercase();
            let matches = content_lower.matches(&query_lower).count();
            score += matches as f32 * 2.0;
            
            // 标签匹配
            for tag in &doc.tags {
                if query_lower.contains(&tag.to_lowercase()) {
                    score += 5.0;
                }
            }
            
            if score > 0.0 {
                scores.insert(idx, score);
            }
        }
        
        // 排序并返回 top_k 结果
        let mut results: Vec<_> = scores.into_iter().collect();
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        
        let top_results = results
            .into_iter()
            .take(top_k)
            .map(|(idx, score)| RetrievalResult {
                document: self.documents[idx].clone(),
                score,
                relevance: if score > 20.0 {
                    Relevance::High
                } else if score > 10.0 {
                    Relevance::Medium
                } else {
                    Relevance::Low
                },
            })
            .collect();
        
        Ok(top_results)
    }
    
    /// 按类别检索文档
    pub fn retrieve_by_category(
        &self,
        category: KnowledgeCategory,
    ) -> Vec<&KnowledgeDocument> {
        self.documents
            .iter()
            .filter(|doc| doc.category == category)
            .collect()
    }
    
    /// 按标签检索文档
    pub fn retrieve_by_tags(&self, tags: &[String]) -> Vec<&KnowledgeDocument> {
        self.documents
            .iter()
            .filter(|doc| tags.iter().any(|tag| doc.tags.contains(tag)))
            .collect()
    }
    
    /// 获取文档总数
    pub fn document_count(&self) -> usize {
        self.documents.len()
    }
}

/// 知识文档
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeDocument {
    /// 文档 ID
    pub id: String,
    
    /// 文档标题
    pub title: String,
    
    /// 文档内容
    pub content: String,
    
    /// 文档类别
    pub category: KnowledgeCategory,
    
    /// 标签
    pub tags: Vec<String>,
    
    /// 元数据
    pub metadata: HashMap<String, String>,
}

/// 知识类别
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum KnowledgeCategory {
    /// 合约模板
    ContractTemplate,
    
    /// 安全模式
    SecurityPattern,
    
    /// 设计模式
    DesignPattern,
    
    /// 优化技巧
    Optimization,
    
    /// 最佳实践
    BestPractice,
    
    /// 代码示例
    CodeExample,
}

/// 检索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetrievalResult {
    /// 文档
    pub document: KnowledgeDocument,
    
    /// 相关性分数
    pub score: f32,
    
    /// 相关性等级
    pub relevance: Relevance,
}

/// 相关性等级
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Relevance {
    High,
    Medium,
    Low,
}

/// 嵌入模型配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingConfig {
    /// 模型名称
    pub model_name: String,
    
    /// 向量维度
    pub dimension: usize,
    
    /// 批处理大小
    pub batch_size: usize,
}

impl Default for EmbeddingConfig {
    fn default() -> Self {
        Self {
            model_name: "text-embedding-ada-002".to_string(),
            dimension: 1536,
            batch_size: 100,
        }
    }
}

/// 模板推荐系统
pub struct TemplateRecommender {
    rag_system: RAGKnowledgeSystem,
}

impl TemplateRecommender {
    /// 创建新的模板推荐器
    pub async fn new() -> Result<Self, AgentError> {
        let rag_system = RAGKnowledgeSystem::new(EmbeddingConfig::default()).await?;
        
        Ok(Self { rag_system })
    }
    
    /// 推荐合约模板
    pub async fn recommend_templates(
        &self,
        requirements: &str,
    ) -> Result<Vec<TemplateRecommendation>, AgentError> {
        // 检索相关的合约模板
        let results = self.rag_system.retrieve(requirements, 5).await?;
        
        // 转换为模板推荐
        let recommendations = results
            .into_iter()
            .filter(|r| r.document.category == KnowledgeCategory::ContractTemplate)
            .map(|r| TemplateRecommendation {
                template_id: r.document.id.clone(),
                template_name: r.document.title.clone(),
                description: r.document.content.lines().take(3).collect::<Vec<_>>().join("\n"),
                relevance_score: r.score,
                tags: r.document.tags.clone(),
                reasoning: format!(
                    "该模板与您的需求匹配度为 {:.1}%",
                    (r.score / 30.0 * 100.0).min(100.0)
                ),
            })
            .collect();
        
        Ok(recommendations)
    }
    
    /// 推荐安全模式
    pub async fn recommend_security_patterns(
        &self,
        requirements: &str,
    ) -> Result<Vec<SecurityPatternRecommendation>, AgentError> {
        // 检索相关的安全模式
        let results = self.rag_system.retrieve(requirements, 5).await?;
        
        // 转换为安全模式推荐
        let recommendations = results
            .into_iter()
            .filter(|r| r.document.category == KnowledgeCategory::SecurityPattern)
            .map(|r| SecurityPatternRecommendation {
                pattern_id: r.document.id.clone(),
                pattern_name: r.document.title.clone(),
                description: r.document.content.lines().take(3).collect::<Vec<_>>().join("\n"),
                importance: if r.score > 20.0 {
                    SecurityImportance::Critical
                } else if r.score > 10.0 {
                    SecurityImportance::High
                } else {
                    SecurityImportance::Medium
                },
                implementation_guide: r.document.content.clone(),
            })
            .collect();
        
        Ok(recommendations)
    }
    
    /// 推荐优化技巧
    pub async fn recommend_optimizations(
        &self,
        requirements: &str,
    ) -> Result<Vec<OptimizationRecommendation>, AgentError> {
        // 检索相关的优化技巧
        let results = self.rag_system.retrieve(requirements, 5).await?;
        
        // 转换为优化推荐
        let recommendations = results
            .into_iter()
            .filter(|r| r.document.category == KnowledgeCategory::Optimization)
            .map(|r| OptimizationRecommendation {
                optimization_id: r.document.id.clone(),
                title: r.document.title.clone(),
                description: r.document.content.lines().take(3).collect::<Vec<_>>().join("\n"),
                estimated_gas_savings: "10-30%".to_string(), // 示例值
                difficulty: OptimizationDifficulty::Medium,
            })
            .collect();
        
        Ok(recommendations)
    }
}

/// 模板推荐
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateRecommendation {
    pub template_id: String,
    pub template_name: String,
    pub description: String,
    pub relevance_score: f32,
    pub tags: Vec<String>,
    pub reasoning: String,
}

/// 安全模式推荐
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityPatternRecommendation {
    pub pattern_id: String,
    pub pattern_name: String,
    pub description: String,
    pub importance: SecurityImportance,
    pub implementation_guide: String,
}

/// 安全重要性
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SecurityImportance {
    Critical,
    High,
    Medium,
    Low,
}

/// 优化推荐
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationRecommendation {
    pub optimization_id: String,
    pub title: String,
    pub description: String,
    pub estimated_gas_savings: String,
    pub difficulty: OptimizationDifficulty,
}

/// 优化难度
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OptimizationDifficulty {
    Easy,
    Medium,
    Hard,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rag_system_creation() {
        let config = EmbeddingConfig::default();
        let result = RAGKnowledgeSystem::new(config).await;
        
        assert!(result.is_ok());
        let system = result.unwrap();
        assert!(system.document_count() > 0);
    }

    #[tokio::test]
    async fn test_document_retrieval() {
        let config = EmbeddingConfig::default();
        let system = RAGKnowledgeSystem::new(config).await.unwrap();
        
        let results = system.retrieve("ERC-20 token", 3).await.unwrap();
        assert!(!results.is_empty());
    }

    #[tokio::test]
    async fn test_template_recommender() {
        let recommender = TemplateRecommender::new().await.unwrap();
        
        let recommendations = recommender
            .recommend_templates("I need an ERC-20 token contract")
            .await
            .unwrap();
        
        assert!(!recommendations.is_empty());
    }
}
