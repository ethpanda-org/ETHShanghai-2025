/**
 * @file 全局事件分发器
 * @description 提供一个单例的 EventEmitter 实例，用于在应用内各模块间进行解耦的事件通信。
 */
import { EventEmitter } from 'events';

// 创建一个全局单例的 EventEmitter
const appEventEmitter = new EventEmitter();

export default appEventEmitter;
