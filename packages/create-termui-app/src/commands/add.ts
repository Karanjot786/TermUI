import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { execFileSync } from "node:child_process";
import { confirmPrompt } from "../prompts.js";

const REGISTRY_BASE_URL =
    process.env.TERMUI_REGISTRY_URL ?? "https://termui.io";

export interface AddCommandOptions {
    component: string;
    dir?: string;
    dryRun?: boolean;
    yes?: boolean;
}

interface RegistryComponent {
    name: string;
    slug?: string;
    category?: string;
    description?: string;
    files: Array<string | { path: string; content: string }>;
    dependencies?: string[];
    deps?: string[];
    peerDeps?: string[];
    version?: string;
}

type RegistryIndex = RegistryComponent[] | { components: RegistryComponent[] };

type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export async function runAddCommand(options: AddCommandOptions): Promise<void> {
    const componentName = options.component.trim();
    if (!componentName) {
        throw new Error("Component name is required.");
    }

    const registry = await fetchRegistryIndex();
    const indexEntry = findComponentEntry(registry, componentName);

    if (!indexEntry) {
        printAvailableComponents(registry);
        throw new Error(`Component "${componentName}" not found in registry.`);
    }

    const componentEntry =
        await fetchComponentEntry(indexEntry.slug ?? indexEntry.name) ??
        indexEntry;
    const outputRoot = resolve(process.cwd(), options.dir ?? "src/components");
    const componentDirName = indexEntry.slug ?? componentEntry.slug ?? indexEntry.name;
    const destinationRoot = join(outputRoot, componentDirName);
    const fileEntries = await resolveComponentFiles(componentEntry);

    if (options.dryRun) {
        printDryRunPreview(destinationRoot, fileEntries);
        return;
    }

    if (existsSync(destinationRoot) && !options.yes) {
        const overwrite = await confirmPrompt(
            `Component directory already exists at ${destinationRoot}. Overwrite?`,
            false,
        );

        if (!overwrite) {
            throw new Error("Aborted by user.");
        }
    }

    writeComponentFiles(destinationRoot, fileEntries, componentDirName);
    await installPackages(componentEntry);

    console.log();
    console.log("  ┌─────────────────────────────────┐");
    console.log(`  │  ✅ ${componentEntry.name} added successfully! │`);
    console.log("  └─────────────────────────────────┘");
    console.log();
    console.log("  Import it with:");
    console.log(
        `    import { ${pascalCase(componentEntry.name)} } from './components/${componentDirName}';`,
    );
}

async function fetchRegistryIndex(): Promise<RegistryIndex> {
    const url = `${REGISTRY_BASE_URL}/r/registry.json`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to fetch registry index from ${url}: ${response.status} ${response.statusText}`,
        );
    }

    return await response.json();
}

async function fetchComponentEntry(componentSlug: string): Promise<RegistryComponent | undefined> {
    const url = `${REGISTRY_BASE_URL}/r/${componentSlug}.json`;
    const response = await fetch(url);

    if (response.status === 404) {
        return undefined;
    }

    if (!response.ok) {
        throw new Error(
            `Failed to fetch component "${componentSlug}" from ${url}: ${response.status} ${response.statusText}`,
        );
    }

    if (typeof response.json !== "function") {
        return undefined;
    }

    return await response.json();
}

function findComponentEntry(
    registry: RegistryIndex,
    componentName: string,
): RegistryComponent | undefined {
    const normalized = componentName.toLowerCase();
    const components = Array.isArray(registry) ? registry : registry.components;
    return components.find(
        (entry) => entry.name.toLowerCase() === normalized ||
            entry.slug?.toLowerCase() === normalized,
    );
}

function printAvailableComponents(registry: RegistryIndex): void {
    const components = Array.isArray(registry) ? registry : registry.components;
    const names = components
        .map((entry) => entry.slug ?? entry.name)
        .sort((a, b) => a.localeCompare(b));

    console.log("Available registry components:");
    for (const name of names) {
        console.log(`  - ${name}`);
    }
}

async function resolveComponentFiles(
    entry: RegistryComponent,
): Promise<Array<{ path: string; content: string }>> {
    if (entry.files.every((file): file is { path: string; content: string } => {
        return typeof file !== "string";
    })) {
        return entry.files.map(file => ({ path: file.path, content: file.content }));
    }

    const downloads = entry.files.map(async (filePath) => {
        if (typeof filePath !== "string") {
            return filePath;
        }

        const rawUrl = `${REGISTRY_BASE_URL}/${filePath}`;
        const response = await fetch(rawUrl);

        if (!response.ok) {
            throw new Error(
                `Failed to download ${filePath} from registry: ${response.status} ${response.statusText}`,
            );
        }

        return {
            path: filePath,
            content: await response.text(),
        };
    });

    return await Promise.all(downloads);
}

function printDryRunPreview(
    destinationRoot: string,
    fileEntries: Array<{ path: string; content: string }>,
): void {
    console.log("Dry run preview — no files will be written.");
    console.log();

    for (const file of fileEntries) {
        const relative = getDestinationRelativePath(file.path, destinationRoot);
        console.log(`  Would create: ${relative}`);
        const preview = file.content
            .split("\n")
            .slice(0, 6)
            .map((line) => `    ${line}`)
            .join("\n");
        console.log(preview);
        if (file.content.split("\n").length > 6) {
            console.log("    ...");
        }
        console.log();
    }
}

function writeComponentFiles(
    destinationRoot: string,
    fileEntries: Array<{ path: string; content: string }>,
    componentName: string,
): void {
    for (const file of fileEntries) {
        const destPath = resolveDestinationPath(
            destinationRoot,
            file.path,
            componentName,
        );
        const directory = dirname(destPath);
        mkdirSync(directory, { recursive: true });
        writeFileSync(destPath, file.content, "utf-8");
        console.log(`    ✓ ${destPath}`);
    }
}

function resolveDestinationPath(
    destinationRoot: string,
    registryFilePath: string,
    componentName: string,
): string {
    const prefix = `registry/components/${componentName}/`;
    let relativePath = registryFilePath.startsWith(prefix)
        ? registryFilePath.slice(prefix.length)
        : registryFilePath;
    if (!relativePath.includes("/") && relativePath === `${componentName}.ts`) {
        relativePath = "index.ts";
    }
    const destination = resolve(destinationRoot, relativePath);

    const rel = relative(resolve(destinationRoot), destination);
    if (rel.startsWith("..") || isAbsolute(rel)) {
        throw new Error(`Destination ${destination} is outside project root`);
    }

    return destination;
}

function getDestinationRelativePath(
    registryFilePath: string,
    destinationRoot: string,
): string {
    const pathSegments = registryFilePath.split("/");
    const componentIndex = pathSegments.indexOf("components");
    if (componentIndex !== -1 && componentIndex + 2 < pathSegments.length) {
        const relativePath = pathSegments.slice(componentIndex + 2).join("/");
        return join(destinationRoot, relativePath);
    }

    if (pathSegments.length === 1 && registryFilePath.endsWith(".ts")) {
        return join(destinationRoot, "index.ts");
    }

    return join(destinationRoot, registryFilePath);
}

async function installPackages(entry: RegistryComponent): Promise<void> {
    const deps = [
        ...new Set([
            ...(entry.dependencies ?? []),
            ...(entry.deps ?? []),
            ...(entry.peerDeps ?? []),
        ]),
    ];
    if (deps.length === 0) {
        return;
    }

    const pm = detectPackageManager(process.cwd());
    execFileSync(pm, installArgs(pm, deps), {
        stdio: "inherit",
    });
}

function detectPackageManager(cwd: string): PackageManager {
    if (existsSync(join(cwd, "bun.lock"))) return "bun";
    if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
    if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
    return "npm";
}

function installArgs(pm: PackageManager, deps: string[]): string[] {
    if (pm === "npm") return ["install", ...deps];
    return ["add", ...deps];
}

function pascalCase(value: string): string {
    return value
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join("");
}
