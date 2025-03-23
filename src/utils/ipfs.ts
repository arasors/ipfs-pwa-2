import { createHelia } from 'helia';
import { strings } from '@helia/strings';
import { json } from '@helia/json';
import { unixfs } from '@helia/unixfs';
import { MemoryBlockstore } from 'blockstore-core/memory';
import { MemoryDatastore } from 'datastore-core/memory';
import { CID } from 'multiformats/cid';

// Types for our IPFS operations
export interface IPFSMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
}

// Global variable to hold the Helia node
let heliaNode: any = null;

/**
 * Creates and returns a Helia IPFS node
 */
export const createHeliaNode = async () => {
  if (heliaNode) return heliaNode;
  
  try {
    const blockstore = new MemoryBlockstore();
    const datastore = new MemoryDatastore();

    heliaNode = await createHelia({
      blockstore,
      datastore
    });
    
    console.log('Helia node created successfully');
    return heliaNode;
  } catch (error) {
    console.error('Failed to create Helia node:', error);
    return null;
  }
};

/**
 * Get the Helia string utility for working with string content
 */
export const getStringHelper = async () => {
  const helia = await createHeliaNode();
  if (!helia) return null;
  return strings(helia);
};

/**
 * Get the Helia JSON utility for working with JSON content
 */
export const getJsonHelper = async () => {
  const helia = await createHeliaNode();
  if (!helia) return null;
  return json(helia);
};

/**
 * Get the Helia UnixFS utility for working with files
 */
export const getUnixFsHelper = async () => {
  const helia = await createHeliaNode();
  if (!helia) return null;
  return unixfs(helia);
};

/**
 * Store a message in IPFS
 */
export const storeMessage = async (message: IPFSMessage) => {
  try {
    const jsonFs = await getJsonHelper();
    if (!jsonFs) throw new Error('JSON utility not available');
    
    // Store message in IPFS and get its CID
    const cid = await jsonFs.add(message);
    console.log('Message stored with CID:', cid.toString());
    return cid.toString();
  } catch (error) {
    console.error('Error storing message:', error);
    throw error;
  }
};

/**
 * Retrieve a message from IPFS by its CID
 */
export const retrieveMessage = async (cid: string) => {
  try {
    const jsonFs = await getJsonHelper();
    if (!jsonFs) throw new Error('JSON utility not available');
    
    // Retrieve message from IPFS
    const parsedCid = CID.parse(cid);
    const message = await jsonFs.get(parsedCid);
    return message as IPFSMessage;
  } catch (error) {
    console.error('Error retrieving message:', error);
    throw error;
  }
}; 