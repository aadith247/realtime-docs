import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
// @ts-ignore
import html2pdf from 'html2pdf.js';

function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('Untitled Document');
  const [connected, setConnected] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('EDITOR');
  const wsRef = useRef<WebSocket | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('token');
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    // Fetch document title and content
    axios.get(`http://localhost:3001/api/documents/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setTitle(res.data.title || 'Untitled Document');
    }).catch(err => {
      console.error(err);
      navigate('/documents');
    });

    // Connect WebSocket
    const ws = new WebSocket('ws://localhost:3002');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WS connected');
      ws.send(JSON.stringify({
        type: 'join',
        docId: id,
        token: token
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WS received:', data);

      if (data.type === 'joined') {
        if (editorRef.current) {
          editorRef.current.innerHTML = data.content || '';
        }
        setConnected(true);
      } else if (data.type === 'chat') {
        isRemoteUpdate.current = true;
        if (editorRef.current) {
          editorRef.current.innerHTML = data.content || '';
        }
        isRemoteUpdate.current = false;
      } else if (data.type === 'error') {
        console.error('WS Error:', data.message);
      }
    };

    ws.onclose = () => {
      console.log('WS disconnected');
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [id, token, navigate]);

  const handleInput = () => {
    if (isRemoteUpdate.current) return;
    const content = editorRef.current?.innerHTML || '';
    sendContent(content);
  };

  const sendContent = (content: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        docId: id,
        content
      }));
    }
  };

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
  };

  const saveTitle = async () => {
    try {
      await axios.patch(`http://localhost:3001/api/documents/${id}`, 
        { title },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const exportPDF = () => {
    if (!editorRef.current) return;
    
    const opt = {
      margin: 0.75,
      filename: `${title || 'document'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(editorRef.current).save();
  };

  const shareDocument = async () => {
    if (!shareEmail) return;
    try {
      await axios.post(`http://localhost:3001/api/documents/${id}/share`, 
        { email: shareEmail, role: shareRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Document shared!');
      setShowShareModal(false);
      setShareEmail('');
      setShareRole('EDITOR');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Share failed');
    }
  };

  return (
    <div className="editor-container">
      {/* Header */}
      <div className="editor-header">
        <div className="doc-icon" onClick={() => navigate('/documents')} title="Back to Documents">
          📄
        </div>
        
        <div className="doc-title-section">
          <input 
            type="text"
            className="doc-title"
            value={title}
            onChange={handleTitleChange}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
          />
        </div>

        <div className="header-right">
          <div className="status-indicator">
            <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
            {connected ? 'All changes saved' : 'Connecting...'}
          </div>
          <button className="share-btn" onClick={() => setShowShareModal(true)}>Share</button>
          <div className="user-avatar">U</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-group">
          <button onClick={() => formatText('undo')} title="Undo">↩</button>
          <button onClick={() => formatText('redo')} title="Redo">↪</button>
        </div>
        
        <span className="divider" />
        
        <div className="toolbar-group">
          <select onChange={(e) => formatText('fontSize', e.target.value)} defaultValue="3" title="Font size">
            <option value="1">8</option>
            <option value="2">10</option>
            <option value="3">12</option>
            <option value="4">14</option>
            <option value="5">18</option>
            <option value="6">24</option>
            <option value="7">36</option>
          </select>
        </div>
        
        <span className="divider" />
        
        <div className="toolbar-group">
          <button onClick={() => formatText('bold')} title="Bold (Ctrl+B)"><b>B</b></button>
          <button onClick={() => formatText('italic')} title="Italic (Ctrl+I)"><i>I</i></button>
          <button onClick={() => formatText('underline')} title="Underline (Ctrl+U)"><u>U</u></button>
          <button onClick={() => formatText('strikeThrough')} title="Strikethrough"><s>S</s></button>
        </div>
        
        <span className="divider" />
        
        <div className="toolbar-group">
          <button onClick={() => formatText('insertUnorderedList')} title="Bullet list">•≡</button>
          <button onClick={() => formatText('insertOrderedList')} title="Numbered list">1≡</button>
        </div>
        
        <span className="divider" />
        
        <div className="toolbar-group">
          <button onClick={() => formatText('justifyLeft')} title="Align left">≡←</button>
          <button onClick={() => formatText('justifyCenter')} title="Align center">≡⋯</button>
          <button onClick={() => formatText('justifyRight')} title="Align right">≡→</button>
        </div>
        
        <button onClick={exportPDF} className="export-btn" title="Export as PDF">
          ↓ PDF
        </button>
      </div>

      {/* Editor Area */}
      <div className="editor-area">
        <div
          ref={editorRef}
          className="editor-content"
          contentEditable={connected}
          onInput={handleInput}
          data-placeholder="Type here..."
        />
      </div>

      {/* Share Modal */}
      {showShareModal && (
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
              <button onClick={() => setShowShareModal(false)} className="cancel-btn">
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

export default Editor;
