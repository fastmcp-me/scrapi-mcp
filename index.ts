#!/usr/bin/env node

import express, { Request, Response } from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const PORT = process.env.PORT || 5000;
const SCRAPI_API_KEY = process.env.SCRAPI_API_KEY || "00000000-0000-0000-0000-000000000000";
const SCRAPI_SERVER_NAME = "ScrAPI MCP Server";
const SCRAPI_SERVER_VERSION = "0.1.0";

const app = express();

app.use(
  cors({
    origin: "*",
    exposedHeaders: ["Mcp-Session-Id", "mcp-protocol-version"],
    allowedHeaders: ["Content-Type", "mcp-session-id"],
  })
);

app.use(express.json());

// Define session configuration schema
export const configSchema = z.object({
  scrapiApiKey: z.string().optional().describe("ScrAPI API key for scraping. Leave empty for default limited usage."),
});

// Parse configuration from query parameters
function parseConfig(req: Request) {
  const configParam = req.query.config as string;
  if (configParam) {
    return JSON.parse(Buffer.from(configParam, "base64").toString());
  }
  return {};
}

// Create MCP server with your tools
export default function createServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  const server = new McpServer({
    name: SCRAPI_SERVER_NAME,
    version: SCRAPI_SERVER_VERSION,
  });

  server.registerTool(
    "scrape_url_html",
    {
      title: "Scrape URL and respond with HTML",
      description:
        "Use a URL to scrape a website using the ScrAPI service and retrieve the result as HTML. " +
        "Use this for scraping website content that is difficult to access because of bot detection, captchas or even geolocation restrictions. " +
        "The result will be in HTML which is preferable if advanced parsing is required.",
      inputSchema: {
        url: z
          .string()
          .url({ message: "Invalid URL" })
          .describe("The URL to scrape"),
      },
    },
    async ({ url }) => await scrapeUrl(url, "HTML")
  );

  server.registerTool(
    "scrape_url_markdown",
    {
      title: "Scrape URL and respond with Markdown",
      description:
        "Use a URL to scrape a website using the ScrAPI service and retrieve the result as Markdown. " +
        "Use this for scraping website content that is difficult to access because of bot detection, captchas or even geolocation restrictions. " +
        "The result will be in Markdown which is preferable if the text content of the webpage is important and not the structural information of the page.",
      inputSchema: {
        url: z
          .string()
          .url({ message: "Invalid URL" })
          .describe("The URL to scrape"),
      },
    },
    async ({ url }) => await scrapeUrl(url, "Markdown")
  );

  async function scrapeUrl(
    url: string,
    format: "HTML" | "Markdown"
  ): Promise<CallToolResult> {
    var body = {
      url: url,
      useBrowser: true,
      solveCaptchas: true,
      acceptDialogs: true,
      proxyType: "Residential",
      responseFormat: format,
    };

    try {
      const response = await fetch("https://api.scrapi.tech/v1/scrape", {
        method: "POST",
        headers: {
          "User-Agent": `${SCRAPI_SERVER_NAME} - ${SCRAPI_SERVER_VERSION}`,
          "Content-Type": "application/json",
          "X-API-KEY": config.scrapiApiKey || SCRAPI_API_KEY,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      const data = await response.text();

      if (response.ok) {
        return {
          content: [
            {
              type: "text" as const,
              mimeType: `text/${format.toLowerCase()}`,
              text: data,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: data,
          },
        ],
        isError: true,
      };
    } catch (error) {
      console.error("Error calling API:", error);
    }

    const response = await fetch("https://api.scrapi.tech/v1/scrape", {
      method: "POST",
      headers: {
        "User-Agent": `${SCRAPI_SERVER_NAME} - ${SCRAPI_SERVER_VERSION}`,
        "Content-Type": "application/json",
        "X-API-KEY": SCRAPI_API_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.text();

    return {
      content: [
        {
          type: "text",
          mimeType: `text/${format.toLowerCase()}`,
          text: data,
        },
      ],
    };
  }

  return server.server;
}

app.all("/mcp", async (req: Request, res: Response) => {
  try {
    // Parse configuration
    const rawConfig = parseConfig ? parseConfig(req) : {};

    // Validate and parse configuration
    const config = configSchema
      ? configSchema.parse({scrapiApiKey: rawConfig.scrapiApiKey || SCRAPI_API_KEY})
      : {};

    const server = createServer({ config });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Clean up on request close
    res.on("close", () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// Main function to start the server in the appropriate mode
async function main() {
  const transport = process.env.TRANSPORT || "stdio";

  if (transport === "http") {
    // Run in HTTP mode
    app.listen(PORT, () => {
      console.log(`MCP HTTP Server listening on port ${PORT}`);
    });
  } else {
    const scrapiApiKey = SCRAPI_API_KEY;

    // Create server with configuration
    const server = createServer({
      config: {
        scrapiApiKey,
      },
    });

    // Start receiving messages on stdin and sending messages on stdout
    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);
    console.error("MCP Server running in stdio mode");
  }
}

// Start the server
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
