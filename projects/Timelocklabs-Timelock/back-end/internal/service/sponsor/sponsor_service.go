package sponsor

import (
	"fmt"
	"timelock-backend/internal/repository/sponsor"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"
)

// Service 赞助方服务接口
type Service interface {
	// 获取公开的赞助方列表（公开接口）
	GetPublicSponsors() (*types.GetPublicSponsorsResponse, error)
}

// service 赞助方服务实现
type service struct {
	sponsorRepo sponsor.Repository
}

// NewService 创建新的赞助方服务
func NewService(sponsorRepo sponsor.Repository) Service {
	return &service{
		sponsorRepo: sponsorRepo,
	}
}

// GetPublicSponsors 获取公开的赞助方列表（公开接口）
func (s *service) GetPublicSponsors() (*types.GetPublicSponsorsResponse, error) {
	logger.Info("Getting public sponsors")

	// 获取所有激活的赞助方
	allSponsors, err := s.sponsorRepo.GetAllActive()
	if err != nil {
		logger.Error("Failed to get active sponsors", err)
		return nil, fmt.Errorf("failed to get active sponsors: %w", err)
	}

	// 分离赞助方和生态伙伴
	var sponsors []types.SponsorInfo
	var partners []types.SponsorInfo

	for _, sponsor := range allSponsors {
		sponsorInfo := types.SponsorInfo{
			ID:          sponsor.ID,
			Name:        sponsor.Name,
			LogoURL:     sponsor.LogoURL,
			Link:        sponsor.Link,
			Description: sponsor.Description,
			Type:        sponsor.Type,
			SortOrder:   sponsor.SortOrder,
		}

		if sponsor.Type == types.SponsorTypeSponsor {
			sponsors = append(sponsors, sponsorInfo)
		} else if sponsor.Type == types.SponsorTypePartner {
			partners = append(partners, sponsorInfo)
		}
	}

	response := &types.GetPublicSponsorsResponse{
		Sponsors: sponsors,
		Partners: partners,
	}

	logger.Info("Got public sponsors", "sponsors_count", len(sponsors), "partners_count", len(partners))
	return response, nil
}
