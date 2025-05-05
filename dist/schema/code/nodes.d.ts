import { Node, CodeElement, NamedType, Callable, Decorator } from "../common/types";
/**
 * Represents an entire codebase
 */
export interface Codebase extends Node {
    name: string;
    createdAt: string;
    description?: string;
    version?: string;
    rootPath?: string;
    repositoryUrl?: string;
    language: "typescript" | "javascript" | "mixed";
}
/**
 * Represents a package (npm package, etc.)
 */
export interface Package extends Node {
    name: string;
    path: string;
    absolutePath: string;
    version?: string;
    description?: string;
    author?: string;
    license?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    isLocal?: boolean;
}
/**
 * Represents a directory in the codebase
 */
export interface Directory extends Node {
    path: string;
    absolutePath: string;
    name: string;
    parentPath?: string;
    isRoot?: boolean;
}
/**
 * Represents a file in the codebase
 */
export interface File extends Node {
    path: string;
    absolutePath: string;
    name: string;
    extension: string;
    language: string;
    lineCount: number;
    size: number;
    hash?: string;
    hasDefaultExport: boolean;
    defaultExportExpression?: string;
    hasNamedExports: boolean;
    namedExports?: string[];
    hasCommonJSExport: boolean;
    commonJSExportExpression?: string;
    importCount?: number;
    exportCount?: number;
    isTest?: boolean;
    isTypeDefinition?: boolean;
    isModule?: boolean;
    isEntry?: boolean;
    parentDirectory?: string;
}
/**
 * Represents a module in the codebase
 */
export interface Module extends Node {
    name: string;
    path: string;
    isInternal: boolean;
    isThirdParty: boolean;
    sourceFile?: string;
}
/**
 * Represents a namespace declaration
 */
export interface Namespace extends NamedType {
    isGlobal: boolean;
    isAmbient: boolean;
}
/**
 * Represents a class declaration
 */
export interface Class extends NamedType {
    isAbstract: boolean;
    isGeneric: boolean;
    hasConstructor: boolean;
    constructorParams?: string;
    methodCount?: number;
    propertyCount?: number;
    staticMethodCount?: number;
    staticPropertyCount?: number;
    privateMethodCount?: number;
    privatePropertyCount?: number;
    protectedMethodCount?: number;
    protectedPropertyCount?: number;
    publicMethodCount?: number;
    publicPropertyCount?: number;
    implementsCount?: number;
    extendsClass?: string;
    implementsInterfaces?: string[];
    isExported: boolean;
    isDefaultExport: boolean;
    hasDecorators: boolean;
}
/**
 * Represents an interface declaration
 */
export interface Interface extends NamedType {
    isGeneric: boolean;
    methodCount?: number;
    propertyCount?: number;
    extendsCount?: number;
    extendsInterfaces?: string[];
    isExported: boolean;
    isDefaultExport: boolean;
}
/**
 * Represents an enum declaration
 */
export interface Enum extends NamedType {
    isConst: boolean;
    members: EnumMember[];
    isExported: boolean;
    isDefaultExport: boolean;
}
/**
 * Represents an enum member
 */
export interface EnumMember extends CodeElement {
    value?: string | number;
    isComputed: boolean;
}
/**
 * Represents a type alias declaration
 */
export interface TypeAlias extends NamedType {
    definition: string;
    isGeneric: boolean;
    isUnion: boolean;
    isIntersection: boolean;
    isExported: boolean;
    isDefaultExport: boolean;
    referencedTypes?: string[];
}
/**
 * Represents a function declaration or expression
 */
export interface Function extends Callable {
    parameterCount: number;
    isExported: boolean;
    isDefaultExport: boolean;
    isGenerator: boolean;
    isArrowFunction: boolean;
    isFunctionExpression: boolean;
    hasRestParameter: boolean;
    hasOptionalParameters: boolean;
    hasTypeParameters: boolean;
    callExpressions?: string[];
    referencedVariables?: string[];
    referencedFunctions?: string[];
    referencedTypes?: string[];
}
/**
 * Represents a method in a class or interface
 */
export interface Method extends Callable {
    isStatic: boolean;
    visibility: "public" | "protected" | "private";
    isAbstract: boolean;
    isGenerator: boolean;
    isGetter: boolean;
    isSetter: boolean;
    parameterCount: number;
    hasRestParameter: boolean;
    hasOptionalParameters: boolean;
    hasTypeParameters: boolean;
    callExpressions?: string[];
    referencedVariables?: string[];
    referencedFunctions?: string[];
    referencedTypes?: string[];
    overrides?: boolean;
    overridesMethod?: string;
}
/**
 * Represents a constructor in a class
 */
export interface Constructor extends Callable {
    visibility: "public" | "protected" | "private";
    parameterCount: number;
    hasRestParameter: boolean;
    hasOptionalParameters: boolean;
    hasParameterProperties: boolean;
    callExpressions?: string[];
    referencedVariables?: string[];
    referencedFunctions?: string[];
    referencedTypes?: string[];
}
/**
 * Represents a property in a class or interface
 */
export interface Property extends CodeElement {
    isStatic: boolean;
    visibility: "public" | "protected" | "private";
    isReadonly: boolean;
    isOptional: boolean;
    typeString?: string;
    initializer?: string;
    isParameterProperty: boolean;
    hasDecorators: boolean;
    decorators?: Decorator[];
}
/**
 * Represents a variable declaration
 */
export interface Variable extends CodeElement {
    isConstant: boolean;
    scope: "global" | "module" | "function" | "block";
    typeString?: string;
    initializer?: string;
    isExported?: boolean;
    isDefaultExport?: boolean;
    isDestructured?: boolean;
    isArray?: boolean;
    isObject?: boolean;
    referencedVariables?: string[];
    referencedFunctions?: string[];
    referencedTypes?: string[];
}
/**
 * Represents a function or method parameter
 */
export interface Parameter extends CodeElement {
    index: number;
    isOptional: boolean;
    isRest: boolean;
    typeString?: string;
    initializer?: string;
    isParameterProperty: boolean;
    hasDecorators: boolean;
    decorators?: Decorator[];
}
/**
 * Represents a JSX/TSX element (React component)
 */
export interface JsxElement extends CodeElement {
    tagName: string;
    isComponent: boolean;
    isSelfClosing: boolean;
    hasChildren: boolean;
    attributes?: JsxAttribute[];
    parentElement?: string;
    childElements?: string[];
}
/**
 * Represents a JSX/TSX attribute
 */
export interface JsxAttribute extends CodeElement {
    value?: string;
    isSpread: boolean;
    isExpression: boolean;
}
/**
 * Represents a test (unit test, integration test, etc.)
 */
export interface Test extends CodeElement {
    type: "unit" | "integration" | "e2e" | "other";
    framework?: "jest" | "mocha" | "jasmine" | "other";
    testTarget?: string;
    assertions?: number;
    isAsync: boolean;
}
/**
 * Represents a component (React, Vue, etc.)
 */
export interface Component extends NamedType {
    framework: "react" | "vue" | "angular" | "svelte" | "other";
    isFunction: boolean;
    isClass: boolean;
    hasProps: boolean;
    hasState: boolean;
    propsInterface?: string;
    stateInterface?: string;
    isExported: boolean;
    isDefaultExport: boolean;
    hasJsx: boolean;
    hasHooks: boolean;
    hooks?: string[];
}
/**
 * Represents a dependency (npm package, etc.)
 */
export interface Dependency extends Node {
    name: string;
    version: string;
    isDevDependency: boolean;
    isPeerDependency: boolean;
    isOptionalDependency: boolean;
    isDirectDependency: boolean;
    isTransitiveDependency: boolean;
    importCount?: number;
}
/**
 * Represents a type definition
 */
export interface TypeDefinition extends NamedType {
    source: "local" | "dependency" | "standard";
    packageName?: string;
    isExported: boolean;
    isDefaultExport: boolean;
}
/**
 * Represents direct AST node information
 */
export interface ASTNodeInfo extends Node {
    nodeType: string;
    nodeKind: number;
    startPos: number;
    endPos: number;
    parentNode?: string;
    childNodes?: string[];
    flags?: number;
}
/**
 * Property of an Interface or Type
 */
export interface InterfaceProperty extends Node {
    type: "InterfaceProperty";
    name: string;
    typeString: string;
    description?: string;
    isOptional: boolean;
    defaultValue?: string;
}
/**
 * Represents a Vue Single File Component
 */
export interface VueComponent extends Node {
    path: string;
    absolutePath: string;
    name: string;
    hasTemplate: boolean;
    hasScript: boolean;
    hasScriptSetup: boolean;
    hasStyle: boolean;
    styleCount: number;
    isAsync: boolean;
    isExported: boolean;
    isDefaultExport: boolean;
}
/**
 * Represents the template section of a Vue component
 */
export interface ComponentTemplate extends Node {
    content: string;
    lang: string;
    componentId: string;
    hasSlots: boolean;
    slotCount: number;
}
/**
 * Represents the script section of a Vue component
 */
export interface ComponentScript extends Node {
    lang: string;
    componentId: string;
    isSetup: boolean;
    hasDefineProps: boolean;
    hasDefineEmits: boolean;
    hasDefineExpose: boolean;
    hasDefineOptions: boolean;
}
/**
 * Represents the style section of a Vue component
 */
export interface ComponentStyle extends Node {
    lang: string;
    componentId: string;
    isScoped: boolean;
    isModule: boolean;
}
/**
 * Represents a prop definition in a Vue component
 */
export interface Prop extends Node {
    name: string;
    componentId: string;
    type: string;
    isRequired: boolean;
    hasDefault: boolean;
    defaultValue?: string;
}
/**
 * Represents an emit definition in a Vue component
 */
export interface Emit extends Node {
    name: string;
    componentId: string;
    payloadType?: string;
}
/**
 * Represents a Vue composable function
 */
export interface Composable extends Node {
    name: string;
    file: string;
    startLine: number;
    endLine: number;
    isAsync: boolean;
    description?: string;
    returnTypes?: string[];
    dependencies?: string[];
}
/**
 * Represents reactive state in a composable or component
 */
export interface ReactiveState extends Node {
    name: string;
    composableId?: string;
    componentId?: string;
    type: string;
    reactivityType: 'ref' | 'reactive' | 'computed' | 'readonly' | 'shallowRef' | 'shallowReactive';
    initialValue?: string;
}
/**
 * Represents a SASS variable
 */
export interface SassVariable extends Node {
    name: string;
    value: string;
    file: string;
    isPrivate: boolean;
    usageCount?: number;
}
/**
 * Represents a SASS mixin
 */
export interface SassMixin extends Node {
    name: string;
    parameters: string[];
    content: string;
    file: string;
    usageCount?: number;
}
/**
 * Represents a SASS module/partial
 */
export interface SassModule extends Node {
    path: string;
    absolutePath: string;
    name: string;
    isPartial: boolean;
    variableCount: number;
    mixinCount: number;
    functionCount: number;
}
//# sourceMappingURL=nodes.d.ts.map