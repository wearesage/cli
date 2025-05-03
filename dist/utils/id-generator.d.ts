/**
 * Utility functions for generating and managing IDs in a multi-codebase environment
 */
/**
 * Generate a codebase-aware node ID
 *
 * @param codebaseId - The unique identifier for the codebase
 * @param nodeType - The type of node (e.g., 'File', 'Class', 'Method')
 * @param uniqueIdentifier - A unique identifier for the node within its type (e.g., file path, class name)
 * @returns A codebase-aware node ID
 */
export declare function generateNodeId(codebaseId: string, nodeType: string, uniqueIdentifier: string): string;
/**
 * Extract codebase ID from a node ID
 *
 * @param nodeId - The node ID to extract from
 * @returns The codebase ID portion of the node ID
 */
export declare function extractCodebaseId(nodeId: string): string;
/**
 * Extract node type from a node ID
 *
 * @param nodeId - The node ID to extract from
 * @returns The node type portion of the node ID
 */
export declare function extractNodeType(nodeId: string): string;
/**
 * Extract unique identifier from a node ID
 *
 * @param nodeId - The node ID to extract from
 * @returns The unique identifier portion of the node ID
 */
export declare function extractUniqueIdentifier(nodeId: string): string;
/**
 * Check if a node ID belongs to a specific codebase
 *
 * @param nodeId - The node ID to check
 * @param codebaseId - The codebase ID to check against
 * @returns True if the node ID belongs to the specified codebase
 */
export declare function isNodeFromCodebase(nodeId: string, codebaseId: string): boolean;
//# sourceMappingURL=id-generator.d.ts.map