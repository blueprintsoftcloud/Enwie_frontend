import React from "react";

const NoInternet = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center">
     
      <h1 className="text-2xl font-semibold mb-2">No Internet Connection</h1>
      <p className="text-gray-600 mb-4">
        Please check your network settings and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        Retry
      </button>
    </div>
  );
};

export default NoInternet;
