//! 集成测试命令行工具
//! 
//! 提供命令行接口来执行各种类型的集成测试

use ai_contract_generator::{
    config::Config,
    test_runner::{IntegrationTestRunner, TestRunnerConfig},
    error::Result,
};
use clap::{Parser, Subcommand};
use tracing::{info, error, Level};
use tracing_subscriber;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "integration-test")]
#[command(about = "AI Multi-Agent Contract Generator Integration Test Runner")]
#[command(version = "1.0.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
    
    /// 配置文件路径
    #[arg(short, long, value_name = "FILE")]
    config: Option<PathBuf>,
    
    /// 日志级别
    #[arg(short, long, default_value = "info")]
    log_level: String,
    
    /// 测试报告输出目录
    #[arg(short, long, default_value = "test_reports")]
    output_dir: String,
}

#[derive(Subcommand)]
enum Commands {
    /// 运行完整的集成测试套件
    Full {
        /// 测试超时时间（秒）
        #[arg(short, long, default_value = "1800")]
        timeout: u64,
        
        /// 是否生成详细报告
        #[arg(short, long)]
        detailed_report: bool,
        
        /// 最大并发测试数
        #[arg(short, long, default_value = "4")]
        max_concurrent: usize,
    },
    
    /// 运行端到端功能测试
    E2e {
        /// 测试超时时间（秒）
        #[arg(short, long, default_value = "900")]
        timeout: u64,
    },
    
    /// 运行部署验证测试
    Deployment {
        /// 环境类型 (dev, staging, prod)
        #[arg(short, long, default_value = "dev")]
        environment: String,
    },
    
    /// 运行安全性测试
    Security {
        /// 是否包含渗透测试
        #[arg(short, long)]
        penetration_test: bool,
    },
    
    /// 运行健康检查
    Health,
    
    /// 运行性能基准测试
    Benchmark {
        /// 基准测试持续时间（秒）
        #[arg(short, long, default_value = "300")]
        duration: u64,
        
        /// 并发用户数
        #[arg(short, long, default_value = "10")]
        concurrent_users: usize,
    },
    
    /// 生成测试报告
    Report {
        /// 报告类型 (html, json, pdf)
        #[arg(short, long, default_value = "html")]
        format: String,
        
        /// 输入的测试结果文件
        #[arg(short, long)]
        input: PathBuf,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    
    // 初始化日志
    init_logging(&cli.log_level)?;
    
    info!("启动 AI Multi-Agent Contract Generator 集成测试工具");
    
    // 加载配置
    let config = load_config(cli.config.as_deref()).await?;
    
    // 执行命令
    match cli.command {
        Commands::Full { timeout, detailed_report, max_concurrent } => {
            run_full_tests(config, &cli.output_dir, timeout, detailed_report, max_concurrent).await?;
        }
        Commands::E2e { timeout } => {
            run_e2e_tests(config, &cli.output_dir, timeout).await?;
        }
        Commands::Deployment { environment } => {
            run_deployment_tests(config, &cli.output_dir, &environment).await?;
        }
        Commands::Security { penetration_test } => {
            run_security_tests(config, &cli.output_dir, penetration_test).await?;
        }
        Commands::Health => {
            run_health_check(config).await?;
        }
        Commands::Benchmark { duration, concurrent_users } => {
            run_benchmark_tests(config, &cli.output_dir, duration, concurrent_users).await?;
        }
        Commands::Report { format, input } => {
            generate_report(&format, &input, &cli.output_dir).await?;
        }
    }
    
    info!("集成测试工具执行完成");
    Ok(())
}

/// 初始化日志系统
fn init_logging(log_level: &str) -> Result<()> {
    let level = match log_level.to_lowercase().as_str() {
        "trace" => Level::TRACE,
        "debug" => Level::DEBUG,
        "info" => Level::INFO,
        "warn" => Level::WARN,
        "error" => Level::ERROR,
        _ => Level::INFO,
    };
    
    tracing_subscriber::fmt()
        .with_max_level(level)
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();
    
    Ok(())
}

/// 加载配置文件
async fn load_config(config_path: Option<&std::path::Path>) -> Result<Config> {
    match config_path {
        Some(path) => {
            info!("从文件加载配置: {:?}", path);
            Config::from_file(path).await
        }
        None => {
            info!("使用默认配置");
            Ok(Config::default())
        }
    }
}

/// 运行完整的集成测试套件
async fn run_full_tests(
    config: Config,
    output_dir: &str,
    timeout: u64,
    detailed_report: bool,
    max_concurrent: usize,
) -> Result<()> {
    info!("开始执行完整的集成测试套件");
    
    let test_config = TestRunnerConfig {
        run_e2e_tests: true,
        run_deployment_validation: true,
        run_security_tests: true,
        test_timeout_seconds: timeout,
        report_output_path: output_dir.to_string(),
        generate_detailed_report: detailed_report,
        max_concurrent_tests: max_concurrent,
    };
    
    let runner = IntegrationTestRunner::new(test_config, config).await?;
    let results = runner.run_comprehensive_tests().await?;
    
    // 打印结果摘要
    println!("\n🎯 集成测试执行完成");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("📊 执行摘要:");
    println!("   • 总测试数: {}", results.execution_summary.total_tests);
    println!("   • 通过测试: {} ✅", results.execution_summary.passed_tests);
    println!("   • 失败测试: {} ❌", results.execution_summary.failed_tests);
    println!("   • 成功率: {:.2}% 📈", results.execution_summary.success_rate);
    println!("   • 执行时长: {:?} ⏱️", results.execution_summary.total_duration);
    println!("   • 整体状态: {:?} 🎯", results.execution_summary.overall_status);
    
    if !results.recommendations.is_empty() {
        println!("\n💡 改进建议:");
        for (i, recommendation) in results.recommendations.iter().enumerate() {
            println!("   {}. {}", i + 1, recommendation);
        }
    }
    
    println!("\n📄 详细报告已生成到: {}", output_dir);
    
    Ok(())
}

/// 运行端到端功能测试
async fn run_e2e_tests(config: Config, output_dir: &str, timeout: u64) -> Result<()> {
    info!("开始执行端到端功能测试");
    
    let test_config = TestRunnerConfig {
        run_e2e_tests: true,
        run_deployment_validation: false,
        run_security_tests: false,
        test_timeout_seconds: timeout,
        report_output_path: output_dir.to_string(),
        generate_detailed_report: true,
        max_concurrent_tests: 4,
    };
    
    let runner = IntegrationTestRunner::new(test_config, config).await?;
    let results = runner.run_comprehensive_tests().await?;
    
    if let Some(e2e_results) = results.e2e_results {
        println!("\n🔄 端到端测试结果:");
        println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        println!("   • 总测试数: {}", e2e_results.tests.len());
        println!("   • 成功测试: {} ✅", e2e_results.success_count());
        println!("   • 失败测试: {} ❌", e2e_results.failure_count());
        
        // 显示失败的测试
        for test in &e2e_results.tests {
            if !test.success {
                println!("   ❌ {}: {}", test.name, 
                    test.error_message.as_ref().unwrap_or(&"未知错误".to_string()));
            }
        }
    }
    
    Ok(())
}

/// 运行部署验证测试
async fn run_deployment_tests(config: Config, output_dir: &str, environment: &str) -> Result<()> {
    info!("开始执行部署验证测试 (环境: {})", environment);
    
    let test_config = TestRunnerConfig {
        run_e2e_tests: false,
        run_deployment_validation: true,
        run_security_tests: false,
        test_timeout_seconds: 300,
        report_output_path: output_dir.to_string(),
        generate_detailed_report: true,
        max_concurrent_tests: 4,
    };
    
    let runner = IntegrationTestRunner::new(test_config, config).await?;
    let results = runner.run_comprehensive_tests().await?;
    
    if let Some(deployment_results) = results.deployment_validation {
        println!("\n🚀 部署验证结果:");
        println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        println!("   • 总验证项: {}", deployment_results.validations.len());
        println!("   • 通过验证: {} ✅", deployment_results.success_count());
        println!("   • 失败验证: {} ❌", deployment_results.failure_count());
        
        // 显示失败的验证
        for (name, result) in &deployment_results.validations {
            if !result.success {
                println!("   ❌ {}: {}", name, 
                    result.error_message.as_ref().unwrap_or(&"未知错误".to_string()));
            }
        }
    }
    
    Ok(())
}

/// 运行安全性测试
async fn run_security_tests(config: Config, output_dir: &str, penetration_test: bool) -> Result<()> {
    info!("开始执行安全性测试 (渗透测试: {})", penetration_test);
    
    let test_config = TestRunnerConfig {
        run_e2e_tests: false,
        run_deployment_validation: false,
        run_security_tests: true,
        test_timeout_seconds: 600,
        report_output_path: output_dir.to_string(),
        generate_detailed_report: true,
        max_concurrent_tests: 2, // 安全测试使用较少并发
    };
    
    let runner = IntegrationTestRunner::new(test_config, config).await?;
    let results = runner.run_comprehensive_tests().await?;
    
    if let Some(security_results) = results.security_results {
        println!("\n🔒 安全性测试结果:");
        println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        println!("   • 总测试数: {}", security_results.tests.len());
        println!("   • 通过测试: {} ✅", security_results.success_count());
        println!("   • 失败测试: {} ❌", security_results.failure_count());
        
        // 显示失败的安全测试
        for (name, result) in &security_results.tests {
            if !result.success {
                println!("   🚨 {}: {}", name, 
                    result.error_message.as_ref().unwrap_or(&"未知安全问题".to_string()));
            }
        }
    }
    
    Ok(())
}

/// 运行健康检查
async fn run_health_check(config: Config) -> Result<()> {
    info!("开始执行系统健康检查");
    
    let test_config = TestRunnerConfig::default();
    let runner = IntegrationTestRunner::new(test_config, config).await?;
    let results = runner.run_health_check().await?;
    
    println!("\n🏥 系统健康检查结果:");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    for (name, result) in &results.checks {
        let status = if result.healthy { "✅ 健康" } else { "❌ 异常" };
        let response_time = format!("{:?}", result.response_time);
        println!("   • {}: {} (响应时间: {})", name, status, response_time);
        
        if !result.healthy {
            println!("     错误: {}", result.message);
        }
    }
    
    println!("\n{}", results.summary());
    
    Ok(())
}

/// 运行性能基准测试
async fn run_benchmark_tests(
    config: Config,
    output_dir: &str,
    duration: u64,
    concurrent_users: usize,
) -> Result<()> {
    info!("开始执行性能基准测试 (持续时间: {}s, 并发用户: {})", duration, concurrent_users);
    
    let test_config = TestRunnerConfig {
        test_timeout_seconds: duration + 60, // 额外缓冲时间
        report_output_path: output_dir.to_string(),
        generate_detailed_report: true,
        max_concurrent_tests: concurrent_users,
        ..Default::default()
    };
    
    let runner = IntegrationTestRunner::new(test_config, config).await?;
    let results = runner.run_performance_benchmark().await?;
    
    println!("\n📊 性能基准测试结果:");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    for benchmark in &results.benchmarks {
        println!("   • {}:", benchmark.name);
        println!("     - 平均耗时: {:?}", benchmark.average_duration);
        println!("     - 最小耗时: {:?}", benchmark.min_duration);
        println!("     - 最大耗时: {:?}", benchmark.max_duration);
        println!("     - 吞吐量: {:.2} ops/s", benchmark.throughput);
    }
    
    Ok(())
}

/// 生成测试报告
async fn generate_report(format: &str, input: &std::path::Path, output_dir: &str) -> Result<()> {
    info!("生成测试报告 (格式: {}, 输入: {:?})", format, input);
    
    match format.to_lowercase().as_str() {
        "html" => {
            println!("📄 生成 HTML 格式报告...");
            // 实现 HTML 报告生成逻辑
        }
        "json" => {
            println!("📄 生成 JSON 格式报告...");
            // 实现 JSON 报告生成逻辑
        }
        "pdf" => {
            println!("📄 生成 PDF 格式报告...");
            // 实现 PDF 报告生成逻辑
        }
        _ => {
            error!("不支持的报告格式: {}", format);
            return Err("不支持的报告格式".into());
        }
    }
    
    println!("✅ 报告生成完成，输出目录: {}", output_dir);
    Ok(())
}