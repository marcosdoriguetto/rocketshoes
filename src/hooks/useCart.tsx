import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {      
      let product = [...cart];
      const productExists = product.find(product => product.id === productId);
      console.log(productExists);
      const currentAmount = productExists ? productExists.amount : 0;
      const futureAmount = currentAmount + 1;

      const stockProductResponse = await api.get(`/stock/${productId}`)
      const amountProduct = stockProductResponse.data.amount;
      if (futureAmount > amountProduct) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = futureAmount;
      } else {
        const fetchProductResponse = await api.get(`/products/${productId}`);
        const productInformation = fetchProductResponse.data;
        product.push({...productInformation, amount: 1});
      }
       
      setCart(product);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(product));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProduct = cart.findIndex(product => product.id === productId);
      let listProducts = [...cart];
      listProducts.splice(findProduct, 1);

      setCart(listProducts);
    } catch {
      toast.error('Produto não encontrado');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      await api.put(`stock/${productId}`, {
        amount: amount
      })
    } catch {
      toast.error('')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
