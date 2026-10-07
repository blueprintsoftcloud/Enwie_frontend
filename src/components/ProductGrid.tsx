interface ProductItem {
  id: string;
  name: string;
  price: number;
  image: string;
  rating?: number;
}

interface ProductGridProps {
  products: ProductItem[];
}

const ProductGrid = ({ products }: ProductGridProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <div key={product.id} className="border p-3 rounded-md shadow">
          <img
            src={product.image}
            className="w-full h-40 object-cover rounded"
            alt=""
          />
          <h3 className="mt-2 font-medium">{product.name}</h3>
          <p className="text-gray-700">₹{product.price}</p>
          <p className="text-sm text-yellow-600">{product.rating}⭐</p>
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;
