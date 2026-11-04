// src/utils/pincodeLookup.ts
// Utility to lookup Indian Pincodes via api.postalpincode.in
// Automatically extracts State, District/City, and all associated Post Office Localities.

export interface PincodeDetails {
  success: boolean;
  state: string;
  city: string;
  localities: string[];
  error?: string;
}

/**
 * Fetches state, city/district, and all post office localities for a 6-digit Indian PIN code.
 * Includes a 6-second timeout fallback to ensure the UI never hangs if the third-party service is slow.
 */
export async function fetchPincodeDetails(pincode: string): Promise<PincodeDetails> {
  const cleanPincode = pincode.replace(/\D/g, "").slice(0, 6);
  if (cleanPincode.length !== 6) {
    return {
      success: false,
      state: "",
      city: "",
      localities: [],
      error: "Pincode must be 6 digits",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPincode}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        state: "",
        city: "",
        localities: [],
        error: `HTTP error ${res.status}`,
      };
    }

    const data = await res.json();
    if (
      Array.isArray(data) &&
      data[0] &&
      data[0].Status === "Success" &&
      Array.isArray(data[0].PostOffice) &&
      data[0].PostOffice.length > 0
    ) {
      const postOffices = data[0].PostOffice;
      const first = postOffices[0];
      const state = (first?.State || "").trim();
      const city = (first?.District || first?.Block || first?.Name || "").trim();

      // Extract unique localities/post office names and sort alphabetically
      const rawNames = postOffices
        .map((po: any) => (po?.Name || "").trim())
        .filter(Boolean);
      const uniqueLocalities: string[] = Array.from(new Set(rawNames)).sort((a, b) => a.localeCompare(b));

      return {
        success: true,
        state,
        city,
        localities: uniqueLocalities,
      };
    }

    return {
      success: false,
      state: "",
      city: "",
      localities: [],
      error: "Invalid pincode or no postal records found",
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError";
    return {
      success: false,
      state: "",
      city: "",
      localities: [],
      error: isTimeout ? "Pincode service timed out" : (err?.message || "Failed to reach postal service"),
    };
  }
}

