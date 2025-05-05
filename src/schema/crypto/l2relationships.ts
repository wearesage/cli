import { Relationship } from '../common/types';

/**
 * Represents a security relationship between an Organization/Validator and a Layer2
 * From: Organization → Layer2
 * From: L2Validator → Layer2
 */
export interface Secures extends Relationship {
  type: 'SECURES';
  securityType: string; // Sequencer, Validator, Auditor
  startDate: string; // ISO date format
  stake: number; // if applicable
  role: string; // specific role in security
}

/**
 * Represents a bridging relationship between Layer2 and Layer1/Layer2
 * From: Layer2 → Layer1
 * From: Layer2 → Layer2
 * From: L2Bridge → Layer1
 * From: L2Bridge → Layer2
 */
export interface L2Bridges extends Relationship {
  type: 'L2_BRIDGES';
  bridgeType: string; // Official, Third-party
  deploymentDate: string; // ISO date format
  dailyVolume: number;
  totalVolume: number;
  securityModel: string;
  withdrawalTime: number; // in hours
}

/**
 * Represents a hosting relationship between Layer2 and L2DApp
 * From: Layer2 → L2DApp
 */
export interface Hosts extends Relationship {
  type: 'HOSTS';
  deploymentDate: string; // ISO date format
  performance: string; // how the dApp performs on this L2
  exclusivity: boolean; // whether exclusive to this L2
}

/**
 * Represents an audit relationship between an Organization and a Layer2
 * From: Organization → Layer2
 */
export interface Audits extends Relationship {
  type: 'AUDITS';
  auditDate: string; // ISO date format
  report: string; // link to audit report
  findings: number; // number of findings
  criticalFindings: number; // number of critical findings
  resolution: string; // status of resolution
}

/**
 * Represents an upgrade relationship between an Organization and a Layer2
 * From: Organization → Layer2
 */
export interface Upgrades extends Relationship {
  type: 'UPGRADES';
  upgradeDate: string; // ISO date format
  version: string;
  changes: string; // description of changes
  governance: string; // how upgrade was approved
}