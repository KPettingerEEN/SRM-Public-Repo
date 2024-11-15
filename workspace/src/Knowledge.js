import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Buffer } from 'buffer';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import AWS from 'aws-sdk';
import './Knowledge.css';

AWS.config.update({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
  region: process.env.REACT_APP_AWS_REGION
});
const s3 = new AWS.S3();
const obfuscateJSON = (json) => {
  return Buffer.from(JSON.stringify(json)).toString('base64');
};
const deobfuscateJSON = (obfuscatedCode) => {
  if (!obfuscatedCode) {
    return {};
  }
  try {
    const jsonString = Buffer.from(obfuscatedCode, 'base64').toString('utf-8');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error during deobfuscation:', error);
    return null;
  }
};

const Knowledge = () => {
  const [articleName, setArticleName] = useState('');
  const [author, setAuthor] = useState('');
  const [date, setDate] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [article, setArticle] = useState('');
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const navigate = useNavigate();

  //Fetch
  useEffect(() => {
    const fetchArticles = async () => {
      const params = {
        Bucket: process.env.REACT_APP_S3_BUCKET_NAME,
        Prefix: 'articles/'
      };
      const data = await s3.listObjectsV2(params).promise();
      const articles = await Promise.all(data.Contents.map(async (item) => {
        try {
          const articleData = await s3.getObject({ Bucket: params.Bucket, Key: item.Key }).promise();
          const articleBody = articleData.Body.toString('utf-8');
          const deobfuscatedArticle = deobfuscateJSON(articleBody);
          if (deobfuscatedArticle) {
            return deobfuscatedArticle;
          } else {
            return null;
          }
        } catch (error) {
          return null;
        }
      }));
      const validArticles = articles.filter(article => article);
      setArticles(validArticles);
    };
    fetchArticles();
  }, []);
  //Article creation and editing
  const handleArticle = async () => {
    const newArticle = {
      name: articleName,
      pub: date,
      auth: author,
      body: article
    };
    const obfuscatedArticle = obfuscateJSON(newArticle);
    const params = {
      Bucket: process.env.REACT_APP_S3_BUCKET_NAME,
      Key: `articles/${articleName}.json`,
      Body: obfuscatedArticle,
      ContentType: 'application/json'
    };
    await s3.upload(params).promise();
    setArticles([...articles, newArticle]);
    setShowCreate(false);
    setEditMode(false);
    // Reset states
    setArticleName('');
    setAuthor('');
    setDate('');
    setArticle('');
  };
  const handleCreateArticle = () => {
    setShowCreate(true);
    setEditMode(false);
    setArticleName('');
    setAuthor('');
    setDate('');
    setArticle('');
  };
  const handleEditArticle = () => {
    const articleNameToEdit = prompt('Enter the name of the article to edit:');
    const articleToEdit = articles.find(article => article.name === articleNameToEdit);
    if (articleToEdit) {
      setEditMode(true);
      setShowCreate(true);
      setArticleName(articleToEdit.name);
      setAuthor(articleToEdit.auth);
      setDate(articleToEdit.pub);
      setArticle(articleToEdit.body);
    } else {
      alert('Article not found');
    }
  };
  const modalClose = () => {
    setShowCreate(false);
    setEditMode(false);
  };
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  const workspace = () => {
    navigate('/home');
  };
  //Search
  const filteredArticles = articles.filter(article =>
    article &&
    (article.name && article.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.auth && article.auth.toLowerCase().includes(searchQuery.toLowerCase()))
  );  

  return (
    <div className='kb-container'>
      <div className='navbar'>
        <h1>Knowledge Articles</h1>
        <input type='search' className='searchinput' placeholder='Search Article' value={searchQuery} onChange={handleSearch} />
        <option onClick={workspace}>Home</option>
        <option onClick={handleCreateArticle}>Create Article</option>
        <option onClick={handleEditArticle}>Edit Article</option>
      </div>
      {showCreate && (
        <div className='kb-modal'>
          <input type='text' placeholder='Article Name' value={articleName}
            onChange={(e) => setArticleName(e.target.value)}
          />
          <input type='text' placeholder='Author Name' value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <input type='date' value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <ReactQuill
            className='custom-quill'
            value={article}
            onChange={(value) => setArticle(value)}
          />
          <button onClick={handleArticle}>Save Article</button>
          <button onClick={modalClose}>Close</button>
        </div>
      )}
      <div className='kb-container'>
        <div className='article-list'>
          <div className='spacer'></div>
          {filteredArticles.map((article) => (
            <div key={article.name} onClick={() => setSelectedArticle(article)}>
              <h4>- {article.name}</h4>
            </div>
          ))}
        </div>
        <div className='body-panel'>
          {selectedArticle && (
            <div>
              <h1>{selectedArticle.name}</h1>
              <h3>{selectedArticle.auth} Created On {selectedArticle.pub}</h3>
              <div dangerouslySetInnerHTML={{ __html: selectedArticle.body }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Knowledge;
