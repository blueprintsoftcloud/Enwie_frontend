// export default function Example() {
//   return (
//     <>
//       <main className="relative isolate min-h-screen">
//         {/* Background image for light mode */}
//         <img
//           alt=""
//           src="https://images.unsplash.com/photo-1545972154-9bb223aac798?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=3050&q=80&exp=8&con=-15&sat=-75"
//           className="absolute inset-0 -z-10 size-full object-cover object-center dark:hidden"
//         />
//         {/* Background image for dark mode */}
//         <img
//           alt=""
//           src="https://images.unsplash.com/photo-1545972154-9bb223aac798?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=3050&q=80&exp=-20&con=-15&sat=-75"
//           className="absolute inset-0 -z-10 size-full object-cover object-center not-dark:hidden"
//         />

//         {/* Content Overlay */}
//         <div className="mx-auto max-w-7xl px-6 py-32 text-center sm:py-40 lg:px-8">
//           <p className="text-base/8 font-semibold text-white">404</p>
//           <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-white sm:text-7xl">
//             Page not found
//           </h1>
//           <p className="mt-6 text-lg font-medium text-pretty text-white/70 sm:text-xl/8">
//             Sorry, we couldn’t find the page you’re looking for.
//           </p>
//           <div className="mt-10 flex justify-center">
//             <a href="/" className="text-sm/7 font-semibold text-white hover:text-white/90">
//               <span aria-hidden="true">&larr;</span> Back to home
//             </a>
//           </div>
//         </div>
//       </main>
//     </>
//   )
// }

import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white font-sans relative overflow-hidden">

            {/* Navigation */}
            <nav className="absolute top-6 left-8 right-8 flex items-center justify-between z-10">
                <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.5 2.108 8.43c-.588.666-1.354 1.054-2.193 1.076H7.47c-.84 0-1.606-.39-2.194-1.076l2.108-8.433m10.742 2.871-2.493-2.492m-2.492 2.492-2.493-2.492" />
                    </svg>
                </button>
            </nav>

            {/* Main */}
            <main className="text-center px-4 z-10">
                <h1
                    className="text-[12rem] md:text-[16rem] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600"
                    style={{ fontFamily: "var(--theme-font-heading)" }}
                >
                    404
                </h1>

                <h2
                    className="text-3xl md:text-5xl font-bold mt-4 tracking-tight"
                    style={{ fontFamily: "var(--theme-font-heading)" }}
                >
                    PAGE NOT FOUND
                </h2>

                <p className="mt-6 text-lg text-gray-400 max-w-md mx-auto">
                    Sorry, the page you are looking for does not exist.
                </p>

                <div className="mt-10">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-full bg-[var(--theme-primary)] text-[var(--theme-primary-ink)] hover:bg-[var(--theme-primary-hover)] transition-transform duration-300 hover:scale-105"
                    >
                        BACK TO HOME
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default NotFoundPage;
