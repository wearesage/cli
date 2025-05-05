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
exports.TSCodeGraph = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const ts_parser_1 = require("./parser/ts-parser");
const vue_parser_1 = require("./parser/vue-parser");
const package_parser_1 = require("./parser/package-parser");
const index_1 = require("./schema/index");
const importer_1 = require("./neo4j/importer");
const graph_transformer_1 = require("./transformer/graph-transformer");
const query_executor_1 = require("./neo4j/query-executor");
/**
 * Main class for the TypeScript codebase to Neo4j graph system
 */
class TSCodeGraph {
    /**
     * Create a new TSCodeGraph instance
     */
    constructor(config) {
        this.vueParser = null;
        this.queryExecutor = null;
        this.config = config;
        this.tsParser = new ts_parser_1.TSParser({
            rootDir: config.rootDir,
            codebaseId: config.codebaseId
        });
        // Initialize Vue parser if needed
        this.vueParser = new vue_parser_1.VueParser({
            rootDir: config.rootDir,
            codebaseId: config.codebaseId,
            tsParser: this.tsParser
        });
        // Initialize Package parser
        this.packageParser = new package_parser_1.PackageParser({
            rootDir: config.rootDir,
            codebaseId: config.codebaseId
        });
        this.transformer = new graph_transformer_1.GraphTransformer({
            codebaseId: config.codebaseId
        });
        // Create output directory if it doesn't exist
        if (!fs.existsSync(config.outputDir)) {
            fs.mkdirSync(config.outputDir, { recursive: true });
        }
        // Initialize query executor if Neo4j config is provided
        if (config.neo4j) {
            this.queryExecutor = new query_executor_1.QueryExecutor({
                uri: config.neo4j.uri,
                username: config.neo4j.username,
                password: config.neo4j.password,
                database: config.neo4j.database,
                defaultTimeout: config.neo4j.defaultTimeout,
                defaultCodebaseId: config.codebaseId
            });
        }
    }
    /**
     * Process a TypeScript codebase and generate a Neo4j graph
     */
    async process(skipValidation = false) {
        console.log(`Processing codebase: ${this.config.codebaseId}`);
        console.log(`Root directory: ${this.config.rootDir}`);
        console.log(`Schema version: ${index_1.SCHEMA_VERSION}`);
        // Create a Codebase node
        const codebaseNode = {
            nodeId: this.config.codebaseId,
            name: this.config.codebaseId,
            codebaseId: this.config.codebaseId, // Required by Node type
            createdAt: new Date().toISOString(),
            description: `Codebase from ${this.config.rootDir}`,
            language: "typescript", // Default to typescript
            labels: ["Codebase", "Node"]
        };
        console.log(`Created Codebase node: ${codebaseNode.nodeId}`);
        // Find all TypeScript and Vue files
        const sourceFiles = this.findSourceFiles(this.config.rootDir);
        const vueFileCount = sourceFiles.filter((file) => file.endsWith('.vue')).length;
        const tsFileCount = sourceFiles.length - vueFileCount;
        console.log(`Found ${tsFileCount} TypeScript files and ${vueFileCount} Vue files`);
        // Initialize the TypeScript parser
        this.tsParser.initialize(sourceFiles);
        // Parse each file
        const parseResults = [];
        const parseStart = performance.now();
        for (const file of sourceFiles) {
            console.log(`Parsing file: ${file}`);
            try {
                let result;
                if (file.endsWith('.vue')) {
                    // Parse Vue files with the Vue parser
                    if (!this.vueParser) {
                        throw new Error('Vue parser not initialized but Vue files were found');
                    }
                    result = this.vueParser.parseFile(file);
                }
                else {
                    // Parse TypeScript files with the TypeScript parser
                    result = this.tsParser.parseFile(file);
                }
                parseResults.push(result);
            }
            catch (error) {
                console.error(`Error parsing file ${file}:`, error);
            }
        }
        console.log(`Parsed ${parseResults.length} files in ${(performance.now() - parseStart).toFixed(2)} ms`);
        // Build a component registry and resolve component references
        console.log('Building component registry and resolving component references...');
        const resolveStart = performance.now();
        this.resolveComponentReferences(parseResults);
        console.log(`Resolved component references in ${(performance.now() - resolveStart).toFixed(2)} ms`);
        const transformStart = performance.now();
        // Transform the parse results into a graph model
        const transformResult = this.transformer.transform(parseResults);
        // Validate the graph model (unless skipped)
        if (!skipValidation) {
            const isValid = this.transformer.validate(transformResult);
            if (!isValid) {
                throw new Error('Graph model validation failed');
            }
        }
        else {
            console.log('Skipping graph model validation');
        }
        const { nodes, relationships } = transformResult;
        console.log(`Transformed to ${nodes.length} nodes and ${relationships.length} relationships in ${(performance.now() - transformStart).toFixed(2)} ms`);
        // Parse package.json files
        console.log('Parsing package.json files...');
        const packageStart = performance.now();
        // Pass the existing relationships to the PackageParser so it can link dependencies to imports
        const packageResult = this.packageParser.parseAllPackageJsonFiles(nodes, relationships);
        console.log(`Parsed package.json files in ${(performance.now() - packageStart).toFixed(2)} ms`);
        console.log(`Found ${packageResult.nodes.length} package nodes and ${packageResult.relationships.length} package relationships`);
        // Add package nodes and relationships to the graph without using spread operator
        console.log('Adding package nodes and relationships to the graph...');
        for (const node of packageResult.nodes) {
            nodes.push(node);
        }
        for (const relationship of packageResult.relationships) {
            relationships.push(relationship);
        }
        // Add the Codebase node to the list of nodes
        nodes.push(codebaseNode);
        console.log(`Added Codebase node to nodes list (total: ${nodes.length} nodes)`);
        // Save the results
        this.saveResults(nodes, relationships);
        // Import to Neo4j if configured
        if (this.config.neo4j) {
            await this.importToNeo4j(nodes, relationships);
        }
        console.log('Processing complete');
    }
    /**
     * Find all TypeScript and Vue files in a directory
     */
    findSourceFiles(dir) {
        const files = [];
        const walk = (directory) => {
            const entries = fs.readdirSync(directory, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name);
                if (entry.isDirectory()) {
                    // Skip node_modules and other common directories to ignore
                    if (entry.name !== 'node_modules' && entry.name !== 'dist' && !entry.name.startsWith('.')) {
                        walk(fullPath);
                    }
                }
                else if (entry.isFile()) {
                    // Check for TypeScript files
                    if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.d.ts')) {
                        files.push(fullPath);
                    }
                    // Check for Vue files
                    else if (entry.name.endsWith('.vue')) {
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
    saveResults(nodes, relationships) {
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
    async importToNeo4j(nodes, relationships) {
        if (!this.config.neo4j) {
            throw new Error('Neo4j configuration not provided');
        }
        console.log('Importing to Neo4j...');
        const importer = new importer_1.Neo4jImporter({
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
            console.log(`Schema version: ${index_1.SCHEMA_VERSION}`);
            console.log(`Node types: ${index_1.SCHEMA_METADATA.nodeTypes.length}`);
            console.log(`Relationship types: ${index_1.SCHEMA_METADATA.relationshipTypes.length}`);
            // Initialize query executor if not already initialized
            if (!this.queryExecutor) {
                this.queryExecutor = new query_executor_1.QueryExecutor({
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
        }
        catch (error) {
            console.error('Error importing to Neo4j:', error);
            throw error;
        }
        finally {
            if (importer) {
                await importer.close();
            }
        }
    }
    /**
     * Build a component registry and resolve component references
     */
    resolveComponentReferences(parseResults) {
        // Build a registry of all Vue components
        const componentRegistry = new Map();
        const chunkSize = 1000; // Process in chunks to reduce memory pressure
        console.log('Building component registry...');
        // First pass: collect all Vue components
        let processedResults = 0;
        for (const result of parseResults) {
            if (result.nodes) {
                for (let i = 0; i < result.nodes.length; i++) {
                    const node = result.nodes[i];
                    if (node.labels && Array.isArray(node.labels) && node.labels.includes('VueComponent')) {
                        // Map component name to its nodeId
                        componentRegistry.set(node.name, node.nodeId);
                    }
                }
            }
            // Log progress periodically
            processedResults++;
            if (processedResults % 500 === 0) {
                console.log(`Building component registry: processed ${processedResults}/${parseResults.length} results (${Math.round(processedResults / parseResults.length * 100)}%)`);
            }
        }
        console.log(`Found ${componentRegistry.size} Vue components`);
        // Second pass: resolve component references in relationships
        console.log('Resolving component references...');
        processedResults = 0;
        for (const result of parseResults) {
            if (result.relationships) {
                for (let i = 0; i < result.relationships.length; i++) {
                    const relationship = result.relationships[i];
                    // Handle Vue-specific relationships
                    if (['RENDERS', 'PROVIDES_PROPS', 'LISTENS_TO', 'USES_SLOT'].includes(relationship.type)) {
                        // If endNodeId doesn't start with codebaseId, it's a placeholder component name
                        if (typeof relationship.endNodeId === 'string' && !relationship.endNodeId.startsWith(`${relationship.codebaseId}:`)) {
                            const componentName = relationship.endNodeId;
                            const resolvedNodeId = componentRegistry.get(componentName);
                            if (resolvedNodeId) {
                                // Replace placeholder with actual node ID
                                relationship.endNodeId = resolvedNodeId;
                            }
                            else {
                                // Keep the placeholder but mark it for special handling
                                relationship.unresolvedComponent = true;
                            }
                        }
                    }
                    // Handle composable references
                    if (relationship.type === 'USES_COMPOSABLE') {
                        if (typeof relationship.endNodeId === 'string' && !relationship.endNodeId.startsWith(`${relationship.codebaseId}:`)) {
                            // For now, we'll keep these as is, but mark them for special handling
                            relationship.unresolvedComposable = true;
                        }
                    }
                    // Handle import references
                    if (relationship.type === 'IMPORTS') {
                        if (typeof relationship.endNodeId === 'string' && !relationship.endNodeId.startsWith(`${relationship.codebaseId}:`)) {
                            // For now, we'll keep these as is, but mark them for special handling
                            relationship.unresolvedImport = true;
                        }
                    }
                }
            }
            // Log progress periodically
            processedResults++;
            if (processedResults % 500 === 0) {
                console.log(`Resolving component references: processed ${processedResults}/${parseResults.length} results (${Math.round(processedResults / parseResults.length * 100)}%)`);
            }
        }
        console.log(`Component registry built with ${componentRegistry.size} components`);
    }
    /**
     * Execute a Cypher query against the Neo4j database
     */
    async executeQuery(cypher, parameters = {}) {
        if (!this.queryExecutor) {
            throw new Error('Query executor not initialized. Make sure Neo4j configuration is provided.');
        }
        return this.queryExecutor.executeQuery(cypher, parameters);
    }
    /**
     * Execute a Cypher query scoped to this codebase
     */
    async executeCodebaseScopedQuery(cypher, parameters = {}) {
        if (!this.queryExecutor) {
            throw new Error('Query executor not initialized. Make sure Neo4j configuration is provided.');
        }
        return this.queryExecutor.executeCodebaseScopedQuery(this.config.codebaseId, cypher, parameters);
    }
    /**
     * Execute a Cypher query that spans multiple codebases
     */
    async executeCrossCodebaseQuery(cypher, parameters = {}) {
        if (!this.queryExecutor) {
            throw new Error('Query executor not initialized. Make sure Neo4j configuration is provided.');
        }
        return this.queryExecutor.executeCrossCodebaseQuery(cypher, parameters);
    }
    /**
     * Close all connections
     */
    async close() {
        if (this.queryExecutor) {
            await this.queryExecutor.close();
        }
    }
    /**
     * Get information about all codebases in the database
     */
    async listCodebases() {
        if (!this.queryExecutor) {
            throw new Error('Query executor not initialized. Make sure Neo4j configuration is provided.');
        }
        const result = await this.queryExecutor.executeQuery(`
      MATCH (n:Node)
      WITH DISTINCT n.codebaseId AS codebaseId
      MATCH (n:Node {codebaseId: codebaseId})
      WITH codebaseId, count(n) AS nodeCount
      RETURN codebaseId, nodeCount
      ORDER BY codebaseId
    `);
        return result.records;
    }
    /**
     * Find cross-codebase relationships
     */
    async findCrossCodebaseRelationships() {
        if (!this.queryExecutor) {
            throw new Error('Query executor not initialized. Make sure Neo4j configuration is provided.');
        }
        const result = await this.queryExecutor.executeQuery(`
      MATCH (source:Node)-[r {isCrossCodebase: true}]->(target:Node)
      RETURN
        r.type AS relationshipType,
        source.nodeId AS sourceNodeId,
        target.nodeId AS targetNodeId,
        source.codebaseId AS sourceCodebaseId,
        target.codebaseId AS targetCodebaseId,
        count(*) AS count
      ORDER BY count DESC
    `);
        return result.records;
    }
    /**
     * Find dependencies between codebases
     */
    async findCodebaseDependencies() {
        if (!this.queryExecutor) {
            throw new Error('Query executor not initialized. Make sure Neo4j configuration is provided.');
        }
        const result = await this.queryExecutor.executeQuery(`
      MATCH (source:Node)-[r {isCrossCodebase: true}]->(target:Node)
      WITH source.codebaseId AS sourceCodebase, target.codebaseId AS targetCodebase, count(*) AS relationshipCount
      RETURN sourceCodebase, targetCodebase, relationshipCount
      ORDER BY relationshipCount DESC
    `);
        return result.records;
    }
}
exports.TSCodeGraph = TSCodeGraph;
/**
 * Command-line interface for the TypeScript codebase to Neo4j graph system
 */
async function main() {
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
    const config = {
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
//# sourceMappingURL=index.js.map