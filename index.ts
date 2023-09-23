import "dotenv/config";
import * as warehouseService from "./src/services/warehouseSerice";

import express from "express";
import { cartesianProduct, permutations } from "combinatorial-generators";

const app = express();

type Point = {
  x: number;
  y: number;
  z: number;
};

type Order = {
  products: string[];
  startingPosition: Point;
};

app.use(express.json());

app.post("/order/optimize", async (req, res) => {
  // TODO: validate input
  const body = req.body as Order;
  // TODO: error handling
  // TODO: check for duplicates productIds
  const productsWithPositionData = await Promise.all(
    body.products.map(async (product) => {
      const positions = await warehouseService.fetchProductPositions(product);
      return {
        product,
        positions,
      };
    })
  );

  const startingPosition = {
    positionId: "__start-position-id",
    productId: "",
    quantity: 0,
    x: body.startingPosition.x,
    y: body.startingPosition.y,
    z: body.startingPosition.z,
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

/**
 * Generate all sets of product positions.
 */
// TODO: optimize: get rid of unnecessary slicing
// function generateProductCombinations(
//   products: {
//     product: string;
//     positions: warehouseService.PositionData[];
//   }[]
// ): warehouseService.PositionData[][] {
//   if (products.length === 0) {
//     return [];
//   }

//   if (products.length === 1) {
//     return products[0].positions.map((x) => [x]);
//   }

//   const firstProduct = products[0];
//   const remainingProducts = products.slice(1);

//   const res = [] as warehouseService.PositionData[][];

//   for (const firstProductPosition of firstProduct.positions) {
//     for (const otherCombinations of generateProductCombinations(remainingProducts)) {
//       res.push([firstProductPosition, ...otherCombinations]);
//     }
//   }

//   return res;
// }
function generateProductCombinations(
  productsWithPositionData: {
    product: string;
    positions: warehouseService.PositionData[];
  }[]
) {
  return cartesianProduct(...productsWithPositionData.map((x) => x.positions));
}

// TODO: move to utils
type From = string;
type To = string;
type AdjacencyMatrix = Record<From, Record<To, number>>;
function calculateAdjacencyMatrix(positions: warehouseService.PositionData[]): AdjacencyMatrix {
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

// TODO: move to utils
function distance(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
}

app.listen(3000, () => {
  console.log(`App started on port 3000`);
});
