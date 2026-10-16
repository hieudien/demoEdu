export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-5">
        <span className="w-9 h-9 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold">E</span>
        <span className="font-bold text-xl">EduManager</span>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-6 w-full max-w-sm">{children}</div>
    </div>
  )
}
