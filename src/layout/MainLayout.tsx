import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const MainLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cartItems } = useCart();

  return (
    <>
      <Navbar
        user={user}
        role={user.role}
        cartItemCount={user.isAuthenticated ? cartItems.length : 0}
        handleLogout={logout}
      />
      <Outlet />
    </>
  );
};

export default MainLayout;
