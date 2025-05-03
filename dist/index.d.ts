/**
 * Configuration for the TypeScript codebase to Neo4j graph system
 */
interface Config {
    /**
     * Root directory of the codebase to analyze
     */
    rootDir: string;
    /**
     * Unique identifier for the codebase
     */
    codebaseId: string;
    /**
     * Output directory for the graph data
     */
    outputDir: string;
    /**
     * Neo4j connection configuration
     */
    neo4j?: {
        uri: string;
        username: string;
        password: string;
        database?: string;
        defaultTimeout?: number;
    };
}
/**
 * Main class for the TypeScript codebase to Neo4j graph system
 */
declare class TSCodeGraph {
    private config;
    private tsParser;
    private vueParser;
    private packageParser;
    private transformer;
    private queryExecutor;
    /**
     * Create a new TSCodeGraph instance
     */
    constructor(config: Config);
    /**
     * Process a TypeScript codebase and generate a Neo4j graph
     */
    process(skipValidation?: boolean): Promise<void>;
    /**
     * Find all TypeScript and Vue files in a directory
     */
    private findSourceFiles;
    /**
     * Save the extracted nodes and relationships to files
     */
    private saveResults;
    /**
     * Import the extracted nodes and relationships to Neo4j
     */
    private importToNeo4j;
    /**
     * Build a component registry and resolve component references
     */
    private resolveComponentReferences;
    /**
     * Execute a Cypher query against the Neo4j database
     */
    executeQuery(cypher: string, parameters?: Record<string, any>): Promise<any>;
    /**
     * Execute a Cypher query scoped to this codebase
     */
    executeCodebaseScopedQuery(cypher: string, parameters?: Record<string, any>): Promise<any>;
    /**
     * Execute a Cypher query that spans multiple codebases
     */
    executeCrossCodebaseQuery(cypher: string, parameters?: Record<string, any>): Promise<any>;
    /**
     * Close all connections
     */
    close(): Promise<void>;
    /**
     * Get information about all codebases in the database
     */
    listCodebases(): Promise<any[]>;
    /**
     * Find cross-codebase relationships
     */
    findCrossCodebaseRelationships(): Promise<any[]>;
    /**
     * Find dependencies between codebases
     */
    findCodebaseDependencies(): Promise<any[]>;
}
export { TSCodeGraph, Config };
//# sourceMappingURL=index.d.ts.map