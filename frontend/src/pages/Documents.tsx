import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('EDITOR');
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchDocuments = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const createDocument = async () => {
    try {
      const res = await axios.post('http://localhost:3001/api/documents', { title: 'Untitled Document' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/editor/${res.data.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this document?')) return;
    try {
      await axios.delete(`http://localhost:3001/api/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  const openShareModal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareDocId(id);
    setShareEmail('');
    setShareRole('EDITOR');
  };

  const shareDocument = async () => {
    if (!shareDocId || !shareEmail) return;
    try {
      await axios.post(`http://localhost:3001/api/documents/${shareDocId}/share`, 
        { email: shareEmail, role: shareRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Document shared!');
      setShareDocId(null);
      setShareEmail('');
      setShareRole('EDITOR');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Share failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    window.location.reload();
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPreview = (content: string) => {
    const text = content?.replace(/<[^>]*>/g, '') || '';
    return text.substring(0, 200);
  };

  return (
    <div className="documents-container">
      <div className="header">
        <h1>LiveDocs</h1>
        <div className="header-actions">
          <button onClick={createDocument}>+ New</button>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </div>

      <h3 style={{ color: '#202124', fontWeight: 500, marginBottom: 16 }}>Recent documents</h3>
      
      <div className="documents-grid">
        {/* New Document Card */}
        <div className="document-card" onClick={createDocument} style={{ cursor: 'pointer' }}>
          <div className="document-card-preview" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}>
            <span style={{ fontSize: 48, color: 'white' }}>+</span>
          </div>
          <div className="document-card-info">
            <h3>Blank document</h3>
            <p style={{ visibility: 'hidden' }}>placeholder</p>
          </div>
        </div>

        {documents.map((doc) => (
          <div key={doc.id} className="document-card" onClick={() => navigate(`/editor/${doc.id}`)}>
            <div className="document-card-preview">
              {getPreview(doc.content)}
            </div>
            <div className="document-card-info">
              <h3>{doc.title || 'Untitled Document'}</h3>
              <p>{formatDate(doc.updatedAt)}</p>
            </div>
            <div className="doc-actions">
              <button onClick={(e) => openShareModal(doc.id, e)}>Share</button>
              <button onClick={(e) => deleteDocument(doc.id, e)} className="delete-btn">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <p style={{ textAlign: 'center', color: '#5f6368', marginTop: 48 }}>
          No documents yet. Click "+ New" to create one!
        </p>
      )}

      {shareDocId && (
        <div className="modal">
          <div className="modal-content share-modal">
            <h3>Share with people</h3>
            
            <div className="share-input-row">
              <input
                type="email"
                placeholder="Add people and groups"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div className="share-role-row">
              <span className="role-label">Permission:</span>
              <select 
                value={shareRole} 
                onChange={(e) => setShareRole(e.target.value)}
                className="role-select"
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
              </select>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShareDocId(null)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={shareDocument} className="share-btn-primary">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Documents;
