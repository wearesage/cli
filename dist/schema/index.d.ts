/**
 * Schema for TypeScript codebase to Neo4j graph representation
 *
 * This schema defines the structure of the graph representation of a TypeScript codebase.
 * It includes node types, relationship types, and utility types for representing TypeScript
 * code elements and their relationships.
 */
export * from "./types";
export * from "./nodes";
export * from "./relationships";
export declare const SCHEMA_VERSION = "2.0.0";
export declare const SCHEMA_METADATA: {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    repository: string;
    nodeTypes: string[];
    relationshipTypes: string[];
    neo4jIndexes: {
        label: string;
        property: string;
        type: string;
    }[];
    neo4jConstraints: {
        label: string;
        property: string;
        type: string;
    }[];
    neo4jFullTextIndexes: {
        name: string;
        labels: string[];
        properties: string[];
    }[];
};
//# sourceMappingURL=index.d.ts.map