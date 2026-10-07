import React, { useState, useEffect } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchBar = ({ value, onChange }: SearchBarProps) => {
  const [input, setInput] = useState(value || "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(input);
    }, 300); // debounce 300 ms

    return () => clearTimeout(timeout);
  }, [input, onChange]);

  return (
    <input
      type="text"
      value={input}
      placeholder="Search products..."
      onChange={(e) => setInput(e.target.value)}
      className="w-full border p-2 rounded-md shadow-sm"
    />
  );
};

export default SearchBar;
