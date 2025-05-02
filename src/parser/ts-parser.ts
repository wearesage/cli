import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import {
  Node, Relationship,
  File, Class, Interface, TypeAlias, Function, Method,
  Property, Variable, Parameter, InterfaceProperty,
  Imports, ImportsFromPackage, ExportsLocal,
  HasParameter, InterfaceHasProperty
} from '../schema/index.ts';

/**
 * Configuration options for the TypeScript parser
 */
export interface TSParserOptions {
  /**
   * Root directory of the codebase
   */
  rootDir: string;
  
  /**
   * Unique identifier for the codebase
   */
  codebaseId: string;
  
  /**
   * TypeScript compiler options
   */
  compilerOptions?: ts.CompilerOptions;
}

/**
 * Result of parsing a TypeScript file
 */
export interface ParseResult {
  /**
   * Nodes extracted from the file
   */
  nodes: Node[];
  
  /**
   * Relationships extracted from the file
   */
  relationships: Relationship[];
}

/**
 * Parser for TypeScript files using the TypeScript Compiler API
 */
export class TSParser {
  private rootDir: string;
  private codebaseId: string;
  private compilerOptions: ts.CompilerOptions;
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;
  
  /**
   * Create a new TypeScript parser
   */
  constructor(options: TSParserOptions) {
    this.rootDir = options.rootDir;
    this.codebaseId = options.codebaseId;
    this.compilerOptions = options.compilerOptions || {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      esModuleInterop: true,
      strict: true,
    };
  }
  
  /**
   * Initialize the TypeScript program and type checker
   */
  public initialize(filePaths: string[]): void {
    this.program = ts.createProgram(filePaths, this.compilerOptions);
    this.typeChecker = this.program.getTypeChecker();
  }
  
  /**
   * Parse a TypeScript file and extract nodes and relationships
   */
  public parseFile(filePath: string): ParseResult {
    if (!this.program || !this.typeChecker) {
      throw new Error('Parser not initialized. Call initialize() first.');
    }
    
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      throw new Error(`Source file not found: ${filePath}`);
    }
    
    const result: ParseResult = {
      nodes: [],
      relationships: []
    };
    
    // Create a node for the file
    const fileNode: File = {
      nodeId: this.generateNodeId('File', filePath),
      codebaseId: this.codebaseId,
      labels: ['File'],
      path: path.relative(this.rootDir, filePath),
      absolutePath: filePath,
      name: path.basename(filePath),
      extension: path.extname(filePath).substring(1),
      language: 'typescript',
      lineCount: sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line + 1,
      size: this.getFileSize(filePath),
      hasDefaultExport: this.hasDefaultExport(sourceFile),
      defaultExportExpression: this.getDefaultExportExpression(sourceFile),
      hasNamedExports: false, // Will need to be updated with actual logic
      namedExports: [],
      hasCommonJSExport: false, // Will need to be updated with actual logic
      importCount: 0, // Will need to be updated with actual logic
      exportCount: 0 // Will need to be updated with actual logic
    };
    
    result.nodes.push(fileNode);
    
    // Visit each node in the source file
    this.visitNode(sourceFile, result, fileNode);
    
    return result;
  }
  
  /**
   * Visit a TypeScript AST node and extract information
   */
  private visitNode(node: ts.Node, result: ParseResult, fileNode: File): void {
    if (!this.typeChecker) {
      throw new Error('Type checker not initialized');
    }
    
    // Extract information based on node kind
    switch (node.kind) {
      case ts.SyntaxKind.ClassDeclaration:
        this.extractClass(node as ts.ClassDeclaration, result, fileNode);
        break;
        
      case ts.SyntaxKind.InterfaceDeclaration:
        this.extractInterface(node as ts.InterfaceDeclaration, result, fileNode);
        break;
        
      case ts.SyntaxKind.TypeAliasDeclaration:
        this.extractTypeAlias(node as ts.TypeAliasDeclaration, result, fileNode);
        break;
        
      case ts.SyntaxKind.FunctionDeclaration:
        this.extractFunction(node as ts.FunctionDeclaration, result, fileNode);
        break;
        
      case ts.SyntaxKind.MethodDeclaration:
        this.extractMethod(node as ts.MethodDeclaration, result, fileNode);
        break;
        
      case ts.SyntaxKind.PropertyDeclaration:
        this.extractProperty(node as ts.PropertyDeclaration, result, fileNode);
        break;
        
      case ts.SyntaxKind.VariableStatement:
        this.extractVariableStatement(node as ts.VariableStatement, result, fileNode);
        break;
        
      case ts.SyntaxKind.ImportDeclaration:
        this.extractImport(node as ts.ImportDeclaration, result, fileNode);
        break;
        
      case ts.SyntaxKind.ExportDeclaration:
        this.extractExport(node as ts.ExportDeclaration, result, fileNode);
        break;
    }
    
    // Visit each child node
    ts.forEachChild(node, child => this.visitNode(child, result, fileNode));
  }
  
  /**
   * Extract class information from a class declaration
   */
  private extractClass(node: ts.ClassDeclaration, result: ParseResult, fileNode: File): void {
    if (!node.name) return; // Skip anonymous classes
    
    const name = node.name.getText();
    const classNode: Class = {
      nodeId: this.generateNodeId('Class', `${fileNode.path}:${name}`),
      codebaseId: this.codebaseId,
      labels: ['Class'],
      name,
      file: fileNode.path,
      startLine: this.getLineNumber(node.getStart()),
      endLine: this.getLineNumber(node.getEnd()),
      isAbstract: node.modifiers?.some(m => m.kind === ts.SyntaxKind.AbstractKeyword) || false,
      description: this.getJsDocComment(node),
      isGeneric: !!node.typeParameters && node.typeParameters.length > 0,
      hasConstructor: node.members.some(m => ts.isConstructorDeclaration(m)),
      methodCount: node.members.filter(m => ts.isMethodDeclaration(m)).length,
      propertyCount: node.members.filter(m => ts.isPropertyDeclaration(m)).length,
      isExported: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false,
      isDefaultExport: node.modifiers?.some(m =>
        m.kind === ts.SyntaxKind.ExportKeyword &&
        node.modifiers?.some(m2 => m2.kind === ts.SyntaxKind.DefaultKeyword)
      ) || false,
      hasDecorators: false // Simplified implementation
    };
    
    result.nodes.push(classNode);
    
    // Add DEFINES relationship
    result.relationships.push({
      nodeId: this.generateNodeId('DEFINES_CLASS', `${fileNode.nodeId}->${classNode.nodeId}`),
      codebaseId: this.codebaseId,
      type: 'DEFINES_CLASS',
      startNodeId: fileNode.nodeId,
      endNodeId: classNode.nodeId
    });
    
    // Extract heritage clauses (extends, implements)
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          for (const type of clause.types) {
            const baseClassName = type.expression.getText();
            // We would need to resolve the actual class node here
            // For simplicity, we'll just create a relationship with the name
            result.relationships.push({
              nodeId: this.generateNodeId('EXTENDS', `${classNode.nodeId}->${baseClassName}`),
              codebaseId: this.codebaseId,
              type: 'EXTENDS',
              startNodeId: classNode.nodeId,
              endNodeId: baseClassName // This is a simplification
            });
          }
        } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
          for (const type of clause.types) {
            const interfaceName = type.expression.getText();
            // Similar simplification as above
            result.relationships.push({
              nodeId: this.generateNodeId('IMPLEMENTS', `${classNode.nodeId}->${interfaceName}`),
              codebaseId: this.codebaseId,
              type: 'IMPLEMENTS',
              startNodeId: classNode.nodeId,
              endNodeId: interfaceName // This is a simplification
            });
          }
        }
      }
    }
  }
  
  /**
   * Extract interface information from an interface declaration
   */
  private extractInterface(node: ts.InterfaceDeclaration, result: ParseResult, fileNode: File): void {
    const name = node.name.getText();
    const interfaceNode: Interface = {
      nodeId: this.generateNodeId('Interface', `${fileNode.path}:${name}`),
      codebaseId: this.codebaseId,
      labels: ['Interface'],
      name,
      file: fileNode.path,
      startLine: this.getLineNumber(node.getStart()),
      endLine: this.getLineNumber(node.getEnd()),
      description: this.getJsDocComment(node),
      isGeneric: !!node.typeParameters && node.typeParameters.length > 0,
      methodCount: node.members.filter(m => ts.isMethodSignature(m)).length,
      propertyCount: node.members.filter(m => ts.isPropertySignature(m)).length,
      extendsCount: node.heritageClauses?.filter(h => h.token === ts.SyntaxKind.ExtendsKeyword).length || 0,
      isExported: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false,
      isDefaultExport: node.modifiers?.some(m =>
        m.kind === ts.SyntaxKind.ExportKeyword &&
        node.modifiers?.some(m2 => m2.kind === ts.SyntaxKind.DefaultKeyword)
      ) || false
    };
    
    result.nodes.push(interfaceNode);
    
    // Add DEFINES relationship
    result.relationships.push({
      nodeId: this.generateNodeId('DEFINES_INTERFACE', `${fileNode.nodeId}->${interfaceNode.nodeId}`),
      codebaseId: this.codebaseId,
      type: 'DEFINES_INTERFACE',
      startNodeId: fileNode.nodeId,
      endNodeId: interfaceNode.nodeId
    });
    
    // Extract interface properties
    node.members.forEach((member, index) => {
      if (ts.isPropertySignature(member)) {
        this.extractInterfaceProperty(member, result, fileNode, interfaceNode, index);
      }
    });
    
    // Extract heritage clauses (extends)
    if (node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
          for (const type of clause.types) {
            const baseInterfaceName = type.expression.getText();
            // Simplification as in extractClass
            result.relationships.push({
              nodeId: this.generateNodeId('EXTENDS', `${interfaceNode.nodeId}->${baseInterfaceName}`),
              codebaseId: this.codebaseId,
              type: 'EXTENDS',
              startNodeId: interfaceNode.nodeId,
              endNodeId: baseInterfaceName // This is a simplification
            });
          }
        }
      }
    }
  }

  /**
   * Extract interface property information from a property signature
   */
  private extractInterfaceProperty(
    node: ts.PropertySignature,
    result: ParseResult,
    fileNode: File,
    interfaceNode: Interface,
    index: number
  ): void {
    if (!node.name) return; // Skip properties without names
    
    const name = node.name.getText();
    const typeNode = node.type;
    const typeString = typeNode ? typeNode.getText() : 'any';
    const description = this.getJsDocComment(node);
    const isOptional = !!node.questionToken;
    
    // Create InterfaceProperty node
    const propertyNode: InterfaceProperty = {
      nodeId: this.generateNodeId('InterfaceProperty', `${fileNode.path}:${interfaceNode.name}.${name}`),
      codebaseId: this.codebaseId,
      labels: ['InterfaceProperty'],
      type: 'InterfaceProperty',
      name,
      typeString,
      description,
      isOptional,
      // PropertySignature doesn't have an initializer property in TypeScript
      defaultValue: undefined
    };
    
    result.nodes.push(propertyNode);
    
    // Add HAS_PROPERTY relationship
    const relationship: InterfaceHasProperty = {
      nodeId: this.generateNodeId('HAS_PROPERTY', `${interfaceNode.nodeId}->${propertyNode.nodeId}`),
      codebaseId: this.codebaseId,
      type: 'HAS_PROPERTY',
      startNodeId: interfaceNode.nodeId,
      endNodeId: propertyNode.nodeId,
      index,
      isOptional
    };
    
    result.relationships.push(relationship);
  }
  
  /**
   * Extract type alias information from a type alias declaration
   */
  private extractTypeAlias(node: ts.TypeAliasDeclaration, result: ParseResult, fileNode: File): void {
    const name = node.name.getText();
    const typeAliasNode: TypeAlias = {
      nodeId: this.generateNodeId('TypeAlias', `${fileNode.path}:${name}`),
      codebaseId: this.codebaseId,
      labels: ['TypeAlias'],
      name,
      file: fileNode.path,
      startLine: this.getLineNumber(node.getStart()),
      endLine: this.getLineNumber(node.getEnd()),
      definition: node.type.getText(),
      isGeneric: !!node.typeParameters && node.typeParameters.length > 0,
      isUnion: node.type.kind === ts.SyntaxKind.UnionType,
      isIntersection: node.type.kind === ts.SyntaxKind.IntersectionType,
      isExported: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false,
      isDefaultExport: node.modifiers?.some(m =>
        m.kind === ts.SyntaxKind.ExportKeyword &&
        node.modifiers?.some(m2 => m2.kind === ts.SyntaxKind.DefaultKeyword)
      ) || false
    };
    
    result.nodes.push(typeAliasNode);
    
    // Add DEFINES relationship
    result.relationships.push({
      nodeId: this.generateNodeId('DEFINES_TYPE_ALIAS', `${fileNode.nodeId}->${typeAliasNode.nodeId}`),
      codebaseId: this.codebaseId,
      type: 'DEFINES_TYPE_ALIAS',
      startNodeId: fileNode.nodeId,
      endNodeId: typeAliasNode.nodeId
    });
    
    // Extract properties from type alias if it's a type literal
    if (ts.isTypeLiteralNode(node.type)) {
      node.type.members.forEach((member, index) => {
        if (ts.isPropertySignature(member)) {
          this.extractInterfaceProperty(member, result, fileNode, typeAliasNode as any, index);
        }
      });
    }
  }
  
  /**
   * Extract function information from a function declaration
   */
  private extractFunction(node: ts.FunctionDeclaration, result: ParseResult, fileNode: File): void {
    if (!node.name) return; // Skip anonymous functions
    
    const name = node.name.getText();
    const functionNode: Function = {
      nodeId: this.generateNodeId('Function', `${fileNode.path}:${name}`),
      codebaseId: this.codebaseId,
      labels: ['Function'],
      name,
      file: fileNode.path,
      startLine: this.getLineNumber(node.getStart()),
      endLine: this.getLineNumber(node.getEnd()),
      isAsync: node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false,
      description: this.getJsDocComment(node),
      parameterCount: node.parameters.length,
      isExported: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false,
      isDefaultExport: node.modifiers?.some(m =>
        m.kind === ts.SyntaxKind.ExportKeyword &&
        node.modifiers?.some(m2 => m2.kind === ts.SyntaxKind.DefaultKeyword)
      ) || false,
      isGenerator: !!node.asteriskToken,
      isArrowFunction: false,
      isFunctionExpression: false,
      hasRestParameter: node.parameters.some(p => !!p.dotDotDotToken),
      hasOptionalParameters: node.parameters.some(p => !!p.questionToken),
      hasTypeParameters: !!node.typeParameters && node.typeParameters.length > 0
    };
    
    result.nodes.push(functionNode);
    
    // Add DEFINES relationship
    result.relationships.push({
      nodeId: this.generateNodeId('DEFINES_FUNCTION', `${fileNode.nodeId}->${functionNode.nodeId}`),
      codebaseId: this.codebaseId,
      type: 'DEFINES_FUNCTION',
      startNodeId: fileNode.nodeId,
      endNodeId: functionNode.nodeId
    });
    
    // Extract parameters
    this.extractParameters(node.parameters, result, functionNode);
  }
  
  /**
   * Extract method information from a method declaration
   */
  private extractMethod(node: ts.MethodDeclaration, result: ParseResult, fileNode: File): void {
    // We need to find the parent class or interface
    let parent = node.parent;
    if (!ts.isClassDeclaration(parent) && !ts.isInterfaceDeclaration(parent)) {
      return; // Skip if parent is not a class or interface
    }
    
    if (!parent.name) return; // Skip if parent has no name
    const parentName = parent.name.getText();
    
    const name = node.name.getText();
    const methodNode: Method = {
      nodeId: this.generateNodeId('Method', `${fileNode.path}:${parentName}.${name}`),
      codebaseId: this.codebaseId,
      labels: ['Method'],
      name,
      file: fileNode.path,
      startLine: this.getLineNumber(node.getStart()),
      endLine: this.getLineNumber(node.getEnd()),
      isAsync: node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false,
      isStatic: node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) || false,
      visibility: this.getVisibility(node),
      description: this.getJsDocComment(node),
      isAbstract: node.modifiers?.some(m => m.kind === ts.SyntaxKind.AbstractKeyword) || false,
      isGenerator: !!node.asteriskToken,
      isGetter: false, // Would need to check if this is a getter method
      isSetter: false, // Would need to check if this is a setter method
      parameterCount: node.parameters.length,
      hasRestParameter: node.parameters.some(p => !!p.dotDotDotToken),
      hasOptionalParameters: node.parameters.some(p => !!p.questionToken),
      hasTypeParameters: !!node.typeParameters && node.typeParameters.length > 0
    };
    
    result.nodes.push(methodNode);
    
    // Find the parent node
    const parentNodeId = this.generateNodeId(
      ts.isClassDeclaration(parent) ? 'Class' : 'Interface',
      `${fileNode.path}:${parentName}`
    );
    
    // Add HAS_METHOD relationship
    result.relationships.push({
      nodeId: this.generateNodeId('HAS_METHOD', `${parentNodeId}->${methodNode.nodeId}`),
      codebaseId: this.codebaseId,
      type: 'HAS_METHOD',
      startNodeId: parentNodeId,
      endNodeId: methodNode.nodeId
    });
    
    // Extract parameters
    this.extractParameters(node.parameters, result, methodNode);
  }
  
  /**
   * Extract property information from a property declaration
   */
  private extractProperty(node: ts.PropertyDeclaration, result: ParseResult, fileNode: File): void {
    // We need to find the parent class
    let parent = node.parent;
    if (!ts.isClassDeclaration(parent)) {
      return; // Skip if parent is not a class
    }
    
    if (!parent.name) return; // Skip if parent has no name
    const parentName = parent.name.getText();
    
    const name = node.name.getText();
    const propertyNode: Property = {
      nodeId: this.generateNodeId('Property', `${fileNode.path}:${parentName}.${name}`),
      codebaseId: this.codebaseId,
      labels: ['Property'],
      name,
      file: fileNode.path,
      startLine: this.getLineNumber(node.getStart()),
      endLine: this.getLineNumber(node.getEnd()),
      isStatic: node.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) || false,
      visibility: this.getVisibility(node),
      typeString: node.type ? node.type.getText() : undefined,
      initializer: node.initializer ? node.initializer.getText() : undefined,
      isReadonly: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword) || false,
      isOptional: !!node.questionToken,
      isParameterProperty: false,
      hasDecorators: false // Simplified implementation
    };
    
    result.nodes.push(propertyNode);
    
    // Find the parent node
    const parentNodeId = this.generateNodeId('Class', `${fileNode.path}:${parentName}`);
    
    // Add HAS_PROPERTY relationship
    result.relationships.push({
      nodeId: this.generateNodeId('HAS_PROPERTY', `${parentNodeId}->${propertyNode.nodeId}`),
      codebaseId: this.codebaseId,
      type: 'HAS_PROPERTY',
      startNodeId: parentNodeId,
      endNodeId: propertyNode.nodeId
    });
  }
  
  /**
   * Extract variable information from a variable statement
   */
  private extractVariableStatement(node: ts.VariableStatement, result: ParseResult, fileNode: File): void {
    for (const declaration of node.declarationList.declarations) {
      const name = declaration.name.getText();
      const variableNode: Variable = {
        nodeId: this.generateNodeId('Variable', `${fileNode.path}:${name}`),
        codebaseId: this.codebaseId,
        labels: ['Variable'],
        name,
        file: fileNode.path,
        startLine: this.getLineNumber(declaration.getStart()),
        endLine: this.getLineNumber(declaration.getEnd()),
        isConstant: node.declarationList.flags & ts.NodeFlags.Const ? true : false,
        scope: this.getVariableScope(node),
        typeString: declaration.type ? declaration.type.getText() : undefined,
        initializer: declaration.initializer ? declaration.initializer.getText() : undefined
      };
      
      result.nodes.push(variableNode);
      
      // Add DEFINES_VARIABLE relationship
      result.relationships.push({
        nodeId: this.generateNodeId('DEFINES_VARIABLE', `${fileNode.nodeId}->${variableNode.nodeId}`),
        codebaseId: this.codebaseId,
        type: 'DEFINES_VARIABLE',
        startNodeId: fileNode.nodeId,
        endNodeId: variableNode.nodeId
      });
    }
  }
  
  /**
   * Extract parameters from a function or method declaration
   */
  private extractParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>, result: ParseResult, parent: Function | Method): void {
    parameters.forEach((param, index) => {
      const name = param.name.getText();
      const paramNode: Parameter = {
        nodeId: this.generateNodeId('Parameter', `${parent.file}:${parent.name}:${name}`),
        codebaseId: this.codebaseId,
        labels: ['Parameter'],
        name,
        file: parent.file,
        startLine: this.getLineNumber(param.getStart()),
        endLine: this.getLineNumber(param.getEnd()),
        index,
        isOptional: !!param.questionToken,
        isRest: !!param.dotDotDotToken,
        typeString: param.type ? param.type.getText() : undefined,
        initializer: param.initializer ? param.initializer.getText() : undefined,
        isParameterProperty: false, // Default value, should be updated for actual parameter properties
        hasDecorators: false // Default value, should be updated if decorators are present
      };
      
      result.nodes.push(paramNode);
      
      // Add HAS_PARAMETER relationship
      const hasParamRel: HasParameter = {
        nodeId: this.generateNodeId('HAS_PARAMETER', `${parent.nodeId}->${paramNode.nodeId}`),
        codebaseId: this.codebaseId,
        type: 'HAS_PARAMETER',
        startNodeId: parent.nodeId,
        endNodeId: paramNode.nodeId,
        index,
        isOptional: !!param.questionToken,
        isRest: !!param.dotDotDotToken,
        hasDefaultValue: !!param.initializer,
        isDestructured: ts.isObjectBindingPattern(param.name) || ts.isArrayBindingPattern(param.name)
      };
      result.relationships.push(hasParamRel);
    });
  }
  
  /**
   * Extract import information from an import declaration
   */
  private extractImport(node: ts.ImportDeclaration, result: ParseResult, fileNode: File): void {
    const moduleSpecifier = node.moduleSpecifier.getText().replace(/['"]/g, '');
    const importClause = node.importClause;
    
    if (!importClause) return; // Skip if no import clause
    
    const hasDefaultImport = !!importClause.name;
    const hasNamedImports = !!importClause.namedBindings && ts.isNamedImports(importClause.namedBindings);
    const hasNamespaceImport = !!importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings);
    const isTypeOnly = !!importClause.isTypeOnly;
    
    let imports: string[] = [];
    
    // Add default import
    if (hasDefaultImport && importClause.name) {
      imports.push(importClause.name.getText());
    }
    
    // Add named imports
    if (hasNamedImports && importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
      for (const element of importClause.namedBindings.elements) {
        imports.push(element.name.getText());
      }
    }
    
    // Add namespace import
    if (hasNamespaceImport && importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings)) {
      imports.push(importClause.namedBindings.name.getText());
    }
    
    // Determine if this is a package import or a local import
    const isPackageImport = !moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/');
    
    // Create the relationship
    const relationshipType = isPackageImport ? 'IMPORTS_FROM_PACKAGE' : 'IMPORTS';
    const targetNodeId = isPackageImport
      ? this.generateNodeId('Package', moduleSpecifier)
      : this.generateNodeId('File', this.resolveImportPath(fileNode.path, moduleSpecifier));
    
    if (isPackageImport) {
      const importRel: ImportsFromPackage = {
        nodeId: this.generateNodeId(relationshipType, `${fileNode.nodeId}->${targetNodeId}`),
        codebaseId: this.codebaseId,
        type: 'IMPORTS_FROM_PACKAGE',
        startNodeId: fileNode.nodeId,
        endNodeId: targetNodeId,
        imports,
        importCount: imports.length,
        hasDefaultImport,
        hasNamedImports,
        hasNamespaceImport,
        isTypeOnly,
        importPath: moduleSpecifier,
        isRelative: false,
        isResolved: true,
        packageName: moduleSpecifier
      };
      result.relationships.push(importRel);
    } else {
      const importRel: Imports = {
        nodeId: this.generateNodeId(relationshipType, `${fileNode.nodeId}->${targetNodeId}`),
        codebaseId: this.codebaseId,
        type: 'IMPORTS',
        startNodeId: fileNode.nodeId,
        endNodeId: targetNodeId,
        imports,
        importCount: imports.length,
        hasDefaultImport,
        hasNamedImports,
        hasNamespaceImport,
        isTypeOnly,
        importPath: moduleSpecifier,
        isRelative: true,
        isResolved: true,
        resolvedPath: this.resolveImportPath(fileNode.path, moduleSpecifier)
      };
      result.relationships.push(importRel);
    }
  }
  
  /**
   * Extract export information from an export declaration
   */
  private extractExport(node: ts.ExportDeclaration, result: ParseResult, fileNode: File): void {
    // This is a simplified implementation
    if (!node.moduleSpecifier) {
      // Local export
      const exportRel: ExportsLocal = {
        nodeId: this.generateNodeId('EXPORTS_LOCAL', `${fileNode.nodeId}->local`),
        codebaseId: this.codebaseId,
        type: 'EXPORTS_LOCAL',
        startNodeId: fileNode.nodeId,
        endNodeId: 'local', // This is a simplification
        exportCount: 1,
        hasNamedExports: true,
        isTypeOnly: !!node.isTypeOnly,
        isReExport: false,
        exportNames: node.exportClause ?
          ts.isNamedExports(node.exportClause) ?
            node.exportClause.elements.map(e => e.name.getText()) :
            ['*'] :
          ['*'],
        exportKinds: ['variable'] // Default, should be updated with actual types
      };
      result.relationships.push(exportRel);
    } else {
      // Re-export
      const moduleSpecifier = node.moduleSpecifier.getText().replace(/['"]/g, '');
      const isPackageImport = !moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/');
      
      const relationshipType = isPackageImport ? 'REEXPORTS_FROM_PACKAGE' : 'REEXPORTS';
      const targetNodeId = isPackageImport 
        ? this.generateNodeId('Package', moduleSpecifier)
        : this.generateNodeId('File', this.resolveImportPath(fileNode.path, moduleSpecifier));
      
      // This is a simplification - we should use the proper relationship type
      const exportRel: ExportsLocal = {
        nodeId: this.generateNodeId(relationshipType, `${fileNode.nodeId}->${targetNodeId}`),
        codebaseId: this.codebaseId,
        type: 'EXPORTS_LOCAL', // Using ExportsLocal as a simplification
        startNodeId: fileNode.nodeId,
        endNodeId: targetNodeId,
        exportCount: 1,
        hasNamedExports: true,
        isTypeOnly: !!node.isTypeOnly,
        isReExport: true,
        exportNames: node.exportClause ?
          ts.isNamedExports(node.exportClause) ?
            node.exportClause.elements.map(e => e.name.getText()) :
            ['*'] :
          ['*'],
        exportKinds: ['variable'] // Default, should be updated with actual types
      };
      result.relationships.push(exportRel);
    }
  }
  
  /**
   * Check if a source file has a default export
   */
  private hasDefaultExport(sourceFile: ts.SourceFile): boolean {
    let hasDefault = false;
    
    ts.forEachChild(sourceFile, node => {
      if (
        (ts.isExportAssignment(node) && !node.isExportEquals) ||
        (ts.isFunctionDeclaration(node) && node.modifiers?.some(m =>
          m.kind === ts.SyntaxKind.ExportKeyword
        ) && node.modifiers?.some(m =>
          m.kind === ts.SyntaxKind.DefaultKeyword
        )) ||
        (ts.isClassDeclaration(node) && node.modifiers?.some(m =>
          m.kind === ts.SyntaxKind.ExportKeyword
        ) && node.modifiers?.some(m =>
          m.kind === ts.SyntaxKind.DefaultKeyword
        ))
      ) {
        hasDefault = true;
      }
    });
    
    return hasDefault;
  }
  
  /**
   * Get the default export expression from a source file
   */
  private getDefaultExportExpression(sourceFile: ts.SourceFile): string | undefined {
    let expression: string | undefined;
    
    ts.forEachChild(sourceFile, node => {
      if (ts.isExportAssignment(node) && !node.isExportEquals) {
        expression = node.expression.getText();
      }
    });
    
    return expression;
  }
  
  /**
   * Get the line number for a position in the source file
   */
  private getLineNumber(pos: number): number {
    if (!this.program) {
      throw new Error('Program not initialized');
    }
    
    const sourceFile = this.program.getSourceFile(this.program.getRootFileNames()[0]);
    if (!sourceFile) {
      return 0;
    }
    
    return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
  }
  
  /**
   * Get the JSDoc comment for a node
   */
  private getJsDocComment(node: ts.Node): string | undefined {
    const jsDocComments = ts.getJSDocCommentsAndTags(node);
    if (jsDocComments.length === 0) {
      return undefined;
    }
    
    return jsDocComments.map(comment => comment.getText()).join('\n');
  }
  
  /**
   * Get the visibility of a class member
   */
  private getVisibility(node: ts.MethodDeclaration | ts.PropertyDeclaration): 'public' | 'protected' | 'private' {
    if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)) {
      return 'private';
    } else if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ProtectedKeyword)) {
      return 'protected';
    } else {
      return 'public';
    }
  }
  
  /**
   * Get the scope of a variable
   */
  private getVariableScope(node: ts.VariableStatement): 'global' | 'module' | 'function' | 'block' {
    // This is a simplification
    if (node.parent && ts.isSourceFile(node.parent)) {
      return 'module';
    } else if (node.parent && ts.isFunctionLike(node.parent)) {
      return 'function';
    } else {
      return 'block';
    }
  }
  
  /**
   * Resolve an import path relative to a file
   */
  private resolveImportPath(filePath: string, importPath: string): string {
    // This is a simplification
    const dir = path.dirname(filePath);
    const resolvedPath = path.resolve(dir, importPath);
    
    // Add .ts extension if not present
    if (!path.extname(resolvedPath)) {
      return `${resolvedPath}.ts`;
    }
    
    return resolvedPath;
  }
  
  /**
   * Generate a unique node ID
   */
  private generateNodeId(type: string, identifier: string): string {
    return `${type}:${identifier}`;
  }
  
  /**
   * Check if a node has decorators
   * This is a simplified implementation that would need to be expanded
   * in a real-world scenario to properly detect decorators
   */
  private hasNodeDecorators(node: ts.Node): boolean {
    return false;
  }
  
  /**
   * Get the size of a file in bytes
   * Returns 0 if the file doesn't exist or can't be accessed
   */
  private getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      console.error(`Error getting file size for ${filePath}:`, error);
      return 0;
    }
  }
}