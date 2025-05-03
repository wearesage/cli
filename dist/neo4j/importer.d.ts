import { Node, Relationship } from '../schema/index';
/**
 * Configuration for the Neo4j importer
 */
export interface Neo4jImporterConfig {
    /**
     * Neo4j connection URI
     */
    uri: string;
    /**
     * Neo4j username
     */
    username: string;
    /**
     * Neo4j password
     */
    password: string;
    /**
     * Neo4j database name (optional)
     */
    database?: string;
    /**
     * Batch size for imports (default: 1000)
     */
    batchSize?: number;
    /**
     * Schema migration configuration (optional)
     */
    migration?: {
        /**
         * Whether to automatically migrate schema on import (default: true)
         */
        autoMigrate?: boolean;
        /**
         * Whether to back up data before migration (default: false)
         */
        backupBeforeMigration?: boolean;
    };
}
/**
 * Importer for Neo4j graph database
 */
export declare class Neo4jImporter {
    private driver;
    private config;
    /**
     * Create a new Neo4j importer
     */
    constructor(config: Neo4jImporterConfig);
    /**
     * Import nodes and relationships into Neo4j
     */
    import(nodes: Node[], relationships: Relationship[]): Promise<void>;
    /**
     * Import nodes into Neo4j in batches
     */
    private importNodes;
    /**
     * Import a batch of nodes into Neo4j
     */
    private importNodeBatch;
    /**
     * Import relationships into Neo4j in batches
     */
    private importRelationships;
    /**
     * Import a batch of relationships into Neo4j
     */
    private importRelationshipBatch;
    /**
     * Group relationships by type for batch processing
     */
    private groupRelationshipsByType;
    /**
     * Prepare a node for import into Neo4j
     */
    private prepareNodeForImport;
    /**
     * Prepare a relationship for import into Neo4j
     */
    private prepareRelationshipForImport;
    /**
     * Prepare relationship properties for import into Neo4j
     */
    private prepareRelationshipPropertiesForImport;
    /**
     * Convert complex properties to primitives for Neo4j compatibility
     */
    private convertComplexPropertiesToPrimitives;
    /**
     * Check for Map objects in a nested object structure
     */
    private checkForMapObjects;
    /**
     * Update node properties based on their relationships
     */
    private updateNodeProperties;
    /**
     * Get a Cypher parameter for setting labels
     */
    private getLabelsParam;
    /**
     * Get a Neo4j session
     */
    private getSession;
    /**
     * Links existing Insight nodes to their respective Codebase nodes
     */
    private linkInsightsToCodebases;
    /**
     * Close the Neo4j driver
     */
    close(): Promise<void>;
}
//# sourceMappingURL=importer.d.ts.map