/**
 * TypeScript Code Graph - Schema and API
 * 
 * This is the main entry point for the TypeScript Code Graph library.
 * It exports the full schema and the main TSCodeGraph class.
 */

// Re-export the schema
export * from './src/schema/types.ts';
export * from './src/schema/nodes.ts';
export * from './src/schema/relationships.ts';
export { SCHEMA_VERSION, SCHEMA_METADATA } from './src/schema/index.ts';

// Re-export the main class and types
export { TSCodeGraph, Config } from './src/index.ts';

// Export parser, transformer, and Neo4j components for advanced usage
export { TSParser } from './src/parser/ts-parser.ts';
export { GraphTransformer } from './src/transformer/graph-transformer.ts';
export { Neo4jImporter } from './src/neo4j/importer.ts';
export { QueryExecutor } from './src/neo4j/query-executor.ts';