import { Router, Request, Response } from "express";
import { z } from "zod";

import * as warehouseService from "../services/warehouseService";
import { calculateShortestPath } from "../services/pathCalculatorService";
import { wrap } from "async-middleware";

const router = Router();

const orderValidator = z.object({
  products: z
    .array(z.string().nonempty("Product id cannot be empty"))
    .nonempty("Products has to contain at least one character"),
  startingPosition: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
});

export type Order = z.infer<typeof orderValidator>;

router.post(
  "/",
  wrap(async (req: Request, res: Response) => {
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

    const productNotInWarehouse = productsWithPositionData.find((p) => !p.positions.length);
    if (productNotInWarehouse) {
      return res
        .status(400)
        .json({ message: `Product with id '${productNotInWarehouse.product}' is not in a warehouse.` });
    }

    const shortestPath = calculateShortestPath(order, productsWithPositionData);

    return res.json({
      pickingOrder: shortestPath.path.map((productPosition) => ({
        positionId: productPosition.positionId,
        productId: productPosition.productId,
      })),
      distance: shortestPath.distance,
    });
  })
);

export { router };
