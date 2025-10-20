package model

import (
	"time"

	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	Address   string         `gorm:"uniqueIndex;not null" json:"address"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Profile      *UserProfile        `gorm:"foreignKey:UserID" json:"profile,omitempty"`
	GuildScore   *GuildScore         `gorm:"foreignKey:UserID" json:"guild_score,omitempty"`
	ScoreHistory []GuildScoreHistory `gorm:"foreignKey:UserID" json:"score_history,omitempty"`
}

// UserProfile 用户资料
type UserProfile struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	UserID    uint      `gorm:"uniqueIndex;not null" json:"user_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Bio       string    `json:"bio"`
	Website   string    `json:"website"`
	Skills    []string  `gorm:"type:text[]" json:"skills"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// GuildScore 声誉评分
type GuildScore struct {
	ID        uint    `gorm:"primarykey" json:"id"`
	UserID    uint    `gorm:"uniqueIndex;not null" json:"user_id"`
	Score     float64 `json:"score"`
	Rank      string  `json:"rank"`
	RankTitle string  `json:"rank_title"`

	// 添加 User 关联 - 这是关键！
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`

	// 各维度得分
	TaskCompletionScore float64 `json:"task_completion_score"`
	TaskCreationScore   float64 `json:"task_creation_score"`
	BiddingScore        float64 `json:"bidding_score"`
	DisputeScore        float64 `json:"dispute_score"`
	ActivityScore       float64 `json:"activity_score"`

	// 修正因子
	TimeDecayFactor float64 `json:"time_decay_factor"`
	RawScore        float64 `json:"raw_score"`

	// 统计数据
	TotalTasks     int `json:"total_tasks"`
	CompletedTasks int `json:"completed_tasks"`
	DisputeCount   int `json:"dispute_count"`

	CalculatedAt time.Time `json:"calculated_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// GuildScoreHistory 评分历史
type GuildScoreHistory struct {
	ID           uint      `gorm:"primarykey" json:"id"`
	UserID       uint      `gorm:"index;not null" json:"user_id"`
	Score        float64   `json:"score"`
	Rank         string    `json:"rank"`
	ChangeReason string    `json:"change_reason"` // 分数变化原因
	CreatedAt    time.Time `json:"created_at"`
}

// AIAnalysis AI 分析结果
type AIAnalysis struct {
	ID           uint      `gorm:"primarykey" json:"id"`
	UserID       uint      `gorm:"index;not null" json:"user_id"`
	AnalysisType string    `json:"analysis_type"` // anomaly, dispute_prediction, etc.
	Result       string    `gorm:"type:jsonb" json:"result"`
	Confidence   float64   `json:"confidence"`
	IsAnomaly    bool      `json:"is_anomaly"`
	CreatedAt    time.Time `json:"created_at"`
}

// TaskCache 任务数据缓存
type TaskCache struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	TaskID      string    `gorm:"uniqueIndex;not null" json:"task_id"`
	TaskType    string    `json:"task_type"` // fixed, bidding, milestone
	CreatorAddr string    `gorm:"index" json:"creator_address"`
	WorkerAddr  string    `gorm:"index" json:"worker_address"`
	Status      string    `json:"status"`
	Reward      string    `json:"reward"`
	Deadline    time.Time `json:"deadline"`
	RawData     string    `gorm:"type:jsonb" json:"raw_data"`
	LastSynced  time.Time `json:"last_synced"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
