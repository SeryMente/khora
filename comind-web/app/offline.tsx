export default function Offline() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <div className="w-full max-w-md mx-auto p-4 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <svg
              className="w-8 h-8 text-indigo-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.111 16.251a.375.375 0 01-.469-.469l1.712-7.779A2.25 2.25 0 0111.487 6h1.26a2.25 2.25 0 012.072 1.244l1.712 7.779a.375.375 0 11-.469.469M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">CoMind</h1>
        </div>

        <p className="text-gray-400 mb-4">
          No hay conexión a internet
        </p>

        <p className="text-sm text-gray-500">
          CoMind funcionará cuando recuperes la conexión
        </p>
      </div>
    </div>
  );
}
