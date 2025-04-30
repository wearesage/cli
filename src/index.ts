import * as path from 'path';
import * as fs from 'fs';
import { TSParser } from './parser/ts-parser.ts';
import { SCHEMA_VERSION, SCHEMA_METADATA } from './schema/index.ts';
import { Neo4jImporter } from './neo4j/importer.ts';
import { GraphTransformer } from './transformer/graph-transformer.ts';
import { QueryExecutor } from './neo4j/query-executor.ts';

/**
 * Configuration for the TypeScript codebase to Neo4j graph system
 */
interface Config {
  /**
   * Root directory of the codebase to analyze
   */
  rootDir: string;
  
  /**
   * Unique identifier for the codebase
   */
  codebaseId: string;
  
  /**
   * Output directory for the graph data
   */
  outputDir: string;
  
  /**
   * Neo4j connection configuration
   */
  neo4j?: {
    uri: string;
    username: string;
    password: string;
    database?: string;
    defaultTimeout?: number;
  };
}

/**
 * Main class for the TypeScript codebase to Neo4j graph system
 */
class TSCodeGraph {
  private config: Config;
  private parser: TSParser;
  private transformer: GraphTransformer;
  private queryExecutor: QueryExecutor | null = null;
  
  /**
   * Create a new TSCodeGraph instance
   */
  constructor(config: Config) {
    this.config = config;
    this.parser = new TSParser({
      rootDir: config.rootDir,
      codebaseId: config.codebaseId
    });
    
    this.transformer = new GraphTransformer({
      codebaseId: config.codebaseId
    });
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Initialize query executor if Neo4j config is provided
    if (config.neo4j) {
      this.queryExecutor = new QueryExecutor({
        uri: config.neo4j.uri,
        username: config.neo4j.username,
        password: config.neo4j.password,
        database: config.neo4j.database,
        defaultTimeout: config.neo4j.defaultTimeout
      });
    }
  }
  
  /**
   * Process a TypeScript codebase and generate a Neo4j graph
   */
  public async process(): Promise<void> {
    console.log(`Processing codebase: ${this.config.codebaseId}`);
    console.log(`Root directory: ${this.config.rootDir}`);
    console.log(`Schema version: ${SCHEMA_VERSION}`);
    
    // Find all TypeScript files
    const tsFiles = this.findTypeScriptFiles(this.config.rootDir);
    console.log(`Found ${tsFiles.length} TypeScript files`);
    
    // Initialize the parser
    this.parser.initialize(tsFiles);
    
    // Parse each file
    const parseResults = [];

    const parseStart = performance.now();

    for (const file of tsFiles) {
      console.log(`Parsing file: ${file}`);
      try {
        const result = this.parser.parseFile(file);
        parseResults.push(result);
      } catch (error) {
        console.error(`Error parsing file ${file}:`, error);
      }
    }
    
    console.log(`Parsed ${parseResults.length} files in ${( performance.now() - parseStart ).toFixed(2)} ms`);
    
    const transformStart = performance.now();
    // Transform the parse results into a graph model
    const transformResult = this.transformer.transform(parseResults);
    
    // Validate the graph model
    const isValid = this.transformer.validate(transformResult);
    if (!isValid) {
      throw new Error('Graph model validation failed');
    }
    
    const { nodes, relationships } = transformResult;
    console.log(`Transformed to ${nodes.length} nodes and ${relationships.length} relationships in ${( performance.now() - transformStart ).toFixed(2)} ms`);
    
    // Save the results
    this.saveResults(nodes, relationships);
    
    // Import to Neo4j if configured
    if (this.config.neo4j) {
      await this.importToNeo4j(nodes, relationships);
    }
    
    console.log('Processing complete');
  }
  
  /**
   * Find all TypeScript files in a directory
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    
    const walk = (directory: string) => {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other common directories to ignore
          if (entry.name !== 'node_modules' && entry.name !== 'dist' && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          // Skip declaration files
          if (!entry.name.endsWith('.d.ts')) {
            files.push(fullPath);
          }
        }
      }
    };
    
    walk(dir);
    return files;
  }
  
  /**
   * Save the extracted nodes and relationships to files
   */
  private saveResults(nodes: any[], relationships: any[]): void {
    const nodesPath = path.join(this.config.outputDir, 'nodes.json');
    const relationshipsPath = path.join(this.config.outputDir, 'relationships.json');
    
    fs.writeFileSync(nodesPath, JSON.stringify(nodes, null, 2));
    fs.writeFileSync(relationshipsPath, JSON.stringify(relationships, null, 2));
    
    console.log(`Saved nodes to ${nodesPath}`);
    console.log(`Saved relationships to ${relationshipsPath}`);
  }
  
  /**
   * Import the extracted nodes and relationships to Neo4j
   */
  private async importToNeo4j(nodes: any[], relationships: any[]): Promise<void> {
    if (!this.config.neo4j) {
      throw new Error('Neo4j configuration not provided');
    }
    
    console.log('Importing to Neo4j...');
    
    const importer = new Neo4jImporter({
      uri: this.config.neo4j.uri,
      username: this.config.neo4j.username,
      password: this.config.neo4j.password,
      database: this.config.neo4j.database,
      batchSize: 500 // Smaller batch size for better progress feedback
    });
    
    try {
      await importer.import(nodes, relationships);
      console.log('Neo4j import complete');
      
      // Log schema information
      console.log(`Schema version: ${SCHEMA_VERSION}`);
      console.log(`Node types: ${SCHEMA_METADATA.nodeTypes.length}`);
      console.log(`Relationship types: ${SCHEMA_METADATA.relationshipTypes.length}`);
      
      // Initialize query executor if not already initialized
      if (!this.queryExecutor) {
        this.queryExecutor = new QueryExecutor({
          uri: this.config.neo4j.uri,
          username: this.config.neo4j.username,
          password: this.config.neo4j.password,
          database: this.config.neo4j.database
        });
      }
      
      // Run a simple query to verify the import
      const result = await this.queryExecutor.executeQuery(`
        MATCH (n)
        RETURN labels(n) AS labels, count(n) AS count
        ORDER BY count DESC
      `);
      
      console.log('Node counts by label:');
      for (const record of result.records) {
        console.log(`  ${record.labels.join(':')}: ${record.count.low}`);
      }
      
    } catch (error) {
      console.error('Error importing to Neo4j:', error);
      throw error;
    } finally {
      if (importer) {
        await importer.close();
      }
    }
  }
  
  /**
   * Execute a Cypher query against the Neo4j database
   */
  public async executeQuery(
    cypher: string,
    parameters: Record<string, any> = {}
  ): Promise<any> {
    if (!this.queryExecutor) {
      throw new Error('Query executor not initialized. Make sure Neo4j configuration is provided.');
    }
    
    return this.queryExecutor.executeQuery(cypher, parameters);
  }
  
  /**
   * Close all connections
   */
  public async close(): Promise<void> {
    if (this.queryExecutor) {
      await this.queryExecutor.close();
    }
  }
}

/**
 * Command-line interface for the TypeScript codebase to Neo4j graph system
 */
async function main(): Promise<void> {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: sage <root-dir> [output-dir] [codebase-id]');
    process.exit(1);
  }
  
  const rootDir = path.resolve(args[0]);
  const outputDir = args[1] ? path.resolve(args[1]) : path.join(process.cwd(), 'output');
  const codebaseId = args[2] || path.basename(rootDir);
  
  // Create config
  const config: Config = {
    rootDir,
    outputDir,
    codebaseId
  };
  
  // Create and run the graph generator
  const codeGraph = new TSCodeGraph(config);
  await codeGraph.process();
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

// Export for use as a library
export { TSCodeGraph, Config };