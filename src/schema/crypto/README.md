# Ethereum L2 Chain Schema

This directory contains the Neo4j schema definitions for Ethereum L2 chains and related entities. The schema is designed to provide a comprehensive mental model for understanding and analyzing Layer 2 scaling solutions on Ethereum.

## Node Types

### Enhanced Layer2 Node
The `EnhancedLayer2` interface extends the basic `Layer2` node with additional properties specific to Ethereum L2 chains:

- **Basic Properties**: name, description, category, totalValueLocked, totalValueLockedDisplay
- **Type Information**: type (Optimistic Rollup, ZK Rollup, Validium, Plasma, Sidechain)
- **Status**: launchDate, status (Live, Testnet, Development)
- **Resources**: website, documentation, github, blockExplorer
- **Token Information**: gasToken, nativeToken
- **Performance Metrics**: averageBlockTime, averageTPS, peakTPS, finalityTime, averageGasCost
- **Usage Statistics**: dailyActiveUsers, dailyTransactions, totalTransactions, developerCount, dAppCount
- **Growth Metrics**: tvlGrowthRate, userGrowthRate
- **Security & Decentralization**: securityModel, auditStatus, decentralizationScore
- **Domain Focus**: domain (DeFi, Gaming, Social, etc.)

### Enhanced TechnicalArchitecture Node
The `EnhancedTechnicalArchitecture` interface extends the basic `TechnicalArchitecture` node with additional properties specific to L2 technical implementations:

- **Version Information**: version, releaseDate, upgradeFrequency
- **Layer Architecture**: dataAvailabilityLayer, executionLayer, settlementLayer
- **ZK-Specific Properties**: proofSystem, proofGenerationTime, proofSize, verificationCost
- **Optimistic-Specific Properties**: challengePeriod, fraudProofSystem
- **Sequencer & Validator Information**: sequencerModel, sequencerCount, validatorCount
- **State Management**: stateModel, stateTransitionModel
- **EVM Compatibility**: evm, evmEquivalence, precompiles, opcodes
- **Gas & Execution**: gasModel, mempoolModel
- **Scaling Approach**: scalingApproach, sharding, shardCount

### L2Sequencer
Represents a sequencer for an L2 chain:
- nodeId, name, description
- operator, location, uptime
- stake, hardware, throughput

### L2Validator
Represents a validator for an L2 chain:
- nodeId, name, description
- operator, location, uptime
- stake, validationMethod

### L2DApp
Represents a decentralized application on an L2 chain:
- nodeId, name, description
- category, website, tvl
- userCount, dailyActiveUsers
- launchDate, lastUpdated

### L2Bridge
Represents a bridge for an L2 chain:
- nodeId, name, description
- type, securityModel, auditStatus
- dailyVolume, totalVolume
- supportedTokens, withdrawalTime, fees

### L2SecurityIncident
Represents a security incident for an L2 chain:
- nodeId, name, description
- date, severity, impact
- resolution, postMortem

## Relationship Types

### Secures
Represents a security relationship between an Organization/Validator and a Layer2:
- type: 'SECURES'
- securityType (Sequencer, Validator, Auditor)
- startDate, stake, role

### L2Bridges
Represents a bridging relationship between Layer2 and Layer1/Layer2:
- type: 'L2_BRIDGES'
- bridgeType (Official, Third-party)
- deploymentDate, dailyVolume, totalVolume
- securityModel, withdrawalTime

### Hosts
Represents a hosting relationship between Layer2 and L2DApp:
- type: 'HOSTS'
- deploymentDate, performance, exclusivity

### Audits
Represents an audit relationship between an Organization and a Layer2:
- type: 'AUDITS'
- auditDate, report, findings
- criticalFindings, resolution

### Upgrades
Represents an upgrade relationship between an Organization and a Layer2:
- type: 'UPGRADES'
- upgradeDate, version, changes, governance

## Usage Examples

### Creating an L2 Chain Node

```typescript
import { EnhancedLayer2 } from './src/schema/crypto';

const optimism: EnhancedLayer2 = {
  nodeId: 'optimism-l2',
  name: 'Optimism',
  description: 'Optimism is an EVM-equivalent optimistic rollup chain',
  category: 'Scaling Solution',
  type: 'Optimistic Rollup',
  launchDate: '2021-06-23',
  status: 'Live',
  website: 'https://optimism.io',
  // ... other properties
};
```

### Creating a Relationship Between Entities

```typescript
import { L2Bridges } from './src/schema/crypto';

const optimismEthereumBridge: L2Bridges = {
  nodeId: 'optimism-ethereum-bridge',
  type: 'L2_BRIDGES',
  startNodeId: 'optimism-l2',
  endNodeId: 'ethereum-l1',
  bridgeType: 'Official',
  deploymentDate: '2021-06-23',
  // ... other properties
};
```

## Schema Evolution

This schema is designed to evolve as the L2 ecosystem matures. Future enhancements may include:

1. Additional metrics for comparing L2 performance and security
2. More detailed tokenomics models
3. Enhanced governance representations
4. Integration with DeFi protocols and applications
5. Cross-L2 interoperability metrics