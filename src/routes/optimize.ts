import { Router } from "express";
import { z } from "zod";

import * as warehouseService from "../services/warehouseService";
import { calculateAdjacencyMatrix, generateProductCombinations, generateProductPermutations } from "../utils";

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
  const order = orderValidator.parse(req.body);

  const uniqueProducts = new Set(order.products);
  if (uniqueProducts.size !== order.products.length) {
    req.log.warn({ order }, "Order contains duplicate products. Duplicates were removed.");
    order.products = [...uniqueProducts] as [string, ...string[]];
  }

  let productsWithPositionData;
  try {
    productsWithPositionData = await warehouseService.fetchManyProductPositions(order.products);
  } catch (e) {
    req.log.error(e, "Failed to fetch products positions.");
    return res.status(500).json({ message: "Failed to fetch products positions." });
  }

  const startingPosition = {
    positionId: "__start-position-id",
    productId: "",
    quantity: 0,
    ...order.startingPosition,
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
