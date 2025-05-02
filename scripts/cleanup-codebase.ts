import { QueryExecutor } from '../src/neo4j/query-executor';

/**
 * Script to clean up a specific codebase from Neo4j
 * 
 * Usage:
 * npx ts-node scripts/cleanup-codebase.ts <codebase-id>
 */

async function cleanupCodebase(codebaseId: string) {
  // Get Neo4j connection details from environment variables
  const neo4jConfig = {
    uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'justdontask',
    database: process.env.NEO4J_DATABASE
  };

  console.log(`Neo4j connection: ${neo4jConfig.uri}`);
  console.log(`Cleaning up codebase: ${codebaseId}`);

  // Create query executor
  const queryExecutor = new QueryExecutor(neo4jConfig);

  try {
    // First, count the nodes to be deleted
    const countResult = await queryExecutor.executeQuery(
      `MATCH (n)
       WHERE n.codebaseId = $codebaseId
          OR n.nodeId STARTS WITH $codebaseIdPrefix
          OR n.nodeId = $codebaseId
          OR (n:Codebase AND n.name = $codebaseId)
       RETURN count(n) as nodeCount`,
      {
        codebaseId,
        codebaseIdPrefix: `${codebaseId}:`
      }
    );

    const nodeCount = countResult.records[0]?.nodeCount || 0;
    console.log(`Found ${nodeCount} nodes to delete`);

    if (nodeCount === 0) {
      console.log('No nodes found for this codebase. Nothing to delete.');
      return;
    }

    // Ask for confirmation
    console.log(`WARNING: This will delete all nodes and relationships for codebase '${codebaseId}'`);
    console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');
    
    // Wait for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete all nodes and relationships for this codebase
    console.log('Deleting nodes and relationships...');
    
    try {
      const deleteResult = await queryExecutor.executeQuery(
        `MATCH (n)
         WHERE n.codebaseId = $codebaseId
            OR n.nodeId STARTS WITH $codebaseIdPrefix
            OR n.nodeId = $codebaseId
            OR (n:Codebase AND n.name = $codebaseId)
         DETACH DELETE n
         RETURN count(n) as deletedCount`,
        {
          codebaseId,
          codebaseIdPrefix: `${codebaseId}:`
        }
      );

      const deletedCount = deleteResult.records[0]?.deletedCount || 0;
      console.log(`Successfully deleted ${deletedCount} nodes and their relationships`);

      // Also clean up any dangling relationships that might have the codebase in their properties
      try {
        const cleanupResult = await queryExecutor.executeQuery(
          `MATCH ()-[r]-()
           WHERE r.codebaseId = $codebaseId OR
                 r.sourceCodebaseId = $codebaseId OR
                 r.targetCodebaseId = $codebaseId
           DELETE r
           RETURN count(r) as deletedRelCount`,
          { codebaseId }
        );

        const deletedRelCount = cleanupResult.records[0]?.deletedRelCount || 0;
        console.log(`Additionally cleaned up ${deletedRelCount} dangling relationships`);
      } catch (relError) {
        console.warn(`Warning: Could not clean up dangling relationships: ${relError}`);
        console.log('This is not critical - the main nodes have been deleted');
      }
    } catch (error) {
      console.error(`Error deleting nodes for codebase ${codebaseId}:`, error);
      throw error;
    }

  } finally {
    // Close the connection
    await queryExecutor.close();
  }
}

// Get codebase ID from command line arguments
const codebaseId = process.argv[2];

if (!codebaseId) {
  console.error('Error: Codebase ID is required');
  console.log('Usage: npx ts-node scripts/cleanup-codebase.ts <codebase-id>');
  process.exit(1);
}

// Run the cleanup
cleanupCodebase(codebaseId).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});