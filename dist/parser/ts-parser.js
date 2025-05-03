"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TSParser = void 0;
const ts = __importStar(require("typescript"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Parser for TypeScript files using the TypeScript Compiler API
 */
class TSParser {
    /**
     * Create a new TypeScript parser
     */
    constructor(options) {
        this.program = null;
        this.typeChecker = null;
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
    initialize(filePaths) {
        this.program = ts.createProgram(filePaths, this.compilerOptions);
        this.typeChecker = this.program.getTypeChecker();
    }
    /**
     * Parse a TypeScript file and extract nodes and relationships
     */
    parseFile(filePath) {
        if (!this.program || !this.typeChecker) {
            throw new Error('Parser not initialized. Call initialize() first.');
        }
        const sourceFile = this.program.getSourceFile(filePath);
        if (!sourceFile) {
            throw new Error(`Source file not found: ${filePath}`);
        }
        const result = {
            nodes: [],
            relationships: []
        };
        // Create a node for the file
        const fileNode = {
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
    visitNode(node, result, fileNode) {
        if (!this.typeChecker) {
            throw new Error('Type checker not initialized');
        }
        // Extract information based on node kind
        switch (node.kind) {
            case ts.SyntaxKind.ClassDeclaration:
                this.extractClass(node, result, fileNode);
                break;
            case ts.SyntaxKind.InterfaceDeclaration:
                this.extractInterface(node, result, fileNode);
                break;
            case ts.SyntaxKind.TypeAliasDeclaration:
                this.extractTypeAlias(node, result, fileNode);
                break;
            case ts.SyntaxKind.FunctionDeclaration:
                this.extractFunction(node, result, fileNode);
                break;
            case ts.SyntaxKind.MethodDeclaration:
                this.extractMethod(node, result, fileNode);
                break;
            case ts.SyntaxKind.PropertyDeclaration:
                this.extractProperty(node, result, fileNode);
                break;
            case ts.SyntaxKind.VariableStatement:
                this.extractVariableStatement(node, result, fileNode);
                break;
            case ts.SyntaxKind.ImportDeclaration:
                this.extractImport(node, result, fileNode);
                break;
            case ts.SyntaxKind.ExportDeclaration:
                this.extractExport(node, result, fileNode);
                break;
            case ts.SyntaxKind.CallExpression:
                // Extract function calls when we encounter a call expression
                this.extractFunctionCall(node, result, fileNode);
                break;
            case ts.SyntaxKind.TypeReference:
                // Extract type references
                this.extractTypeReference(node, result, fileNode);
                break;
            case ts.SyntaxKind.Identifier:
                // Extract variable references
                this.extractVariableReference(node, result, fileNode);
                break;
        }
        // Visit each child node
        ts.forEachChild(node, child => this.visitNode(child, result, fileNode));
    }
    /**
     * Extract class information from a class declaration
     */
    extractClass(node, result, fileNode) {
        if (!node.name)
            return; // Skip anonymous classes
        const name = node.name.getText();
        const classNode = {
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
            isDefaultExport: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword &&
                node.modifiers?.some(m2 => m2.kind === ts.SyntaxKind.DefaultKeyword)) || false,
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
                        // Resolve the actual class node ID
                        const baseClassNodeId = this.resolveTypeNodeId(type.expression, 'Class', fileNode.path);
                        if (baseClassNodeId) {
                            const extendsRel = {
                                nodeId: this.generateNodeId('EXTENDS', `${classNode.nodeId}->${baseClassNodeId}`),
                                codebaseId: this.codebaseId,
                                type: 'EXTENDS',
                                startNodeId: classNode.nodeId,
                                endNodeId: baseClassNodeId,
                                isDirectExtension: true,
                                inheritanceLevel: 1,
                                typeArguments: type.typeArguments ? type.typeArguments.map(t => t.getText()) : undefined
                            };
                            result.relationships.push(extendsRel);
                        }
                    }
                }
                else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
                    for (const type of clause.types) {
                        const interfaceName = type.expression.getText();
                        // Resolve the actual interface node ID
                        const interfaceNodeId = this.resolveTypeNodeId(type.expression, 'Interface', fileNode.path);
                        if (interfaceNodeId) {
                            const implementsRel = {
                                nodeId: this.generateNodeId('IMPLEMENTS', `${classNode.nodeId}->${interfaceNodeId}`),
                                codebaseId: this.codebaseId,
                                type: 'IMPLEMENTS',
                                startNodeId: classNode.nodeId,
                                endNodeId: interfaceNodeId,
                                isPartial: false,
                                typeArguments: type.typeArguments ? type.typeArguments.map(t => t.getText()) : undefined
                            };
                            result.relationships.push(implementsRel);
                        }
                    }
                }
            }
        }
    }
    /**
     * Extract interface information from an interface declaration
     */
    extractInterface(node, result, fileNode) {
        const name = node.name.getText();
        const interfaceNode = {
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
            isDefaultExport: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword &&
                node.modifiers?.some(m2 => m2.kind === ts.SyntaxKind.DefaultKeyword)) || false
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
                        // Resolve the actual interface node ID
                        const baseInterfaceNodeId = this.resolveTypeNodeId(type.expression, 'Interface', fileNode.path);
                        if (baseInterfaceNodeId) {
                            const interfaceExtendsRel = {
                                nodeId: this.generateNodeId('INTERFACE_EXTENDS', `${interfaceNode.nodeId}->${baseInterfaceNodeId}`),
                                codebaseId: this.codebaseId,
                                type: 'INTERFACE_EXTENDS',
                                startNodeId: interfaceNode.nodeId,
                                endNodeId: baseInterfaceNodeId,
                                isDirectExtension: true,
                                inheritanceLevel: 1,
                                typeArguments: type.typeArguments ? type.typeArguments.map(t => t.getText()) : undefined
                            };
                            result.relationships.push(interfaceExtendsRel);
                        }
                    }
                }
            }
        }
    }
    /**
     * Extract interface property information from a property signature
     */
    extractInterfaceProperty(node, result, fileNode, interfaceNode, index) {
        if (!node.name)
            return; // Skip properties without names
        const name = node.name.getText();
        const typeNode = node.type;
        const typeString = typeNode ? typeNode.getText() : 'any';
        const description = this.getJsDocComment(node);
        const isOptional = !!node.questionToken;
        // Create InterfaceProperty node
        const propertyNode = {
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
        const relationship = {
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
    extractTypeAlias(node, result, fileNode) {
        const name = node.name.getText();
        const typeAliasNode = {
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
            isDefaultExport: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword &&
                node.modifiers?.some(m2 => m2.kind === ts.SyntaxKind.DefaultKeyword)) || false
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
                    this.extractInterfaceProperty(member, result, fileNode, typeAliasNode, index);
                }
            });
        }
    }
    /**
     * Extract function information from a function declaration
     */
    extractFunction(node, result, fileNode) {
        if (!node.name)
            return; // Skip anonymous functions
        const name = node.name.getText();
        const functionNode = {
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
            isDefaultExport: node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword &&
                node.modifiers?.some(m2 => m2.kind === ts.SyntaxKind.DefaultKeyword)) || false,
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
    extractMethod(node, result, fileNode) {
        // We need to find the parent class or interface
        let parent = node.parent;
        if (!ts.isClassDeclaration(parent) && !ts.isInterfaceDeclaration(parent)) {
            return; // Skip if parent is not a class or interface
        }
        if (!parent.name)
            return; // Skip if parent has no name
        const parentName = parent.name.getText();
        const name = node.name.getText();
        const methodNode = {
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
        const parentNodeId = this.generateNodeId(ts.isClassDeclaration(parent) ? 'Class' : 'Interface', `${fileNode.path}:${parentName}`);
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
    extractProperty(node, result, fileNode) {
        // We need to find the parent class
        let parent = node.parent;
        if (!ts.isClassDeclaration(parent)) {
            return; // Skip if parent is not a class
        }
        if (!parent.name)
            return; // Skip if parent has no name
        const parentName = parent.name.getText();
        const name = node.name.getText();
        const propertyNode = {
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
    extractVariableStatement(node, result, fileNode) {
        for (const declaration of node.declarationList.declarations) {
            const name = declaration.name.getText();
            const variableNode = {
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
    extractParameters(parameters, result, parent) {
        parameters.forEach((param, index) => {
            const name = param.name.getText();
            const paramNode = {
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
            const hasParamRel = {
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
    extractImport(node, result, fileNode) {
        const moduleSpecifier = node.moduleSpecifier.getText().replace(/['"]/g, '');
        const importClause = node.importClause;
        if (!importClause)
            return; // Skip if no import clause
        const hasDefaultImport = !!importClause.name;
        const hasNamedImports = !!importClause.namedBindings && ts.isNamedImports(importClause.namedBindings);
        const hasNamespaceImport = !!importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings);
        const isTypeOnly = !!importClause.isTypeOnly;
        let imports = [];
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
            const importRel = {
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
        }
        else {
            const importRel = {
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
    extractExport(node, result, fileNode) {
        // This is a simplified implementation
        if (!node.moduleSpecifier) {
            // Local export
            const exportRel = {
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
        }
        else {
            // Re-export
            const moduleSpecifier = node.moduleSpecifier.getText().replace(/['"]/g, '');
            const isPackageImport = !moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/');
            const relationshipType = isPackageImport ? 'REEXPORTS_FROM_PACKAGE' : 'REEXPORTS';
            const targetNodeId = isPackageImport
                ? this.generateNodeId('Package', moduleSpecifier)
                : this.generateNodeId('File', this.resolveImportPath(fileNode.path, moduleSpecifier));
            // This is a simplification - we should use the proper relationship type
            const exportRel = {
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
    hasDefaultExport(sourceFile) {
        let hasDefault = false;
        ts.forEachChild(sourceFile, node => {
            if ((ts.isExportAssignment(node) && !node.isExportEquals) ||
                (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) ||
                (ts.isClassDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword))) {
                hasDefault = true;
            }
        });
        return hasDefault;
    }
    /**
     * Get the default export expression from a source file
     */
    getDefaultExportExpression(sourceFile) {
        let expression;
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
    getLineNumber(pos) {
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
    getJsDocComment(node) {
        const jsDocComments = ts.getJSDocCommentsAndTags(node);
        if (jsDocComments.length === 0) {
            return undefined;
        }
        return jsDocComments.map(comment => comment.getText()).join('\n');
    }
    /**
     * Get the visibility of a class member
     */
    getVisibility(node) {
        if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword)) {
            return 'private';
        }
        else if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ProtectedKeyword)) {
            return 'protected';
        }
        else {
            return 'public';
        }
    }
    /**
     * Get the scope of a variable
     */
    getVariableScope(node) {
        // This is a simplification
        if (node.parent && ts.isSourceFile(node.parent)) {
            return 'module';
        }
        else if (node.parent && ts.isFunctionLike(node.parent)) {
            return 'function';
        }
        else {
            return 'block';
        }
    }
    /**
     * Resolve an import path relative to a file
     */
    resolveImportPath(filePath, importPath) {
        // Convert relative filePath to absolute path using rootDir
        const absoluteFilePath = path.isAbsolute(filePath)
            ? filePath
            : path.resolve(this.rootDir, filePath);
        const dir = path.dirname(absoluteFilePath);
        let resolvedPath = path.resolve(dir, importPath);
        // Handle extension mapping for TypeScript files
        const ext = path.extname(resolvedPath);
        if (!ext) {
            // No extension - add .ts
            resolvedPath = `${resolvedPath}.ts`;
        }
        else if (ext === '.js') {
            // Check if a .ts version exists instead of .js
            const tsPath = resolvedPath.replace(/\.js$/, '.ts');
            if (fs.existsSync(tsPath)) {
                resolvedPath = tsPath;
            }
        }
        return resolvedPath;
    }
    /**
     * Generate a unique node ID
     */
    generateNodeId(type, identifier) {
        return `${this.codebaseId}:${type}:${identifier}`;
    }
    /**
     * Check if a node has decorators
     * This is a simplified implementation that would need to be expanded
     * in a real-world scenario to properly detect decorators
     */
    hasNodeDecorators(node) {
        return false;
    }
    /**
     * Get the size of a file in bytes
     * Returns 0 if the file doesn't exist or can't be accessed
     */
    getFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        }
        catch (error) {
            console.error(`Error getting file size for ${filePath}:`, error);
            return 0;
        }
    }
    /**
     * Get the column number for a position in the source file
     */
    getColumnNumber(pos) {
        if (!this.program) {
            throw new Error('Program not initialized');
        }
        const sourceFile = this.program.getSourceFile(this.program.getRootFileNames()[0]);
        if (!sourceFile) {
            return 0;
        }
        return sourceFile.getLineAndCharacterOfPosition(pos).character;
    }
    /**
     * Resolve a type expression to a node ID
     */
    resolveTypeNodeId(expression, expectedType, currentFilePath) {
        if (!this.typeChecker) {
            return null;
        }
        // Get the symbol for the type expression
        const symbol = this.typeChecker.getSymbolAtLocation(expression);
        if (!symbol) {
            return null;
        }
        // Get the declaration for the symbol
        const declarations = symbol.getDeclarations();
        if (!declarations || declarations.length === 0) {
            return null;
        }
        // Get the first declaration
        const declaration = declarations[0];
        // Check if the declaration is of the expected type
        if ((expectedType === 'Class' && ts.isClassDeclaration(declaration)) ||
            (expectedType === 'Interface' && ts.isInterfaceDeclaration(declaration))) {
            // Get the source file of the declaration
            const sourceFile = declaration.getSourceFile();
            const filePath = sourceFile.fileName;
            // Get the name of the declaration
            const name = declaration.name ? declaration.name.getText() : 'anonymous';
            // Generate a node ID for the declaration
            const relativePath = path.relative(this.rootDir, filePath);
            return this.generateNodeId(expectedType, `${relativePath}:${name}`);
        }
        return null;
    }
    /**
     * Extract function call information from a call expression
     */
    extractFunctionCall(node, result, fileNode) {
        if (!this.typeChecker) {
            throw new Error('Type checker not initialized');
        }
        // Get the current function or method context
        const callerNode = this.findCallerContext(node);
        if (!callerNode) {
            return; // Skip if we can't determine the caller context
        }
        // Get the caller node ID
        const callerNodeId = this.getCallerNodeId(callerNode, fileNode);
        if (!callerNodeId) {
            return; // Skip if we can't determine the caller node ID
        }
        // Get information about the called function
        const calleeInfo = this.getCalleeInfo(node);
        if (!calleeInfo) {
            return; // Skip if we can't determine the callee information
        }
        // Create a unique ID for the called function
        const calleeNodeId = this.generateCalleeNodeId(calleeInfo, fileNode);
        if (!calleeNodeId) {
            return; // Skip if we can't generate a callee node ID
        }
        // Get the call location as separate primitive arrays
        const callLocationLine = this.getLineNumber(node.getStart());
        const callLocationColumn = this.getColumnNumber(node.getStart());
        // Create the CALLS relationship
        const callsRelationship = {
            nodeId: this.generateNodeId('CALLS', `${callerNodeId}->${calleeNodeId}`),
            codebaseId: this.codebaseId,
            type: 'CALLS',
            startNodeId: callerNodeId,
            endNodeId: calleeNodeId,
            callCount: 1,
            callLocationLines: [callLocationLine],
            callLocationColumns: [callLocationColumn],
            arguments: node.arguments.map(arg => arg.getText()),
            isAsync: false, // Would need to check if the call is awaited
            isAwait: node.parent && ts.isAwaitExpression(node.parent),
            isChained: node.parent && ts.isPropertyAccessExpression(node.parent),
            isConditional: this.isInConditionalContext(node)
        };
        // Add the relationship to the result
        result.relationships.push(callsRelationship);
    }
    /**
     * Find the function or method that contains this call expression
     */
    findCallerContext(node) {
        let current = node;
        while (current) {
            if (ts.isFunctionDeclaration(current) ||
                ts.isMethodDeclaration(current) ||
                ts.isArrowFunction(current) ||
                ts.isFunctionExpression(current)) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }
    /**
     * Get the node ID of the caller function or method
     */
    getCallerNodeId(callerNode, fileNode) {
        if (ts.isFunctionDeclaration(callerNode) && callerNode.name) {
            // Function declaration
            return this.generateNodeId('Function', `${fileNode.path}:${callerNode.name.getText()}`);
        }
        else if (ts.isMethodDeclaration(callerNode) && callerNode.name) {
            // Method declaration
            const parent = callerNode.parent;
            if (ts.isClassDeclaration(parent) && parent.name) {
                const parentName = parent.name.getText();
                const methodName = callerNode.name.getText();
                return this.generateNodeId('Method', `${fileNode.path}:${parentName}.${methodName}`);
            }
        }
        else if (ts.isArrowFunction(callerNode) || ts.isFunctionExpression(callerNode)) {
            // For arrow functions and function expressions, we need to find the variable or property they're assigned to
            const parent = callerNode.parent;
            if (ts.isVariableDeclaration(parent) && parent.name) {
                return this.generateNodeId('Function', `${fileNode.path}:${parent.name.getText()}`);
            }
            else if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
                return this.generateNodeId('Function', `${fileNode.path}:${parent.name.getText()}`);
            }
        }
        return null;
    }
    /**
     * Get information about the called function
     */
    getCalleeInfo(node) {
        const expression = node.expression;
        if (ts.isIdentifier(expression)) {
            // Direct function call: foo()
            return { name: expression.getText(), type: 'Function' };
        }
        else if (ts.isPropertyAccessExpression(expression)) {
            // Method call: obj.method()
            const object = expression.expression.getText();
            const property = expression.name.getText();
            return { name: `${object}.${property}`, type: 'Method' };
        }
        return null;
    }
    /**
     * Generate a node ID for the called function
     */
    generateCalleeNodeId(calleeInfo, fileNode) {
        return this.generateNodeId(calleeInfo.type, `${fileNode.path}:${calleeInfo.name}`);
    }
    /**
     * Check if a node is in a conditional context (if, ternary, &&, ||, etc.)
     */
    isInConditionalContext(node) {
        let current = node;
        while (current) {
            if (ts.isIfStatement(current) ||
                ts.isConditionalExpression(current) ||
                ts.isBinaryExpression(current) && (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                    current.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    /**
     * Extract type reference information from a type reference node
     */
    extractTypeReference(node, result, fileNode) {
        if (!this.typeChecker) {
            return;
        }
        // Get the current context (function, method, class, etc.)
        const context = this.findReferenceContext(node);
        if (!context) {
            return; // Skip if we can't determine the context
        }
        // Get the context node ID
        const contextNodeId = this.getReferenceContextNodeId(context, fileNode);
        if (!contextNodeId) {
            return; // Skip if we can't determine the context node ID
        }
        // Get the referenced type
        const typeName = node.typeName.getText();
        const typeNodeId = this.resolveTypeNodeId(node.typeName, 'Interface', fileNode.path) ||
            this.resolveTypeNodeId(node.typeName, 'Class', fileNode.path) ||
            this.resolveTypeNodeId(node.typeName, 'TypeAlias', fileNode.path);
        if (!typeNodeId) {
            return; // Skip if we can't resolve the type
        }
        // Determine reference type
        let referenceType = 'variable';
        if (ts.isParameter(context)) {
            referenceType = 'parameter';
        }
        else if (ts.isPropertyDeclaration(context) || ts.isPropertySignature(context)) {
            referenceType = 'property';
        }
        else if (ts.isTypeAliasDeclaration(context)) {
            referenceType = 'typeAlias';
        }
        else if (ts.isTypeParameterDeclaration(context)) {
            referenceType = 'generic';
        }
        // Create the REFERENCES_TYPE relationship
        const referencesTypeRel = {
            nodeId: this.generateNodeId('REFERENCES_TYPE', `${contextNodeId}->${typeNodeId}`),
            codebaseId: this.codebaseId,
            type: 'REFERENCES_TYPE',
            startNodeId: contextNodeId,
            endNodeId: typeNodeId,
            referenceType,
            isArray: this.isArrayType(node),
            isUnion: this.isUnionType(node.parent),
            isIntersection: this.isIntersectionType(node.parent),
            isGeneric: !!(node.typeArguments && node.typeArguments.length > 0),
            typeArguments: node.typeArguments ? node.typeArguments.map(t => t.getText()) : undefined
        };
        result.relationships.push(referencesTypeRel);
    }
    /**
     * Extract variable reference information from an identifier node
     */
    extractVariableReference(node, result, fileNode) {
        if (!this.typeChecker) {
            return;
        }
        // Skip identifiers that are part of declarations
        if (this.isDeclarationIdentifier(node)) {
            return;
        }
        // Get the current context (function, method, class, etc.)
        const context = this.findReferenceContext(node);
        if (!context) {
            return; // Skip if we can't determine the context
        }
        // Get the context node ID
        const contextNodeId = this.getReferenceContextNodeId(context, fileNode);
        if (!contextNodeId) {
            return; // Skip if we can't determine the context node ID
        }
        // Get the referenced variable
        const variableName = node.getText();
        const symbol = this.typeChecker.getSymbolAtLocation(node);
        if (!symbol || !symbol.declarations || symbol.declarations.length === 0) {
            return; // Skip if we can't resolve the symbol
        }
        const declaration = symbol.declarations[0];
        if (!ts.isVariableDeclaration(declaration) && !ts.isParameter(declaration)) {
            return; // Skip if it's not a variable or parameter
        }
        // Get the variable node ID
        const variableNodeId = this.getVariableNodeId(declaration, fileNode);
        if (!variableNodeId) {
            return; // Skip if we can't determine the variable node ID
        }
        // Determine reference type (read, write, or readwrite)
        const referenceType = this.getVariableReferenceType(node);
        // Get the reference location as separate primitive arrays
        const referenceLocationLine = this.getLineNumber(node.getStart());
        const referenceLocationColumn = this.getColumnNumber(node.getStart());
        // Create the REFERENCES_VARIABLE relationship
        const referencesVarRel = {
            nodeId: this.generateNodeId('REFERENCES_VARIABLE', `${contextNodeId}->${variableNodeId}`),
            codebaseId: this.codebaseId,
            type: 'REFERENCES_VARIABLE',
            startNodeId: contextNodeId,
            endNodeId: variableNodeId,
            referenceType,
            referenceCount: 1,
            referenceLocationLines: [referenceLocationLine],
            referenceLocationColumns: [referenceLocationColumn]
        };
        result.relationships.push(referencesVarRel);
    }
    /**
     * Find the context node for a reference (function, method, class, etc.)
     */
    findReferenceContext(node) {
        let current = node;
        while (current) {
            if (ts.isFunctionDeclaration(current) ||
                ts.isMethodDeclaration(current) ||
                ts.isClassDeclaration(current) ||
                ts.isInterfaceDeclaration(current) ||
                ts.isTypeAliasDeclaration(current) ||
                ts.isParameter(current) ||
                ts.isPropertyDeclaration(current) ||
                ts.isPropertySignature(current) ||
                ts.isVariableDeclaration(current)) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }
    /**
     * Get the node ID for a reference context
     */
    getReferenceContextNodeId(context, fileNode) {
        if (ts.isFunctionDeclaration(context) && context.name) {
            return this.generateNodeId('Function', `${fileNode.path}:${context.name.getText()}`);
        }
        else if (ts.isMethodDeclaration(context) && context.name) {
            const parent = context.parent;
            if (ts.isClassDeclaration(parent) && parent.name) {
                const parentName = parent.name.getText();
                const methodName = context.name.getText();
                return this.generateNodeId('Method', `${fileNode.path}:${parentName}.${methodName}`);
            }
        }
        else if (ts.isClassDeclaration(context) && context.name) {
            return this.generateNodeId('Class', `${fileNode.path}:${context.name.getText()}`);
        }
        else if (ts.isInterfaceDeclaration(context) && context.name) {
            return this.generateNodeId('Interface', `${fileNode.path}:${context.name.getText()}`);
        }
        else if (ts.isTypeAliasDeclaration(context) && context.name) {
            return this.generateNodeId('TypeAlias', `${fileNode.path}:${context.name.getText()}`);
        }
        else if (ts.isParameter(context) && ts.isIdentifier(context.name)) {
            const parent = this.findReferenceContext(context.parent);
            if (parent && (ts.isFunctionDeclaration(parent) || ts.isMethodDeclaration(parent)) && parent.name) {
                const parentName = parent.name.getText();
                const paramName = context.name.getText();
                return this.generateNodeId('Parameter', `${fileNode.path}:${parentName}:${paramName}`);
            }
        }
        else if (ts.isPropertyDeclaration(context) && ts.isIdentifier(context.name)) {
            const parent = context.parent;
            if (ts.isClassDeclaration(parent) && parent.name) {
                const parentName = parent.name.getText();
                const propName = context.name.getText();
                return this.generateNodeId('Property', `${fileNode.path}:${parentName}.${propName}`);
            }
        }
        else if (ts.isVariableDeclaration(context) && ts.isIdentifier(context.name)) {
            return this.generateNodeId('Variable', `${fileNode.path}:${context.name.getText()}`);
        }
        return null;
    }
    /**
     * Get the node ID for a variable declaration
     */
    getVariableNodeId(declaration, fileNode) {
        if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
            return this.generateNodeId('Variable', `${fileNode.path}:${declaration.name.getText()}`);
        }
        else if (ts.isParameter(declaration) && ts.isIdentifier(declaration.name)) {
            const parent = this.findReferenceContext(declaration.parent);
            if (parent && (ts.isFunctionDeclaration(parent) || ts.isMethodDeclaration(parent)) && parent.name) {
                const parentName = parent.name.getText();
                const paramName = declaration.name.getText();
                return this.generateNodeId('Parameter', `${fileNode.path}:${parentName}:${paramName}`);
            }
        }
        return null;
    }
    /**
     * Check if an identifier is part of a declaration
     */
    isDeclarationIdentifier(node) {
        const parent = node.parent;
        return ((ts.isVariableDeclaration(parent) && parent.name === node) ||
            (ts.isParameter(parent) && parent.name === node) ||
            (ts.isFunctionDeclaration(parent) && parent.name === node) ||
            (ts.isClassDeclaration(parent) && parent.name === node) ||
            (ts.isInterfaceDeclaration(parent) && parent.name === node) ||
            (ts.isTypeAliasDeclaration(parent) && parent.name === node) ||
            (ts.isPropertyDeclaration(parent) && parent.name === node) ||
            (ts.isMethodDeclaration(parent) && parent.name === node));
    }
    /**
     * Determine if a variable reference is read, write, or readwrite
     */
    getVariableReferenceType(node) {
        const parent = node.parent;
        if (ts.isBinaryExpression(parent) && parent.left === node && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
            return 'write';
        }
        else if (ts.isPrefixUnaryExpression(parent) &&
            (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken)) {
            return 'readwrite';
        }
        else if (ts.isPostfixUnaryExpression(parent) &&
            (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken)) {
            return 'readwrite';
        }
        else if (ts.isBinaryExpression(parent) &&
            parent.left === node &&
            [
                ts.SyntaxKind.PlusEqualsToken,
                ts.SyntaxKind.MinusEqualsToken,
                ts.SyntaxKind.AsteriskEqualsToken,
                ts.SyntaxKind.SlashEqualsToken,
                ts.SyntaxKind.PercentEqualsToken,
                ts.SyntaxKind.AmpersandEqualsToken,
                ts.SyntaxKind.BarEqualsToken,
                ts.SyntaxKind.CaretEqualsToken,
                ts.SyntaxKind.LessThanLessThanEqualsToken,
                ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
                ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken
            ].includes(parent.operatorToken.kind)) {
            return 'readwrite';
        }
        return 'read';
    }
    /**
     * Check if a type is an array type
     */
    isArrayType(node) {
        return node.typeName.getText() === 'Array' ||
            (node.parent && ts.isArrayTypeNode(node.parent));
    }
    /**
     * Check if a type is part of a union type
     */
    isUnionType(node) {
        return node !== undefined && ts.isUnionTypeNode(node);
    }
    /**
     * Check if a type is part of an intersection type
     */
    isIntersectionType(node) {
        return node !== undefined && ts.isIntersectionTypeNode(node);
    }
}
exports.TSParser = TSParser;
//# sourceMappingURL=ts-parser.js.map