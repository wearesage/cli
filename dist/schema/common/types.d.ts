/**
 * Base types for the graph schema
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
    hash?: string;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Base interface for all relationship types
 */
export interface Relationship extends GraphEntity {
    type: string;
    startNodeId: string;
    endNodeId: string;
    hash?: string;
    createdAt?: string;
    updatedAt?: string;
    isCrossCodebase?: boolean;
    sourceCodebaseId?: string;
    targetCodebaseId?: string;
    unresolvedComponent?: boolean;
    unresolvedComposable?: boolean;
    unresolvedImport?: boolean;
    _schemaVersion?: string;
}
/**
 * Location information for code elements
 */
export interface CodeLocation {
    file: string;
    startLine: number;
    endLine: number;
    startColumn?: number;
    endColumn?: number;
    offset?: number;
    length?: number;
}
/**
 * Base interface for all code elements (functions, classes, etc.)
 */
export interface CodeElement extends Node, CodeLocation {
    name: string;
    documentation?: string;
    sourceCode?: string;
    isExported?: boolean;
    isDefaultExport?: boolean;
    visibility?: 'public' | 'protected' | 'private';
}
/**
 * Base interface for all named types (classes, interfaces, etc.)
 */
export interface NamedType extends CodeElement {
    description?: string;
    typeParameters?: TypeParameter[];
    decorators?: Decorator[];
}
/**
 * Base interface for all callable elements (functions, methods)
 */
export interface Callable extends CodeElement {
    isAsync: boolean;
    description?: string;
    returnType?: string;
    typeParameters?: TypeParameter[];
    decorators?: Decorator[];
    complexity?: number;
    loc?: number;
}
/**
 * Represents a type parameter (generic)
 */
export interface TypeParameter {
    name: string;
    constraint?: string;
    default?: string;
}
/**
 * Represents a decorator
 */
export interface Decorator {
    name: string;
    arguments?: string[];
    sourceCode?: string;
}
/**
 * Represents a type reference
 */
export interface TypeReference {
    name: string;
    typeArguments?: string[];
    isArray?: boolean;
    isUnion?: boolean;
    isIntersection?: boolean;
    isLiteral?: boolean;
    isTuple?: boolean;
    isFunction?: boolean;
    isConditional?: boolean;
    isIndexed?: boolean;
    isKeyof?: boolean;
    isTypeof?: boolean;
    isImported?: boolean;
    sourceModule?: string;
}
/**
 * Metadata for Neo4j indexing and querying
 */
export interface Neo4jMetadata {
    indexProperties?: string[];
    searchProperties?: string[];
    queryHints?: string[];
}
//# sourceMappingURL=types.d.ts.map