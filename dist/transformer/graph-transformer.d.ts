import { Node, Relationship } from '../schema/index';
/**
 * Result of a graph transformation
 */
export interface TransformResult {
    /**
     * Nodes in the graph
     */
    nodes: Node[];
    /**
     * Relationships in the graph
     */
    relationships: Relationship[];
}
/**
 * Configuration for the graph transformer
 */
export interface GraphTransformerConfig {
    /**
     * Unique identifier for the codebase
     */
    codebaseId: string;
}
/**
 * Transformer for converting parsed TypeScript data into a graph model
 */
export declare class GraphTransformer {
    private config;
    /**
     * Create a new graph transformer
     */
    constructor(config: GraphTransformerConfig);
    /**
     * Transform parsed TypeScript data into a graph model
     */
    transform(parseResults: any[]): TransformResult;
    /**
     * Deduplicate nodes by nodeId
     */
    private deduplicateNodes;
    /**
     * Deduplicate relationships by nodeId
     */
    private deduplicateRelationships;
    /**
     * Validate the graph model
     */
    validate(result: TransformResult): boolean;
    /**
     * Check if a node is valid
     */
    private isValidNode;
    /**
     * Ensure nodes have appropriate labels based on their interfaces
     * This is crucial for Neo4j schema alignment
     */
    private ensureNodeLabels;
    /**
     * Check if a relationship is valid
     */
    private isValidRelationship;
    /**
     * Derive additional semantic relationships from existing relationships
     * This is where we can add higher-level relationships based on the lower-level ones
     */
    private deriveAdditionalRelationships;
}
//# sourceMappingURL=graph-transformer.d.ts.map