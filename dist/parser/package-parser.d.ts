/**
 * Configuration for the package parser
 */
interface PackageParserConfig {
    rootDir: string;
    codebaseId: string;
}
/**
 * Parser for package.json files
 */
export declare class PackageParser {
    private config;
    private packageCache;
    /**
     * Create a new PackageParser instance
     */
    constructor(config: PackageParserConfig);
    /**
     * Find all package.json files in the project
     */
    findPackageJsonFiles(): string[];
    /**
     * Parse a package.json file
     */
    parsePackageJson(filePath: string): any;
    /**
     * Parse dependencies from a package.json file
     */
    private parseDependencies;
    /**
     * Parse all package.json files in the project
     * @param existingNodes Existing nodes from the TS parser
     * @param existingRelationships Existing relationships from the TS parser
     */
    parseAllPackageJsonFiles(existingNodes?: any[], existingRelationships?: any[]): {
        nodes: any[];
        relationships: any[];
    };
    /**
     * Link dependencies to imports
     */
    private linkDependenciesToImports;
    /**
     * Extract the package name from an import path
     */
    private extractPackageNameFromImport;
}
export {};
//# sourceMappingURL=package-parser.d.ts.map