import { QueryExecutor } from '../src/neo4j/query-executor';

/**
 * Script to analyze relationships between multiple codebases in Neo4j
 * 
 * Usage:
 * npx ts-node scripts/analyze-codebase-relationships.ts
 */

async function analyzeCodebaseRelationships() {
  // Get Neo4j connection details from environment variables
  const neo4jConfig = {
    uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'justdontask',
    database: process.env.NEO4J_DATABASE
  };

  console.log(`Neo4j connection: ${neo4jConfig.uri}`);
  console.log('Analyzing codebase relationships...');

  // Create query executor
  const queryExecutor = new QueryExecutor(neo4jConfig);

  try {
    // List all codebases
    console.log('\n=== Codebases ===');
    const codebasesResult = await queryExecutor.executeQuery(`
      MATCH (n:Node)
      WITH DISTINCT n.codebaseId AS codebaseId
      MATCH (n:Node {codebaseId: codebaseId})
      WITH codebaseId, count(n) AS nodeCount
      RETURN codebaseId, nodeCount
      ORDER BY nodeCount DESC
    `);

    if (codebasesResult.records.length === 0) {
      console.log('No codebases found in the database.');
      return;
    }

    for (const record of codebasesResult.records) {
      console.log(`${record.codebaseId}: ${record.nodeCount} nodes`);
    }

    // Analyze node types per codebase
    console.log('\n=== Node Types by Codebase ===');
    const nodeTypesResult = await queryExecutor.executeQuery(`
      MATCH (n)
      WITH n.codebaseId AS codebaseId, labels(n) AS labels, count(*) AS count
      WHERE codebaseId IS NOT NULL
      RETURN codebaseId, labels, count
      ORDER BY codebaseId, count DESC
    `);

    let currentCodebase = '';
    for (const record of nodeTypesResult.records) {
      if (record.codebaseId !== currentCodebase) {
        currentCodebase = record.codebaseId;
        console.log(`\n${currentCodebase}:`);
      }
      console.log(`  ${record.labels.join(':')}: ${record.count}`);
    }

    // Analyze cross-codebase relationships
    console.log('\n=== Cross-Codebase Relationships ===');
    try {
      const crossRelResult = await queryExecutor.executeQuery(`
        MATCH (source:Node)-[r]->(target:Node)
        WHERE r.isCrossCodebase = true OR source.codebaseId <> target.codebaseId
        RETURN
          r.type AS relationshipType,
          source.codebaseId AS sourceCodebase,
          target.codebaseId AS targetCodebase,
          count(*) AS count
        ORDER BY count DESC
      `);

      if (crossRelResult.records.length === 0) {
        console.log('No cross-codebase relationships found.');
      } else {
        for (const record of crossRelResult.records) {
          console.log(`${record.sourceCodebase} -> ${record.targetCodebase} [${record.relationshipType}]: ${record.count} relationships`);
        }
      }
    } catch (error) {
      console.warn('Error analyzing cross-codebase relationships:', error);
      console.log('This may be due to missing relationship properties in older data.');
    }

    // Analyze codebase dependencies
    console.log('\n=== Codebase Dependencies ===');
    try {
      const dependenciesResult = await queryExecutor.executeQuery(`
        MATCH (source:Node)-[r]->(target:Node)
        WHERE source.codebaseId <> target.codebaseId
        WITH source.codebaseId AS sourceCodebase, target.codebaseId AS targetCodebase, count(*) AS relationshipCount
        RETURN sourceCodebase, targetCodebase, relationshipCount
        ORDER BY relationshipCount DESC
      `);

      if (dependenciesResult.records.length === 0) {
        console.log('No codebase dependencies found.');
      } else {
        for (const record of dependenciesResult.records) {
          console.log(`${record.sourceCodebase} depends on ${record.targetCodebase}: ${record.relationshipCount} connections`);
        }
      }
    } catch (error) {
      console.warn('Error analyzing codebase dependencies:', error);
      console.log('This may be due to missing codebase properties in older data.');
    }

    // Analyze file-level dependencies between codebases
    console.log('\n=== File-Level Dependencies Between Codebases ===');
    try {
      const fileDepResult = await queryExecutor.executeQuery(`
        MATCH (sourceFile:File)-[:DEFINES_VARIABLE|DEFINES_FUNCTION|DEFINES_CLASS|DEFINES_INTERFACE]->(source:Node)
        MATCH (source)-[r]->(target:Node)
        MATCH (targetFile:File)-[:DEFINES_VARIABLE|DEFINES_FUNCTION|DEFINES_CLASS|DEFINES_INTERFACE]->(target)
        WHERE source.codebaseId <> target.codebaseId
        WITH
          sourceFile.path AS sourcePath,
          targetFile.path AS targetPath,
          source.codebaseId AS sourceCodebase,
          target.codebaseId AS targetCodebase,
          count(*) AS dependencyCount
        RETURN
          sourceCodebase,
          targetCodebase,
          sourcePath,
          targetPath,
          dependencyCount
        ORDER BY dependencyCount DESC
        LIMIT 20
      `);

      if (fileDepResult.records.length === 0) {
        console.log('No file-level dependencies found between codebases.');
      } else {
        for (const record of fileDepResult.records) {
          console.log(`${record.sourceCodebase}:${record.sourcePath} -> ${record.targetCodebase}:${record.targetPath}: ${record.dependencyCount} dependencies`);
        }
      }
    } catch (error) {
      console.warn('Error analyzing file-level dependencies:', error);
      console.log('This may be due to missing file relationships in the data.');
    }

  } finally {
    // Close the connection
    await queryExecutor.close();
  }
}

// Run the analysis
analyzeCodebaseRelationships().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});