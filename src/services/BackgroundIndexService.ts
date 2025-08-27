/**
 * Background Index Service
 * Manages search indexing operations using web workers for non-blocking performance
 */

interface IndexTaskOptions {
  priority?: 'low' | 'medium' | 'high' | 'critical'
  maxRetries?: number
}

interface WorkerStatus {
  isProcessing: boolean
  queueLength: number
  currentTask: any
  stats: {
    tasksProcessed: number
    tasksErrored: number
    averageProcessingTime: number
    lastProcessedAt: Date | null
  }
}

class BackgroundIndexService {
  private worker: Worker | null = null
  private isWorkerSupported = false
  private fallbackQueue: Array<() => Promise<void>> = []
  private isProcessingFallback = false
  private listeners = new Map<string, (data: any) => void>()

  constructor() {
    this.initializeWorker()
  }

  /**
   * Initialize the web worker
   */
  private initializeWorker(): void {
    if (typeof Worker === 'undefined' || typeof window === 'undefined') {
      console.warn('Web Workers not supported, using fallback processing')
      this.isWorkerSupported = false
      return
    }

    try {
      // Create worker from the search index worker file
      this.worker = new Worker(new URL('../workers/searchIndexWorker.ts', import.meta.url))
      this.isWorkerSupported = true

      // Set up message handling
      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data)
      }

      this.worker.onerror = (error) => {
        console.error('Search index worker error:', error)
        this.fallbackToMainThread()
      }
    } catch (error) {
      console.warn('Failed to create search index worker, using fallback:', error)
      this.fallbackToMainThread()
    }
  }

  /**
   * Fallback to main thread processing
   */
  private fallbackToMainThread(): void {
    this.isWorkerSupported = false
    this.worker = null
    this.startFallbackProcessor()
  }

  /**
   * Start fallback processor for environments without worker support
   */
  private startFallbackProcessor(): void {
    const processFallbackQueue = async () => {
      if (this.isProcessingFallback || this.fallbackQueue.length === 0) return

      this.isProcessingFallback = true

      while (this.fallbackQueue.length > 0) {
        const task = this.fallbackQueue.shift()!

        try {
          await task()
        } catch (error) {
          console.error('Fallback index task error:', error)
        }

        // Yield control to prevent blocking
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      this.isProcessingFallback = false
    }

    // Process queue periodically
    setInterval(processFallbackQueue, 100)
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(data: any): void {
    const { type, payload } = data

    switch (type) {
      case 'task_complete':
        this.emit('taskComplete', payload)
        break

      case 'task_error':
        this.emit('taskError', payload)
        break

      case 'status_update':
        this.emit('statusUpdate', payload)
        break

      case 'queue_status':
        this.emit('queueStatus', payload)
        break
    }
  }

  /**
   * Queue a full index rebuild
   */
  async rebuildIndex(entities: any[], options: IndexTaskOptions = {}): Promise<string> {
    const taskData = {
      type: 'full_rebuild' as const,
      priority: options.priority || 'medium',
      maxRetries: options.maxRetries || 3,
      data: { entities },
    }

    if (this.isWorkerSupported && this.worker) {
      const taskId = this.generateTaskId()
      this.worker.postMessage({
        type: 'index_task',
        payload: { ...taskData, id: taskId },
      })
      return taskId
    } else {
      // Fallback processing
      return this.addFallbackTask(async () => {
        await this.processFallbackRebuild(entities)
      })
    }
  }

  /**
   * Queue an incremental update
   */
  async updateIndex(updates: any[], options: IndexTaskOptions = {}): Promise<string> {
    const taskData = {
      type: 'incremental_update' as const,
      priority: options.priority || 'high',
      maxRetries: options.maxRetries || 2,
      data: { updates },
    }

    if (this.isWorkerSupported && this.worker) {
      const taskId = this.generateTaskId()
      this.worker.postMessage({
        type: 'index_task',
        payload: { ...taskData, id: taskId },
      })
      return taskId
    } else {
      return this.addFallbackTask(async () => {
        await this.processFallbackUpdates(updates)
      })
    }
  }

  /**
   * Queue a single entity update
   */
  async updateEntity(
    type: string,
    id: string,
    entityData: any,
    options: IndexTaskOptions = {}
  ): Promise<string> {
    const taskData = {
      type: 'entity_update' as const,
      priority: options.priority || 'high',
      maxRetries: options.maxRetries || 2,
      data: { type, id, entityData },
    }

    if (this.isWorkerSupported && this.worker) {
      const taskId = this.generateTaskId()
      this.worker.postMessage({
        type: 'index_task',
        payload: { ...taskData, id: taskId },
      })
      return taskId
    } else {
      return this.addFallbackTask(async () => {
        await this.processFallbackEntityUpdate(type, id, entityData)
      })
    }
  }

  /**
   * Queue a single entity deletion
   */
  async deleteEntity(type: string, id: string, options: IndexTaskOptions = {}): Promise<string> {
    const taskData = {
      type: 'entity_delete' as const,
      priority: options.priority || 'high',
      maxRetries: options.maxRetries || 1,
      data: { type, id },
    }

    if (this.isWorkerSupported && this.worker) {
      const taskId = this.generateTaskId()
      this.worker.postMessage({
        type: 'index_task',
        payload: { ...taskData, id: taskId },
      })
      return taskId
    } else {
      return this.addFallbackTask(async () => {
        await this.processFallbackEntityDelete(type, id)
      })
    }
  }

  /**
   * Get worker status
   */
  async getStatus(): Promise<WorkerStatus | null> {
    if (this.isWorkerSupported && this.worker) {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 1000)

        const handler = (data: WorkerStatus) => {
          clearTimeout(timeout)
          this.off('statusUpdate', handler)
          resolve(data)
        }

        this.on('statusUpdate', handler)
        this.worker!.postMessage({ type: 'status_request' })
      })
    } else {
      return {
        isProcessing: this.isProcessingFallback,
        queueLength: this.fallbackQueue.length,
        currentTask: null,
        stats: {
          tasksProcessed: 0,
          tasksErrored: 0,
          averageProcessingTime: 0,
          lastProcessedAt: null,
        },
      }
    }
  }

  /**
   * Clear the task queue
   */
  clearQueue(): void {
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({ type: 'clear_queue' })
    } else {
      this.fallbackQueue = []
    }
  }

  /**
   * Cancel a specific task
   */
  cancelTask(taskId: string): void {
    if (this.isWorkerSupported && this.worker) {
      this.worker.postMessage({
        type: 'cancel_task',
        payload: { taskId },
      })
    }
    // Note: Fallback tasks can't be cancelled once queued
  }

  /**
   * Add event listener
   */
  on(event: string, listener: (data: any) => void): void {
    this.listeners.set(event, listener)
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: (data: any) => void): void {
    if (this.listeners.get(event) === listener) {
      this.listeners.delete(event)
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listener = this.listeners.get(event)
    if (listener) {
      listener(data)
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Add task to fallback queue
   */
  private addFallbackTask(task: () => Promise<void>): string {
    const taskId = this.generateTaskId()
    this.fallbackQueue.push(task)
    return taskId
  }

  /**
   * Fallback processing methods
   */
  private async processFallbackRebuild(entities: any[]): Promise<void> {
    // Simulate chunked processing
    const chunkSize = 20
    for (let i = 0; i < entities.length; i += chunkSize) {
      const chunk = entities.slice(i, i + chunkSize)
      await this.processEntityChunk(chunk)
      await new Promise((resolve) => setTimeout(resolve, 10)) // Yield control
    }
  }

  private async processFallbackUpdates(updates: any[]): Promise<void> {
    for (const update of updates) {
      await this.processEntityUpdate(update)
      if (updates.indexOf(update) % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 5)) // Yield control
      }
    }
  }

  private async processFallbackEntityUpdate(
    type: string,
    id: string,
    entityData: any
  ): Promise<void> {
    await this.processEntityUpdate({ type, id, data: entityData, action: 'update' })
  }

  private async processFallbackEntityDelete(type: string, id: string): Promise<void> {
    await this.processEntityUpdate({ type, id, action: 'delete' })
  }

  private async processEntityChunk(entities: any[]): Promise<void> {
    // Placeholder for actual index processing
    return new Promise((resolve) => setTimeout(resolve, entities.length))
  }

  private async processEntityUpdate(update: any): Promise<void> {
    // Placeholder for actual index processing
    return new Promise((resolve) => setTimeout(resolve, 2))
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.listeners.clear()
    this.fallbackQueue = []
  }
}

// Export singleton instance
export const backgroundIndexService = new BackgroundIndexService()
export default BackgroundIndexService
