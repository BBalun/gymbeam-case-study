import "dotenv/config";
import * as warehouseService from "./src/services/warehouseService";

import express, { Request, Response, NextFunction } from "express";
import { cartesianProduct, permutations } from "combinatorial-generators";
import { z } from "zod";
import pino from "pino-http";

const app = express();

app.use(pino());
app.use(express.json());

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  req.log.error({ message: "Uncaught exception occurred", error: err });
  res.status(500).json({ message: "Something went wrong." });
});

// TODO: move into separate file with its handler
const orderValidator = z.object({
  products: z.array(z.string().nonempty()).nonempty(),
  startingPosition: z.object({
    x: z.number().nonnegative(),
    y: z.number().nonnegative(),
    z: z.number().nonnegative(),
  }),
});

// TODO: error handling - 500 - oops something went wrong + structure logging (pina)

app.post("/order/optimize", async (req, res) => {
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
  const productPositionCombination = generateProductCombinations(productsWithPositionData);
  for (const products of productPositionCombination) {
    for (const path of permutations(products, products.length)) {
      // Start with a distance from starting position to the first product
      const firstProductInPath = path[0];
      let pathDistance = adjacencyMatrix[startingPosition.positionId][firstProductInPath.positionId];
      // Sum distances between all products
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

function generateProductCombinations(
  productsWithPositionData: {
    product: string;
    positions: warehouseService.ProductPositionData[];
  }[]
) {
  return cartesianProduct(...productsWithPositionData.map((x) => x.positions));
}

// TODO: move to utils
type FromPositionId = string;
type ToPositionId = string;
type Distance = number;
type AdjacencyMatrix = Record<FromPositionId, Record<ToPositionId, Distance>>;
function calculateAdjacencyMatrix(positions: warehouseService.ProductPositionData[]): AdjacencyMatrix {
  const adjacencyMatrix: AdjacencyMatrix = {};

  for (const from of positions) {
    for (const to of positions) {
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

// TODO: move to utils
function distance(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
}

app.listen(3000, () => {
  console.log(`App started on port 3000`);
});
