import * as fs from 'fs';
import * as path from 'path';
import { QueryExecutor } from '../src/neo4j/query-executor';

/**
 * Script to import JSON files to Neo4j with special handling for complex properties
 * 
 * Usage:
 * npx ts-node scripts/import-json-to-neo4j.ts <json-dir> <codebase-id>
 */

async function importJsonToNeo4j(jsonDir: string, codebaseId: string) {
  // Get Neo4j connection details from environment variables
  const neo4jConfig = {
    uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'justdontask',
    database: process.env.NEO4J_DATABASE
  };

  console.log(`Neo4j connection: ${neo4jConfig.uri}`);
  console.log(`Importing codebase: ${codebaseId} from ${jsonDir}`);

  // Create query executor
  const queryExecutor = new QueryExecutor(neo4jConfig);

  try {
    // Read nodes and relationships from JSON files
    const nodesPath = path.join(jsonDir, 'nodes.json');
    const relationshipsPath = path.join(jsonDir, 'relationships.json');

    if (!fs.existsSync(nodesPath) || !fs.existsSync(relationshipsPath)) {
      console.error(`Error: JSON files not found in ${jsonDir}`);
      process.exit(1);
    }

    const nodes = JSON.parse(fs.readFileSync(nodesPath, 'utf8'));
    const relationships = JSON.parse(fs.readFileSync(relationshipsPath, 'utf8'));

    console.log(`Found ${nodes.length} nodes and ${relationships.length} relationships`);

    // Import nodes
    console.log('Importing nodes...');
    let importedNodes = 0;
    const batchSize = 500;

    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);
      
      // Create nodes in batch
      const query = `
        UNWIND $nodes AS node
        CREATE (n:Node)
        SET n = node
        WITH n, node.labels AS nodeLabels
        WHERE nodeLabels IS NOT NULL
        UNWIND nodeLabels AS label
        CALL apoc.create.addLabels(n, [label])
        YIELD node AS _
        RETURN count(n) AS count
      `;

      const result = await queryExecutor.executeQuery(query, { nodes: batch });
      // Handle different result formats
      let count = 0;
      if (result.records && result.records.length > 0) {
        const record = result.records[0];
        if (typeof record.get === 'function') {
          count = record.get('count').toNumber();
        } else if (record.count !== undefined) {
          count = typeof record.count === 'number' ?
            record.count :
            (record.count.low || 0);
        }
      }
      importedNodes += count;
      
      console.log(`Imported ${importedNodes}/${nodes.length} nodes`);
    }

    // Import relationships
    console.log('Importing relationships...');
    let importedRels = 0;
    
    // Group relationships by type
    const relsByType: { [key: string]: any[] } = {};
    
    // Group relationships by type
    for (const rel of relationships) {
      if (!relsByType[rel.type]) {
        relsByType[rel.type] = [];
      }
      relsByType[rel.type].push(rel);
    }

    for (const relType in relsByType) {
      const rels = relsByType[relType];
      console.log(`Importing ${rels.length} ${relType} relationships`);
      
      // Process relationships in batches
      for (let i = 0; i < rels.length; i += batchSize) {
        const batch = rels.slice(i, i + batchSize);
        
        // Transform complex properties
        const transformedBatch = batch.map(rel => {
          // Clone the relationship to avoid modifying the original
          const transformed = { ...rel };
          
          // Handle complex properties
          if (transformed.bindings) {
            // Convert Map to string representation
            transformed.bindingsJson = JSON.stringify(transformed.bindings);
            delete transformed.bindings;
          }
          
          // Handle event handlers in LISTENS_TO relationships
          if (relType === 'LISTENS_TO' && transformed.handlers) {
            // Convert handlers to string representation
            transformed.handlersJson = JSON.stringify(transformed.handlers);
            delete transformed.handlers;
          }
          
          // Convert any object properties to JSON strings
          for (const key in transformed) {
            if (transformed[key] !== null &&
                typeof transformed[key] === 'object' &&
                !Array.isArray(transformed[key])) {
              transformed[key + 'Json'] = JSON.stringify(transformed[key]);
              delete transformed[key];
            }
          }
          
          return transformed;
        });
        
        // Create relationships in batch
        const query = `
          UNWIND $relationships AS rel
          MATCH (start:Node {nodeId: rel.startNodeId})
          MATCH (end:Node {nodeId: rel.endNodeId})
          CREATE (start)-[r:\`${relType}\`]->(end)
          SET r = rel
          RETURN count(r) AS count
        `;

        try {
          const result = await queryExecutor.executeQuery(query, { relationships: transformedBatch });
          // Handle different result formats
          let count = 0;
          if (result.records && result.records.length > 0) {
            const record = result.records[0];
            if (typeof record.get === 'function') {
              count = record.get('count').toNumber();
            } else if (record.count !== undefined) {
              count = typeof record.count === 'number' ?
                record.count :
                (record.count.low || 0);
            }
          }
          importedRels += count;
          
          console.log(`Imported ${importedRels}/${relationships.length} relationships`);
        } catch (error) {
          console.error(`Error importing ${relType} relationships:`, error);
          console.log('Continuing with next batch...');
        }
      }
    }

    console.log(`Successfully imported ${importedNodes} nodes and ${importedRels} relationships`);

  } finally {
    // Close the connection
    await queryExecutor.close();
  }
}

// Get JSON directory and codebase ID from command line arguments
const jsonDir = process.argv[2];
const codebaseId = process.argv[3];

if (!jsonDir || !codebaseId) {
  console.error('Error: JSON directory and codebase ID are required');
  console.log('Usage: npx ts-node scripts/import-json-to-neo4j.ts <json-dir> <codebase-id>');
  process.exit(1);
}

// Run the import
importJsonToNeo4j(jsonDir, codebaseId).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});