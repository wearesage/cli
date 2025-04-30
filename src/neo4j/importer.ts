import neo4j, { Driver, Session } from 'neo4j-driver';
import { Node, Relationship, SCHEMA_VERSION, SCHEMA_METADATA } from '../schema/index.ts';
import {
  createSchemaConstraints,
  verifySchemaConstraints,
  createCodebaseSchema
} from './schema-constraints.ts';
import { SchemaMigration } from './schema-migration.ts';

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
export class Neo4jImporter {
  private driver: Driver;
  private config: Neo4jImporterConfig;
  
  /**
   * Create a new Neo4j importer
   */
  constructor(config: Neo4jImporterConfig) {
    this.config = {
      batchSize: 1000,
      migration: {
        autoMigrate: true,
        backupBeforeMigration: false
      },
      ...config
    };
    
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password)
    );
  }
  
  /**
   * Import nodes and relationships into Neo4j
   */
  public async import(nodes: Node[], relationships: Relationship[]): Promise<void> {
    try {
      // Create schema constraints and indexes
      const session = this.getSession();
      await createSchemaConstraints(session);
      await session.close();
      
      // Verify schema constraints
      const verifySession = this.getSession();
      const verified = await verifySchemaConstraints(verifySession);
      await verifySession.close();
      
      if (!verified) {
        console.warn('Schema constraints verification failed. Proceeding with import anyway.');
      }
      
      // Check if schema migration is needed
      if (this.config.migration?.autoMigrate) {
        const migrationSession = this.getSession();
        const migrationNeeded = await SchemaMigration.isMigrationNeeded(migrationSession);
        
        if (migrationNeeded) {
          console.log('Schema migration needed. Performing migration...');
          
          // Create backup if configured
          if (this.config.migration.backupBeforeMigration) {
            await SchemaMigration.createBackup(migrationSession, 'pre_migration_backup');
          }
          
          // Perform migration
          const migrationResults = await SchemaMigration.migrateAllToCurrentVersion(migrationSession);
          console.log('Migration results:', migrationResults);
        }
        
        await migrationSession.close();
      }
      
      // Create codebase-specific schema
      if (nodes.length > 0) {
        const codebaseId = nodes[0].codebaseId;
        const codebaseSession = this.getSession();
        await createCodebaseSchema(codebaseSession, codebaseId);
        await codebaseSession.close();
      }
      
      // Import nodes in batches
      await this.importNodes(nodes);
      
      // Import relationships in batches
      await this.importRelationships(relationships);
      
      console.log('Import complete');
    } catch (error) {
      console.error('Error importing to Neo4j:', error);
      throw error;
    } finally {
      await this.driver.close();
    }
  }
  
  
  /**
   * Import nodes into Neo4j in batches
   */
  private async importNodes(nodes: Node[]): Promise<void> {
    const batchSize = this.config.batchSize || 1000;
    const batches = Math.ceil(nodes.length / batchSize);
    
    console.log(`Importing ${nodes.length} nodes in ${batches} batches`);
    
    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, nodes.length);
      const batch = nodes.slice(start, end);
      
      await this.importNodeBatch(batch);
      console.log(`Imported nodes batch ${i + 1}/${batches}`);
    }
  }
  
  /**
   * Import a batch of nodes into Neo4j
   */
  private async importNodeBatch(nodes: Node[]): Promise<void> {
    const session = this.getSession();
    
    try {
      // Use UNWIND for batch import
      const result = await session.run(`
        UNWIND $nodes AS node
        MERGE (n:Node {nodeId: node.nodeId})
        SET n = node
        WITH n, node._labels AS labels
        CALL apoc.create.addLabels(n, labels) YIELD node AS updatedNode
        RETURN count(updatedNode) AS count
      `, {
        nodes: nodes.map(node => this.prepareNodeForImport(node))
      });
      
      const count = result.records[0].get('count').toNumber();
      console.log(`Imported ${count} nodes`);
    } finally {
      await session.close();
    }
  }
  
  /**
   * Import relationships into Neo4j in batches
   */
  private async importRelationships(relationships: Relationship[]): Promise<void> {
    const batchSize = this.config.batchSize || 1000;
    const batches = Math.ceil(relationships.length / batchSize);
    
    console.log(`Importing ${relationships.length} relationships in ${batches} batches`);
    
    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, relationships.length);
      const batch = relationships.slice(start, end);
      
      await this.importRelationshipBatch(batch);
      console.log(`Imported relationships batch ${i + 1}/${batches}`);
    }
  }
  
  /**
   * Import a batch of relationships into Neo4j
   */
  private async importRelationshipBatch(relationships: Relationship[]): Promise<void> {
    const session = this.getSession();
    
    try {
      // Group relationships by type for efficient batch processing
      const relationshipsByType = this.groupRelationshipsByType(relationships);
      let totalCount = 0;
      
      // Process each relationship type separately
      for (const [relType, rels] of Object.entries(relationshipsByType)) {
        // Use UNWIND for batch import with dynamic relationship type
        const query = `
          UNWIND $relationships AS rel
          MATCH (start:Node {nodeId: rel.startNodeId})
          MATCH (end:Node {nodeId: rel.endNodeId})
          MERGE (start)-[r:\`${relType}\`]->(end)
          ON CREATE SET r = rel.properties, r.nodeId = rel.nodeId
          ON MATCH SET r = rel.properties
          RETURN count(r) AS count
        `;
        
        const result = await session.run(query, {
          relationships: rels.map(rel => this.prepareRelationshipForImport(rel))
        });
        
        const count = result.records[0].get('count').toNumber();
        totalCount += count;
        console.log(`Imported ${count} ${relType} relationships`);
      }
      
      console.log(`Imported ${totalCount} relationships in total`);
    } finally {
      await session.close();
    }
  }
  
  /**
   * Group relationships by type for batch processing
   */
  private groupRelationshipsByType(relationships: Relationship[]): Record<string, Relationship[]> {
    const groups: Record<string, Relationship[]> = {};
    
    for (const rel of relationships) {
      if (!groups[rel.type]) {
        groups[rel.type] = [];
      }
      groups[rel.type].push(rel);
    }
    
    return groups;
  }
  
  /**
   * Prepare a node for import into Neo4j
   */
  private prepareNodeForImport(node: Node): any {
    // Extract labels and other properties
    const { labels: originalLabels, ...nodeProperties } = node;
    
    // Create a copy of labels to avoid modifying the original
    const labels = [...originalLabels];
    
    // Ensure CodeElement label is added for nodes implementing the CodeElement interface
    if ('name' in node && 'file' in node && 'startLine' in node && 'endLine' in node) {
      if (!labels.includes('CodeElement')) {
        labels.push('CodeElement');
      }
    }
    
    // Add schema version
    const nodeWithVersion = {
      ...nodeProperties,
      _schemaVersion: SCHEMA_VERSION,
      _labels: labels
    };
    
    // Add timestamps if not present
    if (!nodeWithVersion.createdAt) {
      nodeWithVersion.createdAt = new Date().toISOString();
    }
    if (!nodeWithVersion.updatedAt) {
      nodeWithVersion.updatedAt = new Date().toISOString();
    }
    
    return nodeWithVersion;
  }
  
  /**
   * Prepare a relationship for import into Neo4j
   */
  private prepareRelationshipForImport(relationship: Relationship): any {
    // Clone the relationship to avoid modifying the original
    const relForImport = { ...relationship };
    
    // Extract type and node IDs
    const { type, startNodeId, endNodeId, ...properties } = relForImport;
    
    // Validate relationship type against schema
    if (!SCHEMA_METADATA.relationshipTypes.includes(type)) {
      console.warn(`Warning: Relationship type '${type}' is not defined in schema metadata. This may cause inconsistencies.`);
    }
    
    // Add schema version and timestamps
    const propertiesWithVersion = {
      ...properties,
      _schemaVersion: SCHEMA_VERSION
    };
    
    // Add timestamps if not present
    if (!propertiesWithVersion.createdAt) {
      propertiesWithVersion.createdAt = new Date().toISOString();
    }
    if (!propertiesWithVersion.updatedAt) {
      propertiesWithVersion.updatedAt = new Date().toISOString();
    }
    
    // No longer need to include type in properties since it's the actual relationship type
    return {
      type,
      startNodeId,
      endNodeId,
      properties: propertiesWithVersion
    };
  }
  
  /**
   * Get a Cypher parameter for setting labels
   */
  private getLabelsParam(): string {
    return `apoc.convert.toLabels(node._labels)`;
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