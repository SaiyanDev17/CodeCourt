'use client'

import { useState } from 'react'
import MonacoEditor from '@/components/Editor/MonacoEditor'
import SubmitButton from '@/components/Editor/SubmitButton'

export default function Home() {
  const [currentCode, setCurrentCode] = useState('')
  const [currentLanguage, setCurrentLanguage] = useState<'cpp' | 'python'>('cpp')
  const [isJudging, setIsJudging] = useState(false)

  const handleCodeChange = (code: string, language: 'cpp' | 'python') => {
    setCurrentCode(code)
    setCurrentLanguage(language)
  }

  const handleSubmit = () => {
    console.log('Submitting code:', { code: currentCode, language: currentLanguage })
    setIsJudging(true)
    
    // Simulate 3-second judging delay
    setTimeout(() => {
      setIsJudging(false)
      console.log('Judging complete!')
    }, 3000)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-24">
      <h1 className="text-4xl font-bold">Welcome to CodeCourt</h1>
      <p className="text-xl text-gray-600">Monaco Editor Test - Per-Language State</p>

      <div className="w-full max-w-5xl">
        <MonacoEditor onChange={handleCodeChange} />
      </div>

      <div className="w-full max-w-5xl flex justify-center">
        <SubmitButton onSubmit={handleSubmit} isJudging={isJudging} />
      </div>

      <div className="w-full max-w-5xl bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <p className="text-sm font-medium mb-2">
          Current Language: <span className="text-blue-600">{currentLanguage.toUpperCase()}</span>
        </p>
        <p className="text-sm font-medium mb-2">
          Current Code Length: {currentCode.length} characters
        </p>
        <p className="text-sm font-medium mb-2">
          Status: <span className={isJudging ? 'text-yellow-600' : 'text-green-600'}>
            {isJudging ? 'Judging...' : 'Ready'}
          </span>
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Try typing in C++, then switch to Python and type there too. Switch back to C++ - your code is preserved! 🎉
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          Click Submit to test the 3-second judging state. The button will be disabled during judging.
        </p>
      </div>
    </main>
  )
}
