import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
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
    category?: string;
    description?: string;
    files: string[];
    deps?: string[];
    peerDeps?: string[];
    version?: string;
}

interface RegistrySchema {
    components: RegistryComponent[];
}

export async function runAddCommand(options: AddCommandOptions): Promise<void> {
    const componentName = options.component.trim();
    if (!componentName) {
        throw new Error("Component name is required.");
    }

    const schema = await fetchRegistrySchema();
    const componentEntry = findComponentEntry(schema, componentName);

    if (!componentEntry) {
        printAvailableComponents(schema);
        throw new Error(`Component "${componentName}" not found in registry.`);
    }

    const outputRoot = resolve(process.cwd(), options.dir ?? "src/components");
    const destinationRoot = join(outputRoot, componentEntry.name);
    const fileEntries = await downloadComponentFiles(componentEntry);

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

    writeComponentFiles(destinationRoot, fileEntries, componentEntry.name);
    await installPackages(componentEntry);

    console.log();
    console.log("  ┌─────────────────────────────────┐");
    console.log(`  │  ✅ ${componentEntry.name} added successfully! │`);
    console.log("  └─────────────────────────────────┘");
    console.log();
    console.log("  Import it with:");
    console.log(
        `    import { ${pascalCase(componentEntry.name)} } from './components/${componentEntry.name}';`,
    );
}

async function fetchRegistrySchema(): Promise<RegistrySchema> {
    const url = `${REGISTRY_BASE_URL}/registry/schema.json`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to fetch registry schema from ${url}: ${response.status} ${response.statusText}`,
        );
    }

    return await response.json();
}

function findComponentEntry(
    schema: RegistrySchema,
    componentName: string,
): RegistryComponent | undefined {
    const normalized = componentName.toLowerCase();
    return schema.components.find(
        (entry) => entry.name.toLowerCase() === normalized,
    );
}

function printAvailableComponents(schema: RegistrySchema): void {
    const names = schema.components
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));

    console.log("Available registry components:");
    for (const name of names) {
        console.log(`  - ${name}`);
    }
}

async function downloadComponentFiles(
    entry: RegistryComponent,
): Promise<Array<{ path: string; content: string }>> {
    const downloads = entry.files.map(async (filePath) => {
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
    const relativePath = registryFilePath.startsWith(prefix)
        ? registryFilePath.slice(prefix.length)
        : registryFilePath;
    const destination = resolve(destinationRoot, relativePath);

    if (!destination.startsWith(resolve(destinationRoot) + sep)) {
        throw new Error("Invalid file path from registry.");
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

    return join(destinationRoot, registryFilePath);
}

async function installPackages(entry: RegistryComponent): Promise<void> {
    const deps = [
        ...new Set([...(entry.deps ?? []), ...(entry.peerDeps ?? [])]),
    ];
    if (deps.length === 0) {
        return;
    }

    execFileSync("bun", ["add", ...deps], {
        stdio: "inherit",
    });
}

function pascalCase(value: string): string {
    return value
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join("");
}
