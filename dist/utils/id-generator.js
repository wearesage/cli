"use strict";
/**
 * Utility functions for generating and managing IDs in a multi-codebase environment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNodeId = generateNodeId;
exports.extractCodebaseId = extractCodebaseId;
exports.extractNodeType = extractNodeType;
exports.extractUniqueIdentifier = extractUniqueIdentifier;
exports.isNodeFromCodebase = isNodeFromCodebase;
/**
 * Generate a codebase-aware node ID
 *
 * @param codebaseId - The unique identifier for the codebase
 * @param nodeType - The type of node (e.g., 'File', 'Class', 'Method')
 * @param uniqueIdentifier - A unique identifier for the node within its type (e.g., file path, class name)
 * @returns A codebase-aware node ID
 */
function generateNodeId(codebaseId, nodeType, uniqueIdentifier) {
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
function extractCodebaseId(nodeId) {
    const parts = nodeId.split(':');
    return parts[0];
}
/**
 * Extract node type from a node ID
 *
 * @param nodeId - The node ID to extract from
 * @returns The node type portion of the node ID
 */
function extractNodeType(nodeId) {
    const parts = nodeId.split(':');
    return parts[1];
}
/**
 * Extract unique identifier from a node ID
 *
 * @param nodeId - The node ID to extract from
 * @returns The unique identifier portion of the node ID
 */
function extractUniqueIdentifier(nodeId) {
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
function isNodeFromCodebase(nodeId, codebaseId) {
    return extractCodebaseId(nodeId) === codebaseId;
}
//# sourceMappingURL=id-generator.js.map