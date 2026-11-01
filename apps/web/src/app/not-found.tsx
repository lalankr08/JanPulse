import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center p-4">
      <div className="max-w-md text-center bg-white p-8 rounded-3xl border border-black/[0.06] shadow-sm">
        <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
        <p className="text-sm text-[#6E6E73] mb-6">
          The civic record or page you were looking for does not exist.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-full bg-[#0071E3] text-white text-xs font-semibold hover:bg-[#0077ED] transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

