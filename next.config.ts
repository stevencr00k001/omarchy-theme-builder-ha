import { createHash } from "crypto";
import { realpathSync } from "fs";
import path from "path";
import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const checkoutRoot = realpathSync(path.resolve(__dirname));

/**
 * Next hashes `next-flight-client-entry-loader`'s query, and that query embeds
 * the absolute checkout path. The resulting module id (and therefore the chunk
 * content hash) changes whenever the repo is built from a different directory.
 * Reassign those ids from the path-stripped name so the committed panel bundle
 * matches CI.
 */
type IdentifiableModule = {
  identifier: () => string;
  libIdent?: (options: { context: string }) => string | null | undefined;
};

type IdCompilation = {
  compiler: { context: string };
  chunkGraph: {
    getModuleId: (mod: IdentifiableModule) => string | number | null;
    setModuleId: (mod: IdentifiableModule, id: number) => void;
  };
  hooks: {
    moduleIds: {
      tap: (name: string, fn: (modules: Iterable<IdentifiableModule>) => void) => void;
    };
  };
};

function moduleName(mod: IdentifiableModule, context: string): string {
  return mod.libIdent?.({ context }) || mod.identifier();
}

function normalizedModuleName(name: string): string {
  const encodedRoot = encodeURIComponent(checkoutRoot);
  return name.split(checkoutRoot).join("<root>").split(encodedRoot).join("<root>").replaceAll("\\", "/");
}

function stableModuleId(name: string, used: Set<string | number>): number {
  const hex = createHash("sha256").update(name).digest("hex");
  for (let length = 4; length <= hex.length; length += 1) {
    const id = Number.parseInt(hex.slice(0, length), 16);
    if (!used.has(id)) return id;
  }
  throw new Error(`No stable module id for ${name}`);
}

const stableModuleIds = {
  apply(compiler: { hooks: { compilation: { tap: (name: string, fn: (compilation: IdCompilation) => void) => void } } }) {
    compiler.hooks.compilation.tap("StableModuleIds", (compilation) => {
      compilation.hooks.moduleIds.tap("StableModuleIds", (modules) => {
        const { chunkGraph } = compilation;
        const list = [...modules];
        const used = new Set<string | number>();
        for (const mod of list) {
          const id = chunkGraph.getModuleId(mod);
          if (id !== null) used.add(id);
        }
        const pathDependent = list
          .filter((mod) => {
            const name = moduleName(mod, compilation.compiler.context);
            return name.includes(checkoutRoot) || name.includes(encodeURIComponent(checkoutRoot));
          })
          .sort((left, right) =>
            normalizedModuleName(moduleName(left, compilation.compiler.context)).localeCompare(
              normalizedModuleName(moduleName(right, compilation.compiler.context)),
            ),
          );
        for (const mod of pathDependent) {
          const id = chunkGraph.getModuleId(mod);
          if (id !== null) used.delete(id);
        }
        for (const mod of pathDependent) {
          const name = normalizedModuleName(moduleName(mod, compilation.compiler.context));
          const id = stableModuleId(name, used);
          used.add(id);
          chunkGraph.setModuleId(mod, id);
        }
      });
    });
  },
};

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  poweredByHeader: false,
  // A fixed build id keeps the committed panel bundle reproducible, so CI can diff it.
  generateBuildId: async () => "omarchy-themes",
  productionBrowserSourceMaps: false,
  webpack: (config, { dev }) => {
    if (!dev) {
      config.optimization ??= {};
      config.optimization.moduleIds = "deterministic";
      config.optimization.chunkIds = "deterministic";
      config.plugins ??= [];
      config.plugins.push(stableModuleIds);
    }
    return config;
  },
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
};

export default nextConfig;
