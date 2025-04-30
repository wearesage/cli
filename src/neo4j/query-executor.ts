import neo4j, { Driver, Session, Record as Neo4jRecord } from 'neo4j-driver';

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
}

/**
 * Executor for Neo4j Cypher queries
 */
export class QueryExecutor {
  private driver: Driver;
  private config: QueryExecutorConfig;
  
  /**
   * Create a new query executor
   */
  constructor(config: QueryExecutorConfig) {
    this.config = {
      defaultTimeout: 30000,
      ...config
    };
    
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password)
    );
  }
  
  /**
   * Execute a Cypher query
   */
  public async executeQuery(
    cypher: string, 
    parameters: Record<string, any> = {}, 
    timeout?: number
  ): Promise<QueryResult> {
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
    } catch (error: any) {
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
    } finally {
      await session.close();
    }
  }
  
  /**
   * Execute a Cypher query in a transaction
   */
  public async executeTransaction(
    queries: { cypher: string; parameters?: Record<string, any> }[],
    timeout?: number
  ): Promise<QueryResult[]> {
    const session = this.getSession();
    const startTime = Date.now();
    
    try {
      // Set transaction timeout
      const txConfig = {
        timeout: timeout || this.config.defaultTimeout
      };
      
      // Execute the transaction
      const results: QueryResult[] = [];
      
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
      } catch (error) {
        // Rollback the transaction
        await tx.rollback();
        throw error;
      }
    } catch (error: any) {
      console.error('Error executing Cypher transaction:', error);
      
      // Calculate execution time even for failed transactions
      const executionTime = Date.now() - startTime;
      
      throw {
        message: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN',
        executionTime,
        queries
      };
    } finally {
      await session.close();
    }
  }
  
  /**
   * Convert a Neo4j record to a plain object
   */
  private recordToObject(record: Neo4jRecord): any {
    const result: Record<string, any> = {};
    
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
  private convertNeo4jValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }
    
    // Handle Neo4j Node
    if (neo4j.isNode(value)) {
      return {
        ...this.convertNeo4jValue(value.properties),
        _id: value.identity.toNumber(),
        _labels: value.labels
      };
    }
    
    // Handle Neo4j Relationship
    if (neo4j.isRelationship(value)) {
      return {
        ...this.convertNeo4jValue(value.properties),
        _id: value.identity.toNumber(),
        _type: value.type,
        _startNodeId: value.start.toNumber(),
        _endNodeId: value.end.toNumber()
      };
    }
    
    // Handle Neo4j Path
    if (neo4j.isPath(value)) {
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
      const result: Record<string, any> = {};
      
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
  private getSession(): Session {
    return this.driver.session({
      database: this.config.database
    });
  }
  
  /**
   * Close the Neo4j driver
   */
  public async close(): Promise<void> {
    await this.driver.close();
  }
}