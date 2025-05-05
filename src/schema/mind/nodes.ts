import { Node } from "../common/types";

/**
 * Represents a hypothesis about code
 */
export interface Hypothesis extends Node {
  title: string;
  description: string;
  confidence: number; // 0-1 scale
  status: "unverified" | "confirmed" | "refuted";
  createdBy: "human" | "ai" | "system";
  evidence?: string[];
  tags?: string[];
}

/**
 * Represents a reflection on code
 */
export interface Reflection extends Node {
  title: string;
  content: string;
  depth: number; // Meta-level (1 = about code, 2 = about reflections on code, etc.)
  perspective:
    | "performance"
    | "security"
    | "maintainability"
    | "architecture"
    | "other";
  createdBy: "human" | "ai" | "system";
  tags?: string[];
}

/**
 * Represents an insight derived from code analysis
 */
export interface Insight extends Node {
  title: string;
  content: string;
  novelty: number; // 0-1 scale
  actionability: number; // 0-1 scale
  impact: "low" | "medium" | "high";
  createdBy: "human" | "ai" | "system";
  tags?: string[];
}

/**
 * Represents a question about code
 */
export interface Question extends Node {
  text: string;
  status: "open" | "answered";
  complexity: "simple" | "complex";
  createdBy: "human" | "ai" | "system";
  answer?: string;
  tags?: string[];
}

/**
 * Represents a decision about code
 */
export interface Decision extends Node {
  title: string;
  description: string;
  status: "proposed" | "implemented" | "reverted";
  rationale: string;
  createdBy: "human" | "ai" | "system";
  alternatives?: string[];
  tags?: string[];
}

/**
 * Represents a pattern identified in code
 */
export interface Pattern extends Node {
  name: string;
  description: string;
  frequency: number; // How many times it appears
  intentionality: "deliberate" | "accidental";
  quality: "anti-pattern" | "best-practice" | "neutral";
  createdBy: "human" | "ai" | "system";
  examples?: string[];
  tags?: string[];
}

/**
 * Represents a task to be completed
 */
export interface Task extends Node {
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "deferred" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  effort: "trivial" | "minor" | "major" | "significant";
  assignedTo?: string;
  dueDate?: string;
  createdBy: "human" | "ai" | "system";
  completedAt?: string;
  tags?: string[];
}

/**
 * Represents a component piece of work derived from a Task
 */
export interface Subtask extends Node {
  nodeId: string;
  title: string;
  description?: string;
  status?: "Not Started" | "In Progress" | "Completed" | "Blocked";
  createdAt: string;
  createdBy?: string;
}

/**
 * Represents an entity responsible for performing work
 */
export interface Agent extends Node {
  nodeId: string;
  name: string;
  type: string;
  capabilities?: string[];
  createdAt: string;
}

/**
 * Represents a validation checkpoint ensuring quality
 */
export interface Verification extends Node {
  nodeId: string;
  title: string;
  description?: string;
  method: string;
  createdAt: string;
}

/**
 * Represents concrete outcomes and artifacts produced
 */
export interface Result extends Node {
  nodeId: string;
  title: string;
  description?: string;
  content?: string;
  createdBy?: string;
}

/**
 * Represents a high-level orientation or framing of the project
 */
export interface Orientation extends Node {
  nodeId: string;
  title: string;
  content: string;
  createdAt: string;
  createdBy?: string;
}