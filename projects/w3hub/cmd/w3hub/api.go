package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/q23818/ETHShanghai-2025/projects/w3hub/pkg/asset"
)

// @title W3Hub API
// @version 1.0
// @description Web3资产管理平台API
// @BasePath /api/v1

type API struct {
	assetManager *asset.Manager
}

func NewAPI(manager *asset.Manager) *API {
	return &API{assetManager: manager}
}

// GetAssets godoc
// @Summary 获取资产列表
// @Description 获取指定地址的资产列表
// @Tags assets
// @Accept  json
// @Produce  json
// @Param   chain     path    string     true        "区块链类型"
// @Param   address   path    string     true        "钱包地址"
// @Success 200 {object} []asset.Asset
// @Failure 400 {object} map[string]string
// @Router /assets/{chain}/{address} [get]
func (a *API) GetAssets(c *gin.Context) {
	chain := c.Param("chain")
	address := c.Param("address")

	assets, err := a.assetManager.GetAssets(c.Request.Context(), chain, address)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, assets)
}

// GetAssetHistory godoc
// @Summary 获取资产历史
// @Description 获取资产历史记录
// @Tags assets
// @Accept  json
// @Produce  json
// @Param   id       path    string     true        "资产ID"
// @Param   from     query   string     false       "开始时间"
// @Param   to       query   string     false       "结束时间"
// @Success 200 {object} []asset.Asset
// @Failure 400 {object} map[string]string
// @Router /assets/history/{id} [get]
func (a *API) GetAssetHistory(c *gin.Context) {
	// 实现历史查询API
}