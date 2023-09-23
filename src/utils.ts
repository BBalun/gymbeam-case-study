import { cartesianProduct, permutations } from "combinatorial-generators";
import { ProductPositionData } from "./services/warehouseService";

type FromPositionId = string;
type ToPositionId = string;
type Distance = number;
export type AdjacencyMatrix = Record<FromPositionId, Record<ToPositionId, Distance>>;
/**
 * Create an adjacency matrix a list of product positions.
 * @param productsPositions List of positions of a product in a warehouse
 * @returns Adjacency matrix which can be indexed by position ids.
 * The first index specifies `from` position, the second specifies `to` position,
 * the result is the distance between these positions
 */
export function calculateAdjacencyMatrix(productsPositions: ProductPositionData[]): AdjacencyMatrix {
  const adjacencyMatrix: AdjacencyMatrix = {};

  for (const from of productsPositions) {
    for (const to of productsPositions) {
      if (!adjacencyMatrix[from.positionId]) {
        adjacencyMatrix[from.positionId] = {};
      }
      adjacencyMatrix[from.positionId][to.positionId] = distance(from, to);
    }
  }

  return adjacencyMatrix;
}

type Point = {
  x: number;
  y: number;
  z: number;
};

/**
 * Calculates a distance between 2 points in 3D space.
 * @param a Point A
 * @param b Point B
 * @returns Distance between point `a` and `b`
 */
export function distance(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
}

/**
 * Creates all possible combinations of product positions.
 * If a product can be found on multiple positions, then a set is generated for each position.
 * @param productsWithPosition List of products with a list of their positions in a warehouse
 * @returns Generator that generates all possible unique combinations of products on specified position
 */
export function generateProductCombinations(
  productsWithPosition: {
    product: string;
    positions: ProductPositionData[];
  }[]
) {
  return cartesianProduct(...productsWithPosition.map((x) => x.positions));
}

/**
 * Creates all permutations of specified products.
 * @param products List of products with a info about their position in warehouse
 * @returns Generator that generates all permutations of these products
 */
export function generateProductPermutations(products: ProductPositionData[]) {
  return permutations(products, products.length);
}
