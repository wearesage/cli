import * as fs from 'fs';
import * as path from 'path';
import { parse as parseVue, SFCBlock, SFCDescriptor } from '@vue/compiler-sfc';
import { parse as parseTemplate, ElementNode, NodeTypes } from '@vue/compiler-dom';
import * as babelParser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as sass from 'sass';
import * as postcss from 'postcss';
import * as postcssScss from 'postcss-scss';
import { TSParser } from './ts-parser';
import {
  Node, Relationship, File,
  VueComponent, ComponentTemplate, ComponentScript, ComponentStyle,
  Prop, Emit, Renders, ComponentRenders, ProvidesProps, ListensTo, UsesSlot
} from '../schema/index';

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
export class VueParser {
  private rootDir: string;
  private codebaseId: string;
  private tsParser: TSParser;
  
  /**
   * Create a new Vue parser
   */
  constructor(options: VueParserOptions) {
    this.rootDir = options.rootDir;
    this.codebaseId = options.codebaseId;
    this.tsParser = options.tsParser;
  }
  
  /**
   * Parse a Vue file and extract nodes and relationships
   */
  public parseFile(filePath: string): VueParseResult {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { descriptor } = parseVue(content);
    
    const result: VueParseResult = {
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
  private createComponentNode(filePath: string, descriptor: any): VueComponent {
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
  private createFileNode(filePath: string, content: string): File {
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
  private parseTemplate(filePath: string, template: any, componentNode: VueComponent): ComponentTemplate {
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
  private extractComponentReferences(templateContent: string, componentNode: VueComponent): VueParseResult {
    const result: VueParseResult = {
      nodes: [],
      relationships: []
    };
    
    try {
      // Parse the template using @vue/compiler-dom
      const ast = parseTemplate(templateContent, {
        // Options for the parser
        isNativeTag: tag => /^[a-z]/.test(tag), // Native HTML tags start with lowercase
        isCustomElement: tag => false,
        getNamespace: () => 0, // Default namespace
      });
      
      // Process the AST to find component references
      this.processTemplateNode(ast.children, componentNode, result);
      
    } catch (error) {
      console.error(`Error parsing template for component ${componentNode.name}:`, error);
    }
    
    return result;
  }
  
  /**
   * Process a template AST node to extract component references
   */
  private processTemplateNode(nodes: any[], componentNode: VueComponent, result: VueParseResult): void {
    if (!nodes || !Array.isArray(nodes)) return;
    
    for (const node of nodes) {
      // Only process element nodes
      if (node.type === NodeTypes.ELEMENT) {
        const elementNode = node as ElementNode;
        const tagName = elementNode.tag;
        
        // Check if this is a component (starts with uppercase)
        if (/^[A-Z]/.test(tagName)) {
          // Create a RENDERS relationship
          const rendersRelationship: Renders = {
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
  private hasConditionalDirective(node: ElementNode): boolean {
    return node.props.some(prop =>
      prop.type === NodeTypes.DIRECTIVE &&
      (prop.name === 'if' || prop.name === 'else-if' || prop.name === 'else')
    );
  }
  
  /**
   * Check if an element has a loop directive (v-for)
   */
  private hasLoopDirective(node: ElementNode): boolean {
    return node.props.some(prop =>
      prop.type === NodeTypes.DIRECTIVE && prop.name === 'for'
    );
  }
  
  /**
   * Extract key attribute from an element node
   */
  private extractKeyFromNode(node: ElementNode): string | undefined {
    const keyProp = node.props.find(prop =>
      (prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind' &&
       prop.arg && prop.arg.type === NodeTypes.SIMPLE_EXPRESSION && prop.arg.content === 'key') ||
      (prop.type === NodeTypes.ATTRIBUTE && prop.name === 'key')
    );
    
    if (keyProp) {
      if (keyProp.type === NodeTypes.DIRECTIVE && keyProp.exp &&
          keyProp.exp.type === NodeTypes.SIMPLE_EXPRESSION) {
        return keyProp.exp.content;
      } else if (keyProp.type === NodeTypes.ATTRIBUTE && keyProp.value) {
        return keyProp.value.content;
      }
    }
    
    return undefined;
  }
  
  /**
   * Process a slot element
   */
  private processSlotElement(node: ElementNode, componentNode: VueComponent, result: VueParseResult): void {
    // Extract slot name
    const nameProp = node.props.find(prop =>
      (prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind' &&
       prop.arg && prop.arg.type === NodeTypes.SIMPLE_EXPRESSION && prop.arg.content === 'name') ||
      (prop.type === NodeTypes.ATTRIBUTE && prop.name === 'name')
    );
    
    let slotName = 'default';
    if (nameProp) {
      if (nameProp.type === NodeTypes.DIRECTIVE && nameProp.exp &&
          nameProp.exp.type === NodeTypes.SIMPLE_EXPRESSION) {
        slotName = nameProp.exp.content;
      } else if (nameProp.type === NodeTypes.ATTRIBUTE && nameProp.value) {
        slotName = nameProp.value.content;
      }
    }
    
    // TODO: Create slot-related nodes and relationships
  }
  
  /**
   * Convert a node to its string representation for legacy parsing methods
   */
  private nodeToString(node: ElementNode): string {
    // This is a simplified implementation
    let result = `<${node.tag}`;
    
    // Add attributes
    for (const prop of node.props) {
      if (prop.type === NodeTypes.ATTRIBUTE) {
        result += ` ${prop.name}="${prop.value?.content || ''}"`;
      } else if (prop.type === NodeTypes.DIRECTIVE) {
        const dirName = prop.name === 'bind' ? ':' :
                       prop.name === 'on' ? '@' :
                       `v-${prop.name}`;
        
        const argStr = prop.arg && prop.arg.type === NodeTypes.SIMPLE_EXPRESSION ?
                      prop.arg.content : '';
        
        const valueStr = prop.exp && prop.exp.type === NodeTypes.SIMPLE_EXPRESSION ?
                        prop.exp.content : '';
        
        if (argStr) {
          result += ` ${dirName}${argStr}="${valueStr}"`;
        } else {
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
  private extractKeyAttribute(tagContent: string): string | undefined {
    const keyMatch = tagContent.match(/:key="([^"]+)"/);
    return keyMatch ? keyMatch[1] : undefined;
  }
  
  /**
   * Extract props from component tag
   */
  private extractProps(tagContent: string, fromNodeId: string, toComponentName: string): VueParseResult {
    const result: VueParseResult = {
      nodes: [],
      relationships: []
    };
    
    // Extract prop bindings (v-bind:prop or :prop)
    const propRegex = /(?:v-bind:|:)([a-zA-Z0-9-]+)="([^"]+)"/g;
    let propMatch;
    const props: string[] = [];
    const bindings: Record<string, string> = {};
    
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
      const providesPropsRelationship: ProvidesProps = {
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
  private extractEventListeners(tagContent: string, fromNodeId: string, toComponentName: string): VueParseResult {
    const result: VueParseResult = {
      nodes: [],
      relationships: []
    };
    
    // Extract event listeners (v-on:event or @event)
    const eventRegex = /(?:v-on:|@)([a-zA-Z0-9-]+)="([^"]+)"/g;
    let eventMatch;
    const events: string[] = [];
    const handlers: Record<string, string> = {};
    
    while ((eventMatch = eventRegex.exec(tagContent)) !== null) {
      const eventName = eventMatch[1];
      const handlerValue = eventMatch[2];
      
      events.push(eventName);
      handlers[eventName] = handlerValue;
    }
    
    if (events.length > 0) {
      const listensToRelationship: ListensTo = {
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
  private extractSlots(tagContent: string, fromNodeId: string, toComponentName: string): VueParseResult {
    const result: VueParseResult = {
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
  private parseScript(filePath: string, descriptor: SFCDescriptor, componentNode: VueComponent): VueParseResult {
    const result: VueParseResult = {
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
    const scriptNode: ComponentScript = {
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
      traverse(ast, {
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
    } catch (error) {
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
  private extractDefineProps(scriptContent: string, componentNode: VueComponent): VueParseResult {
    const result: VueParseResult = {
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
        
        const propNode: Prop = {
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
  private extractDefaultValue(propsContent: string, propName: string): string | undefined {
    // This is a very simplified implementation
    const defaultMatch = propsContent.match(new RegExp(`${propName}[^{]*default:\\s*([^,}]+)`));
    return defaultMatch ? defaultMatch[1].trim() : undefined;
  }
  
  /**
   * Extract defineProps from AST
   */
  private extractDefinePropsFromAST(node: t.CallExpression, componentNode: VueComponent): VueParseResult {
    const result: VueParseResult = {
      nodes: [],
      relationships: []
    };
    
    // Handle different forms of defineProps
    // 1. defineProps<{ prop1: string, prop2?: number }>()
    // 2. defineProps({ prop1: String, prop2: { type: Number, required: false } })
    // 3. defineProps(['prop1', 'prop2'])
    
    const args = node.arguments;
    if (args.length === 0) return result;
    
    const arg = args[0];
    
    // Handle object literal: defineProps({ ... })
    if (t.isObjectExpression(arg)) {
      for (const prop of arg.properties) {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          const propName = prop.key.name;
          let propType = 'any';
          let isRequired = false;
          let hasDefault = false;
          let defaultValue: string | undefined;
          
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
                } else if (propOption.key.name === 'required' && t.isBooleanLiteral(propOption.value)) {
                  isRequired = propOption.value.value;
                } else if (propOption.key.name === 'default') {
                  hasDefault = true;
                  if (t.isStringLiteral(propOption.value)) {
                    defaultValue = `'${propOption.value.value}'`;
                  } else if (t.isNumericLiteral(propOption.value)) {
                    defaultValue = propOption.value.value.toString();
                  } else if (t.isBooleanLiteral(propOption.value)) {
                    defaultValue = propOption.value.value.toString();
                  } else if (t.isNullLiteral(propOption.value)) {
                    defaultValue = 'null';
                  } else if (t.isArrowFunctionExpression(propOption.value) || t.isFunctionExpression(propOption.value)) {
                    defaultValue = 'Function';
                  }
                }
              }
            }
          }
          
          const propNode: Prop = {
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
          
          const propNode: Prop = {
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
  private extractDefineEmitsFromAST(node: t.CallExpression, componentNode: VueComponent): VueParseResult {
    const result: VueParseResult = {
      nodes: [],
      relationships: []
    };
    
    // Handle different forms of defineEmits
    // 1. defineEmits<{ update: [id: number], delete: [] }>()
    // 2. defineEmits(['update', 'delete'])
    
    const args = node.arguments;
    if (args.length === 0) return result;
    
    const arg = args[0];
    
    // Handle array literal: defineEmits(['update', 'delete'])
    if (t.isArrayExpression(arg)) {
      for (const element of arg.elements) {
        if (t.isStringLiteral(element)) {
          const emitName = element.value;
          
          const emitNode: Emit = {
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
  private extractComposableUsage(composableName: string, componentNode: VueComponent): VueParseResult {
    const result: VueParseResult = {
      nodes: [],
      relationships: []
    };
    
    // Create a USES_COMPOSABLE relationship
    // This is a placeholder - in a real implementation, we would need to resolve the composable
    const usesComposableRelationship: Relationship = {
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
  private extractImportFromAST(node: t.ImportDeclaration, componentNode: VueComponent): VueParseResult {
    const result: VueParseResult = {
      nodes: [],
      relationships: []
    };
    
    // Extract import source
    const source = node.source.value;
    
    // Extract imported specifiers
    const importedSpecifiers: string[] = [];
    let hasDefaultImport = false;
    let hasNamespaceImport = false;
    
    for (const specifier of node.specifiers) {
      if (t.isImportDefaultSpecifier(specifier)) {
        hasDefaultImport = true;
        importedSpecifiers.push(specifier.local.name);
      } else if (t.isImportNamespaceSpecifier(specifier)) {
        hasNamespaceImport = true;
        importedSpecifiers.push(specifier.local.name);
      } else if (t.isImportSpecifier(specifier)) {
        importedSpecifiers.push(specifier.local.name);
      }
    }
    
    // Create an IMPORTS relationship
    // This is a placeholder - in a real implementation, we would need to resolve the import
    const importsRelationship: Relationship = {
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
  private extractReactiveStateFromAST(node: t.VariableDeclarator, reactivityType: string, componentNode: VueComponent): VueParseResult {
    const result: VueParseResult = {
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
  private getInitialValue(init: t.Expression | null | undefined): string | undefined {
    if (!init) return undefined;
    
    if (t.isCallExpression(init) && init.arguments.length > 0) {
      const arg = init.arguments[0];
      
      if (t.isStringLiteral(arg)) {
        return `'${arg.value}'`;
      } else if (t.isNumericLiteral(arg)) {
        return arg.value.toString();
      } else if (t.isBooleanLiteral(arg)) {
        return arg.value.toString();
      } else if (t.isNullLiteral(arg)) {
        return 'null';
      } else if (t.isObjectExpression(arg)) {
        return '{}'; // Simplified
      } else if (t.isArrayExpression(arg)) {
        return '[]'; // Simplified
      }
    }
    
    return undefined;
  }
  
  /**
   * Get the source code of a node
   */
  private getNodeSource(node: t.Node): string | undefined {
    // This is a placeholder - in a real implementation, we would need to get the source code
    // from the original script content using the node's location information
    return undefined;
  }
  
  /**
   * Extract emits defined with defineEmits
   */
  private extractDefineEmits(scriptContent: string, componentNode: VueComponent): VueParseResult {
    const result: VueParseResult = {
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
          
          const emitNode: Emit = {
            nodeId: this.generateNodeId('Emit', `${componentNode.path}:${name}`),
            codebaseId: this.codebaseId,
            labels: ['Emit'],
            name,
            componentId: componentNode.nodeId
          };
          
          result.nodes.push(emitNode);
        });
      } else {
        // Type syntax: defineEmits<{ update: [id: number], delete: [] }>
        const emitRegex = /(\w+)(?::\s*\[([^\]]*)\])?/g;
        let emitMatch;
        
        while ((emitMatch = emitRegex.exec(emitsContent)) !== null) {
          const emitName = emitMatch[1];
          const payloadType = emitMatch[2] || '';
          
          const emitNode: Emit = {
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
  private parseStyles(filePath: string, styles: any[], componentNode: VueComponent): ComponentStyle[] {
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
  private generateNodeId(type: string, identifier: string): string {
    // Include codebaseId as prefix
    return `${this.codebaseId}:${type}:${identifier}`;
  }
}