import { Relationship } from '../common/types';

/**
 * Entity suggests a hypothesis about code
 */
export interface Suggests extends Relationship {
  type: 'SUGGESTS';
  confidence: number; // 0-1 scale
  reasoning?: string;
}

/**
 * Metacognitive entity is based on code elements
 */
export interface BasedOn extends Relationship {
  type: 'BASED_ON';
  relevance: number; // 0-1 scale
  context?: string;
}

/**
 * Insight leads to a decision
 */
export interface LeadsTo extends Relationship {
  type: 'LEADS_TO';
  strength: number; // 0-1 scale
  reasoning?: string;
}

/**
 * Insight answers a question
 */
export interface Answers extends Relationship {
  type: 'ANSWERS';
  completeness: number; // 0-1 scale
  explanation?: string;
}

/**
 * Hypothesis contradicts another hypothesis
 */
export interface Contradicts extends Relationship {
  type: 'CONTRADICTS';
  degree: number; // 0-1 scale
  explanation?: string;
}

/**
 * Reflection refines another reflection
 */
export interface Refines extends Relationship {
  type: 'REFINES';
  improvement: number; // 0-1 scale
  aspect?: string;
}

/**
 * Reflection identifies a pattern
 */
export interface Identifies extends Relationship {
  type: 'IDENTIFIES';
  confidence: number; // 0-1 scale
  reasoning?: string;
}

/**
 * Metacognitive entity evolves to another metacognitive entity
 */
export interface EvolvesTo extends Relationship {
  type: 'EVOLVES_TO';
  evolutionType: 'refinement' | 'pivot' | 'expansion' | 'contradiction';
  reasoning?: string;
}

/**
 * Pattern applies to code elements
 */
export interface AppliesTo extends Relationship {
  type: 'APPLIES_TO';
  strength: number; // 0-1 scale
  explanation?: string;
}

/**
 * Task implements a decision
 */
export interface ImplementsDecision extends Relationship {
  type: 'IMPLEMENTS_DECISION';
  completeness: number; // 0-1 scale
  notes?: string;
}

/**
 * Task addresses a hypothesis
 */
export interface Addresses extends Relationship {
  type: 'ADDRESSES';
  approach: string;
  notes?: string;
}

/**
 * Task resolves a question
 */
export interface Resolves extends Relationship {
  type: 'RESOLVES';
  completeness: number; // 0-1 scale
  notes?: string;
}

/**
 * Task applies an insight
 */
export interface Applies extends Relationship {
  type: 'APPLIES';
  approach: string;
  notes?: string;
}

/**
 * Task modifies code elements
 */
export interface Modifies extends Relationship {
  type: 'MODIFIES';
  changeType: 'add' | 'update' | 'delete' | 'refactor';
  notes?: string;
}

/**
 * Task depends on another task
 */
export interface TaskDependsOn extends Relationship {
  type: 'TASK_DEPENDS_ON';
  dependencyType: 'hard' | 'soft';
  notes?: string;
}

/**
 * Task is blocked by another task
 */
export interface TaskBlockedBy extends Relationship {
  type: 'TASK_BLOCKED_BY';
  severity: 'partial' | 'complete';
  reason?: string;
}

/**
 * Task decomposes to subtasks
 */
export interface DecomposesTo extends Relationship {
  type: 'DECOMPOSES_TO';
}

/**
 * Work item is executed by an agent
 */
export interface ExecutedBy extends Relationship {
  type: 'EXECUTED_BY';
}

/**
 * Work product is verified by a validation method
 */
export interface VerifiedBy extends Relationship {
  type: 'VERIFIED_BY';
}