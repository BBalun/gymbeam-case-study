import { Order } from "../routes/optimize";
import {
  AdjacencyMatrix,
  calculateAdjacencyMatrix,
  generateProductCombinations,
  generateProductPermutations,
} from "../utils";
import { ProductPositionData, ProductWithPositions } from "./warehouseService";

export type ShortestPath = {
  distance: number;
  path: ProductPositionData[];
};

export function calculateShortestPath(order: Order, productsWithPositions: ProductWithPositions[]): ShortestPath {
  const startingPosition = {
    positionId: "__start-position-id",
    productId: "",
    quantity: 0,
    ...order.startingPosition,
  };

  const positions = productsWithPositions.flatMap((p) => p.positions);
  const adjacencyMatrix = calculateAdjacencyMatrix([startingPosition, ...positions]);

  let shortestPath: ShortestPath = {
    distance: Infinity,
    path: [],
  };

  const productCombinations = generateProductCombinations(productsWithPositions);
  for (const products of productCombinations) {
    const path = findShortestPath(startingPosition, products, adjacencyMatrix);
    if (path.distance < shortestPath.distance) {
      shortestPath = path;
    }
  }

  shortestPath.path = shortestPath.path.filter((p) => p !== startingPosition);
  return shortestPath;
}

const cache: Record<string, ShortestPath> = {};

function encode(start: ProductPositionData, products: ProductPositionData[]) {
  return [start, ...products].map((p) => p.positionId).join(",");
}

function findShortestPath(
  start: ProductPositionData,
  products: ProductPositionData[],
  adjacencyMatrix: AdjacencyMatrix
): ShortestPath {
  const encoded = encode(start, products);
  const foo = cache[encoded];
  if (foo) {
    return foo;
  }

  if (products.length < 1) {
    return {
      distance: 0,
      path: [start],
    };
  }

  let shortestPath: ShortestPath = {
    distance: Infinity,
    path: [],
  };

  for (const next of products) {
    const rest = products.filter((p) => p !== next);
    const restOfShortestPath = findShortestPath(next, rest, adjacencyMatrix);
    const distanceFromStartToNext = adjacencyMatrix[start.positionId][next.positionId];

    const path = {
      distance: distanceFromStartToNext + restOfShortestPath.distance,
      path: [start, ...restOfShortestPath.path],
    };

    if (path.distance < shortestPath.distance) {
      shortestPath = path;
    }
  }

  cache[encoded] = shortestPath;

  return shortestPath;
}
