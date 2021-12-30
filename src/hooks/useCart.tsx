import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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

  const previousCartRef = useRef<Product[]>();

  useEffect(() => {
    previousCartRef.current = cart;
  })

  const cartPreviousValue = previousCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {      
      let product = [...cart];
      const productExists = product.find(product => product.id === productId);
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
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let product = [...cart];
      const findProduct = product.findIndex(product => product.id === productId);

      if (findProduct >= 0) {
        product.splice(findProduct, 1);
        setCart(product);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let product = [...cart];
      const productExists = product.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(product);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
