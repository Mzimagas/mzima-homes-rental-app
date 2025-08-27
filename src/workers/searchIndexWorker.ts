/**
 * Search Index Background Worker
 * Handles search indexing operations in the background to prevent UI blocking
 */

interface IndexTask {
  id: string
  type: 'full_rebuild' | 'incremental_update' | 'entity_update' | 'entity_delete'
  priority: 'low' | 'medium' | 'high' | 'critical'
  data: any
  timestamp: number
  retries: number
  maxRetries: number
}

interface WorkerMessage {
  type: 'index_task' | 'status_request' | 'cancel_task' | 'clear_queue'
  payload?: any
}

interface WorkerResponse {
  type: 'task_complete' | 'task_error' | 'status_update' | 'queue_status'
  payload?: any
}

class SearchIndexWorker {
  private taskQueue: IndexTask[] = []
  private isProcessing = false
  private currentTask: IndexTask | null = null
  private workerStats = {
    tasksProcessed: 0,
    tasksErrored: 0,
    averageProcessingTime: 0,
    lastProcessedAt: null as Date | null,
  }

  constructor() {
    this.startWorker()
  }

  /**
   * Add a task to the indexing queue
   */
  addTask(task: Omit<IndexTask, 'id' | 'timestamp' | 'retries'>): string {
    const indexTask: IndexTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
      ...task,
    }

    // Insert task based on priority
    this.insertTaskByPriority(indexTask)

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processNextTask()
    }

    return indexTask.id
  }

  /**
   * Insert task into queue based on priority
   */
  private insertTaskByPriority(task: IndexTask): void {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    const taskPriority = priorityOrder[task.priority]

    let insertIndex = this.taskQueue.length
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTaskPriority = priorityOrder[this.taskQueue[i].priority]
      if (taskPriority < queuedTaskPriority) {
        insertIndex = i
        break
      }
    }

    this.taskQueue.splice(insertIndex, 0, task)
  }

  /**
   * Start the background worker
   */
  private startWorker(): void {
    // Use requestIdleCallback for better performance
    const processWhenIdle = () => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback((deadline) => {
          if (deadline.timeRemaining() > 0 && !this.isProcessing && this.taskQueue.length > 0) {
            this.processNextTask()
          }
          processWhenIdle()
        })
      } else {
        // Fallback for environments without requestIdleCallback
        setTimeout(() => {
          if (!this.isProcessing && this.taskQueue.length > 0) {
            this.processNextTask()
          }
          processWhenIdle()
        }, 100)
      }
    }

    processWhenIdle()
  }

  /**
   * Process the next task in the queue
   */
  private async processNextTask(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) return

    this.isProcessing = true
    this.currentTask = this.taskQueue.shift()!

    const startTime = Date.now()

    try {
      await this.executeTask(this.currentTask)

      // Update stats
      const processingTime = Date.now() - startTime
      this.updateStats(processingTime, false)

      this.postMessage({
        type: 'task_complete',
        payload: {
          taskId: this.currentTask.id,
          processingTime,
        },
      })
    } catch (error) {
      console.error(`Search index task failed:`, error)

      // Retry logic
      if (this.currentTask.retries < this.currentTask.maxRetries) {
        this.currentTask.retries++
        this.currentTask.timestamp = Date.now()
        this.insertTaskByPriority(this.currentTask)
      } else {
        this.updateStats(Date.now() - startTime, true)
        this.postMessage({
          type: 'task_error',
          payload: {
            taskId: this.currentTask.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      }
    } finally {
      this.currentTask = null
      this.isProcessing = false

      // Process next task if available
      if (this.taskQueue.length > 0) {
        // Use setTimeout to prevent stack overflow
        setTimeout(() => this.processNextTask(), 0)
      }
    }
  }

  /**
   * Execute a specific indexing task
   */
  private async executeTask(task: IndexTask): Promise<void> {
    switch (task.type) {
      case 'full_rebuild':
        await this.performFullRebuild(task.data)
        break

      case 'incremental_update':
        await this.performIncrementalUpdate(task.data)
        break

      case 'entity_update':
        await this.updateEntity(task.data)
        break

      case 'entity_delete':
        await this.deleteEntity(task.data)
        break

      default:
        throw new Error(`Unknown task type: ${task.type}`)
    }
  }

  /**
   * Perform full index rebuild
   */
  private async performFullRebuild(data: any): Promise<void> {
    // Simulate chunked processing to prevent blocking
    const chunkSize = 50
    const entities = data.entities || []

    for (let i = 0; i < entities.length; i += chunkSize) {
      const chunk = entities.slice(i, i + chunkSize)

      // Process chunk
      await this.processEntityChunk(chunk)

      // Yield control to prevent blocking
      await this.yieldControl()
    }
  }

  /**
   * Perform incremental update
   */
  private async performIncrementalUpdate(data: any): Promise<void> {
    const { updates } = data

    for (const update of updates) {
      await this.processEntityUpdate(update)

      // Yield control periodically
      if (updates.indexOf(update) % 10 === 0) {
        await this.yieldControl()
      }
    }
  }

  /**
   * Update a single entity
   */
  private async updateEntity(data: any): Promise<void> {
    const { type, id, entityData } = data
    await this.processEntityUpdate({ type, id, data: entityData, action: 'update' })
  }

  /**
   * Delete a single entity
   */
  private async deleteEntity(data: any): Promise<void> {
    const { type, id } = data
    await this.processEntityUpdate({ type, id, action: 'delete' })
  }

  /**
   * Process a chunk of entities
   */
  private async processEntityChunk(entities: any[]): Promise<void> {
    // This would integrate with the actual search index
    // For now, simulate processing time
    return new Promise((resolve) => {
      setTimeout(resolve, entities.length * 2) // 2ms per entity
    })
  }

  /**
   * Process a single entity update
   */
  private async processEntityUpdate(update: any): Promise<void> {
    // This would integrate with the actual search index
    // For now, simulate processing time
    return new Promise((resolve) => {
      setTimeout(resolve, 5) // 5ms per update
    })
  }

  /**
   * Yield control to prevent blocking the main thread
   */
  private async yieldControl(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof MessageChannel !== 'undefined') {
        const channel = new MessageChannel()
        channel.port2.onmessage = () => resolve()
        channel.port1.postMessage(null)
      } else {
        setTimeout(resolve, 0)
      }
    })
  }

  /**
   * Update worker statistics
   */
  private updateStats(processingTime: number, isError: boolean): void {
    if (isError) {
      this.workerStats.tasksErrored++
    } else {
      this.workerStats.tasksProcessed++

      // Update average processing time
      const totalTasks = this.workerStats.tasksProcessed
      this.workerStats.averageProcessingTime =
        (this.workerStats.averageProcessingTime * (totalTasks - 1) + processingTime) / totalTasks
    }

    this.workerStats.lastProcessedAt = new Date()
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isProcessing: boolean
    queueLength: number
    currentTask: IndexTask | null
    stats: typeof this.workerStats
  } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.taskQueue.length,
      currentTask: this.currentTask,
      stats: { ...this.workerStats },
    }
  }

  /**
   * Clear the task queue
   */
  clearQueue(): void {
    this.taskQueue = []
  }

  /**
   * Cancel a specific task
   */
  cancelTask(taskId: string): boolean {
    const index = this.taskQueue.findIndex((task) => task.id === taskId)
    if (index !== -1) {
      this.taskQueue.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Post message to main thread (if running in a worker)
   */
  private postMessage(message: WorkerResponse): void {
    if (typeof postMessage !== 'undefined') {
      postMessage(message)
    } else {
      // If not in a worker, emit custom event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('searchWorkerMessage', { detail: message }))
      }
    }
  }
}

// Initialize worker
const searchWorker = new SearchIndexWorker()

// Handle messages from main thread
if (typeof onmessage !== 'undefined') {
  onmessage = (event: MessageEvent<WorkerMessage>) => {
    const { type, payload } = event.data

    switch (type) {
      case 'index_task':
        searchWorker.addTask(payload)
        break

      case 'status_request':
        searchWorker.postMessage({
          type: 'status_update',
          payload: searchWorker.getStatus(),
        })
        break

      case 'cancel_task': {
        const cancelled = searchWorker.cancelTask(payload.taskId)
        searchWorker.postMessage({
          type: 'task_complete',
          payload: { taskId: payload.taskId, cancelled },
        })
        break
      }

      case 'clear_queue':
        searchWorker.clearQueue()
        searchWorker.postMessage({
          type: 'queue_status',
          payload: { cleared: true },
        })
        break
    }
  }
}

export default SearchIndexWorker
