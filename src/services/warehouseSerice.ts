import wretch from "wretch";

export type PositionData = {
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
  // TODO: productId validation
  const data = await api.get(`/products/${productId}/positions`).json<PositionData[]>();

  return data;
}
