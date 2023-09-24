import { Order } from "../routes/optimize";
import { calculateAdjacencyMatrix, generateProductCombinations, generateProductPermutations } from "../utils";
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
  positions.push(startingPosition);
  const adjacencyMatrix = calculateAdjacencyMatrix(positions);

  let shortestPath: ShortestPath = {
    distance: Infinity,
    path: [],
  };

  const productCombinations = generateProductCombinations(productsWithPositions);
  for (const products of productCombinations) {
    for (const path of generateProductPermutations(products)) {
      // Start with a distance from starting position to the first product
      const firstProductInPath = path[0];
      let pathDistance = adjacencyMatrix[startingPosition.positionId][firstProductInPath.positionId];
      // Then add all distance between products on selected path
      for (let i = 0; i < path.length - 1; ++i) {
        const from = path[i];
        const to = path[i + 1];
        pathDistance += adjacencyMatrix[from.positionId][to.positionId];
      }

      if (pathDistance < shortestPath.distance) {
        shortestPath = { distance: pathDistance, path };
      }
    }
  }

  return shortestPath;
}
