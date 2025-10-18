package com.contractguard.security.annotation;

import org.springframework.stereotype.Component;

import java.lang.annotation.*;

/**
 * AI策略标识注解
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Component
public @interface AIStrategy {

    /**
     * 策略类型: claude, chatgpt, deepseek等
     */
    AIStrategyType value();

    /**
     * 优先级: 数字越小优先级越高
     */
    int priority() default 100;
}