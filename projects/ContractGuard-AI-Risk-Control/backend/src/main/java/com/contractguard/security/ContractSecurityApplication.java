package com.contractguard.security;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync  // 添加这个注解
@SpringBootApplication
@EnableFeignClients
public class ContractSecurityApplication {

    public static void main(String[] args) {
        SpringApplication.run(ContractSecurityApplication.class, args);
    }

}
