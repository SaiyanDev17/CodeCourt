'use client'

import { Editor } from '@monaco-editor/react'
import { useState } from 'react'

/**
 * MonacoEditor Component
 * 
 * A wrapper around @monaco-editor/react with language switching and code preservation.
 * 
 * CRITICAL HEIGHT REQUIREMENTS:
 * - The wrapper div MUST have h-full and flex flex-col
 * - The Editor wrapper MUST have flex-1 and min-h-0
 * - The Editor component MUST have height="100%"
 * 
 * Why this matters:
 * - Monaco uses a <canvas> element which has no intrinsic size
 * - Canvas needs explicit pixel dimensions to initialize its rendering context
 * - flex-1 alone doesn't provide concrete height (just says "take available space")
 * - min-h-0 allows flex items to shrink below their content size
 * - This creates a height chain: viewport → grid → flex container → canvas
 * 
 * Without this setup, Monaco renders at 0px height and appears invisible.
 */

interface MonacoEditorProps {
  value?: string
  onChange?: (value: string, language: 'cpp' | 'python') => void
  language?: 'cpp' | 'python'
  height?: string
}

// Default boilerplate code for each language
const BOILERPLATES = {
  cpp: `// Write your C++ code here
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, CodeCourt!" << endl;
    return 0;
}`,
  python: `# Write your Python code here
def main():
    print("Hello, CodeCourt!")

if __name__ == "__main__":
    main()`
} as const

export default function MonacoEditor({
  value: externalValue,
  onChange: externalOnChange,
  language: initialLanguage = 'cpp',
  height = '500px'
}: MonacoEditorProps) {
  const [language, setLanguage] = useState<'cpp' | 'python'>(initialLanguage)
  
  // Maintain separate code state for each language
  const [codeByLanguage, setCodeByLanguage] = useState<Record<'cpp' | 'python', string>>({
    cpp: BOILERPLATES.cpp,
    python: BOILERPLATES.python
  })

  // Get the current language's code
  const currentCode = codeByLanguage[language]

  const handleEditorChange = (newValue: string | undefined) => {
    const value = newValue || ''
    
    // Update only the current language's code using spread operator
    // This creates a new object, preserving the other language's code
    setCodeByLanguage({
      ...codeByLanguage,           // Copy all existing language codes
      [language]: value            // Override only the current language
    })

    // Notify parent component if callback provided
    externalOnChange?.(value, language)
  }

  const handleLanguageChange = (newLanguage: 'cpp' | 'python') => {
    // Simply switch the language - the code for the new language
    // is already stored in codeByLanguage[newLanguage]
    setLanguage(newLanguage)
    
    // Notify parent of the language switch with the stored code
    externalOnChange?.(codeByLanguage[newLanguage], newLanguage)
  }

  return (
    <div className="h-full flex flex-col rounded-2xl border border-slate-700/70 bg-slate-950/70 shadow-[0_12px_30px_rgba(2,6,23,0.45)] overflow-hidden backdrop-blur-sm transition-all duration-200 hover:border-cyan-400/35">
      {/* Language Selector */}
      <div className="flex-shrink-0 bg-slate-900/85 px-4 py-2.5 border-b border-slate-700/70 flex items-center gap-2">
        <label htmlFor="language-select" className="text-sm font-medium text-slate-300">
          Language:
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as 'cpp' | 'python')}
          className="px-3 py-1.5 border border-slate-600 rounded-lg text-sm bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <option value="cpp">C++</option>
          <option value="python">Python</option>
        </select>
        
        {/* Visual indicator showing code is preserved per language */}
        <span className="ml-auto text-xs text-slate-400">
          {codeByLanguage.cpp !== BOILERPLATES.cpp && '🔵 C++ modified'}
          {codeByLanguage.cpp !== BOILERPLATES.cpp && codeByLanguage.python !== BOILERPLATES.python && ' • '}
          {codeByLanguage.python !== BOILERPLATES.python && '🟢 Python modified'}
        </span>
      </div>

      {/* Monaco Editor - Takes remaining space */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={currentCode}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: language === 'python' ? 4 : 2,
            insertSpaces: true,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>
    </div>
  )
}
