import { Session } from 'neo4j-driver';
/**
 * Creates Neo4j schema constraints and indexes for the TypeScript code graph
 */
export declare function createSchemaConstraints(session: Session): Promise<void>;
/**
 * Drops all Neo4j schema constraints and indexes for the TypeScript code graph
 */
export declare function dropSchemaConstraints(session: Session): Promise<void>;
/**
 * Creates Neo4j schema constraints and indexes for a specific codebase
 */
export declare function createCodebaseSchema(session: Session, codebaseId: string): Promise<void>;
/**
 * Drops Neo4j schema constraints and indexes for a specific codebase
 */
export declare function dropCodebaseSchema(session: Session, codebaseId: string): Promise<void>;
/**
 * Verifies that the Neo4j schema constraints and indexes are correctly set up
 */
export declare function verifySchemaConstraints(session: Session): Promise<boolean>;
//# sourceMappingURL=schema-constraints.d.ts.map