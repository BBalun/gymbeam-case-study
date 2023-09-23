import wretch from "wretch";

export type ProductPositionData = {
  positionId: string;
  x: number;
  y: number;
  z: number;
  productId: string;
  quantity: number;
};

const api = wretch(process.env.WAREHOUSE_API_BASE_URL).headers({
  "x-api-key": process.env.WAREHOUSE_API_KEY!,
});

export async function fetchProductPositions(productId: string) {
  // TODO: error handling
  // TODO: retry
  const data = await api.get(`/products/${productId}/positions`).json<ProductPositionData[]>();

  return data;
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
