import { Node, CodeElement, NamedType, Callable, Decorator } from "./types.ts";

/**
 * Represents an entire codebase
 */
export interface Codebase extends Node {
  name: string;
  createdAt: string;
  description?: string;
  version?: string;
  rootPath?: string;
  repositoryUrl?: string;
  language: "typescript" | "javascript" | "mixed";
}

/**
 * Represents a package (npm package, etc.)
 */
export interface Package extends Node {
  name: string;
  path: string;
  absolutePath: string;
  version?: string;
  description?: string;
  author?: string;
  license?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  isLocal?: boolean;
}

/**
 * Represents a directory in the codebase
 */
export interface Directory extends Node {
  path: string;
  absolutePath: string;
  name: string;
  parentPath?: string;
  isRoot?: boolean;
}

/**
 * Represents a file in the codebase
 */
export interface File extends Node {
  path: string;
  absolutePath: string;
  name: string;
  extension: string;
  language: string;
  lineCount: number;
  size: number;
  hash?: string;
  hasDefaultExport: boolean;
  defaultExportExpression?: string;
  hasNamedExports: boolean;
  namedExports?: string[];
  hasCommonJSExport: boolean;
  commonJSExportExpression?: string;
  importCount?: number;
  exportCount?: number;
  isTest?: boolean;
  isTypeDefinition?: boolean;
  isModule?: boolean;
  isEntry?: boolean;
  parentDirectory?: string;
}

/**
 * Represents a module in the codebase
 */
export interface Module extends Node {
  name: string;
  path: string;
  isInternal: boolean;
  isThirdParty: boolean;
  sourceFile?: string;
}

/**
 * Represents a namespace declaration
 */
export interface Namespace extends NamedType {
  isGlobal: boolean;
  isAmbient: boolean;
}

/**
 * Represents a class declaration
 */
export interface Class extends NamedType {
  isAbstract: boolean;
  isGeneric: boolean;
  hasConstructor: boolean;
  constructorParams?: string;
  methodCount?: number;
  propertyCount?: number;
  staticMethodCount?: number;
  staticPropertyCount?: number;
  privateMethodCount?: number;
  privatePropertyCount?: number;
  protectedMethodCount?: number;
  protectedPropertyCount?: number;
  publicMethodCount?: number;
  publicPropertyCount?: number;
  implementsCount?: number;
  extendsClass?: string;
  implementsInterfaces?: string[];
  isExported: boolean;
  isDefaultExport: boolean;
  hasDecorators: boolean;
}

/**
 * Represents an interface declaration
 */
export interface Interface extends NamedType {
  isGeneric: boolean;
  methodCount?: number;
  propertyCount?: number;
  extendsCount?: number;
  extendsInterfaces?: string[];
  isExported: boolean;
  isDefaultExport: boolean;
}

/**
 * Represents an enum declaration
 */
export interface Enum extends NamedType {
  isConst: boolean;
  members: EnumMember[];
  isExported: boolean;
  isDefaultExport: boolean;
}

/**
 * Represents an enum member
 */
export interface EnumMember extends CodeElement {
  value?: string | number;
  isComputed: boolean;
}

/**
 * Represents a type alias declaration
 */
export interface TypeAlias extends NamedType {
  definition: string;
  isGeneric: boolean;
  isUnion: boolean;
  isIntersection: boolean;
  isExported: boolean;
  isDefaultExport: boolean;
  referencedTypes?: string[];
}

/**
 * Represents a function declaration or expression
 */
export interface Function extends Callable {
  parameterCount: number;
  isExported: boolean;
  isDefaultExport: boolean;
  isGenerator: boolean;
  isArrowFunction: boolean;
  isFunctionExpression: boolean;
  hasRestParameter: boolean;
  hasOptionalParameters: boolean;
  hasTypeParameters: boolean;
  callExpressions?: string[];
  referencedVariables?: string[];
  referencedFunctions?: string[];
  referencedTypes?: string[];
}

/**
 * Represents a method in a class or interface
 */
export interface Method extends Callable {
  isStatic: boolean;
  visibility: "public" | "protected" | "private";
  isAbstract: boolean;
  isGenerator: boolean;
  isGetter: boolean;
  isSetter: boolean;
  parameterCount: number;
  hasRestParameter: boolean;
  hasOptionalParameters: boolean;
  hasTypeParameters: boolean;
  callExpressions?: string[];
  referencedVariables?: string[];
  referencedFunctions?: string[];
  referencedTypes?: string[];
  overrides?: boolean;
  overridesMethod?: string;
}

/**
 * Represents a constructor in a class
 */
export interface Constructor extends Callable {
  visibility: "public" | "protected" | "private";
  parameterCount: number;
  hasRestParameter: boolean;
  hasOptionalParameters: boolean;
  hasParameterProperties: boolean;
  callExpressions?: string[];
  referencedVariables?: string[];
  referencedFunctions?: string[];
  referencedTypes?: string[];
}

/**
 * Represents a property in a class or interface
 */
export interface Property extends CodeElement {
  isStatic: boolean;
  visibility: "public" | "protected" | "private";
  isReadonly: boolean;
  isOptional: boolean;
  typeString?: string;
  initializer?: string;
  isParameterProperty: boolean;
  hasDecorators: boolean;
  decorators?: Decorator[];
}

/**
 * Represents a variable declaration
 */
export interface Variable extends CodeElement {
  isConstant: boolean;
  scope: "global" | "module" | "function" | "block";
  typeString?: string;
  initializer?: string;
  isExported?: boolean;
  isDefaultExport?: boolean;
  isDestructured?: boolean;
  isArray?: boolean;
  isObject?: boolean;
  referencedVariables?: string[];
  referencedFunctions?: string[];
  referencedTypes?: string[];
}

/**
 * Represents a function or method parameter
 */
export interface Parameter extends CodeElement {
  index: number;
  isOptional: boolean;
  isRest: boolean;
  typeString?: string;
  initializer?: string;
  isParameterProperty: boolean;
  hasDecorators: boolean;
  decorators?: Decorator[];
}

/**
 * Represents a JSX/TSX element (React component)
 */
export interface JsxElement extends CodeElement {
  tagName: string;
  isComponent: boolean;
  isSelfClosing: boolean;
  hasChildren: boolean;
  attributes?: JsxAttribute[];
  parentElement?: string;
  childElements?: string[];
}

/**
 * Represents a JSX/TSX attribute
 */
export interface JsxAttribute extends CodeElement {
  value?: string;
  isSpread: boolean;
  isExpression: boolean;
}

/**
 * Represents a test (unit test, integration test, etc.)
 */
export interface Test extends CodeElement {
  type: "unit" | "integration" | "e2e" | "other";
  framework?: "jest" | "mocha" | "jasmine" | "other";
  testTarget?: string;
  assertions?: number;
  isAsync: boolean;
}

/**
 * Represents a component (React, Vue, etc.)
 */
export interface Component extends NamedType {
  framework: "react" | "vue" | "angular" | "svelte" | "other";
  isFunction: boolean;
  isClass: boolean;
  hasProps: boolean;
  hasState: boolean;
  propsInterface?: string;
  stateInterface?: string;
  isExported: boolean;
  isDefaultExport: boolean;
  hasJsx: boolean;
  hasHooks: boolean;
  hooks?: string[];
}

/**
 * Represents a dependency (npm package, etc.)
 */
export interface Dependency extends Node {
  name: string;
  version: string;
  isDevDependency: boolean;
  isPeerDependency: boolean;
  isOptionalDependency: boolean;
  isDirectDependency: boolean;
  isTransitiveDependency: boolean;
  importCount?: number;
}

/**
 * Represents a type definition
 */
export interface TypeDefinition extends NamedType {
  source: "local" | "dependency" | "standard";
  packageName?: string;
  isExported: boolean;
  isDefaultExport: boolean;
}

/**
 * Represents direct AST node information
 */
export interface ASTNodeInfo extends Node {
  nodeType: string; // Type of AST node
  nodeKind: number; // TypeScript AST node kind
  startPos: number; // Start position in source file
  endPos: number; // End position in source file
  parentNode?: string; // ID of parent AST node
  childNodes?: string[]; // IDs of child AST nodes
  flags?: number; // TypeScript node flags
}

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

/**
 * Property of an Interface or Type
 */
export interface InterfaceProperty extends Node {
  type: "InterfaceProperty";
  name: string;
  typeString: string;
  description?: string;
  isOptional: boolean;
  defaultValue?: string;
}
