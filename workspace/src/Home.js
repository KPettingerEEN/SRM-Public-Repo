import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { CategoryScale, LinearScale, BarElement, Chart } from 'chart.js';
import './App.css';
import AWS from 'aws-sdk';
import mapImage from './SalesMap.png';

AWS.config.update({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
  region: process.env.REACT_APP_AWS_REGION
});
const s3 = new AWS.S3();

function Home() {
  //Set Globals
  const [profileData, setProfileData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTerm2, setSearchTerm2] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('Call History');
  const [callHistory, setCallHistory] = useState([]);
  const [editingCall, setEditingCall] = useState(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showNewCall, setShowNewCall] = useState(false);
  const [showProfileTable, setShowProfileTable] = useState(false);
  const [showMyMetrics, setShowMyMetrics] = useState(false);
  const [callToDelete, setCallToDelete] = useState(null);
  const navigate = useNavigate();
  const itemsPerPage = 20;
  Chart.register(CategoryScale, LinearScale, BarElement);

  const handleSignOut = () => {
    setProfileData();
    localStorage.setItem('username', '');
    navigate ('/')
  };
  //Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {

        const params = {
          Bucket: 'logicaladmin.space',
          Key: 'data.json'
        };
        const data = await s3.getObject(params).promise();
        const jsonData = JSON.parse(data.Body.toString('utf-8'));
        setCallHistory(jsonData.callHistory || []);

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
  
    fetchData();
  }, []);
  useEffect(() => {
    const fetchProfiles = async () => {
      try {

        const params = {
          Bucket: 'logicaladmin.space',
          Key: 'profiles.json'
        };
        const data = await s3.getObject(params).promise();
        const jsonData = JSON.parse(data.Body.toString('utf-8'));
        setProfileData(jsonData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
  
    fetchProfiles();
  }, []);
  //Editing State Effect
  useEffect(() => {
    if (editingCall) {
      setFormData({
        rep: editingCall.rep,
        date: editingCall.date,
        name: editingCall.name,
        company: editingCall.company,
        department: editingCall.department,
        notes: editingCall.notes
      });
    }
  }, [editingCall]);
  //Set Tabs
  const getTabTitle = () => {
    switch (activeTab) {
      case 'Call History':
        return 'Call History';
      case 'Sales Map':
        return 'Sales Map';
      case 'Delayed':
        return 'Delayed';
      case 'Metrics':
        return 'Metrics';
      default:
        return '';
    }
  };
  //Password Reset
  const handlePasswordReset = () => {
    const username = prompt('Please enter your username:');
    if (username) {
      const user = profileData.find((profile) => profile.Username === username);
      if (user) {
        const newPassword = prompt('Please enter your new password:');
        if (newPassword) {
          user.Password = newPassword;
          localStorage.setItem('newPassword', newPassword);
          submitPasswordChange(profileData);
        } else {
          alert('Password reset cancelled.');
        }
      } else {
        alert('Username not found.');
      }
    } else {
      alert('Password reset cancelled.');
    }
  };  
  const submitPasswordChange = async (updatedProfileData) => {
    try {
      const params = {
        Bucket: 'logicaladmin.space',
        Key: 'profiles.json',
        Body: JSON.stringify(updatedProfileData),
        ContentType: 'application/json'
      };
      await s3.putObject(params).promise();
      console.log('Successfully uploaded data');
    } catch (error) {
      console.error('Error uploading data:', error);
    }
  };  
  //Logging and Charting Logic
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  const handleDepartmentChange = (e) => {
    const { value } = e.target;
    setFormData({ ...formData, department: value, specificPerson: '' });
  };
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    company: '',
    relnum: '',
    department: '',
    rep: ''
  });
  const filteredCalls = callHistory.filter(call =>
    Object.values(call).some(value =>
      value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  const sortedCalls = filteredCalls.sort((a, b) => {
    const idA = parseInt(a.id.replace('INB', ''), 10);
    const idB = parseInt(b.id.replace('INB', ''), 10);
    return idB - idA;
  });
  const filteredProfiles = profileData.filter(profile =>
    Object.values(profile).some(value =>
      String(value).toLowerCase().includes(searchTerm2.toLowerCase())
    )
  );  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleCalls = sortedCalls.slice(startIndex, endIndex);
  const visibleProfiles = filteredProfiles.slice(startIndex, endIndex);
  const handleNewCall = () => {
    setShowNewCall(true);
  };
  const closeNewCall = () => {
    setShowNewCall(false);
  };
  const handleMyMetrics = () => {
    setShowMyMetrics(true);
  };
  const closeMyMetrics = () => {
    setShowMyMetrics(false);
  };
  const updateCalls = () => {
    const username = localStorage.getItem('username');
    const currentProfile = profileData.find((profile) => profile.Username === username);
    if (currentProfile) {
      currentProfile.Calls += 1;
      localStorage.setItem('calls', currentProfile.Calls);
      handleUpdateProfile(profileData);
    } else {
      alert('Unable to update Calls for Profile.');
    }
  };
  const updateEmails = () => {
    const username = localStorage.getItem('username');
    const currentProfile = profileData.find(profile => profile.Username === username);
    
    if (currentProfile) {
      const emails = prompt('Enter a Positive number (ex. 3) to add emails, or a Negative number (ex. -3) to subtract emails:');
      if (emails) {
      currentProfile.Emails += parseInt(emails);
      localStorage.setItem('emails', currentProfile.Emails);
      handleUpdateProfile(profileData);
      }
    } else {
      alert('Unable to update Emails for Profile.');
    }
  };  
  const updateCSAT = () => {
    const username = prompt('Please Enter a Valid Profile Username to Update:');
    const currentProfile = profileData.find((profile) => profile.Username === username);
    if (currentProfile) {
      const csat = prompt('Please enter the new CSAT for this Profile:');
      currentProfile.CSAT = parseInt(csat);
      localStorage.setItem('calls', currentProfile.CSAT);
      handleUpdateProfile(profileData);
    } else {
      alert('Unable to update Calls for Profile.');
    }
  };
  const emailData = () => {
    return profileData.map(profile => ({
      label: profile.Username,
      value: profile.Emails
    }));
  };
  const callData = () => {
    return profileData.map(profile => ({
      label: profile.Username,
      value: profile.Calls
    }));
  };
  const csatData = () => {
    return profileData.map(profile => ({
      label: profile.Username,
      value: profile.CSAT
    }));
  };
  const getCurrentProfile = () => {
    const username = localStorage.getItem('username');
    return profileData.find(profile => profile.Username === username);
  };
  const allData = () => {
    const currentProfile = getCurrentProfile();
    
    if (currentProfile) {
      return [
        { label: 'Emails', value: currentProfile.Emails },
        { label: 'Calls', value: currentProfile.Calls }
      ];
    } else {
      return [];
    }
  };
  const allData2 = () => {
    const currentProfile = getCurrentProfile();
    return currentProfile ? currentProfile.FullName : '';
  };
  const allData3 = () => {
    const currentProfile = getCurrentProfile();
    return currentProfile ? currentProfile.CSAT : '';
  };   
  const BarChart = ({ data }) => {
    const chartData = {
      labels: data.map(item => item.label),
      datasets: [
        {
          label: 'Metrics',
          data: data.map(item => item.value),
          backgroundColor: 'rgba(0, 67, 138, 1)',
        },
      ],
    };
  
    return <Bar data={chartData} />;
  };
  const handleProfileTable = () => {
    setShowProfileTable(true);
  };
  const closeProfileTable = () => {
    setShowProfileTable(false);
  };
  const handleUpdateProfile = async (updatedProfileData) => {
    try {
      const params = {
        Bucket: 'logicaladmin.space',
        Key: 'profiles.json',
        Body: JSON.stringify(updatedProfileData),
        ContentType: 'application/json'
      };
      await s3.putObject(params).promise();
      console.log('Successfully uploaded data');
    } catch (error) {
      console.error('Error uploading data:', error);
    }
    setProfileData(profileData);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newCall = {
      id: `INB${String(callHistory.length + 1).padStart(5, '0')}`,
      ...formData
    };
    const updatedCallHistory = [...callHistory, newCall];
    setCallHistory(updatedCallHistory);
    const updatedData = {
      callHistory: updatedCallHistory
    };

    try {
      const params1 = {
        Bucket: 'logicaladmin.space',
        Key: 'data.json',
        Body: JSON.stringify(updatedData),
        ContentType: 'application/json'
      };
      await s3.putObject(params1).promise();
      console.log('Successfully uploaded data');
    } catch (error) {
      console.error('Error uploading data', error);
    }
    updateCalls();
    closeNewCall();
    setFormData({
      rep: '',
      date: '',
      name: '',
      company: '',
      department: ''
    });
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const updatedCall = {
      ...editingCall,
      ...formData
    };
    const updatedCallHistory = callHistory.map(call =>
      call.id === editingCall.id ? updatedCall : call
    );
    setCallHistory(updatedCallHistory);

    const updatedData = {
      callHistory: updatedCallHistory
    };

    try {
      const params = {
        Bucket: 'logicaladmin.space',
        Key: 'data.json',
        Body: JSON.stringify(updatedData),
        ContentType: 'application/json'
      };
      await s3.putObject(params).promise();
      console.log('Successfully uploaded data');
    } catch (error) {
      console.error('Error uploading data:', error);
    }

    setEditingCall(null);
    setFormData({
      rep: '',
      date: '',
      name: '',
      company: '',
      department: ''
    });
  };
  const handleEdit = (call) => {
    setEditingCall(call);
  };
  const handleDelete = (call) => {
    setCallToDelete(call);
    setShowDeleteWarning(true);
  };
  const confirmDelete = async () => {
    const updatedCallHistory = callHistory.filter(call => call.id !== callToDelete.id);
    setCallHistory(updatedCallHistory);
  
    const updatedData = {
      callHistory: updatedCallHistory
    };
  
    try {
      const params1 = {
        Bucket: 'logicaladmin.space',
        Key: 'data.json',
        Body: JSON.stringify(updatedData),
        ContentType: 'application/json'
      };
      await s3.putObject(params1).promise();  
      console.log('Successfully deleted data');
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  
    setShowDeleteWarning(false);
    setCallToDelete(null);
  };  
  const cancelDelete = () =>{ 
    setShowDeleteWarning(false);
    setCallToDelete(null);
  };
  //Nav Bar
  const gmail = () => {
    window.location.href = "https://mail.google.com/";
  };
  const calendar = () => {
    window.location.href = "https://calendar.google.com/";
  };
  const handleShowKB = () => {
    navigate('/knowledge')
  };

  //Create Home Page
  return (
    <div className="app-container">
      <div className="nav-bar">
        <h1>{getTabTitle()}</h1>
        <button className="profile" onClick={handleShowKB}>Knowledge Base</button>
        <button className="profile" onClick={gmail}>Gmail</button>
        <button className="profile" onClick={calendar}>Calendar</button>
        <button className="profile" onClick={handleMyMetrics}>My Metrics</button>
        <button className="profile" onClick={handlePasswordReset}>Reset Password</button>
        <button className="sign-out-button" onClick={handleSignOut}>Sign Out</button>
      </div>
      <div className="side-panel">
        <button onClick={() => setActiveTab('Call History')}>Call History</button>
        <button onClick={() => setActiveTab('Metrics')}>Metrics</button>
        <button onClick={() => setActiveTab('Sales Map')}>Sales Map</button>
        <button onClick={() => setActiveTab('Delayed')}>Delayed</button>
      </div>
    <div className="main-content">
      {activeTab === 'Call History' && (
        <div className="call-history">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button title="newcall" className="newcallbtn" onClick={handleNewCall}>New Call</button>
        <button title="updateemails" className="newcallbtn" onClick={updateEmails}>New Email</button>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Name</th>
              <th>Company</th>
              <th>Department</th>
              <th>Rep</th>
              <th>Options</th>
            </tr>
          </thead>
          <tbody>
            {visibleCalls.map((call) => (
              <tr key={call.id}>
                <td>{call.id}</td>
                <td>{call.date}</td>
                <td>{call.name}</td>
                <td>{call.company}</td>
                <td>{call.department}</td>
                <td>{call.rep}</td>
                <td>
                  <div className="dropdown">
                    <button className="dropbtn">Options</button>
                    <div className="dropdown-content">
                      <button onClick={() => handleEdit(call)}>Edit</button>
                      <button onClick={() => handleDelete(call)}>Delete</button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>          Page {currentPage}           </span>
          <button
            onClick={() => setCurrentPage((prev) => (endIndex < sortedCalls.length ? prev + 1 : prev))}
            disabled={endIndex >= sortedCalls.length}
          >
            Next
          </button>
        </div>
      </div>
      )}
      {activeTab === 'Metrics' && (
        <div className="metric">
          <button title="opentable" className="newcallbtn" onClick={handleProfileTable}>Table</button>
          <button title="updatecsat" className="newcallbtn" onClick={updateCSAT}>CSAT</button>
          <h2>Metric Charts</h2>
          <h4>Emails</h4>
          <div title="emaildata" className="graphcont">
          <BarChart data={emailData()} />
          </div>
          <div>
          <h4>Calls</h4>
          </div>
          <div title="calldata" className="graphcont">
          <BarChart data={callData()} />
          </div>
          <div>
          <h4>CSAT</h4>
          </div>
          <div title="csatdata" className="graphcont">
          <BarChart data={csatData()} />
          </div>
        </div>
      )}
      {activeTab === 'Sales Map' && (
        <div className="image-container">
          <img src={mapImage} alt="Sales Map" className="responsive-image" />
        </div>
      )}
      {activeTab === 'Delayed' && (
        <div className="ccnb">
          <iframe title="Delayed" src={"https://docs.google.com/spreadsheets/d/1rt-C1I5QLUC0DVyVUaq5-m74nCnZyKgKA6IR9IcbhZQ/"} className="frm2"/>
        </div>
      )}
    </div>
      {editingCall && (
      <form className="call-form" onSubmit={handleEditSubmit}>
        <label>
          Rep:
          <select name="rep" value={formData.rep} defaultValue={editingCall.rep} onChange={handleInputChange}>
          <option value={editingCall.rep}>{editingCall.rep}</option>
          <option value={localStorage.getItem('username')}>{localStorage.getItem('username')}</option>
          </select>
        </label>
        <label>
          Date:
          <input type="date" name="date" value={formData.date} onChange={handleInputChange} />
        </label>
        <label>
          Name:
          <input type="text" name="name" value={formData.name} onChange={handleInputChange} />
        </label>
        <label>
          Company:
          <input type="text" name="company" value={formData.company} onChange={handleInputChange} />
        </label>
        <label>
          Department:
          <select name="department" value={formData.department} onChange={handleDepartmentChange}>
            <option value="">Select Department</option>
            <option value="Customer Care">Customer Care</option>
            <option value="Sales">Sales</option>
            <option value="Technical Support">Technical Support</option>
            <option value="Marketing">Marketing</option>
          </select>
        </label>
        <label>
          Notes:
          <textarea name="notes" value={formData.notes} onChange={handleInputChange} />
        </label>
        <button type="submit">Update</button>
      </form>
      )}
      {showNewCall && (
        <form className="call-form" onSubmit={handleSubmit}>
          <label>
            Rep:
            <select name="rep" value={formData.rep} onChange={handleInputChange}>
            <option value=""></option>
            <option value={localStorage.getItem('username')}>{localStorage.getItem('username')}</option>
            </select>
          </label>
          <label>
            Date:
            <input type="date" name="date" value={formData.date} onChange={handleInputChange} />
          </label>
          <label>
            Name:
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} />
          </label>
          <label>
            Company:
            <input type="text" name="company" value={formData.company} onChange={handleInputChange} />
          </label>
          <label>
            Department:
            <select name="department" value={formData.department} onChange={handleDepartmentChange}>
              <option value="">Select Department</option>
              <option value="Customer Care">Customer Care</option>
              <option value="Sales">Sales</option>
              <option value="Technical Support">Technical Support</option>
              <option value="Marketing">Marketing</option>
            </select>
          </label>
          <label>
            Notes:
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} />
          </label>
          <button type="submit">Submit</button>
          <button onClick={closeNewCall}>Close</button>
        </form>
      )}
      {showDeleteWarning && (
        <div className="call-form">
          <p>Are you sure you want to delete this call? This action cannot be undone.</p>
          <button onClick={confirmDelete}>Delete</button>
          <button onClick={cancelDelete}>Cancel</button>
        </div>
      )}
      {showProfileTable && (
        <div className="call-history">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm2}
            onChange={(e) => setSearchTerm2(e.target.value)}
          />
          <button title="closetable" className="newcallbtn" onClick={closeProfileTable}>Close</button>
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Emails</th>
                <th>Calls</th>
                <th>CSAT</th>
              </tr>
            </thead>
            <tbody>
              {visibleProfiles.map((profile) => (
                <tr key={profile.Username}>
                  <td>{profile.Username}</td>
                  <td>{profile.FullName}</td>
                  <td>{profile.Emails}</td>
                  <td>{profile.Calls}</td>
                  <td>{profile.CSAT}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>          Page {currentPage}           </span>
            <button
              onClick={() => setCurrentPage((prev) => (endIndex < filteredProfiles.length ? prev + 1 : prev))}
              disabled={endIndex >= filteredProfiles.length}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {showMyMetrics && (
        <div className="call-form">
          <button className="closebtn" onClick={closeMyMetrics}>X</button>
          <div>
          <h4>{allData2()}</h4>
          </div>
          <div>
          <BarChart data={allData()} />
          </div>
          <h3>CSAT : {allData3()}</h3>
        </div>
      )}
    </div>
  );
}
export default Home;