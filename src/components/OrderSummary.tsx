import React from "react";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";

interface CartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  selectedOptions?: Record<string, string>;
}

interface OrderSummaryProps {
  cartItems: CartItem[];
  cartTotal: number;
  shippingCharge: number;
  paymentMethod: "COD" | "ONLINE";
  setPaymentMethod: (method: "COD" | "ONLINE") => void;
}

const OrderSummary = ({
  cartItems,
  cartTotal,
  shippingCharge,
  paymentMethod,
  setPaymentMethod,
}: OrderSummaryProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handlePlaceOrder = async () => {
    if (shippingCharge === 0) {
      toast.error("Please select delivery location");
      return;
    }

    setLoading(true);
    try {
      if (paymentMethod === "COD") {
        await api.post("/order/place-cod", { shippingCharge });
        toast.success("Order placed with Cash on Delivery");
        navigate("/order-success");
      } else {
        toast.success("Redirecting to payment gateway");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Order failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 border rounded-lg p-6 h-fit sticky top-20">
      <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

      <ul className="space-y-2 text-sm">
        {cartItems.map((item) => (
          <li key={item._id} className="flex justify-between items-start">
            <div>
              <span>
                {item.name} × {item.quantity}
              </span>
              {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                <p
                  className="text-xs text-gray-500 font-medium line-clamp-2 break-words leading-relaxed cursor-help"
                  title={Object.entries(item.selectedOptions)
                    .map(([axis, value]) => `${axis}: ${value}`)
                    .join(" · ")}
                >
                  {Object.entries(item.selectedOptions)
                    .map(([axis, value]) => `${axis}: ${value}`)
                    .join(" · ")}
                </p>
              )}
            </div>
            <span>₹{item.price * item.quantity}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Payment Method</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="paymentMethod"
            value="ONLINE"
            checked={paymentMethod === "ONLINE"}
            onChange={() => setPaymentMethod("ONLINE")}
          />
          <span>Online Payment</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="paymentMethod"
            value="COD"
            checked={paymentMethod === "COD"}
            onChange={() => setPaymentMethod("COD")}
          />
          <span>Cash on Delivery</span>
        </label>
      </div>

      <div className="border-t mt-4 pt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{cartTotal}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span>₹{shippingCharge}</span>
        </div>
        <div className="flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>₹{cartTotal + shippingCharge}</span>
        </div>
      </div>

      <button
        onClick={handlePlaceOrder}
        disabled={loading}
        className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 disabled:opacity-60"
      >
        {paymentMethod === "COD" ? "Place Order (COD)" : "Pay Now"}
      </button>


    </div>
  );
};

export default OrderSummary;
