export default function Navbar() {
  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between">
      {/* Left */}
      <div>
        <h1 className="text-white text-xl font-bold">
          AI DevSecOps Platform
        </h1>
        <p className="text-slate-400 text-sm">
          Monitor • Scan • Secure • Deploy
        </p>
      </div>

      {/* Right */}
      <div className="text-slate-300 bg-slate-800 px-4 py-2 rounded-lg">
        👤 Admin
      </div>
    </div>
  );
}