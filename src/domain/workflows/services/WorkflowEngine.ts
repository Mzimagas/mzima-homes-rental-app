/**
 * Workflow Engine Service
 * Executes workflows and manages their lifecycle
 */

import { Workflow, WorkflowExecution, WorkflowStep, StepExecution } from '../entities/Workflow'
import { DomainEvent } from '../../events/DomainEvent'

export interface WorkflowContext {
  [key: string]: any
  _metadata: {
    executionId: string
    workflowId: string
    userId?: string
    triggeredBy: string
    startTime: Date
  }
}

export interface StepExecutor {
  canExecute(stepType: string): boolean
  execute(step: WorkflowStep, context: WorkflowContext): Promise<StepExecutionResult>
}

export interface StepExecutionResult {
  success: boolean
  output?: Record<string, any>
  error?: string
  nextSteps?: string[]
  shouldContinue: boolean
}

export class WorkflowEngine {
  private stepExecutors = new Map<string, StepExecutor>()
  private activeExecutions = new Map<string, WorkflowExecution>()

  constructor() {
    this.registerDefaultExecutors()
  }

  // Executor registration
  registerStepExecutor(stepType: string, executor: StepExecutor): void {
    this.stepExecutors.set(stepType, executor)
  }

  // Workflow execution
  async executeWorkflow(
    workflow: Workflow,
    initialContext: Record<string, any> = {},
    triggeredBy: string = 'system'
  ): Promise<WorkflowExecution> {
    // Validate workflow
    const validation = workflow.validate()
    if (!validation.isValid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`)
    }

    // Create execution
    const execution = workflow.startExecution(initialContext, triggeredBy)
    
    // Add metadata to context
    const context: WorkflowContext = {
      ...initialContext,
      _metadata: {
        executionId: execution.id,
        workflowId: workflow.id,
        triggeredBy,
        startTime: execution.startedAt
      }
    }

    // Store active execution
    this.activeExecutions.set(execution.id, execution)

    try {
      // Start execution
      execution.status = 'running'
      
      // Find starting steps (steps with no predecessors)
      const startingSteps = this.findStartingSteps(workflow.steps)
      
      if (startingSteps.length === 0) {
        throw new Error('No starting steps found in workflow')
      }

      // Execute starting steps
      for (const step of startingSteps) {
        await this.executeStep(workflow, execution, step, context)
      }

      // Continue execution until completion
      await this.continueExecution(workflow, execution, context)

      // Mark as completed if no pending steps
      if (this.allStepsCompleted(execution)) {
        execution.status = 'completed'
        execution.completedAt = new Date()
      }

    } catch (error) {
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : 'Unknown error'
      execution.completedAt = new Date()
    } finally {
      // Remove from active executions
      this.activeExecutions.delete(execution.id)
    }

    return execution
  }

  // Step execution
  private async executeStep(
    workflow: Workflow,
    execution: WorkflowExecution,
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<void> {
    // Check if step already executed
    const existingExecution = execution.stepExecutions.find(se => se.stepId === step.id)
    if (existingExecution && existingExecution.status === 'completed') {
      return
    }

    // Create step execution
    const stepExecution: StepExecution = {
      stepId: step.id,
      status: 'running',
      startedAt: new Date(),
      input: { ...context },
      retryCount: 0
    }

    execution.stepExecutions.push(stepExecution)
    execution.currentStep = step.id

    try {
      // Check conditions
      if (step.conditions && !this.evaluateConditions(step.conditions, context)) {
        stepExecution.status = 'skipped'
        stepExecution.completedAt = new Date()
        return
      }

      // Find executor
      const executor = this.stepExecutors.get(step.type)
      if (!executor) {
        throw new Error(`No executor found for step type: ${step.type}`)
      }

      // Execute step with retry logic
      const result = await this.executeStepWithRetry(step, executor, context)

      // Update step execution
      stepExecution.status = result.success ? 'completed' : 'failed'
      stepExecution.output = result.output
      stepExecution.error = result.error
      stepExecution.completedAt = new Date()

      // Update context with output
      if (result.output) {
        Object.assign(context, result.output)
      }

      // Schedule next steps
      if (result.success && result.shouldContinue) {
        const nextStepIds = result.nextSteps || step.nextSteps
        for (const nextStepId of nextStepIds) {
          const nextStep = workflow.steps.find(s => s.id === nextStepId)
          if (nextStep) {
            // Execute next step asynchronously
            setImmediate(() => {
              this.executeStep(workflow, execution, nextStep, context)
            })
          }
        }
      }

    } catch (error) {
      stepExecution.status = 'failed'
      stepExecution.error = error instanceof Error ? error.message : 'Unknown error'
      stepExecution.completedAt = new Date()
      
      // Propagate error to execution
      execution.status = 'failed'
      execution.error = stepExecution.error
    }
  }

  private async executeStepWithRetry(
    step: WorkflowStep,
    executor: StepExecutor,
    context: WorkflowContext
  ): Promise<StepExecutionResult> {
    const maxAttempts = step.retryPolicy?.maxAttempts || 1
    const backoffMs = step.retryPolicy?.backoffMs || 1000

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Apply timeout if configured
        if (step.timeout) {
          return await this.executeWithTimeout(executor, step, context, step.timeout)
        } else {
          return await executor.execute(step, context)
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < maxAttempts) {
          // Wait before retry
          await this.delay(backoffMs * attempt)
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Step execution failed',
      shouldContinue: false
    }
  }

  private async executeWithTimeout(
    executor: StepExecutor,
    step: WorkflowStep,
    context: WorkflowContext,
    timeoutMs: number
  ): Promise<StepExecutionResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Step execution timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      executor.execute(step, context)
        .then(result => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  // Condition evaluation
  private evaluateConditions(conditions: any[], context: WorkflowContext): boolean {
    if (conditions.length === 0) return true

    let result = true
    let currentOperator = 'AND'

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, context)
      
      if (currentOperator === 'AND') {
        result = result && conditionResult
      } else {
        result = result || conditionResult
      }

      currentOperator = condition.logicalOperator || 'AND'
    }

    return result
  }

  private evaluateCondition(condition: any, context: WorkflowContext): boolean {
    const value = this.getContextValue(context, condition.field)
    
    switch (condition.operator) {
      case 'eq': return value === condition.value
      case 'ne': return value !== condition.value
      case 'gt': return value > condition.value
      case 'gte': return value >= condition.value
      case 'lt': return value < condition.value
      case 'lte': return value <= condition.value
      case 'in': return Array.isArray(condition.value) && condition.value.includes(value)
      case 'contains': return String(value).includes(String(condition.value))
      case 'exists': return value !== undefined && value !== null
      default: return false
    }
  }

  private getContextValue(context: WorkflowContext, field: string): any {
    const parts = field.split('.')
    let value: any = context
    
    for (const part of parts) {
      value = value?.[part]
    }
    
    return value
  }

  // Workflow flow control
  private findStartingSteps(steps: WorkflowStep[]): WorkflowStep[] {
    const referencedSteps = new Set<string>()
    steps.forEach(step => {
      step.nextSteps.forEach(nextId => referencedSteps.add(nextId))
    })

    return steps.filter(step => !referencedSteps.has(step.id))
  }

  private async continueExecution(
    workflow: Workflow,
    execution: WorkflowExecution,
    context: WorkflowContext
  ): Promise<void> {
    // Wait for all steps to complete or fail
    const maxWaitTime = 300000 // 5 minutes
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      if (this.allStepsCompleted(execution) || execution.status === 'failed') {
        break
      }
      
      await this.delay(1000) // Check every second
    }

    if (Date.now() - startTime >= maxWaitTime) {
      execution.status = 'failed'
      execution.error = 'Workflow execution timed out'
    }
  }

  private allStepsCompleted(execution: WorkflowExecution): boolean {
    return execution.stepExecutions.every(se => 
      se.status === 'completed' || se.status === 'failed' || se.status === 'skipped'
    )
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Default step executors
  private registerDefaultExecutors(): void {
    // Action executor
    this.registerStepExecutor('action', new ActionStepExecutor())
    
    // Notification executor
    this.registerStepExecutor('notification', new NotificationStepExecutor())
    
    // Condition executor
    this.registerStepExecutor('condition', new ConditionStepExecutor())
    
    // Delay executor
    this.registerStepExecutor('delay', new DelayStepExecutor())
    
    // Approval executor
    this.registerStepExecutor('approval', new ApprovalStepExecutor())
  }

  // Execution management
  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this.activeExecutions.values())
  }

  cancelExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId)
    if (execution) {
      execution.status = 'cancelled'
      execution.completedAt = new Date()
      this.activeExecutions.delete(executionId)
      return true
    }
    return false
  }
}

// Default Step Executors
class ActionStepExecutor implements StepExecutor {
  canExecute(stepType: string): boolean {
    return stepType === 'action'
  }

  async execute(step: WorkflowStep, context: WorkflowContext): Promise<StepExecutionResult> {
    // Execute the configured action
    const { actionType, parameters } = step.config
    
    try {
      // This would integrate with your command system
      const result = await this.executeAction(actionType, parameters, context)
      
      return {
        success: true,
        output: result,
        shouldContinue: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Action execution failed',
        shouldContinue: false
      }
    }
  }

  private async executeAction(actionType: string, parameters: any, context: WorkflowContext): Promise<any> {
    // Mock implementation - integrate with your CQRS commands
    console.log(`Executing action: ${actionType}`, parameters)
    return { actionExecuted: true, actionType, parameters }
  }
}

class NotificationStepExecutor implements StepExecutor {
  canExecute(stepType: string): boolean {
    return stepType === 'notification'
  }

  async execute(step: WorkflowStep, context: WorkflowContext): Promise<StepExecutionResult> {
    const { recipients, template, channel } = step.config
    
    try {
      // Send notification
      await this.sendNotification(recipients, template, channel, context)
      
      return {
        success: true,
        output: { notificationSent: true },
        shouldContinue: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Notification failed',
        shouldContinue: true // Continue even if notification fails
      }
    }
  }

  private async sendNotification(recipients: string[], template: string, channel: string, context: WorkflowContext): Promise<void> {
    // Mock implementation - integrate with your notification system
    console.log(`Sending notification to ${recipients.join(', ')} via ${channel}`)
  }
}

class ConditionStepExecutor implements StepExecutor {
  canExecute(stepType: string): boolean {
    return stepType === 'condition'
  }

  async execute(step: WorkflowStep, context: WorkflowContext): Promise<StepExecutionResult> {
    const { conditions, trueSteps, falseSteps } = step.config
    
    const conditionResult = this.evaluateConditions(conditions, context)
    const nextSteps = conditionResult ? (trueSteps || []) : (falseSteps || [])
    
    return {
      success: true,
      output: { conditionResult },
      nextSteps,
      shouldContinue: true
    }
  }

  private evaluateConditions(conditions: any[], context: WorkflowContext): boolean {
    // Simplified condition evaluation
    return conditions.every(condition => {
      const value = context[condition.field]
      switch (condition.operator) {
        case 'eq': return value === condition.value
        case 'ne': return value !== condition.value
        case 'gt': return value > condition.value
        default: return false
      }
    })
  }
}

class DelayStepExecutor implements StepExecutor {
  canExecute(stepType: string): boolean {
    return stepType === 'delay'
  }

  async execute(step: WorkflowStep, context: WorkflowContext): Promise<StepExecutionResult> {
    const { delayMs } = step.config
    
    await new Promise(resolve => setTimeout(resolve, delayMs))
    
    return {
      success: true,
      output: { delayCompleted: true },
      shouldContinue: true
    }
  }
}

class ApprovalStepExecutor implements StepExecutor {
  canExecute(stepType: string): boolean {
    return stepType === 'approval'
  }

  async execute(step: WorkflowStep, context: WorkflowContext): Promise<StepExecutionResult> {
    const { approvers, message, timeoutMs } = step.config
    
    // Mock approval process
    // In real implementation, this would create an approval request
    // and wait for response
    
    return {
      success: true,
      output: { 
        approvalRequested: true,
        approvers,
        message
      },
      shouldContinue: false // Wait for manual approval
    }
  }
}
