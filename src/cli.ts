#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import { TSCodeGraph } from './index.ts';

/**
 * Command-line interface for the TypeScript Code Graph system
 * 
 * This script provides a convenient way to analyze TypeScript projects
 * and import them into Neo4j from the command line.
 * 
 * Usage:
 * ```
 * sage analyze /path/to/typescript/project [output-dir] [codebase-id]
 * ```
 */

// Parse command-line arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command || args.length < 2) {
  printUsage();
  process.exit(1);
}

async function main() {
  try {
    switch (command) {
      case 'analyze':
        await analyzeProject(args.slice(1));
        break;
      case 'query':
        await queryGraph(args.slice(1));
        break;
      case 'help':
        printUsage();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
TypeScript Code Graph - A tool for analyzing TypeScript codebases and importing them into Neo4j

Usage:
  sage analyze <project-path> [output-dir] [codebase-id]
  sage query <codebase-id> <cypher-query>
  sage help

Commands:
  analyze    Analyze a TypeScript project and import it into Neo4j
  query      Run a Cypher query against the Neo4j database
  help       Show this help message

Examples:
  sage analyze ./my-project
  sage analyze ./my-project ./output my-project
  sage query my-project "MATCH (n:Class) RETURN n.name LIMIT 10"

Environment Variables:
  NEO4J_URI       URI of the Neo4j database (e.g., neo4j://localhost:7687)
  NEO4J_USERNAME  Username for the Neo4j database (default: neo4j)
  NEO4J_PASSWORD  Password for the Neo4j database (default: password)
  NEO4J_DATABASE  Name of the Neo4j database (optional)
  `);
}

/**
 * Analyze a TypeScript project
 */
async function analyzeProject(args: string[]) {
  if (args.length < 1) {
    console.error('Error: Project path is required');
    printUsage();
    process.exit(1);
  }
  
  const projectPath = path.resolve(args[0]);
  const outputDir = args[1] ? path.resolve(args[1]) : path.join(process.cwd(), 'output');
  const codebaseId = args[2] || path.basename(projectPath);
  
  // Check if project path exists
  if (!fs.existsSync(projectPath)) {
    console.error(`Error: Project path does not exist: ${projectPath}`);
    process.exit(1);
  }
  
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
    
    console.log('\nAnalysis complete!');
    console.log(`Results saved to ${outputDir}`);
    
    if (neo4jConfig) {
      console.log(`Graph data imported to Neo4j at ${neo4jConfig.uri}`);
    }
  } finally {
    // Close connections
    await codeGraph.close();
  }
}

/**
 * Run a Cypher query against the Neo4j database
 */
async function queryGraph(args: string[]) {
  if (args.length < 2) {
    console.error('Error: Codebase ID and Cypher query are required');
    printUsage();
    process.exit(1);
  }
  
  const codebaseId = args[0];
  const cypherQuery = args[1];
  
  // Configure Neo4j connection
  if (!process.env.NEO4J_URI) {
    console.error('Error: NEO4J_URI environment variable is required for querying');
    process.exit(1);
  }
  
  const neo4jConfig = {
    uri: process.env.NEO4J_URI,
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
    database: process.env.NEO4J_DATABASE
  };
  
  console.log(`Neo4j connection: ${neo4jConfig.uri}`);
  console.log(`Codebase ID: ${codebaseId}`);
  console.log(`Cypher query: ${cypherQuery}`);
  
  // Create config
  const config = {
    rootDir: '',
    outputDir: '',
    codebaseId,
    neo4j: neo4jConfig
  };
  
  // Create the graph generator
  const codeGraph = new TSCodeGraph(config);
  
  try {
    // Execute the query
    const result = await codeGraph.executeQuery(cypherQuery, { codebaseId });
    
    console.log('\nQuery result:');
    console.log(JSON.stringify(result.records, null, 2));
    
    console.log('\nSummary:');
    console.log(`  Records: ${result.summary.recordCount}`);
    console.log(`  Execution time: ${result.summary.executionTime}ms`);
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