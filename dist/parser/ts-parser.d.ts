import * as ts from 'typescript';
import { Node, Relationship } from '../schema/index';
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
export declare class TSParser {
    private rootDir;
    private codebaseId;
    private compilerOptions;
    private program;
    private typeChecker;
    /**
     * Create a new TypeScript parser
     */
    constructor(options: TSParserOptions);
    /**
     * Initialize the TypeScript program and type checker
     */
    initialize(filePaths: string[]): void;
    /**
     * Parse a TypeScript file and extract nodes and relationships
     */
    parseFile(filePath: string): ParseResult;
    /**
     * Visit a TypeScript AST node and extract information
     */
    private visitNode;
    /**
     * Extract class information from a class declaration
     */
    private extractClass;
    /**
     * Extract interface information from an interface declaration
     */
    private extractInterface;
    /**
     * Extract interface property information from a property signature
     */
    private extractInterfaceProperty;
    /**
     * Extract type alias information from a type alias declaration
     */
    private extractTypeAlias;
    /**
     * Extract function information from a function declaration
     */
    private extractFunction;
    /**
     * Extract method information from a method declaration
     */
    private extractMethod;
    /**
     * Extract property information from a property declaration
     */
    private extractProperty;
    /**
     * Extract variable information from a variable statement
     */
    private extractVariableStatement;
    /**
     * Extract parameters from a function or method declaration
     */
    private extractParameters;
    /**
     * Extract import information from an import declaration
     */
    private extractImport;
    /**
     * Extract export information from an export declaration
     */
    private extractExport;
    /**
     * Check if a source file has a default export
     */
    private hasDefaultExport;
    /**
     * Get the default export expression from a source file
     */
    private getDefaultExportExpression;
    /**
     * Get the line number for a position in the source file
     */
    private getLineNumber;
    /**
     * Get the JSDoc comment for a node
     */
    private getJsDocComment;
    /**
     * Get the visibility of a class member
     */
    private getVisibility;
    /**
     * Get the scope of a variable
     */
    private getVariableScope;
    /**
     * Resolve an import path relative to a file
     */
    private resolveImportPath;
    /**
     * Generate a unique node ID
     */
    private generateNodeId;
    /**
     * Check if a node has decorators
     * This is a simplified implementation that would need to be expanded
     * in a real-world scenario to properly detect decorators
     */
    private hasNodeDecorators;
    /**
     * Get the size of a file in bytes
     * Returns 0 if the file doesn't exist or can't be accessed
     */
    private getFileSize;
    /**
     * Get the column number for a position in the source file
     */
    private getColumnNumber;
    /**
     * Resolve a type expression to a node ID
     */
    private resolveTypeNodeId;
    /**
     * Extract function call information from a call expression
     */
    private extractFunctionCall;
    /**
     * Find the function or method that contains this call expression
     */
    private findCallerContext;
    /**
     * Get the node ID of the caller function or method
     */
    private getCallerNodeId;
    /**
     * Get information about the called function
     */
    private getCalleeInfo;
    /**
     * Generate a node ID for the called function
     */
    private generateCalleeNodeId;
    /**
     * Check if a node is in a conditional context (if, ternary, &&, ||, etc.)
     */
    private isInConditionalContext;
    /**
     * Extract type reference information from a type reference node
     */
    private extractTypeReference;
    /**
     * Extract variable reference information from an identifier node
     */
    private extractVariableReference;
    /**
     * Find the context node for a reference (function, method, class, etc.)
     */
    private findReferenceContext;
    /**
     * Get the node ID for a reference context
     */
    private getReferenceContextNodeId;
    /**
     * Get the node ID for a variable declaration
     */
    private getVariableNodeId;
    /**
     * Check if an identifier is part of a declaration
     */
    private isDeclarationIdentifier;
    /**
     * Determine if a variable reference is read, write, or readwrite
     */
    private getVariableReferenceType;
    /**
     * Check if a type is an array type
     */
    private isArrayType;
    /**
     * Check if a type is part of a union type
     */
    private isUnionType;
    /**
     * Check if a type is part of an intersection type
     */
    private isIntersectionType;
}
//# sourceMappingURL=ts-parser.d.ts.map