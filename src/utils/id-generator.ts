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
export function generateNodeId(codebaseId: string, nodeType: string, uniqueIdentifier: string): string {
  // Sanitize inputs to ensure they don't contain delimiters
  const sanitizedCodebaseId = codebaseId.replace(/:/g, '_');
  const sanitizedNodeType = nodeType.replace(/:/g, '_');
  const sanitizedIdentifier = uniqueIdentifier.replace(/:/g, '_');
  
  // Format: codebaseId:nodeType:uniqueIdentifier
  return `${sanitizedCodebaseId}:${sanitizedNodeType}:${sanitizedIdentifier}`;
}

/**
 * Extract codebase ID from a node ID
 * 
 * @param nodeId - The node ID to extract from
 * @returns The codebase ID portion of the node ID
 */
export function extractCodebaseId(nodeId: string): string {
  const parts = nodeId.split(':');
  return parts[0];
}

/**
 * Extract node type from a node ID
 * 
 * @param nodeId - The node ID to extract from
 * @returns The node type portion of the node ID
 */
export function extractNodeType(nodeId: string): string {
  const parts = nodeId.split(':');
  return parts[1];
}

/**
 * Extract unique identifier from a node ID
 * 
 * @param nodeId - The node ID to extract from
 * @returns The unique identifier portion of the node ID
 */
export function extractUniqueIdentifier(nodeId: string): string {
  const parts = nodeId.split(':');
  // The unique identifier might contain colons, so join all remaining parts
  return parts.slice(2).join(':');
}

/**
 * Check if a node ID belongs to a specific codebase
 * 
 * @param nodeId - The node ID to check
 * @param codebaseId - The codebase ID to check against
 * @returns True if the node ID belongs to the specified codebase
 */
export function isNodeFromCodebase(nodeId: string, codebaseId: string): boolean {
  return extractCodebaseId(nodeId) === codebaseId;
}