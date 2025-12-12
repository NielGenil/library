import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Search, FileText, Copy, Check, Calendar } from "lucide-react";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [fileContent, setFileContent] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [copied, setCopied] = useState(false);

  const GITHUB_USERNAME = "NielGenil";
  const GITHUB_REPO = "library";
  const GITHUB_DIR = "files";

  useEffect(() => {
    fetch(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${GITHUB_DIR}`
    )
      .then((res) => res.json())
      .then((data) => {
        const mdFiles = data
          .filter((file) => file.name.endsWith(".md"))
          .map((file) => ({
            name: file.name.replace(".md", ""),
            fullName: file.name,
            download_url: file.download_url,
          }));

        setAllFiles(mdFiles);
        setResults(mdFiles);
      });
  }, []);

  const handleSearch = (value) => {
    setQuery(value);

    let filtered = allFiles.filter((file) =>
      file.name.toLowerCase().includes(value.toLowerCase())
    );

    filtered = filtered.sort((a, b) => {
      if (sortOrder === "latest") return b.fullName.localeCompare(a.fullName);
      return a.fullName.localeCompare(b.fullName);
    });

    setResults(filtered);
  };

  useEffect(() => {
    handleSearch(query);
  }, [sortOrder]);

  const handleFileClick = async (file) => {
    setSelectedFile(file.name);

    const response = await fetch(file.download_url);
    const text = await response.text();
    setFileContent(text);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-800">Markdown Library</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Files
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Type to search..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortOrder("latest")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                      sortOrder === "latest"
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Latest
                  </button>
                  <button
                    onClick={() => setSortOrder("oldest")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                      sortOrder === "oldest"
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Oldest
                  </button>
                </div>
              </div>

              {/* File List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">
                    Files
                  </label>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {results.length}
                  </span>
                </div>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {results.map((file, index) => (
                    <button
                      key={index}
                      onClick={() => handleFileClick(file)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition flex items-center gap-2 ${
                        selectedFile === file.name
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-2">
            {selectedFile ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* File Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    {selectedFile}
                  </h2>
                </div>

                {/* Markdown Content */}
                <div className="p-6">
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          return !inline ? (
                            <div className="relative group my-4">
                              <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto">
                                <code>{children}</code>
                              </pre>
                              <button
                                onClick={() => copyToClipboard(children)}
                                className="absolute top-3 right-3 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition flex items-center gap-1.5 text-sm"
                              >
                                {copied ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm">
                              {children}
                            </code>
                          );
                        },
                        h1: ({ children }) => (
                          <h1 className="text-3xl font-bold text-slate-800 mt-8 mb-4">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-2xl font-bold text-slate-800 mt-6 mb-3">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xl font-semibold text-slate-700 mt-5 mb-2">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="text-slate-700 leading-relaxed mb-4">
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside space-y-2 mb-4 text-slate-700">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside space-y-2 mb-4 text-slate-700">
                            {children}
                          </ol>
                        ),
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            className="text-blue-600 hover:text-blue-700 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {fileContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  No File Selected
                </h3>
                <p className="text-slate-500">
                  Select a file from the sidebar to view its content
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;