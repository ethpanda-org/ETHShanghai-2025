package subgraph

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	url        string
	httpClient *http.Client
}

func NewClient(url string) *Client {
	return &Client{
		url: url,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type GraphQLRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}

type GraphQLResponse struct {
	Data   json.RawMessage `json:"data"`
	Errors []GraphQLError  `json:"errors,omitempty"`
}

type GraphQLError struct {
	Message string `json:"message"`
}

func (c *Client) Query(ctx context.Context, query string, variables map[string]interface{}, result interface{}) error {
	reqBody := GraphQLRequest{
		Query:     query,
		Variables: variables,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	var graphQLResp GraphQLResponse
	if err := json.Unmarshal(body, &graphQLResp); err != nil {
		return fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if len(graphQLResp.Errors) > 0 {
		return fmt.Errorf("graphql errors: %v", graphQLResp.Errors)
	}

	if err := json.Unmarshal(graphQLResp.Data, result); err != nil {
		return fmt.Errorf("failed to unmarshal data: %w", err)
	}

	return nil
}

// GetAllUsers 获取所有用户
func (c *Client) GetAllUsers(ctx context.Context, first int, skip int) (*UsersResponse, error) {
	query := `
		query GetAllUsers($first: Int!, $skip: Int!) {
			users(first: $first, skip: $skip) {
				id
				address
				profile {
					name
					email
					bio
					website
				}
				skills {
					skills
				}
			}
		}
	`

	variables := map[string]interface{}{
		"first": first,
		"skip":  skip,
	}

	var result UsersResponse
	if err := c.Query(ctx, query, variables, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// GetUserTasks 获取用户任务数据
func (c *Client) GetUserTasks(ctx context.Context, userAddress string) (*UserTasksResponse, error) {
	query := `
		query GetUserTasks($userAddress: Bytes!) {
			fixedPaymentTasks(where: {or: [{creator: $userAddress}, {worker: $userAddress}]}) {
				id
				taskId
				creator {
					id
					address
				}
				worker {
					id
					address
				}
				title
				description
				reward
				deadline
				status
				createdAt
				updatedAt
			}
			biddingTasks(where: {or: [{creator: $userAddress}, {worker: $userAddress}]}) {
				id
				taskId
				creator {
					id
					address
				}
				worker {
					id
					address
				}
				title
				description
				reward
				deadline
				status
				createdAt
				updatedAt
			}
			milestonePaymentTasks(where: {or: [{creator: $userAddress}, {worker: $userAddress}]}) {
				id
				taskId
				creator {
					id
					address
				}
				worker {
					id
					address
				}
				title
				description
				totalReward
				deadline
				status
				completedMilestonesCount
				createdAt
				updatedAt
			}
		}
	`

	variables := map[string]interface{}{
		"userAddress": userAddress,
	}

	var result UserTasksResponse
	if err := c.Query(ctx, query, variables, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// GetUserDisputes 获取用户争议数据
func (c *Client) GetUserDisputes(ctx context.Context, userAddress string) (*UserDisputesResponse, error) {
	query := `
		query GetUserDisputes($userAddress: Bytes!) {
			disputes(where: {or: [{worker: $userAddress}, {taskCreator: $userAddress}]}) {
				id
				disputeId
				taskId
				worker
				taskCreator
				rewardAmount
				workerShare
				status
				createdAt
				resolvedAt
				distributedAt
			}
		}
	`

	variables := map[string]interface{}{
		"userAddress": userAddress,
	}

	var result UserDisputesResponse
	if err := c.Query(ctx, query, variables, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// GetUserBids 获取用户投标数据
func (c *Client) GetUserBids(ctx context.Context, userAddress string) (*UserBidsResponse, error) {
	query := `
		query GetUserBids($userAddress: Bytes!) {
			bids(where: {bidder: $userAddress}) {
				id
				taskId
				bidder
				amount
				estimatedTime
				description
				createdAt
			}
		}
	`

	variables := map[string]interface{}{
		"userAddress": userAddress,
	}

	var result UserBidsResponse
	if err := c.Query(ctx, query, variables, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// GetUserWorkSummary 获取用户工作摘要
func (c *Client) GetUserWorkSummary(ctx context.Context, userID string) (*UserWorkSummary, error) {
	query := `
        query GetUserWorkSummary($id: ID!) {
            user(id: $id) {
                id
                address
                assignedTasks {
                    id
                    taskId
                    title
                    reward
                    deadline
                    status
                    createdAt
                    updatedAt
                }
                biddingTaskAssigned {
                    id
                    taskId
                    title
                    reward
                    deadline
                    status
                    createdAt
                    updatedAt
                }
                milestonePaymentTaskAssigned {
                    id
                    taskId
                    title
                    reward
                    deadline
                    status
                    completedMilestonesCount
                    createdAt
                    updatedAt
                }
                createdTasks {
                    id
                    taskId
                    status
                    reward
                }
                biddingTaskCreated {
                    id
                    taskId
                    status
                    reward
                }
                milestonePaymentTaskCreated {
                    id
                    taskId
                    status
                    reward
                }
                workerDisputes {
                    id
                    disputeId
                    taskId
                    rewardAmount
                    workerShare
                    status
                    votes {
                        admin {
                            stakeAmount
                        }
                        workerShare
                    }
                    createdAt
                }
                creatorDisputes {
                    id
                    disputeId
                    taskId
                    rewardAmount
                    workerShare
                    status
                    createdAt
                }
                bids {
                    id
                    taskId
                    amount
                    estimatedTime
                    createdAt
                }
            }
        }
    `

	variables := map[string]interface{}{
		"id": userID,
	}

	var result struct {
		User UserWorkSummary `json:"user"`
	}

	if err := c.Query(ctx, query, variables, &result); err != nil {
		return nil, err
	}

	return &result.User, nil
}

// 数据结构定义
type UserWorkSummary struct {
	ID                           string          `json:"id"`
	Address                      string          `json:"address"`
	AssignedTasks                []Task          `json:"assignedTasks"`
	BiddingTaskAssigned          []Task          `json:"biddingTaskAssigned"`
	MilestonePaymentTaskAssigned []MilestoneTask `json:"milestonePaymentTaskAssigned"`
	CreatedTasks                 []TaskSimple    `json:"createdTasks"`
	BiddingTaskCreated           []TaskSimple    `json:"biddingTaskCreated"`
	MilestonePaymentTaskCreated  []TaskSimple    `json:"milestonePaymentTaskCreated"`
	WorkerDisputes               []Dispute       `json:"workerDisputes"`
	CreatorDisputes              []Dispute       `json:"creatorDisputes"`
	Bids                         []Bid           `json:"bids"`
}

type Task struct {
	ID        string `json:"id"`
	TaskID    string `json:"taskId"`
	Title     string `json:"title"`
	Reward    string `json:"reward"`
	Deadline  string `json:"deadline"`
	Status    string `json:"status"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updated At"`
}

type MilestoneTask struct {
	Task
	CompletedMilestonesCount string `json:"completedMilestonesCount"`
}

type TaskSimple struct {
	ID     string `json:"id"`
	TaskID string `json:"taskId"`
	Status string `json:"status"`
	Reward string `json:"reward"`
}

type Dispute struct {
	ID           string      `json:"id"`
	DisputeID    string      `json:"disputeId"`
	TaskID       string      `json:"taskId"`
	RewardAmount string      `json:"rewardAmount"`
	WorkerShare  string      `json:"workerShare"`
	Status       string      `json:"status"`
	Votes        []AdminVote `json:"votes"`
	CreatedAt    string      `json:"createdAt"`
}

type AdminVote struct {
	Admin       Admin  `json:"admin"`
	WorkerShare string `json:"workerShare"`
}

type Admin struct {
	StakeAmount string `json:"stakeAmount"`
}

type Bid struct {
	ID            string `json:"id"`
	TaskID        string `json:"taskId"`
	Amount        string `json:"amount"`
	EstimatedTime string `json:"estimatedTime"`
	CreatedAt     string `json:"createdAt"`
}

// 新增数据结构
type UsersResponse struct {
	Users []SubgraphUser `json:"users"`
}

type SubgraphUser struct {
	ID        string         `json:"id"`
	Address   string         `json:"address"`
	CreatedAt string         `json:"createdAt"`
	UpdatedAt string         `json:"updatedAt"`
	Profile   *UserProfile   `json:"profile"`
	Skills    *UserSkills    `json:"skills"`
}

type UserProfile struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Bio     string `json:"bio"`
	Website string `json:"website"`
}

type UserSkills struct {
	Skills []string `json:"skills"`
}

type UserTasksResponse struct {
	FixedPaymentTasks     []SubgraphFixedTask     `json:"fixedPaymentTasks"`
	BiddingTasks          []SubgraphBiddingTask   `json:"biddingTasks"`
	MilestonePaymentTasks []SubgraphMilestoneTask `json:"milestonePaymentTasks"`
}

type SubgraphFixedTask struct {
	ID          string `json:"id"`
	TaskID      string `json:"taskId"`
	Creator     User   `json:"creator"`
	Worker      User   `json:"worker"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Reward      string `json:"reward"`
	Deadline    string `json:"deadline"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type SubgraphBiddingTask struct {
	ID          string `json:"id"`
	TaskID      string `json:"taskId"`
	Creator     User   `json:"creator"`
	Worker      User   `json:"worker"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Reward      string `json:"reward"`
	Deadline    string `json:"deadline"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type SubgraphMilestoneTask struct {
	ID                       string `json:"id"`
	TaskID                   string `json:"taskId"`
	Creator                  User   `json:"creator"`
	Worker                   User   `json:"worker"`
	Title                    string `json:"title"`
	Description              string `json:"description"`
	TotalReward              string `json:"totalReward"`
	Deadline                 string `json:"deadline"`
	Status                   string `json:"status"`
	CompletedMilestonesCount string `json:"completedMilestonesCount"`
	CreatedAt                string `json:"createdAt"`
	UpdatedAt                string `json:"updatedAt"`
}

type UserDisputesResponse struct {
	Disputes []SubgraphDispute `json:"disputes"`
}

type SubgraphDispute struct {
	ID           string `json:"id"`
	DisputeID    string `json:"disputeId"`
	TaskID       string `json:"taskId"`
	Worker       string `json:"worker"`
	TaskCreator  string `json:"taskCreator"`
	RewardAmount string `json:"rewardAmount"`
	WorkerShare  string `json:"workerShare"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`
	ResolvedAt   string `json:"resolvedAt"`
	DistributedAt string `json:"distributedAt"`
}

type UserBidsResponse struct {
	Bids []SubgraphBid `json:"bids"`
}

type SubgraphBid struct {
	ID            string `json:"id"`
	TaskID        string `json:"taskId"`
	Bidder        string `json:"bidder"`
	Amount        string `json:"amount"`
	EstimatedTime string `json:"estimatedTime"`
	Description   string `json:"description"`
	CreatedAt     string `json:"createdAt"`
}

// User represents a user entity from the subgraph
type User struct {
	ID      string `json:"id"`
	Address string `json:"address"`
}
