package model

import (
	"time"
	"gorm.io/gorm"
)

// EnhancedUser 增强的用户模型
type EnhancedUser struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Address   string         `gorm:"uniqueIndex;not null" json:"address"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	// 用户档案信息
	Profile *UserProfile `gorm:"foreignKey:UserID" json:"profile,omitempty"`
	
	// 行为统计数据
	BehaviorStats *UserBehaviorStats `gorm:"foreignKey:UserID" json:"behavior_stats,omitempty"`
	
	// 关联数据
	CreatedTasks     []TaskCache `gorm:"foreignKey:CreatorAddr;references:Address" json:"created_tasks,omitempty"`
	AssignedTasks    []TaskCache `gorm:"foreignKey:WorkerAddr;references:Address" json:"assigned_tasks,omitempty"`
	Bids             []Bid       `gorm:"foreignKey:BidderAddr;references:Address" json:"bids,omitempty"`
	WorkerDisputes   []Dispute   `gorm:"foreignKey:WorkerAddr;references:Address" json:"worker_disputes,omitempty"`
	CreatorDisputes  []Dispute   `gorm:"foreignKey:CreatorAddr;references:Address" json:"creator_disputes,omitempty"`
}

// UserBehaviorStats 用户行为统计
type UserBehaviorStats struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// 任务相关统计
	TotalTasksCreated     int     `gorm:"default:0" json:"total_tasks_created"`
	TotalTasksCompleted   int     `gorm:"default:0" json:"total_tasks_completed"`
	TotalTasksAssigned    int     `gorm:"default:0" json:"total_tasks_assigned"`
	TaskCompletionRate    float64 `gorm:"default:0" json:"task_completion_rate"`
	
	// 投标相关统计
	TotalBidsPlaced       int     `gorm:"default:0" json:"total_bids_placed"`
	TotalBidsWon          int     `gorm:"default:0" json:"total_bids_won"`
	BidWinRate            float64 `gorm:"default:0" json:"bid_win_rate"`
	AverageBidAmount      string  `gorm:"type:decimal(20,0);default:0" json:"average_bid_amount"`
	
	// 争议相关统计
	TotalDisputesAsWorker int     `gorm:"default:0" json:"total_disputes_as_worker"`
	TotalDisputesAsCreator int    `gorm:"default:0" json:"total_disputes_as_creator"`
	DisputesWonAsWorker   int     `gorm:"default:0" json:"disputes_won_as_worker"`
	DisputesWonAsCreator  int     `gorm:"default:0" json:"disputes_won_as_creator"`
	DisputeWinRate        float64 `gorm:"default:0" json:"dispute_win_rate"`
	
	// 财务统计
	TotalEarnings         string  `gorm:"type:decimal(20,0);default:0" json:"total_earnings"`
	TotalSpent           string  `gorm:"type:decimal(20,0);default:0" json:"total_spent"`
	NetProfit            string  `gorm:"type:decimal(20,0);default:0" json:"net_profit"`
	
	// 时间统计
	AverageTaskDuration   int64   `gorm:"default:0" json:"average_task_duration"` // 秒
	TotalActiveTime       int64   `gorm:"default:0" json:"total_active_time"`     // 秒
	LastActivityAt        *time.Time `json:"last_activity_at"`
	
	// 质量指标
	OnTimeDeliveryRate    float64 `gorm:"default:0" json:"on_time_delivery_rate"`
	QualityScore          float64 `gorm:"default:0" json:"quality_score"`
	ReliabilityScore      float64 `gorm:"default:0" json:"reliability_score"`
	
	// 社交指标
	CollaborationScore    float64 `gorm:"default:0" json:"collaboration_score"`
	CommunicationScore    float64 `gorm:"default:0" json:"communication_score"`
	
	// 关联
	User *EnhancedUser `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// Bid 投标模型
type Bid struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	TaskID        string    `gorm:"not null;index" json:"task_id"`
	BidderAddr    string    `gorm:"not null;index" json:"bidder_addr"`
	Amount        string    `gorm:"type:decimal(20,0);not null" json:"amount"`
	EstimatedTime int64     `gorm:"not null" json:"estimated_time"` // 秒
	Description   string    `gorm:"type:text" json:"description"`
	Status        string    `gorm:"default:'pending'" json:"status"` // pending, accepted, rejected
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	
	// 关联
	Bidder *EnhancedUser `gorm:"foreignKey:BidderAddr;references:Address" json:"bidder,omitempty"`
}

// Dispute 争议模型
type Dispute struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	DisputeID       string     `gorm:"not null;index" json:"dispute_id"`
	TaskID          string     `gorm:"not null;index" json:"task_id"`
	WorkerAddr      string     `gorm:"not null;index" json:"worker_addr"`
	CreatorAddr     string     `gorm:"not null;index" json:"creator_addr"`
	RewardAmount    string     `gorm:"type:decimal(20,0);not null" json:"reward_amount"`
	WorkerShare     string     `gorm:"type:decimal(20,0);not null" json:"worker_share"`
	Status          string     `gorm:"not null" json:"status"` // Filed, Resolved, Cancelled
	ProofOfWork     string     `gorm:"type:text" json:"proof_of_work"`
	WorkerApproved  bool       `gorm:"default:false" json:"worker_approved"`
	CreatorApproved bool       `gorm:"default:false" json:"creator_approved"`
	CreatedAt       time.Time  `json:"created_at"`
	ResolvedAt      *time.Time `json:"resolved_at"`
	DistributedAt   *time.Time `json:"distributed_at"`
	
	// 关联
	Worker  *EnhancedUser `gorm:"foreignKey:WorkerAddr;references:Address" json:"worker,omitempty"`
	Creator *EnhancedUser `gorm:"foreignKey:CreatorAddr;references:Address" json:"creator,omitempty"`
}

// EnhancedGuildScore 增强的公会分数模型
type EnhancedGuildScore struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;uniqueIndex" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// 基础分数
	TotalScore       float64 `gorm:"default:0" json:"total_score"`
	Rank             int     `gorm:"default:0" json:"rank"`
	RankTitle        string  `gorm:"default:'Novice'" json:"rank_title"`
	
	// 详细分数组成
	TaskCompletionScore   float64 `gorm:"default:0" json:"task_completion_score"`
	TaskCreationScore     float64 `gorm:"default:0" json:"task_creation_score"`
	BiddingScore          float64 `gorm:"default:0" json:"bidding_score"`
	DisputeScore          float64 `gorm:"default:0" json:"dispute_score"`
	QualityScore          float64 `gorm:"default:0" json:"quality_score"`
	ReliabilityScore      float64 `gorm:"default:0" json:"reliability_score"`
	CollaborationScore    float64 `gorm:"default:0" json:"collaboration_score"`
	CommunicationScore    float64 `gorm:"default:0" json:"communication_score"`
	ActivityScore         float64 `gorm:"default:0" json:"activity_score"`
	
	// 时间衰减因子
	TimeDecayFactor       float64 `gorm:"default:1.0" json:"time_decay_factor"`
	
	// 原始分数（未应用时间衰减）
	RawScore              float64 `gorm:"default:0" json:"raw_score"`
	
	// 统计信息
	TotalTasks            int     `gorm:"default:0" json:"total_tasks"`
	CompletedTasks        int     `gorm:"default:0" json:"completed_tasks"`
	DisputeCount          int     `gorm:"default:0" json:"dispute_count"`
	LastActivityAt        *time.Time `json:"last_activity_at"`
	
	// 关联
	User *EnhancedUser `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// EnhancedGuildScoreHistory 增强的公会分数历史
type EnhancedGuildScoreHistory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`

	// 分数变化
	PreviousScore    float64 `gorm:"not null" json:"previous_score"`
	NewScore         float64 `gorm:"not null" json:"new_score"`
	ScoreChange      float64 `gorm:"not null" json:"score_change"`
	PreviousRank     int     `gorm:"not null" json:"previous_rank"`
	NewRank          int     `gorm:"not null" json:"new_rank"`
	
	// 变化原因
	ChangeReason     string  `gorm:"not null" json:"change_reason"`
	ChangeDetails    string  `gorm:"type:text" json:"change_details"`
	
	// 触发事件
	EventType        string  `gorm:"not null" json:"event_type"` // task_completed, task_created, bid_won, dispute_resolved, etc.
	EventID          string  `gorm:"not null" json:"event_id"`
	
	// 关联
	User *EnhancedUser `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// EnhancedAIAnalysis 增强的AI分析模型
type EnhancedAIAnalysis struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`

	// 分析类型
	AnalysisType string `gorm:"not null" json:"analysis_type"` // behavior_pattern, risk_assessment, skill_analysis, etc.
	
	// 分析结果
	Result      string  `gorm:"type:text" json:"result"`
	Confidence  float64 `gorm:"default:0" json:"confidence"`
	IsAnomaly   bool    `gorm:"default:false" json:"is_anomaly"`
	
	// 详细分析数据
	AnalysisData string `gorm:"type:jsonb" json:"analysis_data"`
	
	// 建议和警告
	Recommendations string `gorm:"type:text" json:"recommendations"`
	Warnings        string `gorm:"type:text" json:"warnings"`
	
	// 关联
	User *EnhancedUser `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName 方法
func (EnhancedUser) TableName() string {
	return "enhanced_users"
}

func (UserBehaviorStats) TableName() string {
	return "user_behavior_stats"
}

func (Bid) TableName() string {
	return "bids"
}

func (Dispute) TableName() string {
	return "disputes"
}

func (EnhancedGuildScore) TableName() string {
	return "enhanced_guild_scores"
}

func (EnhancedGuildScoreHistory) TableName() string {
	return "enhanced_guild_score_histories"
}

func (EnhancedAIAnalysis) TableName() string {
	return "enhanced_ai_analyses"
}
