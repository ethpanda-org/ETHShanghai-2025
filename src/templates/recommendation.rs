//! 模板推荐算法系统
//! 
//! 提供基于需求匹配、使用统计和个性化的模板推荐功能

use crate::error::{AiContractError, Result};
use crate::templates::registry::ContractTemplate;
use crate::templates::storage::{StoredTemplate, TemplateStorage, TemplateSearchQuery, TemplateSortBy};
use crate::types::ContractType;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration};

/// 模板推荐引擎
pub struct TemplateRecommendationEngine {
    /// 数据库连接池
    db_pool: PgPool,
    
    /// 模板存储
    template_storage: TemplateStorage,
    
    /// 需求匹配器
    requirement_matcher: RequirementMatcher,
    
    /// 使用统计分析器
    usage_analyzer: UsageAnalyzer,
    
    /// 个性化推荐器
    personalization_engine: PersonalizationEngine,
    
    /// 相似度计算器
    similarity_calculator: SimilarityCalculator,
}

impl TemplateRecommendationEngine {
    /// 创建新的推荐引擎
    pub async fn new(db_pool: PgPool, template_storage: TemplateStorage) -> Result<Self> {
        let requirement_matcher = RequirementMatcher::new(db_pool.clone()).await?;
        let usage_analyzer = UsageAnalyzer::new(db_pool.clone()).await?;
        let personalization_engine = PersonalizationEngine::new(db_pool.clone()).await?;
        let similarity_calculator = SimilarityCalculator::new();
        
        Ok(Self {
            db_pool,
            template_storage,
            requirement_matcher,
            usage_analyzer,
            personalization_engine,
            similarity_calculator,
        })
    }
    
    /// 初始化推荐系统数据库表
    pub async fn initialize_database(&self) -> Result<()> {
        // 创建用户偏好表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS user_preferences (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(255) NOT NULL,
                preference_type VARCHAR(50) NOT NULL,
                preference_value JSONB NOT NULL,
                weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(user_id, preference_type)
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建用户偏好表失败: {}", e)))?;
        
        // 创建推荐历史表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS recommendation_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id VARCHAR(255),
                session_id VARCHAR(255),
                requirements_text TEXT NOT NULL,
                recommended_templates JSONB NOT NULL,
                selected_template_id UUID REFERENCES contract_templates(id),
                feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
                feedback_comment TEXT,
                recommendation_algorithm VARCHAR(50) NOT NULL,
                recommendation_confidence DECIMAL(3,2),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建推荐历史表失败: {}", e)))?;
        
        // 创建模板相似度表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS template_similarity (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_a_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
                template_b_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
                similarity_score DECIMAL(5,4) NOT NULL,
                similarity_type VARCHAR(50) NOT NULL,
                calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(template_a_id, template_b_id, similarity_type)
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建相似度表失败: {}", e)))?;
        
        // 创建热门模板缓存表
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS popular_templates_cache (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                contract_type VARCHAR(50),
                time_period VARCHAR(20) NOT NULL,
                template_rankings JSONB NOT NULL,
                calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                expires_at TIMESTAMPTZ NOT NULL,
                UNIQUE(contract_type, time_period)
            )
        "#)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("创建热门模板缓存表失败: {}", e)))?;
        
        // 创建索引
        self.create_recommendation_indexes().await?;
        
        Ok(())
    }
    
    /// 创建推荐系统相关索引
    async fn create_recommendation_indexes(&self) -> Result<()> {
        let indexes = vec![
            "CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_recommendation_history_user ON recommendation_history(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_recommendation_history_session ON recommendation_history(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_recommendation_history_created ON recommendation_history(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_template_similarity_a ON template_similarity(template_a_id)",
            "CREATE INDEX IF NOT EXISTS idx_template_similarity_b ON template_similarity(template_b_id)",
            "CREATE INDEX IF NOT EXISTS idx_template_similarity_score ON template_similarity(similarity_score DESC)",
            "CREATE INDEX IF NOT EXISTS idx_popular_templates_type ON popular_templates_cache(contract_type)",
            "CREATE INDEX IF NOT EXISTS idx_popular_templates_expires ON popular_templates_cache(expires_at)",
        ];
        
        for index_sql in indexes {
            sqlx::query(index_sql)
                .execute(&self.db_pool)
                .await
                .map_err(|e| AiContractError::database_error(format!("创建推荐索引失败: {}", e)))?;
        }
        
        Ok(())
    }
    
    /// 获取模板推荐
    pub async fn get_recommendations(
        &self,
        request: RecommendationRequest,
    ) -> Result<RecommendationResponse> {
        let start_time = std::time::Instant::now();
        
        // 1. 基于需求匹配的推荐
        let requirement_recommendations = self.requirement_matcher
            .match_requirements(&request.requirements, request.max_results.unwrap_or(10))
            .await?;
        
        // 2. 基于使用统计的热门推荐
        let popular_recommendations = self.usage_analyzer
            .get_popular_templates(request.contract_type.clone(), request.max_results.unwrap_or(10))
            .await?;
        
        // 3. 个性化推荐（如果有用户ID）
        let personalized_recommendations = if let Some(user_id) = &request.user_id {
            self.personalization_engine
                .get_personalized_recommendations(user_id, &request.requirements, request.max_results.unwrap_or(10))
                .await?
        } else {
            vec![]
        };
        
        // 4. 合并和排序推荐结果
        let merged_recommendations = self.merge_recommendations(
            requirement_recommendations,
            popular_recommendations,
            personalized_recommendations,
            &request,
        ).await?;
        
        // 5. 计算推荐置信度
        let recommendations_with_confidence = self.calculate_confidence_scores(merged_recommendations).await?;
        
        // 6. 记录推荐历史
        let recommendation_id = self.record_recommendation_history(&request, &recommendations_with_confidence).await?;
        
        let processing_time = start_time.elapsed().as_millis() as u64;
        
        Ok(RecommendationResponse {
            recommendation_id,
            recommendations: recommendations_with_confidence,
            total_count: request.max_results.unwrap_or(10),
            processing_time_ms: processing_time,
            algorithm_used: "hybrid".to_string(),
            created_at: Utc::now(),
        })
    }
    
    /// 合并不同来源的推荐结果
    async fn merge_recommendations(
        &self,
        requirement_recs: Vec<TemplateRecommendation>,
        popular_recs: Vec<TemplateRecommendation>,
        personalized_recs: Vec<TemplateRecommendation>,
        request: &RecommendationRequest,
    ) -> Result<Vec<TemplateRecommendation>> {
        let mut all_recommendations = HashMap::new();
        
        // 权重配置
        let requirement_weight = 0.5;
        let popular_weight = 0.3;
        let personalized_weight = 0.2;
        
        // 添加需求匹配推荐
        for rec in requirement_recs {
            let template_id = rec.template.id.clone();
            let weighted_score = rec.score * requirement_weight;
            
            all_recommendations.entry(template_id).or_insert_with(|| {
                let mut new_rec = rec.clone();
                new_rec.score = weighted_score;
                new_rec.reasons.push("需求匹配".to_string());
                new_rec
            });
        }
        
        // 添加热门推荐
        for rec in popular_recs {
            let template_id = rec.template.id.clone();
            let weighted_score = rec.score * popular_weight;
            
            if let Some(existing) = all_recommendations.get_mut(&template_id) {
                existing.score += weighted_score;
                existing.reasons.push("热门推荐".to_string());
            } else {
                let mut new_rec = rec.clone();
                new_rec.score = weighted_score;
                new_rec.reasons.push("热门推荐".to_string());
                all_recommendations.insert(template_id, new_rec);
            }
        }
        
        // 添加个性化推荐
        for rec in personalized_recs {
            let template_id = rec.template.id.clone();
            let weighted_score = rec.score * personalized_weight;
            
            if let Some(existing) = all_recommendations.get_mut(&template_id) {
                existing.score += weighted_score;
                existing.reasons.push("个性化推荐".to_string());
            } else {
                let mut new_rec = rec.clone();
                new_rec.score = weighted_score;
                new_rec.reasons.push("个性化推荐".to_string());
                all_recommendations.insert(template_id, new_rec);
            }
        }
        
        // 排序并限制结果数量
        let mut recommendations: Vec<_> = all_recommendations.into_values().collect();
        recommendations.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        
        if let Some(max_results) = request.max_results {
            recommendations.truncate(max_results);
        }
        
        Ok(recommendations)
    }
    
    /// 计算推荐置信度
    async fn calculate_confidence_scores(
        &self,
        mut recommendations: Vec<TemplateRecommendation>,
    ) -> Result<Vec<TemplateRecommendation>> {
        for rec in &mut recommendations {
            // 基于多个因素计算置信度
            let mut confidence = rec.score;
            
            // 考虑模板的使用次数
            if rec.template.usage_count > 100 {
                confidence += 0.1;
            } else if rec.template.usage_count > 10 {
                confidence += 0.05;
            }
            
            // 考虑模板的评分
            if let Some(rating) = rec.template.rating {
                if rating >= 4.0 {
                    confidence += 0.1;
                } else if rating >= 3.0 {
                    confidence += 0.05;
                }
            }
            
            // 考虑模板是否已验证
            if rec.template.is_verified {
                confidence += 0.05;
            }
            
            // 考虑推荐原因的数量
            confidence += (rec.reasons.len() as f64) * 0.02;
            
            // 限制置信度在 0-1 之间
            rec.confidence = confidence.min(1.0).max(0.0);
        }
        
        Ok(recommendations)
    }
    
    /// 记录推荐历史
    async fn record_recommendation_history(
        &self,
        request: &RecommendationRequest,
        recommendations: &[TemplateRecommendation],
    ) -> Result<Uuid> {
        let recommendation_id = Uuid::new_v4();
        
        let recommendations_json = serde_json::to_value(recommendations)?;
        
        sqlx::query(r#"
            INSERT INTO recommendation_history (
                id, user_id, session_id, requirements_text, recommended_templates,
                recommendation_algorithm, recommendation_confidence
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#)
        .bind(recommendation_id)
        .bind(&request.user_id)
        .bind(&request.session_id)
        .bind(&request.requirements)
        .bind(recommendations_json)
        .bind("hybrid")
        .bind(recommendations.first().map(|r| r.confidence).unwrap_or(0.0))
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("记录推荐历史失败: {}", e)))?;
        
        Ok(recommendation_id)
    }
    
    /// 提交推荐反馈
    pub async fn submit_feedback(
        &self,
        recommendation_id: Uuid,
        selected_template_id: Option<Uuid>,
        feedback_score: Option<u8>,
        feedback_comment: Option<String>,
    ) -> Result<()> {
        if let Some(score) = feedback_score {
            if score < 1 || score > 5 {
                return Err(AiContractError::serialization_error("反馈评分必须在 1-5 之间".to_string()));
            }
        }
        
        sqlx::query(r#"
            UPDATE recommendation_history 
            SET 
                selected_template_id = $2,
                feedback_score = $3,
                feedback_comment = $4
            WHERE id = $1
        "#)
        .bind(recommendation_id)
        .bind(selected_template_id)
        .bind(feedback_score.map(|s| s as i32))
        .bind(feedback_comment)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("提交反馈失败: {}", e)))?;
        
        // 更新用户偏好（如果有反馈）
        if let Some(template_id) = selected_template_id {
            self.personalization_engine.update_user_preferences_from_feedback(
                recommendation_id,
                template_id,
                feedback_score,
            ).await?;
        }
        
        Ok(())
    }
    
    /// 获取相似模板
    pub async fn get_similar_templates(
        &self,
        template_id: Uuid,
        max_results: Option<usize>,
    ) -> Result<Vec<SimilarTemplate>> {
        let similarities = sqlx::query(r#"
            SELECT 
                ts.template_b_id,
                ts.similarity_score,
                ts.similarity_type,
                ct.template_id,
                ct.name,
                ct.description,
                ct.contract_type,
                ct.tags,
                ct.usage_count,
                ct.rating
            FROM template_similarity ts
            JOIN contract_templates ct ON ts.template_b_id = ct.id
            WHERE ts.template_a_id = $1 AND ct.is_active = true
            ORDER BY ts.similarity_score DESC
            LIMIT $2
        "#)
        .bind(template_id)
        .bind(max_results.unwrap_or(10) as i64)
        .fetch_all(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询相似模板失败: {}", e)))?;
        
        let mut similar_templates = Vec::new();
        for row in similarities {
            use sqlx::Row;
            
            similar_templates.push(SimilarTemplate {
                template_id: row.get("template_b_id"),
                template_name: row.get("name"),
                similarity_score: row.get("similarity_score"),
                similarity_type: row.get("similarity_type"),
                usage_count: row.get::<i64, _>("usage_count") as u64,
                rating: row.get("rating"),
            });
        }
        
        Ok(similar_templates)
    }
    
    /// 计算并更新模板相似度
    pub async fn update_template_similarities(&self) -> Result<()> {
        // 获取所有活跃模板
        let templates = self.template_storage.search_templates(&TemplateSearchQuery {
            limit: Some(1000),
            ..Default::default()
        }).await?;
        
        // 计算两两相似度
        for i in 0..templates.len() {
            for j in (i + 1)..templates.len() {
                let template_a = &templates[i];
                let template_b = &templates[j];
                
                // 计算不同类型的相似度
                let tag_similarity = self.similarity_calculator.calculate_tag_similarity(
                    &template_a.tags,
                    &template_b.tags,
                );
                
                let type_similarity = if template_a.contract_type == template_b.contract_type {
                    1.0
                } else {
                    0.0
                };
                
                let complexity_similarity = self.similarity_calculator.calculate_complexity_similarity(
                    &template_a.complexity,
                    &template_b.complexity,
                );
                
                // 综合相似度
                let overall_similarity = (tag_similarity * 0.4 + type_similarity * 0.4 + complexity_similarity * 0.2);
                
                // 只保存相似度较高的记录
                if overall_similarity > 0.3 {
                    self.save_similarity_score(
                        template_a.id,
                        template_b.id,
                        overall_similarity,
                        "overall",
                    ).await?;
                }
                
                // 保存标签相似度
                if tag_similarity > 0.5 {
                    self.save_similarity_score(
                        template_a.id,
                        template_b.id,
                        tag_similarity,
                        "tags",
                    ).await?;
                }
            }
        }
        
        Ok(())
    }
    
    /// 保存相似度分数
    async fn save_similarity_score(
        &self,
        template_a_id: Uuid,
        template_b_id: Uuid,
        similarity_score: f64,
        similarity_type: &str,
    ) -> Result<()> {
        sqlx::query(r#"
            INSERT INTO template_similarity (
                template_a_id, template_b_id, similarity_score, similarity_type
            ) VALUES ($1, $2, $3, $4)
            ON CONFLICT (template_a_id, template_b_id, similarity_type)
            DO UPDATE SET 
                similarity_score = $3,
                calculated_at = NOW()
        "#)
        .bind(template_a_id)
        .bind(template_b_id)
        .bind(similarity_score)
        .bind(similarity_type)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("保存相似度失败: {}", e)))?;
        
        // 同时保存反向关系
        sqlx::query(r#"
            INSERT INTO template_similarity (
                template_a_id, template_b_id, similarity_score, similarity_type
            ) VALUES ($2, $1, $3, $4)
            ON CONFLICT (template_a_id, template_b_id, similarity_type)
            DO UPDATE SET 
                similarity_score = $3,
                calculated_at = NOW()
        "#)
        .bind(template_a_id)
        .bind(template_b_id)
        .bind(similarity_score)
        .bind(similarity_type)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("保存反向相似度失败: {}", e)))?;
        
        Ok(())
    }
}

/// 需求匹配器
pub struct RequirementMatcher {
    db_pool: PgPool,
}

impl RequirementMatcher {
    pub async fn new(db_pool: PgPool) -> Result<Self> {
        Ok(Self { db_pool })
    }
    
    /// 根据需求匹配模板
    pub async fn match_requirements(
        &self,
        requirements: &str,
        max_results: usize,
    ) -> Result<Vec<TemplateRecommendation>> {
        // 简化的关键词匹配
        let keywords = self.extract_keywords(requirements);
        
        // 构建搜索查询
        let mut query = TemplateSearchQuery {
            limit: Some(max_results as i64),
            sort_by: TemplateSortBy::Relevance,
            ..Default::default()
        };
        
        // 根据关键词确定合约类型
        if keywords.iter().any(|k| k.contains("erc20") || k.contains("token") || k.contains("代币")) {
            query.contract_type = Some(ContractType::ERC20Token);
        } else if keywords.iter().any(|k| k.contains("erc721") || k.contains("nft")) {
            query.contract_type = Some(ContractType::ERC721NFT);
        } else if keywords.iter().any(|k| k.contains("erc1155") || k.contains("multi")) {
            query.contract_type = Some(ContractType::ERC1155MultiToken);
        } else if keywords.iter().any(|k| k.contains("governance") || k.contains("治理") || k.contains("dao")) {
            query.contract_type = Some(ContractType::Governance);
        }
        
        // 设置标签搜索
        query.tags = Some(keywords.clone());
        
        // 执行搜索
        let storage = crate::templates::storage::TemplateStorage::new(
            self.db_pool.clone(),
            std::path::PathBuf::from("/tmp"), // 临时路径
        ).await?;
        
        let templates = storage.search_templates(&query).await?;
        
        // 计算匹配分数
        let mut recommendations = Vec::new();
        for template in templates {
            let score = self.calculate_match_score(&template, requirements, &keywords);
            
            recommendations.push(TemplateRecommendation {
                template,
                score,
                confidence: 0.0, // 将在后续步骤中计算
                reasons: vec!["需求匹配".to_string()],
                match_details: Some(MatchDetails {
                    matched_keywords: keywords.clone(),
                    match_score: score,
                    match_explanation: "基于关键词和合约类型匹配".to_string(),
                }),
            });
        }
        
        // 按分数排序
        recommendations.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        
        Ok(recommendations)
    }
    
    /// 提取关键词
    fn extract_keywords(&self, requirements: &str) -> Vec<String> {
        let text = requirements.to_lowercase();
        let mut keywords = Vec::new();
        
        // 合约类型关键词
        let contract_keywords = vec![
            "erc20", "erc721", "erc1155", "token", "nft", "代币", "非同质化",
            "governance", "治理", "dao", "multisig", "多签", "vault", "金库",
            "defi", "去中心化金融", "lending", "借贷", "staking", "质押",
        ];
        
        for keyword in contract_keywords {
            if text.contains(keyword) {
                keywords.push(keyword.to_string());
            }
        }
        
        // 功能关键词
        let function_keywords = vec![
            "mint", "铸造", "burn", "销毁", "transfer", "转账", "approve", "授权",
            "pause", "暂停", "upgrade", "升级", "vote", "投票", "stake", "质押",
        ];
        
        for keyword in function_keywords {
            if text.contains(keyword) {
                keywords.push(keyword.to_string());
            }
        }
        
        keywords
    }
    
    /// 计算匹配分数
    fn calculate_match_score(
        &self,
        template: &StoredTemplate,
        requirements: &str,
        keywords: &[String],
    ) -> f64 {
        let mut score = 0.0;
        
        // 关键词匹配
        let template_text = format!("{} {} {}", 
            template.name.to_lowercase(),
            template.description.to_lowercase(),
            template.tags.join(" ").to_lowercase()
        );
        
        for keyword in keywords {
            if template_text.contains(keyword) {
                score += 0.2;
            }
        }
        
        // 名称匹配
        if template.name.to_lowercase().contains(&requirements.to_lowercase()) {
            score += 0.3;
        }
        
        // 描述匹配
        if template.description.to_lowercase().contains(&requirements.to_lowercase()) {
            score += 0.2;
        }
        
        // 标签匹配
        for tag in &template.tags {
            if requirements.to_lowercase().contains(&tag.to_lowercase()) {
                score += 0.1;
            }
        }
        
        // 使用次数加权
        if template.usage_count > 100 {
            score += 0.1;
        } else if template.usage_count > 10 {
            score += 0.05;
        }
        
        // 评分加权
        if let Some(rating) = template.rating {
            score += (rating / 5.0) * 0.1;
        }
        
        score.min(1.0)
    }
}

/// 使用统计分析器
pub struct UsageAnalyzer {
    db_pool: PgPool,
}

impl UsageAnalyzer {
    pub async fn new(db_pool: PgPool) -> Result<Self> {
        Ok(Self { db_pool })
    }
    
    /// 获取热门模板
    pub async fn get_popular_templates(
        &self,
        contract_type: Option<ContractType>,
        max_results: usize,
    ) -> Result<Vec<TemplateRecommendation>> {
        // 检查缓存
        if let Some(cached) = self.get_cached_popular_templates(contract_type.clone(), "daily").await? {
            return Ok(cached);
        }
        
        // 计算热门模板
        let popular_templates = self.calculate_popular_templates(contract_type.clone(), max_results).await?;
        
        // 缓存结果
        self.cache_popular_templates(contract_type, "daily", &popular_templates).await?;
        
        Ok(popular_templates)
    }
    
    /// 获取缓存的热门模板
    async fn get_cached_popular_templates(
        &self,
        contract_type: Option<ContractType>,
        time_period: &str,
    ) -> Result<Option<Vec<TemplateRecommendation>>> {
        let type_str = contract_type.as_ref().map(|t| format!("{:?}", t));
        
        let row = sqlx::query(r#"
            SELECT template_rankings
            FROM popular_templates_cache
            WHERE contract_type = $1 AND time_period = $2 AND expires_at > NOW()
        "#)
        .bind(type_str)
        .bind(time_period)
        .fetch_optional(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询热门模板缓存失败: {}", e)))?;
        
        if let Some(row) = row {
            use sqlx::Row;
            let rankings: serde_json::Value = row.get("template_rankings");
            let recommendations: Vec<TemplateRecommendation> = serde_json::from_value(rankings)?;
            Ok(Some(recommendations))
        } else {
            Ok(None)
        }
    }
    
    /// 计算热门模板
    async fn calculate_popular_templates(
        &self,
        contract_type: Option<ContractType>,
        max_results: usize,
    ) -> Result<Vec<TemplateRecommendation>> {
        let mut sql = String::from(r#"
            SELECT 
                ct.id, ct.template_id, ct.name, ct.description, ct.contract_type,
                ct.tags, ct.usage_count, ct.rating, ct.is_verified,
                COALESCE(recent_usage.recent_count, 0) as recent_usage_count,
                COALESCE(recent_usage.success_rate, 0) as success_rate
            FROM contract_templates ct
            LEFT JOIN (
                SELECT 
                    template_id,
                    SUM(usage_count) as recent_count,
                    CASE 
                        WHEN SUM(usage_count + success_count + failure_count) > 0 
                        THEN SUM(success_count)::DECIMAL / SUM(usage_count + success_count + failure_count)
                        ELSE 0 
                    END as success_rate
                FROM template_usage_stats
                WHERE usage_date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY template_id
            ) recent_usage ON ct.id = recent_usage.template_id
            WHERE ct.is_active = true
        "#);
        
        if let Some(ct) = contract_type {
            sql.push_str(&format!(" AND ct.contract_type = '{:?}'", ct));
        }
        
        sql.push_str(&format!(r#"
            ORDER BY 
                (ct.usage_count * 0.3 + 
                 recent_usage.recent_count * 0.4 + 
                 COALESCE(ct.rating, 0) * 20 * 0.2 +
                 recent_usage.success_rate * 100 * 0.1) DESC
            LIMIT {}
        "#, max_results));
        
        let rows = sqlx::query(&sql)
            .fetch_all(&self.db_pool)
            .await
            .map_err(|e| AiContractError::database_error(format!("查询热门模板失败: {}", e)))?;
        
        let mut recommendations = Vec::new();
        for row in rows {
            use sqlx::Row;
            
            // 创建简化的 StoredTemplate
            let template = StoredTemplate {
                id: row.get("id"),
                template_id: row.get("template_id"),
                name: row.get("name"),
                description: row.get("description"),
                contract_type: self.string_to_contract_type(&row.get::<String, _>("contract_type"))?,
                version: "1.0.0".to_string(), // 默认版本
                author: None,
                license: None,
                base_contracts: vec![],
                required_imports: vec![],
                security_features: vec![],
                tags: row.get("tags"),
                complexity: crate::templates::registry::TemplateComplexity::Medium, // 默认复杂度
                gas_estimate: crate::templates::registry::GasEstimate {
                    deployment: 1000000,
                    typical_transaction: 50000,
                },
                template_code: String::new(),
                parameters: vec![],
                file_path: std::path::PathBuf::new(),
                checksum: String::new(),
                is_active: true,
                is_verified: row.get("is_verified"),
                usage_count: row.get::<i64, _>("usage_count") as u64,
                rating: row.get("rating"),
                created_at: Utc::now(),
                updated_at: Utc::now(),
            };
            
            let recent_usage: i64 = row.get("recent_usage_count");
            let success_rate: f64 = row.get("success_rate");
            
            // 计算热门度分数
            let popularity_score = (template.usage_count as f64 * 0.3 + 
                                  recent_usage as f64 * 0.4 + 
                                  template.rating.unwrap_or(0.0) * 4.0 * 0.2 +
                                  success_rate * 0.1) / 100.0;
            
            recommendations.push(TemplateRecommendation {
                template,
                score: popularity_score.min(1.0),
                confidence: 0.0,
                reasons: vec!["热门推荐".to_string()],
                match_details: Some(MatchDetails {
                    matched_keywords: vec![],
                    match_score: popularity_score,
                    match_explanation: format!("基于使用统计的热门推荐，成功率: {:.1}%", success_rate * 100.0),
                }),
            });
        }
        
        Ok(recommendations)
    }
    
    /// 缓存热门模板
    async fn cache_popular_templates(
        &self,
        contract_type: Option<ContractType>,
        time_period: &str,
        recommendations: &[TemplateRecommendation],
    ) -> Result<()> {
        let type_str = contract_type.as_ref().map(|t| format!("{:?}", t));
        let rankings_json = serde_json::to_value(recommendations)?;
        let expires_at = Utc::now() + Duration::hours(24); // 缓存24小时
        
        sqlx::query(r#"
            INSERT INTO popular_templates_cache (
                contract_type, time_period, template_rankings, expires_at
            ) VALUES ($1, $2, $3, $4)
            ON CONFLICT (contract_type, time_period)
            DO UPDATE SET 
                template_rankings = $3,
                calculated_at = NOW(),
                expires_at = $4
        "#)
        .bind(type_str)
        .bind(time_period)
        .bind(rankings_json)
        .bind(expires_at)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("缓存热门模板失败: {}", e)))?;
        
        Ok(())
    }
    
    fn string_to_contract_type(&self, s: &str) -> Result<ContractType> {
        match s {
            "ERC20Token" => Ok(ContractType::ERC20Token),
            "ERC721NFT" => Ok(ContractType::ERC721NFT),
            "ERC1155MultiToken" => Ok(ContractType::ERC1155MultiToken),
            "Governance" => Ok(ContractType::Governance),
            "MultiSig" => Ok(ContractType::MultiSig),
            "Vault" => Ok(ContractType::Vault),
            "DeFi" => Ok(ContractType::DeFi),
            "Custom" => Ok(ContractType::Custom),
            _ => Err(AiContractError::serialization_error(format!("未知的合约类型: {}", s))),
        }
    }
}

/// 个性化推荐引擎
pub struct PersonalizationEngine {
    db_pool: PgPool,
}

impl PersonalizationEngine {
    pub async fn new(db_pool: PgPool) -> Result<Self> {
        Ok(Self { db_pool })
    }
    
    /// 获取个性化推荐
    pub async fn get_personalized_recommendations(
        &self,
        user_id: &str,
        requirements: &str,
        max_results: usize,
    ) -> Result<Vec<TemplateRecommendation>> {
        // 获取用户偏好
        let preferences = self.get_user_preferences(user_id).await?;
        
        // 获取用户历史选择
        let history = self.get_user_history(user_id).await?;
        
        // 基于偏好和历史生成推荐
        self.generate_personalized_recommendations(preferences, history, requirements, max_results).await
    }
    
    /// 获取用户偏好
    async fn get_user_preferences(&self, user_id: &str) -> Result<HashMap<String, serde_json::Value>> {
        let rows = sqlx::query(r#"
            SELECT preference_type, preference_value, weight
            FROM user_preferences
            WHERE user_id = $1
        "#)
        .bind(user_id)
        .fetch_all(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询用户偏好失败: {}", e)))?;
        
        let mut preferences = HashMap::new();
        for row in rows {
            use sqlx::Row;
            let pref_type: String = row.get("preference_type");
            let pref_value: serde_json::Value = row.get("preference_value");
            preferences.insert(pref_type, pref_value);
        }
        
        Ok(preferences)
    }
    
    /// 获取用户历史
    async fn get_user_history(&self, user_id: &str) -> Result<Vec<UserHistoryItem>> {
        let rows = sqlx::query(r#"
            SELECT 
                rh.selected_template_id,
                rh.feedback_score,
                rh.requirements_text,
                rh.created_at,
                ct.contract_type,
                ct.tags
            FROM recommendation_history rh
            LEFT JOIN contract_templates ct ON rh.selected_template_id = ct.id
            WHERE rh.user_id = $1 AND rh.selected_template_id IS NOT NULL
            ORDER BY rh.created_at DESC
            LIMIT 50
        "#)
        .bind(user_id)
        .fetch_all(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询用户历史失败: {}", e)))?;
        
        let mut history = Vec::new();
        for row in rows {
            use sqlx::Row;
            
            history.push(UserHistoryItem {
                template_id: row.get("selected_template_id"),
                contract_type: row.get("contract_type"),
                tags: row.get("tags"),
                feedback_score: row.get::<Option<i32>, _>("feedback_score").map(|s| s as u8),
                requirements: row.get("requirements_text"),
                selected_at: row.get("created_at"),
            });
        }
        
        Ok(history)
    }
    
    /// 生成个性化推荐
    async fn generate_personalized_recommendations(
        &self,
        _preferences: HashMap<String, serde_json::Value>,
        history: Vec<UserHistoryItem>,
        _requirements: &str,
        max_results: usize,
    ) -> Result<Vec<TemplateRecommendation>> {
        // 分析用户历史偏好
        let mut contract_type_scores = HashMap::new();
        let mut tag_scores = HashMap::new();
        
        for item in &history {
            // 统计合约类型偏好
            if let Some(contract_type) = &item.contract_type {
                let score = contract_type_scores.entry(contract_type.clone()).or_insert(0.0);
                let weight = if let Some(feedback) = item.feedback_score {
                    feedback as f64 / 5.0
                } else {
                    0.5
                };
                *score += weight;
            }
            
            // 统计标签偏好
            if let Some(tags) = &item.tags {
                for tag in tags {
                    let score = tag_scores.entry(tag.clone()).or_insert(0.0);
                    let weight = if let Some(feedback) = item.feedback_score {
                        feedback as f64 / 5.0
                    } else {
                        0.5
                    };
                    *score += weight;
                }
            }
        }
        
        // 基于偏好搜索模板
        let mut recommendations = Vec::new();
        
        // 根据偏好的合约类型推荐
        for (contract_type, score) in contract_type_scores {
            let query = TemplateSearchQuery {
                contract_type: Some(self.string_to_contract_type(&contract_type)?),
                limit: Some((max_results / 2) as i64),
                sort_by: TemplateSortBy::Rating,
                ..Default::default()
            };
            
            let storage = crate::templates::storage::TemplateStorage::new(
                self.db_pool.clone(),
                std::path::PathBuf::from("/tmp"),
            ).await?;
            
            let templates = storage.search_templates(&query).await?;
            
            for template in templates {
                recommendations.push(TemplateRecommendation {
                    template,
                    score: (score / history.len() as f64).min(1.0),
                    confidence: 0.0,
                    reasons: vec!["个性化推荐".to_string()],
                    match_details: Some(MatchDetails {
                        matched_keywords: vec![],
                        match_score: score,
                        match_explanation: "基于用户历史偏好推荐".to_string(),
                    }),
                });
            }
        }
        
        // 限制结果数量
        recommendations.truncate(max_results);
        
        Ok(recommendations)
    }
    
    /// 从反馈更新用户偏好
    pub async fn update_user_preferences_from_feedback(
        &self,
        recommendation_id: Uuid,
        selected_template_id: Uuid,
        feedback_score: Option<u8>,
    ) -> Result<()> {
        // 获取推荐历史和模板信息
        let row = sqlx::query(r#"
            SELECT 
                rh.user_id,
                ct.contract_type,
                ct.tags
            FROM recommendation_history rh
            JOIN contract_templates ct ON rh.selected_template_id = ct.id
            WHERE rh.id = $1
        "#)
        .bind(recommendation_id)
        .fetch_optional(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("查询推荐历史失败: {}", e)))?;
        
        if let Some(row) = row {
            use sqlx::Row;
            let user_id: String = row.get("user_id");
            let contract_type: String = row.get("contract_type");
            let tags: Vec<String> = row.get("tags");
            
            let weight = if let Some(score) = feedback_score {
                score as f64 / 5.0
            } else {
                0.5
            };
            
            // 更新合约类型偏好
            self.update_user_preference(
                &user_id,
                "contract_type",
                serde_json::json!(contract_type),
                weight,
            ).await?;
            
            // 更新标签偏好
            for tag in tags {
                self.update_user_preference(
                    &user_id,
                    "tag",
                    serde_json::json!(tag),
                    weight * 0.5, // 标签权重较低
                ).await?;
            }
        }
        
        Ok(())
    }
    
    /// 更新用户偏好
    async fn update_user_preference(
        &self,
        user_id: &str,
        preference_type: &str,
        preference_value: serde_json::Value,
        weight: f64,
    ) -> Result<()> {
        sqlx::query(r#"
            INSERT INTO user_preferences (user_id, preference_type, preference_value, weight)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, preference_type)
            DO UPDATE SET 
                preference_value = $3,
                weight = (user_preferences.weight * 0.8 + $4 * 0.2),
                updated_at = NOW()
        "#)
        .bind(user_id)
        .bind(preference_type)
        .bind(preference_value)
        .bind(weight)
        .execute(&self.db_pool)
        .await
        .map_err(|e| AiContractError::database_error(format!("更新用户偏好失败: {}", e)))?;
        
        Ok(())
    }
    
    fn string_to_contract_type(&self, s: &str) -> Result<ContractType> {
        match s {
            "ERC20Token" => Ok(ContractType::ERC20Token),
            "ERC721NFT" => Ok(ContractType::ERC721NFT),
            "ERC1155MultiToken" => Ok(ContractType::ERC1155MultiToken),
            "Governance" => Ok(ContractType::Governance),
            "MultiSig" => Ok(ContractType::MultiSig),
            "Vault" => Ok(ContractType::Vault),
            "DeFi" => Ok(ContractType::DeFi),
            "Custom" => Ok(ContractType::Custom),
            _ => Err(AiContractError::serialization_error(format!("未知的合约类型: {}", s))),
        }
    }
}

/// 相似度计算器
pub struct SimilarityCalculator;

impl SimilarityCalculator {
    pub fn new() -> Self {
        Self
    }
    
    /// 计算标签相似度
    pub fn calculate_tag_similarity(&self, tags_a: &[String], tags_b: &[String]) -> f64 {
        if tags_a.is_empty() && tags_b.is_empty() {
            return 1.0;
        }
        
        if tags_a.is_empty() || tags_b.is_empty() {
            return 0.0;
        }
        
        let set_a: std::collections::HashSet<_> = tags_a.iter().collect();
        let set_b: std::collections::HashSet<_> = tags_b.iter().collect();
        
        let intersection = set_a.intersection(&set_b).count();
        let union = set_a.union(&set_b).count();
        
        if union == 0 {
            0.0
        } else {
            intersection as f64 / union as f64
        }
    }
    
    /// 计算复杂度相似度
    pub fn calculate_complexity_similarity(
        &self,
        complexity_a: &crate::templates::registry::TemplateComplexity,
        complexity_b: &crate::templates::registry::TemplateComplexity,
    ) -> f64 {
        use crate::templates::registry::TemplateComplexity;
        
        let score_a = match complexity_a {
            TemplateComplexity::Simple => 1,
            TemplateComplexity::Medium => 2,
            TemplateComplexity::Complex => 3,
            TemplateComplexity::Advanced => 4,
        };
        
        let score_b = match complexity_b {
            TemplateComplexity::Simple => 1,
            TemplateComplexity::Medium => 2,
            TemplateComplexity::Complex => 3,
            TemplateComplexity::Advanced => 4,
        };
        
        let diff = (score_a as f64 - score_b as f64).abs();
        1.0 - (diff as f64 / 3.0)
    }
}

// 数据结构定义

/// 推荐请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendationRequest {
    /// 用户ID（可选）
    pub user_id: Option<String>,
    
    /// 会话ID（可选）
    pub session_id: Option<String>,
    
    /// 需求描述
    pub requirements: String,
    
    /// 合约类型过滤（可选）
    pub contract_type: Option<ContractType>,
    
    /// 最大结果数量
    pub max_results: Option<usize>,
    
    /// 是否包含相似模板
    pub include_similar: bool,
    
    /// 推荐算法偏好
    pub algorithm_preference: Option<String>,
}

/// 推荐响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendationResponse {
    /// 推荐ID
    pub recommendation_id: Uuid,
    
    /// 推荐结果
    pub recommendations: Vec<TemplateRecommendation>,
    
    /// 总数量
    pub total_count: usize,
    
    /// 处理时间（毫秒）
    pub processing_time_ms: u64,
    
    /// 使用的算法
    pub algorithm_used: String,
    
    /// 创建时间
    pub created_at: DateTime<Utc>,
}

/// 模板推荐
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateRecommendation {
    /// 模板信息
    pub template: StoredTemplate,
    
    /// 推荐分数 (0.0 - 1.0)
    pub score: f64,
    
    /// 置信度 (0.0 - 1.0)
    pub confidence: f64,
    
    /// 推荐原因
    pub reasons: Vec<String>,
    
    /// 匹配详情
    pub match_details: Option<MatchDetails>,
}

/// 匹配详情
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchDetails {
    /// 匹配的关键词
    pub matched_keywords: Vec<String>,
    
    /// 匹配分数
    pub match_score: f64,
    
    /// 匹配说明
    pub match_explanation: String,
}

/// 相似模板
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarTemplate {
    /// 模板ID
    pub template_id: Uuid,
    
    /// 模板名称
    pub template_name: String,
    
    /// 相似度分数
    pub similarity_score: f64,
    
    /// 相似度类型
    pub similarity_type: String,
    
    /// 使用次数
    pub usage_count: u64,
    
    /// 评分
    pub rating: Option<f64>,
}

/// 用户历史项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserHistoryItem {
    /// 模板ID
    pub template_id: Option<Uuid>,
    
    /// 合约类型
    pub contract_type: Option<String>,
    
    /// 标签
    pub tags: Option<Vec<String>>,
    
    /// 反馈评分
    pub feedback_score: Option<u8>,
    
    /// 需求描述
    pub requirements: String,
    
    /// 选择时间
    pub selected_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::PgPool;
    use tempfile::TempDir;

    async fn setup_test_recommendation_engine() -> (TemplateRecommendationEngine, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db_pool = PgPool::connect("postgresql://test:test@localhost/test").await.unwrap();
        let template_storage = crate::templates::storage::TemplateStorage::new(
            db_pool.clone(), 
            temp_dir.path().to_path_buf()
        ).await.unwrap();
        
        let engine = TemplateRecommendationEngine::new(db_pool, template_storage).await.unwrap();
        engine.initialize_database().await.unwrap();
        
        (engine, temp_dir)
    }

    #[tokio::test]
    async fn test_get_recommendations() {
        let (engine, _temp_dir) = setup_test_recommendation_engine().await;
        
        let request = RecommendationRequest {
            user_id: Some("test_user".to_string()),
            session_id: Some("test_session".to_string()),
            requirements: "I need an ERC-20 token contract".to_string(),
            contract_type: Some(ContractType::ERC20Token),
            max_results: Some(5),
            include_similar: false,
            algorithm_preference: None,
        };
        
        let response = engine.get_recommendations(request).await.unwrap();
        
        assert!(!response.recommendation_id.is_nil());
        assert_eq!(response.algorithm_used, "hybrid");
        assert!(response.processing_time_ms > 0);
    }

    #[tokio::test]
    async fn test_submit_feedback() {
        let (engine, _temp_dir) = setup_test_recommendation_engine().await;
        
        let recommendation_id = Uuid::new_v4();
        let template_id = Uuid::new_v4();
        
        // 这个测试会失败，因为推荐记录不存在，但测试了函数的基本结构
        let result = engine.submit_feedback(
            recommendation_id,
            Some(template_id),
            Some(5),
            Some("Great template!".to_string()),
        ).await;
        
        // 预期会失败，因为没有对应的推荐记录
        assert!(result.is_err());
    }

    #[test]
    fn test_similarity_calculator() {
        let calculator = SimilarityCalculator::new();
        
        let tags_a = vec!["erc20".to_string(), "token".to_string(), "mintable".to_string()];
        let tags_b = vec!["erc20".to_string(), "token".to_string(), "burnable".to_string()];
        
        let similarity = calculator.calculate_tag_similarity(&tags_a, &tags_b);
        assert!(similarity > 0.0 && similarity < 1.0);
        
        let same_tags = vec!["erc20".to_string(), "token".to_string()];
        let same_similarity = calculator.calculate_tag_similarity(&same_tags, &same_tags);
        assert_eq!(same_similarity, 1.0);
    }
}