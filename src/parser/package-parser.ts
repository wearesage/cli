import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

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
export class PackageParser {
  private config: PackageParserConfig;
  private packageCache: Map<string, any> = new Map();

  /**
   * Create a new PackageParser instance
   */
  constructor(config: PackageParserConfig) {
    this.config = config;
  }

  /**
   * Find all package.json files in the project
   */
  public findPackageJsonFiles(): string[] {
    const packageJsonFiles: string[] = [];
    
    const walk = (directory: string) => {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other common directories to ignore
          if (entry.name !== 'node_modules' && entry.name !== 'dist' && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else if (entry.isFile() && entry.name === 'package.json') {
          packageJsonFiles.push(fullPath);
        }
      }
    };
    
    walk(this.config.rootDir);
    return packageJsonFiles;
  }

  /**
   * Parse a package.json file
   */
  public parsePackageJson(filePath: string): any {
    // Check if we've already parsed this package.json
    if (this.packageCache.has(filePath)) {
      return this.packageCache.get(filePath);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const packageJson = JSON.parse(content);
      
      // Create a package node
      const packageNode = {
        nodeId: `${this.config.codebaseId}:package:${packageJson.name || path.basename(path.dirname(filePath))}`,
        name: packageJson.name || path.basename(path.dirname(filePath)),
        path: path.relative(this.config.rootDir, filePath),
        absolutePath: filePath,
        version: packageJson.version,
        description: packageJson.description,
        author: typeof packageJson.author === 'string' ? packageJson.author : 
                packageJson.author ? JSON.stringify(packageJson.author) : undefined,
        license: packageJson.license,
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        peerDependencies: packageJson.peerDependencies || {},
        isLocal: true,
        codebaseId: this.config.codebaseId,
        labels: ['Package', 'Node']
      };
      
      // Parse dependencies
      const dependencies = this.parseDependencies(packageJson, filePath);
      
      const result = {
        nodes: [packageNode, ...dependencies.nodes],
        relationships: dependencies.relationships
      };
      
      // Cache the result
      this.packageCache.set(filePath, result);
      
      return result;
    } catch (error) {
      console.error(`Error parsing package.json at ${filePath}:`, error);
      return { nodes: [], relationships: [] };
    }
  }

  /**
   * Parse dependencies from a package.json file
   */
  private parseDependencies(packageJson: any, filePath: string): { nodes: any[], relationships: any[] } {
    const nodes: any[] = [];
    const relationships: any[] = [];
    
    const packageName = packageJson.name || path.basename(path.dirname(filePath));
    const packageNodeId = `${this.config.codebaseId}:package:${packageName}`;
    
    // Process regular dependencies
    if (packageJson.dependencies) {
      for (const [depName, depVersion] of Object.entries(packageJson.dependencies)) {
        const depNodeId = `${this.config.codebaseId}:dependency:${depName}`;
        
        // Create dependency node
        nodes.push({
          nodeId: depNodeId,
          name: depName,
          version: depVersion as string,
          isDevDependency: false,
          isPeerDependency: false,
          isOptionalDependency: false,
          isDirectDependency: true,
          isTransitiveDependency: false,
          codebaseId: this.config.codebaseId,
          labels: ['Dependency', 'Node', 'Package']
        });
        
        // Also create a package node with the same ID format that the TS parser uses
        // This will help with linking imports to dependencies
        nodes.push({
          nodeId: `${this.config.codebaseId}:Package:${depName}`,
          name: depName,
          version: depVersion as string,
          path: `node_modules/${depName}`,
          absolutePath: `node_modules/${depName}`,
          isLocal: false,
          codebaseId: this.config.codebaseId,
          labels: ['Package', 'Node']
        });
        
        // Create relationship
        relationships.push({
          nodeId: `${this.config.codebaseId}:depends_on:${packageName}:${depName}`,
          type: 'DEPENDS_ON',
          startNodeId: packageNodeId,
          endNodeId: depNodeId,
          dependencyType: 'regular',
          isStrong: true,
          isWeak: false,
          weight: 1,
          codebaseId: this.config.codebaseId
        });
      }
    }
    
    // Process dev dependencies
    if (packageJson.devDependencies) {
      for (const [depName, depVersion] of Object.entries(packageJson.devDependencies)) {
        const depNodeId = `${this.config.codebaseId}:dependency:${depName}`;
        
        // Create dependency node
        nodes.push({
          nodeId: depNodeId,
          name: depName,
          version: depVersion as string,
          isDevDependency: true,
          isPeerDependency: false,
          isOptionalDependency: false,
          isDirectDependency: true,
          isTransitiveDependency: false,
          codebaseId: this.config.codebaseId,
          labels: ['Dependency', 'Node', 'Package']
        });
        
        // Also create a package node with the same ID format that the TS parser uses
        nodes.push({
          nodeId: `${this.config.codebaseId}:Package:${depName}`,
          name: depName,
          version: depVersion as string,
          path: `node_modules/${depName}`,
          absolutePath: `node_modules/${depName}`,
          isLocal: false,
          codebaseId: this.config.codebaseId,
          labels: ['Package', 'Node']
        });
        
        // Create relationship
        relationships.push({
          nodeId: `${this.config.codebaseId}:depends_on:${packageName}:${depName}`,
          type: 'DEPENDS_ON',
          startNodeId: packageNodeId,
          endNodeId: depNodeId,
          dependencyType: 'dev',
          isStrong: false,
          isWeak: true,
          weight: 0.5,
          codebaseId: this.config.codebaseId
        });
      }
    }
    
    // Process peer dependencies
    if (packageJson.peerDependencies) {
      for (const [depName, depVersion] of Object.entries(packageJson.peerDependencies)) {
        const depNodeId = `${this.config.codebaseId}:dependency:${depName}`;
        
        // Create dependency node
        nodes.push({
          nodeId: depNodeId,
          name: depName,
          version: depVersion as string,
          isDevDependency: false,
          isPeerDependency: true,
          isOptionalDependency: false,
          isDirectDependency: true,
          isTransitiveDependency: false,
          codebaseId: this.config.codebaseId,
          labels: ['Dependency', 'Node', 'Package']
        });
        
        // Also create a package node with the same ID format that the TS parser uses
        nodes.push({
          nodeId: `${this.config.codebaseId}:Package:${depName}`,
          name: depName,
          version: depVersion as string,
          path: `node_modules/${depName}`,
          absolutePath: `node_modules/${depName}`,
          isLocal: false,
          codebaseId: this.config.codebaseId,
          labels: ['Package', 'Node']
        });
        
        // Create relationship
        relationships.push({
          nodeId: `${this.config.codebaseId}:depends_on:${packageName}:${depName}`,
          type: 'DEPENDS_ON',
          startNodeId: packageNodeId,
          endNodeId: depNodeId,
          dependencyType: 'peer',
          isStrong: true,
          isWeak: false,
          weight: 0.8,
          codebaseId: this.config.codebaseId
        });
      }
    }
    
    return { nodes, relationships };
  }

  /**
   * Parse all package.json files in the project
   * @param existingNodes Existing nodes from the TS parser
   * @param existingRelationships Existing relationships from the TS parser
   */
  public parseAllPackageJsonFiles(
    existingNodes: any[] = [],
    existingRelationships: any[] = []
  ): { nodes: any[], relationships: any[] } {
    const packageJsonFiles = this.findPackageJsonFiles();
    console.log(`Found ${packageJsonFiles.length} package.json files`);
    
    const allNodes: any[] = [];
    const allRelationships: any[] = [];
    
    for (const filePath of packageJsonFiles) {
      console.log(`Parsing package.json at ${filePath}`);
      const result = this.parsePackageJson(filePath);
      
      allNodes.push(...result.nodes);
      allRelationships.push(...result.relationships);
    }
    
    // Link dependencies to imports using both existing and new nodes/relationships
    const combinedNodes = [...existingNodes, ...allNodes];
    const combinedRelationships = [...existingRelationships, ...allRelationships];
    this.linkDependenciesToImports(combinedNodes, combinedRelationships);
    
    return { nodes: allNodes, relationships: allRelationships };
  }

  /**
   * Link dependencies to imports
   */
  private linkDependenciesToImports(nodes: any[], relationships: any[]): void {
    // Find all Dependency nodes
    const dependencyNodes = nodes.filter(node =>
      node.labels &&
      node.labels.includes('Dependency')
    );
    
    // Find all Package nodes created by the TS parser
    const packageNodes = nodes.filter(node =>
      node.labels &&
      node.labels.includes('Package') &&
      !node.labels.includes('Dependency')
    );
    
    // Create a map of dependency names to node IDs for quick lookup
    const dependencyMap = new Map<string, string>();
    for (const dep of dependencyNodes) {
      dependencyMap.set(dep.name, dep.nodeId);
    }
    
    // List of built-in Node.js modules
    const builtInModules = [
      'fs', 'path', 'os', 'util', 'http', 'https', 'net', 'crypto', 'events',
      'stream', 'buffer', 'querystring', 'url', 'zlib', 'child_process',
      'cluster', 'dgram', 'dns', 'domain', 'readline', 'string_decoder',
      'tls', 'tty', 'vm', 'assert', 'console', 'process', 'timers'
    ];
    
    // Create dependency nodes for built-in Node.js modules
    for (const moduleName of builtInModules) {
      if (!dependencyMap.has(moduleName)) {
        const depNodeId = `${this.config.codebaseId}:dependency:${moduleName}`;
        
        // Create dependency node
        const depNode = {
          nodeId: depNodeId,
          name: moduleName,
          version: 'built-in',
          isDevDependency: false,
          isPeerDependency: false,
          isOptionalDependency: false,
          isDirectDependency: true,
          isTransitiveDependency: false,
          isBuiltIn: true,
          codebaseId: this.config.codebaseId,
          labels: ['Dependency', 'Node', 'Package', 'BuiltInModule']
        };
        
        // Add to nodes array
        nodes.push(depNode);
        
        // Add to dependency map
        dependencyMap.set(moduleName, depNodeId);
        
        // Also create a package node with the same ID format that the TS parser uses
        nodes.push({
          nodeId: `${this.config.codebaseId}:Package:${moduleName}`,
          name: moduleName,
          version: 'built-in',
          path: `node:${moduleName}`,
          absolutePath: `node:${moduleName}`,
          isLocal: false,
          isBuiltIn: true,
          codebaseId: this.config.codebaseId,
          labels: ['Package', 'Node', 'BuiltInModule']
        });
      }
    }
    
    // Create a map of package names to node IDs for quick lookup
    const packageMap = new Map<string, string>();
    for (const pkg of packageNodes) {
      packageMap.set(pkg.name, pkg.nodeId);
    }
    
    // Create relationships between Package nodes and Dependency nodes
    for (const dep of dependencyNodes) {
      const packageNodeId = packageMap.get(dep.name);
      if (packageNodeId) {
        // Create a relationship between the package and the dependency
        relationships.push({
          nodeId: `${this.config.codebaseId}:is_dependency:${packageNodeId}:${dep.nodeId}`,
          type: 'IS_DEPENDENCY',
          startNodeId: packageNodeId,
          endNodeId: dep.nodeId,
          version: dep.version,
          isDevDependency: dep.isDevDependency || false,
          isPeerDependency: dep.isPeerDependency || false,
          isOptionalDependency: dep.isOptionalDependency || false,
          codebaseId: this.config.codebaseId
        });
      }
    }
    
    // Find all import relationships
    const importRelationships = relationships.filter(rel =>
      rel.type === 'IMPORTS_FROM_PACKAGE'
    );
    
    console.log(`Found ${importRelationships.length} IMPORTS_FROM_PACKAGE relationships`);
    
    // Log the first few import relationships for debugging
    if (importRelationships.length > 0) {
      console.log('First import relationship:');
      console.log(JSON.stringify(importRelationships[0], null, 2));
    }
    
    // For each import relationship, check if it's importing from a package
    for (const rel of importRelationships) {
      // Skip if it's not a package import
      if (!rel.importPath || rel.isRelative) {
        continue;
      }
      
      // Use the packageName property if it exists, otherwise extract it from the importPath
      let packageName = rel.packageName;
      if (!packageName) {
        packageName = this.extractPackageNameFromImport(rel.importPath);
      }
      
      // Skip if we couldn't extract a package name
      if (!packageName) {
        continue;
      }
      
      console.log(`Processing import: ${rel.importPath} -> ${packageName}`);
      
      // Find the dependency node for this package
      const depNodeId = dependencyMap.get(packageName);
      
      // Skip if we don't have a dependency node for this package
      if (!depNodeId) {
        // Log for debugging
        console.log(`No dependency node found for package: ${packageName}`);
        continue;
      }
      
      // Create a relationship between the file and the dependency
      relationships.push({
        nodeId: `${this.config.codebaseId}:imports_dependency:${rel.startNodeId}:${packageName}`,
        type: 'IMPORTS_DEPENDENCY',
        startNodeId: rel.startNodeId,
        endNodeId: depNodeId,
        imports: rel.imports || [],
        importCount: rel.importCount || 1,
        hasDefaultImport: rel.hasDefaultImport || false,
        hasNamedImports: rel.hasNamedImports || false,
        hasNamespaceImport: rel.hasNamespaceImport || false,
        isTypeOnly: rel.isTypeOnly || false,
        importPath: rel.importPath,
        isRelative: false,
        isResolved: true,
        packageName: packageName,
        codebaseId: this.config.codebaseId
      });
    }
    
    // Log the dependency map for debugging
    console.log('Dependency map:');
    dependencyMap.forEach((nodeId, name) => {
      console.log(`  ${name} -> ${nodeId}`);
    });
    
    // Log the import relationships for debugging
    console.log('Import relationships:');
    for (const rel of importRelationships) {
      if (rel.importPath && !rel.isRelative) {
        let packageName = rel.packageName;
        if (!packageName) {
          packageName = this.extractPackageNameFromImport(rel.importPath);
        }
        console.log(`  ${rel.importPath} -> ${packageName}`);
      }
    }
  }
  
  /**
   * Extract the package name from an import path
   */
  private extractPackageNameFromImport(importPath: string): string | null {
    // Handle scoped packages like @types/node
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
      return null;
    }
    
    // Handle regular packages like 'react' or 'lodash/map'
    const parts = importPath.split('/');
    return parts[0];
  }
}