import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Documents from './pages/Documents';
import Editor from './pages/Editor';
import './App.css';

function App() {
  const token = localStorage.getItem('token');
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/documents" element={token ? <Documents /> : <Navigate to="/login" />} />
        <Route path="/editor/:id" element={token ? <Editor /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={token ? "/documents" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
