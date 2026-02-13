<template>
  <div 
    ref="container" 
    class="w-full h-full" 
    @contextmenu.prevent 
    @mousedown="onContainerMouseDown"
  ></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import ForceGraph3D from '3d-force-graph'
import type { GraphData, GraphNode } from '../types/graph'
import { useGraphConfigStore } from '../stores/graphConfig'

const props = defineProps<{
  data: GraphData
  selectedNodeId?: string
  thinkingNodeId?: string | null
}>()

const emit = defineEmits<{ (e: 'select', node: GraphNode | null): void }>()

const container = ref<HTMLElement | null>(null)
const config = useGraphConfigStore()
let graph: any = null
let resizeObserver: ResizeObserver | null = null
const draggedNode = ref<GraphNode | null>(null)
let animationFrameId: number | null = null

onMounted(() => {
  if (container.value) {
    initGraph()
    if (props.data) updateGraph(props.data)
    resizeObserver = new ResizeObserver(() => {
      if (graph && container.value) {
        graph.width(container.value.clientWidth)
        graph.height(container.value.clientHeight)
      }
    })
    resizeObserver.observe(container.value)
    animate()
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect()
  if (graph) graph._destructor()
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
})

watch(() => props.data, (newData) => {
  if (graph) updateGraph(newData)
}, { deep: true })

watch(
  () => [config.nodeRelSize, config.linkWidth, config.linkOpacity, config.linkDirectionalParticles, config.chargeStrength],
  () => { if (graph) applyConfig() }
)

watch(() => [props.selectedNodeId, props.thinkingNodeId], () => {
    if (graph) setupGeometries()
})

function animate() {
  if (props.thinkingNodeId && graph) {
    const { nodes } = graph.graphData()
    const node = nodes.find((n: any) => n.id === props.thinkingNodeId)
    if (node && node.__threeObj) {
      node.__threeObj.rotation.y += 0.05
      node.__threeObj.rotation.x += 0.02
    }
  }
  animationFrameId = requestAnimationFrame(animate)
}

function getHealthColor(node: GraphNode) {
  if (node.status === 'forbidden') return '#450a0a'
  if (props.thinkingNodeId === node.id) return '#22c55e'
  if (node.type === 'root') return '#f43f5e'
  if (node.status === 'accepted') return '#3b82f6'
  return '#71717a'
}

function initGraph() {
  graph = ForceGraph3D()(container.value!)
    .nodeLabel(null)
    .onNodeClick((node: any) => emit('select', node))
    .onNodeDrag((node: any) => draggedNode.value = node)
    .onNodeDragEnd((node: any) => {
        if (node.isLocked) { node.fx = node.x; node.fy = node.y; node.fz = node.z }
        else { node.fx = null; node.fy = null; node.fz = null }
        draggedNode.value = null
    })

  applyConfig()
  setupGeometries()
}

function applyConfig() {
  graph
    .backgroundColor('#19191d')
    .nodeRelSize(config.nodeRelSize)
    .linkWidth(config.linkWidth)
    .linkOpacity(config.linkOpacity)
    .linkDirectionalParticles(config.linkDirectionalParticles)
    .linkDirectionalParticleSpeed(0.005)
    .linkCurvature(0.1)
    .showNavInfo(false)

  graph.d3Force('charge').strength(config.chargeStrength)
}

function createTextSprite(text: string, isLabel = true) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Object3D();

  const fontSize = isLabel ? 42 : 24;
  context.font = `bold ${fontSize}px Inter, Arial`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  
  canvas.width = textWidth + 40;
  canvas.height = fontSize + 40;

  context.fillStyle = isLabel ? 'rgba(10, 10, 15, 0.9)' : 'rgba(25, 25, 30, 0.7)';
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, 8);
  context.fill();

  context.font = `bold ${fontSize}px Inter, Arial`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = isLabel ? '#ffffff' : '#888888';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  const scaleFactor = isLabel ? 50 : 80;
  sprite.scale.set(canvas.width / scaleFactor, canvas.height / scaleFactor, 1);
  return sprite;
}

function setupGeometries() {
  graph
    .nodeThreeObject((node: any) => {
        const group = new THREE.Group();
        const size = (node.val || 2) * config.nodeRelSize;
        let geometry;
        if (props.thinkingNodeId === node.id) geometry = new THREE.OctahedronGeometry(size * 1.5, 0);
        else if (node.type === 'root') geometry = new THREE.IcosahedronGeometry(size, 0);
        else geometry = new THREE.SphereGeometry(size, 16, 16);

        let opacity = node.status === 'proposed' ? 0.4 : 0.9;
        const active = props.data.settings?.activeAspects || [];
        if (active.length > 0) {
           let sum = 0;
           active.forEach(a => sum += (node.aspects?.[a] || 0));
           const avg = sum / Math.max(1, active.length);
           opacity = Math.max(0.1, avg);
        }

        const material = new THREE.MeshLambertMaterial({ color: getHealthColor(node), transparent: true, opacity });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = 'node-mesh';
        group.add(mesh);

        const label = createTextSprite(node.label || node.id, true);
        label.position.y = size + 2;
        label.name = 'node-label';
        group.add(label);
        return group;
    })
    .nodeThreeObjectExtend(false)
    .linkThreeObjectExtend(true)
    .linkThreeObject((link: any) => {
        if (!link.relationType) return null;
        return createTextSprite(link.relationType, false);
    })
    .linkPositionUpdate((sprite: any, { start, end }: any) => {
        const middlePos = Object.assign({}, ...['x', 'y', 'z'].map(c => ({
          [c]: start[c] + (end[c] - start[c]) / 2
        })));
        Object.assign(sprite.position, middlePos);
    });
}

function updateGraph(data: GraphData) {
  const currentGraphData = graph.graphData();
  const existingNodes = new Map(currentGraphData.nodes.map((n: any) => [n.id, n]));
  const nodes = data.nodes.map(n => {
    const existing = existingNodes.get(n.id);
    if (existing) {
      const { x, y, z, fx, fy, fz, vx, vy, vz, __threeObj, neighbors, links, ...serializable } = n;
      Object.assign(existing, serializable);
      return existing;
    }
    return { ...n };
  });
  graph.graphData({ nodes, links: data.links.map(l => ({ ...l })) });
}

function focusNode(id: string) {
  const { nodes } = graph.graphData();
  const node = nodes.find((n: any) => n.id === id);
  if (node) {
    const distance = 80;
    graph.cameraPosition({ x: node.x, y: node.y, z: node.z + distance }, node, 1500);
  }
}

function onContainerMouseDown(e: MouseEvent) { if (e.button === 2 && draggedNode.value) toggleLock(draggedNode.value) }
function toggleLock(node: any) {
  node.isLocked = !node.isLocked
  if (node.isLocked) { node.fx = node.x; node.fy = node.y; node.fz = node.z }
  else { node.fx = null; node.fy = null; node.fz = null }
}
defineExpose({ focusNode })
</script>
