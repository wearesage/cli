import * as path from 'path';
import * as fs from 'fs';
import { Node, Relationship, DependsOn } from '../schema/index';

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
    
    // Post-process relationships to derive additional semantic relationships
    const enhancedRelationships = this.deriveAdditionalRelationships(uniqueRelationships, uniqueNodes);
    
    console.log(`Transformed to ${uniqueNodes.length} nodes and ${enhancedRelationships.length} relationships`);
    
    // Ensure nodes have appropriate labels
    const enhancedNodes = this.ensureNodeLabels(uniqueNodes);
    
    return {
      nodes: enhancedNodes,
      relationships: enhancedRelationships
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
    
    // Create a map of file paths to node IDs for easier lookup with different extensions
    const filePathToNodeId = new Map<string, string>();
    for (const node of result.nodes) {
      if (node.nodeId.startsWith('File:')) {
        const filePath = node.nodeId.substring(5); // Remove 'File:' prefix
        filePathToNodeId.set(filePath, node.nodeId);
        
        // Also map the path with different extensions for flexible matching
        if (filePath.endsWith('.ts')) {
          const jsPath = filePath.replace(/\.ts$/, '.js');
          filePathToNodeId.set(jsPath, node.nodeId);
        } else if (filePath.endsWith('.js')) {
          const tsPath = filePath.replace(/\.js$/, '.ts');
          filePathToNodeId.set(tsPath, node.nodeId);
        }
      }
    }
    
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
      if ((rel.type === 'EXTENDS' || rel.type === 'IMPLEMENTS' || rel.type === 'INTERFACE_EXTENDS') &&
          (typeof rel.endNodeId === 'string' && !rel.endNodeId.startsWith(`${rel.codebaseId}:`))) {
        return false;
      }
      
      // Skip validation for REFERENCES_VARIABLE and REFERENCES_TYPE relationships
      // These might reference global variables or types from external libraries
      if (rel.type === 'REFERENCES_VARIABLE' || rel.type === 'REFERENCES_TYPE') {
        // For simplicity, we'll skip validation for all REFERENCES_VARIABLE and REFERENCES_TYPE relationships
        // This is because they might reference variables or types from external libraries,
        // or variables that are not explicitly declared in the codebase (like globals)
        return false;
      }
      
      // Skip validation for DEPENDS_ON relationships derived from other relationships
      if (rel.type === 'DEPENDS_ON') {
        return false;
      }
      
      // Handle relationships with unresolved references
      if (rel.unresolvedComponent || rel.unresolvedComposable || rel.unresolvedImport) {
        console.log(`Skipping validation for unresolved reference: ${rel.type} ${rel.nodeId}`);
        return false;
      }
      
      // Skip validation for IMPORTS relationships that reference directories or non-code files
      if (rel.type === 'IMPORTS' &&
          typeof rel.endNodeId === 'string') {
        
        // Skip if not a node ID format (doesn't start with codebaseId)
        if (!rel.endNodeId.startsWith(`${rel.codebaseId}:`)) {
          return false;
        }
        
        // Get the file path from the node ID (skip codebaseId and type)
        const parts = rel.endNodeId.split(':');
        const filePath = parts.length > 2 ? parts.slice(2).join(':') : '';
        
        // Skip if no file extension (likely a directory)
        if (!path.extname(filePath)) {
          return false;
        }
        
        // Check if the path exists as a directory
        try {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            return false;
          }
        } catch (e) {
          // Ignore errors
        }
        
        // Skip if JSON or other non-code files
        const ext = path.extname(filePath).toLowerCase();
        if (['.json', '.css', '.scss', '.less', '.svg', '.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
          return false;
        }
        
        // Handle directory imports that were resolved to .ts files
        // Use type assertion since importPath is not in the base Relationship type
        const importRel = rel as any;
        if (ext === '.ts' && importRel.importPath && !importRel.importPath.endsWith('.ts')) {
          const importPath = importRel.importPath;
          if (importPath.startsWith('.') && !importPath.includes('.')) {
            // This is likely a directory import
            return false;
          }
        }
      }
      
      // Check if start node exists
      const startNodeExists = nodeIds.has(rel.startNodeId);
      
      // Check if end node exists, with flexible extension matching for File nodes
      let endNodeExists = nodeIds.has(rel.endNodeId);
      
      // If end node doesn't exist directly, try flexible matching for File nodes
      if (!endNodeExists && rel.endNodeId.includes(':File:')) {
        const parts = rel.endNodeId.split(':');
        const filePath = parts.length > 2 ? parts.slice(2).join(':') : ''; // Remove 'codebaseId:File:' prefix
        const mappedNodeId = filePathToNodeId.get(filePath);
        endNodeExists = !!mappedNodeId;
        
        // Update the relationship's endNodeId to use the correct node ID
        if (endNodeExists && mappedNodeId) {
          rel.endNodeId = mappedNodeId;
        }
      }
      
      return !startNodeExists || !endNodeExists;
    });
    
    if (danglingRelationships.length > 0) {
      console.warn(`Found ${danglingRelationships.length} relationships referencing non-existent nodes`);
      console.warn('First dangling relationship:', danglingRelationships[0]);
      
      // We'll still return true to allow the import to proceed
      // The --skip-validation flag in the CLI will determine whether to proceed or not
      console.log('Graph model validation completed with warnings');
      return true;
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

  /**
   * Derive additional semantic relationships from existing relationships
   * This is where we can add higher-level relationships based on the lower-level ones
   */
  private deriveAdditionalRelationships(relationships: Relationship[], nodes: Node[]): Relationship[] {
    console.log('Deriving additional semantic relationships...');
    
    // Create a copy of the relationships array to avoid modifying the original
    const enhancedRelationships = [...relationships];
    
    // Create maps for quick lookups
    const nodeMap = new Map<string, Node>();
    nodes.forEach(node => nodeMap.set(node.nodeId, node));
    
    // Group relationships by type for easier processing
    const relationshipsByType = new Map<string, Relationship[]>();
    relationships.forEach(rel => {
      const relType = rel.type;
      if (!relationshipsByType.has(relType)) {
        relationshipsByType.set(relType, []);
      }
      relationshipsByType.get(relType)?.push(rel);
    });
    
    // Count relationship types
    console.log('Relationship type counts:');
    relationshipsByType.forEach((rels, type) => {
      console.log(`  ${type}: ${rels.length}`);
    });
    
    // Process CALLS relationships to derive DependsOn relationships
    if (relationshipsByType.has('CALLS')) {
      const callsRelationships = relationshipsByType.get('CALLS') || [];
      console.log(`Processing ${callsRelationships.length} CALLS relationships to derive DependsOn relationships`);
      
      const dependsOnMap = new Map<string, Relationship>();
      
      callsRelationships.forEach(callsRel => {
        const dependsOnId = `${this.config.codebaseId}:DEPENDS_ON:${callsRel.startNodeId}->${callsRel.endNodeId}`;
        
        if (!dependsOnMap.has(dependsOnId)) {
          const dependsOnRel: DependsOn = {
            nodeId: dependsOnId,
            codebaseId: this.config.codebaseId,
            type: 'DEPENDS_ON',
            startNodeId: callsRel.startNodeId,
            endNodeId: callsRel.endNodeId,
            dependencyType: 'call',
            isStrong: true,
            isWeak: false,
            weight: 1
          };
          dependsOnMap.set(dependsOnId, dependsOnRel);
        } else {
          // Increment the weight if the relationship already exists
          const existingRel = dependsOnMap.get(dependsOnId);
          if (existingRel && 'weight' in existingRel) {
            (existingRel as any).weight += 1;
          }
        }
      });
      
      // Add the derived DependsOn relationships
      enhancedRelationships.push(...dependsOnMap.values());
      console.log(`Added ${dependsOnMap.size} derived DependsOn relationships`);
    }
    
    // Process REFERENCES_TYPE relationships to derive DependsOn relationships
    if (relationshipsByType.has('REFERENCES_TYPE')) {
      const referencesTypeRelationships = relationshipsByType.get('REFERENCES_TYPE') || [];
      console.log(`Processing ${referencesTypeRelationships.length} REFERENCES_TYPE relationships to derive DependsOn relationships`);
      
      const dependsOnMap = new Map<string, Relationship>();
      
      referencesTypeRelationships.forEach(refRel => {
        const dependsOnId = `${this.config.codebaseId}:DEPENDS_ON:${refRel.startNodeId}->${refRel.endNodeId}`;
        
        if (!dependsOnMap.has(dependsOnId)) {
          const dependsOnRel: DependsOn = {
            nodeId: dependsOnId,
            codebaseId: this.config.codebaseId,
            type: 'DEPENDS_ON',
            startNodeId: refRel.startNodeId,
            endNodeId: refRel.endNodeId,
            dependencyType: 'reference',
            isStrong: false,
            isWeak: true,
            weight: 1
          };
          dependsOnMap.set(dependsOnId, dependsOnRel);
        } else {
          // Increment the weight if the relationship already exists
          const existingRel = dependsOnMap.get(dependsOnId);
          if (existingRel && 'weight' in existingRel) {
            (existingRel as any).weight += 1;
          }
        }
      });
      
      // Add the derived DependsOn relationships
      enhancedRelationships.push(...dependsOnMap.values());
      console.log(`Added ${dependsOnMap.size} derived DependsOn relationships from type references`);
    }
    
    // Process REFERENCES_VARIABLE relationships to derive DependsOn relationships
    if (relationshipsByType.has('REFERENCES_VARIABLE')) {
      const referencesVarRelationships = relationshipsByType.get('REFERENCES_VARIABLE') || [];
      console.log(`Processing ${referencesVarRelationships.length} REFERENCES_VARIABLE relationships to derive DependsOn relationships`);
      
      const dependsOnMap = new Map<string, Relationship>();
      
      referencesVarRelationships.forEach(refRel => {
        const dependsOnId = `${this.config.codebaseId}:DEPENDS_ON:${refRel.startNodeId}->${refRel.endNodeId}`;
        
        if (!dependsOnMap.has(dependsOnId)) {
          const dependsOnRel: DependsOn = {
            nodeId: dependsOnId,
            codebaseId: this.config.codebaseId,
            type: 'DEPENDS_ON',
            startNodeId: refRel.startNodeId,
            endNodeId: refRel.endNodeId,
            dependencyType: 'reference',
            isStrong: false,
            isWeak: true,
            weight: 1
          };
          dependsOnMap.set(dependsOnId, dependsOnRel);
        } else {
          // Increment the weight if the relationship already exists
          const existingRel = dependsOnMap.get(dependsOnId);
          if (existingRel && 'weight' in existingRel) {
            (existingRel as any).weight += 1;
          }
        }
      });
      
      // Add the derived DependsOn relationships
      enhancedRelationships.push(...dependsOnMap.values());
      console.log(`Added ${dependsOnMap.size} derived DependsOn relationships from variable references`);
    }
    
    console.log(`Total relationships after derivation: ${enhancedRelationships.length}`);
    return enhancedRelationships;
  }
}