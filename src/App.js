import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Search, FileText, Copy, Check, Moon, Sun } from "lucide-react";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [fileContent, setFileContent] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState("dark"); // Default to dark theme

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
      if (sortOrder === "latest") {
        // Latest first: Z to A (reverse alphabetical)
        return b.name.localeCompare(a.name);
      } else {
        // Oldest first: A to Z (alphabetical)
        return a.name.localeCompare(b.name);
      }
    });

    setResults(filtered);
  };

  useEffect(() => {
    if (allFiles.length > 0) {
      handleSearch(query);
    }
  }, [sortOrder, allFiles]);

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

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Theme-aware classes
  const isDark = theme === "dark";
  const bgMain = isDark ? "bg-gray-900" : "bg-gradient-to-br from-slate-50 to-slate-100";
  const bgCard = isDark ? "bg-gray-800" : "bg-white";
  const borderColor = isDark ? "border-gray-700" : "border-slate-200";
  const textPrimary = isDark ? "text-gray-100" : "text-slate-800";
  const textSecondary = isDark ? "text-gray-300" : "text-slate-700";
  const textTertiary = isDark ? "text-gray-400" : "text-slate-500";
  const inputBg = isDark ? "bg-gray-700" : "bg-white";
  const inputBorder = isDark ? "border-gray-600" : "border-slate-300";
  const inputText = isDark ? "text-gray-100" : "text-slate-800";
  const hoverBg = isDark ? "hover:bg-gray-700" : "hover:bg-slate-50";
  const selectedBg = isDark ? "bg-blue-900 text-blue-200" : "bg-blue-50 text-blue-700";

  return (
    <div className={`min-h-screen ${bgMain}`}>
      {/* Header */}
      <header className={`${bgCard} border-b ${borderColor} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <h1 className={`text-2xl font-bold ${textPrimary}`}>
                Markdown Library
              </h1>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-slate-100 hover:bg-slate-200'} transition`}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className={`${bgCard} rounded-xl shadow-sm border ${borderColor} p-6 sticky top-8`}>
              {/* Search */}
              <div className="mb-6">
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Search Files
                </label>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textTertiary}`} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Type to search..."
                    className={`w-full pl-10 pr-4 py-2.5 border ${inputBorder} ${inputBg} ${inputText} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition`}
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div className="mb-6">
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Sort By
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortOrder("latest")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                      sortOrder === "latest"
                        ? "bg-blue-600 text-white shadow-md"
                        : `${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`
                    }`}
                  >
                    Latest
                  </button>
                  <button
                    onClick={() => setSortOrder("oldest")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                      sortOrder === "oldest"
                        ? "bg-blue-600 text-white shadow-md"
                        : `${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`
                    }`}
                  >
                    Oldest
                  </button>
                </div>
              </div>

              {/* File List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={`text-sm font-medium ${textSecondary}`}>
                    Files
                  </label>
                  <span className={`text-xs ${textTertiary} ${isDark ? 'bg-gray-700' : 'bg-slate-100'} px-2 py-1 rounded-full`}>
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
                          ? selectedBg + " font-medium"
                          : `${textSecondary} ${hoverBg}`
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
              <div className={`${bgCard} rounded-xl shadow-sm border ${borderColor} overflow-hidden`}>
                {/* File Header */}
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50'} border-b ${borderColor} px-6 py-4`}>
                  <h2 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
                    <FileText className="w-5 h-5 text-blue-600" />
                    {selectedFile}
                  </h2>
                </div>

                {/* Markdown Content */}
                <div className="p-8">
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const text = String(children).replace(/\n$/, "");
                          
                          const rawContent = node?.position?.start ? fileContent.substring(
                            node.position.start.offset,
                            node.position.end.offset
                          ) : '';
                          
                          const backtickMatch = rawContent.match(/^`+/);
                          const backtickCount = backtickMatch ? backtickMatch[0].length : 0;
                          
                          if (backtickCount === 1 || inline) {
                            return (
                              <code 
                                className={`${isDark ? 'bg-gray-700 text-pink-400 border-gray-600' : 'bg-gray-100 text-pink-600 border-gray-200'} px-1.5 py-0.5 rounded text-sm font-mono border`}
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          }

                          const match = /language-(\w+)/.exec(className || "");
                          const language = match ? match[1] : "";

                          return (
                            <div className="relative group my-4">
                              {language && (
                                <div className={`${isDark ? 'bg-gray-900 border-gray-600 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'} border border-b-0 rounded-t-md px-4 py-2 text-xs font-mono`}>
                                  {language}
                                </div>
                              )}
                              <div className="relative">
                                <pre className={`${isDark ? 'bg-gray-900 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-300 text-gray-800'} border ${language ? 'rounded-b-md' : 'rounded-md'} p-4 overflow-x-auto`}>
                                  <code className="text-sm font-mono leading-relaxed">
                                    {text}
                                  </code>
                                </pre>
                                <button
                                  onClick={() => copyToClipboard(text)}
                                  className={`absolute top-2 right-2 p-2 ${isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-300' : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700'} border rounded-md opacity-0 group-hover:opacity-100 transition flex items-center gap-1.5 text-xs`}
                                >
                                  {copied ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      Copy
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        },

                        h1: ({ node, children, ...props }) => (
                          <h1
                            className={`text-3xl font-semibold ${textPrimary} pb-2 border-b ${borderColor} mt-6 mb-4`}
                            {...props}
                          >
                            {children}
                          </h1>
                        ),
                        h2: ({ node, children, ...props }) => (
                          <h2
                            className={`text-2xl font-semibold ${textPrimary} pb-2 border-b ${borderColor} mt-6 mb-4`}
                            {...props}
                          >
                            {children}
                          </h2>
                        ),
                        h3: ({ node, children, ...props }) => (
                          <h3
                            className={`text-xl font-semibold ${textPrimary} mt-6 mb-3`}
                            {...props}
                          >
                            {children}
                          </h3>
                        ),
                        h4: ({ node, children, ...props }) => (
                          <h4
                            className={`text-lg font-semibold ${textPrimary} mt-5 mb-2`}
                            {...props}
                          >
                            {children}
                          </h4>
                        ),
                        h5: ({ node, children, ...props }) => (
                          <h5
                            className={`text-base font-semibold ${textPrimary} mt-4 mb-2`}
                            {...props}
                          >
                            {children}
                          </h5>
                        ),
                        h6: ({ node, children, ...props }) => (
                          <h6
                            className={`text-sm font-semibold ${textPrimary} mt-3 mb-2`}
                            {...props}
                          >
                            {children}
                          </h6>
                        ),
                        p: ({ children }) => (
                          <p className={`${textSecondary} leading-relaxed mb-4 text-base`}>
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className={`list-disc pl-6 mb-4 space-y-1 ${textSecondary}`}>
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className={`list-decimal pl-6 mb-4 space-y-1 ${textSecondary}`}>
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="leading-relaxed">{children}</li>
                        ),
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            className="text-blue-500 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className={`border-l-4 ${isDark ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-700'} pl-4 py-1 my-4 italic`}>
                            {children}
                          </blockquote>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4">
                            <table className={`min-w-full border-collapse border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>{children}</thead>
                        ),
                        tbody: ({ children }) => (
                          <tbody className={isDark ? 'bg-gray-800' : 'bg-white'}>{children}</tbody>
                        ),
                        tr: ({ children }) => (
                          <tr className={`border-b ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>{children}</tr>
                        ),
                        th: ({ children }) => (
                          <th className={`border ${isDark ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-900'} px-4 py-2 text-left font-semibold`}>
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className={`border ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-800'} px-4 py-2`}>
                            {children}
                          </td>
                        ),
                        hr: () => (
                          <hr className={`my-6 border-t ${isDark ? 'border-gray-600' : 'border-gray-300'}`} />
                        ),
                        strong: ({ children }) => (
                          <strong className={`font-semibold ${textPrimary}`}>
                            {children}
                          </strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic">{children}</em>
                        ),
                        del: ({ children }) => (
                          <del className={`line-through ${textTertiary}`}>
                            {children}
                          </del>
                        ),
                      }}
                    >
                      {fileContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`${bgCard} rounded-xl shadow-sm border ${borderColor} p-12 text-center`}>
                <FileText className={`w-16 h-16 ${textTertiary} mx-auto mb-4`} />
                <h3 className={`text-xl font-semibold ${textPrimary} mb-2`}>
                  No File Selected
                </h3>
                <p className={textTertiary}>
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