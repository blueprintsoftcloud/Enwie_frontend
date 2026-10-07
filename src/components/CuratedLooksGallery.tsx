import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import api from "../utils/api";

// Fallback local images used when no carousel items are configured in the backend
import image2 from "../assets/1001.jpeg";
import image3 from "../assets/1002.jpeg";
import image4 from "../assets/1003.jpeg";
import image5 from "../assets/1004.jpeg";
import image6 from "../assets/1005.jpeg";
import image7 from "../assets/1006.jpeg";
import image8 from "../assets/1007.jpeg";
import image9 from "../assets/1008.jpeg";
import image10 from "../assets/1009.jpeg";
import image12 from "../assets/1015.jpeg";
import image13 from "../assets/1016.jpeg";
import image14 from "../assets/1017.jpeg";
import image15 from "../assets/1018.jpeg";
import image16 from "../assets/1019.jpeg";

const FALLBACK_ITEMS = [
  { id: 1, image: image2, title: "Velvet Evening" },
  { id: 2, image: image3, title: "Summer Breeze" },
  { id: 3, image: image4, title: "Classic Look" },
  { id: 4, image: image5, title: "Urban Chic" },
  { id: 5, image: image6, title: "Classic Menswear" },
  { id: 6, image: image7, title: "Boho Vibes" },
  { id: 7, image: image8, title: "Night Out" },
  { id: 8, image: image9, title: "Casual Friday" },
  { id: 9, image: image10, title: "Winter Collection" },
  { id: 11, image: image12, title: "Spring Forward" },
  { id: 12, image: image13, title: "Spring Forward" },
  { id: 13, image: image14, title: "Spring Forward" },
  { id: 14, image: image15, title: "Spring Forward" },
  { id: 15, image: image16, title: "Spring Forward" },
];

interface CarouselItem {
  id: string | number;
  image: string;
  title: string;
}

export default function CuratedLooksGallery() {
  const [activeIndex, setActiveIndex] = useState(2);
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [sectionTitle, setSectionTitle] = useState("Curated Looks For You");
  const [sectionSubtitle, setSectionSubtitle] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get("/home-banners?type=CAROUSEL_ITEM")
      .then(({ data }) => {
        const active: CarouselItem[] = (data.banners ?? [])
          .filter((b: any) => b.isActive)
          .map((b: any) => ({ id: b.id, image: b.image, title: b.title }));
        setItems(active);
        if (active.length > 0) {
          setActiveIndex(Math.floor(active.length / 2));
        }
        if (data.carouselSection?.title) setSectionTitle(data.carouselSection.title);
        if (data.carouselSection?.subtitle) setSectionSubtitle(data.carouselSection.subtitle);
      })
      .catch(() => {
        setItems(FALLBACK_ITEMS);
        setActiveIndex(Math.floor(FALLBACK_ITEMS.length / 2));
      })
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  const handleNext = () =>
    setActiveIndex((prev) => (prev + 1) % items.length);

  const handlePrev = () =>
    setActiveIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));

  if (!loaded) return null;
  if (items.length === 0) return null;

  return (
    <section className="relative w-full bg-white py-16 sm:py-24 overflow-hidden">
      {/* Title */}
      <div className="text-center mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-4xl font-serif font-bold text-gray-900">
          {sectionTitle}
        </h2>
        {sectionSubtitle && (
          <p className="text-gray-500 mt-2 text-sm sm:text-base">{sectionSubtitle}</p>
        )}
        <div className="h-1 w-16 sm:w-20 bg-black mx-auto mt-4" />
      </div>

      {/* Carousel */}
      <div className="relative h-[480px] sm:h-[560px] flex items-center justify-center">
        <AnimatePresence initial={false}>
          {items.map((item, index) => {
            let offset = index - activeIndex;
            if (offset > items.length / 2) offset -= items.length;
            if (offset < -items.length / 2) offset += items.length;
            if (Math.abs(offset) > 2) return null;

            return (
              <motion.div
                key={item.id}
                className="absolute rounded-2xl overflow-hidden bg-white shadow-xl cursor-pointer"
                onClick={() => setActiveIndex(index)}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{
                  x: offset * (window.innerWidth < 640 ? 180 : 280),
                  scale: offset === 0 ? 1 : 0.85,
                  zIndex: 50 - Math.abs(offset),
                  opacity: offset === 0 ? 1 : 0.5,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                style={{
                  width: window.innerWidth < 640 ? 260 : 360,
                  height: window.innerWidth < 640 ? 380 : 520,
                }}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  draggable={false}
                />

                {offset === 0 && (
                  <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6 text-white">
                    <h3 className="text-sm sm:text-xl text-center font-medium">
                      {item.title}
                    </h3>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Navigation Buttons */}
        {items.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Previous"
              className="absolute left-2 sm:left-10 z-50 p-3 sm:p-4 rounded-full bg-white shadow-lg active:scale-95 cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>

            <button
              onClick={handleNext}
              aria-label="Next"
              className="absolute right-2 sm:right-10 z-50 p-3 sm:p-4 rounded-full bg-white shadow-lg active:scale-95 cursor-pointer"
            >
              <ArrowRight size={20} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
