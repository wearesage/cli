"use strict";
/**
 * Schema for TypeScript codebase to Neo4j graph representation
 *
 * This schema defines the structure of the graph representation of a TypeScript codebase.
 * It includes node types, relationship types, and utility types for representing TypeScript
 * code elements and their relationships.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA_METADATA = exports.SCHEMA_VERSION = void 0;
// Export base types
__exportStar(require("./types"), exports);
// Export node types
__exportStar(require("./nodes"), exports);
// Export relationship types
__exportStar(require("./relationships"), exports);
// Export schema version and metadata
exports.SCHEMA_VERSION = "2.0.0";
exports.SCHEMA_METADATA = {
    name: "TypeScript Code Graph Schema",
    version: exports.SCHEMA_VERSION,
    description: "A comprehensive schema for representing TypeScript codebases as a graph",
    author: "TypeScript Code Graph Team",
    license: "MIT",
    repository: "https://github.com/typescript-code-graph/schema",
    nodeTypes: [
        "Codebase",
        "Package",
        "Directory",
        "File",
        "Module",
        "Namespace",
        "Class",
        "Interface",
        "Enum",
        "TypeAlias",
        "Function",
        "Method",
        "Constructor",
        "Property",
        "Variable",
        "Parameter",
        "JsxElement",
        "JsxAttribute",
        "Test",
        "Component",
        "Dependency",
        "TypeDefinition",
        "ASTNodeInfo",
        "Task",
        "Subtask",
        "Agent",
        "Verification",
        "Result",
        "Orientation",
        "InterfaceProperty",
        "VueComponent",
        "ComponentTemplate",
        "ComponentScript",
        "ComponentStyle",
        "Prop",
        "Emit",
        "ReactiveState",
        "Composable",
    ],
    relationshipTypes: [
        "IMPORTS",
        "IMPORTS_FROM_PACKAGE",
        "IMPORTS_TYPES",
        "IMPORTS_TYPES_FROM_PACKAGE",
        "EXPORTS_LOCAL",
        "EXPORTS_DEFAULT",
        "REEXPORTS",
        "REEXPORTS_FROM_PACKAGE",
        "REEXPORTS_ALL",
        "EXTENDS",
        "INTERFACE_EXTENDS",
        "IMPLEMENTS",
        "CALLS",
        "CONTAINS",
        "HAS_METHOD",
        "HAS_PARAMETER",
        "HAS_PROPERTY",
        "REFERENCES_TYPE",
        "REFERENCES_VARIABLE",
        "DEPENDS_ON",
        "IS_DECORATED_BY",
        "TESTS",
        "RENDERS",
        "USES_HOOK",
        "AST_PARENT_CHILD",
        "DEFINES_VARIABLE",
        "DEFINES_FUNCTION",
        "DEFINES_INTERFACE",
        "DEFINES_CLASS",
        "DEFINES_TYPE_ALIAS",
        "DEFINES_ENUM",
        "DEFINES_NAMESPACE",
        "DEFINES_MODULE",
        "DEFINES_COMPONENT",
        'DECOMPOSES_TO', 'EXECUTED_BY', 'VERIFIED_BY',
        'DEFINES_VUE_COMPONENT', 'PROVIDES_PROPS', 'LISTENS_TO', 'USES_SLOT', 'USES_COMPOSABLE'
    ],
    neo4jIndexes: [
        { label: "File", property: "path", type: "BTREE" },
        { label: "CodeElement", property: "name", type: "BTREE" },
        { label: "Node", property: "codebaseId", type: "BTREE" },
        { label: "Class", property: "name", type: "BTREE" },
        { label: "Function", property: "name", type: "BTREE" },
        { label: "Variable", property: "name", type: "BTREE" },
        { label: "Component", property: "name", type: "BTREE" },
        { label: 'Task', property: 'title', type: 'BTREE' },
        { label: 'Subtask', property: 'title', type: 'BTREE' },
        { label: 'Agent', property: 'name', type: 'BTREE' },
        { label: 'InterfaceProperty', property: 'name', type: 'BTREE' },
        { label: 'VueComponent', property: 'name', type: 'BTREE' },
        { label: 'Prop', property: 'name', type: 'BTREE' },
        { label: 'Emit', property: 'name', type: 'BTREE' },
        { label: 'ReactiveState', property: 'name', type: 'BTREE' },
        { label: 'Composable', property: 'name', type: 'BTREE' }
    ],
    neo4jConstraints: [{ label: "Node", property: "nodeId", type: "UNIQUENESS" }],
    neo4jFullTextIndexes: [
        {
            name: "codeSearch",
            labels: ["CodeElement"],
            properties: ["name", "documentation", "sourceCode"],
        },
        {
            name: "vueComponentSearch",
            labels: ["VueComponent", "ComponentTemplate", "ComponentScript", "Composable"],
            properties: ["name", "path"],
        },
    ],
};
//# sourceMappingURL=index.js.map