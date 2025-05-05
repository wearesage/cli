"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jImporter = void 0;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const index_1 = require("../schema/index");
const schema_constraints_1 = require("./schema-constraints");
const schema_migration_1 = require("./schema-migration");
/**
 * Importer for Neo4j graph database
 */
class Neo4jImporter {
    /**
     * Create a new Neo4j importer
     */
    constructor(config) {
        this.config = {
            batchSize: 1000,
            migration: {
                autoMigrate: true,
                backupBeforeMigration: false
            },
            ...config
        };
        this.driver = neo4j_driver_1.default.driver(config.uri, neo4j_driver_1.default.auth.basic(config.username, config.password));
    }
    /**
     * Import nodes and relationships into Neo4j
     */
    async import(nodes, relationships) {
        try {
            // Create schema constraints and indexes
            const session = this.getSession();
            await (0, schema_constraints_1.createSchemaConstraints)(session);
            await session.close();
            // Verify schema constraints
            const verifySession = this.getSession();
            const verified = await (0, schema_constraints_1.verifySchemaConstraints)(verifySession);
            await verifySession.close();
            if (!verified) {
                console.warn('Schema constraints verification failed. Proceeding with import anyway.');
            }
            // Check if schema migration is needed
            if (this.config.migration?.autoMigrate) {
                const migrationSession = this.getSession();
                const migrationNeeded = await schema_migration_1.SchemaMigration.isMigrationNeeded(migrationSession);
                if (migrationNeeded) {
                    console.log('Schema migration needed. Performing migration...');
                    // Create backup if configured
                    if (this.config.migration.backupBeforeMigration) {
                        await schema_migration_1.SchemaMigration.createBackup(migrationSession, 'pre_migration_backup');
                    }
                    // Perform migration
                    const migrationResults = await schema_migration_1.SchemaMigration.migrateAllToCurrentVersion(migrationSession);
                    console.log('Migration results:', migrationResults);
                }
                await migrationSession.close();
            }
            // Create codebase-specific schema
            if (nodes.length > 0) {
                const codebaseId = nodes[0].codebaseId;
                const codebaseSession = this.getSession();
                await (0, schema_constraints_1.createCodebaseSchema)(codebaseSession, codebaseId);
                await codebaseSession.close();
            }
            // Import nodes in batches
            await this.importNodes(nodes);
            // Import relationships in batches
            await this.importRelationships(relationships);
            // Update node properties based on relationships
            await this.updateNodeProperties();
            // Link Insight nodes to their respective Codebase nodes
            await this.linkInsightsToCodebases();
            console.log('Import complete');
        }
        catch (error) {
            console.error('Error importing to Neo4j:', error);
            throw error;
        }
        finally {
            await this.driver.close();
        }
    }
    /**
     * Import nodes into Neo4j in batches
     */
    async importNodes(nodes) {
        const batchSize = this.config.batchSize || 1000;
        const batches = Math.ceil(nodes.length / batchSize);
        console.log(`Importing ${nodes.length} nodes in ${batches} batches`);
        for (let i = 0; i < batches; i++) {
            const start = i * batchSize;
            const end = Math.min(start + batchSize, nodes.length);
            const batch = nodes.slice(start, end);
            await this.importNodeBatch(batch);
            console.log(`Imported nodes batch ${i + 1}/${batches}`);
        }
    }
    /**
     * Import a batch of nodes into Neo4j
     */
    async importNodeBatch(nodes) {
        const session = this.getSession();
        try {
            // Use a different approach to avoid Map objects
            // First create nodes with just nodeId
            const createNodesResult = await session.run(`
        UNWIND $nodeIds AS nodeId
        MERGE (n:Node {nodeId: nodeId})
        RETURN count(n) AS count
      `, {
                nodeIds: nodes.map(node => node.nodeId)
            });
            console.log(`Created ${createNodesResult.records[0].get('count').toNumber()} nodes`);
            // Then set properties individually for each node
            let processedCount = 0;
            for (const node of nodes) {
                const prepared = this.prepareNodeForImport(node);
                const safeProps = {};
                // Only include primitive properties and arrays
                for (const key in prepared) {
                    if (key === '_labels')
                        continue; // Handle labels separately
                    const value = prepared[key];
                    if (value instanceof Map) {
                        // Skip Map objects
                        console.log(`Skipping Map property ${key} for node ${node.nodeId}`);
                        continue;
                    }
                    if (value === null ||
                        typeof value === 'string' ||
                        typeof value === 'number' ||
                        typeof value === 'boolean' ||
                        Array.isArray(value)) {
                        safeProps[key] = value;
                    }
                    else if (typeof value === 'object') {
                        try {
                            // Try to convert object to JSON string
                            safeProps[key] = JSON.stringify(value);
                        }
                        catch (e) {
                            console.log(`Skipping property ${key} for node ${node.nodeId}: ${e}`);
                        }
                    }
                }
                // Set properties for the node
                await session.run(`
          MATCH (n:Node {nodeId: $nodeId})
          SET n = $properties
          RETURN n
        `, {
                    nodeId: node.nodeId,
                    properties: safeProps
                });
                // Set labels
                if (prepared._labels && Array.isArray(prepared._labels)) {
                    await session.run(`
            MATCH (n:Node {nodeId: $nodeId})
            WITH n, $labels AS labels
            CALL apoc.create.addLabels(n, labels) YIELD node
            RETURN node
          `, {
                        nodeId: node.nodeId,
                        labels: prepared._labels
                    });
                }
                processedCount++;
                if (processedCount % 100 === 0) {
                    console.log(`Processed ${processedCount}/${nodes.length} nodes`);
                }
            }
            console.log(`Imported ${processedCount} nodes`);
        }
        finally {
            await session.close();
        }
    }
    /**
     * Import relationships into Neo4j in batches
     */
    async importRelationships(relationships) {
        const batchSize = this.config.batchSize || 1000;
        const batches = Math.ceil(relationships.length / batchSize);
        console.log(`Importing ${relationships.length} relationships in ${batches} batches`);
        // Count relationships by type for debugging
        const typeCounts = {};
        for (const rel of relationships) {
            typeCounts[rel.type] = (typeCounts[rel.type] || 0) + 1;
        }
        // Log relationship counts by type
        console.log('Relationship counts from JSON:');
        for (const [type, count] of Object.entries(typeCounts)) {
            console.log(`  ${type}: ${count}`);
        }
        // Log a sample DEFINES_VUE_COMPONENT relationship for debugging
        const defineVueComponentRel = relationships.find(rel => rel.type === 'DEFINES_VUE_COMPONENT');
        if (defineVueComponentRel) {
            console.log('Sample DEFINES_VUE_COMPONENT relationship:');
            console.log(JSON.stringify(defineVueComponentRel, null, 2));
        }
        else {
            console.log('No DEFINES_VUE_COMPONENT relationships found in the JSON file');
        }
        for (let i = 0; i < batches; i++) {
            const start = i * batchSize;
            const end = Math.min(start + batchSize, relationships.length);
            const batch = relationships.slice(start, end);
            await this.importRelationshipBatch(batch);
            console.log(`Imported relationships batch ${i + 1}/${batches}`);
        }
    }
    /**
     * Import a batch of relationships into Neo4j
     */
    async importRelationshipBatch(relationships) {
        const session = this.getSession();
        try {
            // Group relationships by type for efficient batch processing
            const relationshipsByType = this.groupRelationshipsByType(relationships);
            let totalCount = 0;
            // Process each relationship type separately
            for (const [relType, rels] of Object.entries(relationshipsByType)) {
                console.log(`Processing ${rels.length} ${relType} relationships`);
                // Log a sample relationship for debugging
                if (rels.length > 0) {
                    console.log(`Sample ${relType} relationship:`, JSON.stringify(rels[0], null, 2));
                }
                // Separate relationships into resolved and unresolved
                const resolvedRels = rels.filter(rel => !rel.unresolvedComponent && !rel.unresolvedComposable && !rel.unresolvedImport);
                const unresolvedRels = rels.filter(rel => rel.unresolvedComponent || rel.unresolvedComposable || rel.unresolvedImport);
                let count = 0;
                // Process resolved relationships one by one to avoid Map objects
                if (resolvedRels.length > 0) {
                    for (const rel of resolvedRels) {
                        try {
                            const prepared = this.prepareRelationshipForImport(rel);
                            // Convert properties to safe format
                            const safeProps = {};
                            if (prepared.properties) {
                                for (const key in prepared.properties) {
                                    const value = prepared.properties[key];
                                    if (value instanceof Map) {
                                        // Skip Map objects
                                        console.log(`Skipping Map property ${key} for relationship ${rel.nodeId}`);
                                        continue;
                                    }
                                    if (value === null ||
                                        typeof value === 'string' ||
                                        typeof value === 'number' ||
                                        typeof value === 'boolean' ||
                                        Array.isArray(value)) {
                                        safeProps[key] = value;
                                    }
                                    else if (typeof value === 'object') {
                                        try {
                                            // Try to convert object to JSON string
                                            safeProps[key] = JSON.stringify(value);
                                        }
                                        catch (e) {
                                            console.log(`Skipping property ${key} for relationship ${rel.nodeId}: ${e}`);
                                        }
                                    }
                                }
                            }
                            // Create relationship with safe properties
                            const result = await session.run(`
                MATCH (start:Node {nodeId: $startNodeId})
                MATCH (end:Node {nodeId: $endNodeId})
                MERGE (start)-[r:\`${relType}\`]->(end)
                ON CREATE SET r = $properties, r.nodeId = $nodeId
                ON MATCH SET r = $properties
                RETURN r
              `, {
                                startNodeId: prepared.startNodeId,
                                endNodeId: prepared.endNodeId,
                                nodeId: rel.nodeId,
                                properties: safeProps
                            });
                            count++;
                            if (count % 100 === 0) {
                                console.log(`Processed ${count}/${resolvedRels.length} ${relType} relationships`);
                            }
                        }
                        catch (error) {
                            console.error(`Error processing relationship ${rel.nodeId}:`, error);
                        }
                    }
                    console.log(`Imported ${count} ${relType} relationships`);
                }
                // Process unresolved relationships
                if (unresolvedRels.length > 0) {
                    console.log(`Processing ${unresolvedRels.length} unresolved ${relType} relationships`);
                    // Create a special node for each unresolved reference
                    for (const rel of unresolvedRels) {
                        try {
                            // Create a placeholder node for the unresolved reference
                            let nodeType = 'UnresolvedReference';
                            let nodeName = rel.endNodeId;
                            if (rel.unresolvedComponent) {
                                nodeType = 'UnresolvedComponent';
                            }
                            else if (rel.unresolvedComposable) {
                                nodeType = 'UnresolvedComposable';
                            }
                            else if (rel.unresolvedImport) {
                                nodeType = 'UnresolvedImport';
                            }
                            // Create the placeholder node
                            const createNodeQuery = `
                MERGE (n:Node:${nodeType} {nodeId: $nodeId})
                ON CREATE SET n += $properties
                RETURN n
              `;
                            // Create safe properties for the node
                            const safeNodeProps = {
                                nodeId: `${rel.codebaseId}:${nodeType}:${nodeName}`,
                                name: nodeName,
                                codebaseId: rel.codebaseId,
                                labels: [nodeType, 'Node'],
                                _schemaVersion: rel._schemaVersion || '2.0.0',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };
                            await session.run(createNodeQuery, {
                                nodeId: `${rel.codebaseId}:${nodeType}:${nodeName}`,
                                properties: safeNodeProps
                            });
                            // Create the relationship to the placeholder node
                            const createRelQuery = `
                MATCH (start:Node {nodeId: $startNodeId})
                MATCH (end:Node {nodeId: $endNodeId})
                MERGE (start)-[r:\`${relType}\`]->(end)
                ON CREATE SET r += $properties, r.nodeId = $relNodeId
                ON MATCH SET r += $properties
                RETURN r
              `;
                            // Prepare relationship properties safely
                            const relProperties = this.prepareRelationshipPropertiesForImport(rel);
                            const safeRelProps = {};
                            // Only include primitive properties and arrays
                            for (const key in relProperties) {
                                const value = relProperties[key];
                                if (value instanceof Map) {
                                    // Skip Map objects
                                    console.log(`Skipping Map property ${key} for unresolved relationship ${rel.nodeId}`);
                                    continue;
                                }
                                if (value === null ||
                                    typeof value === 'string' ||
                                    typeof value === 'number' ||
                                    typeof value === 'boolean' ||
                                    Array.isArray(value)) {
                                    safeRelProps[key] = value;
                                }
                                else if (typeof value === 'object') {
                                    try {
                                        // Try to convert object to JSON string
                                        safeRelProps[key] = JSON.stringify(value);
                                    }
                                    catch (e) {
                                        console.log(`Skipping property ${key} for unresolved relationship ${rel.nodeId}: ${e}`);
                                    }
                                }
                            }
                            await session.run(createRelQuery, {
                                startNodeId: rel.startNodeId,
                                endNodeId: `${rel.codebaseId}:${nodeType}:${nodeName}`,
                                relNodeId: rel.nodeId,
                                properties: safeRelProps
                            });
                            count++;
                        }
                        catch (error) {
                            console.error(`Error processing unresolved relationship:`, error);
                        }
                    }
                }
                totalCount += count;
                console.log(`Imported ${count} ${relType} relationships`);
            }
            console.log(`Imported ${totalCount} relationships in total`);
        }
        finally {
            await session.close();
        }
    }
    /**
     * Group relationships by type for batch processing
     */
    groupRelationshipsByType(relationships) {
        const groups = {};
        // Count relationships by type for debugging
        const typeCounts = {};
        for (const rel of relationships) {
            if (!groups[rel.type]) {
                groups[rel.type] = [];
            }
            groups[rel.type].push(rel);
            // Count relationships by type
            typeCounts[rel.type] = (typeCounts[rel.type] || 0) + 1;
        }
        // Log relationship counts by type
        console.log('Relationship counts by type:');
        for (const [type, count] of Object.entries(typeCounts)) {
            console.log(`  ${type}: ${count}`);
        }
        return groups;
    }
    /**
     * Prepare a node for import into Neo4j
     */
    prepareNodeForImport(node) {
        // Extract labels and other properties
        const { labels: originalLabels, ...nodeProperties } = node;
        // Create a copy of labels to avoid modifying the original
        const labels = [...originalLabels];
        // Convert any Map objects to JSON strings
        const processedProperties = this.convertComplexPropertiesToPrimitives(nodeProperties);
        // Ensure CodeElement label is added for nodes implementing the CodeElement interface
        if ('name' in node && 'file' in node && 'startLine' in node && 'endLine' in node) {
            if (!labels.includes('CodeElement')) {
                labels.push('CodeElement');
            }
        }
        // Ensure the node has a codebaseId
        if (!nodeProperties.codebaseId) {
            console.warn(`Node ${node.nodeId} does not have a codebaseId. Using 'default' as fallback.`);
            nodeProperties.codebaseId = 'default';
        }
        // Special handling for Codebase nodes - ensure nodeId matches codebaseId
        if (labels.includes('Codebase')) {
            // For Codebase nodes, set nodeId to match codebaseId to ensure consistency
            nodeProperties.nodeId = nodeProperties.codebaseId;
            console.log(`Ensuring Codebase node has consistent ID: ${nodeProperties.nodeId}`);
        }
        // For all other nodes, ensure the nodeId includes the codebaseId as a prefix
        else if (!node.nodeId.startsWith(`${nodeProperties.codebaseId}:`)) {
            // Fix the nodeId by adding the codebaseId prefix
            const originalNodeId = node.nodeId;
            nodeProperties.nodeId = `${nodeProperties.codebaseId}:${originalNodeId}`;
            console.log(`Fixed node ID from ${originalNodeId} to ${nodeProperties.nodeId}`);
        }
        // Add schema version
        const nodeWithVersion = {
            ...processedProperties,
            _schemaVersion: index_1.SCHEMA_VERSION,
            _labels: labels
        };
        // Add timestamps if not present
        if (!nodeWithVersion.createdAt) {
            nodeWithVersion.createdAt = new Date().toISOString();
        }
        if (!nodeWithVersion.updatedAt) {
            nodeWithVersion.updatedAt = new Date().toISOString();
        }
        return nodeWithVersion;
    }
    /**
     * Prepare a relationship for import into Neo4j
     */
    prepareRelationshipForImport(relationship) {
        // Clone the relationship to avoid modifying the original
        const relForImport = { ...relationship };
        // Extract type and node IDs
        const { type, startNodeId, endNodeId, unresolvedComponent, unresolvedComposable, unresolvedImport, ...properties } = relForImport;
        // Validate relationship type against schema
        if (!index_1.SCHEMA_METADATA.relationshipTypes.includes(type)) {
            console.warn(`Warning: Relationship type '${type}' is not defined in schema metadata. This may cause inconsistencies.`);
        }
        // Ensure the relationship has a codebaseId
        if (!properties.codebaseId) {
            console.warn(`Relationship ${relationship.nodeId} does not have a codebaseId. Using 'default' as fallback.`);
            properties.codebaseId = 'default';
        }
        // Note: We've updated the schema and parsers to use separate arrays for line and column information
        // instead of arrays of objects. This ensures that the data is in a Neo4j-compatible format from
        // the beginning, eliminating the need for special handling here.
        // For example:
        // - CALLS relationships now use callLocationLines and callLocationColumns instead of callLocations
        // - REFERENCES_VARIABLE relationships now use referenceLocationLines and referenceLocationColumns
        // - RENDERS relationships now use renderLocationLines and renderLocationColumns
        // We need to get the actual codebase IDs from the source and target nodes
        // This requires a separate query, which we can't do here
        // Instead, we'll rely on the codebaseId property of the relationship
        // Only set isCrossCodebase to false if it's not already set
        // This allows relationships to be explicitly marked as cross-codebase
        if (properties.isCrossCodebase === undefined) {
            properties.isCrossCodebase = false;
        }
        // If sourceCodebaseId and targetCodebaseId are set, ensure isCrossCodebase is true
        if (properties.sourceCodebaseId && properties.targetCodebaseId &&
            properties.sourceCodebaseId !== properties.targetCodebaseId) {
            properties.isCrossCodebase = true;
        }
        // Convert any Map objects to JSON strings
        const processedProperties = this.convertComplexPropertiesToPrimitives(properties);
        // Add schema version and timestamps
        const propertiesWithVersion = {
            ...processedProperties,
            _schemaVersion: index_1.SCHEMA_VERSION
        };
        // Add timestamps if not present
        if (!propertiesWithVersion.createdAt) {
            propertiesWithVersion.createdAt = new Date().toISOString();
        }
        if (!propertiesWithVersion.updatedAt) {
            propertiesWithVersion.updatedAt = new Date().toISOString();
        }
        // No longer need to include type in properties since it's the actual relationship type
        return {
            type,
            startNodeId,
            endNodeId,
            properties: propertiesWithVersion
        };
    }
    /**
     * Prepare relationship properties for import into Neo4j
     */
    prepareRelationshipPropertiesForImport(relationship) {
        // Clone the relationship to avoid modifying the original
        const relForImport = { ...relationship };
        // Extract type and node IDs
        const { type, startNodeId, endNodeId, unresolvedComponent, unresolvedComposable, unresolvedImport, ...properties } = relForImport;
        // Ensure the relationship has a codebaseId
        if (!properties.codebaseId) {
            console.warn(`Relationship ${relationship.nodeId} does not have a codebaseId. Using 'default' as fallback.`);
            properties.codebaseId = 'default';
        }
        // Note: Location information is now stored as separate arrays of primitive values
        // (e.g., callLocationLines and callLocationColumns) instead of arrays of objects.
        // This ensures Neo4j compatibility without requiring special handling here.
        // Convert any Map objects to JSON strings
        const processedProperties = this.convertComplexPropertiesToPrimitives(properties);
        // Add schema version and timestamps
        const propertiesWithVersion = {
            ...processedProperties,
            _schemaVersion: index_1.SCHEMA_VERSION
        };
        // Add timestamps if not present
        if (!propertiesWithVersion.createdAt) {
            propertiesWithVersion.createdAt = new Date().toISOString();
        }
        if (!propertiesWithVersion.updatedAt) {
            propertiesWithVersion.updatedAt = new Date().toISOString();
        }
        return propertiesWithVersion;
    }
    /**
     * Convert complex properties to primitives for Neo4j compatibility
     */
    convertComplexPropertiesToPrimitives(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        // Handle different types
        if (obj instanceof Map) {
            // Convert Map to a plain object
            const mapObj = {};
            obj.forEach((value, key) => {
                mapObj[String(key)] = this.convertComplexPropertiesToPrimitives(value);
            });
            return JSON.stringify(mapObj);
        }
        else if (obj instanceof Set) {
            // Convert Set to an array
            return Array.from(obj).map(item => this.convertComplexPropertiesToPrimitives(item));
        }
        else if (Array.isArray(obj)) {
            // Process each item in the array
            return obj.map(item => this.convertComplexPropertiesToPrimitives(item));
        }
        else if (typeof obj === 'object') {
            // Process each property in the object
            const result = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    result[key] = this.convertComplexPropertiesToPrimitives(obj[key]);
                }
            }
            return result;
        }
        // Return primitive values as is
        return obj;
    }
    /**
     * Check for Map objects in a nested object structure
     */
    checkForMapObjects(obj, path) {
        if (obj === null || typeof obj !== 'object') {
            return;
        }
        if (obj instanceof Map) {
            console.error(`Found Map object at ${path}`);
            return;
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                if (typeof obj[i] === 'object' && obj[i] !== null) {
                    this.checkForMapObjects(obj[i], `${path}[${i}]`);
                }
            }
            return;
        }
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                this.checkForMapObjects(obj[key], `${path}.${key}`);
            }
        }
    }
    /**
     * Update node properties based on their relationships
     */
    async updateNodeProperties() {
        const session = this.getSession();
        try {
            console.log('Updating node properties based on relationships...');
            // Get the codebase ID from the first node (assuming all nodes are from the same codebase)
            const codebaseResult = await session.run(`
        MATCH (n:Node)
        RETURN n.codebaseId AS codebaseId
        LIMIT 1
      `);
            const codebaseId = codebaseResult.records.length > 0
                ? codebaseResult.records[0].get('codebaseId')
                : 'default';
            console.log(`Updating node properties for codebase: ${codebaseId}`);
            // Update importCount for File nodes within the same codebase
            const importCountResult = await session.run(`
        MATCH (f:File {codebaseId: $codebaseId})-[r:IMPORTS]->()
        WITH f, count(r) AS importCount
        SET f.importCount = importCount
        RETURN count(f) AS updatedNodes
      `, { codebaseId });
            // Update exportCount for File nodes within the same codebase
            const exportCountResult = await session.run(`
        MATCH (f:File {codebaseId: $codebaseId})-[r:EXPORTS_LOCAL]->()
        WITH f, count(r) AS exportCount
        SET f.exportCount = exportCount
        RETURN count(f) AS updatedNodes
      `, { codebaseId });
            // Update cross-codebase import count
            const crossCodebaseImportResult = await session.run(`
        MATCH (f:File {codebaseId: $codebaseId})-[r:IMPORTS]->(target)
        WHERE target.codebaseId <> $codebaseId
        WITH f, count(r) AS crossImportCount
        SET f.crossCodebaseImportCount = crossImportCount
        RETURN count(f) AS updatedNodes
      `, { codebaseId });
            const importNodesUpdated = importCountResult.records[0].get('updatedNodes').toNumber();
            const exportNodesUpdated = exportCountResult.records[0].get('updatedNodes').toNumber();
            const crossImportNodesUpdated = crossCodebaseImportResult.records[0].get('updatedNodes').toNumber();
            console.log(`Updated importCount for ${importNodesUpdated} nodes`);
            console.log(`Updated exportCount for ${exportNodesUpdated} nodes`);
            console.log(`Updated crossCodebaseImportCount for ${crossImportNodesUpdated} nodes`);
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get a Cypher parameter for setting labels
     */
    getLabelsParam() {
        return `apoc.convert.toLabels(node._labels)`;
    }
    /**
     * Get a Neo4j session
     */
    getSession() {
        return this.driver.session({
            database: this.config.database
        });
    }
    /**
     * Links existing Insight nodes to their respective Codebase nodes
     */
    async linkInsightsToCodebases() {
        console.log('Linking Insight nodes to their respective Codebase nodes...');
        const session = this.getSession();
        try {
            // Find all Insight nodes that don't have a BELONGS_TO relationship to a Codebase
            const result = await session.run(`
        MATCH (i:Insight)
        WHERE NOT (i)-[:BELONGS_TO]->(:Codebase)
        RETURN i.nodeId AS insightId, i.codebaseId AS codebaseId
      `);
            console.log(`Found ${result.records.length} Insight nodes to link to Codebases`);
            // Process each Insight node
            for (const record of result.records) {
                const insightId = record.get('insightId');
                let codebaseId = record.get('codebaseId');
                // If the Insight doesn't have a codebaseId, try to infer it from the nodeId
                if (!codebaseId && insightId) {
                    const parts = insightId.split(':');
                    if (parts.length > 1) {
                        codebaseId = parts[0];
                        console.log(`Inferred codebaseId ${codebaseId} from insightId ${insightId}`);
                    }
                }
                if (codebaseId) {
                    // Update the Insight node with the codebaseId
                    await session.run(`
            MATCH (i:Insight {nodeId: $insightId})
            SET i.codebaseId = $codebaseId
            WITH i
            MATCH (c:Codebase {nodeId: $codebaseId})
            MERGE (i)-[:BELONGS_TO]->(c)
            RETURN i, c
          `, { insightId, codebaseId });
                    console.log(`Linked Insight ${insightId} to Codebase ${codebaseId}`);
                }
                else {
                    console.warn(`Could not determine codebaseId for Insight ${insightId}`);
                }
            }
            console.log('Finished linking Insight nodes to Codebase nodes');
        }
        catch (error) {
            console.error('Error linking Insight nodes to Codebase nodes:', error);
        }
        finally {
            await session.close();
        }
    }
    /**
     * Close the Neo4j driver
     */
    async close() {
        await this.driver.close();
    }
}
exports.Neo4jImporter = Neo4jImporter;
//# sourceMappingURL=importer.js.map