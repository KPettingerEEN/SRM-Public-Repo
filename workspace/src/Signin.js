import { useState, useEffect } from 'react';
import './App.css';
import AWS from 'aws-sdk';
import { useNavigate } from 'react-router-dom'

AWS.config.update({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
  region: process.env.REACT_APP_AWS_REGION
});
const s3 = new AWS.S3();

function SignIn() {
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [profileData, setProfileData] = useState([]);
const navigate = useNavigate();

useEffect(() => {
    const fetchData = async () => {
    try {
        const params = {
        Bucket: 'logicaladmin.space',
        Key: 'profiles.json',
        };
        const data = await s3.getObject(params).promise();
        const jsonData = JSON.parse(data.Body.toString('utf-8'));
        setProfileData(jsonData || []);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
    };

    fetchData();
}, []);

const handleSignIn = (e) => {
    e.preventDefault();
    const user = profileData.find(
    (profile) => profile.Username === username && profile.Password === password
    );

    if (user) {
      localStorage.setItem('username', username);
      navigate('/home')
    } else {
      alert('Invalid credentials');
    }
};

return (
    <div className="sign-in-form">
    <form onSubmit={handleSignIn}>
        <h2>Eagle Eye Workspace</h2>
        <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        />
        <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Sign In</button>
    </form>
    </div>
);
}

export default SignIn;