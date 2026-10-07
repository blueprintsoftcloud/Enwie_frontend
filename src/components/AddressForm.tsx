import React from "react";
import api from "../utils/api";
import toast from "react-hot-toast";

interface Address {
  name: string;
  phone: string;
  house: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
  shippingCharge?: number;
}

interface AddressFormProps {
  address: Address;
  setAddress: React.Dispatch<React.SetStateAction<Address>>;
}

const AddressForm = ({ address, setAddress }: AddressFormProps) => {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setAddress({ ...address, phone: digits });
    } else if (name === "pincode") {
      const cleanPincode = value.replace(/\D/g, "").slice(0, 6);
      setAddress((prev) => ({ ...prev, pincode: cleanPincode }));

      if (cleanPincode.length === 6) {
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPincode}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data[0] && data[0].Status === "Success") {
              const postOffice = data[0].PostOffice[0];
              const fetchedState = postOffice.State;
              const fetchedCity = postOffice.District || postOffice.Block || postOffice.Name;
              setAddress((prev) => ({
                ...prev,
                state: fetchedState || prev.state,
                city: fetchedCity || prev.city,
              }));
              toast.success(`Pincode resolved to ${fetchedCity}, ${fetchedState}`);
            }
          }
        } catch (err) {
          console.error("Failed to fetch state/city from pincode", err);
        }
      }
    } else {
      setAddress({ ...address, [name]: value });
    }
  };

  const handleGetLocation = () => {
    const fallbackToIPGeolocation = async (message: string) => {
      const toastId = toast.loading(message);
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) throw new Error("IP lookup failed");
        const data = await response.json();
        const { latitude, longitude } = data;
        if (latitude === undefined || longitude === undefined) throw new Error("Invalid coordinates");

        const res = await api.post("/save-geo", {
          latitude,
          longitude,
        });

        const { address: addr, shippingCharge } = res.data;

        setAddress((prev) => ({
          ...prev,
          house: "",
          city: addr.city,
          state: addr.state,
          pincode: addr.zipCode,
          lat: latitude,
          lng: longitude,
          shippingCharge,
        }));

        toast.dismiss(toastId);
        toast.success(`Location estimated via IP! Shipping charge: ₹${shippingCharge}`);
      } catch {
        toast.dismiss(toastId);
        toast.error("Could not estimate location. Please enter manually.");
      }
    };

    if (!navigator.geolocation) {
      fallbackToIPGeolocation("GPS unavailable (requires HTTPS). Estimating location via IP...");
      return;
    }

    const toastId = toast.loading("Fetching location...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.post("/save-geo", {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });

          const { address: addr, shippingCharge } = res.data;

          setAddress((prev) => ({
            ...prev,
            house: "",
            city: addr.city,
            state: addr.state,
            pincode: addr.zipCode,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            shippingCharge,
          }));

          toast.dismiss(toastId);
          toast.success(`Shipping charge: ₹${shippingCharge}`);
        } catch {
          toast.dismiss(toastId);
          toast.error("Failed to fetch location");
        }
      },
      (err) => {
        toast.dismiss(toastId);
        if (err.code === err.PERMISSION_DENIED) {
          fallbackToIPGeolocation("GPS permission denied. Estimating location via IP...");
        } else {
          fallbackToIPGeolocation("GPS signal weak. Estimating location via IP...");
        }
      }
    );
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Delivery Address</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
            Please enter pincode to check delivery address
          </label>
          <input
            name="pincode"
            placeholder="Pincode"
            value={address.pincode}
            onChange={handleChange}
            className="input"
          />
        </div>
        <input
          name="name"
          placeholder="Full Name"
          value={address.name}
          onChange={handleChange}
          className="input"
        />
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="Phone Number (10 digits)"
          value={address.phone}
          onChange={handleChange}
          className="input"
        />
        <input
          name="house"
          placeholder="House / Flat"
          value={address.house}
          onChange={handleChange}
          className="input"
        />
        <input
          name="street"
          placeholder="Street / Area"
          value={address.street}
          onChange={handleChange}
          className="input"
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            name="city"
            placeholder="City (Auto-filled)"
            value={address.city}
            readOnly={true}
            className="input bg-slate-100/80 text-slate-500 cursor-not-allowed select-none"
          />
          <input
            name="state"
            placeholder="State (Auto-filled)"
            value={address.state}
            readOnly={true}
            className="input bg-slate-100/80 text-slate-500 cursor-not-allowed select-none"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleGetLocation}
        className="w-full border rounded-md py-2 text-sm hover:bg-gray-50 mt-4"
      >
        📍 Use Current Location
      </button>

    </div>
  );
};

export default AddressForm;
