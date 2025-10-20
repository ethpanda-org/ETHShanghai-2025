package sync

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/model"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/repository/db"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/subgraph"
	"gorm.io/gorm"
)

type DataSyncService struct {
	db           *db.Database
	subgraphClient *subgraph.Client
}

func NewDataSyncService(database *db.Database, subgraphClient *subgraph.Client) *DataSyncService {
	return &DataSyncService{
		db:           database,
		subgraphClient: subgraphClient,
	}
}

// SyncAllUsers 同步所有用户数据
func (s *DataSyncService) SyncAllUsers(ctx context.Context) error {
	log.Println("开始同步用户数据...")
	
	skip := 0
	batchSize := 100
	
	for {
		// 从子图获取用户数据
		usersResp, err := s.subgraphClient.GetAllUsers(ctx, batchSize, skip)
		if err != nil {
			return fmt.Errorf("获取用户数据失败: %w", err)
		}
		
		if len(usersResp.Users) == 0 {
			break
		}
		
		// 处理每个用户
		for _, subgraphUser := range usersResp.Users {
			if err := s.syncUser(ctx, subgraphUser); err != nil {
				log.Printf("同步用户 %s 失败: %v", subgraphUser.Address, err)
				continue
			}
		}
		
		skip += batchSize
		log.Printf("已同步 %d 个用户", skip)
	}
	
	log.Println("用户数据同步完成")
	return nil
}

// syncUser 同步单个用户数据
func (s *DataSyncService) syncUser(ctx context.Context, subgraphUser subgraph.SubgraphUser) error {
	// 转换地址格式
	address := strings.ToLower(subgraphUser.Address)
	
	// 查找或创建用户
	var user model.User
	err := s.db.Where("address = ?", address).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		// 创建新用户
		user = model.User{
			Address: address,
		}
		if err := s.db.Create(&user).Error; err != nil {
			return fmt.Errorf("创建用户失败: %w", err)
		}
	} else if err != nil {
		return fmt.Errorf("查找用户失败: %w", err)
	}
	
	// 同步用户资料
	if subgraphUser.Profile != nil {
		if err := s.syncUserProfile(&user, subgraphUser.Profile); err != nil {
			log.Printf("同步用户资料失败: %v", err)
		}
	}
	
	// 同步用户技能
	if subgraphUser.Skills != nil {
		if err := s.syncUserSkills(&user, subgraphUser.Skills); err != nil {
			log.Printf("同步用户技能失败: %v", err)
		}
	}
	
	// 同步用户任务数据
	if err := s.syncUserTasks(ctx, &user); err != nil {
		log.Printf("同步用户任务失败: %v", err)
	}
	
	// 同步用户争议数据
	if err := s.syncUserDisputes(ctx, &user); err != nil {
		log.Printf("同步用户争议失败: %v", err)
	}
	
	// 同步用户投标数据
	if err := s.syncUserBids(ctx, &user); err != nil {
		log.Printf("同步用户投标失败: %v", err)
	}
	
	return nil
}

// syncUserProfile 同步用户资料
func (s *DataSyncService) syncUserProfile(user *model.User, profile *subgraph.UserProfile) error {
	var userProfile model.UserProfile
	err := s.db.Where("user_id = ?", user.ID).First(&userProfile).Error
	
	if err == gorm.ErrRecordNotFound {
		// 创建新资料
		userProfile = model.UserProfile{
			UserID:  user.ID,
			Name:    profile.Name,
			Email:   profile.Email,
			Bio:     profile.Bio,
			Website: profile.Website,
		}
		return s.db.Create(&userProfile).Error
	} else if err != nil {
		return err
	}
	
	// 更新现有资料
	userProfile.Name = profile.Name
	userProfile.Email = profile.Email
	userProfile.Bio = profile.Bio
	userProfile.Website = profile.Website
	
	return s.db.Save(&userProfile).Error
}

// syncUserSkills 同步用户技能
func (s *DataSyncService) syncUserSkills(user *model.User, skills *subgraph.UserSkills) error {
	var userProfile model.UserProfile
	err := s.db.Where("user_id = ?", user.ID).First(&userProfile).Error
	
	if err == gorm.ErrRecordNotFound {
		// 如果用户资料不存在，先创建
		userProfile = model.UserProfile{
			UserID: user.ID,
		}
		if err := s.db.Create(&userProfile).Error; err != nil {
			return err
		}
	} else if err != nil {
		return err
	}
	
	// 更新技能
	userProfile.Skills = skills.Skills
	return s.db.Save(&userProfile).Error
}

// syncUserTasks 同步用户任务数据
func (s *DataSyncService) syncUserTasks(ctx context.Context, user *model.User) error {
	// 获取用户任务数据
	tasksResp, err := s.subgraphClient.GetUserTasks(ctx, user.Address)
	if err != nil {
		return err
	}
	
	// 处理固定支付任务
	for _, task := range tasksResp.FixedPaymentTasks {
		if err := s.syncTaskCache(user, "fixed", task.ID, task.TaskID, task.Creator.Address, task.Worker.Address, task.Title, task.Reward, task.Deadline, task.Status, task.CreatedAt, task.UpdatedAt); err != nil {
			log.Printf("同步固定支付任务失败: %v", err)
		}
	}
	
	// 处理投标任务
	for _, task := range tasksResp.BiddingTasks {
		if err := s.syncTaskCache(user, "bidding", task.ID, task.TaskID, task.Creator.Address, task.Worker.Address, task.Title, task.Reward, task.Deadline, task.Status, task.CreatedAt, task.UpdatedAt); err != nil {
			log.Printf("同步投标任务失败: %v", err)
		}
	}
	
	// 处理里程碑任务
	for _, task := range tasksResp.MilestonePaymentTasks {
		if err := s.syncTaskCache(user, "milestone", task.ID, task.TaskID, task.Creator.Address, task.Worker.Address, task.Title, task.TotalReward, task.Deadline, task.Status, task.CreatedAt, task.UpdatedAt); err != nil {
			log.Printf("同步里程碑任务失败: %v", err)
		}
	}
	
	return nil
}

// syncUserDisputes 同步用户争议数据
func (s *DataSyncService) syncUserDisputes(ctx context.Context, user *model.User) error {
	// 获取用户争议数据
	disputesResp, err := s.subgraphClient.GetUserDisputes(ctx, user.Address)
	if err != nil {
		return err
	}
	
	// 这里可以根据需要处理争议数据
	// 目前只是记录日志
	for _, dispute := range disputesResp.Disputes {
		log.Printf("用户 %s 的争议: %s, 状态: %s", user.Address, dispute.DisputeID, dispute.Status)
	}
	
	return nil
}

// syncUserBids 同步用户投标数据
func (s *DataSyncService) syncUserBids(ctx context.Context, user *model.User) error {
	// 获取用户投标数据
	bidsResp, err := s.subgraphClient.GetUserBids(ctx, user.Address)
	if err != nil {
		return err
	}
	
	// 这里可以根据需要处理投标数据
	// 目前只是记录日志
	for _, bid := range bidsResp.Bids {
		log.Printf("用户 %s 的投标: 任务 %s, 金额: %s", user.Address, bid.TaskID, bid.Amount)
	}
	
	return nil
}

// syncTaskCache 同步任务缓存
func (s *DataSyncService) syncTaskCache(user *model.User, taskType, id, taskID, creator, worker, title, reward, deadline, status, createdAt, updatedAt string) error {
	// 解析时间
	_, err := parseUnixTime(createdAt)
	if err != nil {
		// 如果解析失败，使用当前时间
	}
	
	_, err = parseUnixTime(updatedAt)
	if err != nil {
		// 如果解析失败，使用当前时间
	}
	
	deadlineTime, err := parseUnixTime(deadline)
	if err != nil {
		deadlineTime = time.Now().Add(30 * 24 * time.Hour) // 默认30天后
	}
	
	// 查找或创建任务缓存
	var taskCache model.TaskCache
	err = s.db.Where("task_id = ?", taskID).First(&taskCache).Error
	
	if err == gorm.ErrRecordNotFound {
		// 创建新任务缓存
		taskCache = model.TaskCache{
			TaskID:      taskID,
			TaskType:    taskType,
			CreatorAddr: strings.ToLower(creator),
			WorkerAddr:  strings.ToLower(worker),
			Status:      status,
			Reward:      reward,
			Deadline:    deadlineTime,
			RawData:     fmt.Sprintf(`{"id":"%s","title":"%s","description":"","createdAt":"%s","updatedAt":"%s"}`, id, title, createdAt, updatedAt),
			LastSynced:  time.Now(),
		}
		return s.db.Create(&taskCache).Error
	} else if err != nil {
		return err
	}
	
	// 更新现有任务缓存
	taskCache.TaskType = taskType
	taskCache.CreatorAddr = strings.ToLower(creator)
	taskCache.WorkerAddr = strings.ToLower(worker)
	taskCache.Status = status
	taskCache.Reward = reward
	taskCache.Deadline = deadlineTime
	taskCache.RawData = fmt.Sprintf(`{"id":"%s","title":"%s","description":"","createdAt":"%s","updatedAt":"%s"}`, id, title, createdAt, updatedAt)
	taskCache.LastSynced = time.Now()
	
	return s.db.Save(&taskCache).Error
}

// parseUnixTime 解析Unix时间戳
func parseUnixTime(timestamp string) (time.Time, error) {
	// 移除可能的引号
	timestamp = strings.Trim(timestamp, "\"")
	
	// 尝试解析为Unix时间戳
	unixTime, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return time.Time{}, err
	}
	
	// 转换为时间
	return time.Unix(unixTime, 0), nil
}

// SyncUserBehaviorData 同步用户行为数据（用于声誉计算）
func (s *DataSyncService) SyncUserBehaviorData(ctx context.Context, userAddress string) error {
	userAddress = strings.ToLower(userAddress)
	
	// 查找或创建用户
	var user model.User
	err := s.db.Where("address = ?", userAddress).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		// 创建新用户
		user = model.User{
			Address: userAddress,
		}
		if err := s.db.Create(&user).Error; err != nil {
			return fmt.Errorf("创建用户失败: %w", err)
		}
	} else if err != nil {
		return fmt.Errorf("查找用户失败: %w", err)
	}
	
	// 同步任务数据
	if err := s.syncUserTasks(ctx, &user); err != nil {
		return fmt.Errorf("同步任务数据失败: %w", err)
	}
	
	// 同步争议数据
	if err := s.syncUserDisputes(ctx, &user); err != nil {
		return fmt.Errorf("同步争议数据失败: %w", err)
	}
	
	// 同步投标数据
	if err := s.syncUserBids(ctx, &user); err != nil {
		return fmt.Errorf("同步投标数据失败: %w", err)
	}
	
	log.Printf("用户 %s 的行为数据同步完成", userAddress)
	return nil
}
