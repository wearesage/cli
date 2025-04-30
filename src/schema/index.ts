/**
 * Schema for TypeScript codebase to Neo4j graph representation
 * 
 * This schema defines the structure of the graph representation of a TypeScript codebase.
 * It includes node types, relationship types, and utility types for representing TypeScript
 * code elements and their relationships.
 */

// Export base types
export * from './types.ts';

// Export node types
export * from './nodes.ts';

// Export relationship types
export * from './relationships.ts';

// Export schema version and metadata
export const SCHEMA_VERSION = '2.0.0';

export const SCHEMA_METADATA = {
  name: 'TypeScript Code Graph Schema',
  version: SCHEMA_VERSION,
  description: 'A comprehensive schema for representing TypeScript codebases as a graph',
  author: 'TypeScript Code Graph Team',
  license: 'MIT',
  repository: 'https://github.com/typescript-code-graph/schema',
  nodeTypes: [
    'Codebase', 'Package', 'Directory', 'File', 'Module', 'Namespace',
    'Class', 'Interface', 'Enum', 'TypeAlias', 'Function', 'Method',
    'Constructor', 'Property', 'Variable', 'Parameter', 'JsxElement',
    'JsxAttribute', 'Test', 'Component', 'Dependency', 'TypeDefinition',
    'ASTNodeInfo'
  ],
  relationshipTypes: [
    'IMPORTS', 'IMPORTS_FROM_PACKAGE', 'IMPORTS_TYPES', 'IMPORTS_TYPES_FROM_PACKAGE',
    'EXPORTS_LOCAL', 'EXPORTS_DEFAULT', 'REEXPORTS', 'REEXPORTS_FROM_PACKAGE',
    'REEXPORTS_ALL', 'EXTENDS', 'INTERFACE_EXTENDS', 'IMPLEMENTS', 'CALLS',
    'CONTAINS', 'HAS_METHOD', 'HAS_PARAMETER', 'HAS_PROPERTY', 'REFERENCES_TYPE',
    'REFERENCES_VARIABLE', 'DEPENDS_ON', 'IS_DECORATED_BY', 'TESTS', 'RENDERS',
    'USES_HOOK', 'AST_PARENT_CHILD', 'DEFINES_VARIABLE', 'DEFINES_FUNCTION',
    'DEFINES_INTERFACE', 'DEFINES_CLASS', 'DEFINES_TYPE_ALIAS', 'DEFINES_ENUM',
    'DEFINES_NAMESPACE', 'DEFINES_MODULE', 'DEFINES_COMPONENT'
  ],
  neo4jIndexes: [
    { label: 'File', property: 'path', type: 'BTREE' },
    { label: 'CodeElement', property: 'name', type: 'BTREE' },
    { label: 'Node', property: 'codebaseId', type: 'BTREE' },
    { label: 'Class', property: 'name', type: 'BTREE' },
    { label: 'Function', property: 'name', type: 'BTREE' },
    { label: 'Variable', property: 'name', type: 'BTREE' },
    { label: 'Component', property: 'name', type: 'BTREE' }
  ],
  neo4jConstraints: [
    { label: 'Node', property: 'nodeId', type: 'UNIQUENESS' }
  ],
  neo4jFullTextIndexes: [
    { name: 'codeSearch', labels: ['CodeElement'], properties: ['name', 'documentation', 'sourceCode'] }
  ]
};