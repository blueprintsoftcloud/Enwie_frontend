
import React from "react";
import { Link, Outlet } from "react-router-dom";

const ManageUsers = () => {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Manage Users</h2>

      <div className="flex gap-4 mb-4">
        <Link to="adduser" className="bg-green-600 text-white px-4 py-2 rounded">
          Add User
        </Link>
        <Link to="listuser" className="bg-blue-600 text-white px-4 py-2 rounded">
          List Users
        </Link>
      </div>

      {/* Nested page renders here */}
      <Outlet />
    </div>
  );
};

export default ManageUsers;

