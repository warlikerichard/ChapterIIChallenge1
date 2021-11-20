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
      const newCart = [...cart];
      const isInCart = newCart.find(product => product.id === productId);
      const stock = await api.get(`/stock/${productId}`);
      const productToAdd = await api.get(`products/${productId}`);
      const productAmount = isInCart ? isInCart.amount : 0;

      if(productAmount+1 > stock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      if(isInCart && stock.data.amount > isInCart.amount) {
        newCart.map(product => {
          if(isInCart.id === product.id) {
            product.amount += 1;
          }
        });
      }
      else if(!isInCart){
        newCart.push({...productToAdd.data, amount:1});
      }
      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isInCart = cart.find(product => product.id === productId);
      if(!isInCart){
        toast.error('Erro na remoção do produto')
        return;
      }
      const newCart = cart.reduce((cartAcc, product) => {
        if(product.id !== productId) {
          cartAcc.push(product);
        }
        return cartAcc;
      }, [] as Product[]);

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const newCart = [...cart];
      const newProduct = newCart.find(product => product.id === productId)
      const stock = await api.get(`stock/${productId}`)
      if(amount<1){
        return;
      }
      if(newProduct && stock.data.amount >= amount) {
        newProduct.amount = amount;
      }
      else{
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

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
