"use strict";
/**
 * Schema for Neo4j graph representation
 *
 * This schema defines the structure of the graph representation organized by domains:
 * - code: Code-related entities (files, classes, functions, etc.)
 * - mind: Metacognitive entities (hypotheses, reflections, insights, etc.)
 * - crypto: Crypto-related entities (to be designed)
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
// Export common types
__exportStar(require("./common"), exports);
// Export domain-specific types
__exportStar(require("./code"), exports);
__exportStar(require("./mind"), exports);
__exportStar(require("./crypto"), exports);
// Export schema version and metadata
exports.SCHEMA_VERSION = "3.0.0";
exports.SCHEMA_METADATA = {
    name: "Domain-Organized Graph Schema",
    version: exports.SCHEMA_VERSION,
    description: "A comprehensive schema for representing entities as a graph, organized by domain",
    author: "SAGE Team",
    license: "MIT",
    domains: ["code", "mind", "crypto"],
    nodeTypes: [
        // Code domain
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
        "InterfaceProperty",
        "VueComponent",
        "ComponentTemplate",
        "ComponentScript",
        "ComponentStyle",
        "Prop",
        "Emit",
        "ReactiveState",
        "Composable",
        "SassVariable",
        "SassMixin",
        "SassModule",
        // Mind domain
        "Hypothesis",
        "Reflection",
        "Insight",
        "Question",
        "Decision",
        "Pattern",
        "Task",
        "Subtask",
        "Agent",
        "Verification",
        "Result",
        "Orientation",
        // Crypto domain
        "Layer0",
        "Layer1",
        "Layer2",
        "Layer3",
        "Token",
        "InteroperabilitySolution",
        "Organization",
    ],
    relationshipTypes: [
        // Code domain
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
        "DEFINES_VUE_COMPONENT",
        "PROVIDES_PROPS",
        "LISTENS_TO",
        "USES_SLOT",
        "USES_COMPOSABLE",
        "IMPORTS_AUTO",
        "REGISTERS_AUTO",
        "IMPORTS_SASS",
        "USES_VARIABLE",
        "INCLUDES_MIXIN",
        // Mind domain
        "SUGGESTS",
        "BASED_ON",
        "LEADS_TO",
        "ANSWERS",
        "CONTRADICTS",
        "REFINES",
        "IDENTIFIES",
        "EVOLVES_TO",
        "APPLIES_TO",
        "IMPLEMENTS_DECISION",
        "ADDRESSES",
        "RESOLVES",
        "APPLIES",
        "MODIFIES",
        "TASK_DEPENDS_ON",
        "TASK_BLOCKED_BY",
        "DECOMPOSES_TO",
        "EXECUTED_BY",
        "VERIFIED_BY",
        // Crypto domain
        "BUILDS_ON",
        "CONNECTS",
        "ISSUES",
        "DEVELOPS",
        "SUPPORTS",
        "BRIDGES",
        "PARTNERS_WITH",
        {
            name: "cryptoSearch",
            labels: ["Layer0", "Layer1", "Layer2", "Layer3", "Token", "InteroperabilitySolution", "Organization"],
            properties: ["name", "description", "symbol"],
        },
    ],
    neo4jIndexes: [
        { label: "File", property: "path", type: "BTREE" },
        { label: "CodeElement", property: "name", type: "BTREE" },
        { label: "Node", property: "codebaseId", type: "BTREE" },
        { label: "Class", property: "name", type: "BTREE" },
        { label: "Function", property: "name", type: "BTREE" },
        { label: "Variable", property: "name", type: "BTREE" },
        { label: "Component", property: "name", type: "BTREE" },
        { label: "Task", property: "title", type: "BTREE" },
        { label: "Subtask", property: "title", type: "BTREE" },
        { label: "Agent", property: "name", type: "BTREE" },
        { label: "InterfaceProperty", property: "name", type: "BTREE" },
        { label: "VueComponent", property: "name", type: "BTREE" },
        { label: "Prop", property: "name", type: "BTREE" },
        { label: "Emit", property: "name", type: "BTREE" },
        { label: "ReactiveState", property: "name", type: "BTREE" },
        { label: "Composable", property: "name", type: "BTREE" },
        { label: "Hypothesis", property: "title", type: "BTREE" },
        { label: "Reflection", property: "title", type: "BTREE" },
        { label: "Insight", property: "title", type: "BTREE" },
        { label: "Token", property: "symbol", type: "BTREE" },
        { label: "Layer0", property: "name", type: "BTREE" },
        { label: "Layer1", property: "name", type: "BTREE" },
        { label: "Layer2", property: "name", type: "BTREE" },
        { label: "Layer3", property: "name", type: "BTREE" },
        { label: "InteroperabilitySolution", property: "name", type: "BTREE" },
        { label: "Organization", property: "name", type: "BTREE" },
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
        {
            name: "mindSearch",
            labels: ["Hypothesis", "Reflection", "Insight", "Question", "Decision", "Pattern"],
            properties: ["title", "content", "description"],
        },
    ],
};
//# sourceMappingURL=index.js.map