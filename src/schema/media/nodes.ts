/**
 * TypeScript interfaces for Katy Perry Information Schema
 * Based on the Neo4j schema defined in media.ts
 */

// Core Node Interfaces

export interface Location {
  id?: string;
  city: string;
  state?: string;
  country: string;
}

export interface Genre {
  id?: string;
  name: string;
}

export interface Artist {
  id?: string;
  name: string;
  birthDate?: Date;
  birthPlace?: Location;
  occupations?: string[];
  netWorth?: number;
  otherNames?: string[];
}

export interface RecordLabel {
  id?: string;
  name: string;
  foundedYear?: number;
}

export interface Album {
  id?: string;
  title: string;
  releaseDate: Date;
  sales?: number;
  streams?: number;
  type: 'Studio' | 'Live' | 'EP' | 'Reissue';
}

export interface Song {
  id?: string;
  title: string;
  releaseDate?: Date;
  writers?: string[];
  producers?: string[];
  certifications?: Record<string, string>; // e.g., { "US": "Platinum", "UK": "Gold" }
  views?: Record<string, number>; // e.g., { "YouTube": 1000000, "Vevo": 500000 }
  isSingle: boolean;
}

export interface Tour {
  id?: string;
  name: string;
  startDate: Date;
  endDate: Date;
  grossRevenue?: number;
  ticketSales?: number;
}

export interface Residency {
  id?: string;
  name: string;
  venue: string;
  startDate: Date;
  endDate: Date;
  grossRevenue?: number;
}

export interface Award {
  id?: string;
  name: string;
  year: number;
  category: string;
  awardingBody: string;
  status: 'Won' | 'Nominated';
}

export interface Media {
  id?: string;
  title: string;
  releaseDate: Date;
  type: 'Film' | 'TVShow' | 'Documentary' | 'MusicVideo';
  role?: string; // For Artist involvement
}

export interface Event {
  id?: string;
  name: string;
  date: Date;
  type: 'Festival' | 'AwardShow' | 'HalftimeShow' | 'PoliticalRally' | 'BenefitConcert' | string;
}

export interface Organization {
  id?: string;
  name: string;
  type: 'Charity' | 'Business' | 'PoliticalGroup' | 'SportsLeague' | string;
}

export interface Product {
  id?: string;
  name: string;
  type: 'Fragrance' | 'ShoeLine' | 'MobileApp' | 'Beverage' | string;
  launchDate: Date;
}

export interface LyricSection {
  id?: string;
  text: string;
  lineNumberStart: number;
  lineNumberEnd: number;
  sectionType: string; // e.g., 'Verse', 'Chorus', 'Bridge'
}

export interface Annotation {
  id?: string;
  text: string;
  author?: string;
  creationDate: Date;
  upvotes?: number;
}

export interface Theme {
  id?: string;
  name: string;
  description?: string;
}

export interface LinguisticDevice {
  id?: string;
  type: string; // e.g., 'Metaphor', 'Simile', 'Alliteration'
  description?: string;
}

export interface Source {
  id?: string;
  name: string;
  url?: string;
  type: string;
}

export interface User {
  id?: string;
  username: string;
  // Other user properties
}

