interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const SortDropdown = ({ value, onChange }: SortDropdownProps) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border p-2 rounded-md shadow-sm"
    >
      <option value="relevance">Relevance</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
      <option value="newest">Newest</option>
      <option value="rating">Rating</option>
    </select>
  );
};

export default SortDropdown;
