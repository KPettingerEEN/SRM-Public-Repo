import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SignIn from './Signin';
import ProtectedRoutes from './ProtectedRoutes';
import Home from './Home';
import Knowledge from './Knowledge';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/home" element={<Home />} />
          <Route path="/knowledge" element={<Knowledge />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;