/**
 * Base types for the TypeScript codebase to Neo4j graph schema
 */

/**
 * Base interface for all graph entities (nodes and relationships)
 */
export interface GraphEntity {
  nodeId: string;
  codebaseId: string;
}

/**
 * Base interface for all node types
 */
export interface Node extends GraphEntity {
  labels: string[];
  hash?: string;  // Hash of the node content for change detection
  createdAt?: string;  // Timestamp when the node was created
  updatedAt?: string;  // Timestamp when the node was last updated
}

/**
 * Base interface for all relationship types
 */
export interface Relationship extends GraphEntity {
  type: string;
  startNodeId: string;
  endNodeId: string;
  hash?: string;  // Hash of the relationship content for change detection
  createdAt?: string;  // Timestamp when the relationship was created
  updatedAt?: string;  // Timestamp when the relationship was last updated
  isCrossCodebase?: boolean;  // Whether this relationship crosses codebase boundaries
  sourceCodebaseId?: string;  // The codebase ID of the start node (for cross-codebase relationships)
  targetCodebaseId?: string;  // The codebase ID of the end node (for cross-codebase relationships)
}

/**
 * Location information for code elements
 */
export interface CodeLocation {
  file: string;
  startLine: number;
  endLine: number;
  startColumn?: number;  // Start column for more precise location
  endColumn?: number;    // End column for more precise location
  offset?: number;       // Offset in the file
  length?: number;       // Length of the code element
}

/**
 * Base interface for all code elements (functions, classes, etc.)
 */
export interface CodeElement extends Node, CodeLocation {
  name: string;
  documentation?: string;  // JSDoc or other documentation
  sourceCode?: string;     // Original source code
  isExported?: boolean;    // Whether the element is exported
  isDefaultExport?: boolean; // Whether the element is a default export
  visibility?: 'public' | 'protected' | 'private'; // Visibility modifier
}

/**
 * Base interface for all named types (classes, interfaces, etc.)
 */
export interface NamedType extends CodeElement {
  description?: string;
  typeParameters?: TypeParameter[];  // Generic type parameters
  decorators?: Decorator[];          // TypeScript decorators
}

/**
 * Base interface for all callable elements (functions, methods)
 */
export interface Callable extends CodeElement {
  isAsync: boolean;
  description?: string;
  returnType?: string;              // Return type as a string
  typeParameters?: TypeParameter[]; // Generic type parameters
  decorators?: Decorator[];         // TypeScript decorators
  complexity?: number;              // Cyclomatic complexity
  loc?: number;                     // Lines of code
}

/**
 * Represents a type parameter (generic)
 */
export interface TypeParameter {
  name: string;
  constraint?: string;  // extends clause
  default?: string;     // default type
}

/**
 * Represents a decorator
 */
export interface Decorator {
  name: string;
  arguments?: string[];  // Arguments passed to the decorator
  sourceCode?: string;   // Original source code
}

/**
 * Represents a type reference
 */
export interface TypeReference {
  name: string;
  typeArguments?: string[];  // Generic type arguments
  isArray?: boolean;         // Whether it's an array type
  isUnion?: boolean;         // Whether it's a union type
  isIntersection?: boolean;  // Whether it's an intersection type
  isLiteral?: boolean;       // Whether it's a literal type
  isTuple?: boolean;         // Whether it's a tuple type
  isFunction?: boolean;      // Whether it's a function type
  isConditional?: boolean;   // Whether it's a conditional type
  isIndexed?: boolean;       // Whether it's an indexed access type
  isKeyof?: boolean;         // Whether it's a keyof type
  isTypeof?: boolean;        // Whether it's a typeof type
  isImported?: boolean;      // Whether it's imported from another module
  sourceModule?: string;     // Source module if imported
}

/**
 * Metadata for Neo4j indexing and querying
 */
export interface Neo4jMetadata {
  indexProperties?: string[];  // Properties to index
  searchProperties?: string[]; // Properties to include in full-text search
  queryHints?: string[];       // Hints for optimizing queries
}