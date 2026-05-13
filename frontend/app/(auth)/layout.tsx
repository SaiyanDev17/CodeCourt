import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication - CodeCourt',
  description: 'Login or register for CodeCourt',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden lg:flex bg-slate-950">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>

      {/* Global Background Elements */}
      <div className="pointer-events-none absolute -left-24 top-8 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-6 h-80 w-80 rounded-full bg-purple-500/10 blur-[120px]" />

      {/* Left Side: Animated Coder GIF */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center border-r border-slate-800/80 bg-slate-950 shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-0">
        
        {/* Ambient glowing aura behind the GIF */}
        <div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.08),transparent_60%)]"
          style={{ animation: 'glow-pulse 6s ease-in-out infinite' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/15 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-600/15 blur-[100px] rounded-full pointer-events-none" />

        {/* Coder GIF with Float Animation */}
        <div className="relative z-10 w-[85%] max-w-[650px]" style={{ animation: 'float 6s ease-in-out infinite' }}>
          <img 
            src="/auth/coder.gif" 
            alt="Futuristic Coder" 
            className="w-full h-auto object-contain drop-shadow-[0_0_25px_rgba(34,211,238,0.2)] mix-blend-screen"
          />
        </div>

        {/* Bottom Text overlay */}
        <div className="absolute bottom-16 left-0 right-0 text-center z-10">
          <h1 className="text-4xl font-extrabold text-cyan-200 [text-shadow:0_0_30px_rgba(34,211,238,0.5)] mb-3 tracking-wider">
            CodeCourt
          </h1>
          <p className="text-slate-400 font-medium tracking-widest uppercase text-sm opacity-80">
            Elite Coding Environment
          </p>
        </div>
      </div>

      {/* Right Side: Form Container */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-8 relative z-10">
        <div className="glass-panel w-full max-w-md rounded-2xl p-8 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.6)] border border-slate-700/50 backdrop-blur-2xl relative overflow-hidden">
          {/* Soft inner glow for the form container */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 blur-[50px] rounded-full pointer-events-none" />
          <div className="relative z-20">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
