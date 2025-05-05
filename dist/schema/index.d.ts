/**
 * Schema for Neo4j graph representation
 *
 * This schema defines the structure of the graph representation organized by domains:
 * - code: Code-related entities (files, classes, functions, etc.)
 * - mind: Metacognitive entities (hypotheses, reflections, insights, etc.)
 * - crypto: Crypto-related entities (to be designed)
 */
export * from "./common";
export * from "./code";
export * from "./mind";
export * from "./crypto";
export declare const SCHEMA_VERSION = "3.0.0";
export declare const SCHEMA_METADATA: {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    domains: string[];
    nodeTypes: string[];
    relationshipTypes: (string | {
        name: string;
        labels: string[];
        properties: string[];
    })[];
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