import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useWeb3 } from './context/Web3Context';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import { Activity, ShieldCheck, Sun, Moon, CheckCircle, Stethoscope, UserRound } from 'lucide-react';
import { ToastContainer } from './components/Toast';
import './index.css';

function App() {
  const { account, connectWallet } = useWeb3();
  const [role, setRole] = React.useState(null);
  const [theme, setTheme] = React.useState('dark');

  React.useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const ThemeButton = () => (
    <button 
      className="btn-secondary theme-toggle" 
      onClick={toggleTheme} 
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#fbbf24" />}
    </button>
  );

  if (!role) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <ToastContainer />
        <div className="page-theme-control"><ThemeButton /></div>
        <Activity color="#a78bfa" size={48} style={{ marginBottom: '0.5rem' }} />
        <h1 className="title" style={{ marginBottom: '1.5rem', fontSize: '2rem' }}>ArogyaChain Portal</h1>
        <div className="grid-2" style={{ width: '100%' }}>
          <div className="glass-panel animate-fade-in" style={{ textAlign: 'center', cursor: 'pointer', padding: '1.5rem' }} onClick={() => setRole('patient')}>
            <h2 className="title" style={{ fontSize: '1.75rem' }}>Patient</h2>
            <p className="subtitle" style={{ marginBottom: 0 }}>Manage my identity and approve access</p>
          </div>
          <div className="glass-panel animate-fade-in" style={{ textAlign: 'center', cursor: 'pointer', padding: '1.5rem' }} onClick={() => setRole('doctor')}>
            <h2 className="title" style={{ fontSize: '1.75rem' }}>Doctor</h2>
            <p className="subtitle" style={{ marginBottom: 0 }}>Access records and upload new reports</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="container">
        <ToastContainer />
        <div className="page-theme-control"><ThemeButton /></div>
        <nav className="nav animate-fade-in">
          <div className="brand-block">
            <Activity color="#a78bfa" size={32} />
            <div className="brand-copy">
              <h1 className="title brand-title">ArogyaChain</h1>
            </div>
          </div>
          <div className="nav-buttons">
            {!account && (
              <button className="btn-secondary nav-action" onClick={() => setRole(null)}>
                Change Role
              </button>
            )}
            {account ? (
              <span className="wallet-connected">
                <CheckCircle size={16} />
                MetaMask Wallet Connected
              </span>
            ) : (
              <button className="btn-primary nav-action" onClick={connectWallet}>
                Connect Wallet
              </button>
            )}
          </div>
        </nav>

        {!account ? (
          <>
            <div className="role-indicator animate-fade-in">
              {role === 'doctor' ? <Stethoscope size={18} /> : <UserRound size={18} />}
              <span>{role === 'doctor' ? 'Doctor' : 'Patient'}</span>
            </div>
            <div className="glass-panel animate-fade-in" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <ShieldCheck color="#a78bfa" size={64} style={{ marginBottom: '1rem' }} />
              <h2 className="title">Secure Health Records</h2>
              <p className="subtitle">Please connect your MetaMask wallet to enter as a {role}.</p>
              <button className="btn-primary" onClick={connectWallet} style={{ fontSize: '1.2rem' }}>
                Connect Wallet
              </button>
            </div>
          </>
        ) : (
          <div className="animate-fade-in">
             <Routes>
                <Route path="*" element={role === 'patient' ? <PatientDashboard /> : <DoctorDashboard />} />
             </Routes>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
