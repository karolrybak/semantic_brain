import { defineEventHandler, getQuery } from "h3";
import { Project } from "ts-morph";
import { resolve, relative } from "path";
import * as fs from "fs";

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	// Use provided path or default to CWD
	const rawPath = (query.path as string) || process.cwd();
	const projectRoot = resolve(rawPath);

	if (!fs.existsSync(projectRoot)) {
		throw createError({
			statusCode: 404,
			statusMessage: "Path not found",
			data: { path: projectRoot },
		});
	}

	// Initialize Project
	// Attempt to load tsconfig if present in the target root
	let project: Project;
	const tsConfigPath = resolve(projectRoot, "tsconfig.json");

	try {
		if (fs.existsSync(tsConfigPath)) {
			project = new Project({
				tsConfigFilePath: tsConfigPath,
				skipAddingFilesFromTsConfig: true,
				compilerOptions: {
					allowJs: true,
					skipLibCheck: true,
				},
			});
		} else {
			throw new Error("No tsconfig");
		}
	} catch (e) {
		project = new Project({
			compilerOptions: {
				allowJs: true,
				skipLibCheck: true,
				baseUrl: projectRoot,
				paths: {
					"~/*": ["./*"],
					"@/*": ["./*"],
				},
			},
		});
	}

	// Recursive walker
	const walkSync = (dir: string, filelist: string[] = []) => {
		if (!fs.existsSync(dir)) return filelist;
		try {
			fs.readdirSync(dir).forEach((file) => {
				const filepath = resolve(dir, file);
				const stat = fs.statSync(filepath);
				if (stat.isDirectory()) {
					if (
						![
							"node_modules",
							".nuxt",
							".output",
							".git",
							"dist",
							"coverage",
						].includes(file)
					) {
						walkSync(filepath, filelist);
					}
				} else {
					if (
						file.endsWith(".ts") ||
						file.endsWith(".vue") ||
						file.endsWith(".js")
					) {
						filelist.push(filepath);
					}
				}
			});
		} catch (e) {
			// Ignore access errors
		}
		return filelist;
	};

	// Scan directory
	// If it's a specific src/app folder, just scan that. If root, scan sensible defaults if they exist.
	const sensibleDirs = [
		"src",
		"server",
		"app",
		"components",
		"pages",
		"composables",
		"utils",
		"lib",
	];
	const sourceFiles: string[] = [];

	// Check if we are at a project root with subdirs
	let foundSensible = false;
	sensibleDirs.forEach((d) => {
		const fullPath = resolve(projectRoot, d);
		if (fs.existsSync(fullPath)) {
			sourceFiles.push(...walkSync(fullPath));
			foundSensible = true;
		}
	});

	// If no structure found, just scan the root recursively
	if (!foundSensible) {
		sourceFiles.push(...walkSync(projectRoot));
	}

	// Limit file count to prevent crashes on huge repos for now
	const limitedFiles = sourceFiles.slice(0, 500);

	limitedFiles.forEach((file) => project.addSourceFileAtPath(file));
	project.resolveSourceFileDependencies();

	const nodes: any[] = [];
	const links: any[] = [];
	const nodeSet = new Set<string>();

	const addNode = (
		id: string,
		name: string,
		type: string,
		group: number,
		val: number = 1,
	) => {
		if (!nodeSet.has(id)) {
			nodes.push({ id, name, type, group, val });
			nodeSet.add(id);
		}
	};

	project.getSourceFiles().forEach((sourceFile) => {
		const filePath = sourceFile.getFilePath();
		const relPath = relative(projectRoot, filePath);

		if (relPath.includes("node_modules") || relPath.startsWith("..")) return;

		const fileId = relPath;
		const loc = sourceFile.getEndLineNumber();

		addNode(fileId, sourceFile.getBaseName(), "file", 1, Math.max(1, loc / 5));

		sourceFile.getClasses().forEach((cls) => {
			const name = cls.getName();
			if (name) {
				const id = `${fileId}#${name}`;
				addNode(id, name, "class", 2, 3);
				links.push({ source: fileId, target: id, type: "contains" });
			}
		});

		sourceFile.getFunctions().forEach((func) => {
			const name = func.getName();
			if (name) {
				const id = `${fileId}#${name}`;
				addNode(id, name, "function", 3, 2);
				links.push({ source: fileId, target: id, type: "contains" });
			}
		});

		sourceFile.getImportDeclarations().forEach((importDecl) => {
			const importedSourceFile = importDecl.getModuleSpecifierSourceFile();
			if (importedSourceFile) {
				const targetPath = relative(
					projectRoot,
					importedSourceFile.getFilePath(),
				);
				if (
					!targetPath.includes("node_modules") &&
					targetPath !== relPath &&
					!targetPath.startsWith("..")
				) {
					if (!nodeSet.has(targetPath)) {
						addNode(targetPath, importedSourceFile.getBaseName(), "file", 1, 1);
					}
					links.push({ source: fileId, target: targetPath, type: "imports" });
				}
			}
		});
	});

	return {
		path: projectRoot,
		stats: {
			files: limitedFiles.length,
			nodes: nodes.length,
			links: links.length,
		},
		nodes,
		links,
	};
});
