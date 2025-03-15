import { FaHourglassHalf } from "react-icons/fa";

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center">
        <div className="w-20 h-20 border-4 border-squid-pink border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold mb-2 text-squid-pink">Loading Game...</h2>
        <div className="flex items-center justify-center text-gray-600 dark:text-gray-400">
          <FaHourglassHalf className="animate-pulse mr-2" />
          <p>Please wait</p>
        </div>
      </div>
    </div>
  );
} 