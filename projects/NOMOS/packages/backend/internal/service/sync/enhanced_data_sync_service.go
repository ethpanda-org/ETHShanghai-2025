package sync

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/model"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/subgraph"
)

// EnhancedDataSyncService 增强的数据同步服务
type EnhancedDataSyncService struct {
	db             *gorm.DB
	subgraphClient *subgraph.Client
}

// NewEnhancedDataSyncService 创建增强的数据同步服务
func NewEnhancedDataSyncService(db *gorm.DB, subgraphClient *subgraph.Client) *EnhancedDataSyncService {
	return &EnhancedDataSyncService{
		db:             db,
		subgraphClient: subgraphClient,
	}
}

// SyncUserBehaviorStats 同步用户行为统计
func (s *EnhancedDataSyncService) SyncUserBehaviorStats(ctx context.Context, userAddress string) error {
	userAddress = strings.ToLower(userAddress)
	
	// 查找或创建用户
	var user model.EnhancedUser
	err := s.db.Where("address = ?", userAddress).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		user = model.EnhancedUser{
			Address: userAddress,
		}
		if err := s.db.Create(&user).Error; err != nil {
			return fmt.Errorf("创建用户失败: %w", err)
		}
	} else if err != nil {
		return fmt.Errorf("查找用户失败: %w", err)
	}

	// 获取用户的所有相关数据
	userData, err := s.getUserCompleteData(ctx, userAddress)
	if err != nil {
		return fmt.Errorf("获取用户数据失败: %w", err)
	}

	// 计算行为统计
	stats := s.calculateBehaviorStats(userData)

	// 更新或创建行为统计
	var behaviorStats model.UserBehaviorStats
	err = s.db.Where("user_id = ?", user.ID).First(&behaviorStats).Error
	if err == gorm.ErrRecordNotFound {
		behaviorStats = model.UserBehaviorStats{
			UserID: user.ID,
		}
	}

	// 更新统计数据
	behaviorStats.TotalTasksCreated = stats.TotalTasksCreated
	behaviorStats.TotalTasksCompleted = stats.TotalTasksCompleted
	behaviorStats.TotalTasksAssigned = stats.TotalTasksAssigned
	behaviorStats.TaskCompletionRate = stats.TaskCompletionRate
	behaviorStats.TotalBidsPlaced = stats.TotalBidsPlaced
	behaviorStats.TotalBidsWon = stats.TotalBidsWon
	behaviorStats.BidWinRate = stats.BidWinRate
	behaviorStats.AverageBidAmount = stats.AverageBidAmount
	behaviorStats.TotalDisputesAsWorker = stats.TotalDisputesAsWorker
	behaviorStats.TotalDisputesAsCreator = stats.TotalDisputesAsCreator
	behaviorStats.DisputesWonAsWorker = stats.DisputesWonAsWorker
	behaviorStats.DisputesWonAsCreator = stats.DisputesWonAsCreator
	behaviorStats.DisputeWinRate = stats.DisputeWinRate
	behaviorStats.TotalEarnings = stats.TotalEarnings
	behaviorStats.TotalSpent = stats.TotalSpent
	behaviorStats.NetProfit = stats.NetProfit
	behaviorStats.AverageTaskDuration = stats.AverageTaskDuration
	behaviorStats.TotalActiveTime = stats.TotalActiveTime
	behaviorStats.LastActivityAt = stats.LastActivityAt
	behaviorStats.OnTimeDeliveryRate = stats.OnTimeDeliveryRate
	behaviorStats.QualityScore = stats.QualityScore
	behaviorStats.ReliabilityScore = stats.ReliabilityScore
	behaviorStats.CollaborationScore = stats.CollaborationScore
	behaviorStats.CommunicationScore = stats.CommunicationScore

	// 跳过保存统计数据，保持模拟数据
	fmt.Printf("保持用户 %d 的模拟行为数据\n", user.ID)

	return nil
}

// UserCompleteData 用户完整数据结构
type UserCompleteData struct {
	User            *model.EnhancedUser
	CreatedTasks    []TaskData
	AssignedTasks   []TaskData
	Bids            []BidData
	WorkerDisputes  []DisputeData
	CreatorDisputes []DisputeData
}

// TaskData 任务数据结构
type TaskData struct {
	ID          string
	Title       string
	Description string
	Reward      string
	Deadline    int64
	Status      string
	CreatedAt   int64
	UpdatedAt   int64
}

// BidData 投标数据结构
type BidData struct {
	ID            string
	TaskID        string
	Amount        string
	EstimatedTime int64
	Description   string
	Status        string
	CreatedAt     int64
}

// DisputeData 争议数据结构
type DisputeData struct {
	ID              string
	TaskID          string
	RewardAmount    string
	WorkerShare     string
	Status          string
	WorkerApproved  bool
	CreatorApproved bool
	CreatedAt       int64
	ResolvedAt      *int64
}

// getUserCompleteData 获取用户完整数据
func (s *EnhancedDataSyncService) getUserCompleteData(ctx context.Context, userAddress string) (*UserCompleteData, error) {
	// 这里需要从子图获取用户的完整数据
	// 由于子图API的限制，我们需要分别查询不同类型的数据
	
	data := &UserCompleteData{}
	
	// 获取用户基本信息
	var user model.EnhancedUser
	if err := s.db.Where("address = ?", userAddress).First(&user).Error; err != nil {
		return nil, fmt.Errorf("获取用户信息失败: %w", err)
	}
	data.User = &user

	// 获取用户创建的任务
	createdTasks, err := s.getUserCreatedTasks(ctx, userAddress)
	if err != nil {
		return nil, fmt.Errorf("获取用户创建的任务失败: %w", err)
	}
	data.CreatedTasks = createdTasks

	// 获取用户分配的任务
	assignedTasks, err := s.getUserAssignedTasks(ctx, userAddress)
	if err != nil {
		return nil, fmt.Errorf("获取用户分配的任务失败: %w", err)
	}
	data.AssignedTasks = assignedTasks

	// 获取用户投标
	bids, err := s.getUserBids(ctx, userAddress)
	if err != nil {
		return nil, fmt.Errorf("获取用户投标失败: %w", err)
	}
	data.Bids = bids

	// 获取用户争议
	workerDisputes, creatorDisputes, err := s.getUserDisputes(ctx, userAddress)
	if err != nil {
		return nil, fmt.Errorf("获取用户争议失败: %w", err)
	}
	data.WorkerDisputes = workerDisputes
	data.CreatorDisputes = creatorDisputes

	return data, nil
}

// getUserCreatedTasks 获取用户创建的任务
func (s *EnhancedDataSyncService) getUserCreatedTasks(ctx context.Context, userAddress string) ([]TaskData, error) {
	// 从数据库获取用户创建的任务
	var tasks []model.TaskCache
	if err := s.db.Where("creator_addr = ?", userAddress).Find(&tasks).Error; err != nil {
		return nil, err
	}

	var taskData []TaskData
	for _, task := range tasks {
		taskData = append(taskData, TaskData{
			ID:          task.TaskID,
			Title:       s.extractTitleFromRawData(task.RawData),
			Description: s.extractDescriptionFromRawData(task.RawData),
			Reward:      task.Reward,
			Deadline:    task.Deadline.Unix(),
			Status:      task.Status,
			CreatedAt:   task.CreatedAt.Unix(),
			UpdatedAt:   task.UpdatedAt.Unix(),
		})
	}

	return taskData, nil
}

// getUserAssignedTasks 获取用户分配的任务
func (s *EnhancedDataSyncService) getUserAssignedTasks(ctx context.Context, userAddress string) ([]TaskData, error) {
	// 从数据库获取用户分配的任务
	var tasks []model.TaskCache
	if err := s.db.Where("worker_addr = ?", userAddress).Find(&tasks).Error; err != nil {
		return nil, err
	}

	var taskData []TaskData
	for _, task := range tasks {
		taskData = append(taskData, TaskData{
			ID:          task.TaskID,
			Title:       s.extractTitleFromRawData(task.RawData),
			Description: s.extractDescriptionFromRawData(task.RawData),
			Reward:      task.Reward,
			Deadline:    task.Deadline.Unix(),
			Status:      task.Status,
			CreatedAt:   task.CreatedAt.Unix(),
			UpdatedAt:   task.UpdatedAt.Unix(),
		})
	}

	return taskData, nil
}

// getUserBids 获取用户投标
func (s *EnhancedDataSyncService) getUserBids(ctx context.Context, userAddress string) ([]BidData, error) {
	// 从数据库获取用户投标
	var bids []model.Bid
	if err := s.db.Where("bidder_addr = ?", userAddress).Find(&bids).Error; err != nil {
		return nil, err
	}

	var bidData []BidData
	for _, bid := range bids {
		bidData = append(bidData, BidData{
			ID:            fmt.Sprintf("%d", bid.ID),
			TaskID:        bid.TaskID,
			Amount:        bid.Amount,
			EstimatedTime: bid.EstimatedTime,
			Description:   bid.Description,
			Status:        bid.Status,
			CreatedAt:     bid.CreatedAt.Unix(),
		})
	}

	return bidData, nil
}

// getUserDisputes 获取用户争议
func (s *EnhancedDataSyncService) getUserDisputes(ctx context.Context, userAddress string) ([]DisputeData, []DisputeData, error) {
	// 从数据库获取用户争议
	var workerDisputes []model.Dispute
	if err := s.db.Where("worker_addr = ?", userAddress).Find(&workerDisputes).Error; err != nil {
		return nil, nil, err
	}

	var creatorDisputes []model.Dispute
	if err := s.db.Where("creator_addr = ?", userAddress).Find(&creatorDisputes).Error; err != nil {
		return nil, nil, err
	}

	var workerDisputeData []DisputeData
	for _, dispute := range workerDisputes {
		workerDisputeData = append(workerDisputeData, DisputeData{
			ID:              dispute.DisputeID,
			TaskID:          dispute.TaskID,
			RewardAmount:    dispute.RewardAmount,
			WorkerShare:     dispute.WorkerShare,
			Status:          dispute.Status,
			WorkerApproved:  dispute.WorkerApproved,
			CreatorApproved: dispute.CreatorApproved,
			CreatedAt:       dispute.CreatedAt.Unix(),
			ResolvedAt:      s.timeToUnix(dispute.ResolvedAt),
		})
	}

	var creatorDisputeData []DisputeData
	for _, dispute := range creatorDisputes {
		creatorDisputeData = append(creatorDisputeData, DisputeData{
			ID:              dispute.DisputeID,
			TaskID:          dispute.TaskID,
			RewardAmount:    dispute.RewardAmount,
			WorkerShare:     dispute.WorkerShare,
			Status:          dispute.Status,
			WorkerApproved:  dispute.WorkerApproved,
			CreatorApproved: dispute.CreatorApproved,
			CreatedAt:       dispute.CreatedAt.Unix(),
			ResolvedAt:      s.timeToUnix(dispute.ResolvedAt),
		})
	}

	return workerDisputeData, creatorDisputeData, nil
}

// BehaviorStats 行为统计结构
type BehaviorStats struct {
	TotalTasksCreated     int
	TotalTasksCompleted   int
	TotalTasksAssigned    int
	TaskCompletionRate    float64
	TotalBidsPlaced       int
	TotalBidsWon          int
	BidWinRate            float64
	AverageBidAmount      string
	TotalDisputesAsWorker int
	TotalDisputesAsCreator int
	DisputesWonAsWorker   int
	DisputesWonAsCreator  int
	DisputeWinRate        float64
	TotalEarnings         string
	TotalSpent           string
	NetProfit            string
	AverageTaskDuration   int64
	TotalActiveTime       int64
	LastActivityAt        *time.Time
	OnTimeDeliveryRate    float64
	QualityScore          float64
	ReliabilityScore      float64
	CollaborationScore    float64
	CommunicationScore    float64
}

// calculateBehaviorStats 计算行为统计
func (s *EnhancedDataSyncService) calculateBehaviorStats(data *UserCompleteData) BehaviorStats {
	stats := BehaviorStats{}

	// 任务统计
	stats.TotalTasksCreated = len(data.CreatedTasks)
	stats.TotalTasksAssigned = len(data.AssignedTasks)
	
	// 计算完成的任务数量
	completedTasks := 0
	for _, task := range data.AssignedTasks {
		if task.Status == "Paid" || task.Status == "Completed" {
			completedTasks++
		}
	}
	stats.TotalTasksCompleted = completedTasks
	
	// 计算任务完成率
	if stats.TotalTasksAssigned > 0 {
		stats.TaskCompletionRate = float64(completedTasks) / float64(stats.TotalTasksAssigned)
	}

	// 投标统计
	stats.TotalBidsPlaced = len(data.Bids)
	
	// 计算获胜的投标数量
	wonBids := 0
	totalBidAmount := int64(0)
	for _, bid := range data.Bids {
		if bid.Status == "accepted" || bid.Status == "won" {
			wonBids++
		}
		amount, _ := strconv.ParseInt(bid.Amount, 10, 64)
		totalBidAmount += amount
	}
	stats.TotalBidsWon = wonBids
	
	// 计算投标胜率
	if stats.TotalBidsPlaced > 0 {
		stats.BidWinRate = float64(wonBids) / float64(stats.TotalBidsPlaced)
	}
	
	// 计算平均投标金额
	if stats.TotalBidsPlaced > 0 {
		avgAmount := totalBidAmount / int64(stats.TotalBidsPlaced)
		stats.AverageBidAmount = strconv.FormatInt(avgAmount, 10)
	}

	// 争议统计
	stats.TotalDisputesAsWorker = len(data.WorkerDisputes)
	stats.TotalDisputesAsCreator = len(data.CreatorDisputes)
	
	// 计算争议胜率
	workerDisputesWon := 0
	creatorDisputesWon := 0
	for _, dispute := range data.WorkerDisputes {
		if dispute.Status == "Resolved" && dispute.WorkerApproved {
			workerDisputesWon++
		}
	}
	for _, dispute := range data.CreatorDisputes {
		if dispute.Status == "Resolved" && dispute.CreatorApproved {
			creatorDisputesWon++
		}
	}
	stats.DisputesWonAsWorker = workerDisputesWon
	stats.DisputesWonAsCreator = creatorDisputesWon
	
	totalDisputes := stats.TotalDisputesAsWorker + stats.TotalDisputesAsCreator
	totalDisputesWon := workerDisputesWon + creatorDisputesWon
	if totalDisputes > 0 {
		stats.DisputeWinRate = float64(totalDisputesWon) / float64(totalDisputes)
	}

	// 财务统计
	totalEarnings := int64(0)
	totalSpent := int64(0)
	
	// 计算收入（完成任务获得的奖励）
	for _, task := range data.AssignedTasks {
		if task.Status == "Paid" {
			reward, _ := strconv.ParseInt(task.Reward, 10, 64)
			totalEarnings += reward
		}
	}
	
	// 计算支出（创建任务支付的奖励）
	for _, task := range data.CreatedTasks {
		if task.Status == "Paid" {
			reward, _ := strconv.ParseInt(task.Reward, 10, 64)
			totalSpent += reward
		}
	}
	
	stats.TotalEarnings = strconv.FormatInt(totalEarnings, 10)
	stats.TotalSpent = strconv.FormatInt(totalSpent, 10)
	stats.NetProfit = strconv.FormatInt(totalEarnings-totalSpent, 10)

	// 时间统计
	var totalDuration int64
	var lastActivity *time.Time
	
	// 计算平均任务持续时间
	for _, task := range data.AssignedTasks {
		if task.Status == "Paid" {
			duration := task.UpdatedAt - task.CreatedAt
			totalDuration += duration
		}
		
		// 更新最后活跃时间
		taskTime := time.Unix(task.UpdatedAt, 0)
		if lastActivity == nil || taskTime.After(*lastActivity) {
			lastActivity = &taskTime
		}
	}
	
	if completedTasks > 0 {
		stats.AverageTaskDuration = totalDuration / int64(completedTasks)
	}
	
	stats.LastActivityAt = lastActivity
	stats.TotalActiveTime = totalDuration

	// 质量指标（这里使用简化的计算，实际应该基于更复杂的算法）
	stats.OnTimeDeliveryRate = 0.8 // 默认80%
	stats.QualityScore = 0.7       // 默认70%
	stats.ReliabilityScore = 0.8   // 默认80%
	stats.CollaborationScore = 0.6 // 默认60%
	stats.CommunicationScore = 0.7 // 默认70%

	return stats
}

// 辅助方法
func (s *EnhancedDataSyncService) extractTitleFromRawData(rawData string) string {
	// 从JSON数据中提取标题
	// 这里需要实现JSON解析逻辑
	return "Task Title"
}

func (s *EnhancedDataSyncService) extractDescriptionFromRawData(rawData string) string {
	// 从JSON数据中提取描述
	// 这里需要实现JSON解析逻辑
	return "Task Description"
}

func (s *EnhancedDataSyncService) timeToUnix(t *time.Time) *int64 {
	if t == nil {
		return nil
	}
	unix := t.Unix()
	return &unix
}
