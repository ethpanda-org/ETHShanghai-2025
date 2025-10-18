package com.contractguard.security.controller;

import com.contractguard.security.dto.ApiResponse;
import com.contractguard.security.service.ai.AIStrategyFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AI策略管理控制器
 */
@RestController
@RequestMapping("/ai")
@CrossOrigin(origins = "*")
@Slf4j
public class AIStrategyController {

    @Autowired
    private AIStrategyFactory aiStrategyFactory;

    /**
     * 获取所有可用的AI策略
     */
    @GetMapping("/strategies")
    public ApiResponse<List<String>> getAvailableStrategies() {
        List<String> strategies = aiStrategyFactory.getAvailableStrategies();
        return ApiResponse.success(strategies);
    }

    /**
     * 获取AI策略详情
     */
    @GetMapping("/strategies/info")
    public ApiResponse<Map<String, Object>> getStrategyInfo() {
        Map<String, Object> info = aiStrategyFactory.getStrategyInfo();
        return ApiResponse.success(info);
    }
}