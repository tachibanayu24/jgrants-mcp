#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { SubsidyListResponse, SubsidyDetailResponse } from "./types.js";

const API_BASE_URL = "https://api.jgrants-portal.go.jp/exp/v1/public";

// Tool schema definitions
const ListSubsidiesSchema = z.object({
  keyword: z.string().default("補助金"),
});

const GetSubsidyDetailSchema = z.object({
  subsidy_id: z.string(),
});

const DownloadAttachmentSchema = z.object({
  subsidy_id: z.string(),
  category: z.enum(["application_guidelines", "outline_of_grant", "application_form"]),
  index: z.number().int().min(0),
});

// Initialize MCP server
const server = new Server(
  {
    name: "jgrants-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_subsidies",
        description: "Search for subsidies currently accepting applications using the specified keyword. Default is '補助金' (subsidy).",
        inputSchema: {
          type: "object",
          properties: {
            keyword: {
              type: "string",
              description: "Search keyword",
              default: "補助金",
            },
          },
        },
      },
      {
        name: "get_subsidy_detail",
        description: "Get detailed information about a specific subsidy. Use the subsidy ID, not the title.",
        inputSchema: {
          type: "object",
          properties: {
            subsidy_id: {
              type: "string",
              description: "Subsidy ID",
            },
          },
          required: ["subsidy_id"],
        },
      },
      {
        name: "download_attachment",
        description: "Get the download URL for a subsidy's attachment document.",
        inputSchema: {
          type: "object",
          properties: {
            subsidy_id: {
              type: "string",
              description: "Subsidy ID",
            },
            category: {
              type: "string",
              enum: ["application_guidelines", "outline_of_grant", "application_form"],
              description: "Attachment category",
            },
            index: {
              type: "integer",
              description: "Attachment index (starts from 0)",
              minimum: 0,
            },
          },
          required: ["subsidy_id", "category", "index"],
        },
      },
    ],
  };
});

// Execute tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "list_subsidies": {
      const args = ListSubsidiesSchema.parse(request.params.arguments);
      const params = new URLSearchParams({
        keyword: args.keyword,
        sort: "acceptance_end_datetime",
        order: "ASC",
        acceptance: "1",
      });

      try {
        const response = await fetch(`${API_BASE_URL}/subsidies?${params}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json() as SubsidyListResponse;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }

    case "get_subsidy_detail": {
      const args = GetSubsidyDetailSchema.parse(request.params.arguments);

      try {
        const response = await fetch(`${API_BASE_URL}/subsidies/id/${args.subsidy_id}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json() as SubsidyDetailResponse;

        // Check result
        if (!data.result || data.result.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Subsidy with ID ${args.subsidy_id} was not found.`,
              },
            ],
          };
        }

        const subsidyInfo = data.result[0];

        // Create modified subsidy info without base64 data
        const modifiedSubsidyInfo: Record<string, unknown> = { ...subsidyInfo };
        
        // Remove base64 data from attachments and add URLs
        const attachmentCategories = ["application_guidelines", "outline_of_grant", "application_form"] as const;
        for (const category of attachmentCategories) {
          if (subsidyInfo[category] && Array.isArray(subsidyInfo[category])) {
            modifiedSubsidyInfo[category] = subsidyInfo[category]!.map((attachment, index) => {
              const { data, ...rest } = attachment;
              return {
                ...rest,
                url: `https://your-mcp-server.example.com/subsidies/${subsidyInfo.id}/${category}/${index}`,
              };
            });
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(modifiedSubsidyInfo, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }

    case "download_attachment": {
      const args = DownloadAttachmentSchema.parse(request.params.arguments);

      try {
        const response = await fetch(`${API_BASE_URL}/subsidies/id/${args.subsidy_id}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json() as SubsidyDetailResponse;

        if (!data.result || data.result.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Subsidy with ID ${args.subsidy_id} was not found.`,
              },
            ],
          };
        }

        const subsidyInfo = data.result[0];

        if (!subsidyInfo[args.category] || !Array.isArray(subsidyInfo[args.category])) {
          return {
            content: [
              {
                type: "text",
                text: `Attachment category '${args.category}' does not exist.`,
              },
            ],
          };
        }

        const attachments = subsidyInfo[args.category]!;
        if (args.index < 0 || args.index >= attachments.length) {
          return {
            content: [
              {
                type: "text",
                text: `Attachment index ${args.index} is invalid.`,
              },
            ],
          };
        }

        const downloadUrl = `https://your-mcp-server.example.com/subsidies/${subsidyInfo.id}/${args.category}/${args.index}`;
        return {
          content: [
            {
              type: "text",
              text: `Attachment download URL: ${downloadUrl}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }

    default:
      throw new Error("Unknown tool");
  }
});

// Main function
async function main() {
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  console.error("jGrants MCP server started");
}

// Error handling
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});