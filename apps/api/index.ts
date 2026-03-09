import express = require("express");
import { createVercelServer } from "./src/bootstrap";

let cachedServer: express.Express | null = null;
let cachedServerPromise: Promise<express.Express> | null = null;

async function getServer(): Promise<express.Express> {
  if (cachedServer) {
    return cachedServer;
  }

  if (!cachedServerPromise) {
    cachedServerPromise = createVercelServer().then((server) => {
      cachedServer = server;
      return server;
    });
  }

  return cachedServerPromise;
}

export default async function handler(request: any, response: any) {
  const server = await getServer();
  return server(request, response);
}
