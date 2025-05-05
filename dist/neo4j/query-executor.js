"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryExecutor = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
/**
 * Executor for Neo4j Cypher queries
 */
class QueryExecutor {
    /**
     * Create a new query executor
     */
    constructor(config) {
        this.config = {
            defaultTimeout: 30000,
            defaultCodebaseId: 'default',
            ...config
        };
        this.driver = neo4j_driver_1.default.driver(config.uri, neo4j_driver_1.default.auth.basic(config.username, config.password));
    }
    /**
     * Execute a Cypher query
     */
    async executeQuery(cypher, parameters = {}, timeout) {
        const session = this.getSession();
        const startTime = Date.now();
        try {
            // Set transaction timeout
            const txConfig = {
                timeout: timeout || this.config.defaultTimeout
            };
            // Execute the query
            const result = await session.run(cypher, parameters, txConfig);
            // Calculate execution time
            const executionTime = Date.now() - startTime;
            // Convert Neo4j records to plain objects
            const records = result.records.map(record => this.recordToObject(record));
            // Extract query statistics
            const stats = result.summary.counters.updates();
            return {
                records,
                summary: {
                    executionTime,
                    recordCount: records.length,
                    success: true,
                    stats: {
                        nodesCreated: stats.nodesCreated || 0,
                        nodesDeleted: stats.nodesDeleted || 0,
                        relationshipsCreated: stats.relationshipsCreated || 0,
                        relationshipsDeleted: stats.relationshipsDeleted || 0,
                        propertiesSet: stats.propertiesSet || 0,
                        labelsAdded: stats.labelsAdded || 0,
                        labelsRemoved: stats.labelsRemoved || 0
                    }
                }
            };
        }
        catch (error) {
            console.error('Error executing Cypher query:', error);
            // Calculate execution time even for failed queries
            const executionTime = Date.now() - startTime;
            throw {
                message: error.message || 'Unknown error',
                code: error.code || 'UNKNOWN',
                executionTime,
                query: cypher,
                parameters
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Execute a Cypher query in a transaction
     */
    async executeTransaction(queries, timeout) {
        const session = this.getSession();
        const startTime = Date.now();
        try {
            // Set transaction timeout
            const txConfig = {
                timeout: timeout || this.config.defaultTimeout
            };
            // Execute the transaction
            const results = [];
            const tx = session.beginTransaction(txConfig);
            try {
                for (const query of queries) {
                    const result = await tx.run(query.cypher, query.parameters || {});
                    // Convert Neo4j records to plain objects
                    const records = result.records.map(record => this.recordToObject(record));
                    // Extract query statistics
                    const stats = result.summary.counters.updates();
                    results.push({
                        records,
                        summary: {
                            executionTime: 0, // Will be updated after transaction completes
                            recordCount: records.length,
                            success: true,
                            stats: {
                                nodesCreated: stats.nodesCreated || 0,
                                nodesDeleted: stats.nodesDeleted || 0,
                                relationshipsCreated: stats.relationshipsCreated || 0,
                                relationshipsDeleted: stats.relationshipsDeleted || 0,
                                propertiesSet: stats.propertiesSet || 0,
                                labelsAdded: stats.labelsAdded || 0,
                                labelsRemoved: stats.labelsRemoved || 0
                            }
                        }
                    });
                }
                // Commit the transaction
                await tx.commit();
                // Calculate execution time
                const executionTime = Date.now() - startTime;
                // Update execution time for all results
                for (const result of results) {
                    result.summary.executionTime = executionTime;
                }
                return results;
            }
            catch (error) {
                // Rollback the transaction
                await tx.rollback();
                throw error;
            }
        }
        catch (error) {
            console.error('Error executing Cypher transaction:', error);
            // Calculate execution time even for failed transactions
            const executionTime = Date.now() - startTime;
            throw {
                message: error.message || 'Unknown error',
                code: error.code || 'UNKNOWN',
                executionTime,
                queries
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Convert a Neo4j record to a plain object
     */
    recordToObject(record) {
        const result = {};
        for (const key of record.keys) {
            const value = record.get(key);
            // Ensure key is a string
            if (typeof key === 'string') {
                result[key] = this.convertNeo4jValue(value);
            }
        }
        return result;
    }
    /**
     * Convert a Neo4j value to a plain JavaScript value
     */
    convertNeo4jValue(value) {
        if (value === null || value === undefined) {
            return value;
        }
        // Handle Neo4j Node
        if (neo4j_driver_1.default.isNode(value)) {
            return {
                ...this.convertNeo4jValue(value.properties),
                _id: value.identity.toNumber(),
                _labels: value.labels
            };
        }
        // Handle Neo4j Relationship
        if (neo4j_driver_1.default.isRelationship(value)) {
            return {
                ...this.convertNeo4jValue(value.properties),
                _id: value.identity.toNumber(),
                _type: value.type,
                _startNodeId: value.start.toNumber(),
                _endNodeId: value.end.toNumber()
            };
        }
        // Handle Neo4j Path
        if (neo4j_driver_1.default.isPath(value)) {
            return {
                segments: value.segments.map(segment => ({
                    start: this.convertNeo4jValue(segment.start),
                    relationship: this.convertNeo4jValue(segment.relationship),
                    end: this.convertNeo4jValue(segment.end)
                })),
                start: this.convertNeo4jValue(value.start),
                end: this.convertNeo4jValue(value.end),
                length: value.length
            };
        }
        // Handle arrays
        if (Array.isArray(value)) {
            return value.map(item => this.convertNeo4jValue(item));
        }
        // Handle objects
        if (typeof value === 'object') {
            const result = {};
            for (const key of Object.keys(value)) {
                result[key] = this.convertNeo4jValue(value[key]);
            }
            return result;
        }
        // Handle primitive values
        return value;
    }
    /**
     * Get a Neo4j session
     */
    getSession() {
        return this.driver.session({
            database: this.config.database
        });
    }
    /**
     * Close the Neo4j driver
     */
    async close() {
        await this.driver.close();
    }
    /**
     * Execute a Cypher query scoped to a specific codebase
     *
     * This method automatically adds codebase filtering to the query
     */
    async executeCodebaseScopedQuery(codebaseId, cypher, parameters = {}, timeout) {
        // Add codebaseId to parameters
        const paramsWithCodebase = {
            ...parameters,
            codebaseId,
            globalCodebaseId: 'global', // Add global codebase ID for finding global nodes
            nodeIdPrefix: `${codebaseId}:` // Add nodeIdPrefix for matching node IDs that start with codebaseId:
        };
        // This is a more complex transformation that requires parsing the query
        // For simplicity, we'll add a global WHERE clause that filters all nodes by codebase
        // This approach is not perfect but should work for most common queries
        // Check if the query already has a WHERE clause
        const hasWhere = /\bWHERE\b/i.test(cypher);
        // Extract all node variables from MATCH clauses
        const nodeVarRegex = /MATCH\s*\((\w+)[:\s{]/gi;
        const nodeVars = new Set();
        let match;
        while ((match = nodeVarRegex.exec(cypher)) !== null) {
            nodeVars.add(match[1]);
        }
        // Build a WHERE clause that filters all node variables by codebase
        let codebaseFilter = '';
        if (nodeVars.size > 0) {
            const conditions = Array.from(nodeVars).map(varName => `(${varName}.codebaseId = $codebaseId OR ${varName}.codebaseId = $globalCodebaseId)`);
            codebaseFilter = conditions.join(' AND ');
        }
        // Add the codebase filter to the query
        let scopedCypher = cypher;
        if (codebaseFilter) {
            if (hasWhere) {
                // Add to existing WHERE clause
                scopedCypher = scopedCypher.replace(/\bWHERE\b/i, `WHERE ${codebaseFilter} AND `);
            }
            else {
                // Find the first RETURN, WITH, or ORDER BY clause
                const clauseMatch = /\b(RETURN|WITH|ORDER BY|SKIP|LIMIT)\b/i.exec(scopedCypher);
                if (clauseMatch) {
                    // Insert WHERE clause before the found clause
                    const position = clauseMatch.index;
                    scopedCypher =
                        scopedCypher.substring(0, position) +
                            `WHERE ${codebaseFilter} ` +
                            scopedCypher.substring(position);
                }
                else {
                    // Append WHERE clause at the end
                    scopedCypher += ` WHERE ${codebaseFilter}`;
                }
            }
        }
        console.log(`Executing codebase-scoped query for codebase ${codebaseId}`);
        console.log(`Original query: ${cypher}`);
        console.log(`Scoped query: ${scopedCypher}`);
        // Execute the modified query
        return this.executeQuery(scopedCypher, paramsWithCodebase, timeout);
    }
    /**
     * Execute a Cypher query that spans multiple codebases
     *
     * This method allows explicit cross-codebase queries
     */
    async executeCrossCodebaseQuery(cypher, parameters = {}, timeout) {
        // Add a warning log about cross-codebase query
        console.warn('Executing cross-codebase query. This may have performance implications.');
        console.log(`Cross-codebase query: ${cypher}`);
        // Execute the query without modification
        return this.executeQuery(cypher, parameters, timeout);
    }
}
exports.QueryExecutor = QueryExecutor;
//# sourceMappingURL=query-executor.js.map