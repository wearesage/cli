"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSchemaConstraints = createSchemaConstraints;
exports.dropSchemaConstraints = dropSchemaConstraints;
exports.createCodebaseSchema = createCodebaseSchema;
exports.dropCodebaseSchema = dropCodebaseSchema;
exports.verifySchemaConstraints = verifySchemaConstraints;
const index_1 = require("../schema/index");
/**
 * Creates Neo4j schema constraints and indexes for the TypeScript code graph
 */
async function createSchemaConstraints(session) {
    console.log('Creating Neo4j schema constraints and indexes...');
    try {
        // Create constraints
        for (const constraint of index_1.SCHEMA_METADATA.neo4jConstraints) {
            const query = `
        CREATE CONSTRAINT IF NOT EXISTS FOR (n:${constraint.label})
        REQUIRE n.${constraint.property} IS ${constraint.type === 'UNIQUENESS' ? 'UNIQUE' : 'NOT NULL'}
      `;
            await session.run(query);
            console.log(`Created ${constraint.type} constraint on ${constraint.label}.${constraint.property}`);
        }
        // Create indexes
        for (const index of index_1.SCHEMA_METADATA.neo4jIndexes) {
            // For regular indexes, use standard syntax
            const query = `
        CREATE INDEX IF NOT EXISTS FOR (n:${index.label})
        ON (n.${index.property})
      `;
            await session.run(query);
            console.log(`Created index on ${index.label}.${index.property}`);
        }
        // Check if full-text index feature is available
        let fullTextIndexAvailable = false;
        try {
            const proceduresResult = await session.run("CALL dbms.procedures() YIELD name WHERE name = 'db.index.fulltext.createNodeIndex' RETURN count(*) > 0 as available");
            fullTextIndexAvailable = proceduresResult.records[0].get('available');
        }
        catch (error) {
            console.warn("Could not check if full-text index feature is available:", error);
        }
        // Create full-text indexes if the feature is available
        if (fullTextIndexAvailable) {
            for (const ftIndex of index_1.SCHEMA_METADATA.neo4jFullTextIndexes) {
                const query = `
          CALL db.index.fulltext.createNodeIndex(
            '${ftIndex.name}',
            [${ftIndex.labels.map(label => `'${label}'`).join(', ')}],
            [${ftIndex.properties.map(prop => `'${prop}'`).join(', ')}]
          )
        `;
                try {
                    await session.run(query);
                    console.log(`Created full-text index ${ftIndex.name} on ${ftIndex.labels.join(', ')}.${ftIndex.properties.join(', ')}`);
                }
                catch (error) {
                    // Full-text index might already exist
                    console.warn(`Warning: Could not create full-text index ${ftIndex.name}: ${error}`);
                }
            }
        }
        else {
            console.warn("Full-text index feature is not available in this Neo4j instance. Skipping full-text index creation.");
        }
        console.log('Schema constraints and indexes created successfully');
    }
    catch (error) {
        console.error('Error creating schema constraints and indexes:', error);
        throw error;
    }
}
/**
 * Drops all Neo4j schema constraints and indexes for the TypeScript code graph
 */
async function dropSchemaConstraints(session) {
    console.log('Dropping Neo4j schema constraints and indexes...');
    try {
        // Get all constraints
        const constraintsResult = await session.run('SHOW CONSTRAINTS');
        for (const record of constraintsResult.records) {
            const name = record.get('name');
            await session.run(`DROP CONSTRAINT ${name}`);
            console.log(`Dropped constraint ${name}`);
        }
        // Get all indexes
        const indexesResult = await session.run('SHOW INDEXES');
        for (const record of indexesResult.records) {
            const name = record.get('name');
            // Skip full-text indexes as they need special handling
            if (!record.get('type').includes('FULLTEXT')) {
                await session.run(`DROP INDEX ${name}`);
                console.log(`Dropped index ${name}`);
            }
        }
        // Drop full-text indexes
        for (const ftIndex of index_1.SCHEMA_METADATA.neo4jFullTextIndexes) {
            try {
                await session.run(`CALL db.index.fulltext.drop('${ftIndex.name}')`);
                console.log(`Dropped full-text index ${ftIndex.name}`);
            }
            catch (error) {
                // Full-text index might not exist
                console.warn(`Warning: Could not drop full-text index ${ftIndex.name}: ${error}`);
            }
        }
        console.log('Schema constraints and indexes dropped successfully');
    }
    catch (error) {
        console.error('Error dropping schema constraints and indexes:', error);
        throw error;
    }
}
/**
 * Creates Neo4j schema constraints and indexes for a specific codebase
 */
async function createCodebaseSchema(session, codebaseId) {
    console.log(`Creating schema for codebase ${codebaseId}...`);
    try {
        // Create codebase-specific indexes
        await session.run(`
      CREATE INDEX IF NOT EXISTS FOR (n:Node)
      ON (n.codebaseId)
    `);
        console.log(`Created index for codebase ${codebaseId}`);
        // Create additional indexes for common queries
        const commonNodeTypes = ['File', 'Class', 'Function', 'Variable', 'Component'];
        for (const nodeType of commonNodeTypes) {
            await session.run(`
        CREATE INDEX IF NOT EXISTS FOR (n:${nodeType})
        ON (n.name, n.codebaseId)
      `);
            console.log(`Created index on ${nodeType}.name for codebase ${codebaseId}`);
        }
        // Create index on file paths
        await session.run(`
      CREATE INDEX IF NOT EXISTS FOR (n:File)
      ON (n.path, n.codebaseId)
    `);
        console.log(`Created index on File.path for codebase ${codebaseId}`);
        // Create index for cross-codebase relationships
        // Note: Neo4j syntax for relationship indexes is different
        try {
            await session.run(`
        CREATE INDEX relationship_cross_codebase IF NOT EXISTS
        FOR ()-[r]-()
        ON (r.isCrossCodebase)
      `);
            console.log(`Created index on relationship.isCrossCodebase for cross-codebase queries`);
            // Create index for source and target codebase IDs in relationships
            await session.run(`
        CREATE INDEX relationship_source_codebase IF NOT EXISTS
        FOR ()-[r]-()
        ON (r.sourceCodebaseId)
      `);
            await session.run(`
        CREATE INDEX relationship_target_codebase IF NOT EXISTS
        FOR ()-[r]-()
        ON (r.targetCodebaseId)
      `);
            console.log(`Created indexes for cross-codebase relationship source and target`);
        }
        catch (error) {
            // Some versions of Neo4j have different syntax for relationship indexes
            console.warn(`Warning: Could not create relationship indexes: ${error}`);
            console.log(`This is not critical - the database will still work but queries on cross-codebase relationships may be slower`);
        }
        // Create a specific index for this codebase's nodes
        // Since we can't use WHERE in CREATE INDEX, we'll use a query to find nodes for this codebase
        console.log(`Schema for codebase ${codebaseId} created successfully`);
    }
    catch (error) {
        console.error(`Error creating schema for codebase ${codebaseId}:`, error);
        throw error;
    }
}
/**
 * Drops Neo4j schema constraints and indexes for a specific codebase
 */
async function dropCodebaseSchema(session, codebaseId) {
    console.log(`Dropping schema for codebase ${codebaseId}...`);
    try {
        // Get all indexes
        const indexesResult = await session.run('SHOW INDEXES');
        for (const record of indexesResult.records) {
            const name = record.get('name');
            const labelsAndProperties = record.get('labelsOrTypes') + '.' + record.get('properties');
            // Only drop indexes that are specific to this codebase
            if (labelsAndProperties.includes('codebaseId') &&
                record.get('populationPercent') < 10) { // Heuristic to avoid dropping global indexes
                await session.run(`DROP INDEX ${name}`);
                console.log(`Dropped index ${name}`);
            }
        }
        // Delete all nodes and relationships for this codebase
        const deleteResult = await session.run(`
      MATCH (n:Node {codebaseId: $codebaseId})
      DETACH DELETE n
      RETURN count(n) as deletedCount
    `, { codebaseId });
        const deletedCount = deleteResult.records[0].get('deletedCount').toNumber();
        console.log(`Deleted ${deletedCount} nodes from codebase ${codebaseId}`);
        console.log(`Schema for codebase ${codebaseId} dropped successfully`);
    }
    catch (error) {
        console.error(`Error dropping schema for codebase ${codebaseId}:`, error);
        throw error;
    }
}
/**
 * Verifies that the Neo4j schema constraints and indexes are correctly set up
 */
async function verifySchemaConstraints(session) {
    console.log('Verifying Neo4j schema constraints and indexes...');
    try {
        // Check constraints
        const constraintsResult = await session.run('SHOW CONSTRAINTS');
        // Debug constraint structure
        if (constraintsResult.records.length > 0) {
            const sampleRecord = constraintsResult.records[0];
            console.log('Sample constraint record structure:', Object.keys(sampleRecord.toObject()));
            console.log('Sample constraint values:', sampleRecord.toObject());
        }
        const constraints = constraintsResult.records.map(record => ({
            name: record.get('name'),
            label: record.get('labelsOrTypes'),
            property: record.get('properties'),
            type: record.get('type')
        }));
        console.log('Parsed constraints:', constraints);
        // Check indexes
        const indexesResult = await session.run('SHOW INDEXES');
        const indexes = indexesResult.records.map(record => ({
            name: record.get('name'),
            label: record.get('labelsOrTypes'),
            property: record.get('properties'),
            type: record.get('type')
        }));
        // Verify required constraints
        for (const requiredConstraint of index_1.SCHEMA_METADATA.neo4jConstraints) {
            // Debug the constraint we're looking for
            console.log(`Looking for constraint: ${requiredConstraint.type} on ${requiredConstraint.label}.${requiredConstraint.property}`);
            const found = constraints.some(constraint => {
                // Convert arrays to strings for comparison if needed
                const constraintLabel = Array.isArray(constraint.label) ? constraint.label[0] : constraint.label;
                const constraintProperty = Array.isArray(constraint.property) ? constraint.property[0] : constraint.property;
                // Check if the constraint matches what we're looking for
                const labelMatch = constraintLabel === requiredConstraint.label;
                const propertyMatch = constraintProperty === requiredConstraint.property;
                // For type, be more specific - check for exact match with "UNIQUENESS"
                const typeMatch = constraint.type === requiredConstraint.type;
                if (labelMatch && propertyMatch) {
                    console.log(`Found potential match: ${constraintLabel}.${constraintProperty} with type ${constraint.type}`);
                }
                return labelMatch && propertyMatch && typeMatch;
            });
            if (!found) {
                console.warn(`Missing constraint: ${requiredConstraint.type} on ${requiredConstraint.label}.${requiredConstraint.property}`);
                return false;
            }
        }
        // Verify required indexes
        for (const requiredIndex of index_1.SCHEMA_METADATA.neo4jIndexes) {
            const found = indexes.some(index => index.label === requiredIndex.label &&
                index.property === requiredIndex.property);
            if (!found) {
                console.warn(`Missing index on ${requiredIndex.label}.${requiredIndex.property}`);
                return false;
            }
        }
        // Check if full-text index feature is available
        let fullTextIndexAvailable = false;
        try {
            const proceduresResult = await session.run("CALL dbms.procedures() YIELD name WHERE name = 'db.index.fulltext.createNodeIndex' RETURN count(*) > 0 as available");
            fullTextIndexAvailable = proceduresResult.records[0].get('available');
        }
        catch (error) {
            console.warn("Could not check if full-text index feature is available:", error);
        }
        // Verify full-text indexes only if the feature is available
        if (fullTextIndexAvailable) {
            for (const requiredFTIndex of index_1.SCHEMA_METADATA.neo4jFullTextIndexes) {
                const found = indexes.some(index => index.name === requiredFTIndex.name &&
                    index.type.includes('FULLTEXT'));
                if (!found) {
                    console.warn(`Missing full-text index: ${requiredFTIndex.name}`);
                    return false;
                }
            }
        }
        else {
            console.warn("Full-text index feature is not available. Skipping full-text index verification.");
        }
        console.log('Schema constraints and indexes verified successfully');
        return true;
    }
    catch (error) {
        console.error('Error verifying schema constraints and indexes:', error);
        return false;
    }
}
//# sourceMappingURL=schema-constraints.js.map