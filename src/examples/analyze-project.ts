import * as path from 'path';
import { TSCodeGraph } from '../index';

/**
 * Example script that demonstrates how to use the TypeScript Code Graph system
 * to analyze a TypeScript project and import it into Neo4j.
 * 
 * Usage:
 * ```
 * ts-node src/examples/analyze-project.ts /path/to/typescript/project
 * ```
 */
async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: ts-node src/examples/analyze-project.ts <project-path> [output-dir] [codebase-id]');
    process.exit(1);
  }
  
  const projectPath = path.resolve(args[0]);
  const outputDir = args[1] ? path.resolve(args[1]) : path.join(process.cwd(), 'output');
  const codebaseId = args[2] || path.basename(projectPath);
  
  console.log(`Analyzing TypeScript project: ${projectPath}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Codebase ID: ${codebaseId}`);
  
  // Configure Neo4j connection (optional)
  const neo4jConfig = process.env.NEO4J_URI ? {
    uri: process.env.NEO4J_URI,
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
    database: process.env.NEO4J_DATABASE
  } : undefined;
  
  if (neo4jConfig) {
    console.log(`Neo4j connection: ${neo4jConfig.uri}`);
  } else {
    console.log('Neo4j connection: Not configured (will only output JSON files)');
  }
  
  // Create config
  const config = {
    rootDir: projectPath,
    outputDir,
    codebaseId,
    neo4j: neo4jConfig
  };
  
  // Create and run the graph generator
  const codeGraph = new TSCodeGraph(config);
  
  try {
    // Process the codebase
    await codeGraph.process();
    
    // If Neo4j is configured, run some example queries
    if (neo4jConfig) {
      console.log('\nRunning example queries:');
      
      // Get node counts by type
      console.log('\nNode counts by type:');
      const nodeCountsResult = await codeGraph.executeQuery(`
        MATCH (n)
        WHERE n.codebaseId = $codebaseId
        RETURN labels(n) AS labels, count(n) AS count
        ORDER BY count DESC
      `, { codebaseId });
      
      for (const record of nodeCountsResult.records) {
        console.log(`  ${record.labels.join(':')}: ${record.count}`);
      }
      
      // Get relationship counts by type
      console.log('\nRelationship counts by type:');
      const relCountsResult = await codeGraph.executeQuery(`
        MATCH ()-[r]->()
        WHERE r.codebaseId = $codebaseId
        RETURN type(r) AS type, count(r) AS count
        ORDER BY count DESC
      `, { codebaseId });
      
      for (const record of relCountsResult.records) {
        console.log(`  ${record.type}: ${record.count}`);
      }
      
      // Find the most complex classes
      console.log('\nMost complex classes (by method count):');
      const complexClassesResult = await codeGraph.executeQuery(`
        MATCH (c:Class)-[:HAS_METHOD]->(m:Method)
        WHERE c.codebaseId = $codebaseId
        WITH c, count(m) AS methodCount
        ORDER BY methodCount DESC
        LIMIT 10
        RETURN c.name AS className, methodCount
      `, { codebaseId });
      
      for (const record of complexClassesResult.records) {
        console.log(`  ${record.className}: ${record.methodCount} methods`);
      }
      
      // Find potential circular dependencies
      console.log('\nPotential circular dependencies:');
      const circularDepsResult = await codeGraph.executeQuery(`
        MATCH path = (a:File)-[:IMPORTS*]->(b:File)-[:IMPORTS*]->(a)
        WHERE a.codebaseId = $codebaseId AND b.codebaseId = $codebaseId
        RETURN a.path AS from, b.path AS to
        LIMIT 10
      `, { codebaseId });
      
      if (circularDepsResult.records.length === 0) {
        console.log('  No circular dependencies found');
      } else {
        for (const record of circularDepsResult.records) {
          console.log(`  ${record.from} <-> ${record.to}`);
        }
      }
      
      // Find unused exports
      console.log('\nUnused exports:');
      const unusedExportsResult = await codeGraph.executeQuery(`
        MATCH (f:File)-[:EXPORTS_LOCAL|EXPORTS_DEFAULT]->(e)
        WHERE f.codebaseId = $codebaseId
        AND NOT EXISTS((e)<-[:IMPORTS]-())
        RETURN f.path AS file, e.name AS export
        LIMIT 10
      `, { codebaseId });
      
      if (unusedExportsResult.records.length === 0) {
        console.log('  No unused exports found');
      } else {
        for (const record of unusedExportsResult.records) {
          console.log(`  ${record.file}: ${record.export}`);
        }
      }
    }
    
    console.log('\nAnalysis complete!');
    console.log(`Results saved to ${outputDir}`);
    
    if (neo4jConfig) {
      console.log(`Graph data imported to Neo4j at ${neo4jConfig.uri}`);
    }
  } catch (error) {
    console.error('Error analyzing project:', error);
    process.exit(1);
  } finally {
    // Close connections
    await codeGraph.close();
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});