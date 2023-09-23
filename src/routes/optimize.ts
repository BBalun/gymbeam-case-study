import { Router } from "express";
import { z } from "zod";

import * as warehouseService from "../services/warehouseService";
import { calculateAdjacencyMatrix, generateProductCombinations, generateProductPermutations } from "../utils";
import { permutations } from "combinatorial-generators";

const router = Router();

const orderValidator = z.object({
  products: z.array(z.string().nonempty()).nonempty(),
  startingPosition: z.object({
    x: z.number().nonnegative(),
    y: z.number().nonnegative(),
    z: z.number().nonnegative(),
  }),
});

router.post("/", async (req, res) => {
  const orderValidationResult = orderValidator.safeParse(req.body);
  if (!orderValidationResult.success) {
    return res.status(400).json(orderValidationResult.error);
  }
  const order = orderValidationResult.data;

  const uniqueProducts = new Set(order.products);
  if (uniqueProducts.size !== order.products.length) {
    req.log.warn({ order }, "Order contains duplicate products. Duplicates were removed.");
    order.products = [...uniqueProducts] as [string, ...string[]];
  }

  // TODO: error handling + logging
  const productsWithPositionData = await warehouseService.fetchManyProductPositions(order.products);

  const startingPosition = {
    positionId: "__start-position-id",
    productId: "",
    quantity: 0,
    x: order.startingPosition.x,
    y: order.startingPosition.y,
    z: order.startingPosition.z,
  };
  const positions = productsWithPositionData.flatMap((p) => p.positions);
  positions.push(startingPosition);
  const adjacencyMatrix = calculateAdjacencyMatrix(positions);

  let shortestPath;
  const productCombinations = generateProductCombinations(productsWithPositionData);
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

      if (!shortestPath || pathDistance < shortestPath.distance) {
        shortestPath = { distance: pathDistance, path };
      }
    }
  }

  return res.json({
    pickingOrder: shortestPath!.path.map((productPosition) => ({
      positionId: productPosition.positionId,
      productId: productPosition.productId,
    })),
    distance: shortestPath!.distance,
  });
});

export { router };