import { Router } from "express";
import { z } from "zod";

import * as warehouseService from "../services/warehouseService";
import { calculateShortestPath } from "../services/pathCalculatorService";

const router = Router();

const orderValidator = z.object({
  products: z.array(z.string().nonempty()).nonempty(),
  startingPosition: z.object({
    x: z.number().nonnegative(),
    y: z.number().nonnegative(),
    z: z.number().nonnegative(),
  }),
});

export type Order = z.infer<typeof orderValidator>;

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

  const shortestPath = calculateShortestPath(order, productsWithPositionData);

  return res.json({
    pickingOrder: shortestPath.path.map((productPosition) => ({
      positionId: productPosition.positionId,
      productId: productPosition.productId,
    })),
    distance: shortestPath.distance,
  });
});

export { router };
