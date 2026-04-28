import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import { Search, FileText, Send, UploadCloud } from 'lucide-react';
import { uploadToIPFS } from '../utils/ipfs';
import { toast } from '../components/Toast';

// Dedicated read-only provider for event scanning — bypasses MetaMask RPC limits
const AMOY_RPC = "https://rpc-amoy.polygon.technology/";
const readProvider = new ethers.JsonRpcProvider(AMOY_RPC);

const CONTRACT_ADDRESS = "0x4334149f00203eF1A6ceF6E665c2D8EED5477196";
const eventABI = [
  "event AccessGranted(address indexed patient, address indexed doctor)",
  "function accessRegistry(address, address) public view returns (bool)"
];
const readContract = new ethers.Contract(CONTRACT_ADDRESS, eventABI, readProvider);

const DoctorDashboard = () => {
  const { contract, account, provider } = useWeb3();
  const [patientAddress, setPatientAddress] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [accessiblePatients, setAccessiblePatients] = useState([]);

  useEffect(() => {
    if (!contract || !account) return;
    
    let isMounted = true;

    const syncAccessiblePatients = async () => {
      try {
        const cached = localStorage.getItem('accessible_' + account);
        let knownPatients = cached ? JSON.parse(cached) : [];
        
        try {
          const currentBlock = await readProvider.getBlockNumber();
          const startBlock = Math.max(0, currentBlock - 5000);
          const filter = readContract.filters.AccessGranted(null, account);
          
          try {
            const events = await readContract.queryFilter(filter, startBlock, currentBlock);
            events.forEach(e => {
              if (e.args && e.args[0] && !knownPatients.includes(e.args[0])) {
                knownPatients.push(e.args[0]);
              }
            });
          } catch (queryErr) {
            console.warn("[ArogyaChain] AccessGranted query failed:", queryErr.message);
          }
        } catch (blockErr) {
          console.warn("[ArogyaChain] Could not get block number:", blockErr.message);
        }

        const activePatients = [];
        for (const patient of knownPatients) {
          try {
            const hasAccess = await readContract.accessRegistry(patient, account);
            if (hasAccess) {
              activePatients.push(patient);
            }
          } catch {
            activePatients.push(patient);
          }
        }

        if (isMounted) {
          const uniqueActive = Array.from(new Set(activePatients));
          setAccessiblePatients(uniqueActive);
          localStorage.setItem('accessible_' + account, JSON.stringify(uniqueActive));
        }
      } catch (err) {
        console.error("[ArogyaChain] Error syncing accessible patients:", err);
      }
    };

    syncAccessiblePatients();
    const syncInterval = setInterval(syncAccessiblePatients, 15000);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
    };
  }, [contract, account, provider]);

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner("reader", { qrbox: { width: 250, height: 250 }, fps: 10 });
      scanner.render(
        (decodedText) => {
          setPatientAddress(decodedText);
          scanner.clear();
          setScanning(false);
        },
        (error) => {
          // Ignore scanning errors
        }
      );

      return () => {
        scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      };
    }
  }, [scanning]);

  const requestAccess = async () => {
    if (!contract || !patientAddress) return;
    try {
      const tx = await contract.requestAccess(patientAddress);
      await tx.wait();
      toast.success('Access request sent. Waiting for patient to approve via Metamask.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send request.');
    }
  };

  const fetchRecords = async (overrideAddress) => {
    const targetAddress = typeof overrideAddress === 'string' ? overrideAddress : patientAddress;
    if (!contract || !targetAddress) return;
    setPatientAddress(targetAddress);
    setLoading(true);
    try {
      const result = await contract.getRecords(targetAddress);
      const parsedRecords = result.map(record => ({
        ipfsHash: record.ipfsHash,
        timestamp: new Date(Number(record.timestamp) * 1000).toLocaleString(),
        type: record.documentType
      }));
      setRecords(parsedRecords);
    } catch (err) {
      console.error(err);
      toast.error('Access denied. Patient has not approved your request yet.');
      setRecords([]);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file || !contract || !patientAddress) return;

    setUploading(true);
    try {
      const type = file.type.includes('pdf') ? "PDF" : "PNG";
      const cid = await uploadToIPFS(file);
      
      const tx = await contract.addRecord(patientAddress, cid, type);
      await tx.wait();
      
      toast.success('Record added securely to the patient public record!');
      setFile(null);
    } catch (error) {
      console.error(error);
      toast.error('Error uploading document');
    }
    setUploading(false);
  };

  return (
    <div className="grid-2">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="glass-panel animate-fade-in">
          <h2 className="title" style={{ fontSize: '1.8rem' }}>Doctor's Scanner</h2>
          <p className="subtitle" style={{ fontSize: '0.9rem' }}>Scan a patient's QR code or enter an address to request access.</p>
          
          {scanning ? (
            <div id="reader" style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}></div>
          ) : (
            <button className="btn-secondary" onClick={() => setScanning(true)} style={{ width: '100%', marginBottom: '1rem' }}>
              Start QR Scanner
            </button>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input 
              type="text" 
              placeholder="0xPatientAddress..." 
              value={patientAddress} 
              onChange={(e) => setPatientAddress(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-secondary" onClick={requestAccess} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <Send size={20} /> Request Access
            </button>
            <button className="btn-primary" onClick={fetchRecords} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <Search size={20} /> Fetch Records
            </button>
          </div>
        </div>

        {patientAddress.length > 0 && (
          <div className="glass-panel animate-fade-in">
            <h2 className="title" style={{ fontSize: '1.8rem' }}>Upload Record</h2>
            <p className="subtitle" style={{ fontSize: '0.9rem' }}>Push new data directly to the patient.</p>
            <form onSubmit={handleFileUpload}>
              <input 
                type="file" 
                accept=".pdf, .png, .jpg" 
                onChange={(e) => setFile(e.target.files[0])} 
              />
              <button type="submit" className="btn-primary" disabled={uploading || !file}>
                {uploading ? 'Processing...' : <><UploadCloud size={20} /> Publish to Blockchain</>}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="glass-panel animate-fade-in">
        <h2 className="title" style={{ fontSize: '1.8rem' }}>Decrypted Records</h2>
        <p className="subtitle" style={{ fontSize: '0.9rem' }}>IPFS files accessible to you.</p>

        {loading ? (
          <p>Querying Polygon blockchain...</p>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
            <FileText size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>No records found or access denied.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {records.map((r, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className="badge">{r.type}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.timestamp}</span>
                </div>
                <p style={{ wordBreak: 'break-all', fontFamily: 'monospace', color: '#a78bfa' }}>
                  ipfs://{r.ipfsHash}
                </p>
                <a href={`https://ipfs.io/ipfs/${r.ipfsHash}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)', marginTop: '1rem', display: 'inline-block', textDecoration: 'underline' }}>
                  View Document
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
