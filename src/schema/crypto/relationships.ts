import { Relationship } from '../common/types';

/**
 * Shows layer hierarchy relationships
 * From: Layer2 → Layer1
 * From: Layer3 → Layer2
 * From: Layer3 → Layer1
 */
export interface BuildsOn extends Relationship {
  type: 'BUILDS_ON';
  deploymentDate: string; // ISO date format
  integrationLevel: string; // e.g., "Native", "Wrapped", "Forked"
}

/**
 * Shows interoperability between chains
 * From: InteroperabilitySolution → Layer0
 * From: InteroperabilitySolution → Layer1
 * From: InteroperabilitySolution → Layer2
 */
export interface Connects extends Relationship {
  type: 'CONNECTS';
  implementationDate: string; // ISO date format
  transactionsPerDay: number;
  volumeTransferred: number;
  status: string; // e.g., "Active", "Testing", "Deprecated"
}

/**
 * Shows token issuance
 * From: Layer0 → Token
 * From: Layer1 → Token
 * From: Layer2 → Token
 * From: Layer3 → Token
 */
export interface Issues extends Relationship {
  type: 'ISSUES';
  issuanceDate: string; // ISO date format
  initialSupply: number;
  isInflationary: boolean;
  
  // Additional properties from our implementation
  nodeId: string; // Unique identifier for the relationship
  startNodeId: string; // ID of the platform node
  endNodeId: string; // ID of the token node
  codebaseId: string; // Codebase identifier
  createdAt: string; // ISO date format
  updatedAt: string; // ISO date format
}

/**
 * Shows development relationships
 * From: Organization → Layer0
 * From: Organization → Layer1
 * From: Organization → Layer2
 * From: Organization → Layer3
 * From: Organization → InteroperabilitySolution
 */
export interface Develops extends Relationship {
  type: 'DEVELOPS';
  startDate: string; // ISO date format
  contributorCount: number;
  fundingAmount: number;
  role: string; // e.g., "Creator", "Maintainer", "Contributor"
}

/**
 * Shows token support on platforms
 * From: Layer1 → Token
 * From: Layer2 → Token
 * From: Layer3 → Token
 */
export interface Supports extends Relationship {
  type: 'SUPPORTS';
  supportDate: string; // ISO date format
  integrationLevel: string; // e.g., "Native", "Wrapped"
  tradingVolume: number;
}

/**
 * Shows bridging between specific tokens
 * From: InteroperabilitySolution → Token
 * To: Token
 */
export interface Bridges extends Relationship {
  type: 'BRIDGES';
  implementationDate: string; // ISO date format
  dailyVolume: number;
  totalVolume: number;
  feeStructure: string;
}

/**
 * Shows partnerships between organizations
 * From: Organization → Organization
 */
export interface PartnersWith extends Relationship {
  type: 'PARTNERS_WITH';
  startDate: string; // ISO date format
  partnershipType: string; // e.g., "Technical", "Marketing", "Investment"
  description: string;
}

/**
 * Shows competitive relationships between entities
 * From: Layer1 → Layer1
 * From: Layer2 → Layer2
 * From: Protocol → Protocol
 * From: DApp → DApp
 */
export interface CompetesWith extends Relationship {
  type: 'COMPETES_WITH';
  competitionLevel: string; // e.g., "Direct", "Indirect", "Partial"
  marketOverlap: number; // Percentage of market overlap
  competitiveAdvantage: string; // Description of competitive advantage
  description: string;
}

/**
 * Shows the lineage of forked protocols
 * From: Layer1 → Layer1
 * From: Layer2 → Layer2
 * From: Protocol → Protocol
 */
export interface ForkedFrom extends Relationship {
  type: 'FORKED_FROM';
  forkDate: string; // ISO date format
  forkType: string; // e.g., "Hard Fork", "Soft Fork", "Code Fork"
  significantChanges: string[]; // List of significant changes
  compatibility: string; // e.g., "Compatible", "Incompatible", "Partial"
}

/**
 * Shows investment relationships
 * From: Organization → Organization
 * From: Organization → Layer1
 * From: Organization → Layer2
 * From: Organization → Protocol
 * From: Person → Organization
 * From: Person → Protocol
 */
export interface InvestedIn extends Relationship {
  type: 'INVESTED_IN';
  investmentDate: string; // ISO date format
  investmentAmount: number;
  investmentType: string; // e.g., "Seed", "Series A", "Token Purchase"
  equityPercentage: number; // Percentage of equity acquired
  exitDate?: string; // ISO date format, if applicable
}

/**
 * Shows governance relationships between tokens and protocols
 * From: Token → Layer1
 * From: Token → Layer2
 * From: Token → Protocol
 * From: Token → DApp
 */
export interface Governs extends Relationship {
  type: 'GOVERNS';
  implementationDate: string; // ISO date format
  governanceModel: string; // e.g., "On-chain Voting", "Multisig", "Hybrid"
  votingPower: string; // Description of how voting power is calculated
  proposalThreshold: number; // Minimum tokens needed to submit proposal
  quorumRequirement: number; // Percentage needed for quorum
}

/**
 * Shows market correlation and influence between entities
 * From: Token → Token
 * From: Event → Token
 * From: Layer1 → Token
 */
export interface InfluencedBy extends Relationship {
  type: 'INFLUENCED_BY';
  correlationCoefficient: number; // Statistical correlation (-1 to 1)
  timeframe: string; // e.g., "30d", "90d", "1y"
  influenceType: string; // e.g., "Price", "Adoption", "Development"
  influenceStrength: string; // e.g., "Strong", "Moderate", "Weak"
  description: string;
}

/**
 * Shows participation in governance structures
 * From: Layer1 → GovernanceStructure
 * From: Layer2 → GovernanceStructure
 * From: Organization → GovernanceStructure
 * From: Protocol → GovernanceStructure
 */
export interface ParticipatesInGovernance extends Relationship {
  type: 'PARTICIPATES_IN_GOVERNANCE';
  startDate: string; // ISO date format
  role: string; // e.g., "Member", "Delegate", "Council Member"
  votingPower: number; // Percentage or absolute value
  delegateAddress?: string; // On-chain address if applicable
  proposalsSubmitted?: number; // Number of proposals submitted
  proposalParticipation?: number; // Percentage of proposals voted on
  description: string;
}

/**
 * Shows revenue contribution relationships
 * From: Layer2 → GovernanceStructure
 * From: Layer2 → Organization
 * From: Protocol → Organization
 */
export interface ContributesRevenueTo extends Relationship {
  type: 'CONTRIBUTES_REVENUE_TO';
  startDate: string; // ISO date format
  revenueModel: string; // e.g., "Percentage", "Fixed", "Tiered"
  revenueAmount?: number; // Amount if fixed
  revenuePercentage?: number; // Percentage if variable
  frequency: string; // e.g., "Daily", "Weekly", "Monthly"
  totalContributed?: number; // Total contributed to date
  description: string;
}

/**
 * Links entities to their regulatory approaches
 * From: Layer1 → RegulatoryApproach
 * From: Layer2 → RegulatoryApproach
 * From: Organization → RegulatoryApproach
 */
export interface HasRegulatoryApproach extends Relationship {
  type: 'HAS_REGULATORY_APPROACH';
  implementationDate: string; // ISO date format
  complianceLevel: string; // e.g., "Full", "Partial", "Minimal"
  enforcementMechanism: string; // e.g., "On-chain", "Legal", "Hybrid"
  reviewFrequency: string; // e.g., "Quarterly", "Annual"
  description: string;
}

/**
 * Links entities to their technical architecture details
 * From: Layer1 → TechnicalArchitecture
 * From: Layer2 → TechnicalArchitecture
 * From: Protocol → TechnicalArchitecture
 */
export interface HasTechnicalArchitecture extends Relationship {
  type: 'HAS_TECHNICAL_ARCHITECTURE';
  implementationDate: string; // ISO date format
  version: string; // e.g., "1.0", "2.1"
  auditStatus: string; // e.g., "Audited", "In Progress", "None"
  lastUpdated: string; // ISO date format
  description: string;
}

/**
 * Links entities to their user demographic data
 * From: Layer1 → UserDemographic
 * From: Layer2 → UserDemographic
 * From: DApp → UserDemographic
 * From: Protocol → UserDemographic
 */
export interface HasUserDemographic extends Relationship {
  type: 'HAS_USER_DEMOGRAPHIC';
  dataCollectionDate: string; // ISO date format
  dataSource: string; // e.g., "On-chain Analysis", "Survey", "Third-party"
  confidenceLevel: string; // e.g., "High", "Medium", "Low"
  sampleSize?: number; // Size of sample if applicable
  lastUpdated: string; // ISO date format
  description: string;
}

/**
 * Shows technology provision relationships
 * From: Organization → Layer1
 * From: Organization → Layer2
 * From: Protocol → Layer2
 */
export interface ProvidesTechnology extends Relationship {
  type: 'PROVIDES_TECHNOLOGY';
  startDate: string; // ISO date format
  technologyType: string; // e.g., "Infrastructure", "Protocol", "SDK"
  integrationLevel: string; // e.g., "Core", "Optional", "Plugin"
  licenseType: string; // e.g., "Open Source", "Proprietary", "Hybrid"
  description: string;
}

/**
 * Shows relationships to events
 * From: Layer1 → Event
 * From: Layer2 → Event
 * From: Organization → Event
 * From: Protocol → Event
 */
export interface RelatesTo extends Relationship {
  type: 'RELATES_TO';
  relationshipType: string; // e.g., "Caused", "Affected By", "Participated In"
  impact: string; // e.g., "High", "Medium", "Low"
  description: string;
}