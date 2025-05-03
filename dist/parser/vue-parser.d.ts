import { TSParser } from './ts-parser';
import { Node, Relationship } from '../schema/index';
/**
 * Configuration options for the Vue parser
 */
export interface VueParserOptions {
    /**
     * Root directory of the codebase
     */
    rootDir: string;
    /**
     * Unique identifier for the codebase
     */
    codebaseId: string;
    /**
     * TypeScript parser instance for parsing script blocks
     */
    tsParser: TSParser;
}
/**
 * Result of parsing a Vue file
 */
export interface VueParseResult {
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
 * Parser for Vue Single File Components
 */
export declare class VueParser {
    private rootDir;
    private codebaseId;
    private tsParser;
    /**
     * Create a new Vue parser
     */
    constructor(options: VueParserOptions);
    /**
     * Parse a Vue file and extract nodes and relationships
     */
    parseFile(filePath: string): VueParseResult;
    /**
     * Create a node for the Vue component
     */
    private createComponentNode;
    /**
     * Create a node for the Vue file
     */
    private createFileNode;
    /**
     * Parse the template section of a Vue component
     */
    private parseTemplate;
    /**
     * Extract component references from template
     */
    private extractComponentReferences;
    /**
     * Process a template AST node to extract component references
     */
    private processTemplateNode;
    /**
     * Check if an element has a conditional directive (v-if, v-else-if, v-else)
     */
    private hasConditionalDirective;
    /**
     * Check if an element has a loop directive (v-for)
     */
    private hasLoopDirective;
    /**
     * Extract key attribute from an element node
     */
    private extractKeyFromNode;
    /**
     * Process a slot element
     */
    private processSlotElement;
    /**
     * Convert a node to its string representation for legacy parsing methods
     */
    private nodeToString;
    /**
     * Extract key attribute from component tag
     */
    private extractKeyAttribute;
    /**
     * Extract props from component tag
     */
    private extractProps;
    /**
     * Extract event listeners from component tag
     */
    private extractEventListeners;
    /**
     * Extract slots from component tag
     */
    private extractSlots;
    /**
     * Parse the script section of a Vue component
     */
    private parseScript;
    /**
     * Extract props defined with defineProps
     */
    private extractDefineProps;
    /**
     * Extract default value for a prop
     */
    private extractDefaultValue;
    /**
     * Extract defineProps from AST
     */
    private extractDefinePropsFromAST;
    /**
     * Extract defineEmits from AST
     */
    private extractDefineEmitsFromAST;
    /**
     * Extract composable usage from AST
     */
    private extractComposableUsage;
    /**
     * Extract import from AST
     */
    private extractImportFromAST;
    /**
     * Extract reactive state from AST
     */
    private extractReactiveStateFromAST;
    /**
     * Get the initial value of a reactive state
     */
    private getInitialValue;
    /**
     * Get the source code of a node
     */
    private getNodeSource;
    /**
     * Extract emits defined with defineEmits
     */
    private extractDefineEmits;
    /**
     * Parse the style sections of a Vue component
     */
    private parseStyles;
    /**
     * Generate a unique ID for a node
     */
    private generateNodeId;
}
//# sourceMappingURL=vue-parser.d.ts.map