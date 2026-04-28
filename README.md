# NEXUS - Medical Records DApp

A decentralized application for managing medical records on the blockchain. Patients can securely store and share their medical records with doctors.

## Tech Stack

- **Frontend**: React + Vite
- **Smart Contracts**: Solidity + Hardhat
- **Blockchain**: Polygon Amoy Testnet (or local Hardhat node)
- **Web3**: Ethers.js + MetaMask

## Prerequisites

1. **Node.js** (v18+) - [Download](https://nodejs.org/)
2. **MetaMask Browser Extension** - [Download](https://metamask.io/)
3. **Polygon Amoy Testnet** configured in MetaMask

## Project Structure

```
NEXUS/
├── frontend/          # React frontend application
├── web3-contracts/    # Solidity smart contracts
└── README.md
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install smart contract dependencies
cd ../web3-contracts
npm install
```

### 2. Configure Environment Variables

Create `.env` files in both folders:

**web3-contracts/.env:**
```bash
# Your wallet private key (without 0x prefix if needed)
# WARNING: Only use testnet/development accounts, never mainnet with real funds
PRIVATE_KEY=your_private_key_here
```

**frontend/.env:**
```bash
# Pinata API Key for IPFS file uploads
# Get your JWT from: https://app.pinata.cloud/developers/api-keys
VITE_PINATA_JWT=your_pinata_jwt_here
```

> Note: `.env.example` files are included in each folder as templates.

### 3. Deploy Smart Contracts (Optional - Already Deployed)

The contract is already deployed to **Polygon Amoy Testnet** at:
```
Contract Address: 0x4334149f00203eF1A6ceF6E665c2D8EED5477196
```

If you want to deploy to a local Hardhat node or update the address:

```bash
# Start local Hardhat node
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy.js --network hardhat

# Deploy to Amoy testnet
npx hardhat run scripts/deploy.js --network amoy
```

After deploying, update the `CONTRACT_ADDRESS` in:
- [frontend/src/context/Web3Context.jsx](frontend/src/context/Web3Context.jsx)

### 4. Add Polygon Amoy Testnet to MetaMask

Network Details:
- **Network Name**: Polygon Amoy
- **RPC URL**: https://rpc-amoy.polygon.technology/
- **Chain ID**: 80002
- **Symbol**: MATIC
- **Block Explorer**: https://amoy.polygonscan.com/

### 5. Get Testnet MATIC

1. Go to [Polygon Amoy Faucet](https://faucet.polygon.technology/)
2. Enter your wallet address
3. Request testnet MATIC

### 6. Run the Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## Usage

### For Patients

1. Connect your MetaMask wallet
2. Add a medical record (upload document, specify type)
3. Grant access to doctors by their wallet address
4. Revoke access when needed

### For Doctors

1. Connect your MetaMask wallet
2. Request access to a patient's records
3. View records after patient grants access

## Smart Contract Functions

| Function | Description |
|----------|-------------|
| `addRecord` | Add a new medical record (Patient only) |
| `requestAccess` | Request access to patient's records (Doctor) |
| `grantAccess` | Grant access to a doctor (Patient) |
| `revokeAccess` | Revoke access from a doctor (Patient) |
| `getRecords` | Get all records for a patient |

## Troubleshooting

### MetaMask not connecting?
- Make sure MetaMask is installed and unlocked
- Refresh the page and try again

### IPFS upload failing?
- Make sure `VITE_PINATA_JWT` is set in `frontend/.env`
- Get a valid JWT from https://app.pinata.cloud/developers/api-keys

### Transaction failing?
- Ensure you have enough MATIC for gas
- Check you're connected to the correct network (Amoy)

### Contract address issues?
- Verify the contract address in Web3Context.jsx matches the deployed address

## License

ISC