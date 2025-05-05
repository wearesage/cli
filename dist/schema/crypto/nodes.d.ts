import { Node } from "../common/types";
/**
 * Represents a Layer 0 blockchain network enabling cross-chain communication
 */
export interface Layer0 extends Node {
    name: string;
    foundedDate: string;
    marketCap: number;
    consensusMechanism: string;
    tps: number;
    website: string;
    description: string;
}
/**
 * Represents a Layer 1 base blockchain protocol
 */
export interface Layer1 extends Node {
    name: string;
    foundedDate: string;
    marketCap: number;
    consensusMechanism: string;
    tps: number;
    nativeCurrency: string;
    smartContractSupport: boolean;
    totalValueLocked: number;
    description: string;
}
/**
 * Represents a Layer 2 scaling solution
 */
export interface Layer2 extends Node {
    name: string;
    foundedDate: string;
    type: string;
    tps: number;
    totalValueLocked: number;
    description: string;
}
/**
 * Represents a Layer 3 application layer / DApp
 */
export interface Layer3 extends Node {
    name: string;
    category: string;
    foundedDate: string;
    userCount: number;
    totalValueLocked: number;
    description: string;
}
/**
 * Represents a cryptocurrency token
 */
export interface Token extends Node {
    name: string;
    symbol: string;
    type: string;
    marketCap: number;
    totalSupply: number;
    description: string;
}
/**
 * Represents bridges and cross-chain protocols
 */
export interface InteroperabilitySolution extends Node {
    name: string;
    type: string;
    foundedDate: string;
    totalValueLocked: number;
    chainCount: number;
    securityModel: string;
    description: string;
}
/**
 * Represents companies, foundations, and DAOs
 */
export interface Organization extends Node {
    name: string;
    type: string;
    foundedDate: string;
    employeeCount: number;
    fundingAmount: number;
    description: string;
}
//# sourceMappingURL=nodes.d.ts.map