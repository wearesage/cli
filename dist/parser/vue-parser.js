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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VueParser = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const compiler_sfc_1 = require("@vue/compiler-sfc");
const compiler_dom_1 = require("@vue/compiler-dom");
const babelParser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
/**
 * Parser for Vue Single File Components
 */
class VueParser {
    /**
     * Create a new Vue parser
     */
    constructor(options) {
        this.rootDir = options.rootDir;
        this.codebaseId = options.codebaseId;
        this.tsParser = options.tsParser;
    }
    /**
     * Parse a Vue file and extract nodes and relationships
     */
    parseFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { descriptor } = (0, compiler_sfc_1.parse)(content);
        const result = {
            nodes: [],
            relationships: []
        };
        // Create a File node for the Vue file (for TypeScript parser compatibility)
        const fileNode = this.createFileNode(filePath, content);
        result.nodes.push(fileNode);
        // Create a node for the Vue component
        const componentNode = this.createComponentNode(filePath, descriptor);
        result.nodes.push(componentNode);
        // Create a relationship between the File node and the VueComponent node
        result.relationships.push({
            nodeId: this.generateNodeId('DEFINES_VUE_COMPONENT', `${fileNode.nodeId}->${componentNode.nodeId}`),
            codebaseId: this.codebaseId,
            type: 'DEFINES_VUE_COMPONENT',
            startNodeId: fileNode.nodeId,
            endNodeId: componentNode.nodeId,
            isCrossCodebase: false
        });
        // Parse template
        if (descriptor.template) {
            const templateNode = this.parseTemplate(filePath, descriptor.template, componentNode);
            result.nodes.push(templateNode);
            // Extract component references from template
            const componentRefs = this.extractComponentReferences(descriptor.template.content, componentNode);
            result.nodes.push(...componentRefs.nodes);
            result.relationships.push(...componentRefs.relationships);
        }
        // Parse script
        if (descriptor.script || descriptor.scriptSetup) {
            const scriptResult = this.parseScript(filePath, descriptor, componentNode);
            result.nodes.push(...scriptResult.nodes);
            result.relationships.push(...scriptResult.relationships);
        }
        // Parse styles
        if (descriptor.styles.length > 0) {
            const styleNodes = this.parseStyles(filePath, descriptor.styles, componentNode);
            result.nodes.push(...styleNodes);
        }
        return result;
    }
    /**
     * Create a node for the Vue component
     */
    createComponentNode(filePath, descriptor) {
        const relativePath = path.relative(this.rootDir, filePath);
        const name = path.basename(filePath, '.vue');
        return {
            nodeId: this.generateNodeId('VueComponent', relativePath),
            codebaseId: this.codebaseId,
            labels: ['VueComponent'],
            path: relativePath,
            absolutePath: filePath,
            name,
            hasTemplate: !!descriptor.template,
            hasScript: !!descriptor.script,
            hasScriptSetup: !!descriptor.scriptSetup,
            hasStyle: descriptor.styles.length > 0,
            styleCount: descriptor.styles.length,
            isAsync: false, // Will need to be updated based on script analysis
            isExported: true, // Vue components are always exported
            isDefaultExport: true // Vue components are always default exports
        };
    }
    /**
     * Create a node for the Vue file
     */
    createFileNode(filePath, content) {
        const relativePath = path.relative(this.rootDir, filePath);
        return {
            nodeId: this.generateNodeId('File', filePath),
            codebaseId: this.codebaseId,
            labels: ['File'],
            path: relativePath,
            absolutePath: filePath,
            name: path.basename(filePath),
            extension: 'vue',
            language: 'vue',
            lineCount: content.split('\n').length,
            size: content.length,
            hasDefaultExport: true,
            defaultExportExpression: 'VueComponent',
            hasNamedExports: false,
            namedExports: [],
            hasCommonJSExport: false,
            importCount: 0,
            exportCount: 1
        };
    }
    /**
     * Parse the template section of a Vue component
     */
    parseTemplate(filePath, template, componentNode) {
        const relativePath = path.relative(this.rootDir, filePath);
        return {
            nodeId: this.generateNodeId('ComponentTemplate', `${relativePath}:template`),
            codebaseId: this.codebaseId,
            labels: ['ComponentTemplate'],
            content: template.content,
            lang: template.lang || 'html',
            componentId: componentNode.nodeId,
            hasSlots: template.content.includes('<slot'),
            slotCount: (template.content.match(/<slot/g) || []).length
        };
    }
    /**
     * Extract component references from template
     */
    extractComponentReferences(templateContent, componentNode) {
        const result = {
            nodes: [],
            relationships: []
        };
        try {
            // Parse the template using @vue/compiler-dom
            const ast = (0, compiler_dom_1.parse)(templateContent, {
                // Options for the parser
                isNativeTag: tag => /^[a-z]/.test(tag), // Native HTML tags start with lowercase
                isCustomElement: tag => false,
                getNamespace: () => 0, // Default namespace
            });
            // Process the AST to find component references
            this.processTemplateNode(ast.children, componentNode, result);
        }
        catch (error) {
            console.error(`Error parsing template for component ${componentNode.name}:`, error);
        }
        return result;
    }
    /**
     * Process a template AST node to extract component references
     */
    processTemplateNode(nodes, componentNode, result) {
        if (!nodes || !Array.isArray(nodes))
            return;
        for (const node of nodes) {
            // Only process element nodes
            if (node.type === compiler_dom_1.NodeTypes.ELEMENT) {
                const elementNode = node;
                const tagName = elementNode.tag;
                // Check if this is a component (starts with uppercase)
                if (/^[A-Z]/.test(tagName)) {
                    // Create a RENDERS relationship
                    const rendersRelationship = {
                        nodeId: this.generateNodeId('RENDERS', `${componentNode.nodeId}->${tagName}`),
                        codebaseId: this.codebaseId,
                        type: 'RENDERS',
                        startNodeId: componentNode.nodeId,
                        endNodeId: tagName, // This is a placeholder, would need to be resolved to actual component ID
                        isConditional: this.hasConditionalDirective(elementNode),
                        renderCount: 1,
                        renderLocationLines: [],
                        renderLocationColumns: []
                    };
                    result.relationships.push(rendersRelationship);
                    // Extract props
                    const propsResult = this.extractProps(this.nodeToString(elementNode), componentNode.nodeId, tagName);
                    result.relationships.push(...propsResult.relationships);
                    // Extract event listeners
                    const eventsResult = this.extractEventListeners(this.nodeToString(elementNode), componentNode.nodeId, tagName);
                    result.relationships.push(...eventsResult.relationships);
                    // Extract slots
                    const slotsResult = this.extractSlots(this.nodeToString(elementNode), componentNode.nodeId, tagName);
                    result.relationships.push(...slotsResult.relationships);
                }
                // Process slot elements
                if (tagName === 'slot') {
                    // Handle slot elements
                    this.processSlotElement(elementNode, componentNode, result);
                }
                // Recursively process children
                if (elementNode.children && elementNode.children.length > 0) {
                    this.processTemplateNode(elementNode.children, componentNode, result);
                }
            }
        }
    }
    /**
     * Check if an element has a conditional directive (v-if, v-else-if, v-else)
     */
    hasConditionalDirective(node) {
        return node.props.some(prop => prop.type === compiler_dom_1.NodeTypes.DIRECTIVE &&
            (prop.name === 'if' || prop.name === 'else-if' || prop.name === 'else'));
    }
    /**
     * Check if an element has a loop directive (v-for)
     */
    hasLoopDirective(node) {
        return node.props.some(prop => prop.type === compiler_dom_1.NodeTypes.DIRECTIVE && prop.name === 'for');
    }
    /**
     * Extract key attribute from an element node
     */
    extractKeyFromNode(node) {
        const keyProp = node.props.find(prop => (prop.type === compiler_dom_1.NodeTypes.DIRECTIVE && prop.name === 'bind' &&
            prop.arg && prop.arg.type === compiler_dom_1.NodeTypes.SIMPLE_EXPRESSION && prop.arg.content === 'key') ||
            (prop.type === compiler_dom_1.NodeTypes.ATTRIBUTE && prop.name === 'key'));
        if (keyProp) {
            if (keyProp.type === compiler_dom_1.NodeTypes.DIRECTIVE && keyProp.exp &&
                keyProp.exp.type === compiler_dom_1.NodeTypes.SIMPLE_EXPRESSION) {
                return keyProp.exp.content;
            }
            else if (keyProp.type === compiler_dom_1.NodeTypes.ATTRIBUTE && keyProp.value) {
                return keyProp.value.content;
            }
        }
        return undefined;
    }
    /**
     * Process a slot element
     */
    processSlotElement(node, componentNode, result) {
        // Extract slot name
        const nameProp = node.props.find(prop => (prop.type === compiler_dom_1.NodeTypes.DIRECTIVE && prop.name === 'bind' &&
            prop.arg && prop.arg.type === compiler_dom_1.NodeTypes.SIMPLE_EXPRESSION && prop.arg.content === 'name') ||
            (prop.type === compiler_dom_1.NodeTypes.ATTRIBUTE && prop.name === 'name'));
        let slotName = 'default';
        if (nameProp) {
            if (nameProp.type === compiler_dom_1.NodeTypes.DIRECTIVE && nameProp.exp &&
                nameProp.exp.type === compiler_dom_1.NodeTypes.SIMPLE_EXPRESSION) {
                slotName = nameProp.exp.content;
            }
            else if (nameProp.type === compiler_dom_1.NodeTypes.ATTRIBUTE && nameProp.value) {
                slotName = nameProp.value.content;
            }
        }
        // TODO: Create slot-related nodes and relationships
    }
    /**
     * Convert a node to its string representation for legacy parsing methods
     */
    nodeToString(node) {
        // This is a simplified implementation
        let result = `<${node.tag}`;
        // Add attributes
        for (const prop of node.props) {
            if (prop.type === compiler_dom_1.NodeTypes.ATTRIBUTE) {
                result += ` ${prop.name}="${prop.value?.content || ''}"`;
            }
            else if (prop.type === compiler_dom_1.NodeTypes.DIRECTIVE) {
                const dirName = prop.name === 'bind' ? ':' :
                    prop.name === 'on' ? '@' :
                        `v-${prop.name}`;
                const argStr = prop.arg && prop.arg.type === compiler_dom_1.NodeTypes.SIMPLE_EXPRESSION ?
                    prop.arg.content : '';
                const valueStr = prop.exp && prop.exp.type === compiler_dom_1.NodeTypes.SIMPLE_EXPRESSION ?
                    prop.exp.content : '';
                if (argStr) {
                    result += ` ${dirName}${argStr}="${valueStr}"`;
                }
                else {
                    result += ` ${dirName}="${valueStr}"`;
                }
            }
        }
        result += '>';
        return result;
    }
    /**
     * Extract key attribute from component tag
     */
    extractKeyAttribute(tagContent) {
        const keyMatch = tagContent.match(/:key="([^"]+)"/);
        return keyMatch ? keyMatch[1] : undefined;
    }
    /**
     * Extract props from component tag
     */
    extractProps(tagContent, fromNodeId, toComponentName) {
        const result = {
            nodes: [],
            relationships: []
        };
        // Extract prop bindings (v-bind:prop or :prop)
        const propRegex = /(?:v-bind:|:)([a-zA-Z0-9-]+)="([^"]+)"/g;
        let propMatch;
        const props = [];
        const bindings = {};
        while ((propMatch = propRegex.exec(tagContent)) !== null) {
            const propName = propMatch[1];
            const propValue = propMatch[2];
            props.push(propName);
            bindings[propName] = propValue;
        }
        // Extract static props (prop="value")
        const staticPropRegex = /\s([a-zA-Z0-9-]+)="([^"]+)"/g;
        let staticPropMatch;
        while ((staticPropMatch = staticPropRegex.exec(tagContent)) !== null) {
            const propName = staticPropMatch[1];
            const propValue = staticPropMatch[2];
            // Skip non-prop attributes like v-if, v-for, etc.
            if (!propName.startsWith('v-') && !propName.startsWith('@') && propName !== 'key') {
                props.push(propName);
                bindings[propName] = JSON.stringify(propValue); // Static values are strings
            }
        }
        if (props.length > 0) {
            const providesPropsRelationship = {
                nodeId: this.generateNodeId('PROVIDES_PROPS', `${fromNodeId}->${toComponentName}`),
                codebaseId: this.codebaseId,
                type: 'PROVIDES_PROPS',
                startNodeId: fromNodeId,
                endNodeId: toComponentName, // This is a placeholder, would need to be resolved to actual component ID
                props,
                bindings
            };
            result.relationships.push(providesPropsRelationship);
        }
        return result;
    }
    /**
     * Extract event listeners from component tag
     */
    extractEventListeners(tagContent, fromNodeId, toComponentName) {
        const result = {
            nodes: [],
            relationships: []
        };
        // Extract event listeners (v-on:event or @event)
        const eventRegex = /(?:v-on:|@)([a-zA-Z0-9-]+)="([^"]+)"/g;
        let eventMatch;
        const events = [];
        const handlers = {};
        while ((eventMatch = eventRegex.exec(tagContent)) !== null) {
            const eventName = eventMatch[1];
            const handlerValue = eventMatch[2];
            events.push(eventName);
            handlers[eventName] = handlerValue;
        }
        if (events.length > 0) {
            const listensToRelationship = {
                nodeId: this.generateNodeId('LISTENS_TO', `${fromNodeId}->${toComponentName}`),
                codebaseId: this.codebaseId,
                type: 'LISTENS_TO',
                startNodeId: fromNodeId,
                endNodeId: toComponentName, // This is a placeholder, would need to be resolved to actual component ID
                events,
                handlers
            };
            result.relationships.push(listensToRelationship);
        }
        return result;
    }
    /**
     * Extract slots from component tag
     */
    extractSlots(tagContent, fromNodeId, toComponentName) {
        const result = {
            nodes: [],
            relationships: []
        };
        // This is a simplified implementation
        // In a real implementation, we would need to parse the HTML to find slot tags
        return result;
    }
    /**
     * Parse the script section of a Vue component
     */
    parseScript(filePath, descriptor, componentNode) {
        const result = {
            nodes: [],
            relationships: []
        };
        const relativePath = path.relative(this.rootDir, filePath);
        const script = descriptor.script || descriptor.scriptSetup;
        const isSetup = !!descriptor.scriptSetup;
        if (!script) {
            return result;
        }
        // Create a node for the script section
        const scriptNode = {
            nodeId: this.generateNodeId('ComponentScript', `${relativePath}:script`),
            codebaseId: this.codebaseId,
            labels: ['ComponentScript'],
            lang: script.lang || 'js',
            componentId: componentNode.nodeId,
            isSetup,
            hasDefineProps: script.content.includes('defineProps'),
            hasDefineEmits: script.content.includes('defineEmits'),
            hasDefineExpose: script.content.includes('defineExpose'),
            hasDefineOptions: script.content.includes('defineOptions')
        };
        result.nodes.push(scriptNode);
        try {
            // Parse script content using @babel/parser
            const ast = babelParser.parse(script.content, {
                sourceType: 'module',
                plugins: [
                    'typescript',
                    'jsx',
                    'decorators-legacy',
                    'classProperties',
                ],
            });
            // Use @babel/traverse to analyze the AST
            (0, traverse_1.default)(ast, {
                // Extract defineProps
                CallExpression: (path) => {
                    const callee = path.node.callee;
                    if (t.isIdentifier(callee)) {
                        // Handle defineProps
                        if (callee.name === 'defineProps') {
                            const propsResult = this.extractDefinePropsFromAST(path.node, componentNode);
                            result.nodes.push(...propsResult.nodes);
                        }
                        // Handle defineEmits
                        else if (callee.name === 'defineEmits') {
                            const emitsResult = this.extractDefineEmitsFromAST(path.node, componentNode);
                            result.nodes.push(...emitsResult.nodes);
                        }
                        // Handle defineExpose
                        else if (callee.name === 'defineExpose') {
                            // TODO: Extract exposed properties
                        }
                        // Handle defineOptions
                        else if (callee.name === 'defineOptions') {
                            // TODO: Extract component options
                        }
                        // Handle composables (functions starting with "use")
                        else if (callee.name.startsWith('use')) {
                            const composableResult = this.extractComposableUsage(callee.name, componentNode);
                            result.relationships.push(...composableResult.relationships);
                        }
                    }
                },
                // Extract imports
                ImportDeclaration: (path) => {
                    const importResult = this.extractImportFromAST(path.node, componentNode);
                    result.relationships.push(...importResult.relationships);
                },
                // Extract reactive state
                VariableDeclarator: (path) => {
                    const init = path.node.init;
                    if (init && t.isCallExpression(init)) {
                        const callee = init.callee;
                        if (t.isIdentifier(callee)) {
                            // Check for reactive state (ref, reactive, computed, etc.)
                            if (['ref', 'reactive', 'computed', 'shallowRef', 'shallowReactive', 'readonly'].includes(callee.name)) {
                                const reactiveStateResult = this.extractReactiveStateFromAST(path.node, callee.name, componentNode);
                                result.nodes.push(...reactiveStateResult.nodes);
                            }
                        }
                    }
                }
            });
        }
        catch (error) {
            console.error(`Error parsing script for component ${componentNode.name}:`, error);
            // Fall back to the simpler extraction methods
            if (scriptNode.hasDefineProps) {
                const propsResult = this.extractDefineProps(script.content, componentNode);
                result.nodes.push(...propsResult.nodes);
            }
            if (scriptNode.hasDefineEmits) {
                const emitsResult = this.extractDefineEmits(script.content, componentNode);
                result.nodes.push(...emitsResult.nodes);
            }
        }
        return result;
    }
    /**
     * Extract props defined with defineProps
     */
    extractDefineProps(scriptContent, componentNode) {
        const result = {
            nodes: [],
            relationships: []
        };
        // This is a simplified implementation
        // In a real implementation, we would use TypeScript's AST to properly parse defineProps
        // Look for defineProps<{ ... }>() or defineProps({ ... })
        const propsMatch = scriptContent.match(/defineProps[<\(]([^>)]+)[>\)]/);
        if (propsMatch) {
            const propsContent = propsMatch[1];
            // Very simple prop extraction - this would need to be much more sophisticated
            const propRegex = /(\w+)(?::\s*([^,]+))?(?:,|\s*})/g;
            let propMatch;
            while ((propMatch = propRegex.exec(propsContent)) !== null) {
                const propName = propMatch[1];
                const propType = propMatch[2] || 'any';
                const propNode = {
                    nodeId: this.generateNodeId('Prop', `${componentNode.path}:${propName}`),
                    codebaseId: this.codebaseId,
                    labels: ['Prop'],
                    name: propName,
                    componentId: componentNode.nodeId,
                    type: propType.trim(),
                    isRequired: propType.includes('required'),
                    hasDefault: propsContent.includes(`default:`),
                    defaultValue: this.extractDefaultValue(propsContent, propName)
                };
                result.nodes.push(propNode);
            }
        }
        return result;
    }
    /**
     * Extract default value for a prop
     */
    extractDefaultValue(propsContent, propName) {
        // This is a very simplified implementation
        const defaultMatch = propsContent.match(new RegExp(`${propName}[^{]*default:\\s*([^,}]+)`));
        return defaultMatch ? defaultMatch[1].trim() : undefined;
    }
    /**
     * Extract defineProps from AST
     */
    extractDefinePropsFromAST(node, componentNode) {
        const result = {
            nodes: [],
            relationships: []
        };
        // Handle different forms of defineProps
        // 1. defineProps<{ prop1: string, prop2?: number }>()
        // 2. defineProps({ prop1: String, prop2: { type: Number, required: false } })
        // 3. defineProps(['prop1', 'prop2'])
        const args = node.arguments;
        if (args.length === 0)
            return result;
        const arg = args[0];
        // Handle object literal: defineProps({ ... })
        if (t.isObjectExpression(arg)) {
            for (const prop of arg.properties) {
                if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                    const propName = prop.key.name;
                    let propType = 'any';
                    let isRequired = false;
                    let hasDefault = false;
                    let defaultValue;
                    // Handle simple type: defineProps({ prop1: String })
                    if (t.isIdentifier(prop.value)) {
                        propType = prop.value.name;
                        isRequired = false;
                    }
                    // Handle complex type: defineProps({ prop1: { type: String, required: true, default: 'foo' } })
                    else if (t.isObjectExpression(prop.value)) {
                        for (const propOption of prop.value.properties) {
                            if (t.isObjectProperty(propOption) && t.isIdentifier(propOption.key)) {
                                if (propOption.key.name === 'type' && t.isIdentifier(propOption.value)) {
                                    propType = propOption.value.name;
                                }
                                else if (propOption.key.name === 'required' && t.isBooleanLiteral(propOption.value)) {
                                    isRequired = propOption.value.value;
                                }
                                else if (propOption.key.name === 'default') {
                                    hasDefault = true;
                                    if (t.isStringLiteral(propOption.value)) {
                                        defaultValue = `'${propOption.value.value}'`;
                                    }
                                    else if (t.isNumericLiteral(propOption.value)) {
                                        defaultValue = propOption.value.value.toString();
                                    }
                                    else if (t.isBooleanLiteral(propOption.value)) {
                                        defaultValue = propOption.value.value.toString();
                                    }
                                    else if (t.isNullLiteral(propOption.value)) {
                                        defaultValue = 'null';
                                    }
                                    else if (t.isArrowFunctionExpression(propOption.value) || t.isFunctionExpression(propOption.value)) {
                                        defaultValue = 'Function';
                                    }
                                }
                            }
                        }
                    }
                    const propNode = {
                        nodeId: this.generateNodeId('Prop', `${componentNode.path}:${propName}`),
                        codebaseId: this.codebaseId,
                        labels: ['Prop'],
                        name: propName,
                        componentId: componentNode.nodeId,
                        type: propType,
                        isRequired,
                        hasDefault,
                        defaultValue
                    };
                    result.nodes.push(propNode);
                }
            }
        }
        // Handle array literal: defineProps(['prop1', 'prop2'])
        else if (t.isArrayExpression(arg)) {
            for (const element of arg.elements) {
                if (t.isStringLiteral(element)) {
                    const propName = element.value;
                    const propNode = {
                        nodeId: this.generateNodeId('Prop', `${componentNode.path}:${propName}`),
                        codebaseId: this.codebaseId,
                        labels: ['Prop'],
                        name: propName,
                        componentId: componentNode.nodeId,
                        type: 'any',
                        isRequired: false,
                        hasDefault: false
                    };
                    result.nodes.push(propNode);
                }
            }
        }
        // Handle TypeScript type: defineProps<{ prop1: string, prop2?: number }>()
        // This is more complex and would require parsing the TypeScript type
        // For now, we'll just extract what we can from the script content
        else {
            // Fall back to the simpler extraction method
            const scriptContent = this.getNodeSource(node);
            if (scriptContent) {
                const simpleResult = this.extractDefineProps(scriptContent, componentNode);
                result.nodes.push(...simpleResult.nodes);
            }
        }
        return result;
    }
    /**
     * Extract defineEmits from AST
     */
    extractDefineEmitsFromAST(node, componentNode) {
        const result = {
            nodes: [],
            relationships: []
        };
        // Handle different forms of defineEmits
        // 1. defineEmits<{ update: [id: number], delete: [] }>()
        // 2. defineEmits(['update', 'delete'])
        const args = node.arguments;
        if (args.length === 0)
            return result;
        const arg = args[0];
        // Handle array literal: defineEmits(['update', 'delete'])
        if (t.isArrayExpression(arg)) {
            for (const element of arg.elements) {
                if (t.isStringLiteral(element)) {
                    const emitName = element.value;
                    const emitNode = {
                        nodeId: this.generateNodeId('Emit', `${componentNode.path}:${emitName}`),
                        codebaseId: this.codebaseId,
                        labels: ['Emit'],
                        name: emitName,
                        componentId: componentNode.nodeId
                    };
                    result.nodes.push(emitNode);
                }
            }
        }
        // Handle TypeScript type: defineEmits<{ update: [id: number], delete: [] }>()
        // This is more complex and would require parsing the TypeScript type
        // For now, we'll just extract what we can from the script content
        else {
            // Fall back to the simpler extraction method
            const scriptContent = this.getNodeSource(node);
            if (scriptContent) {
                const simpleResult = this.extractDefineEmits(scriptContent, componentNode);
                result.nodes.push(...simpleResult.nodes);
            }
        }
        return result;
    }
    /**
     * Extract composable usage from AST
     */
    extractComposableUsage(composableName, componentNode) {
        const result = {
            nodes: [],
            relationships: []
        };
        // Create a USES_COMPOSABLE relationship
        // This is a placeholder - in a real implementation, we would need to resolve the composable
        const usesComposableRelationship = {
            nodeId: this.generateNodeId('USES_COMPOSABLE', `${componentNode.nodeId}->${composableName}`),
            codebaseId: this.codebaseId,
            type: 'USES_COMPOSABLE',
            startNodeId: componentNode.nodeId,
            endNodeId: composableName, // This is a placeholder
            isCrossCodebase: false
        };
        result.relationships.push(usesComposableRelationship);
        return result;
    }
    /**
     * Extract import from AST
     */
    extractImportFromAST(node, componentNode) {
        const result = {
            nodes: [],
            relationships: []
        };
        // Extract import source
        const source = node.source.value;
        // Extract imported specifiers
        const importedSpecifiers = [];
        let hasDefaultImport = false;
        let hasNamespaceImport = false;
        for (const specifier of node.specifiers) {
            if (t.isImportDefaultSpecifier(specifier)) {
                hasDefaultImport = true;
                importedSpecifiers.push(specifier.local.name);
            }
            else if (t.isImportNamespaceSpecifier(specifier)) {
                hasNamespaceImport = true;
                importedSpecifiers.push(specifier.local.name);
            }
            else if (t.isImportSpecifier(specifier)) {
                importedSpecifiers.push(specifier.local.name);
            }
        }
        // Create an IMPORTS relationship
        // This is a placeholder - in a real implementation, we would need to resolve the import
        const importsRelationship = {
            nodeId: this.generateNodeId('IMPORTS', `${componentNode.nodeId}->${source}`),
            codebaseId: this.codebaseId,
            type: 'IMPORTS',
            startNodeId: componentNode.nodeId,
            endNodeId: source, // This is a placeholder
            isCrossCodebase: false
        };
        result.relationships.push(importsRelationship);
        return result;
    }
    /**
     * Extract reactive state from AST
     */
    extractReactiveStateFromAST(node, reactivityType, componentNode) {
        const result = {
            nodes: [],
            relationships: []
        };
        if (t.isIdentifier(node.id)) {
            const stateName = node.id.name;
            // Create a ReactiveState node
            const reactiveStateNode = {
                nodeId: this.generateNodeId('ReactiveState', `${componentNode.path}:${stateName}`),
                codebaseId: this.codebaseId,
                labels: ['ReactiveState'],
                name: stateName,
                componentId: componentNode.nodeId,
                type: 'unknown', // Would need type inference
                reactivityType: reactivityType,
                initialValue: this.getInitialValue(node.init)
            };
            result.nodes.push(reactiveStateNode);
        }
        return result;
    }
    /**
     * Get the initial value of a reactive state
     */
    getInitialValue(init) {
        if (!init)
            return undefined;
        if (t.isCallExpression(init) && init.arguments.length > 0) {
            const arg = init.arguments[0];
            if (t.isStringLiteral(arg)) {
                return `'${arg.value}'`;
            }
            else if (t.isNumericLiteral(arg)) {
                return arg.value.toString();
            }
            else if (t.isBooleanLiteral(arg)) {
                return arg.value.toString();
            }
            else if (t.isNullLiteral(arg)) {
                return 'null';
            }
            else if (t.isObjectExpression(arg)) {
                return '{}'; // Simplified
            }
            else if (t.isArrayExpression(arg)) {
                return '[]'; // Simplified
            }
        }
        return undefined;
    }
    /**
     * Get the source code of a node
     */
    getNodeSource(node) {
        // This is a placeholder - in a real implementation, we would need to get the source code
        // from the original script content using the node's location information
        return undefined;
    }
    /**
     * Extract emits defined with defineEmits
     */
    extractDefineEmits(scriptContent, componentNode) {
        const result = {
            nodes: [],
            relationships: []
        };
        // This is a simplified implementation
        // In a real implementation, we would use TypeScript's AST to properly parse defineEmits
        // Look for defineEmits<{ ... }>() or defineEmits(['...', '...'])
        const emitsMatch = scriptContent.match(/defineEmits[<\(]([^>)]+)[>\)]/);
        if (emitsMatch) {
            const emitsContent = emitsMatch[1];
            if (emitsContent.startsWith('[')) {
                // Array syntax: defineEmits(['update', 'delete'])
                const emitNames = emitsContent.match(/'([^']+)'/g) || [];
                emitNames.forEach(emitName => {
                    const name = emitName.replace(/'/g, '');
                    const emitNode = {
                        nodeId: this.generateNodeId('Emit', `${componentNode.path}:${name}`),
                        codebaseId: this.codebaseId,
                        labels: ['Emit'],
                        name,
                        componentId: componentNode.nodeId
                    };
                    result.nodes.push(emitNode);
                });
            }
            else {
                // Type syntax: defineEmits<{ update: [id: number], delete: [] }>
                const emitRegex = /(\w+)(?::\s*\[([^\]]*)\])?/g;
                let emitMatch;
                while ((emitMatch = emitRegex.exec(emitsContent)) !== null) {
                    const emitName = emitMatch[1];
                    const payloadType = emitMatch[2] || '';
                    const emitNode = {
                        nodeId: this.generateNodeId('Emit', `${componentNode.path}:${emitName}`),
                        codebaseId: this.codebaseId,
                        labels: ['Emit'],
                        name: emitName,
                        componentId: componentNode.nodeId,
                        payloadType: payloadType.trim()
                    };
                    result.nodes.push(emitNode);
                }
            }
        }
        return result;
    }
    /**
     * Parse the style sections of a Vue component
     */
    parseStyles(filePath, styles, componentNode) {
        const relativePath = path.relative(this.rootDir, filePath);
        return styles.map((style, index) => {
            return {
                nodeId: this.generateNodeId('ComponentStyle', `${relativePath}:style:${index}`),
                codebaseId: this.codebaseId,
                labels: ['ComponentStyle'],
                lang: style.lang || 'css',
                componentId: componentNode.nodeId,
                isScoped: style.scoped || false,
                isModule: style.module || false
            };
        });
    }
    /**
     * Generate a unique ID for a node
     */
    generateNodeId(type, identifier) {
        // Include codebaseId as prefix
        return `${this.codebaseId}:${type}:${identifier}`;
    }
}
exports.VueParser = VueParser;
//# sourceMappingURL=vue-parser.js.map