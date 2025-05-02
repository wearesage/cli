import { QueryExecutor } from '../src/neo4j/query-executor';

/**
 * Script to fix cross-codebase relationship properties in Neo4j
 * 
 * This script updates the isCrossCodebase, sourceCodebaseId, and targetCodebaseId
 * properties of relationships based on the actual codebaseId properties of the
 * source and target nodes.
 * 
 * Usage:
 * npx ts-node scripts/fix-cross-codebase-relationships.ts
 */

async function fixCrossCodebaseRelationships() {
  // Get Neo4j connection details from environment variables
  const neo4jConfig = {
    uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'justdontask',
    database: process.env.NEO4J_DATABASE
  };

  console.log(`Neo4j connection: ${neo4jConfig.uri}`);
  console.log('Fixing cross-codebase relationship properties...');

  // Create query executor
  const queryExecutor = new QueryExecutor(neo4jConfig);

  try {
    // First, count the relationships to be updated
    const countResult = await queryExecutor.executeQuery(`
      MATCH (source:Node)-[r]->(target:Node)
      WHERE r.isCrossCodebase = true
      RETURN count(r) as relCount
    `);

    const relCount = countResult.records[0]?.relCount?.low || 0;
    console.log(`Found ${relCount} relationships with isCrossCodebase = true`);

    if (relCount === 0) {
      console.log('No relationships to fix. Exiting.');
      return;
    }

    // Update all relationships to set isCrossCodebase based on actual codebase IDs
    console.log('Updating relationship properties...');
    
    const updateResult = await queryExecutor.executeQuery(`
      MATCH (source:Node)-[r]->(target:Node)
      WHERE r.isCrossCodebase = true
      WITH source, r, target,
           source.codebaseId <> target.codebaseId as actualIsCrossCodebase
      SET r.isCrossCodebase = actualIsCrossCodebase,
          r.sourceCodebaseId = source.codebaseId,
          r.targetCodebaseId = target.codebaseId
      RETURN count(r) as updatedCount
    `);

    const updatedCount = updateResult.records[0]?.updatedCount?.low || 0;
    console.log(`Updated ${updatedCount} relationships`);

    // Check how many relationships are now correctly marked as cross-codebase
    const checkResult = await queryExecutor.executeQuery(`
      MATCH (source:Node)-[r]->(target:Node)
      WHERE r.isCrossCodebase = true
      RETURN count(r) as crossCodebaseCount
    `);

    const crossCodebaseCount = checkResult.records[0]?.crossCodebaseCount?.low || 0;
    console.log(`After update, ${crossCodebaseCount} relationships are marked as cross-codebase`);

    // If we have any actual cross-codebase relationships, show them
    if (crossCodebaseCount > 0) {
      const crossCodebaseResult = await queryExecutor.executeQuery(`
        MATCH (source:Node)-[r {isCrossCodebase: true}]->(target:Node)
        RETURN 
          r.type AS relationshipType,
          source.codebaseId AS sourceCodebase,
          target.codebaseId AS targetCodebase,
          count(*) AS count
        ORDER BY count DESC
      `);

      console.log('\nActual cross-codebase relationships:');
      for (const record of crossCodebaseResult.records) {
        console.log(`${record.sourceCodebase} -> ${record.targetCodebase} [${record.relationshipType}]: ${record.count} relationships`);
      }
    }

  } finally {
    // Close the connection
    await queryExecutor.close();
  }
}

// Run the fix
fixCrossCodebaseRelationships().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});