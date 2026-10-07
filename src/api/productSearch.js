import api from "../utils/api";

export const searchProducts = async (params) => {
  const response = await api.get("/user/products/search", { params });
  return response.data;
};
