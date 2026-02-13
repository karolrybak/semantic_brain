import { Project } from 'ts-morph'
import * as fs from 'fs'
import * as path from 'path'

const projectRoot = process.cwd()
const outputPath = path.resolve(projectRoot, 'public/graph.json')

console.log('Scanning project...')

const project = new Project({
  tsConfigFilePath: path.resolve(projectRoot, 'tsconfig.json'),
  skipAddingFilesFromTsConfig: true,
})

// Add files manually from src
project.addSourceFilesAtPaths(['src/**/*.ts', 'src/**/*.vue'])

const nodes: any[] = []
const links: any[] = []
const nodeSet = new Set<string>()

function addNode(id: string, name: string, type: string, group: number, val: number) {
  if (!nodeSet.has(id)) {
    nodes.push({ id, name, type, group, val })
    nodeSet.add(id)
  }
}

project.getSourceFiles().forEach(sourceFile => {
  const filePath = path.relative(projectRoot, sourceFile.getFilePath())
  const id = filePath
  const loc = sourceFile.getEndLineNumber()

  addNode(id, path.basename(filePath), 'file', 1, loc / 5)

  // Classes
  sourceFile.getClasses().forEach(c => {
    const name = c.getName()
    if (name) {
       const cid = `${id}#${name}`
       addNode(cid, name, 'class', 2, 5)
       links.push({ source: id, target: cid, type: 'contains' })
    }
  })

  // Imports
  sourceFile.getImportDeclarations().forEach(imp => {
    const moduleFile = imp.getModuleSpecifierSourceFile()
    if (moduleFile) {
      const targetPath = path.relative(projectRoot, moduleFile.getFilePath())
      if (!targetPath.includes('node_modules')) {
         if (!nodeSet.has(targetPath)) {
             addNode(targetPath, path.basename(targetPath), 'file', 1, 1)
         }
         links.push({ source: id, target: targetPath, type: 'imports' })
      }
    }
  })
})

const data = { nodes, links }
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2))
console.log(`Graph saved to ${outputPath} (${nodes.length} nodes, ${links.length} links)`)
