import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const Web3Context = createContext();

// Deployed to amoy testnet
const CONTRACT_ADDRESS = "0x4334149f00203eF1A6ceF6E665c2D8EED5477196";

const contractABI = [
  "event AccessRequested(address indexed doctor, address indexed patient)",
  "event AccessGranted(address indexed patient, address indexed doctor)",
  "event AccessRevoked(address indexed patient, address indexed doctor)",
  "event RecordAdded(address indexed patient, string ipfsHash, string documentType, uint256 timestamp)",
  "function requestAccess(address patient) public",
  "function grantAccess(address doctor) public",
  "function revokeAccess(address doctor) public",
  "function addRecord(address patient, string memory _ipfsHash, string memory _documentType) public",
  "function getRecords(address patient) public view returns (tuple(string ipfsHash, uint256 timestamp, string documentType)[])",
  "function accessRegistry(address, address) public view returns (bool)"
];

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);
        
        const web3Signer = await web3Provider.getSigner();
        setSigner(web3Signer);
        
        const web3Contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, web3Signer);
        setContract(web3Contract);
      } catch (error) {
        console.error("Error connecting to MetaMask", error);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          // Re-initialize provider on account change
          connectWallet();
        } else {
          setAccount('');
        }
      });
    }
  }, []);

  return (
    <Web3Context.Provider value={{ account, connectWallet, contract, provider }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);
