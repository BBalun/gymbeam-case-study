import { calculateShortestPath } from "../src/services/pathCalculatorService";
import { product1Positions, product2Positions } from "./mocks";

test("Basic case", () => {
  const order = {
    products: ["product-1", "product-2"] as [string, ...string[]],
    startingPosition: {
      x: 0,
      y: 0,
      z: 0,
    },
  };

  const productsWithPositions = [
    {
      product: "product-1",
      positions: product1Positions,
    },
    {
      product: "product-2",
      positions: product2Positions,
    },
  ];

  const shortestPath = calculateShortestPath(order, productsWithPositions);

  expect(shortestPath.distance).toBe(3);
  expect(shortestPath.path[0].positionId).toBe(product1Positions[0].positionId);
  expect(shortestPath.path[0].productId).toBe(product1Positions[0].productId);
  expect(shortestPath.path[1].positionId).toBe(product2Positions[0].positionId);
  expect(shortestPath.path[1].productId).toBe(product2Positions[0].productId);
});
