# TypeScript Code Graph Schema Visualization

This document provides a visual representation of the TypeScript Code Graph schema using Mermaid diagrams.

## Node Types Hierarchy

```mermaid
classDiagram
    GraphEntity <|-- Node
    GraphEntity <|-- Relationship
    Node <|-- CodeElement
    CodeElement <|-- NamedType
    CodeElement <|-- Callable
    CodeElement <|-- Variable
    CodeElement <|-- Parameter
    CodeElement <|-- Property
    CodeElement <|-- JsxElement
    CodeElement <|-- Test
    NamedType <|-- Class
    NamedType <|-- Interface
    NamedType <|-- Enum
    NamedType <|-- TypeAlias
    NamedType <|-- Component
    NamedType <|-- TypeDefinition
    NamedType <|-- Namespace
    Callable <|-- Function
    Callable <|-- Method
    Callable <|-- Constructor
    Node <|-- Codebase
    Node <|-- Package
    Node <|-- Directory
    Node <|-- File
    Node <|-- Module
    Node <|-- Dependency
    
    class GraphEntity {
        +string nodeId
        +string codebaseId
    }
    
    class Node {
        +string[] labels
        +string hash
        +string createdAt
        +string updatedAt
    }
    
    class Relationship {
        +string type
        +string startNodeId
        +string endNodeId
        +string hash
        +string createdAt
        +string updatedAt
    }
    
    class CodeElement {
        +string name
        +string file
        +number startLine
        +number endLine
        +string documentation
        +string sourceCode
        +boolean isExported
    }
    
    class NamedType {
        +string description
        +TypeParameter[] typeParameters
        +Decorator[] decorators
    }
    
    class Callable {
        +boolean isAsync
        +string returnType
        +TypeParameter[] typeParameters
        +Decorator[] decorators
        +number complexity
        +number loc
    }
    
    class Class {
        +boolean isAbstract
        +boolean isGeneric
        +boolean hasConstructor
        +number methodCount
        +number propertyCount
    }
    
    class File {
        +string path
        +string absolutePath
        +string language
        +number lineCount
        +number size
        +boolean hasDefaultExport
    }
```

## Key Relationships

```mermaid
graph TD
    File -->|IMPORTS| File
    File -->|IMPORTS_FROM_PACKAGE| Package
    File -->|EXPORTS_LOCAL| CodeElement
    File -->|EXPORTS_DEFAULT| CodeElement
    File -->|CONTAINS| CodeElement
    Class -->|EXTENDS| Class
    Class -->|IMPLEMENTS| Interface
    Interface -->|INTERFACE_EXTENDS| Interface
    Class -->|HAS_METHOD| Method
    Class -->|HAS_PROPERTY| Property
    Function -->|HAS_PARAMETER| Parameter
    Method -->|HAS_PARAMETER| Parameter
    Function -->|CALLS| Function
    Method -->|CALLS| Method
    Function -->|CALLS| Method
    Method -->|CALLS| Function
    CodeElement -->|REFERENCES_TYPE| NamedType
    CodeElement -->|REFERENCES_VARIABLE| Variable
    Component -->|RENDERS| Component
    Component -->|USES_HOOK| Function
    Test -->|TESTS| CodeElement
    CodeElement -->|IS_DECORATED_BY| Function
    CodeElement -->|DEPENDS_ON| CodeElement
    Module -->|PART_OF| Module
```

## Detailed Node Type: Class

```mermaid
classDiagram
    class Class {
        +string nodeId
        +string codebaseId
        +string[] labels
        +string name
        +string file
        +number startLine
        +number endLine
        +string documentation
        +boolean isExported
        +boolean isDefaultExport
        +boolean isAbstract
        +boolean isGeneric
        +boolean hasConstructor
        +string constructorParams
        +number methodCount
        +number propertyCount
        +number staticMethodCount
        +number staticPropertyCount
        +boolean hasDecorators
        +Decorator[] decorators
        +TypeParameter[] typeParameters
    }
```

## Detailed Relationship Type: CALLS

```mermaid
classDiagram
    class CALLS {
        +string nodeId
        +string codebaseId
        +string type = "CALLS"
        +string startNodeId
        +string endNodeId
        +number callCount
        +object[] callLocations
        +string[] arguments
        +boolean isAsync
        +boolean isAwait
        +boolean isChained
        +boolean isConditional
    }
```

## Common Graph Patterns

### Class Hierarchy

```mermaid
graph TD
    ClassA[Class A] -->|EXTENDS| ClassB[Class B]
    ClassB -->|EXTENDS| ClassC[Class C]
    ClassA -->|IMPLEMENTS| InterfaceA[Interface A]
    ClassB -->|IMPLEMENTS| InterfaceB[Interface B]
    InterfaceA -->|INTERFACE_EXTENDS| InterfaceC[Interface C]
```

### Module Dependencies

```mermaid
graph TD
    FileA[File A] -->|IMPORTS| FileB[File B]
    FileA -->|IMPORTS| FileC[File C]
    FileB -->|IMPORTS_FROM_PACKAGE| PackageA[Package A]
    FileC -->|IMPORTS_FROM_PACKAGE| PackageB[Package B]
```

### Function Call Graph

```mermaid
graph TD
    FunctionA[Function A] -->|CALLS| FunctionB[Function B]
    FunctionB -->|CALLS| FunctionC[Function C]
    FunctionB -->|CALLS| FunctionD[Function D]
    FunctionC -->|CALLS| FunctionD[Function D]
```

### Component Hierarchy

```mermaid
graph TD
    AppComponent[App Component] -->|RENDERS| HeaderComponent[Header Component]
    AppComponent -->|RENDERS| MainComponent[Main Component]
    AppComponent -->|RENDERS| FooterComponent[Footer Component]
    MainComponent -->|RENDERS| SidebarComponent[Sidebar Component]
    MainComponent -->|RENDERS| ContentComponent[Content Component]
```

## Neo4j Cypher Query Examples

### Find all callers of a function

```cypher
MATCH (caller)-[:CALLS]->(callee:Function {name: 'targetFunction'})
RETURN caller
```

### Find all dependencies of a file

```cypher
MATCH (file:File {path: 'src/index.ts'})-[:IMPORTS*]->(dep:File)
RETURN dep
```

### Find potential circular dependencies

```cypher
MATCH path = (a:File)-[:IMPORTS*]->(b:File)-[:IMPORTS*]->(a)
RETURN path
```

### Find unused exports

```cypher
MATCH (file:File)-[:EXPORTS_LOCAL|EXPORTS_DEFAULT]->(export)
WHERE NOT EXISTS((export)<-[:IMPORTS]-())
RETURN export
```

### Find complex classes (too many methods)

```cypher
MATCH (class:Class)-[:HAS_METHOD]->(method:Method)
WITH class, COUNT(method) as methodCount
WHERE methodCount > 10
RETURN class, methodCount
ORDER BY methodCount DESC
```

### Find the impact of changing a code element

```cypher
MATCH (element {nodeId: 'element-id'})
OPTIONAL MATCH (dependent)-[:CALLS|REFERENCES_VARIABLE|REFERENCES_TYPE|EXTENDS|IMPLEMENTS|IMPORTS|DEPENDS_ON]->(element)
RETURN dependent
```

### Find type hierarchies

```cypher
MATCH path = (type:Class|Interface)-[:EXTENDS|IMPLEMENTS*0..10]->(baseType)
WHERE type.name = 'MyClass'
RETURN path