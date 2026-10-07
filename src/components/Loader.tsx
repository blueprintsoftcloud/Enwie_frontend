import React from "react";

const Loader = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <p className="text-sm uppercase font-bold tracking-widest text-slate-400 font-mono text-center select-none">
        Loading...
      </p>
    </div>
  );
};

export default Loader;

