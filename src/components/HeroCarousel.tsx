import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import image1 from "../assets/1000.jpeg";
import image2 from "../assets/1001.jpeg";
import image3 from "../assets/1002.jpeg";
import image4 from "../assets/1003.jpeg";
import image5 from "../assets/1004.jpeg";
import image6 from "../assets/1005.jpeg";
import image7 from "../assets/1006.jpeg";
import image8 from "../assets/1007.jpeg";
import image9 from "../assets/1008.jpeg";
import image10 from "../assets/1009.jpeg";
import image11 from "../assets/1010.jpeg";
import image12 from "../assets/1016.jpeg";

export default function SummerStylesHero() {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate("/products");
  };

  // --- Animation Variants ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.04, 0.62, 0.23, 0.98] as [number, number, number, number],
      },
    },
  };

  const imageHover = {
    scale: 1.05,
    rotate: 1,
    zIndex: 10,
    boxShadow: "0px 20px 40px rgba(0,0,0,0.2)",
    transition: { duration: 0.4, ease: "easeOut" as const },
  };

  return (
    <div className="relative overflow-hidden w-full bg-white mt-16 sm:mt-20 lg:mt-24">
      {/* Decorative Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-gray-100 via-transparent to-transparent opacity-70 pointer-events-none" />

      {/* Main Container */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
        {/* CHANGED: lg:items-center -> lg:items-start (Aligns content to top) */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16">
          {/* --- LEFT: Text Section --- */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            /* CHANGED: Added lg:mt-16 to position it slightly down from the very top, but higher than center */
            className="w-full lg:w-1/2 text-center lg:text-left z-20 mb-12 lg:mb-0 lg:mt-16"
          >
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl lg:text-6xl">
              <span className="bg-black bg-clip-text text-transparent block pb-2">
                Summer styles are finally here
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg font-medium text-gray-600 max-w-2xl mx-auto lg:mx-0">
              This year, our new summer collection will shelter you from the
              harsh elements of a world that doesn't care if you live or die.
            </p>

            <div className="mt-8 sm:mt-10 flex justify-center lg:justify-start">
              <motion.button
                onClick={handleNavigate}
                whileHover={{ scale: 1.02, paddingRight: "2.5rem" }}
                whileTap={{ scale: 0.95 }}
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-sm bg-black px-8 py-4 text-white transition-all duration-300 hover:bg-gray-900 hover:shadow-xl"
              >
                <span className="mr-2 font-medium tracking-wide">
                  Shop Collection
                </span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </div>
          </motion.div>

          {/* --- RIGHT: Image Grid Section --- */}
          <div className="w-full lg:w-1/2 relative z-10">
            <div className="overflow-x-auto lg:overflow-visible pb-10 lg:pb-0 hide-scrollbar px-2">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex items-start justify-center lg:justify-end space-x-4 lg:space-x-6 min-w-max lg:min-w-0"
              >
                {/* Column 1 */}
                <div className="grid shrink-0 grid-cols-1 gap-y-4 lg:gap-y-6 pt-8 lg:pt-0">
                  <motion.div
                    variants={itemVariants}
                    className="h-40 w-28 sm:h-52 sm:w-36 lg:h-64 lg:w-44 overflow-hidden rounded-xl shadow-lg border border-white/50"
                  >
                    <motion.img
                      whileHover={imageHover}
                      src={image1}
                      alt="Fashion 1"
                      className="size-full object-cover object-center"
                    />
                  </motion.div>
                  <motion.div
                    variants={itemVariants}
                    className="h-40 w-28 sm:h-52 sm:w-36 lg:h-64 lg:w-44 overflow-hidden rounded-xl shadow-lg border border-white/50"
                  >
                    <motion.img
                      whileHover={imageHover}
                      src={image2}
                      alt="Fashion 2"
                      className="size-full object-cover object-center"
                    />
                  </motion.div>
                </div>

                {/* Column 2 */}
                <div className="grid shrink-0 grid-cols-1 gap-y-4 lg:gap-y-6 -mt-8 lg:-mt-12">
                  <motion.div
                    variants={itemVariants}
                    className="h-40 w-28 sm:h-52 sm:w-36 lg:h-64 lg:w-44 overflow-hidden rounded-xl shadow-lg border border-white/50"
                  >
                    <motion.img
                      whileHover={imageHover}
                      src={image10}
                      alt="Fashion 3"
                      className="size-full object-cover object-center"
                    />
                  </motion.div>
                  <motion.div
                    variants={itemVariants}
                    className="h-40 w-28 sm:h-52 sm:w-36 lg:h-64 lg:w-44 overflow-hidden rounded-xl shadow-lg border border-white/50"
                  >
                    <motion.img
                      whileHover={imageHover}
                      src={image12}
                      alt="Fashion 4"
                      className="size-full object-cover object-center"
                    />
                  </motion.div>
                  <motion.div
                    variants={itemVariants}
                    className="h-40 w-28 sm:h-52 sm:w-36 lg:h-64 lg:w-44 overflow-hidden rounded-xl shadow-lg border border-white/50"
                  >
                    <motion.img
                      whileHover={imageHover}
                      src={image5}
                      alt="Fashion 5"
                      className="size-full object-cover object-center"
                    />
                  </motion.div>
                </div>

                {/* Column 3 */}
                <div className="grid shrink-0 grid-cols-1 gap-y-4 lg:gap-y-6 pt-8 lg:pt-0">
                  <motion.div
                    variants={itemVariants}
                    className="h-40 w-28 sm:h-52 sm:w-36 lg:h-64 lg:w-44 overflow-hidden rounded-xl shadow-lg border border-white/50"
                  >
                    <motion.img
                      whileHover={imageHover}
                      src={image6}
                      alt="Fashion 6"
                      className="size-full object-cover object-center"
                    />
                  </motion.div>
                  <motion.div
                    variants={itemVariants}
                    className="h-40 w-28 sm:h-52 sm:w-36 lg:h-64 lg:w-44 overflow-hidden rounded-xl shadow-lg border border-white/50"
                  >
                    <motion.img
                      whileHover={imageHover}
                      src={image8}
                      alt="Fashion 7"
                      className="size-full object-cover object-center"
                    />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
