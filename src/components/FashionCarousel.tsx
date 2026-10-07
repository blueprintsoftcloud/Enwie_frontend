import React from "react";
import { ArrowRight } from "lucide-react";

const FashionCarousel = () => {
  return (
    <div className="w-full min-h-screen bg-white py-16 px-6 md:px-16">
      <div className="flex justify-center mt-14">
        <button className="bg-black text-white px-8 py-3 rounded-full text-lg font-medium flex items-center gap-2 hover:bg-gray-800 transition">
          Explore Collections <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default FashionCarousel;
