#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import { TSCodeGraph } from './index';

/**
 * Performance tracker for measuring execution time of operations
 */
class PerformanceTracker {
  private timestamps: Map<string, number> = new Map();
  private startTime: number;
  private verbose: boolean;

  constructor(verbose = false) {
    this.startTime = Date.now();
    this.verbose = verbose;
    this.timestamps.set('start', this.startTime);
  }

  // Record a timestamp with a label
  mark(label: string): void {
    const timestamp = Date.now();
    this.timestamps.set(label, timestamp);
    
    if (this.verbose) {
      console.log(`[${label}] ${this.formatTime(timestamp - this.startTime)}`);
    }
  }

  // Calculate elapsed time between two timestamps
  elapsed(fromLabel: string, toLabel: string): number {
    const fromTime = this.timestamps.get(fromLabel);
    const toTime = this.timestamps.get(toLabel);
    
    if (!fromTime || !toTime) {
      return -1;
    }
    
    return toTime - fromTime;
  }

  // Format milliseconds into a readable string
  formatTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  }

  // Print a summary of all recorded timestamps
  summary(): void {
    console.log('\n--- Performance Summary ---');
    
    // Calculate total time
    const totalTime = Date.now() - this.startTime;
    console.log(`Total execution time: ${this.formatTime(totalTime)}`);
    
    // Print individual operations if we have more than just start
    if (this.timestamps.size > 1) {
      console.log('\nOperation times:');
      
      // Get all timestamps in chronological order
      const sortedLabels = Array.from(this.timestamps.entries())
        .sort((a, b) => a[1] - b[1])
        .map(entry => entry[0]);
      
      // Print elapsed time between consecutive timestamps
      for (let i = 0; i < sortedLabels.length - 1; i++) {
        const fromLabel = sortedLabels[i];
        const toLabel = sortedLabels[i + 1];
        const elapsed = this.elapsed(fromLabel, toLabel);
        
        console.log(`  ${fromLabel} → ${toLabel}: ${this.formatTime(elapsed)}`);
      }
    }
    
    console.log('---------------------------');
  }
}

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

// Check for performance tracking options
const perfEnabled = args.includes('--perf') || args.includes('--perf-verbose');
const perfVerbose = args.includes('--perf-verbose');

// Remove performance flags from args
const cleanArgs = args.filter(arg => arg !== '--perf' && arg !== '--perf-verbose');
const commandArgs = cleanArgs.slice(1);

if (!command || (cleanArgs.length < 2 && !['help', 'ingest'].includes(command))) {
  printUsage();
  process.exit(1);
}

async function main() {
  // Initialize performance tracker if enabled
  const perfTracker = perfEnabled ? new PerformanceTracker(perfVerbose) : null;
  
  try {
    if (perfTracker) perfTracker.mark('init');
    
    switch (command) {
      case 'analyze':
        await analyzeProject(commandArgs, perfTracker);
        break;
      case 'ingest':
        await ingestProject(commandArgs, perfTracker);
        break;
      case 'query':
        await queryGraph(commandArgs, perfTracker);
        break;
      case 'help':
        printUsage();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
    
    // Print performance summary if tracking is enabled
    if (perfTracker) {
      perfTracker.mark('end');
      perfTracker.summary();
    }
  } catch (error) {
    // Mark error timestamp if tracking is enabled
    if (perfTracker) perfTracker.mark('error');
    
    console.error('Error:', error);
    
    // Still show performance summary on error if tracking is enabled
    if (perfTracker) perfTracker.summary();
    
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
  sage analyze <project-path> [output-dir] [codebase-id] [--skip-validation]
  sage ingest <codebase-id> [--skip-validation] [--no-cleanup]
  sage query <codebase-id> <cypher-query>
  sage help

Commands:
  analyze    Analyze a TypeScript project and import it into Neo4j
  ingest     Analyze and import the current directory with the specified codebase ID
  query      Run a Cypher query against the Neo4j database
  help       Show this help message

Options:
  --skip-validation    Skip validation of the graph model (useful for projects with complex imports)
  --no-cleanup         Skip cleaning up existing data for the codebase (ingest command only)
  --perf               Enable performance tracking
  --perf-verbose       Enable verbose performance tracking with timestamps

Examples:
  sage analyze ./my-project
  sage analyze ./my-project ./output my-project
  sage analyze ./my-project ./output my-project --skip-validation
  sage ingest my-project
  sage ingest my-project --skip-validation
  sage ingest my-project --no-cleanup
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
async function analyzeProject(args: string[], perfTracker: PerformanceTracker | null = null) {
  if (perfTracker) perfTracker.mark('analyze_start');
  
  if (args.length < 1) {
    console.error('Error: Project path is required');
    printUsage();
    process.exit(1);
  }
  
  // Check for --skip-validation flag
  const skipValidation = args.includes('--skip-validation');
  
  if (perfTracker) perfTracker.mark('parse_args');
  
  // Remove the flag from args if present
  const cleanArgs = args.filter(arg => arg !== '--skip-validation');
  
  const projectPath = path.resolve(cleanArgs[0]);
  const outputDir = cleanArgs[1] ? path.resolve(cleanArgs[1]) : path.join(process.cwd(), 'output');
  const codebaseId = cleanArgs[2] || path.basename(projectPath);
  
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
    if (perfTracker) perfTracker.mark('process_start');
    await codeGraph.process(skipValidation);
    if (perfTracker) perfTracker.mark('process_complete');
    
    console.log('\nAnalysis complete!');
    console.log(`Results saved to ${outputDir}`);
    
    if (neo4jConfig) {
      console.log(`Graph data imported to Neo4j at ${neo4jConfig.uri}`);
    }
  } finally {
    // Close connections
    if (perfTracker) perfTracker.mark('cleanup_start');
    await codeGraph.close();
    if (perfTracker) perfTracker.mark('analyze_complete');
  }
}

/**
 * Run a Cypher query against the Neo4j database
 */
async function queryGraph(args: string[], perfTracker: PerformanceTracker | null = null) {
  if (perfTracker) perfTracker.mark('query_start');
  if (args.length < 2) {
    console.error('Error: Codebase ID and Cypher query are required');
    printUsage();
    process.exit(1);
  }
  
  const codebaseId = args[0];
  const cypherQuery = args[1];
  
  // Configure Neo4j connection with default values
  const neo4jConfig = {
    uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'justdontask',
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
    if (perfTracker) perfTracker.mark('execute_query_start');
    const result = await codeGraph.executeQuery(cypherQuery, { codebaseId });
    if (perfTracker) perfTracker.mark('execute_query_complete');
    
    console.log('\nQuery result:');
    console.log(JSON.stringify(result.records, null, 2));
    
    console.log('\nSummary:');
    console.log(`  Records: ${result.summary.recordCount}`);
    console.log(`  Execution time: ${result.summary.executionTime}ms`);
  } finally {
    // Close connections
    if (perfTracker) perfTracker.mark('cleanup_start');
    await codeGraph.close();
    if (perfTracker) perfTracker.mark('cleanup_complete');
  }
}

/**
 * Ingest a TypeScript project from the current directory
 * This combines cleanup, analysis, and import in one command
 */
async function ingestProject(args: string[], perfTracker: PerformanceTracker | null = null) {
  if (perfTracker) perfTracker.mark('ingest_start');
  if (args.length < 1) {
    console.error('Error: Codebase ID is required');
    printUsage();
    process.exit(1);
  }

  // Parse arguments
  const codebaseId = args[0];
  const skipValidation = args.includes('--skip-validation');
  const noCleanup = args.includes('--no-cleanup');
  
  // Current directory is the project path
  const projectPath = process.cwd();
  const outputDir = path.join(projectPath, 'output', `${codebaseId}-analysis`);
  
  // Configure Neo4j connection with default values
  const neo4jConfig = {
    uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'justdontask',
    database: process.env.NEO4J_DATABASE
  };
  
  console.log(`Neo4j connection: ${neo4jConfig.uri}`);
  console.log(`Ingesting current directory as codebase: ${codebaseId}`);
  console.log(`Project path: ${projectPath}`);
  console.log(`Output directory: ${outputDir}`);
  
  // Step 1: Clean up existing data (if not skipped)
  if (!noCleanup) {
    console.log(`\nStep 1: Cleaning up existing data for codebase '${codebaseId}'...`);
    if (perfTracker) perfTracker.mark('cleanup_start');
    
    // Create query executor
    const { QueryExecutor } = await import('./neo4j/query-executor.js');
    const queryExecutor = new QueryExecutor(neo4jConfig);
    
    try {
      console.log(`Deleting all nodes and relationships for codebase: ${codebaseId}`);
      
      // Delete all nodes and their relationships in one step
      const deleteNodesQuery = `
        MATCH (n)
        WHERE n.codebaseId = $codebaseId
           OR n.nodeId STARTS WITH $codebaseIdPrefix
           OR n.nodeId = $codebaseId
           OR (n:Codebase AND n.name = $codebaseId)
        DETACH DELETE n
      `;
      
      await queryExecutor.executeQuery(deleteNodesQuery, {
        codebaseId,
        codebaseIdPrefix: `${codebaseId}:`
      });
      
      // Clean up any dangling relationships in a separate query
      const cleanupRelQuery = `
        MATCH ()-[r]-()
        WHERE r.codebaseId = $codebaseId OR
              r.sourceCodebaseId = $codebaseId OR
              r.targetCodebaseId = $codebaseId
        DELETE r
      `;
      
      await queryExecutor.executeQuery(cleanupRelQuery, { codebaseId });
      
      console.log('Cleanup completed successfully');
      if (perfTracker) perfTracker.mark('cleanup_complete');
    } catch (error) {
      console.error('Error during cleanup:', error);
      process.exit(1);
    } finally {
      // Close the connection
      await queryExecutor.close();
    }
  } else {
    console.log('\nSkipping cleanup as requested with --no-cleanup');
  }
  
  // Step 2: Analyze the project
  console.log(`\nStep 2: Analyzing project...`);
  if (perfTracker) perfTracker.mark('analysis_start');
  
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
    // Process the codebase (but don't import to Neo4j yet - set neo4j to undefined)
    const analysisConfig = {
      ...config,
      neo4j: undefined // Don't import to Neo4j during analysis
    };
    
    const analysisCodeGraph = new TSCodeGraph(analysisConfig);
    await analysisCodeGraph.process(skipValidation);
    await analysisCodeGraph.close();
    
    console.log('\nAnalysis complete!');
    console.log(`Results saved to ${outputDir}`);
    if (perfTracker) perfTracker.mark('analysis_complete');
  } finally {
    // Close connections
    await codeGraph.close();
  }
  
  // Step 3: Import the JSON files to Neo4j
  console.log(`\nStep 3: Importing analysis results to Neo4j...`);
  if (perfTracker) perfTracker.mark('import_start');
  
  // Perform import directly in the CLI
  console.log(`Importing codebase: ${codebaseId} from ${outputDir}`);
  
  // Create query executor
  const { QueryExecutor } = await import('./neo4j/query-executor.js');
  const queryExecutor = new QueryExecutor(neo4jConfig);
  
  try {
    // Read nodes and relationships from JSON files
    const nodesPath = path.join(outputDir, 'nodes.json');
    const relationshipsPath = path.join(outputDir, 'relationships.json');
    
    if (!fs.existsSync(nodesPath) || !fs.existsSync(relationshipsPath)) {
      console.error(`Error: JSON files not found in ${outputDir}`);
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
      
      // Process nodes to handle Map objects
      const processedBatch = batch.map((node: any) => {
        const processed = { ...node };
        
        // Handle Map objects and other complex types
        for (const key in processed) {
          // Check for Map objects specifically
          if (processed[key] &&
              typeof processed[key] === 'object' &&
              processed[key].constructor &&
              processed[key].constructor.name === 'Map') {
            console.log(`Converting Map in node ${node.nodeId}, property ${key} to JSON string`);
            try {
              // Convert Map to object then to JSON string
              const mapObj: Record<string, any> = {};
              for (const [k, v] of Object.entries(processed[key])) {
                mapObj[k] = v;
              }
              processed[key + 'Json'] = JSON.stringify(mapObj);
              delete processed[key];
            } catch (e) {
              console.log(`Error converting Map in node ${node.nodeId}, property ${key}: ${e}`);
              delete processed[key];
            }
          }
          // Handle other non-primitive objects (except arrays)
          else if (processed[key] !== null &&
              typeof processed[key] === 'object' &&
              !Array.isArray(processed[key])) {
            try {
              processed[key + 'Json'] = JSON.stringify(processed[key]);
              delete processed[key];
            } catch (e) {
              console.log(`Error converting object in node ${node.nodeId}, property ${key}: ${e}`);
              delete processed[key];
            }
          }
        }
        
        return processed;
      });
      
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
      
      const result = await queryExecutor.executeQuery(query, { nodes: processedBatch });
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
        const transformedBatch = batch.map((rel: any) => {
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
            // Check for Map objects specifically
            if (transformed[key] &&
                typeof transformed[key] === 'object' &&
                transformed[key].constructor &&
                transformed[key].constructor.name === 'Map') {
              console.log(`Converting Map in relationship ${rel.nodeId}, property ${key} to JSON string`);
              try {
                // Convert Map to object then to JSON string
                const mapObj: Record<string, any> = {};
                for (const [k, v] of Object.entries(transformed[key])) {
                  mapObj[k] = v;
                }
                transformed[key + 'Json'] = JSON.stringify(mapObj);
                delete transformed[key];
              } catch (e) {
                console.log(`Error converting Map in relationship ${rel.nodeId}, property ${key}: ${e}`);
                delete transformed[key];
              }
            }
            // Handle other non-primitive objects
            else if (transformed[key] !== null &&
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
    console.log(`\nIngestion complete! Codebase '${codebaseId}' is now available in Neo4j.`);
    if (perfTracker) perfTracker.mark('import_complete');
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  } finally {
    // Close the connection
    if (perfTracker) perfTracker.mark('cleanup_connection');
    await queryExecutor.close();
    if (perfTracker) perfTracker.mark('ingest_complete');
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});