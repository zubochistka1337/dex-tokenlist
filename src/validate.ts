import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { execSync } from 'child_process';

interface Token {
  name: string;
  chainId: number;
  symbol: string;
  decimals: number;
  address: string;
  logoURI: string;
}

interface TokenList {
  name: string;
  version: {
    major: number;
    minor: number;
    patch: number;
  };
  keywords: string[];
  logoURI: string;
  timestamp: string;
  tokens: Token[];
}

const ALLOWED_CHAIN_IDS = [89898, 2786];
const REQUIRED_KEYWORDS = ['apertum', 'tokens', 'trusted'];
const REQUIRED_LIST_LOGO_URI = 'https://assets.apertum.io/assets/apertum-logo.svg';

const ajv = new Ajv();
addFormats(ajv);

// Load schema
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokenlist.schema.json'), 'utf8'));
const validate = ajv.compile(schema);

// Load token list
const tokenList = JSON.parse(fs.readFileSync(path.join(__dirname, '../tokenlist/apertum-tokenlist.json'), 'utf8')) as TokenList;

// Get previous version from git history
let previousTokenList: TokenList | null = null;
try {
  // Check if we're in a PR or direct push
  const isPR = process.env.GITHUB_EVENT_NAME === 'pull_request';
  if (isPR) {
    // For PRs, get the base version
    const baseRef = process.env.GITHUB_BASE_REF || 'main';
    const previousContent = execSync(`git show origin/${baseRef}:tokenlist/apertum-tokenlist.json`, { encoding: 'utf8' });
    previousTokenList = JSON.parse(previousContent) as TokenList;
  } else {
    // For direct push, get the previous commit
    const previousContent = execSync('git show HEAD^:tokenlist/apertum-tokenlist.json', { encoding: 'utf8' });
    previousTokenList = JSON.parse(previousContent) as TokenList;
  }
} catch (error) {
  // Previous version doesn't exist in git history, that's okay
}

export async function validateTokenList() {
  // Validate against schema
  const valid = validate(tokenList);
  if (!valid) {
    console.error('Schema validation failed:', validate.errors);
    process.exit(1);
  }

  // Validate list name
  if (tokenList.name !== 'Apertum Token List') {
    console.error('List name cannot be changed');
    process.exit(1);
  }

  // Validate keywords
  if (!REQUIRED_KEYWORDS.every(keyword => tokenList.keywords.includes(keyword))) {
    console.error('Keywords cannot be changed');
    process.exit(1);
  }

  // Validate list logo URI
  if (tokenList.logoURI !== REQUIRED_LIST_LOGO_URI) {
    console.error('List logoURI cannot be changed');
    process.exit(1);
  }

  // Validate timestamp
  const currentTimestamp = new Date(tokenList.timestamp);
  const now = new Date();
  
  if (currentTimestamp > now) {
    console.error('Timestamp cannot be in the future');
    process.exit(1);
  }

  if (previousTokenList) {
    const previousTimestamp = new Date(previousTokenList.timestamp);
    if (currentTimestamp < previousTimestamp) {
      console.error('Timestamp cannot be older than previous version');
      process.exit(1);
    }
  }

  // Validate version
  if (previousTokenList) {
    const prevVersion = previousTokenList.version;
    const newVersion = tokenList.version;
    
    // Version should only increment
    if (newVersion.major < prevVersion.major || 
        (newVersion.major === prevVersion.major && newVersion.minor < prevVersion.minor) ||
        (newVersion.major === prevVersion.major && newVersion.minor === prevVersion.minor && newVersion.patch <= prevVersion.patch)) {
      console.error('Version must be incremented');
      process.exit(1);
    }
  }

  // Check for duplicate addresses
  const addressMap = new Map<string, string>();
  for (const token of tokenList.tokens) {
    const key = `${token.chainId}-${token.address.toLowerCase()}`;
    if (addressMap.has(key)) {
      console.error(`Duplicate token address found: ${token.address} on chain ${token.chainId}`);
      process.exit(1);
    }
    addressMap.set(key, token.symbol);
  }

  // Check for duplicate names within the same chainId
  const nameMap = new Map<string, string>();
  for (const token of tokenList.tokens) {
    const key = `${token.chainId}-${token.name.toLowerCase()}`;
    if (nameMap.has(key)) {
      console.error(`Duplicate token name found for chain ${token.chainId}: "${token.name}" (used by ${token.symbol} and ${nameMap.get(key)})`);
      process.exit(1);
    }
    nameMap.set(key, token.symbol);
  }

  // Check for duplicate symbols within the same chainId
  const symbolMap = new Map<string, string>();
  for (const token of tokenList.tokens) {
    const key = `${token.chainId}-${token.symbol.toLowerCase()}`;
    if (symbolMap.has(key)) {
      console.error(`Duplicate token symbol found for chain ${token.chainId}: "${token.symbol}" (used by ${token.name} and ${symbolMap.get(key)})`);
      process.exit(1);
    }
    symbolMap.set(key, token.name);
  }

  // Check for duplicate logoURIs within the same chainId
  const logoURIMap = new Map<string, string>();
  for (const token of tokenList.tokens) {
    const key = `${token.chainId}-${token.logoURI}`;
    if (logoURIMap.has(key)) {
      console.error(`Duplicate logoURI found for chain ${token.chainId}: ${token.logoURI} (used by ${token.symbol} and ${logoURIMap.get(key)})`);
      process.exit(1);
    }
    logoURIMap.set(key, token.symbol);
  }

  // Validate existing tokens haven't changed
  if (previousTokenList) {
    const previousTokens = new Map(
      previousTokenList.tokens.map(token => [
        `${token.chainId}-${token.address.toLowerCase()}`,
        token
      ])
    );

    for (const token of tokenList.tokens) {
      const key = `${token.chainId}-${token.address.toLowerCase()}`;
      const previousToken = previousTokens.get(key);
      
      if (previousToken) {
        // Check if any properties have changed
        if (token.name !== previousToken.name ||
            token.symbol !== previousToken.symbol ||
            token.decimals !== previousToken.decimals ||
            token.logoURI !== previousToken.logoURI) {
          console.error(`Existing token ${token.symbol} (${token.address}) has been modified`);
          process.exit(1);
        }
      }
    }
  }

  // Validate chain IDs
  for (const token of tokenList.tokens) {
    if (!ALLOWED_CHAIN_IDS.includes(token.chainId)) {
      console.error(`Invalid chain ID ${token.chainId} for token ${token.symbol}. Only ${ALLOWED_CHAIN_IDS.join(', ')} are allowed.`);
      process.exit(1);
    }
  }

  // Validate logo URIs
  for (const token of tokenList.tokens) {
    try {
      const response = await axios.head(token.logoURI);
      if (response.status !== 200) {
        console.error(`Invalid logo URI for token ${token.symbol}: ${token.logoURI}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Failed to validate logo URI for token ${token.symbol}: ${token.logoURI}`);
      process.exit(1);
    }
  }

  console.log('Token list validation passed successfully!');
}

// Only run if called directly
if (require.main === module) {
  validateTokenList().catch(console.error);
} 