import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import './App.css';

function importAll(r) {
  return r.keys().map(key => ({
    path: r(key),
    name: key.replace(/^.*[\\/]/, '').replace(/\.[a-f0-9]{20}\.md$/, '').replace(/\.md$/, ''),
    fullName: key,
  }));
}

const files = importAll(require.context('./files', false, /\.md$/));

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(files);
  const [fileContent, setFileContent] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [sortOrder, setSortOrder] = useState("latest"); // 'latest' or 'oldest'

  useEffect(() => {
    handleSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]);

  const handleSearch = (value) => {
    setQuery(value);

    let filtered = files.filter(file => 
      file.name.toLowerCase().includes(value.toLowerCase())
    );

    filtered = filtered.sort((a, b) => {
      if (sortOrder === "latest") return b.fullName.localeCompare(a.fullName);
      else return a.fullName.localeCompare(b.fullName);
    });

    setResults(filtered);
  };

  const handleFileClick = async (file) => {
    setSelectedFile(file.name);

    const response = await fetch(file.path);
    const text = await response.text();
    setFileContent(text);
  };

  // Copy to clipboard function
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <p>Search for markdown files:</p>
        <input 
          type="text" 
          value={query} 
          onChange={(e) => handleSearch(e.target.value)} 
          placeholder="Type file name..." 
          style={{ padding: '5px', marginBottom: '10px' }}
        />

        <div style={{ marginBottom: '10px' }}>
          <button onClick={() => setSortOrder("latest")} style={{ marginRight: '5px' }}>Latest</button>
          <button onClick={() => setSortOrder("oldest")}>Oldest</button>
        </div>

        <ul>
          {results.map((file, index) => (
            <li 
              key={index} 
              style={{ cursor: 'pointer', color: 'lightblue' }}
              onClick={() => handleFileClick(file)}
            >
              {file.name}
            </li>
          ))}
        </ul>

        {selectedFile && (
          <div style={{ marginTop: '20px', textAlign: 'left', maxWidth: '600px' }}>
            <h3>{selectedFile}</h3>
            <div style={{ background: '#333', padding: '10px', borderRadius: '5px', color: '#fff' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    return !inline ? (
                      <div style={{ position: 'relative' }}>
                        <pre {...props} style={{ padding: '10px', background: '#222', borderRadius: '5px', overflowX: 'auto' }}>
                          <code>{children}</code>
                        </pre>
                        <button
                          onClick={() => copyToClipboard(children)}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            padding: '3px 6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    ) : (
                      <code {...props} style={{ background: '#555', padding: '2px 4px', borderRadius: '3px' }}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {fileContent}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
