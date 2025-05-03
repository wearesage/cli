/**
 * Result of a Neo4j query
 */
export interface QueryResult {
    /**
     * Records returned by the query
     */
    records: any[];
    /**
     * Summary of the query execution
     */
    summary: {
        /**
         * Query execution time in milliseconds
         */
        executionTime: number;
        /**
         * Number of records returned
         */
        recordCount: number;
        /**
         * Whether the query was successful
         */
        success: boolean;
        /**
         * Query statistics
         */
        stats: {
            /**
             * Number of nodes created
             */
            nodesCreated: number;
            /**
             * Number of nodes deleted
             */
            nodesDeleted: number;
            /**
             * Number of relationships created
             */
            relationshipsCreated: number;
            /**
             * Number of relationships deleted
             */
            relationshipsDeleted: number;
            /**
             * Number of properties set
             */
            propertiesSet: number;
            /**
             * Number of labels added
             */
            labelsAdded: number;
            /**
             * Number of labels removed
             */
            labelsRemoved: number;
        };
    };
}
/**
 * Configuration for the Neo4j query executor
 */
export interface QueryExecutorConfig {
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
     * Default timeout for queries in milliseconds (default: 30000)
     */
    defaultTimeout?: number;
    /**
     * Default codebase ID to use for queries (optional)
     */
    defaultCodebaseId?: string;
}
/**
 * Executor for Neo4j Cypher queries
 */
export declare class QueryExecutor {
    private driver;
    private config;
    /**
     * Create a new query executor
     */
    constructor(config: QueryExecutorConfig);
    /**
     * Execute a Cypher query
     */
    executeQuery(cypher: string, parameters?: Record<string, any>, timeout?: number): Promise<QueryResult>;
    /**
     * Execute a Cypher query in a transaction
     */
    executeTransaction(queries: {
        cypher: string;
        parameters?: Record<string, any>;
    }[], timeout?: number): Promise<QueryResult[]>;
    /**
     * Convert a Neo4j record to a plain object
     */
    private recordToObject;
    /**
     * Convert a Neo4j value to a plain JavaScript value
     */
    private convertNeo4jValue;
    /**
     * Get a Neo4j session
     */
    private getSession;
    /**
     * Close the Neo4j driver
     */
    close(): Promise<void>;
    /**
     * Execute a Cypher query scoped to a specific codebase
     *
     * This method automatically adds codebase filtering to the query
     */
    executeCodebaseScopedQuery(codebaseId: string, cypher: string, parameters?: Record<string, any>, timeout?: number): Promise<QueryResult>;
    /**
     * Execute a Cypher query that spans multiple codebases
     *
     * This method allows explicit cross-codebase queries
     */
    executeCrossCodebaseQuery(cypher: string, parameters?: Record<string, any>, timeout?: number): Promise<QueryResult>;
}
//# sourceMappingURL=query-executor.d.ts.map