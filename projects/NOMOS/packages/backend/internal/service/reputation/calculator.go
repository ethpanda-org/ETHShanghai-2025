package reputation

import (
	"context"
	"math"
	"strconv"
	"time"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/subgraph"
)

type Calculator struct {
	subgraphClient *subgraph.Client

	// 权重配置
	weights Weights
}

type Weights struct {
	TaskCompletion         float64
	TaskCreation           float64
	BiddingCompetitiveness float64
	DisputeResolution      float64
	Activity               float64
}

func NewCalculator(client *subgraph.Client) *Calculator {
	return &Calculator{
		subgraphClient: client,
		weights: Weights{
			TaskCompletion:         0.35,
			TaskCreation:           0.20,
			BiddingCompetitiveness: 0.15,
			DisputeResolution:      0.15,
			Activity:               0.15,
		},
	}
}

type ScoreResult struct {
	GuildScore      float64
	Rank            RankInfo
	Breakdown       ScoreBreakdown
	TimeDecayFactor float64
	RawScore        float64
}

type RankInfo struct {
	Grade    string
	Title    string
	NextRank NextRankInfo
}

type NextRankInfo struct {
	Score        float64
	PointsNeeded float64
	Title        string
}

type ScoreBreakdown struct {
	TaskCompletion DimensionScore
	TaskCreation   DimensionScore
	Bidding        DimensionScore
	Dispute        DimensionScore
	Activity       DimensionScore
}

type DimensionScore struct {
	Score   float64
	Weight  float64
	Details map[string]interface{}
}

func (c *Calculator) CalculateGuildScore(ctx context.Context, userAddress string) (*ScoreResult, error) {
	// 从 Subgraph 获取用户数据
	userData, err := c.subgraphClient.GetUserWorkSummary(ctx, userAddress)
	if err != nil {
		return nil, err
	}

	// 计算各维度得分
	taskScore := c.calculateTaskCompletionScore(userData)
	creationScore := c.calculateTaskCreationScore(userData)
	biddingScore := c.calculateBiddingScore(userData)
	disputeScore := c.calculateDisputeScore(userData)
	activityScore := c.calculateActivityScore(userData)

	// 计算原始分数
	rawScore := taskScore.Score*c.weights.TaskCompletion +
		creationScore.Score*c.weights.TaskCreation +
		biddingScore.Score*c.weights.BiddingCompetitiveness +
		disputeScore.Score*c.weights.DisputeResolution +
		activityScore.Score*c.weights.Activity

	// 计算时间衰减因子
	timeDecay := c.calculateTimeDecayFactor(userData)

	// 最终分数
	finalScore := rawScore * timeDecay

	// 获取等级信息
	rank := c.getRank(finalScore)

	return &ScoreResult{
		GuildScore: math.Round(finalScore*10) / 10,
		Rank:       rank,
		Breakdown: ScoreBreakdown{
			TaskCompletion: taskScore,
			TaskCreation:   creationScore,
			Bidding:        biddingScore,
			Dispute:        disputeScore,
			Activity:       activityScore,
		},
		TimeDecayFactor: timeDecay,
		RawScore:        rawScore,
	}, nil
}

func (c *Calculator) calculateTaskCompletionScore(userData *subgraph.UserWorkSummary) DimensionScore {
	allTasks := append(userData.AssignedTasks, userData.BiddingTaskAssigned...)

	// 添加里程碑任务
	for _, mt := range userData.MilestonePaymentTaskAssigned {
		allTasks = append(allTasks, subgraph.Task{
			ID:        mt.ID,
			TaskID:    mt.TaskID,
			Title:     mt.Title,
			Reward:    mt.Reward,
			Deadline:  mt.Deadline,
			Status:    mt.Status,
			CreatedAt: mt.CreatedAt,
			UpdatedAt: mt.UpdatedAt,
		})
	}

	if len(allTasks) == 0 {
		return DimensionScore{Score: 0, Weight: c.weights.TaskCompletion}
	}

	completedCount := 0
	onTimeCount := 0
	totalReward := 0.0

	for _, task := range allTasks {
		if task.Status == "COMPLETED" || task.Status == "PAID" || task.Status == "Paid" {
			completedCount++

			// 检查是否按时完成
			deadline, _ := strconv.ParseInt(task.Deadline, 10, 64)
			updatedAt, _ := strconv.ParseInt(task.UpdatedAt, 10, 64)
			if updatedAt <= deadline {
				onTimeCount++
			}

			reward, _ := strconv.ParseFloat(task.Reward, 64)
			totalReward += reward / 1e18 // 转换为代币单位
		}
	}

	completionRate := float64(completedCount) / float64(len(allTasks))
	onTimeRate := 0.0
	if completedCount > 0 {
		onTimeRate = float64(onTimeCount) / float64(completedCount)
	}
	avgReward := totalReward / float64(len(allTasks))

	// 计算分数
	quantityScore := float64(completedCount) * 0.3 * math.Log(1+float64(completedCount))
	completionScore := completionRate * 100 * 0.4
	onTimeScore := onTimeRate * 100 * 0.2
	valueScore := math.Min(avgReward/100, 10) * 0.1

	totalScore := quantityScore + completionScore + onTimeScore + valueScore

	return DimensionScore{
		Score:  math.Min(totalScore, 100) * c.weights.TaskCompletion,
		Weight: c.weights.TaskCompletion,
		Details: map[string]interface{}{
			"completed_tasks": completedCount,
			"total_tasks":     len(allTasks),
			"completion_rate": completionRate,
			"on_time_rate":    onTimeRate,
			"avg_reward":      avgReward,
		},
	}
}

func (c *Calculator) calculateTaskCreationScore(userData *subgraph.UserWorkSummary) DimensionScore {
	allCreated := append(userData.CreatedTasks, userData.BiddingTaskCreated...)
	allCreated = append(allCreated, userData.MilestonePaymentTaskCreated...)

	if len(allCreated) == 0 {
		return DimensionScore{Score: 0, Weight: c.weights.TaskCreation}
	}

	paidCount := 0
	for _, task := range allCreated {
		if task.Status == "COMPLETED" || task.Status == "PAID" || task.Status == "Paid" {
			paidCount++
		}
	}

	paymentRate := float64(paidCount) / float64(len(allCreated))
	disputeRate := float64(len(userData.CreatorDisputes)) / float64(len(allCreated))

	quantityScore := float64(len(allCreated)) * 0.3 * math.Sqrt(float64(len(allCreated)))
	paymentScore := paymentRate * 100 * 0.4
	disputeScore := (1 - math.Min(disputeRate, 1)) * 100 * 0.3

	totalScore := quantityScore + paymentScore + disputeScore

	return DimensionScore{
		Score:  math.Min(totalScore, 100) * c.weights.TaskCreation,
		Weight: c.weights.TaskCreation,
		Details: map[string]interface{}{
			"created_count": len(allCreated),
			"paid_count":    paidCount,
			"payment_rate":  paymentRate,
			"dispute_rate":  disputeRate,
		},
	}
}

func (c *Calculator) calculateBiddingScore(userData *subgraph.UserWorkSummary) DimensionScore {
	if len(userData.Bids) == 0 {
		return DimensionScore{Score: 0, Weight: c.weights.BiddingCompetitiveness}
	}

	wonBids := len(userData.BiddingTaskAssigned)
	winRate := float64(wonBids) / float64(len(userData.Bids))

	activityScore := float64(len(userData.Bids)) * 0.2 * math.Log(1+float64(len(userData.Bids)))
	winScore := winRate * 100 * 0.6
	rationalityScore := 1.0 * 20 * 0.2 // 简化处理

	totalScore := activityScore + winScore + rationalityScore

	return DimensionScore{
		Score:  math.Min(totalScore, 100) * c.weights.BiddingCompetitiveness,
		Weight: c.weights.BiddingCompetitiveness,
		Details: map[string]interface{}{
			"total_bids": len(userData.Bids),
			"won_bids":   wonBids,
			"win_rate":   winRate,
		},
	}
}

func (c *Calculator) calculateDisputeScore(userData *subgraph.UserWorkSummary) DimensionScore {
	allDisputes := append(userData.WorkerDisputes, userData.CreatorDisputes...)

	if len(allDisputes) == 0 {
		return DimensionScore{
			Score:  100 * c.weights.DisputeResolution,
			Weight: c.weights.DisputeResolution,
			Details: map[string]interface{}{
				"total_disputes": 0,
				"won_disputes":   0,
			},
		}
	}

	wonDisputes := 0
	totalAdminSupport := 0.0

	for _, dispute := range allDisputes {
		workerShare, _ := strconv.ParseFloat(dispute.WorkerShare, 64)
		isWorker := contains(userData.WorkerDisputes, dispute)

		if (isWorker && workerShare >= 50) || (!isWorker && workerShare < 50) {
			wonDisputes++
		}

		// 计算管理员支持度
		if len(dispute.Votes) > 0 {
			totalStake := 0.0
			supportStake := 0.0

			for _, vote := range dispute.Votes {
				stake, _ := strconv.ParseFloat(vote.Admin.StakeAmount, 64)
				voteShare, _ := strconv.ParseFloat(vote.WorkerShare, 64)
				totalStake += stake

				if (isWorker && voteShare >= 50) || (!isWorker && voteShare < 50) {
					supportStake += stake
				}
			}

			if totalStake > 0 {
				totalAdminSupport += supportStake / totalStake
			}
		}
	}

	winRate := float64(wonDisputes) / float64(len(allDisputes))
	avgAdminSupport := totalAdminSupport / float64(len(allDisputes))

	lowDisputeScore := math.Max(0, 100-float64(len(allDisputes))*10) * 0.4
	winScore := winRate * 100 * 0.4
	supportScore := avgAdminSupport * 100 * 0.2

	totalScore := lowDisputeScore + winScore + supportScore

	return DimensionScore{
		Score:  totalScore * c.weights.DisputeResolution,
		Weight: c.weights.DisputeResolution,
		Details: map[string]interface{}{
			"total_disputes":     len(allDisputes),
			"won_disputes":       wonDisputes,
			"win_rate":           winRate,
			"admin_support_rate": avgAdminSupport,
		},
	}
}

func (c *Calculator) calculateActivityScore(userData *subgraph.UserWorkSummary) DimensionScore {
	allTasks := append(userData.AssignedTasks, userData.BiddingTaskAssigned...)

	if len(allTasks) == 0 {
		return DimensionScore{Score: 0, Weight: c.weights.Activity}
	}

	// 计算账户年龄（使用第一个任务的创建时间作为账户年龄的估算）
	firstTaskTime := time.Now()
	for _, task := range allTasks {
		createdAt, _ := strconv.ParseInt(task.CreatedAt, 10, 64)
		taskTime := time.Unix(createdAt, 0)
		if taskTime.Before(firstTaskTime) {
			firstTaskTime = taskTime
		}
	}
	accountAgeDays := time.Since(firstTaskTime).Hours() / 24

	// 计算最近30天活跃度
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30).Unix()
	recentTaskCount := 0
	for _, task := range allTasks {
		createdAt, _ := strconv.ParseInt(task.CreatedAt, 10, 64)
		if createdAt > thirtyDaysAgo {
			recentTaskCount++
		}
	}

	// 里程碑完成率
	milestoneCompletionRate := 0.0
	if len(userData.MilestonePaymentTaskAssigned) > 0 {
		totalCompleted := 0
		for _, mt := range userData.MilestonePaymentTaskAssigned {
			completed, _ := strconv.Atoi(mt.CompletedMilestonesCount)
			totalCompleted += completed
		}
		milestoneCompletionRate = float64(totalCompleted) / float64(len(userData.MilestonePaymentTaskAssigned)) / 5.0
	}

	ageScore := math.Log(1+accountAgeDays) * 10 * 0.3
	activityScore := math.Min(float64(recentTaskCount)*2, 100) * 0.4
	milestoneScore := milestoneCompletionRate * 100 * 0.2
	activeDaysScore := math.Min(float64(recentTaskCount)/30, 1) * 100 * 0.1

	totalScore := ageScore + activityScore + milestoneScore + activeDaysScore

	return DimensionScore{
		Score:  math.Min(totalScore, 100) * c.weights.Activity,
		Weight: c.weights.Activity,
		Details: map[string]interface{}{
			"account_age_days":          accountAgeDays,
			"recent_tasks_count":        recentTaskCount,
			"milestone_completion_rate": milestoneCompletionRate,
		},
	}
}

func (c *Calculator) calculateTimeDecayFactor(userData *subgraph.UserWorkSummary) float64 {
	allTasks := append(userData.AssignedTasks, userData.BiddingTaskAssigned...)

	if len(allTasks) == 0 {
		return 1.0
	}

	ninetyDaysAgo := time.Now().AddDate(0, 0, -90).Unix()
	recentTaskCount := 0

	for _, task := range allTasks {
		createdAt, _ := strconv.ParseInt(task.CreatedAt, 10, 64)
		if createdAt > ninetyDaysAgo {
			recentTaskCount++
		}
	}

	if recentTaskCount >= 5 {
		return 1.0
	}
	if recentTaskCount >= 3 {
		return 0.95
	}
	if recentTaskCount >= 1 {
		return 0.9
	}

	// 计算无活跃的90天周期数
	lastActivityTime := int64(0)
	for _, task := range allTasks {
		updatedAt, _ := strconv.ParseInt(task.UpdatedAt, 10, 64)
		if updatedAt > lastActivityTime {
			lastActivityTime = updatedAt
		}
	}

	if lastActivityTime == 0 {
		return 0.8
	}

	inactiveDays := float64(time.Now().Unix()-lastActivityTime) / (60 * 60 * 24)
	inactivePeriods := math.Floor(inactiveDays / 90)

	return 0.8 * math.Pow(0.9, math.Max(0, inactivePeriods-1))
}

func (c *Calculator) getRank(score float64) RankInfo {
	ranks := []struct {
		threshold float64
		grade     string
		title     string
	}{
		{1000, "SS", "Mythic"},
		{950, "S", "Epic"},
		{900, "A", "Legendary"},
		{800, "B", "Grandmaster"},
		{600, "C", "Master"},
		{400, "D", "Journeyman"},
		{200, "E", "Artisan"},
		{0, "F", "Apprentice"},
	}

	for _, rank := range ranks {
		if score >= rank.threshold {
			return RankInfo{
				Grade:    rank.grade,
				Title:    rank.title,
				NextRank: c.getNextRank(score, ranks),
			}
		}
	}

	return RankInfo{Grade: "F", Title: "Apprentice"}
}

func (c *Calculator) getNextRank(currentScore float64, ranks []struct {
	threshold float64
	grade     string
	title     string
}) NextRankInfo {
	for _, rank := range ranks {
		if rank.threshold > currentScore {
			return NextRankInfo{
				Score:        rank.threshold,
				PointsNeeded: rank.threshold - currentScore,
				Title:        rank.title,
			}
		}
	}
	return NextRankInfo{Score: 0, PointsNeeded: 0, Title: "Max Rank"}
}

func contains(disputes []subgraph.Dispute, target subgraph.Dispute) bool {
	for _, d := range disputes {
		if d.ID == target.ID {
			return true
		}
	}
	return false
}
