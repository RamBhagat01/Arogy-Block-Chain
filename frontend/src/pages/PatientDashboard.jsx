import React, { useState, useEffect } from 'react';
import QRCodeModule from 'react-qr-code';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import { uploadToIPFS } from '../utils/ipfs';
import { UploadCloud, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from '../components/Toast';

// Dedicated read-only provider for event scanning — bypasses MetaMask RPC limits
const AMOY_RPC = "https://rpc-amoy.polygon.technology/";
const readProvider = new ethers.JsonRpcProvider(AMOY_RPC);

const CONTRACT_ADDRESS = "0x4334149f00203eF1A6ceF6E665c2D8EED5477196";
const eventABI = [
  "event AccessRequested(address indexed doctor, address indexed patient)",
  "event AccessGranted(address indexed patient, address indexed doctor)",
  "function accessRegistry(address, address) public view returns (bool)"
];
const readContract = new ethers.Contract(CONTRACT_ADDRESS, eventABI, readProvider);

const PatientDashboard = () => {
  const { account, contract, provider } = useWeb3();
  const [requests, setRequests] = useState([]);
  const [approvedDoctors, setApprovedDoctors] = useState([]);

  useEffect(() => {
    if (!contract || !account || !provider) return;

    let isMounted = true;
    let lastCheckedBlock = 0;
    const LOOKBACK = 5000; // scan last ~5000 blocks (~2.5 hrs on Amoy)

    const fetchRequests = async () => {
      try {
        console.log("[ArogyaChain] Scanning for AccessRequested events for patient:", account);

        const currentBlock = await readProvider.getBlockNumber();
        let startBlock = lastCheckedBlock === 0
          ? Math.max(0, currentBlock - LOOKBACK)
          : lastCheckedBlock + 1;

        if (startBlock > currentBlock) return;

        console.log(`[ArogyaChain] Scanning blocks ${startBlock} → ${currentBlock} (${currentBlock - startBlock} blocks)`);

        const filter = readContract.filters.AccessRequested(null, account);
        let allEvents = [];

        // Strategy 1: Try a single large query (many RPCs support this)
        try {
          allEvents = await readContract.queryFilter(filter, startBlock, currentBlock);
          console.log(`[ArogyaChain] Single-query found ${allEvents.length} events`);
        } catch (singleErr) {
          console.warn("[ArogyaChain] Single query failed, falling back to chunked scan:", singleErr.message);

          // Strategy 2: Chunked scan with per-chunk error handling
          const chunkSize = 200;
          for (let i = startBlock; i <= currentBlock; i += chunkSize) {
            const toBlock = Math.min(i + chunkSize - 1, currentBlock);
            try {
              const events = await readContract.queryFilter(filter, i, toBlock);
              allEvents = allEvents.concat(events);
            } catch (chunkErr) {
              console.warn(`[ArogyaChain] Chunk ${i}-${toBlock} failed:`, chunkErr.message);
              // Continue scanning other chunks instead of aborting
            }
          }
          console.log(`[ArogyaChain] Chunked scan found ${allEvents.length} events total`);
        }

        lastCheckedBlock = currentBlock;

        if (!isMounted || allEvents.length === 0) {
          console.log("[ArogyaChain] No AccessRequested events found in range");
          return;
        }

        const pendingDoctors = new Set();
        for (let i = allEvents.length - 1; i >= 0; i--) {
          pendingDoctors.add(allEvents[i].args[0]);
        }

        console.log(`[ArogyaChain] Found ${pendingDoctors.size} unique doctor(s) requesting access`);

        // Get rejected list from local storage
        const rejected = JSON.parse(localStorage.getItem('rejected_' + account) || '[]');

        const validRequests = [];
        for (const doctor of pendingDoctors) {
          // Check if access is already granted or doctor is rejected
          try {
            const hasAccess = await readContract.accessRegistry(account, doctor);
            if (!hasAccess && !rejected.includes(doctor)) {
              validRequests.push({ doctor, time: new Date().toLocaleTimeString() });
              console.log(`[ArogyaChain] Pending request from doctor: ${doctor}`);
            }
          } catch (accessErr) {
            console.warn(`[ArogyaChain] Error checking access for ${doctor}:`, accessErr.message);
            // Still show the request if we can't verify access status
            if (!rejected.includes(doctor)) {
              validRequests.push({ doctor, time: new Date().toLocaleTimeString() });
            }
          }
        }

        if (validRequests.length > 0 && isMounted) {
          console.log(`[ArogyaChain] Displaying ${validRequests.length} pending request(s)`);
          setRequests(prev => {
            const newReqs = [...prev];
            validRequests.forEach(req => {
              if (!newReqs.find(r => r.doctor === req.doctor)) {
                newReqs.push(req);
              }
            });
            return newReqs;
          });
        }
      } catch (err) {
        console.error("[ArogyaChain] Error fetching requests:", err);
      }
    };

    fetchRequests(); // Initial fetch
    
    // Poll every 8 seconds to avoid rate limits on free RPC
    const interval = setInterval(fetchRequests, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [contract, account, provider]);

  // Sync approved doctors from local cache & blockchain
  useEffect(() => {
    if (!contract || !account) return;
    
    let isMounted = true;

    const syncApprovedDoctors = async () => {
      try {
        const cached = localStorage.getItem('approved_' + account);
        let knownDoctors = cached ? JSON.parse(cached) : [];
        
        // Fetch recent AccessGranted events using dedicated RPC
        try {
          const currentBlock = await readProvider.getBlockNumber();
          const startBlock = Math.max(0, currentBlock - 5000);
          const filter = readContract.filters.AccessGranted(account, null);
          
          try {
            const events = await readContract.queryFilter(filter, startBlock, currentBlock);
            events.forEach(e => {
              if (e.args && e.args[1] && !knownDoctors.includes(e.args[1])) {
                knownDoctors.push(e.args[1]);
              }
            });
          } catch (queryErr) {
            console.warn("[ArogyaChain] AccessGranted query failed:", queryErr.message);
          }
        } catch (blockErr) {
          console.warn("[ArogyaChain] Could not get block number for doctor sync:", blockErr.message);
        }

        // Verify they still have access via the contract
        const activeDoctors = [];
        for (const doctor of knownDoctors) {
          try {
            const hasAccess = await readContract.accessRegistry(account, doctor);
            if (hasAccess) {
              activeDoctors.push(doctor);
            }
          } catch {
            // If we can't verify, keep them in the list
            activeDoctors.push(doctor);
          }
        }

        if (isMounted) {
          // Remove duplicates
          const uniqueActive = Array.from(new Set(activeDoctors));
          setApprovedDoctors(uniqueActive);
          localStorage.setItem('approved_' + account, JSON.stringify(uniqueActive));
        }
      } catch (err) {
        console.error("[ArogyaChain] Error syncing approved doctors:", err);
      }
    };

    syncApprovedDoctors();
    // Re-check periodically
    const syncInterval = setInterval(syncApprovedDoctors, 15000);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
    };
  }, [contract, account, provider]);

  const approveAccess = async (doctor) => {
    try {
      const tx = await contract.grantAccess(doctor);
      await tx.wait();
      toast.success(`Access granted to doctor: ${doctor}`);
      setRequests(reqs => reqs.filter(r => r.doctor !== doctor));
      
      const updated = Array.from(new Set([...approvedDoctors, doctor]));
      setApprovedDoctors(updated);
      localStorage.setItem('approved_' + account, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
      toast.error("Error granting access");
    }
  };

  const rejectAccess = (doctor) => {
    const rejected = JSON.parse(localStorage.getItem('rejected_' + account) || '[]');
    if (!rejected.includes(doctor)) {
      rejected.push(doctor);
      localStorage.setItem('rejected_' + account, JSON.stringify(rejected));
    }
    setRequests(reqs => reqs.filter(r => r.doctor !== doctor));
    toast.info(`Request from ${doctor} rejected`, "Access Rejected");
  };

  const revokeAccess = async (doctor) => {
    try {
      const tx = await contract.revokeAccess(doctor);
      await tx.wait();
      toast.success(`Access revoked from doctor: ${doctor}`);
      
      const updated = approvedDoctors.filter(d => d !== doctor);
      setApprovedDoctors(updated);
      localStorage.setItem('approved_' + account, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
      toast.error("Error revoking access");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="grid-2">
        <div className="glass-panel">
          <h2 className="title" style={{ fontSize: '1.8rem' }}>Patient's QR Code</h2>
          <p className="subtitle" style={{ fontSize: '0.9rem' }}>Show this to your doctor to grant access.</p>
          
          <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.5rem' }}>
            {(() => {
              const QR = QRCodeModule.QRCode || QRCodeModule.default || QRCodeModule;
              return <QR value={account || "No Account"} size={200} />;
            })()}
          </div>
          <p className="address-chip">
            {account}
          </p>
        </div>

        <div className="glass-panel">
          <h2 className="title" style={{ fontSize: '1.8rem' }}>Incoming Requests</h2>
          <p className="subtitle" style={{ fontSize: '0.9rem' }}>Approve access for your medical records.</p>
          
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
              <Clock size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <p>No pending access requests.</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {requests.map((req, i) => (
                <li key={i} style={{ 
                  background: 'rgba(0,0,0,0.2)', 
                  padding: '1rem', 
                  borderRadius: '12px', 
                  marginBottom: '1rem',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Doctor Request</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{req.doctor.slice(0,10)}...</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => approveAccess(req.doctor)} 
                        className="btn-primary" 
                        style={{ padding: '0.5rem 1rem', background: '#22c55e', borderColor: '#16a34a' }}
                      >
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button 
                        onClick={() => rejectAccess(req.doctor)} 
                        className="btn-secondary" 
                        style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderColor: '#2563eb' }}
                      >
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ width: '100%' }}>
        <h2 className="title" style={{ fontSize: '1.8rem' }}>Active Accesses</h2>
        <p className="subtitle" style={{ fontSize: '0.9rem' }}>Doctors who currently have access to your records.</p>

        {approvedDoctors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
            <p>No doctors currently have access to your records.</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
            {approvedDoctors.map((doctor, i) => (
              <li key={i} style={{ 
                background: 'rgba(167, 139, 250, 0.1)', 
                padding: '1rem', 
                borderRadius: '12px', 
                border: '1px solid rgba(167, 139, 250, 0.3)',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                minWidth: '300px',
                maxWidth: '420px',
                flex: '1 1 300px'
              }}>
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Doctor</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{doctor.slice(0,15)}...</span>
                </div>
                <button 
                  onClick={() => revokeAccess(doctor)} 
                  className="btn-secondary" 
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: 'transparent',
                    borderColor: '#ef4444',
                    color: '#ef4444'
                  }}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
