#!/usr/bin/env node

/**
 * This script processes the relationships.json file to remove complex properties
 * that Neo4j can't handle, such as objects within arrays.
 */

const fs = require('fs');
const path = require('path');

// Check if the codebase ID is provided
if (process.argv.length < 3) {
  console.error('Usage: node fix-complex-properties.js <codebase-id>');
  process.exit(1);
}

const codebaseId = process.argv[2];
const outputDir = path.join(process.cwd(), 'output', `${codebaseId}-analysis`);
const relationshipsFile = path.join(outputDir, 'relationships.json');

console.log(`Processing relationships file: ${relationshipsFile}`);

// Read the relationships file
let relationships;
try {
  const data = fs.readFileSync(relationshipsFile, 'utf8');
  relationships = JSON.parse(data);
  console.log(`Read ${relationships.length} relationships from file`);
} catch (error) {
  console.error(`Error reading relationships file: ${error.message}`);
  process.exit(1);
}

// Process the relationships to remove complex properties
const processedRelationships = relationships.map(rel => {
  // Create a new object with only primitive properties
  const processed = { ...rel };
  
  // Remove complex properties that Neo4j can't handle
  if (rel.type === 'CALLS' && processed.callLocations) {
    // Replace callLocations with separate arrays for lines and columns
    processed.callLocationLines = processed.callLocations.map(loc => loc.line);
    processed.callLocationColumns = processed.callLocations.map(loc => loc.column);
    delete processed.callLocations;
  }
  
  if (rel.type === 'REFERENCES_VARIABLE' && processed.referenceLocations) {
    // Replace referenceLocations with separate arrays for lines and columns
    processed.referenceLocationLines = processed.referenceLocations.map(loc => loc.line);
    processed.referenceLocationColumns = processed.referenceLocations.map(loc => loc.column);
    delete processed.referenceLocations;
  }
  
  if (rel.type === 'RENDERS' && processed.renderLocations) {
    // Replace renderLocations with separate arrays for lines and columns
    processed.renderLocationLines = processed.renderLocations.map(loc => loc.line);
    processed.renderLocationColumns = processed.renderLocations.map(loc => loc.column);
    delete processed.renderLocations;
  }
  
  return processed;
});

// Write the processed relationships back to the file
try {
  fs.writeFileSync(relationshipsFile, JSON.stringify(processedRelationships, null, 2));
  console.log(`Successfully processed and saved ${processedRelationships.length} relationships`);
} catch (error) {
  console.error(`Error writing processed relationships file: ${error.message}`);
  process.exit(1);
}

console.log('Done!');