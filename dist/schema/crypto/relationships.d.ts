import { Relationship } from '../common/types';
/**
 * Shows layer hierarchy relationships
 * From: Layer2 → Layer1
 * From: Layer3 → Layer2
 * From: Layer3 → Layer1
 */
export interface BuildsOn extends Relationship {
    type: 'BUILDS_ON';
    deploymentDate: string;
    integrationLevel: string;
}
/**
 * Shows interoperability between chains
 * From: InteroperabilitySolution → Layer0
 * From: InteroperabilitySolution → Layer1
 * From: InteroperabilitySolution → Layer2
 */
export interface Connects extends Relationship {
    type: 'CONNECTS';
    implementationDate: string;
    transactionsPerDay: number;
    volumeTransferred: number;
    status: string;
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
    issuanceDate: string;
    initialSupply: number;
    isInflationary: boolean;
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
    startDate: string;
    contributorCount: number;
    fundingAmount: number;
    role: string;
}
/**
 * Shows token support on platforms
 * From: Layer1 → Token
 * From: Layer2 → Token
 * From: Layer3 → Token
 */
export interface Supports extends Relationship {
    type: 'SUPPORTS';
    supportDate: string;
    integrationLevel: string;
    tradingVolume: number;
}
/**
 * Shows bridging between specific tokens
 * From: InteroperabilitySolution → Token
 * To: Token
 */
export interface Bridges extends Relationship {
    type: 'BRIDGES';
    implementationDate: string;
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
    startDate: string;
    partnershipType: string;
    description: string;
}
//# sourceMappingURL=relationships.d.ts.map