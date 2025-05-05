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
exports.GraphTransformer = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Transformer for converting parsed TypeScript data into a graph model
 */
class GraphTransformer {
    /**
     * Create a new graph transformer
     */
    constructor(config) {
        this.config = config;
    }
    /**
     * Transform parsed TypeScript data into a graph model
     */
    transform(parseResults) {
        console.log(`Transforming ${parseResults.length} parse results into a graph model`);
        // Instead of accumulating everything in memory, we'll process in a streaming fashion
        // First, extract and deduplicate all node IDs to create a lookup map
        console.log('Building node ID lookup map...');
        const nodeIdMap = new Map();
        const relationshipIdMap = new Map();
        // Count total nodes and relationships for progress reporting
        let totalNodeCount = 0;
        let totalRelationshipCount = 0;
        // First pass: just count and build ID maps
        const batchSize = 100;
        for (let i = 0; i < parseResults.length; i += batchSize) {
            const endIdx = Math.min(i + batchSize, parseResults.length);
            console.log(`Counting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(parseResults.length / batchSize)} (${i}-${endIdx})`);
            for (let j = i; j < endIdx; j++) {
                const result = parseResults[j];
                if (result.nodes) {
                    for (let k = 0; k < result.nodes.length; k++) {
                        const nodeId = result.nodes[k].nodeId;
                        if (!nodeIdMap.has(nodeId)) {
                            nodeIdMap.set(nodeId, true);
                            totalNodeCount++;
                        }
                    }
                }
                if (result.relationships) {
                    for (let k = 0; k < result.relationships.length; k++) {
                        const relId = result.relationships[k].nodeId;
                        if (!relationshipIdMap.has(relId)) {
                            relationshipIdMap.set(relId, true);
                            totalRelationshipCount++;
                        }
                    }
                }
            }
            // Force garbage collection
            if (global.gc) {
                global.gc();
            }
        }
        console.log(`Found ${totalNodeCount} unique nodes and ${totalRelationshipCount} unique relationships`);
        // Pre-allocate arrays with known sizes to avoid resizing
        const nodes = new Array(totalNodeCount);
        const relationships = new Array(totalRelationshipCount);
        // Reset maps for second pass
        nodeIdMap.clear();
        relationshipIdMap.clear();
        // Second pass: actually collect unique nodes and relationships
        let nodeIndex = 0;
        let relationshipIndex = 0;
        for (let i = 0; i < parseResults.length; i += batchSize) {
            const endIdx = Math.min(i + batchSize, parseResults.length);
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(parseResults.length / batchSize)} (${i}-${endIdx})`);
            for (let j = i; j < endIdx; j++) {
                const result = parseResults[j];
                if (result.nodes) {
                    for (let k = 0; k < result.nodes.length; k++) {
                        const node = result.nodes[k];
                        if (!nodeIdMap.has(node.nodeId)) {
                            nodeIdMap.set(node.nodeId, true);
                            nodes[nodeIndex++] = node;
                        }
                    }
                    // Clear nodes array to free memory
                    result.nodes = [];
                }
                if (result.relationships) {
                    for (let k = 0; k < result.relationships.length; k++) {
                        const relationship = result.relationships[k];
                        if (!relationshipIdMap.has(relationship.nodeId)) {
                            relationshipIdMap.set(relationship.nodeId, true);
                            relationships[relationshipIndex++] = relationship;
                        }
                    }
                    // Clear relationships array to free memory
                    result.relationships = [];
                }
            }
            // Force garbage collection
            if (global.gc) {
                global.gc();
            }
        }
        // Clear maps to free memory
        nodeIdMap.clear();
        relationshipIdMap.clear();
        console.log(`Collected ${nodeIndex} nodes and ${relationshipIndex} relationships`);
        // Process nodes in smaller chunks to ensure node labels
        console.log('Ensuring node labels...');
        const labelChunkSize = 1000;
        for (let i = 0; i < nodes.length; i += labelChunkSize) {
            const end = Math.min(i + labelChunkSize, nodes.length);
            for (let j = i; j < end; j++) {
                const node = nodes[j];
                // Ensure labels is an array
                if (!Array.isArray(node.labels)) {
                    node.labels = [];
                }
                // Add CodeElement label to nodes that implement the CodeElement interface
                if ('name' in node && 'file' in node && 'startLine' in node && 'endLine' in node) {
                    if (!node.labels.includes('CodeElement')) {
                        node.labels.push('CodeElement');
                    }
                }
            }
            if (nodes.length > 10000 && i % 10000 === 0) {
                console.log(`Ensuring node labels: ${i}/${nodes.length} (${Math.round(i / nodes.length * 100)}%)`);
                if (global.gc)
                    global.gc();
            }
        }
        // Derive additional relationships in smaller chunks
        console.log('Deriving additional relationships...');
        const derivedRelationships = this.deriveAdditionalRelationshipsInChunks(relationships, nodes);
        // Combine original and derived relationships
        const allRelationships = relationships.concat(derivedRelationships);
        console.log(`Transformed to ${nodes.length} nodes and ${allRelationships.length} relationships`);
        return {
            nodes: nodes,
            relationships: allRelationships
        };
    }
    /**
     * Derive additional relationships in chunks to reduce memory pressure
     */
    deriveAdditionalRelationshipsInChunks(relationships, nodes) {
        console.log('Deriving additional semantic relationships in chunks...');
        // Create node lookup object
        const nodeObj = {};
        for (let i = 0; i < nodes.length; i++) {
            nodeObj[nodes[i].nodeId] = nodes[i];
        }
        // Group relationships by type
        const relationshipTypes = new Set();
        for (let i = 0; i < relationships.length; i++) {
            relationshipTypes.add(relationships[i].type);
        }
        console.log(`Found ${relationshipTypes.size} relationship types`);
        const newRelationships = [];
        const processedDependsOnIds = new Set();
        // Process each relationship type separately to reduce memory pressure
        for (const relType of relationshipTypes) {
            // Skip types that don't need derivation
            if (!['CALLS', 'REFERENCES_TYPE', 'REFERENCES_VARIABLE'].includes(relType)) {
                continue;
            }
            console.log(`Processing ${relType} relationships...`);
            // Filter relationships of this type
            const typeRelationships = relationships.filter(rel => rel.type === relType);
            console.log(`Found ${typeRelationships.length} ${relType} relationships`);
            // Process in small batches
            const batchSize = 200;
            for (let i = 0; i < typeRelationships.length; i += batchSize) {
                const endIdx = Math.min(i + batchSize, typeRelationships.length);
                for (let j = i; j < endIdx; j++) {
                    const rel = typeRelationships[j];
                    const dependsOnId = `${this.config.codebaseId}:DEPENDS_ON:${rel.startNodeId}->${rel.endNodeId}`;
                    // Skip if already processed
                    if (processedDependsOnIds.has(dependsOnId)) {
                        continue;
                    }
                    processedDependsOnIds.add(dependsOnId);
                    // Create appropriate DependsOn relationship based on type
                    if (relType === 'CALLS') {
                        newRelationships.push({
                            nodeId: dependsOnId,
                            codebaseId: this.config.codebaseId,
                            type: 'DEPENDS_ON',
                            startNodeId: rel.startNodeId,
                            endNodeId: rel.endNodeId,
                            dependencyType: 'call',
                            isStrong: true,
                            isWeak: false,
                            weight: 1
                        });
                    }
                    else {
                        // For REFERENCES_TYPE and REFERENCES_VARIABLE
                        newRelationships.push({
                            nodeId: dependsOnId,
                            codebaseId: this.config.codebaseId,
                            type: 'DEPENDS_ON',
                            startNodeId: rel.startNodeId,
                            endNodeId: rel.endNodeId,
                            dependencyType: 'reference',
                            isStrong: false,
                            isWeak: true,
                            weight: 1
                        });
                    }
                }
                // Log progress and force GC
                if (typeRelationships.length > 1000 && i % 1000 === 0) {
                    console.log(`Processing ${relType}: ${i}/${typeRelationships.length} (${Math.round(i / typeRelationships.length * 100)}%)`);
                    if (global.gc)
                        global.gc();
                }
            }
        }
        processedDependsOnIds.clear();
        console.log(`Added ${newRelationships.length} derived relationships`);
        return newRelationships;
    }
    /**
     * Deduplicate nodes by nodeId
     * Optimized to process in chunks to reduce memory pressure
     */
    deduplicateNodes(nodes) {
        const nodeMap = new Map();
        const chunkSize = 500; // Smaller chunk size to reduce memory pressure
        // Process nodes in chunks
        for (let i = 0; i < nodes.length; i += chunkSize) {
            const end = Math.min(i + chunkSize, nodes.length);
            for (let j = i; j < end; j++) {
                nodeMap.set(nodes[j].nodeId, nodes[j]);
            }
            // Log progress for large node arrays
            if (nodes.length > 10000 && i % 10000 === 0) {
                console.log(`Deduplicating nodes: ${i}/${nodes.length} (${Math.round(i / nodes.length * 100)}%)`);
            }
        }
        return Array.from(nodeMap.values());
    }
    /**
     * Deduplicate relationships by nodeId
     * Optimized to process in chunks to reduce memory pressure
     */
    deduplicateRelationships(relationships) {
        const relationshipMap = new Map();
        const chunkSize = 500; // Smaller chunk size to reduce memory pressure
        // Process relationships in chunks
        for (let i = 0; i < relationships.length; i += chunkSize) {
            const end = Math.min(i + chunkSize, relationships.length);
            for (let j = i; j < end; j++) {
                relationshipMap.set(relationships[j].nodeId, relationships[j]);
            }
            // Log progress for large relationship arrays
            if (relationships.length > 10000 && i % 10000 === 0) {
                console.log(`Deduplicating relationships: ${i}/${relationships.length} (${Math.round(i / relationships.length * 100)}%)`);
            }
        }
        return Array.from(relationshipMap.values());
    }
    /**
     * Validate the graph model
     */
    validate(result) {
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
        const filePathToNodeId = new Map();
        for (const node of result.nodes) {
            if (node.nodeId.startsWith('File:')) {
                const filePath = node.nodeId.substring(5); // Remove 'File:' prefix
                filePathToNodeId.set(filePath, node.nodeId);
                // Also map the path with different extensions for flexible matching
                if (filePath.endsWith('.ts')) {
                    const jsPath = filePath.replace(/\.ts$/, '.js');
                    filePathToNodeId.set(jsPath, node.nodeId);
                }
                else if (filePath.endsWith('.js')) {
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
                }
                catch (e) {
                    // Ignore errors
                }
                // Skip if JSON or other non-code files
                const ext = path.extname(filePath).toLowerCase();
                if (['.json', '.css', '.scss', '.less', '.svg', '.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
                    return false;
                }
                // Handle directory imports that were resolved to .ts files
                // Use type assertion since importPath is not in the base Relationship type
                const importRel = rel;
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
    isValidNode(node) {
        return (!!node.nodeId &&
            !!node.codebaseId &&
            Array.isArray(node.labels) &&
            node.labels.length > 0);
    }
    /**
     * Ensure nodes have appropriate labels based on their interfaces
     * This is crucial for Neo4j schema alignment
     */
    ensureNodeLabels(nodes) {
        const chunkSize = 500; // Smaller chunk size to reduce memory pressure
        const result = new Array(nodes.length);
        for (let i = 0; i < nodes.length; i += chunkSize) {
            const end = Math.min(i + chunkSize, nodes.length);
            for (let j = i; j < end; j++) {
                const node = nodes[j];
                // Create a new node object to avoid modifying the original
                // Use Object.assign instead of spread operator for better memory efficiency
                const enhancedNode = Object.assign({}, node);
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
                result[j] = enhancedNode;
            }
            // Log progress for large node arrays
            if (nodes.length > 10000 && i % 10000 === 0) {
                console.log(`Ensuring node labels: ${i}/${nodes.length} (${Math.round(i / nodes.length * 100)}%)`);
            }
        }
        return result;
    }
    /**
     * Check if a relationship is valid
     */
    isValidRelationship(relationship) {
        return (!!relationship.nodeId &&
            !!relationship.codebaseId &&
            !!relationship.type &&
            !!relationship.startNodeId &&
            !!relationship.endNodeId);
    }
    /**
     * Derive additional semantic relationships from existing relationships
     * This is where we can add higher-level relationships based on the lower-level ones
     */
    deriveAdditionalRelationships(relationships, nodes) {
        console.log('Deriving additional semantic relationships...');
        // Use plain objects instead of Maps to reduce memory usage
        const newRelationships = [];
        // Create node lookup object
        const nodeObj = {};
        for (let i = 0; i < nodes.length; i++) {
            nodeObj[nodes[i].nodeId] = nodes[i];
        }
        // Group relationships by type using plain objects
        const relationshipsByType = {};
        // Process in batches to reduce memory pressure
        const batchSize = 500; // Smaller batch size to reduce memory pressure
        for (let i = 0; i < relationships.length; i += batchSize) {
            const endIdx = Math.min(i + batchSize, relationships.length);
            for (let j = i; j < endIdx; j++) {
                const rel = relationships[j];
                if (!relationshipsByType[rel.type]) {
                    relationshipsByType[rel.type] = [];
                }
                relationshipsByType[rel.type].push(rel);
            }
            // Log progress for large relationship arrays
            if (relationships.length > 10000 && i % 10000 === 0) {
                console.log(`Grouping relationships by type: ${i}/${relationships.length} (${Math.round(i / relationships.length * 100)}%)`);
            }
        }
        // Count relationship types
        console.log('Relationship type counts:');
        for (const type in relationshipsByType) {
            console.log(`  ${type}: ${relationshipsByType[type].length}`);
        }
        // Process CALLS relationships to derive DependsOn relationships
        if (relationshipsByType['CALLS']) {
            const callsRelationships = relationshipsByType['CALLS'];
            console.log(`Processing ${callsRelationships.length} CALLS relationships to derive DependsOn relationships`);
            const dependsOnObj = {};
            // Process in smaller batches
            const smallerBatchSize = 200; // Even smaller batch size for processing relationships
            for (let i = 0; i < callsRelationships.length; i += smallerBatchSize) {
                const endIdx = Math.min(i + batchSize, callsRelationships.length);
                for (let j = i; j < endIdx; j++) {
                    const callsRel = callsRelationships[j];
                    const dependsOnId = `${this.config.codebaseId}:DEPENDS_ON:${callsRel.startNodeId}->${callsRel.endNodeId}`;
                    if (!dependsOnObj[dependsOnId]) {
                        dependsOnObj[dependsOnId] = {
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
                    }
                    else {
                        // Increment the weight if the relationship already exists
                        const existingRel = dependsOnObj[dependsOnId];
                        if (existingRel && 'weight' in existingRel) {
                            existingRel.weight += 1;
                        }
                    }
                }
                // Log progress for large relationship arrays
                if (callsRelationships.length > 10000 && i % 10000 === 0) {
                    console.log(`Processing CALLS relationships: ${i}/${callsRelationships.length} (${Math.round(i / callsRelationships.length * 100)}%)`);
                }
            }
            // Add the derived DependsOn relationships
            for (const id in dependsOnObj) {
                newRelationships.push(dependsOnObj[id]);
            }
            // Clear the object to free memory
            const dependsOnCount = Object.keys(dependsOnObj).length;
            for (const key in dependsOnObj)
                delete dependsOnObj[key];
            console.log(`Added ${dependsOnCount} derived DependsOn relationships`);
        }
        // Process REFERENCES_TYPE relationships to derive DependsOn relationships
        if (relationshipsByType['REFERENCES_TYPE']) {
            const referencesTypeRelationships = relationshipsByType['REFERENCES_TYPE'];
            console.log(`Processing ${referencesTypeRelationships.length} REFERENCES_TYPE relationships to derive DependsOn relationships`);
            const dependsOnObj = {};
            // Process in batches
            const smallerBatchSize = 200; // Even smaller batch size for processing relationships
            for (let i = 0; i < referencesTypeRelationships.length; i += smallerBatchSize) {
                const endIdx = Math.min(i + batchSize, referencesTypeRelationships.length);
                for (let j = i; j < endIdx; j++) {
                    const refRel = referencesTypeRelationships[j];
                    const dependsOnId = `${this.config.codebaseId}:DEPENDS_ON:${refRel.startNodeId}->${refRel.endNodeId}`;
                    if (!dependsOnObj[dependsOnId]) {
                        dependsOnObj[dependsOnId] = {
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
                    }
                    else {
                        // Increment the weight if the relationship already exists
                        const existingRel = dependsOnObj[dependsOnId];
                        if (existingRel && 'weight' in existingRel) {
                            existingRel.weight += 1;
                        }
                    }
                }
                // Log progress for large relationship arrays
                if (referencesTypeRelationships.length > 10000 && i % 10000 === 0) {
                    console.log(`Processing REFERENCES_TYPE relationships: ${i}/${referencesTypeRelationships.length} (${Math.round(i / referencesTypeRelationships.length * 100)}%)`);
                }
            }
            // Add the derived DependsOn relationships
            for (const id in dependsOnObj) {
                newRelationships.push(dependsOnObj[id]);
            }
            // Clear the object to free memory
            const dependsOnCount = Object.keys(dependsOnObj).length;
            for (const key in dependsOnObj)
                delete dependsOnObj[key];
            console.log(`Added ${dependsOnCount} derived DependsOn relationships from type references`);
        }
        // Process REFERENCES_VARIABLE relationships to derive DependsOn relationships
        if (relationshipsByType['REFERENCES_VARIABLE']) {
            const referencesVarRelationships = relationshipsByType['REFERENCES_VARIABLE'];
            console.log(`Processing ${referencesVarRelationships.length} REFERENCES_VARIABLE relationships to derive DependsOn relationships`);
            const dependsOnObj = {};
            // Process in batches
            const smallerBatchSize = 200; // Even smaller batch size for processing relationships
            for (let i = 0; i < referencesVarRelationships.length; i += smallerBatchSize) {
                const endIdx = Math.min(i + batchSize, referencesVarRelationships.length);
                for (let j = i; j < endIdx; j++) {
                    const refRel = referencesVarRelationships[j];
                    const dependsOnId = `${this.config.codebaseId}:DEPENDS_ON:${refRel.startNodeId}->${refRel.endNodeId}`;
                    if (!dependsOnObj[dependsOnId]) {
                        dependsOnObj[dependsOnId] = {
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
                    }
                    else {
                        // Increment the weight if the relationship already exists
                        const existingRel = dependsOnObj[dependsOnId];
                        if (existingRel && 'weight' in existingRel) {
                            existingRel.weight += 1;
                        }
                    }
                }
                // Log progress for large relationship arrays
                if (referencesVarRelationships.length > 10000 && i % 10000 === 0) {
                    console.log(`Processing REFERENCES_VARIABLE relationships: ${i}/${referencesVarRelationships.length} (${Math.round(i / referencesVarRelationships.length * 100)}%)`);
                }
            }
            // Add the derived DependsOn relationships
            for (const id in dependsOnObj) {
                newRelationships.push(dependsOnObj[id]);
            }
            // Clear the object to free memory
            const dependsOnCount = Object.keys(dependsOnObj).length;
            for (const key in dependsOnObj)
                delete dependsOnObj[key];
            console.log(`Added ${dependsOnCount} derived DependsOn relationships from variable references`);
        }
        // Clear type groupings to free memory
        for (const type in relationshipsByType) {
            delete relationshipsByType[type];
        }
        // Combine original relationships with new derived relationships
        // Use concat instead of spread operator
        const result = relationships.concat(newRelationships);
        console.log(`Total relationships after derivation: ${result.length}`);
        return result;
    }
}
exports.GraphTransformer = GraphTransformer;
//# sourceMappingURL=graph-transformer.js.map