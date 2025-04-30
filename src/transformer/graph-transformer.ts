import { Node, Relationship } from '../schema/index.ts';

/**
 * Result of a graph transformation
 */
export interface TransformResult {
  /**
   * Nodes in the graph
   */
  nodes: Node[];
  
  /**
   * Relationships in the graph
   */
  relationships: Relationship[];
}

/**
 * Configuration for the graph transformer
 */
export interface GraphTransformerConfig {
  /**
   * Unique identifier for the codebase
   */
  codebaseId: string;
}

/**
 * Transformer for converting parsed TypeScript data into a graph model
 */
export class GraphTransformer {
  private config: GraphTransformerConfig;
  
  /**
   * Create a new graph transformer
   */
  constructor(config: GraphTransformerConfig) {
    this.config = config;
  }
  
  /**
   * Transform parsed TypeScript data into a graph model
   */
  public transform(parseResults: any[]): TransformResult {
    console.log(`Transforming ${parseResults.length} parse results into a graph model`);
    
    // Combine all nodes and relationships
    const nodes: Node[] = [];
    const relationships: Relationship[] = [];
    
    // Process each parse result
    for (const result of parseResults) {
      // Add nodes and relationships from the parse result
      nodes.push(...result.nodes);
      relationships.push(...result.relationships);
    }
    
    // Deduplicate nodes and relationships
    const uniqueNodes = this.deduplicateNodes(nodes);
    const uniqueRelationships = this.deduplicateRelationships(relationships);
    
    console.log(`Transformed to ${uniqueNodes.length} nodes and ${uniqueRelationships.length} relationships`);
    
    // Ensure nodes have appropriate labels
    const enhancedNodes = this.ensureNodeLabels(uniqueNodes);
    
    return {
      nodes: enhancedNodes,
      relationships: uniqueRelationships
    };
  }
  
  /**
   * Deduplicate nodes by nodeId
   */
  private deduplicateNodes(nodes: Node[]): Node[] {
    const nodeMap = new Map<string, Node>();
    
    for (const node of nodes) {
      nodeMap.set(node.nodeId, node);
    }
    
    return Array.from(nodeMap.values());
  }
  
  /**
   * Deduplicate relationships by nodeId
   */
  private deduplicateRelationships(relationships: Relationship[]): Relationship[] {
    const relationshipMap = new Map<string, Relationship>();
    
    for (const relationship of relationships) {
      relationshipMap.set(relationship.nodeId, relationship);
    }
    
    return Array.from(relationshipMap.values());
  }
  
  /**
   * Validate the graph model
   */
  public validate(result: TransformResult): boolean {
    console.log('Validating graph model...');
    
    // Check for nodes with missing required properties
    const invalidNodes = result.nodes.filter(node => !this.isValidNode(node));
    if (invalidNodes.length > 0) {
      console.error(`Found ${invalidNodes.length} invalid nodes`);
      console.error('First invalid node:', invalidNodes[0]);
      return false;
    }
    
    // Check for relationships with missing required properties
    const invalidRelationships = result.relationships.filter(rel => !this.isValidRelationship(rel));
    if (invalidRelationships.length > 0) {
      console.error(`Found ${invalidRelationships.length} invalid relationships`);
      console.error('First invalid relationship:', invalidRelationships[0]);
      return false;
    }
    
    // Check for relationships referencing non-existent nodes
    const nodeIds = new Set(result.nodes.map(node => node.nodeId));
    
    // Create a list of built-in Node.js modules to ignore in validation
    const builtInModules = new Set([
      'path', 'fs', 'os', 'util', 'events', 'stream', 'http', 'https',
      'net', 'crypto', 'child_process', 'buffer', 'url', 'querystring',
      'assert', 'zlib', 'tty', 'dgram', 'dns', 'cluster', 'readline',
      'string_decoder', 'timers', 'punycode', 'domain', 'process', 'v8',
      'module', 'console', 'worker_threads', 'perf_hooks', 'async_hooks',
      'vm', 'inspector', 'trace_events', 'wasi', 'repl', 'sys'
    ]);
    
    // Filter out relationships to built-in Node.js modules and special cases
    const danglingRelationships = result.relationships.filter(rel => {
      // Skip validation for all IMPORTS_FROM_PACKAGE relationships
      if (rel.type === 'IMPORTS_FROM_PACKAGE') {
        return false;
      }
      
      // Skip validation for EXPORTS_LOCAL relationships with endNodeId 'local'
      if (rel.type === 'EXPORTS_LOCAL' && rel.endNodeId === 'local') {
        return false;
      }
      
      // Skip validation for EXTENDS and IMPLEMENTS relationships that reference types by name
      if ((rel.type === 'EXTENDS' || rel.type === 'IMPLEMENTS') &&
          (typeof rel.endNodeId === 'string' && !rel.endNodeId.includes(':'))) {
        return false;
      }
      
      // Check if both start and end nodes exist
      return !nodeIds.has(rel.startNodeId) || !nodeIds.has(rel.endNodeId);
    });
    
    if (danglingRelationships.length > 0) {
      console.error(`Found ${danglingRelationships.length} relationships referencing non-existent nodes`);
      console.error('First dangling relationship:', danglingRelationships[0]);
      return false;
    }
    
    console.log('Graph model validation successful');
    return true;
  }
  
  /**
   * Check if a node is valid
   */
  private isValidNode(node: Node): boolean {
    return (
      !!node.nodeId &&
      !!node.codebaseId &&
      Array.isArray(node.labels) &&
      node.labels.length > 0
    );
  }

  /**
   * Ensure nodes have appropriate labels based on their interfaces
   * This is crucial for Neo4j schema alignment
   */
  private ensureNodeLabels(nodes: Node[]): Node[] {
    return nodes.map(node => {
      // Create a new node object to avoid modifying the original
      const enhancedNode = { ...node };
      
      // Ensure labels is an array
      if (!Array.isArray(enhancedNode.labels)) {
        enhancedNode.labels = [];
      }
      
      // Add CodeElement label to nodes that implement the CodeElement interface
      if ('name' in node && 'file' in node && 'startLine' in node && 'endLine' in node) {
        if (!enhancedNode.labels.includes('CodeElement')) {
          enhancedNode.labels.push('CodeElement');
        }
      }
      
      return enhancedNode;
    });
  }
  
  /**
   * Check if a relationship is valid
   */
  private isValidRelationship(relationship: Relationship): boolean {
    return (
      !!relationship.nodeId &&
      !!relationship.codebaseId &&
      !!relationship.type &&
      !!relationship.startNodeId &&
      !!relationship.endNodeId
    );
  }
}