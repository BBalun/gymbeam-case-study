import wretch from "wretch";
import { retry } from "wretch/middlewares";

export type ProductPositionData = {
  positionId: string;
  x: number;
  y: number;
  z: number;
  productId: string;
  quantity: number;
};

const api = wretch(process.env.WAREHOUSE_API_BASE_URL)
  .headers({
    "x-api-key": process.env.WAREHOUSE_API_KEY!,
  })
  .middlewares([
    retry({
      maxAttempts: 3,
    }),
  ]);

export async function fetchProductPositions(productId: string) {
  return await api.get(`/products/${productId}/positions`).json<ProductPositionData[]>();
}

export async function fetchManyProductPositions(productIds: string[]) {
  return await Promise.all(
    productIds.map(async (p) => {
      const positions = await fetchProductPositions(p);
      return {
        product: p,
        positions,
      };
    })
  );
}
