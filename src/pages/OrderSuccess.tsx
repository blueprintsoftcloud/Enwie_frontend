import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const OrderSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/myorders");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1
        className="text-3xl font-bold text-green-600"
        style={{ fontFamily: "var(--theme-font-heading)" }}
      >
        Payment Successful 🎉
      </h1>
      <p className="mt-2 text-gray-600">
        Redirecting to your orders...
      </p>
    </div>
  );
};

export default OrderSuccess;
