import { Node } from "../common/types";

/**
 * Represents a Layer 0 blockchain network enabling cross-chain communication
 *
 * Note: In blockchain terminology, "Layer 0" refers specifically to inter-chain base layers
 * such as Polkadot, Cosmos, and Avalanche subnets that facilitate communication between
 * different blockchains. This is distinct from "Layer 1" chains like Bitcoin, Ethereum,
 * and Solana which are standalone base blockchain protocols.
 */
export interface Layer0 extends Node {
  name: string;
  foundedDate: string; // ISO date format
  marketCap: number;
  consensusMechanism: string; // e.g., "PoS", "PoA"
  tps: number; // transactions per second
  website: string;
  description: string;
}

/**
 * Represents a Layer 1 base blockchain protocol
 *
 * Note: In blockchain terminology, "Layer 1" refers to standalone base blockchain protocols
 * such as Bitcoin, Ethereum, and Solana that operate their own independent networks.
 * These are the foundational chains upon which other scaling solutions (Layer 2) and
 * applications (Layer 3) are built.
 */
export interface Layer1 extends Node {
  name: string;
  description: string;
  consensusMechanism: string; // e.g., "PoW", "PoS"
  
  // Optional properties that may be present
  foundedDate?: string; // ISO date format
  createdAt?: string; // ISO date format
  updatedAt?: string; // ISO date format
  marketCap?: number;
  tps?: number;
  nativeCurrency?: string;
  smartContractSupport?: boolean;
  totalValueLocked?: number;
  totalValueLockedDisplay?: string;
  domain?: string;
}

/**
 * Represents a Layer 2 scaling solution
 *
 * Note: In blockchain terminology, "Layer 2" refers to scaling solutions built on top of
 * Layer 1 blockchains, such as Lightning Network (Bitcoin), Polygon and Optimism (Ethereum),
 * or Arbitrum. These solutions aim to improve transaction throughput, reduce fees, and
 * enhance the performance of the underlying Layer 1 chain.
 */
export interface Layer2 extends Node {
  name: string;
  foundedDate: string; // ISO date format
  type: string; // e.g., "Sidechain", "Rollup", "State Channel"
  tps: number;
  totalValueLocked: number;
  description: string;
}

/**
 * Represents a Layer 3 application layer / DApp
 *
 * Note: In blockchain terminology, "Layer 3" refers to the application layer built on top of
 * Layer 1 or Layer 2 solutions. These include decentralized applications (DApps) such as
 * Uniswap, Aave, OpenSea, and other user-facing services that leverage the underlying
 * blockchain infrastructure for specific use cases like DeFi, NFTs, gaming, etc.
 */
export interface Layer3 extends Node {
  name: string;
  category: string; // e.g., "DeFi", "NFT", "Gaming"
  foundedDate: string; // ISO date format
  userCount: number;
  totalValueLocked: number;
  description: string;
}

/**
 * Represents a cryptocurrency token
 */
export interface Token extends Node {
  name: string;
  symbol: string; // e.g., "BTC", "ETH", "USDC"
  type: string; // e.g., "Native", "Stablecoin", "Wrapped", "ERC-20"
  marketCap: number;
  marketCapDisplay: string; // Formatted market cap (e.g., "$1,916,490,397,549")
  totalSupply: number;
  totalSupplyDisplay: string; // Formatted total supply (e.g., "19,859,293")
  description: string;
  domain: string; // Domain category (e.g., "crypto")
  
  // Price information
  currentPrice: number; // Current price in USD
  priceChangePercentage24h: number; // 24h price change percentage
  
  // Supply information
  circulatingSupply: number; // Current circulating supply
  maxSupply?: number; // Maximum supply (if applicable)
  
  // Historical data
  ath: number; // All-time high price
  athDate: string; // Date of all-time high (ISO format)
  atl: number; // All-time low price
  atlDate: string; // Date of all-time low (ISO format)
}

/**
 * Represents bridges and cross-chain protocols
 */
export interface InteroperabilitySolution extends Node {
  name: string;
  type: string; // e.g., "Bridge", "Oracle", "Messaging Protocol"
  foundedDate: string; // ISO date format
  totalValueLocked: number;
  chainCount: number; // number of chains connected
  securityModel: string;
  description: string;
}

/**
 * Represents companies, foundations, and DAOs
 */
export interface Organization extends Node {
  name: string;
  type: string; // e.g., "Company", "Foundation", "DAO"
  foundedDate: string; // ISO date format
  employeeCount: number;
  fundingAmount: number;
  description: string;
}

/**
 * Represents significant events in the crypto ecosystem
 * Examples: Hard forks, hacks, regulatory actions, major protocol upgrades
 */
export interface Event extends Node {
  name: string;
  type: string; // e.g., "Hard Fork", "Hack", "Regulatory Action", "Launch"
  date: string; // ISO date format
  impact: string; // e.g., "High", "Medium", "Low"
  description: string;
  affectedEntities: string[]; // IDs of affected entities
}

/**
 * Represents key individuals in the crypto ecosystem
 * Examples: Founders, developers, influencers, regulators
 */
export interface Person extends Node {
  name: string;
  role: string; // e.g., "Founder", "Developer", "Influencer"
  affiliations: string[]; // Organizations they're affiliated with
  socialProfiles: {
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
  description: string;
}

/**
 * Represents decentralized applications
 * Note: This is more specific than Layer3, focusing on individual applications
 * rather than application layers/platforms
 */
export interface DApp extends Node {
  name: string;
  category: string; // e.g., "DeFi", "NFT", "Gaming", "Social"
  launchDate: string; // ISO date format
  platform: string; // e.g., "Ethereum", "Solana", "Polygon"
  userCount: number;
  dailyActiveUsers: number;
  totalValueLocked: number;
  description: string;
  website: string;
}

/**
 * Represents specific protocols that aren't full layers
 * Examples: DeFi protocols, oracle networks, identity protocols
 */
export interface Protocol extends Node {
  name: string;
  category: string; // e.g., "DeFi", "Oracle", "Identity", "Storage"
  launchDate: string; // ISO date format
  governanceType: string; // e.g., "DAO", "Foundation", "Company"
  auditStatus: string; // e.g., "Audited", "In Progress", "None"
  totalValueLocked: number;
  description: string;
}

/**
 * Represents entities securing blockchain networks
 * Examples: Mining pools, validator nodes, staking providers
 */
export interface Validator extends Node {
  name: string;
  type: string; // e.g., "Mining Pool", "Validator Node", "Staking Provider"
  networks: string[]; // Networks they validate
  stakingAmount: number;
  controlledPercentage: number; // % of network they control
  uptime: number; // Reliability metric
  description: string;
}

/**
 * Represents a governance structure for blockchain networks or protocols
 * Examples: Optimism Collective, Ethereum governance, Aave governance
 */
export interface GovernanceStructure extends Node {
  name: string;
  type: string; // e.g., "DAO", "Foundation", "Collective", "Multi-sig"
  implementationDate: string; // ISO date format
  governanceModel: string; // e.g., "On-chain Voting", "Bicameral", "Council"
  votingMechanism: string; // e.g., "Token-weighted", "Quadratic", "Identity-based"
  proposalThreshold: string; // Requirements to submit proposals
  quorumRequirement: string; // Requirements for proposal passage
  delegateCount?: number; // Number of active delegates if applicable
  description: string;
  website?: string;
}

/**
 * Represents a regulatory approach or framework for a blockchain network
 * Examples: Soneium's Sandbox, Binance's compliance framework
 */
export interface RegulatoryApproach extends Node {
  name: string;
  implementationDate: string; // ISO date format
  type: string; // e.g., "Sandbox", "Compliance Framework", "Self-regulation"
  enforcementMechanism: string; // e.g., "On-chain", "Legal", "Hybrid"
  jurisdictions: string[]; // Applicable jurisdictions
  complianceStandards: string[]; // Standards being followed
  restrictionLevel: string; // e.g., "High", "Medium", "Low"
  description: string;
}

/**
 * Represents detailed technical architecture of a blockchain network
 * Examples: Soneium's OP Stack implementation, Polygon's architecture
 */
export interface TechnicalArchitecture extends Node {
  name: string;
  baseStack: string; // e.g., "OP Stack", "zkEVM", "Cosmos SDK"
  consensusMechanism: string; // e.g., "Optimistic Rollup", "ZK Rollup", "PoS"
  dataAvailability: string; // e.g., "On-chain", "Off-chain", "Hybrid"
  finality: string; // e.g., "Probabilistic", "Deterministic"
  finalityTime: number; // Time to finality in seconds
  tps: number; // Transactions per second
  maxBlockSize: number; // Maximum block size in bytes
  programmingLanguages: string[]; // Supported languages
  smartContractStandards: string[]; // Supported standards
  securityFeatures: string[]; // Security features
  description: string;
}

/**
 * Represents user demographic data for a blockchain network or application
 * Examples: Soneium user demographics, Uniswap user demographics
 */
export interface UserDemographic extends Node {
  name: string;
  totalUsers: number;
  activeUsers: number; // Monthly active users
  dailyActiveUsers: number;
  retentionRate: number; // User retention rate
  geographicDistribution: Record<string, number>; // Country/region to percentage
  userTypes: Record<string, number>; // User type to percentage
  averageTransactionValue: number;
  averageTransactionsPerUser: number;
  growthRate: number; // Monthly growth rate
  description: string;
  lastUpdated: string; // ISO date format
}