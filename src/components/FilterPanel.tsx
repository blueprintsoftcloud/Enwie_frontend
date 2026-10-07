import React from "react";

interface Category {
  _id: string;
  name: string;
}

interface Filters {
  category?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  minRating?: string | number;
}

interface FilterPanelProps {
  categories: Category[];
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}

const FilterPanel = ({ categories, filters, setFilters }: FilterPanelProps) => {
  const handleChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4 border rounded-md p-4 shadow-sm bg-white">
      {/* CATEGORY */}
      <div>
        <label className="font-medium">Category</label>
        <select
          value={filters.category || ""}
          onChange={(e) => handleChange("category", e.target.value)}
          className="w-full border p-2 rounded-md"
        >
          <option value="">All</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* PRICE RANGE */}
      <div>
        <label className="font-medium">Price Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice || ""}
            onChange={(e) => handleChange("minPrice", e.target.value)}
            className="border p-2 w-1/2 rounded-md"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice || ""}
            onChange={(e) => handleChange("maxPrice", e.target.value)}
            className="border p-2 w-1/2 rounded-md"
          />
        </div>
      </div>

      {/* RATING FILTER */}
      <div>
        <label className="font-medium">Minimum Rating</label>
        <select
          value={filters.minRating || ""}
          onChange={(e) => handleChange("minRating", e.target.value)}
          className="w-full border p-2 rounded-md"
        >
          <option value="">Any</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} ⭐ & above
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FilterPanel;
