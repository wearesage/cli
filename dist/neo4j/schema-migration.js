"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaMigration = void 0;
const index_1 = require("../schema/index");
/**
 * Handles schema migrations between different versions
 */
class SchemaMigration {
    /**
     * Check if schema migration is needed
     */
    static async isMigrationNeeded(session) {
        try {
            // Check if there are nodes with older schema versions
            const result = await session.run(`
        MATCH (n)
        WHERE n._schemaVersion IS NOT NULL AND n._schemaVersion <> $currentVersion
        RETURN count(n) AS count
      `, { currentVersion: index_1.SCHEMA_VERSION });
            const count = result.records[0].get('count').toNumber();
            return count > 0;
        }
        catch (error) {
            console.error('Error checking if migration is needed:', error);
            return false;
        }
    }
    /**
     * Get current schema versions in the database
     */
    static async getCurrentVersions(session) {
        try {
            const result = await session.run(`
        MATCH (n)
        WHERE n._schemaVersion IS NOT NULL
        RETURN DISTINCT n._schemaVersion AS version
      `);
            return result.records.map(record => record.get('version'));
        }
        catch (error) {
            console.error('Error getting current schema versions:', error);
            return [];
        }
    }
    /**
     * Migrate schema from one version to another
     */
    static async migrateSchema(session, fromVersion, toVersion = index_1.SCHEMA_VERSION) {
        console.log(`Migrating schema from ${fromVersion} to ${toVersion}...`);
        try {
            // Start a transaction for the migration
            const tx = session.beginTransaction();
            try {
                let nodesMigrated = 0;
                let relationshipsMigrated = 0;
                // Handle specific version migrations
                if (fromVersion === '1.0.0' && toVersion === '2.0.0') {
                    // Example migration from 1.0.0 to 2.0.0
                    // 1. Add CodeElement label to nodes that should have it
                    const nodeLabelResult = await tx.run(`
            MATCH (n)
            WHERE n._schemaVersion = $fromVersion
              AND (n:Class OR n:Interface OR n:Function OR n:Method OR n:Property OR n:Variable OR n:Parameter)
              AND NOT n:CodeElement
            SET n:CodeElement, n._schemaVersion = $toVersion, n.updatedAt = datetime()
            RETURN count(n) AS count
          `, { fromVersion, toVersion });
                    nodesMigrated += nodeLabelResult.records[0].get('count').toNumber();
                    // 2. Update relationship properties
                    const relResult = await tx.run(`
            MATCH ()-[r]->()
            WHERE r._schemaVersion = $fromVersion
            SET r._schemaVersion = $toVersion, r.updatedAt = datetime()
            RETURN count(r) AS count
          `, { fromVersion, toVersion });
                    relationshipsMigrated += relResult.records[0].get('count').toNumber();
                    // 3. Update remaining nodes
                    const remainingNodesResult = await tx.run(`
            MATCH (n)
            WHERE n._schemaVersion = $fromVersion
            SET n._schemaVersion = $toVersion, n.updatedAt = datetime()
            RETURN count(n) AS count
          `, { fromVersion, toVersion });
                    nodesMigrated += remainingNodesResult.records[0].get('count').toNumber();
                }
                else {
                    // Generic migration for other version combinations
                    // Update node schema versions
                    const nodeResult = await tx.run(`
            MATCH (n)
            WHERE n._schemaVersion = $fromVersion
            SET n._schemaVersion = $toVersion, n.updatedAt = datetime()
            RETURN count(n) AS count
          `, { fromVersion, toVersion });
                    nodesMigrated = nodeResult.records[0].get('count').toNumber();
                    // Update relationship schema versions
                    const relResult = await tx.run(`
            MATCH ()-[r]->()
            WHERE r._schemaVersion = $fromVersion
            SET r._schemaVersion = $toVersion, r.updatedAt = datetime()
            RETURN count(r) AS count
          `, { fromVersion, toVersion });
                    relationshipsMigrated = relResult.records[0].get('count').toNumber();
                }
                // Commit the transaction
                await tx.commit();
                console.log(`Migration successful: ${nodesMigrated} nodes and ${relationshipsMigrated} relationships migrated`);
                return {
                    success: true,
                    nodesMigrated,
                    relationshipsMigrated
                };
            }
            catch (error) {
                // Rollback the transaction
                await tx.rollback();
                throw error;
            }
        }
        catch (error) {
            console.error('Error migrating schema:', error);
            return {
                success: false,
                nodesMigrated: 0,
                relationshipsMigrated: 0,
                error: error.message || 'Unknown error'
            };
        }
    }
    /**
     * Migrate all schema versions to the current version
     */
    static async migrateAllToCurrentVersion(session) {
        const versions = await this.getCurrentVersions(session);
        const results = [];
        for (const version of versions) {
            if (version !== index_1.SCHEMA_VERSION) {
                const result = await this.migrateSchema(session, version);
                results.push(result);
            }
        }
        return results;
    }
    /**
     * Create a backup of the database before migration
     */
    static async createBackup(session, backupName) {
        try {
            // This is a simplified example - in a real implementation,
            // you would use Neo4j's backup mechanisms or export data
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `${backupName}_${timestamp}`;
            console.log(`Creating backup: ${backupFileName}`);
            // Example: Export nodes to CSV or JSON
            await session.run(`
        CALL apoc.export.json.all($backupFileName, {useTypes: true})
      `, { backupFileName });
            return true;
        }
        catch (error) {
            console.error('Error creating backup:', error);
            return false;
        }
    }
}
exports.SchemaMigration = SchemaMigration;
//# sourceMappingURL=schema-migration.js.map