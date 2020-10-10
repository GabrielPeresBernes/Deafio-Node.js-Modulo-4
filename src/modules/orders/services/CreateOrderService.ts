import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import { privateEncrypt } from 'crypto';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (customer === undefined) throw new AppError('User does not exists');

    const storedProducts = await this.productsRepository.findAllById(products);

    if (storedProducts.length !== products.length)
      throw new AppError('Product does not exists');

    const orderProducts = products.map((product, index) => {
      const { id, quantity } = product;
      const { price, quantity: storedQuantity } = storedProducts[index];

      if (quantity > storedQuantity)
        throw new AppError('Invalid product quantity');

      return { product_id: id, price, quantity };
    });

    await this.productsRepository.updateQuantity(
      products.map((product, index) => {
        const { id, quantity } = product;
        const { quantity: storedQuantity } = storedProducts[index];
        return { id, quantity: storedQuantity - quantity };
      }),
    );

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    return order;
  }
}

export default CreateOrderService;
