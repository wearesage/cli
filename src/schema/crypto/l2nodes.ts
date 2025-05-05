import { Node } from "../common/types";

/**
 * Enhanced Layer2 node with additional properties for Ethereum L2 chains
 */
export interface EnhancedLayer2 extends Node {
  name: string;
  description: string;
  category: string;
  totalValueLocked: number;
  totalValueLockedDisplay: string;
  
  // Enhanced properties
  type: string; // Optimistic Rollup, ZK Rollup, Validium, Plasma, Sidechain
  launchDate: string; // ISO date format when the L2 went live on mainnet
  status: string; // Live, Testnet, Development
  website: string; // official website URL
  documentation: string; // documentation URL
  github: string; // GitHub repository URL
  blockExplorer: string; // block explorer URL
  gasToken: string; // token used for gas fees
  nativeToken: string; // native token of the L2
  averageBlockTime: number; // in seconds
  averageTPS: number; // transactions per second
  peakTPS: number; // highest recorded TPS
  finalityTime: number; // time to finality in seconds
  averageGasCost: number; // average gas cost in USD
  dailyActiveUsers: number; // daily active users
  dailyTransactions: number; // daily transaction count
  totalTransactions: number; // total transaction count
  developerCount: number; // number of active developers
  dAppCount: number; // number of deployed dApps
  tvlGrowthRate: number; // monthly TVL growth rate
  userGrowthRate: number; // monthly user growth rate
  securityModel: string; // description of security model
  auditStatus: string; // audit information
  decentralizationScore: number; // measure of decentralization, 0-100
  domain: string; // specialized focus area if any: DeFi, Gaming, Social, etc.
}

/**
 * Enhanced TechnicalArchitecture node with additional properties for Ethereum L2 chains
 */
export interface EnhancedTechnicalArchitecture extends Node {
  name: string;
  description: string;
  consensusMechanism: string;
  tps: number;
  baseStack: string;
  dataAvailability: string;
  finality: string;
  finalityTime: number;
  maxBlockSize: number;
  programmingLanguages: string[];
  smartContractStandards: string[];
  securityFeatures: string[];
  
  // Enhanced properties
  version: string; // version of the architecture
  releaseDate: string; // ISO date format when this version was released
  upgradeFrequency: string; // how often upgrades occur
  dataAvailabilityLayer: string; // how data availability is handled
  executionLayer: string; // how execution is handled
  settlementLayer: string; // how settlement is handled
  proofSystem: string; // for ZK solutions: STARK, SNARK, etc.
  proofGenerationTime: number; // for ZK solutions, in seconds
  proofSize: number; // for ZK solutions, in bytes
  verificationCost: number; // for ZK solutions, gas cost
  sequencerModel: string; // how sequencers operate
  sequencerCount: number; // number of sequencers
  validatorCount: number; // number of validators
  challengePeriod: number; // for Optimistic Rollups, in hours
  fraudProofSystem: string; // for Optimistic Rollups
  stateModel: string; // how state is represented
  stateTransitionModel: string; // how state transitions occur
  evm: boolean; // EVM compatibility
  evmEquivalence: boolean; // EVM equivalence
  precompiles: string[]; // list of precompiled contracts
  opcodes: string[]; // supported opcodes if different from Ethereum
  gasModel: string; // how gas is calculated
  mempoolModel: string; // how mempool works
  scalingApproach: string; // monolithic, modular, etc.
  sharding: boolean; // whether sharding is used
  shardCount: number; // number of shards if applicable
}

/**
 * Represents a sequencer for an L2 chain
 */
export interface L2Sequencer extends Node {
  nodeId: string;
  name: string;
  description: string;
  operator: string; // who operates this sequencer
  location: string; // geographic location
  uptime: number; // percentage uptime
  stake: number; // amount staked if applicable
  hardware: string; // hardware specifications
  throughput: number; // transactions processed per second
}

/**
 * Represents a validator for an L2 chain
 */
export interface L2Validator extends Node {
  nodeId: string;
  name: string;
  description: string;
  operator: string; // who operates this validator
  location: string; // geographic location
  uptime: number; // percentage uptime
  stake: number; // amount staked
  validationMethod: string; // how validation is performed
}

/**
 * Represents a decentralized application on an L2 chain
 */
export interface L2DApp extends Node {
  nodeId: string;
  name: string;
  description: string;
  category: string; // DeFi, Gaming, Social, etc.
  website: string;
  tvl: number; // if applicable
  userCount: number;
  dailyActiveUsers: number;
  launchDate: string; // ISO date format
  lastUpdated: string; // ISO date format
}

/**
 * Represents a bridge for an L2 chain
 */
export interface L2Bridge extends Node {
  nodeId: string;
  name: string;
  description: string;
  type: string; // Official, Third-party
  securityModel: string;
  auditStatus: string;
  dailyVolume: number;
  totalVolume: number;
  supportedTokens: string[];
  withdrawalTime: number; // in hours
  fees: string; // fee structure
}

/**
 * Represents a security incident for an L2 chain
 */
export interface L2SecurityIncident extends Node {
  nodeId: string;
  name: string;
  description: string;
  date: string; // ISO date format
  severity: string; // Critical, High, Medium, Low
  impact: string; // description of impact
  resolution: string; // how it was resolved
  postMortem: string; // link to post-mortem
}