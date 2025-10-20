use chrono::Local;
use config::{Config, File as ConfigFile};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::process::Command;
use tokio::sync::Mutex;
use uuid::Uuid;
use zip::ZipArchive;
use log::info;
use tokio::io::{AsyncBufReadExt, BufReader};
use crate::utils::utils::determine_log_level;
use rust_agent::McpTool;
use log::error;

const PICKER_DIR: &str = ".picker";
const TASK_SCHEMA_FILE: &str = "tasks.toml";
const CONFIG_FILE: &str = "config.toml";

// 任务概要，以字段数组的形式存在 用户主目录\.picker\tasks.toml 文件中，字段名为日期(年月日时分，如：202509181230)，值是 TaskSchema 结构体
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskSchema {
    pub task_id: String,
    pub entry_path: String,  // 任务运行的入口文件路径
    pub config_path: String, // 任务的配置文件路径
}

impl TaskSchema {
    // 从 tasks.toml 文件加载所有任务列表
    pub fn load_task_schemas() -> Vec<TaskSchema> {
        let mut task_schemas = Vec::new();
        let user_home = dirs::home_dir().unwrap_or(PathBuf::new());
        let task_schema_file = user_home.join(PICKER_DIR).join(TASK_SCHEMA_FILE);

        if task_schema_file.exists() {
            if let Ok(content) = fs::read_to_string(&task_schema_file) {
                if let Ok(parsed_tasks) = toml::from_str::<HashMap<String, TaskSchema>>(&content) {
                    task_schemas.extend(parsed_tasks.into_values());
                }
            }
        }

        task_schemas
    }
}

// 定义配置值枚举类型，支持多种数据类型
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(untagged)]
pub enum ConfigValue {
    String(String),
    Integer(i64),
    Float(f64),
    Boolean(bool),
    Array(Vec<ConfigValue>),
    Object(HashMap<String, ConfigValue>),
    Null,
}

// 环境配置, 以字段的形式存在 用户主目录\.picker\pickers\taskid\config.toml 文件中
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvConfig {
    pub environment: HashMap<String, ConfigValue>,
}

impl EnvConfig {
    // 从配置文件加载 EnvConfig，只处理 environment 字段
    pub fn from_file(path: &Path) -> Result<Self, String> {
        // 创建配置构建器
        let mut builder = Config::builder();

        // 仅当文件存在时才添加配置源
        if path.exists() {
            builder = builder.add_source(ConfigFile::from(path).required(false));
        }

        // 构建配置
        let config = builder
            .build()
            .map_err(|e| format!("Failed to load config file: {}", e))?;

        // 获取 environment 部分，如果不存在则使用空的 HashMap
        let environment = match config.get_table("environment") {
            Ok(table) => {
                // 将配置库的 Table 转换为我们的 HashMap<ConfigValue>
                let mut env_map = HashMap::with_capacity(table.len());
                for (key, value) in table {
                    env_map.insert(key, Self::convert_to_config_value(value)?);
                }
                env_map
            }
            Err(_) => HashMap::new(), // 设置默认值（空的 environment HashMap）
        };

        Ok(EnvConfig { environment })
    }

    // 将 config 库的值转换为我们的 ConfigValue 枚举
    fn convert_to_config_value(value: config::Value) -> Result<ConfigValue, String> {
        // 尝试获取字符串类型
        if let Ok(s) = value.clone().into_string() {
            return Ok(ConfigValue::String(s));
        }

        // 尝试获取整数类型
        if let Ok(i) = value.clone().into_int() {
            return Ok(ConfigValue::Integer(i));
        }

        // 尝试获取浮点数类型
        if let Ok(f) = value.clone().into_float() {
            return Ok(ConfigValue::Float(f));
        }

        // 尝试获取布尔类型
        if let Ok(b) = value.clone().into_bool() {
            return Ok(ConfigValue::Boolean(b));
        }

        // 尝试获取数组类型
        if let Ok(arr) = value.clone().into_array() {
            let mut result = Vec::new();
            for item in arr {
                result.push(Self::convert_to_config_value(item)?);
            }
            return Ok(ConfigValue::Array(result));
        }

        // 尝试获取对象/表类型
        if let Ok(table) = value.clone().into_table() {
            let mut result = HashMap::new();
            for (key, value) in table {
                result.insert(key, Self::convert_to_config_value(value)?);
            }
            return Ok(ConfigValue::Object(result));
        }

        // 如果以上类型都不匹配，返回 Null
        Ok(ConfigValue::Null)
    }

    // 添加辅助方法以方便获取特定类型的值
    pub fn get_string(&self, key: &str) -> Option<&String> {
        self.environment.get(key).and_then(|v| match v {
            ConfigValue::String(s) => Some(s),
            _ => None,
        })
    }

    pub fn get_int(&self, key: &str) -> Option<i64> {
        self.environment.get(key).and_then(|v| match v {
            ConfigValue::Integer(i) => Some(*i),
            ConfigValue::Float(f) => Some(*f as i64),
            _ => None,
        })
    }

    pub fn get_float(&self, key: &str) -> Option<f64> {
        self.environment.get(key).and_then(|v| match v {
            ConfigValue::Float(f) => Some(*f),
            ConfigValue::Integer(i) => Some(*i as f64),
            _ => None,
        })
    }

    pub fn get_bool(&self, key: &str) -> Option<bool> {
        self.environment.get(key).and_then(|v| match v {
            ConfigValue::Boolean(b) => Some(*b),
            _ => None,
        })
    }

    // 获取嵌套对象
    pub fn get_object(&self, key: &str) -> Option<&HashMap<String, ConfigValue>> {
        self.environment.get(key).and_then(|v| match v {
            ConfigValue::Object(map) => Some(map),
            _ => None,
        })
    }

    // 获取数组
    pub fn get_array(&self, key: &str) -> Option<&Vec<ConfigValue>> {
        self.environment.get(key).and_then(|v| match v {
            ConfigValue::Array(arr) => Some(arr),
            _ => None,
        })
    }

    // 获取嵌套的配置值
    pub fn get_nested(&self, keys: &[&str]) -> Option<&ConfigValue> {
        if keys.is_empty() {
            return None;
        }

        let mut current = self.get_object(keys[0])?;

        for i in 1..keys.len() - 1 {
            current = match current.get(keys[i]) {
                Some(ConfigValue::Object(map)) => map,
                _ => return None,
            };
        }

        current.get(keys[keys.len() - 1])
    }

    // 专门用于获取字符串数组的辅助方法
    pub fn get_array_of_strings(&self, keys: &[&str]) -> Option<Vec<String>> {
        let array_value = self.get_nested(keys)?;

        match array_value {
            ConfigValue::Array(arr) => {
                let mut result = Vec::new();
                for item in arr {
                    if let ConfigValue::String(s) = item {
                        result.push(s.clone());
                    } else {
                        // 如果数组中包含非字符串元素，返回 None
                        return None;
                    }
                }
                Some(result)
            }
            _ => None,
        }
    }
}

// 项目配置, 以字段的形式存在 用户主目录\.picker\pickers\taskid\config.toml 文件中
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectConfig {
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub email: String,
    pub license: String,
}

impl ProjectConfig {
    // 从配置文件加载ProjectConfig，只处理project字段
    pub fn from_file(path: &Path) -> Result<Self, String> {
        // 创建配置构建器
        let mut builder = Config::builder();

        // 仅当文件存在时才添加配置源
        if path.exists() {
            builder = builder.add_source(ConfigFile::from(path).required(false));
        }

        // 构建配置
        let config = builder
            .build()
            .map_err(|e| format!("Configuration loading failed: {}", e))?;

        // 尝试从project部分获取配置，如果不存在则提供默认值
        match config.get::<Self>("project") {
            Ok(project_config) => Ok(project_config),
            Err(_) => Ok(Self::default()), // 使用默认配置
        }
    }

    // 将ProjectConfig保存到文件中
    pub fn to_file(&self, path: &Path) -> Result<(), String> {
        // 读取现有配置文件
        let mut config_map = if path.exists() {
            if let Ok(content) = fs::read_to_string(path) {
                if let Ok(map) = toml::from_str::<HashMap<String, toml::Value>>(&content) {
                    map
                } else {
                    HashMap::new()
                }
            } else {
                HashMap::new()
            }
        } else {
            HashMap::new()
        };

        // 将ProjectConfig转换为toml::Value
        let project_toml =
            toml::to_string(&self).map_err(|e| format!("Serialization of project configuration failed: {}", e))?;

        let project_value =
            toml::from_str(&project_toml).map_err(|e| format!("Parsing of project configuration failed: {}", e))?;

        // 将项目配置放入"project"命名空间
        config_map.insert("project".to_string(), project_value);

        // 将完整配置写回文件，使用安全写入方法
        let toml_content =
            toml::to_string(&config_map).map_err(|e| format!("Serialization of configuration failed: {}", e))?;

        TaskConfig::safe_write_file(path, &toml_content)
    }
}

// 为ProjectConfig实现Default trait
impl Default for ProjectConfig {
    // 创建默认的ProjectConfig实例
    fn default() -> Self {
        ProjectConfig {
            name: "Unnamed Project".to_string(),
            version: "0.1.0".to_string(),
            description: "A Picker task project".to_string(),
            author: "Unknown".to_string(),
            email: "".to_string(),
            license: "MIT".to_string(),
        }
    }
}

// 任务状态枚举
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum TaskStatus {
    Running,
    Idle,
    Error,
}

impl TaskStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            TaskStatus::Running => "Running",
            TaskStatus::Idle => "Idle",
            TaskStatus::Error => "Error",
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskConfig {
    pub id: String, // 通常任务ID是必需的，可保留为必填
    pub name: Option<String>,
    pub status: Option<TaskStatus>,
    pub installed: Option<String>,
    pub runs: Option<u64>,
    pub last_run: Option<String>,
}

// 为TaskConfig添加From特性实现
impl From<TaskConfig> for McpTool {
    fn from(task_config: TaskConfig) -> Self {
        // 使用task_config的id作为McpTool的name
        let name = task_config.id;
        // 构建description，包含任务的名称和状态等信息
        let description = format!(
            "Run a local task using the specified ID. For example: 'Help me run the task with ID {}'. 
            The parameter request body you should extract is: '\"parameters\": {{ \"task_id\": \"{}\" }}'", name, name);
        
        McpTool {
            name,
            description,
        }
    }
}

impl TaskConfig {
    fn new() -> Self {
        TaskConfig {
            id: String::new(),
            name: None,
            status: None,
            installed: None,
            runs: None,
            last_run: None,
        }
    }

    // 实现一个基于临时文件的安全写入方法
    fn safe_write_file(file_path: &Path, content: &str) -> Result<(), String> {
        // 创建临时文件路径
        let temp_path = file_path.with_extension("tmp");

        // 写入临时文件
        fs::write(&temp_path, content).map_err(|e| format!("Writing temporary file failed: {}", e))?;

        // 原子性地重命名临时文件到目标文件
        fs::rename(&temp_path, file_path).map_err(|e| {
            // 如果重命名失败，尝试清理临时文件
            let _ = fs::remove_file(&temp_path);
            format!("Safe write to {} failed: {}", file_path.display(), e)
        })
    }

    // 修改 update_task_configs 方法，添加锁和安全写入
    pub fn update_task_configs(&self, task_updates: HashMap<String, Self>) {
        // 只加载一次任务概要
        let task_schemas = TaskSchema::load_task_schemas();

        // 创建任务ID到概要的映射，提高查找效率
        let schema_map: HashMap<&String, &TaskSchema> = task_schemas
            .iter()
            .map(|schema| (&schema.task_id, schema))
            .collect();

        // 处理部分字段更新
        for (task_id, update) in task_updates {
            // 查找任务概要
            if let Some(schema) = schema_map.get(&task_id) {
                let config_path = Path::new(&schema.config_path);

                // 读取完整的配置文件为HashMap，类似于setup_env的实现
                let mut config_map = if config_path.exists() {
                    if let Ok(content) = fs::read_to_string(config_path) {
                        if let Ok(map) = toml::from_str::<HashMap<String, toml::Value>>(&content) {
                            map
                        } else {
                            HashMap::new()
                        }
                    } else {
                        HashMap::new()
                    }
                } else {
                    HashMap::new()
                };

                // 处理TaskConfig部分的更新
                // 尝试获取现有的task配置部分
                let mut task_config_map =
                    if let Some(task_value) = config_map.get("task").and_then(|v| v.as_table()) {
                        task_value.clone()
                    } else {
                        toml::value::Table::new()
                    };

                // 应用更新
                if let Some(name) = update.name {
                    task_config_map.insert("name".to_string(), toml::Value::String(name));
                }
                if let Some(status) = update.status {
                    task_config_map.insert(
                        "status".to_string(),
                        toml::Value::String(status.as_str().to_string()),
                    );
                }

        //         // 直接将TaskConfig转换为toml格式
        // let task_toml =
        //     toml::to_string(&new_task).map_err(|e| format!("序列化任务配置失败: {}", e))?;

                if let Some(installed) = update.installed {
                    task_config_map.insert("installed".to_string(), toml::Value::String(installed));
                }
                if let Some(runs) = update.runs {
                    task_config_map.insert("runs".to_string(), toml::Value::Integer(runs as i64));
                }
                if let Some(last_run) = update.last_run {
                    task_config_map.insert("last_run".to_string(), toml::Value::String(last_run));
                }

                // 将更新后的task配置放回配置map
                config_map.insert("task".to_string(), toml::Value::Table(task_config_map));

                // 将完整配置写回文件
                if let Ok(toml_content) = toml::to_string(&config_map) {
                    if let Err(e) = Self::safe_write_file(config_path, &toml_content) {
                        error!("Safe write to {} failed: {}", config_path.display(), e);
                    }
                }
            }
        }
    }

    // 读取 tasks.toml 文件，并检查 entry_path 与 config_path 是否存在，获取所有任务列表
    pub fn load_tasks(&self, task_schemas: &Vec<TaskSchema>) -> Vec<Self> {
        let mut tasks = Vec::new();
        // if task_schema_file.exists() {
        //     if let Ok(content) = fs::read_to_string(&task_schema_file) {
        //         if let Ok(task_schemas) = toml::from_str::<HashMap<String, TaskSchema>>(&content) {
                    for schema in task_schemas {
                        // 检查入口文件和配置文件是否存在
                        let entry_path = Path::new(&schema.entry_path);
                        let config_path = Path::new(&schema.config_path);
                        if entry_path.exists() && config_path.exists() {
                            // 从配置文件加载任务配置 - 修改这部分代码
                            if let Ok(config) = fs::read_to_string(config_path) {
                                // 先将配置解析为HashMap
                                if let Ok(config_map) = toml::from_str::<HashMap<String, toml::Value>>(&config) {
                                    // 然后从"task"命名空间获取任务配置
                                    if let Some(task_value) = config_map.get("task") {
                                        if let Ok(task_config_str) = toml::to_string_pretty(task_value) {
                                            if let Ok(task_config) = toml::from_str::<TaskConfig>(&task_config_str) {
                                                // 检查任务是否正在运行
                                                // task_config.id = schema.task_id.clone();
                                                tasks.push(task_config);
                                            }
                                        } else {
                                            info!("load_tasks task_id: {:?} task_config_str parse failed", schema.task_id);
                                        }
                                    } else {
                                        info!("load_tasks task_id: {:?} task_value not exists", schema.task_id);
                                    }
                                } else {
                                    info!("load_tasks task_id: {:?} config_map parse failed", schema.task_id);
                                }
                            } else {
                                info!("load_tasks task_id: {:?} config_path read failed", schema.task_id);
                            }
                        } else {
                            info!("load_tasks task_id: {:?} entry_path or config_path not exists", schema.task_id);
                        }
                    }

        tasks
    }

    // 从配置文件加载TaskConfig，只获取task命名空间
    pub fn get_single_task(path: &Path) -> Result<Self, String> {
        // 创建配置构建器
        let mut builder = Config::builder();

        // 仅当文件存在时才添加配置源
        if path.exists() {
            builder = builder.add_source(ConfigFile::from(path).required(false));
        }

        // 构建配置
        let config = builder
            .build()
            .map_err(|e| format!("Loading of configuration failed: {}", e))?;

        // 尝试从task部分获取配置，如果不存在则返回错误
        match config.get::<Self>("task") {
            Ok(task_config) => Ok(task_config),
            Err(e) => Err(format!("Getting of task configuration failed: {}", e)),
        }
    }

    // 为单个任务创建更新
    pub fn update_single_task(&self, task_id: String, update: TaskConfig) -> Result<(), String> {
        let mut task_updates = HashMap::new();
        task_updates.insert(task_id, update);
        self.update_task_configs(task_updates);

        Ok(())
    }
}

// 增加路径安全检查
fn safe_path(path: &Path, base_dir: &Path) -> Result<PathBuf, String> {
    // 获取绝对路径，捕获更详细的错误
    let absolute_path = fs::canonicalize(path)
        .map_err(|e| format!("Canonicalization of path '{}' failed: {}", path.display(), e))?;

    // 确保基础目录也是绝对路径
    let base_dir_absolute =
        fs::canonicalize(base_dir).map_err(|e| format!("Canonicalization of base directory '{}' failed: {}", base_dir.display(), e))?;

    // 检查路径是否在基础目录内
    if !absolute_path.starts_with(&base_dir_absolute) {
        return Err(format!(
            "Security check failed: Path '{}' is not within the allowed directory '{}'",
            absolute_path.display(),
            base_dir_absolute.display()
        ));
    }

    // 额外检查：确保没有通过符号链接等方式绕过限制
    let mut current = absolute_path.clone();
    while let Some(parent) = current.parent() {
        if parent == base_dir_absolute {
            break;
        }
        
        if let Ok(metadata) = parent.symlink_metadata() {
            if metadata.file_type().is_symlink() {
                return Err(format!(
                    "Security check failed: Path '{}' contains a symlink '{}'",
                    absolute_path.display(),
                    parent.display()
                ));
            }
        }
        
        current = parent.to_path_buf();
    }

    Ok(absolute_path)
}

// 运行中的任务管理
#[derive(Debug)]
pub struct RunningTasks {
    tasks: Mutex<HashMap<String, tokio::process::Child>>,
}

impl RunningTasks {
    fn new() -> Self {
        Self {
            tasks: Mutex::new(HashMap::new()),
        }
    }

    async fn add(&self, task_id: String, child: tokio::process::Child, app_handle: &AppHandle) -> Result<(), String> {
        let mut tasks = self.tasks.lock().await;
        tasks.insert(task_id.clone(), child);

        // 发送任务状态变更事件给前端
        app_handle.emit(
            "task_status_changed",
            format!("Task {} started", task_id)
        ).map_err(|e| format!("Sending of task status changed event failed: {}", e))?;
        Ok(())
    }

    async fn remove(&self, task_id: &str, app_handle: &AppHandle) -> Result<Option<tokio::process::Child>, String> {
        let mut tasks = self.tasks.lock().await;
        let result = tasks.remove(task_id);

        // 只有当任务确实存在并被移除时才发送事件
        if result.is_some() {
            app_handle.emit(
                "task_status_changed",
                format!("Task {} stopped", task_id)
            ).map_err(|e| format!("Sending of task status changed event failed: {}", e))?;
        }
        Ok(result)
    }

    async fn is_running(&self, task_id: &str) -> Result<bool, String> {
        let tasks = self.tasks.lock().await;
        Ok(tasks.contains_key(task_id))
    }
}

// 任务管理器结构体
#[derive(Debug)]
pub struct TaskManager {
    task_config: Arc<Mutex<TaskConfig>>,
    running_tasks: Arc<RunningTasks>,
    scan_directory: PathBuf,
}

impl TaskManager {
    fn new() -> Self {
        let user_home = dirs::home_dir().unwrap_or(PathBuf::new());
        // C:\Users\aiqubit\.picker\pickers
        let scan_directory = user_home.join(PICKER_DIR).join("pickers");

        // 确保扫描目录存在
        if !scan_directory.exists() {
            if let Err(e) = fs::create_dir_all(&scan_directory) {
                error!("Failed to create scan directory '{}': {:?}", scan_directory.display(), e);
            }
        }

        Self {
            task_config: Arc::new(Mutex::new(TaskConfig::new())),
            running_tasks: Arc::new(RunningTasks::new()),
            scan_directory,
        }
    }

    // 获取当前任务的 TaskSchema 信息
    fn get_task_schema(&self, task_id: &str) -> Result<TaskSchema, String> {
        let task_schemas = TaskSchema::load_task_schemas();
        if let Some(schema) = task_schemas.into_iter().find(|s| s.task_id == task_id) {
            Ok(schema)
        } else {
            Err(format!("Task schema for '{}' not found", task_id))
        }
    }

    // 获取当前任务的 TaskConfig 信息
    fn get_task_config(&self, task_id: &str) -> Result<TaskConfig, String> {
        // 通过路径和task_id直接查找 task config, 不要通过get_all_task load_tasks 获取
        let task_schema = self.get_task_schema(task_id)?;
        let task_config_path = Path::new(&task_schema.config_path);
        // 使用config 读取 task_schema.config_path 中 task命名空间
        let task_config = TaskConfig::get_single_task(task_config_path)?;

        Ok(task_config)
    }

    // 获取当前任务的 ProjectConfig 信息
    fn get_project_config(&self, task_id: &str) -> Result<ProjectConfig, String> {
        let task_schema = self.get_task_schema(task_id)?;
        let project_config = ProjectConfig::from_file(&Path::new(&task_schema.config_path))?;
        Ok(project_config)
    }

    // 获取当前任务的 EnvConfig 信息
    fn get_env_config(&self, task_id: &str) -> Result<EnvConfig, String> {
        // 首先获取任务的 TaskSchema，其中包含配置文件路径
        let task_schema = self.get_task_schema(task_id)?;

        // 使用 EnvConfig::from_file 方法从配置文件加载 environment 配置
        let env_config = EnvConfig::from_file(&Path::new(&task_schema.config_path))?;

        // 返回加载的配置（不需要再克隆互斥锁中的值）
        Ok(env_config)
    }

    // 获取任务运行目录
    fn get_task_dir(&self, task_id: Option<&str>) -> Result<PathBuf, String> {
        let mut task_dir = self.scan_directory.clone();

        if let Some(task_id) = task_id {
            task_dir.push(task_id);
        }

        Ok(task_dir)
    }

    // 扫描 tasks.toml 文件发现所有任务，返回有效任务列表
    pub async fn get_all_tasks(&self, app_handle: &AppHandle) -> Result<Vec<TaskConfig>, String> {
        // 先克隆任务配置，然后在锁外调用 load_tasks
        let task_config = self.task_config.lock().await.clone();
        let tasks = task_config.load_tasks(&TaskSchema::load_task_schemas());
        // 从 running_tasks 中移除所有状态为非Running 的task 
        for task in &tasks {
            if task.status != Some(TaskStatus::Running) && self.running_tasks.is_running(&task.id).await? {
                self.running_tasks.remove(&task.id, app_handle).await?;
            }
        }
        Ok(tasks)
    }

    // 运行任务
    async fn run_task(&self, task_id: &str, app_handle: &AppHandle) -> Result<(), String> {
        let task_schema = self.get_task_schema(task_id)?;
        // 调用 TaskConfig 的 get_single_task 方法，进行 task_id 查找，找到后进行校验
        let task_config = self.get_task_config(task_id)?;

        // 检查任务是否已经在运行
        if self.running_tasks.is_running(task_id).await? {
            return Err(format!("Task '{}' is already running", task_id));
        }

        // 获取任务入口文件路径
        let file_path = Path::new(&task_schema.entry_path);
        if !file_path.exists() {
            return Err(format!("Entry file for task '{}' does not exist", task_id));
        }
                // 定义一个在Windows平台上配置命令的函数，使用CREATE_NO_WINDOW标志避免显示控制台窗口
        #[cfg(target_os = "windows")]
        fn configure_windows_command(command: &mut Command) {
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW 标志，避免显示控制台窗口
        }

        // 根据文件类型执行不同的命令
        let mut child = if cfg!(target_os = "windows") {
            if let Some(ext) = file_path.extension().and_then(OsStr::to_str) {
                match ext.to_lowercase().as_str() {
                    "exe" | "ps1" => {
                        #[cfg(target_os = "windows")]
                        {
                            let mut command = Command::new(file_path);
                            configure_windows_command(&mut command);
                            command
                                .stdout(Stdio::piped())
                                .stderr(Stdio::piped())
                                .spawn()
                                .map_err(|e| e.to_string())?
                        }
                        #[cfg(not(target_os = "windows"))]
                        {
                            let mut command = Command::new(file_path);
                            command
                                .stdout(Stdio::piped())
                                .stderr(Stdio::piped())
                                .spawn()
                                .map_err(|e| e.to_string())?
                        }
                    },
                    "bat" | "cmd" => {
                        #[cfg(target_os = "windows")]
                        {
                            let mut command = Command::new("cmd");
                            command.arg("/c").arg(file_path);
                            configure_windows_command(&mut command);
                            command
                                .stdout(Stdio::piped())
                                .stderr(Stdio::piped())
                                .spawn()
                                .map_err(|e| e.to_string())?
                        }
                        #[cfg(not(target_os = "windows"))]
                        {
                            // let command = Command::new("cmd").arg("/c").arg(file_path);
                            let mut command = {
                                let mut cmd = Command::new("cmd");
                                cmd.arg("/c").arg(file_path);
                                cmd
                            };
                            command
                                .stdout(Stdio::piped())
                                .stderr(Stdio::piped())
                                .spawn()
                                .map_err(|e| e.to_string())?
                        }
                    },
                    "js" => {
                        #[cfg(target_os = "windows")]
                        {
                            let mut command = Command::new("node");
                            command.arg(file_path);
                            configure_windows_command(&mut command);
                            command
                                .stdout(Stdio::piped())
                                .stderr(Stdio::piped())
                                .spawn()
                                .map_err(|e| e.to_string())?
                        }
                        #[cfg(not(target_os = "windows"))]
                        {
                            let mut command = Command::new("node");
                            command.arg(file_path);
                            command
                                .stdout(Stdio::piped())
                                .stderr(Stdio::piped())
                                .spawn()
                                .map_err(|e| e.to_string())?
                        }
                    },
                    "py" => {
                        #[cfg(target_os = "windows")]
                        {
                            let mut command = Command::new("python");
                            command.arg(file_path);
                            configure_windows_command(&mut command);
                            command
                                .stdout(Stdio::piped())
                                .stderr(Stdio::piped())
                                .spawn()
                                .map_err(|e| e.to_string())?
                        }
                        #[cfg(not(target_os = "windows"))]
                        {
                            let mut command = Command::new("python");
                            command.arg(file_path);
                            command
                                .stdout(Stdio::piped())
                                .stderr(Stdio::piped())
                                .spawn()
                                .map_err(|e| e.to_string())?
                        }
                    },
                    _ => {
                        return Err(format!("Unsupported file type '{}' for task '{}'", ext, task_id));
                    }
                }
            } else {
                return Err(format!("Could not determine file type for task '{}'", task_id));
            }
        } else {
            // Unix-like systems
            if let Some(ext) = file_path.extension().and_then(OsStr::to_str) {
                match ext.to_lowercase().as_str() {
                    "js" => {
                        let mut command = Command::new("node");
                        command.arg(file_path)
                            .stdout(Stdio::piped())
                            .stderr(Stdio::piped())
                            .spawn()
                            .map_err(|e| e.to_string())?
                    },
                    "py" => {
                        let mut command = Command::new("python3");
                        command.arg(file_path)
                            .stdout(Stdio::piped())
                            .stderr(Stdio::piped())
                            .spawn()
                            .map_err(|e| e.to_string())?
                    },
                    "sh" => {
                        let mut command = Command::new("bash");
                        command.arg(file_path)
                            .stdout(Stdio::piped())
                            .stderr(Stdio::piped())
                            .spawn()
                            .map_err(|e| e.to_string())?
                    },
                    _ => {
                        // 尝试直接执行（需要可执行权限）
                        let mut command = Command::new(file_path);
                        command.stdout(Stdio::piped())
                            .stderr(Stdio::piped())
                            .spawn()
                            .map_err(|e| e.to_string())?
                    }
                }
            } else {
                // 尝试直接执行（需要可执行权限）
                let mut command = Command::new(file_path);
                command.stdout(Stdio::piped())
                    .stderr(Stdio::piped())
                    .spawn()
                    .map_err(|e| e.to_string())?
            }
        };

        // 处理任务输出并发送到前端
        let task_id_clone_stdout = task_id.to_string();
        let task_id_clone_stderr = task_id.to_string();
        let app_handle_clone_stdout = app_handle.clone();
        let app_handle_clone_stderr = app_handle.clone();

        // 获取stdout和stderr流
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        // 处理stdout
        if let Some(stdout) = stdout {
            tokio::spawn(async move {
                let reader = BufReader::new(stdout);
                let mut lines = reader.lines();
                while let Some(line) = lines.next_line().await.unwrap() {
                    // 智能判断日志级别
                    let log_type = determine_log_level(&line);

                    // 发送标准输出日志事件到前端
                    let _ = app_handle_clone_stdout.emit(
                        "task_log",
                        &serde_json::json!(
                            {
                                "task_id": task_id_clone_stdout,
                                "type": log_type,
                                "message": line
                            }
                        )
                    );
                }
            });
        }

        // 处理stderr
        if let Some(stderr) = stderr {
            tokio::spawn(async move {
                let reader = BufReader::new(stderr);
                let mut lines = reader.lines();
                
                while let Some(line) = lines.next_line().await.unwrap() {
                    // 智能判断日志级别
                    let log_type = determine_log_level(&line);

                    // 发送错误输出日志事件到前端
                    let _ = app_handle_clone_stderr.emit(
                        "task_log",
                        &serde_json::json!(
                            {
                                "task_id": task_id_clone_stderr,
                                "type": log_type,
                                "message": line
                            }
                        )
                    );
                }
            });
        }

        // 记录运行中的任务
        self.running_tasks.add(task_id.to_string(), child, app_handle).await?;

        // 创建任务更新
        let mut update = TaskConfig::new();
        update.id = task_id.to_string();
        // update.status = Some(TaskStatus::Running);
        update.runs = task_config.runs.map(|r| r + 1);
        update.last_run = Some(Local::now().format("%Y%m%d%H%M").to_string());

        // 使用部分更新方法
        self.task_config
            .lock()
            .await
            .update_single_task(task_id.to_string(), update.clone())?;
        
        Ok(())
    }

    // 停止任务
    async fn stop_task(&self, task_id: &str, app_handle: &AppHandle) -> Result<(), String> {
        // 尝试从运行中的任务中移除并终止进程
        if let Some(mut child) = self.running_tasks.remove(task_id, app_handle).await? {
            if let Err(e) = child.kill().await {
                return Err(format!("Failed to kill task '{}': {}", task_id, e));
            }
        }
        
        // 无论任务是否在运行，都更新状态为Idle
        let mut update = TaskConfig::new();
        update.id = task_id.to_string();
        update.status = Some(TaskStatus::Idle);

        // 使用部分更新
        self.task_config
            .lock()
            .await
            .update_single_task(task_id.to_string(), update)?;
        
        Ok(())
    }

    // 创建任务
    fn create_task(&self, name: &str, picker_path: &str) -> Result<TaskConfig, String> {
        let path = Path::new(picker_path);

        // 安全检查路径
        // let safe_path = safe_path(path, &self.scan_directory)?;

        if !path.exists() || !path.is_file() {
            return Err(format!("Entry file '{}' does not exist", picker_path));
        }

        let task_id = Uuid::new_v4().to_string();

        // picker_path 是 .zip 结尾的压缩文件，需要解压到 task_directory(scan_directory/task_id/) 目录下
        let task_directory = self.get_task_dir(Some(&task_id))?;
        // 解压压缩文件
        if let Some(ext) = path.extension().and_then(OsStr::to_str) {
            if ext == "zip" {
                // 创建目标目录
                if !task_directory.exists() {
                    fs::create_dir_all(&task_directory)
                        .map_err(|e| format!("Failed to create directory '{}': {}", task_directory.display(), e))?;
                }

                // 打开zip文件
                let file = fs::File::open(path).map_err(|e| format!("Failed to open zip file '{}': {}", path.display(), e))?;
                // 解压文件
                let mut archive =
                    ZipArchive::new(file).map_err(|e| format!("Failed to parse zip file '{}': {}", path.display(), e))?;

                for i in 0..archive.len() {
                    let mut file = archive
                        .by_index(i)
                        .map_err(|e| format!("Failed to read file from zip '{}': {}", path.display(), e))?;
                    let outpath = match file.enclosed_name() {
                        Some(path) => task_directory.join(path),
                        None => continue,
                    };

                    if file.name().ends_with('/') {
                        // 创建目录
                        fs::create_dir_all(&outpath)
                            .map_err(|e| format!("Failed to create directory '{}': {}", outpath.display(), e))?;
                    } else {
                        // 确保父目录存在
                        if let Some(parent) = outpath.parent() {
                            if !parent.exists() {
                                fs::create_dir_all(parent)
                                    .map_err(|e| format!("Failed to create parent directory '{}': {}", parent.display(), e))?;
                            }
                        }

                        // 写入文件
                        let mut outfile = fs::File::create(&outpath)
                            .map_err(|e| format!("Failed to create output file '{}': {}", outpath.display(), e))?;
                        std::io::copy(&mut file, &mut outfile)
                            .map_err(|e| format!("Failed to write file content to '{}': {}", outpath.display(), e))?;
                    }
                }
            } else {
                return Err(format!("Unsupported file type: {}", ext));
            }
        } else {
            return Err("Failed to determine file type".to_string());
        }

        // 根据不同的程序文件判断，搜索已经解压文件中的入口文件
        let entry_file_path = self.find_entry_file(&task_directory)?;
        let absolute_entry = task_directory.join(entry_file_path);
        let absolute_entry_str = absolute_entry.to_string_lossy().to_string();

        // config file path 与 entry file path 在同级目录，但是config file名称为 config.toml
        let entry_dir = if let Some(parent) = absolute_entry.parent() {
            parent.to_path_buf()
        } else {
            return Err("Failed to determine entry file directory".to_string());
        };
        // 在同一目录下判断如果没有 config.toml 文件则创建，如果有则直接使用
        let config_file_path = entry_dir.join(CONFIG_FILE);
        let config_file_path_str = config_file_path.to_string_lossy().to_string();
        let installed_time = Local::now().format("%Y%m%d%H%M%S").to_string();

        let mut new_task = TaskConfig::new();
        new_task.id = task_id;
        new_task.name = Some(name.to_string());
        new_task.status = Some(TaskStatus::Idle);
        new_task.installed = Some(installed_time.clone());
        new_task.runs = Some(0);
        new_task.last_run = Some("".to_string());

        // 保存新任务配置到 config.toml - 使用安全方式
        // 1. 读取完整配置文件
        let mut config_map = if config_file_path.exists() {
            if let Ok(content) = fs::read_to_string(&config_file_path) {
                if let Ok(map) = toml::from_str::<HashMap<String, toml::Value>>(&content) {
                    map
                } else {
                    HashMap::new()
                }
            } else {
                HashMap::new()
            }
        } else {
            HashMap::new()
        };

        // 直接将TaskConfig转换为toml格式
        let task_toml =
            toml::to_string(&new_task).map_err(|e| format!("Failed to serialize task config: {}", e))?;

        // 解析任务配置为toml::Value
        let task_value =
            toml::from_str(&task_toml).map_err(|e| format!("Failed to parse task config: {}", e))?;

        // 将任务配置放入"task"命名空间
        config_map.insert("task".to_string(), task_value);
        // 将完整配置写回文件，使用safe_write_file
        let toml_content =
            toml::to_string(&config_map).map_err(|e| format!("Failed to serialize config: {}", e))?;
        TaskConfig::safe_write_file(&config_file_path, &toml_content)?;

        // 保存任务概要到 tasks.toml
        let user_home = dirs::home_dir().unwrap_or(PathBuf::new());
        let tasks_file = user_home.join(PICKER_DIR).join(TASK_SCHEMA_FILE);

        // 加载现有任务概要
        let mut task_schemas = HashMap::new();
        if tasks_file.exists() {
            if let Ok(content) = fs::read_to_string(&tasks_file) {
                if let Ok(existing_schemas) =
                    toml::from_str::<HashMap<String, TaskSchema>>(&content)
                {
                    task_schemas.extend(existing_schemas);
                }
            }
        }

        // 添加新任务概要
        task_schemas.insert(
            installed_time,
            TaskSchema {
                task_id: new_task.id.clone(),
                entry_path: absolute_entry_str,
                config_path: config_file_path_str,
            },
        );

        // 保存更新后的任务概要
        if let Ok(schemas_content) = toml::to_string(&task_schemas) {
            TaskConfig::safe_write_file(&tasks_file, &schemas_content)?;
        }

        Ok(new_task)
    }

    // 在解压目录中寻找入口文件
    fn find_entry_file(&self, directory: &Path) -> Result<PathBuf, String> {
        // 支持的入口文件类型和对应的文件名
        let entry_files = ["entry.py", "entry.js", "entry.ps1", "entry.sh"];
        // 检查当前目录下的所有文件和子目录
        if let Ok(entries) = fs::read_dir(directory) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                // 检查是否是文件且文件名匹配入口文件列表
                if path.is_file() {
                    if let Some(file_name) = path.file_name().and_then(OsStr::to_str) {
                        if entry_files.contains(&file_name) {
                            return Ok(path);
                        }
                    }
                }
                // 如果是目录，递归搜索
                else if path.is_dir() {
                    if let Ok(found_path) = self.find_entry_file(&path) {
                        return Ok(found_path);
                    }
                }
            }
        }

        // 如果没有找到任何入口文件
        Err("Failed to find valid entry file in unpacked directory".to_string())
    }

    // 删除任务
    async fn delete_task(&self, task_id: &str, delete_file: bool, app_handle: &AppHandle) -> Result<(), String> {
        let tasks = self.get_all_tasks(app_handle).await.map_err(|e| format!("Failed to get task list: {}", e))?;

        if let Some(task) = tasks.iter().find(|t| t.id == task_id) {
            // 如果任务正在运行，先停止它
            if self.running_tasks.is_running(&task.id).await? {
                self.stop_task(&task.id, app_handle).await?;
            }

            // 删除物理代码文件夹（如果请求）
            if !delete_file {
                let task_dir = self.get_task_dir(Some(task_id))?;
                if let Err(e) = fs::remove_dir_all(task_dir) {
                    return Err(format!("Failed to delete task directory: {}", e));
                }
            }

            // 从tasks.toml中删除任务
            let user_home = dirs::home_dir().unwrap_or(PathBuf::new());
            let tasks_file = user_home.join(PICKER_DIR).join(TASK_SCHEMA_FILE);

            if tasks_file.exists() {
                if let Ok(content) = fs::read_to_string(&tasks_file) {
                    if let Ok(mut task_schemas) =
                        toml::from_str::<HashMap<String, TaskSchema>>(&content)
                    {
                        // 过滤掉要删除的任务
                        task_schemas.retain(|_, schema| schema.task_id != task_id);

                        // 保存更新后的任务列表
                        if let Ok(updated_content) = toml::to_string(&task_schemas) {
                            fs::write(&tasks_file, updated_content)
                                .map_err(|e| format!("Failed to write updated task list: {}", e))?;
                        }
                    }
                }
            }

            Ok(())
        } else {
            Err("Failed to find specified task".to_string())
        }
    }
}
// 全局任务管理器实例
lazy_static! {
    static ref TASK_MANAGER: Arc<TaskManager> = Arc::new(TaskManager::new());
}

// 配置环境变量，此处调用 TaskManager EnvConfig 的方法的实现
impl TaskManager {
    fn setup_env_impl(
        &self,
        task_id: &str,
        env_map: HashMap<String, String>,
    ) -> Result<(), String> {
        // 获取任务目录
        let task_dir = self.get_task_dir(Some(task_id))?;
        let config_path = task_dir.join(CONFIG_FILE);

        // 读取完整的配置文件
        let mut config_map = if config_path.exists() {
            if let Ok(content) = fs::read_to_string(&config_path) {
                if let Ok(map) = toml::from_str::<HashMap<String, toml::Value>>(&content) {
                    map
                } else {
                    HashMap::new()
                }
            } else {
                HashMap::new()
            }
        } else {
            HashMap::new()
        };

        // 获取或创建environment部分
        let mut env_toml_map =
            if let Some(env_value) = config_map.get("environment").and_then(|v| v.as_table()) {
                env_value.clone()
            } else {
                toml::value::Table::new()
            };

        // 更新环境变量
        for (key, value) in env_map.iter() {
            env_toml_map.insert(key.clone(), toml::Value::String(value.clone()));
        }

        // 将更新后的environment放回配置map
        config_map.insert("environment".to_string(), toml::Value::Table(env_toml_map));

        // 将完整配置写回文件
        let toml_content =
            toml::to_string(&config_map).map_err(|e| format!("Failed to serialize config: {}", e))?;

        // 使用安全的写入方法
        TaskConfig::safe_write_file(&config_path, &toml_content)?;

        Ok(())
    }
}

// Tauri命令实现
#[tauri::command]
pub async fn setup_env(
    app_handle: AppHandle,
    task_id: String,
    env_config: EnvConfig,
) -> Result<TaskConfig, String> {
    // 1. 将EnvConfig转换为HashMap<String, String>
    let mut env_map = HashMap::new();

    for (key, value) in env_config.environment.iter() {
        // ConfigValue转换,保留更多类型信息
        let string_value = match value {
            ConfigValue::String(s) => format!("string: {}", s),
            ConfigValue::Integer(i) => format!("int: {}", i),
            ConfigValue::Float(f) => format!("float: {}", f),
            ConfigValue::Boolean(b) => format!("bool: {}", b),
            ConfigValue::Null => "null".to_string(),
            ConfigValue::Array(arr) => {
                let elements: Vec<String> = arr.iter().map(|v| format!("{:?}", v)).collect();
                format!("array: [{}]", elements.join(", "))
            }
            ConfigValue::Object(obj) => {
                let pairs: Vec<String> =
                    obj.iter().map(|(k, v)| format!("{}={:?}", k, v)).collect();
                format!("object: {{{}}}", pairs.join(", "))
            }
        };

        env_map.insert(key.clone(), string_value);
    }

    // 2. 调用setup_env_impl方法设置环境变量
    TASK_MANAGER.setup_env_impl(&task_id, env_map)?;

    // 3. 获取并返回更新后的任务配置
    let tasks = TASK_MANAGER.get_all_tasks(&app_handle).await.map_err(|e| format!("Failed to get task list: {}", e))?;
    if let Some(task) = tasks.into_iter().find(|t| t.id == task_id) {
        Ok(task)
    } else {
        Err("Failed to find specified task".to_string())
    }
}

#[tauri::command]
pub async fn get_task_config(
    _app_handle: AppHandle,
    task_id: String,
) -> Result<TaskConfig, String> {
    TASK_MANAGER.get_task_config(&task_id)
}

#[tauri::command]
pub async fn get_env_config(_app_handle: AppHandle, task_id: String) -> Result<EnvConfig, String> {
    TASK_MANAGER.get_env_config(&task_id)
}

#[tauri::command]
pub async fn get_project_config(
    _app_handle: AppHandle,
    task_id: String,
) -> Result<ProjectConfig, String> {
    TASK_MANAGER.get_project_config(&task_id)
}

#[tauri::command]
pub fn get_task_schema(_app_handle: AppHandle, task_id: String) -> Result<TaskSchema, String> {
    TASK_MANAGER.get_task_schema(&task_id)
}

#[tauri::command]
pub async fn list_tasks(app_handle: AppHandle) -> Result<Vec<TaskConfig>, String> {
    Ok(TASK_MANAGER.get_all_tasks(&app_handle).await.map_err(|e| format!("Failed to get task list: {}", e))?)
}

#[tauri::command]
pub fn create_task(
    _app_handle: AppHandle,
    name: String,
    picker_path: String,
) -> Result<TaskConfig, String> {
    TASK_MANAGER.create_task(&name, &picker_path)
}

#[tauri::command]
pub async fn run_task(app_handle: AppHandle, task_id: String) -> Result<(), String> {
    TASK_MANAGER.run_task(&task_id, &app_handle).await
}

#[tauri::command]
pub async fn stop_task(app_handle: AppHandle, task_id: String) -> Result<(), String> {
    TASK_MANAGER.stop_task(&task_id, &app_handle).await
}

#[tauri::command]
pub async fn delete_task(
    app_handle: AppHandle,
    task_id: String,
    delete_file: bool,
) -> Result<(), String> {
    TASK_MANAGER.delete_task(&task_id, delete_file, &app_handle).await
}
