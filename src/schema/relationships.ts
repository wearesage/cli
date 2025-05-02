import { Relationship, TypeReference } from './types.ts';

/**
 * Base import relationship with common properties
 */
interface ImportRelationship extends Relationship {
  imports: string[];
  importCount: number;
  hasDefaultImport: boolean;
  hasNamedImports: boolean;
  hasNamespaceImport: boolean;
  isTypeOnly: boolean;
  importPath: string;
  isRelative: boolean;
  isResolved: boolean;
  resolvedPath?: string;
}

/**
 * Base export relationship with common properties
 */
interface ExportRelationship extends Relationship {
  exports?: string[];
  exportCount: number;
  hasNamedExports: boolean;
  hasNamespaceExport?: boolean;
  isTypeOnly: boolean;
  isReExport: boolean;
}

/**
 * File imports from another file
 */
export interface Imports extends ImportRelationship {
  type: 'IMPORTS';
}

/**
 * File imports from a package
 */
export interface ImportsFromPackage extends ImportRelationship {
  type: 'IMPORTS_FROM_PACKAGE';
  packageName: string;
  packageVersion?: string;
  isDevDependency?: boolean;
  isPeerDependency?: boolean;
}

/**
 * File imports types from another file
 */
export interface ImportsTypes extends ImportRelationship {
  type: 'IMPORTS_TYPES';
  typeNames: string[];
}

/**
 * File imports types from a package
 */
export interface ImportsTypesFromPackage extends ImportRelationship {
  type: 'IMPORTS_TYPES_FROM_PACKAGE';
  packageName: string;
  packageVersion?: string;
  typeNames: string[];
}

/**
 * File exports a local declaration
 */
export interface ExportsLocal extends ExportRelationship {
  type: 'EXPORTS_LOCAL';
  exportNames: string[];
  exportKinds: ('class' | 'interface' | 'function' | 'variable' | 'type' | 'enum')[];
}

/**
 * File exports a default declaration
 */
export interface ExportsDefault extends Relationship {
  type: 'EXPORTS_DEFAULT';
  export: string;
  expression: string;
  exportKind: 'class' | 'interface' | 'function' | 'variable' | 'type' | 'enum' | 'expression';
}

/**
 * File re-exports from another file
 */
export interface Reexports extends ExportRelationship {
  type: 'REEXPORTS';
  sourceFile: string;
  exportNames: string[];
}

/**
 * File re-exports from a package
 */
export interface ReexportsFromPackage extends ExportRelationship {
  type: 'REEXPORTS_FROM_PACKAGE';
  packageName: string;
  packageVersion?: string;
  exportNames: string[];
}

/**
 * File re-exports all from another file
 */
export interface ReexportsAll extends ExportRelationship {
  type: 'REEXPORTS_ALL';
  sourceFile: string;
}

/**
 * Class extends another class
 */
export interface Extends extends Relationship {
  type: 'EXTENDS';
  isDirectExtension: boolean;
  inheritanceLevel?: number;
  typeArguments?: string[];
}

/**
 * Interface extends another interface
 */
export interface InterfaceExtends extends Relationship {
  type: 'INTERFACE_EXTENDS';
  isDirectExtension: boolean;
  inheritanceLevel?: number;
  typeArguments?: string[];
}

/**
 * Class implements an interface
 */
export interface Implements extends Relationship {
  type: 'IMPLEMENTS';
  isPartial: boolean;
  typeArguments?: string[];
}

/**
 * Function or method calls another function or method
 */
export interface Calls extends Relationship {
  type: 'CALLS';
  callCount: number;
  callLocations: { line: number; column: number }[];
  arguments?: string[];
  isAsync: boolean;
  isAwait: boolean;
  isChained: boolean;
  isConditional: boolean;
}

/**
 * Entity contains another entity (e.g., file contains class)
 */
export interface Contains extends Relationship {
  type: 'CONTAINS';
  containerType: 'file' | 'class' | 'interface' | 'namespace' | 'function' | 'method' | 'block';
  containmentType: 'declaration' | 'expression' | 'statement';
  isExported: boolean;
}

/**
 * Class or interface has a method
 */
export interface HasMethod extends Relationship {
  type: 'HAS_METHOD';
  methodType: 'instance' | 'static' | 'abstract';
  visibility: 'public' | 'protected' | 'private';
  isGetter: boolean;
  isSetter: boolean;
  isOverride: boolean;
}

/**
 * Function or method has a parameter
 */
export interface HasParameter extends Relationship {
  type: 'HAS_PARAMETER';
  index: number;
  isOptional: boolean;
  isRest: boolean;
  hasDefaultValue: boolean;
  isDestructured: boolean;
}

/**
 * Class has a property
 */
export interface InterfaceHasProperty extends Relationship {
  type: 'HAS_PROPERTY';
  // Source: Interface or TypeAlias
  // Target: Property
  
  // Additional metadata
  index: number;       // Position in property list
  isOptional: boolean; // Whether property is optional (?)
}

/**
 * Entity references a type
 */
export interface ReferencesType extends Relationship {
  type: 'REFERENCES_TYPE';
  referenceType: 'parameter' | 'return' | 'property' | 'variable' | 'typeAlias' | 'generic';
  isArray: boolean;
  isUnion: boolean;
  isIntersection: boolean;
  isGeneric: boolean;
  typeArguments?: string[];
}

/**
 * Entity references a variable
 */
export interface ReferencesVariable extends Relationship {
  type: 'REFERENCES_VARIABLE';
  referenceType: 'read' | 'write' | 'readwrite';
  referenceCount: number;
  referenceLocations: { line: number; column: number }[];
}

/**
 * Entity depends on another entity
 */
export interface DependsOn extends Relationship {
  type: 'DEPENDS_ON';
  dependencyType: 'import' | 'call' | 'reference' | 'extend' | 'implement';
  isStrong: boolean;
  isWeak: boolean;
  weight: number;
}

/**
 * Entity is decorated by a decorator
 */
export interface IsDecoratedBy extends Relationship {
  type: 'IS_DECORATED_BY';
  decoratorName: string;
  decoratorArguments?: string[];
  targetType: 'class' | 'method' | 'property' | 'parameter';
}

/**
 * Entity is a test for another entity
 */
export interface Tests extends Relationship {
  type: 'TESTS';
  testType: 'unit' | 'integration' | 'e2e';
  framework: 'jest' | 'mocha' | 'jasmine' | 'other';
  assertionCount?: number;
}

/**
 * Entity is a component that renders another component
 */
export interface Renders extends Relationship {
  type: 'RENDERS';
  renderCount: number;
  renderLocations: { line: number; column: number }[];
  isConditional: boolean;
  props?: Record<string, string>;
}

/**
 * Entity is a component that uses a hook
 */
export interface UsesHook extends Relationship {
  type: 'USES_HOOK';
  hookName: string;
  hookArguments?: string[];
  isCustomHook: boolean;
}

/**
 * Represents AST parent-child relationship
 */
export interface ASTParentChild extends Relationship {
  type: 'AST_PARENT_CHILD';
  childIndex: number;
  nodeKind: number;
  isStatement: boolean;
  isExpression: boolean;
  isDeclaration: boolean;
}

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
export interface Implements extends Relationship {
  type: 'IMPLEMENTS';
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