#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const index_1 = require("./index");
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
            case 'ingest':
                await ingestProject(args.slice(1));
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
    }
    catch (error) {
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
async function analyzeProject(args) {
    if (args.length < 1) {
        console.error('Error: Project path is required');
        printUsage();
        process.exit(1);
    }
    // Check for --skip-validation flag
    const skipValidation = args.includes('--skip-validation');
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
    }
    else {
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
    const codeGraph = new index_1.TSCodeGraph(config);
    try {
        // Process the codebase
        await codeGraph.process(skipValidation);
        console.log('\nAnalysis complete!');
        console.log(`Results saved to ${outputDir}`);
        if (neo4jConfig) {
            console.log(`Graph data imported to Neo4j at ${neo4jConfig.uri}`);
        }
    }
    finally {
        // Close connections
        await codeGraph.close();
    }
}
/**
 * Run a Cypher query against the Neo4j database
 */
async function queryGraph(args) {
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
    const codeGraph = new index_1.TSCodeGraph(config);
    try {
        // Execute the query
        const result = await codeGraph.executeQuery(cypherQuery, { codebaseId });
        console.log('\nQuery result:');
        console.log(JSON.stringify(result.records, null, 2));
        console.log('\nSummary:');
        console.log(`  Records: ${result.summary.recordCount}`);
        console.log(`  Execution time: ${result.summary.executionTime}ms`);
    }
    finally {
        // Close connections
        await codeGraph.close();
    }
}
/**
 * Ingest a TypeScript project from the current directory
 * This combines cleanup, analysis, and import in one command
 */
async function ingestProject(args) {
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
        // Perform cleanup directly in the CLI
        console.log(`Cleaning up codebase: ${codebaseId}`);
        // Create query executor
        const { QueryExecutor } = await import('./neo4j/query-executor.js');
        const queryExecutor = new QueryExecutor(neo4jConfig);
        try {
            // First, count the nodes to be deleted
            const countResult = await queryExecutor.executeQuery(`MATCH (n)
         WHERE n.codebaseId = $codebaseId
            OR n.nodeId STARTS WITH $codebaseIdPrefix
            OR n.nodeId = $codebaseId
            OR (n:Codebase AND n.name = $codebaseId)
         RETURN count(n) as nodeCount`, {
                codebaseId,
                codebaseIdPrefix: `${codebaseId}:`
            });
            // Handle different record formats
            let nodeCount = 0;
            if (countResult.records && countResult.records.length > 0) {
                const record = countResult.records[0];
                if (typeof record.get === 'function') {
                    nodeCount = record.get('nodeCount').toNumber();
                }
                else if (record.nodeCount !== undefined) {
                    nodeCount = typeof record.nodeCount === 'number' ?
                        record.nodeCount :
                        (record.nodeCount.low || 0);
                }
            }
            console.log(`Found ${nodeCount} nodes to delete`);
            if (nodeCount === 0) {
                console.log('No nodes found for this codebase. Nothing to delete.');
            }
            else {
                // Ask for confirmation
                console.log(`WARNING: This will delete all nodes and relationships for codebase '${codebaseId}'`);
                console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');
                // Wait for 5 seconds
                await new Promise(resolve => setTimeout(resolve, 5000));
                // Delete all nodes and relationships for this codebase
                console.log('Deleting nodes and relationships...');
                try {
                    const deleteResult = await queryExecutor.executeQuery(`MATCH (n)
             WHERE n.codebaseId = $codebaseId
                OR n.nodeId STARTS WITH $codebaseIdPrefix
                OR n.nodeId = $codebaseId
                OR (n:Codebase AND n.name = $codebaseId)
             DETACH DELETE n
             RETURN count(n) as deletedCount`, {
                        codebaseId,
                        codebaseIdPrefix: `${codebaseId}:`
                    });
                    // Handle different record formats
                    let deletedCount = 0;
                    if (deleteResult.records && deleteResult.records.length > 0) {
                        const record = deleteResult.records[0];
                        if (typeof record.get === 'function') {
                            deletedCount = record.get('deletedCount').toNumber();
                        }
                        else if (record.deletedCount !== undefined) {
                            deletedCount = typeof record.deletedCount === 'number' ?
                                record.deletedCount :
                                (record.deletedCount.low || 0);
                        }
                    }
                    console.log(`Successfully deleted ${deletedCount} nodes and their relationships`);
                    // Also clean up any dangling relationships that might have the codebase in their properties
                    try {
                        const cleanupResult = await queryExecutor.executeQuery(`MATCH ()-[r]-()
               WHERE r.codebaseId = $codebaseId OR
                     r.sourceCodebaseId = $codebaseId OR
                     r.targetCodebaseId = $codebaseId
               DELETE r
               RETURN count(r) as deletedRelCount`, { codebaseId });
                        // Handle different record formats
                        let deletedRelCount = 0;
                        if (cleanupResult.records && cleanupResult.records.length > 0) {
                            const record = cleanupResult.records[0];
                            if (typeof record.get === 'function') {
                                deletedRelCount = record.get('deletedRelCount').toNumber();
                            }
                            else if (record.deletedRelCount !== undefined) {
                                deletedRelCount = typeof record.deletedRelCount === 'number' ?
                                    record.deletedRelCount :
                                    (record.deletedRelCount.low || 0);
                            }
                        }
                        console.log(`Additionally cleaned up ${deletedRelCount} dangling relationships`);
                    }
                    catch (relError) {
                        console.warn(`Warning: Could not clean up dangling relationships: ${relError}`);
                        console.log('This is not critical - the main nodes have been deleted');
                    }
                }
                catch (error) {
                    console.error(`Error deleting nodes for codebase ${codebaseId}:`, error);
                    throw error;
                }
            }
            console.log('Cleanup completed successfully');
        }
        catch (error) {
            console.error('Error during cleanup:', error);
            process.exit(1);
        }
        finally {
            // Close the connection
            await queryExecutor.close();
        }
    }
    else {
        console.log('\nSkipping cleanup as requested with --no-cleanup');
    }
    // Step 2: Analyze the project
    console.log(`\nStep 2: Analyzing project...`);
    // Create config
    const config = {
        rootDir: projectPath,
        outputDir,
        codebaseId,
        neo4j: neo4jConfig
    };
    // Create and run the graph generator
    const codeGraph = new index_1.TSCodeGraph(config);
    try {
        // Process the codebase (but don't import to Neo4j yet - set neo4j to undefined)
        const analysisConfig = {
            ...config,
            neo4j: undefined // Don't import to Neo4j during analysis
        };
        const analysisCodeGraph = new index_1.TSCodeGraph(analysisConfig);
        await analysisCodeGraph.process(skipValidation);
        await analysisCodeGraph.close();
        console.log('\nAnalysis complete!');
        console.log(`Results saved to ${outputDir}`);
    }
    finally {
        // Close connections
        await codeGraph.close();
    }
    // Step 3: Import the JSON files to Neo4j
    console.log(`\nStep 3: Importing analysis results to Neo4j...`);
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
            const processedBatch = batch.map((node) => {
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
                            const mapObj = {};
                            for (const [k, v] of Object.entries(processed[key])) {
                                mapObj[k] = v;
                            }
                            processed[key + 'Json'] = JSON.stringify(mapObj);
                            delete processed[key];
                        }
                        catch (e) {
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
                        }
                        catch (e) {
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
                }
                else if (record.count !== undefined) {
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
        const relsByType = {};
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
                const transformedBatch = batch.map((rel) => {
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
                                const mapObj = {};
                                for (const [k, v] of Object.entries(transformed[key])) {
                                    mapObj[k] = v;
                                }
                                transformed[key + 'Json'] = JSON.stringify(mapObj);
                                delete transformed[key];
                            }
                            catch (e) {
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
                        }
                        else if (record.count !== undefined) {
                            count = typeof record.count === 'number' ?
                                record.count :
                                (record.count.low || 0);
                        }
                    }
                    importedRels += count;
                    console.log(`Imported ${importedRels}/${relationships.length} relationships`);
                }
                catch (error) {
                    console.error(`Error importing ${relType} relationships:`, error);
                    console.log('Continuing with next batch...');
                }
            }
        }
        console.log(`Successfully imported ${importedNodes} nodes and ${importedRels} relationships`);
        console.log(`\nIngestion complete! Codebase '${codebaseId}' is now available in Neo4j.`);
    }
    catch (error) {
        console.error('Error during import:', error);
        process.exit(1);
    }
    finally {
        // Close the connection
        await queryExecutor.close();
    }
}
// Run the main function
main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map