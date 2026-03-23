import React, { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';

const Dashboard = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [vaultData, setVaultData] = useState(null);
    const [decryptedIntel, setDecryptedIntel] = useState(null);
    const [logistics, setLogistics] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [qrCode, setQrCode] = useState(null);
    const [signMessage, setSignMessage] = useState('');
    const [signatureResult, setSignatureResult] = useState(null);
    const [verifyMessage, setVerifyMessage] = useState('');
    const [verifySignature, setVerifySignature] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Messaging State
    const [messages, setMessages] = useState([]);
    const [recipients, setRecipients] = useState([]);
    const [recipient, setRecipient] = useState('');
    const [messageContent, setMessageContent] = useState('');
    const [decryptedMessages, setDecryptedMessages] = useState({}); // Map of msgId -> content

    useEffect(() => {
        if (user.role >= 1) fetchQr();
        if (user.role >= 2) fetchLogistics();
    }, [user]);

    const fetchQr = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/me', { credentials: 'include' });
            const data = await res.json();
            if (data.qrCode) setQrCode(data.qrCode);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchLogistics = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/logistics', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setLogistics(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchUsers = async () => {
        setSuccessMsg('');
        setError('');
        try {
            const res = await fetch('http://localhost:3001/api/users', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setUsersList(data.users);
            } else {
                setError('Failed to fetch personnel data.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchVault = async () => {
        setError('');
        try {
            const res = await fetch('http://localhost:3001/api/vault', { credentials: 'include' });
            if (res.status === 403) {
                setError('Access Denied: Insufficient clearance level.');
                return;
            }
            const data = await res.json();
            setVaultData(data);
        } catch (err) {
            setError('Connection Error');
        }
    };

    const decryptVault = () => {
        if (!vaultData) return;
        const key = CryptoJS.enc.Hex.parse(vaultData.key);
        const iv = CryptoJS.enc.Hex.parse(vaultData.iv);

        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: CryptoJS.enc.Hex.parse(vaultData.encryptedData) },
            key,
            { iv: iv }
        );
        setDecryptedIntel(decrypted.toString(CryptoJS.enc.Utf8));
    };

    const handleSign = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message: signMessage })
            });
            const data = await res.json();
            setSignatureResult(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleVerify = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message: verifyMessage, signature: verifySignature })
            });
            const data = await res.json();
            setVerificationResult(data);
        } catch (err) {
            console.error(err);
        }
    };

    const updateUserRole = async (userId, newRole) => {
        setSuccessMsg('');
        setError('');
        try {
            const res = await fetch(`http://localhost:3001/api/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role: newRole })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMsg(data.message);
                fetchUsers(); // Refresh list
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Update Failed');
        }
    };

    // --- MESSAGING LOGIC ---
    const fetchRecipients = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/recipients', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setRecipients(data.users);
                if (data.users.length > 0) setRecipient(data.users[0].username);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/messages', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSendMessage = async () => {
        setSuccessMsg('');
        setError('');
        try {
            const res = await fetch('http://localhost:3001/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ receiver: recipient, content: messageContent })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMsg(data.message);
                setMessageContent('');
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to send message');
        }
    };

    const handleDecryptMessage = async (msgId) => {
        try {
            const res = await fetch('http://localhost:3001/api/messages/decrypt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ messageId: msgId })
            });
            const data = await res.json();
            if (res.ok) {
                setDecryptedMessages(prev => ({ ...prev, [msgId]: data.content }));
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const getRoleBadge = (roleName) => {
        const roleMap = {
            'COMMISSIONER': 'badge-commissioner',
            'INSPECTOR': 'badge-inspector',
            'CONSTABLE': 'badge-constable'
        };
        return roleMap[roleName] || 'badge-constable';
    };

    return (
        <div className="dashboard-grid">
            {/* SIDEBAR */}
            <aside className="glass-panel" style={{ height: '85vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div className="emblem" style={{ width: '40px', height: '40px', fontSize: '1.25rem' }}>
                        🛡️
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '0.05em' }} className="text-gradient">VANGUARD</h1>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Command Portal</p>
                    </div>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <NavBtn
                        icon="📊"
                        label="Overview"
                        active={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                    />
                    {user.role >= 3 && (
                        <NavBtn
                            icon="👥"
                            label="Personnel"
                            active={activeTab === 'personnel'}
                            onClick={() => { setActiveTab('personnel'); fetchUsers(); }}
                        />
                    )}
                    {user.role >= 1 && (
                        <NavBtn
                            icon="🪪"
                            label="My Profile"
                            active={activeTab === 'record'}
                            onClick={() => setActiveTab('record')}
                        />
                    )}
                    {user.role >= 2 && (
                        <NavBtn
                            icon="📦"
                            label="Logistics"
                            active={activeTab === 'logistics'}
                            onClick={() => setActiveTab('logistics')}
                        />
                    )}
                    {user.role >= 3 && (
                        <NavBtn
                            icon="🔒"
                            label="Vault"
                            active={activeTab === 'vault'}
                            onClick={() => { setActiveTab('vault'); fetchVault(); }}
                        />
                    )}
                    {user.role >= 3 && (
                        <NavBtn
                            icon="✍️"
                            label="Signatures"
                            active={activeTab === 'sign'}
                            onClick={() => setActiveTab('sign')}
                        />
                    )}
                    <NavBtn
                        icon="✅"
                        label="Verification"
                        active={activeTab === 'verify'}
                        onClick={() => setActiveTab('verify')}
                    />
                    <NavBtn
                        icon="📨"
                        label="Secure Comms"
                        active={activeTab === 'messaging'}
                        onClick={() => {
                            setActiveTab('messaging');
                            fetchMessages();
                            fetchRecipients();
                        }}
                    />
                </nav>

                <div style={{ marginTop: 'auto' }}>
                    <div style={{
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Current Session</div>
                        <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</div>
                    </div>
                    <button onClick={onLogout} className="btn btn-logout" style={{ width: '100%' }}>
                        Terminate Session
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main>
                {/* HEADER */}
                <header className="glass-panel" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 2rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>👋</span>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Welcome back,</div>
                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{user.username}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className={`status-badge ${user.role >= 3 ? 'danger' : user.role === 2 ? 'info' : 'warning'}`}>
                            {user.roleName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: '600' }}>
                            <span className="status-dot status-online"></span>
                            SECURE C-LINQ
                        </div>
                    </div>
                </header>

                <div className="glass-panel animate-fade-in" style={{ padding: '2rem', minHeight: '600px' }}>

                    {activeTab === 'overview' && (
                        <div>
                            <div style={{ marginBottom: '2rem' }}>
                                <h2 className="text-gradient" style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Command Overview</h2>
                                <p style={{ color: 'var(--text-muted)' }}>System metrics and operational status.</p>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '1.5rem'
                            }}>
                                <StatusCard
                                    icon="🟢"
                                    label="Server Matrix"
                                    value="OPERATIONAL"
                                    color="var(--success)"
                                />
                                <StatusCard
                                    icon="🛡️"
                                    label="Threat Level"
                                    value="LOW"
                                    color="var(--accent)"
                                />
                                <StatusCard
                                    icon="📡"
                                    label="Encrypted Uplink"
                                    value="ESTABLISHED"
                                    color="var(--primary)"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'personnel' && (
                        <div>
                            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ color: 'var(--accent)' }}>👥</span> Performance roster
                            </h2>

                            {error && <div className="alert alert-error"><span>⚠️</span>{error}</div>}
                            {successMsg && <div className="alert alert-success"><span>✓</span>{successMsg}</div>}

                            <div style={{ overflowX: 'auto' }}>
                                <table className="cyber-table">
                                    <thead>
                                        <tr>
                                            <th>Officer ID</th>
                                            <th>Clearance</th>
                                            <th>Command Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usersList.map(u => (
                                            <tr key={u._id}>
                                                <td style={{ fontWeight: '500' }}>{u.username}</td>
                                                <td>
                                                    <span className={`status-badge ${u.role === 3 ? 'danger' : u.role === 2 ? 'info' : 'warning'}`}>
                                                        {u.roleName}
                                                    </span>
                                                </td>
                                                <td>
                                                    {u.role === 1 && (
                                                        <button
                                                            onClick={() => updateUserRole(u._id, 2)}
                                                            className="btn btn-primary"
                                                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                                                        >
                                                            Promote / Inspector
                                                        </button>
                                                    )}
                                                    {u.role === 2 && (
                                                        <button
                                                            onClick={() => updateUserRole(u._id, 1)}
                                                            className="btn btn-logout"
                                                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                                                        >
                                                            Demote / Constable
                                                        </button>
                                                    )}
                                                    {u.role === 3 && <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>RESTRICTED</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'record' && (
                        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
                            <div style={{
                                background: '#fff',
                                padding: '1rem',
                                borderRadius: 'var(--radius-sm)',
                                height: 'fit-content'
                            }}>
                                {qrCode ? (
                                    <img src={qrCode} alt="ID QR" style={{ width: '200px', height: '200px' }} />
                                ) : (
                                    <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>Generating...</div>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>{user.username.toUpperCase()}</h2>
                                <DetailRow label="Rank Designation" value={user.roleName} />
                                <DetailRow label="Clearance Tier" value={`TIER-${user.role}`} />
                                <DetailRow label="Account Status" value="ACTIVE DUTY" />
                                <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(6, 182, 212, 0.05)', borderLeft: '3px solid var(--accent)' }}>
                                    <p style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>ℹ️ Officer is authorized for {user.role === 1 ? 'Standard' : user.role === 2 ? 'Logistics & Standard' : 'All'} Operations.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'logistics' && (
                        <div>
                            <h2 style={{ marginBottom: '1.5rem' }}>📦 Logistics Inventory</h2>
                            <table className="cyber-table">
                                <thead>
                                    <tr>
                                        <th>Asset ID</th>
                                        <th>Description</th>
                                        <th>Stock Level</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logistics.map(item => (
                                        <tr key={item.id}>
                                            <td className="mono" style={{ color: 'var(--accent)' }}>#{item.id.toString().padStart(4, '0')}</td>
                                            <td>{item.item}</td>
                                            <td style={{ fontWeight: '700' }}>{item.quantity}</td>
                                            <td>
                                                <span className={`status-badge ${item.status === 'Low' ? 'danger' : 'success'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'vault' && (
                        <div>
                            <h2 style={{ marginBottom: '1.5rem', color: 'var(--warning)' }}>⚠️ Classified Vault</h2>
                            {error && <div className="alert alert-error">{error}</div>}

                            {vaultData ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <div>
                                        <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>ENCRYPTED PAYLOAD</div>
                                        <div style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            padding: '1.5rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontFamily: 'monospace',
                                            wordBreak: 'break-all',
                                            color: 'var(--text-dim)'
                                        }}>
                                            {vaultData.encryptedData}
                                        </div>
                                    </div>

                                    <button onClick={decryptVault} className="btn btn-primary" style={{ width: 'fit-content' }}>
                                        Execute Decryption Protocol
                                    </button>

                                    {decryptedIntel && (
                                        <div className="alert alert-success" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ fontWeight: '700', letterSpacing: '0.05em' }}>DECRYPTION SUCCESSFUL</div>
                                            <div className="mono" style={{ fontSize: '1.1rem' }}>{decryptedIntel}</div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                !error && <p className="animate-pulse">Establishing secure handshake...</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'sign' && (
                        <div>
                            <h2>✍️ Digital Signature Authority</h2>
                            <div className="input-group" style={{ marginTop: '1.5rem' }}>
                                <label className="input-label">Content to Sign</label>
                                <textarea
                                    className="input-field"
                                    style={{ height: '150px', resize: 'vertical' }}
                                    value={signMessage}
                                    onChange={e => setSignMessage(e.target.value)}
                                    placeholder="Enter directive content..."
                                />
                            </div>
                            <button onClick={handleSign} className="btn btn-primary">Generate Hash & Signature</button>

                            {signatureResult && (
                                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <div className="input-label">SHA-256 HASH</div>
                                        <div className="mono" style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>{signatureResult.hash}</div>
                                    </div>
                                    <div>
                                        <div className="input-label">DIGITAL SIGNATURE</div>
                                        <div className="mono" style={{ color: 'var(--success)', wordBreak: 'break-all' }}>{signatureResult.signature}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'verify' && (
                        <div>
                            <h2>✅ Integrity Verification</h2>
                            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label className="input-label">Original Content</label>
                                    <textarea
                                        className="input-field"
                                        style={{ height: '100px' }}
                                        value={verifyMessage}
                                        onChange={e => setVerifyMessage(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="input-label">Digital Signature</label>
                                    <input
                                        type="text"
                                        className="input-field mono"
                                        value={verifySignature}
                                        onChange={e => setVerifySignature(e.target.value)}
                                    />
                                </div>
                                <button onClick={handleVerify} className="btn btn-primary" style={{ width: 'fit-content' }}>Run Verification</button>

                                {verificationResult && (
                                    <div className={`alert ${verificationResult.valid ? 'alert-success' : 'alert-error'}`}>
                                        <span style={{ fontSize: '1.5rem' }}>{verificationResult.valid ? '🛡️' : '🚫'}</span>
                                        <div>
                                            <div style={{ fontWeight: '700' }}>{verificationResult.valid ? 'VERIFIED PRESERVED' : 'INTEGRITY COMPROMISED'}</div>
                                            <div style={{ fontSize: '0.9rem' }}>{verificationResult.valid ? 'The document is authentic and unmodified.' : 'Signature mismatch. The document has been tampered with.'}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'messaging' && (
                        <div>
                            <h2 style={{ marginBottom: '1.5rem' }}>📨 Secure Uplink</h2>
                            {error && <div className="alert alert-error">{error}</div>}
                            {successMsg && <div className="alert alert-success">{successMsg}</div>}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                                <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--accent)' }}>COMPOSE ENCRYPTED PACKET</h3>
                                    <div className="input-group">
                                        <label className="input-label">Recipient Channel</label>
                                        <select
                                            className="input-field"
                                            value={recipient}
                                            onChange={e => setRecipient(e.target.value)}
                                        >
                                            {recipients.map(r => <option key={r._id} value={r.username}>{r.username.toUpperCase()} [{r.roleName}]</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Payload</label>
                                        <textarea
                                            className="input-field"
                                            style={{ height: '100px' }}
                                            value={messageContent}
                                            onChange={e => setMessageContent(e.target.value)}
                                            placeholder="Confidential intel..."
                                        />
                                    </div>
                                    <button onClick={handleSendMessage} className="btn btn-primary">Encrypt & Transmit</button>
                                </div>

                                <div>
                                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)' }}>INCOMING TRANSMISSIONS</h3>
                                    {messages.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-dim)' }}>
                                            No packets received.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {messages.map(msg => (
                                                <div key={msg._id} style={{
                                                    padding: '1rem',
                                                    background: 'rgba(0,0,0,0.2)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 'var(--radius-sm)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                                        <span style={{ color: 'var(--accent)', fontWeight: '600' }}>FROM: {msg.sender.toUpperCase()}</span>
                                                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{new Date(msg.timestamp).toLocaleString()}</span>
                                                    </div>

                                                    {decryptedMessages[msg._id] ? (
                                                        <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)' }}>
                                                            <div style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem' }}>✓ DECRYPTED CONTENT</div>
                                                            <div style={{ color: 'var(--text-main)' }}>{decryptedMessages[msg._id]}</div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="mono" style={{
                                                                fontSize: '0.8rem',
                                                                color: 'var(--text-dim)',
                                                                wordBreak: 'break-all',
                                                                marginBottom: '1rem',
                                                                background: '#000',
                                                                padding: '0.75rem'
                                                            }}>
                                                                {msg.encryptedContent}
                                                            </div>
                                                            <button
                                                                onClick={() => handleDecryptMessage(msg._id)}
                                                                className="btn btn-ghost"
                                                                style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}
                                                            >
                                                                Unlock Message
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const NavBtn = ({ icon, label, active, onClick }) => (
    <div
        onClick={onClick}
        className={`nav-item ${active ? 'active' : ''}`}
    >
        <span>{icon}</span>
        <span style={{ fontWeight: '500' }}>{label}</span>
        {active && <span style={{ marginLeft: 'auto', fontSize: '0.5rem' }}>●</span>}
    </div>
);

const DetailRow = ({ label, value }) => (
    <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1rem 0',
        borderBottom: '1px solid var(--border)'
    }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{label}</span>
        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{value}</span>
    </div>
);

const StatusCard = ({ icon, label, value, color }) => (
    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{icon}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{label}</div>
        <div style={{ color: color, fontSize: '1.25rem', fontWeight: '700' }}>{value}</div>
    </div>
);

export default Dashboard;
