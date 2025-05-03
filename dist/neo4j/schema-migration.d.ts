import { Session } from 'neo4j-driver';
/**
 * Schema migration configuration
 */
export interface SchemaMigrationConfig {
    /**
     * Whether to automatically migrate schema on import
     */
    autoMigrate: boolean;
    /**
     * Whether to back up data before migration
     */
    backupBeforeMigration: boolean;
}
/**
 * Schema migration result
 */
export interface MigrationResult {
    /**
     * Whether the migration was successful
     */
    success: boolean;
    /**
     * Number of nodes migrated
     */
    nodesMigrated: number;
    /**
     * Number of relationships migrated
     */
    relationshipsMigrated: number;
    /**
     * Error message if migration failed
     */
    error?: string;
}
/**
 * Handles schema migrations between different versions
 */
export declare class SchemaMigration {
    /**
     * Check if schema migration is needed
     */
    static isMigrationNeeded(session: Session): Promise<boolean>;
    /**
     * Get current schema versions in the database
     */
    static getCurrentVersions(session: Session): Promise<string[]>;
    /**
     * Migrate schema from one version to another
     */
    static migrateSchema(session: Session, fromVersion: string, toVersion?: string): Promise<MigrationResult>;
    /**
     * Migrate all schema versions to the current version
     */
    static migrateAllToCurrentVersion(session: Session): Promise<MigrationResult[]>;
    /**
     * Create a backup of the database before migration
     */
    static createBackup(session: Session, backupName: string): Promise<boolean>;
}
//# sourceMappingURL=schema-migration.d.ts.map