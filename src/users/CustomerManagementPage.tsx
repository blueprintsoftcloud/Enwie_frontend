// // src/users/CustomerManagementPage.tsx
// // Shows all CUSTOMER accounts with search, edit, and delete capabilities.

// import React from "react";
// import { Link, useLocation } from "react-router-dom";
// import { UsersIcon, PlusIcon } from "@heroicons/react/24/outline";
// import Listusers from "./Listusers";

// export default function CustomerManagementPage() {
//   const location = useLocation();
//   const dashPrefix = location.pathname.startsWith("/super-admin-dashboard")
//     ? "/super-admin-dashboard"
//     : "/admin-dashboard";

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
//       {/* Page Header */}
//       <div className="px-4 sm:px-6 lg:px-8 py-6">
//         <div className="flex items-start justify-between gap-4">
//           <div>
//             <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-medium text-slate-600 backdrop-blur-sm">
//               <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
//               Customer Management
//             </div>
//             <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
//               Customer Management
//             </h1>
//             <p className="mt-1 text-sm text-slate-500">
//               View, search, edit, and manage all customer accounts.
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Customer list */}
//       <Listusers roleFilter="CUSTOMER" />
//     </div>
//   );
// }




// src/users/CustomerManagementPage.tsx
// Shows all CUSTOMER accounts with search, edit, and delete capabilities.

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { UsersIcon, PlusIcon } from "@heroicons/react/24/outline";
import Listusers from "./Listusers";

export default function CustomerManagementPage() {
  const location = useLocation();
  const dashPrefix = location.pathname.startsWith("/super-admin-dashboard")
    ? "/super-admin-dashboard"
    : "/admin-dashboard";

  return (
    <div className="min-h-screen bg-slate-50/50 w-full font-sans antialiased">
      
      {/* ── Premium Dashboard Header Section ── */}
      <div className="px-8 pt-8 pb-6 border-b border-gray-200 bg-white shadow-xs">
        <div className="w-full mx-auto">
          
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-950 flex items-center gap-2.5">
                {/* <UsersIcon className="h-8 w-8 text-slate-800" strokeWidth={2.2} /> */}
                Customer Management
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Inspect synchronized consumer accounts indexes, evaluate registration parameters, modify customer profiles, and coordinate CRM authentication keys.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Customer List View Content Matrix Area ── */}
      <div className="px-8 py-6 w-full">
        <Listusers roleFilter="CUSTOMER" />
      </div>

    </div>
  );
}