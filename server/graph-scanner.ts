import { Project } from 'ts-morph'
import * as fs from 'fs'
import * as path from 'path'

const projectCache = new Map<string, Project>()

function findTsConfig(startDir: string): string | null {
    let currentDir = startDir;
    while (true) {
        const configPath = path.resolve(currentDir, 'tsconfig.json');
        if (fs.existsSync(configPath)) {
            return configPath;
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            return null; // Reached root
        }
        currentDir = parentDir;
    }
}

function getProject(scanDir: string): Project {
    if (projectCache.has(scanDir)) {
        return projectCache.get(scanDir)!
    }

    let project: Project
    const tsConfigPath = findTsConfig(scanDir)
    
    try {
        if (tsConfigPath) {
            console.log(`[GraphScanner] Found tsconfig at: ${tsConfigPath}`)
            project = new Project({
                tsConfigFilePath: tsConfigPath,
                skipAddingFilesFromTsConfig: true,
                compilerOptions: { allowJs: true, skipLibCheck: true }
            })
        } else {
            console.warn('[GraphScanner] No tsconfig.json found, using defaults.')
            project = new Project({
                compilerOptions: { allowJs: true, skipLibCheck: true, baseUrl: scanDir }
            })
        }
    } catch (e) {
        console.warn('[GraphScanner] TSConfig error, falling back:', e)
        project = new Project({ compilerOptions: { allowJs: true } })
    }

    projectCache.set(scanDir, project)
    return project
}

function walkSync(dir: string, filelist: string[] = []) {
    if (!fs.existsSync(dir)) return filelist
    try {
        fs.readdirSync(dir).forEach(file => {
            const filepath = path.resolve(dir, file)
            const stat = fs.statSync(filepath)
            if (stat.isDirectory()) {
                if (!['node_modules', '.nuxt', '.output', '.git', 'dist', 'coverage', '.idea', '.vscode'].includes(file)) {
                    walkSync(filepath, filelist)
                }
            } else if (file.match(/\.(ts|vue|js|tsx)$/)) {
                filelist.push(filepath)
            }
        })
    } catch (e) {}
    return filelist
}

/**
 * Scans Vue <template> for component usage.
 */
function scanVueTemplate(content: string, filePath: string, projectRoot: string, fileId: string, links: any[], baseNameToIdMap: Map<string, string>) {
    // Regex to find <MyComponent ... > or <MyComponent />
    const componentRegex = /<([A-Z][a-zA-Z0-9]+)\b/g;
    
    const foundComponents = new Set<string>();
    let match: RegExpExecArray | null;

    while (true) {
        match = componentRegex.exec(content);
        if (!match) break;

        const componentName = match[1];
        // Heuristic: If we have a file named "ComponentName.vue" or "ComponentName.ts" in our map, link it.
        if (baseNameToIdMap.has(componentName) && !foundComponents.has(componentName)) {
            const targetId = baseNameToIdMap.get(componentName)!;
            
            // Prevent self-reference
            if (targetId !== fileId) {
                links.push({ source: fileId, target: targetId, type: 'imports' });
                foundComponents.add(componentName);
            }
        }
    }
}

export function scanProject(projectRoot: string) {
    const project = getProject(projectRoot)

    const sensibleDirs = ['src', 'server', 'app', 'components', 'pages', 'composables', 'utils', 'lib']
    const sourceFiles: string[] = []
    let foundSensible = false
    
    sensibleDirs.forEach(d => {
        const fullPath = path.resolve(projectRoot, d)
        if(fs.existsSync(fullPath)) {
            sourceFiles.push(...walkSync(fullPath))
            foundSensible = true
        }
    })

    if (!foundSensible) sourceFiles.push(...walkSync(projectRoot))

    // Limit files to avoid overwhelming memory
    const limitedFiles = sourceFiles.slice(0, 500)

    // Refresh existing files in project to pick up changes
    project.getSourceFiles().forEach(sf => {
        try {
            sf.refreshFromFileSystemSync()
        } catch (e) {
            // File likely deleted
            project.removeSourceFile(sf)
        }
    })
    
    // Add/Update files in project
    limitedFiles.forEach(file => {
        try { project.addSourceFileAtPath(file) } catch (e) {}
    })

    try {
        project.resolveSourceFileDependencies()
    } catch (e) {
        console.warn('[GraphScanner] Dependency resolution warning:', e)
    }

    const nodes: any[] = []
    const links: any[] = []
    const nodeSet = new Set<string>()

    // Helper to map "MyComponent" -> "src/components/MyComponent.vue"
    const baseNameToIdMap = new Map<string, string>()

    const addNode = (id: string, name: string, type: string, group: number, val: number = 1, errorCount: number = 0) => {
        if (!nodeSet.has(id)) {
            nodes.push({ id, name, type, group, val, errorCount })
            nodeSet.add(id)
            
            // Store mapping for template scanning
            const baseNameNoExt = name.split('.')[0];
            if (!baseNameToIdMap.has(baseNameNoExt)) {
                baseNameToIdMap.set(baseNameNoExt, id);
            }
        }
    }

    // 1. First Pass: Create all File Nodes
    project.getSourceFiles().forEach(sourceFile => {
        const filePath = sourceFile.getFilePath()
        const relPath = path.relative(projectRoot, filePath)
        if (relPath.includes('node_modules') || relPath.startsWith('..')) return
        
        const loc = sourceFile.getEndLineNumber()
        let errorCount = 0
        try {
             if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
                 // Diagnostics disabled for performance
             }
        } catch (e) {}

        addNode(relPath, sourceFile.getBaseName(), 'file', 1, Math.max(1, loc / 5), errorCount)
    });

    // 2. Second Pass: Analyze Content & Links
    project.getSourceFiles().forEach(sourceFile => {
        try {
            const filePath = sourceFile.getFilePath()
            const relPath = path.relative(projectRoot, filePath)
            if (relPath.includes('node_modules') || relPath.startsWith('..')) return

            const fileId = relPath

            // Symbols (Classes/Funcs)
            sourceFile.getClasses().forEach(cls => {
                const name = cls.getName()
                if (name) {
                    const id = `${fileId}#${name}`
                    addNode(id, name, 'class', 2, 5)
                    links.push({ source: fileId, target: id, type: 'contains' })
                }
            })
            sourceFile.getFunctions().forEach(func => {
                const name = func.getName()
                if (name) {
                    const id = `${fileId}#${name}`
                    addNode(id, name, 'function', 3, 3)
                    links.push({ source: fileId, target: id, type: 'contains' })
                }
            })
            
            // Static Imports (TS/JS)
            sourceFile.getImportDeclarations().forEach(importDecl => {
                try {
                    const importedSourceFile = importDecl.getModuleSpecifierSourceFile()
                    if (importedSourceFile) {
                        const targetPath = path.relative(projectRoot, importedSourceFile.getFilePath())
                        if (!targetPath.includes('node_modules') && targetPath !== relPath && !targetPath.startsWith('..')) {
                            links.push({ source: fileId, target: targetPath, type: 'imports' })
                        }
                    }
                } catch (e) {}
            })

            // Vue Template Extraction
            if (filePath.endsWith('.vue')) {
                const content = sourceFile.getFullText();
                scanVueTemplate(content, filePath, projectRoot, fileId, links, baseNameToIdMap);
            }

        } catch (e) {
            console.warn('[GraphScanner] Failed to process file:', sourceFile.getFilePath())
        }
    })

    // Post-process: Increase node size based on incoming connections
    const incomingCounts = new Map<string, number>()
    links.forEach(l => {
        incomingCounts.set(l.target, (incomingCounts.get(l.target) || 0) + 1)
    })

    nodes.forEach(n => {
        n.val = (n.val || 1) + (incomingCounts.get(n.id) || 0)
    })

    // Cycle Detection
    detectCycles(nodes, links);
    
    // Island Detection (Connected Components)
    detectIslands(nodes, links);

    return {
        path: projectRoot,
        stats: { files: limitedFiles.length, nodes: nodes.length, links: links.length },
        nodes, links
    }
}

function detectIslands(nodes: any[], links: any[]) {
    const adj = new Map<string, string[]>();
    nodes.forEach(n => adj.set(n.id, []));
    
    // Treat as undirected for structural clustering
    links.forEach(l => {
        adj.get(l.source)?.push(l.target);
        adj.get(l.target)?.push(l.source);
    });

    const visited = new Set<string>();
    let islandCount = 0;

    nodes.forEach(n => {
        if (!visited.has(n.id)) {
            islandCount++;
            const islandId = `group_${islandCount}`;
            const queue = [n.id];
            visited.add(n.id);
            n.island = islandId;
            
            while(queue.length > 0) {
                const u = queue.shift()!;
                const neighbors = adj.get(u) || [];
                for(const v of neighbors) {
                    if (!visited.has(v)) {
                        visited.add(v);
                        const vNode = nodes.find((node: any) => node.id === v);
                        if (vNode) vNode.island = islandId;
                        queue.push(v);
                    }
                }
            }
        }
    });
}

function detectCycles(nodes: any[], links: any[]) {
    const adj = new Map<string, string[]>();
    nodes.forEach(n => adj.set(n.id, []));
    
    // Only consider import links for cycles
    links.forEach(l => {
        if (l.type === 'imports') {
             if (!adj.has(l.source)) adj.set(l.source, []);
             adj.get(l.source)!.push(l.target);
        }
    });

    let index = 0;
    const stack: string[] = [];
    const indices = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const sccs: string[][] = [];

    function strongconnect(v: string) {
        indices.set(v, index);
        lowlink.set(v, index);
        index++;
        stack.push(v);
        onStack.add(v);

        const neighbors = adj.get(v) || [];
        for (const w of neighbors) {
            if (!indices.has(w)) {
                strongconnect(w);
                lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
            } else if (onStack.has(w)) {
                lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
            }
        }

        if (lowlink.get(v) === indices.get(v)) {
            const scc: string[] = [];
            let w: string;
            do {
                w = stack.pop()!;
                onStack.delete(w);
                scc.push(w);
            } while (w !== v);
            if (scc.length > 1) {
                sccs.push(scc);
            }
        }
    }

    nodes.forEach(n => {
        if (!indices.has(n.id)) {
            strongconnect(n.id);
        }
    });

    // Mark Nodes
    const cycleNodeIds = new Set<string>();
    const idToSccIndex = new Map<string, number>();
    
    sccs.forEach((scc, idx) => {
        scc.forEach(id => {
            cycleNodeIds.add(id);
            idToSccIndex.set(id, idx);
        });
    });

    nodes.forEach(n => {
        if (cycleNodeIds.has(n.id)) n.cycle = true;
    });

    // Mark Links (only if both ends are in the SAME SCC)
    links.forEach(l => {
        const sIdx = idToSccIndex.get(l.source);
        const tIdx = idToSccIndex.get(l.target);
        if (sIdx !== undefined && tIdx !== undefined && sIdx === tIdx) {
            l.cycle = true;
        }
    });
}

export function getNodeDetails(projectRoot: string, nodeId: string) {
    const project = getProject(projectRoot)
    if (!project) throw new Error('Project not initialized')

    const resultLinks: any[] = []
    const resultNodes: any[] = []
    const nodeSet = new Set<string>()

    const add = (id: string, name: string, type: string) => {
        if(!nodeSet.has(id)) {
            resultNodes.push({ id, name, type, group: 1, val: 5 })
            nodeSet.add(id)
        }
    }

    const fullPath = path.resolve(projectRoot, nodeId.split('#')[0])
    let sourceFile;
    try {
        sourceFile = project.getSourceFile(fullPath)
    } catch(e) {}

    if (sourceFile) {
        sourceFile.getImportDeclarations().forEach(imp => {
            try {
                const mod = imp.getModuleSpecifierSourceFile()
                if (mod) {
                    const rel = path.relative(projectRoot, mod.getFilePath())
                    if (!rel.includes('node_modules')) {
                        add(rel, mod.getBaseName(), 'file')
                        resultLinks.push({ source: nodeId, target: rel, type: 'imports' })
                    }
                }
            } catch(e) {}
        })
    }

    return { nodes: resultNodes, links: resultLinks }
}
