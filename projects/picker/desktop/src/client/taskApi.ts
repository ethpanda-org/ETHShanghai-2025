import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
// 确保正确导入Tauri API

// 数据类型定义
export interface TaskConfig {
  // 任务配置的具体字段，根据后端实现定义
  id: string;
  name: string;
  status?: 'Idle' | 'Running' | 'Error';
  installed: string;
  runs: number;
  last_run: string;
}

export type ConfigValue =
  | { type: 'string'; value: string }
  | { type: 'integer'; value: number }
  | { type: 'float'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'null' }
  | { type: 'array'; value: ConfigValue[] }
  | { type: 'object'; value: Record<string, ConfigValue> };

export interface EnvConfig {
  environment: Map<string, ConfigValue>;
}

// 日志类型定义 'error' | 'warn' | 'info'
export type LogLevel = 'error' | 'warn' | 'info';

export interface TaskLog {
  task_id: string;
  type: LogLevel;
  message: string;
  timestamp: number;
}

export interface ProjectConfig {
    name: string,
    version: string,
    description: string,
    author: string,
    email: string,
    license: string,
}

export interface TaskSchema {
    task_id: string,
    entry_path: string,  // 任务运行的入口文件路径
    config_path: string, // 任务的配置文件路径
}

// 模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 任务 API 服务类
class TaskAPIService {
  private logListeners: Map<string, (log: TaskLog) => void> = new Map();
  private statusListeners: Set<(tasks: TaskConfig[]) => void> = new Set();
  private isListening: boolean = false;
  private isStatusListening: boolean = false;
  private lastTasksCache: TaskConfig[] = [];

  // 初始化日志监听
  private async initializeLogListener(): Promise<void> {
    if (this.isListening) return;
    
    this.isListening = true;
    
    try {
      await listen('task_log', (event) => {
        const logData = event.payload as { task_id: string; type: LogLevel; message: string };
        const log: TaskLog = {
          ...logData,
          timestamp: Date.now()
        };
        
        // 通知所有监听器
        this.logListeners.forEach(listener => {
          try {
            listener(log);
          } catch (error) {
            console.error('Error in log listener:', error);
          }
        });
      });
    } catch (error) {
      console.error('Failed to initialize log listener:', error);
      this.isListening = false;
    }
  }

  // 注册日志监听器
  async addLogListener(taskId: string, listener: (log: TaskLog) => void): Promise<void> {
    await this.initializeLogListener();
    this.logListeners.set(taskId, listener);
  }

  // 移除日志监听器
  removeLogListener(taskId: string): void {
    this.logListeners.delete(taskId);
  }

  // 初始化状态监听
  private async initializeStatusListener(): Promise<void> {
    if (this.isStatusListening) return;
    
    this.isStatusListening = true;

    try {
      // 尝试监听后端事件
      await listen('task_status_changed', async (event) => {
        console.log('TaskAPI: Received task_status_changed event:', event.payload);
        console.log('TaskAPI: Current listeners count:', this.statusListeners.size);
        await this.listTasks();
      });
    } catch (error) {
      console.error('Failed to initialize event listener:', error);
    }
  }

  // 注册状态监听器
  async addStatusListener(listener: (tasks: TaskConfig[]) => void): Promise<void> {
    await this.initializeStatusListener();
    this.statusListeners.add(listener);
      
    // 如果有缓存数据，立即调用一次
    if (this.lastTasksCache.length > 0) {
      listener(this.lastTasksCache);
    }
  }

  // 移除状态监听器
  removeStatusListener(listener: (tasks: TaskConfig[]) => void): void {
    this.statusListeners.delete(listener);
  }

  // 任务管理相关接口
  async listTasks(): Promise<TaskConfig[]> {
    try {
      // 调用 Tauri 后端的 list_tasks 命令
      const tasks = await invoke<TaskConfig[]>('list_tasks');

      const hasChanges = JSON.stringify(tasks) !== JSON.stringify(this.lastTasksCache);
            
      if (hasChanges) {
        this.lastTasksCache = tasks;
        
        this.statusListeners.forEach(listener => {
          try {
            listener(tasks);
          } catch (error) {
            console.error('Error in status listener:', error);
          }
        });
      }

      return tasks;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Failed to fetch tasks.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async createTask(name: string, pickerPath: string): Promise<TaskConfig> {
    try {
      // 调用 Tauri 后端的 create_task 命令
      const task = await invoke<TaskConfig>('create_task', {
        name,
        pickerPath
      });
      
      // 立即刷新状态，不依赖事件
      setTimeout(() => this.listTasks(), 500);
      
      return task;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Failed to create task.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async runTask(taskId: string): Promise<void> {
    await delay(200)
    try {
      // 调用 Tauri 后端的 run_task 命令
      await invoke<void>('run_task', {
        taskId
      });
      
      // 立即刷新状态，不依赖事件
      setTimeout(() => this.listTasks(), 500);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Failed to run task.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async stopTask(taskId: string): Promise<void> {
    try {
      // 调用 Tauri 后端的 stop_task 命令
      await invoke<void>('stop_task', {
        taskId
      });
      
      // 立即刷新状态，不依赖事件
      setTimeout(() => this.listTasks(), 500);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Failed to stop task.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async deleteTask(taskId: string, deleteFile: boolean = false): Promise<void> {
    try {
      // 调用 Tauri 后端的 delete_task 命令
      await invoke<void>('delete_task', {
        taskId,
        deleteFile
      });

      // 立即刷新状态，不依赖事件
      setTimeout(() => this.listTasks(), 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Failed to delete task.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  // 待实现的 API 方法
  async setupEnv(taskId: string, envConfig: EnvConfig): Promise<TaskConfig> {
    try {
      // 调用 Tauri 后端的 setup_env 命令
      const taskConfig = await invoke<TaskConfig>('setup_env', {
        taskId,
        envConfig
      });
      return taskConfig;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Failed to setup environment.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async getTaskConfig(taskId: string): Promise<TaskConfig> {
    try {
      // 调用 Tauri 后端的 get_task_config 命令
      const taskConfig = await invoke<TaskConfig>('get_task_config', {
        taskId
      });
      return taskConfig;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Failed to get task config.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async getEnvConfig(taskId: string): Promise<EnvConfig> {
    try {
      // 调用 Tauri 后端的 get_env_config 命令
      const envConfig = await invoke<EnvConfig>('get_env_config', {
        taskId
      });
      return envConfig;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Failed to get environment config.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  async getProjectConfig(taskId: string): Promise<ProjectConfig> {
    try {
      // 调用 Tauri 后端的 get_project_config 命令
      const projectConfig = await invoke<ProjectConfig>('get_project_config', {
        taskId
      });
      return projectConfig;
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Failed to get project config.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  getTaskSchema(taskId: string): Promise<TaskSchema> {
    try {
      // 调用 Tauri 后端的 get_task_schema 命令
      return invoke<TaskSchema>('get_task_schema', {
        taskId
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        (error.message || 'Failed to get task schema.') : 
        (typeof error === 'string' ? error : JSON.stringify(error) || 'Please try again.');
      throw new Error(errorMessage);
    }
  }

  // 清理资源
  cleanup(): void {
    this.statusListeners.clear();
    this.logListeners.clear();
  }
}

// 导出单例实例
export const taskAPI = new TaskAPIService()

export default taskAPI