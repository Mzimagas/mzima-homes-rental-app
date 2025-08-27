/**
 * Workflow Domain Entity
 * Represents automated business processes and their execution
 */

import { AggregateRoot } from '../../shared/AggregateRoot'
import { DomainEvent } from '../../events/DomainEvent'

export interface WorkflowStep {
  id: string
  name: string
  type: 'action' | 'condition' | 'notification' | 'approval' | 'delay' | 'parallel' | 'loop'
  config: Record<string, any>
  nextSteps: string[]
  conditions?: WorkflowCondition[]
  timeout?: number
  retryPolicy?: {
    maxAttempts: number
    backoffMs: number
  }
}

export interface WorkflowCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'exists'
  value: any
  logicalOperator?: 'AND' | 'OR'
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'manual' | 'api'
  config: {
    eventType?: string
    cronExpression?: string
    conditions?: WorkflowCondition[]
  }
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  currentStep?: string
  startedAt: Date
  completedAt?: Date
  context: Record<string, any>
  stepExecutions: StepExecution[]
  error?: string
}

export interface StepExecution {
  stepId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt: Date
  completedAt?: Date
  input: Record<string, any>
  output?: Record<string, any>
  error?: string
  retryCount: number
}

export class Workflow extends AggregateRoot {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly category: 'lease' | 'payment' | 'maintenance' | 'tenant' | 'property' | 'general',
    public readonly trigger: WorkflowTrigger,
    public readonly steps: WorkflowStep[],
    public readonly createdBy: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public isActive: boolean = true,
    public version: number = 1,
    public tags: string[] = [],
    public executionCount: number = 0,
    public successRate: number = 0
  ) {
    super(id)
  }

  // Workflow execution
  startExecution(context: Record<string, any>, triggeredBy?: string): WorkflowExecution {
    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflowId: this.id,
      status: 'pending',
      startedAt: new Date(),
      context,
      stepExecutions: []
    }

    this.executionCount += 1
    this.updatedAt = new Date()

    this.addDomainEvent(new WorkflowExecutionStartedEvent(
      this.id,
      execution.id,
      this.name,
      triggeredBy || 'system'
    ))

    return execution
  }

  // Step management
  addStep(step: WorkflowStep, afterStepId?: string): void {
    if (afterStepId) {
      const afterIndex = this.steps.findIndex(s => s.id === afterStepId)
      if (afterIndex !== -1) {
        this.steps.splice(afterIndex + 1, 0, step)
      } else {
        this.steps.push(step)
      }
    } else {
      this.steps.push(step)
    }

    this.version += 1
    this.updatedAt = new Date()

    this.addDomainEvent(new WorkflowStepAddedEvent(
      this.id,
      step.id,
      step.name,
      step.type
    ))
  }

  removeStep(stepId: string): void {
    const stepIndex = this.steps.findIndex(s => s.id === stepId)
    if (stepIndex !== -1) {
      const removedStep = this.steps.splice(stepIndex, 1)[0]
      
      // Update references to removed step
      this.steps.forEach(step => {
        step.nextSteps = step.nextSteps.filter(id => id !== stepId)
      })

      this.version += 1
      this.updatedAt = new Date()

      this.addDomainEvent(new WorkflowStepRemovedEvent(
        this.id,
        stepId,
        removedStep.name
      ))
    }
  }

  updateStep(stepId: string, updates: Partial<WorkflowStep>): void {
    const stepIndex = this.steps.findIndex(s => s.id === stepId)
    if (stepIndex !== -1) {
      this.steps[stepIndex] = { ...this.steps[stepIndex], ...updates }
      this.version += 1
      this.updatedAt = new Date()

      this.addDomainEvent(new WorkflowStepUpdatedEvent(
        this.id,
        stepId,
        Object.keys(updates)
      ))
    }
  }

  // Workflow configuration
  updateTrigger(trigger: WorkflowTrigger): void {
    this.trigger = trigger
    this.version += 1
    this.updatedAt = new Date()

    this.addDomainEvent(new WorkflowTriggerUpdatedEvent(
      this.id,
      trigger.type
    ))
  }

  activate(): void {
    if (!this.isActive) {
      this.isActive = true
      this.updatedAt = new Date()

      this.addDomainEvent(new WorkflowActivatedEvent(this.id, this.name))
    }
  }

  deactivate(): void {
    if (this.isActive) {
      this.isActive = false
      this.updatedAt = new Date()

      this.addDomainEvent(new WorkflowDeactivatedEvent(this.id, this.name))
    }
  }

  // Validation
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.name.trim()) {
      errors.push('Workflow name is required')
    }

    if (this.steps.length === 0) {
      errors.push('Workflow must have at least one step')
    }

    // Check for orphaned steps
    const referencedSteps = new Set<string>()
    this.steps.forEach(step => {
      step.nextSteps.forEach(nextId => referencedSteps.add(nextId))
    })

    const stepIds = new Set(this.steps.map(s => s.id))
    referencedSteps.forEach(refId => {
      if (!stepIds.has(refId)) {
        errors.push(`Step references non-existent step: ${refId}`)
      }
    })

    // Check for circular dependencies
    if (this.hasCircularDependency()) {
      errors.push('Workflow contains circular dependencies')
    }

    // Validate trigger
    if (this.trigger.type === 'schedule' && !this.trigger.config.cronExpression) {
      errors.push('Schedule trigger requires cron expression')
    }

    if (this.trigger.type === 'event' && !this.trigger.config.eventType) {
      errors.push('Event trigger requires event type')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Analytics
  updateSuccessRate(successful: number, total: number): void {
    this.successRate = total > 0 ? (successful / total) * 100 : 0
    this.updatedAt = new Date()
  }

  getExecutionStats(): {
    totalExecutions: number
    successRate: number
    averageExecutionTime?: number
    lastExecuted?: Date
  } {
    return {
      totalExecutions: this.executionCount,
      successRate: this.successRate,
      // These would be calculated from execution history
      averageExecutionTime: undefined,
      lastExecuted: undefined
    }
  }

  // Cloning and versioning
  clone(newName: string, createdBy: string): Workflow {
    const clonedWorkflow = new Workflow(
      this.generateWorkflowId(),
      newName,
      this.description,
      this.category,
      { ...this.trigger },
      this.steps.map(step => ({ ...step })),
      createdBy,
      new Date(),
      new Date(),
      false, // Start inactive
      1, // Reset version
      [...this.tags],
      0, // Reset execution count
      0 // Reset success rate
    )

    clonedWorkflow.addDomainEvent(new WorkflowClonedEvent(
      clonedWorkflow.id,
      this.id,
      newName,
      createdBy
    ))

    return clonedWorkflow
  }

  // Private methods
  private hasCircularDependency(): boolean {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) return true
      if (visited.has(stepId)) return false

      visited.add(stepId)
      recursionStack.add(stepId)

      const step = this.steps.find(s => s.id === stepId)
      if (step) {
        for (const nextStepId of step.nextSteps) {
          if (hasCycle(nextStepId)) return true
        }
      }

      recursionStack.delete(stepId)
      return false
    }

    for (const step of this.steps) {
      if (!visited.has(step.id)) {
        if (hasCycle(step.id)) return true
      }
    }

    return false
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Domain Events
export class WorkflowExecutionStartedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly executionId: string,
    public readonly workflowName: string,
    public readonly triggeredBy: string
  ) {
    super('WorkflowExecutionStarted', workflowId, {
      workflowId,
      executionId,
      workflowName,
      triggeredBy
    })
  }
}

export class WorkflowStepAddedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly stepId: string,
    public readonly stepName: string,
    public readonly stepType: string
  ) {
    super('WorkflowStepAdded', workflowId, {
      workflowId,
      stepId,
      stepName,
      stepType
    })
  }
}

export class WorkflowStepRemovedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly stepId: string,
    public readonly stepName: string
  ) {
    super('WorkflowStepRemoved', workflowId, {
      workflowId,
      stepId,
      stepName
    })
  }
}

export class WorkflowStepUpdatedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly stepId: string,
    public readonly updatedFields: string[]
  ) {
    super('WorkflowStepUpdated', workflowId, {
      workflowId,
      stepId,
      updatedFields
    })
  }
}

export class WorkflowTriggerUpdatedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly triggerType: string
  ) {
    super('WorkflowTriggerUpdated', workflowId, {
      workflowId,
      triggerType
    })
  }
}

export class WorkflowActivatedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly workflowName: string
  ) {
    super('WorkflowActivated', workflowId, {
      workflowId,
      workflowName
    })
  }
}

export class WorkflowDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly workflowId: string,
    public readonly workflowName: string
  ) {
    super('WorkflowDeactivated', workflowId, {
      workflowId,
      workflowName
    })
  }
}

export class WorkflowClonedEvent extends DomainEvent {
  constructor(
    public readonly newWorkflowId: string,
    public readonly originalWorkflowId: string,
    public readonly newWorkflowName: string,
    public readonly clonedBy: string
  ) {
    super('WorkflowCloned', newWorkflowId, {
      newWorkflowId,
      originalWorkflowId,
      newWorkflowName,
      clonedBy
    })
  }
}
