<template>
  <div 
    ref="container" 
    class="w-full h-full" 
    @contextmenu.prevent 
    @mousedown="onContainerMouseDown"
  ></div>
</template>

<script setup lang="ts">
/// <reference lib="dom" />
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

watch(() => [props.selectedNodeId, props.thinkingNodeId], () => {
    if (graph) {
      setupGeometries();
      graph.refresh();
    }
});

watch(() => props.data.settings?.activeAspects, () => {
    if (graph) {
      updateNodeVisuals();
      applyConfig();
      // Simulation is NOT reheated here to maintain stability
    }
}, { deep: true });

watch(() => [props.selectedNodeId, props.thinkingNodeId], () => {
    if (graph) {
      setupGeometries();
      graph.refresh();

    }
});

watch(() => props.data.settings?.activeAspects, () => {
    if (graph) {
      applyConfig();
      graph.refresh();
    }
}, { deep: true });

function animate() {
  if (graph) {
    const { nodes } = graph.graphData();
    
    // Thinking node animation
    if (props.thinkingNodeId) {
      const node = nodes.find((n: any) => n.id === props.thinkingNodeId);
      if (node && node.__threeObj) {
        node.__threeObj.rotation.y += 0.05;
        node.__threeObj.rotation.x += 0.02;
      }
    }

    // Smoothly track selected node if it's moving (physics)
    if (props.selectedNodeId) {
      const selected = nodes.find((n: any) => n.id === props.selectedNodeId);
      if (selected && graph.controls()) {
        // Continuously update the rotation target to follow the node
        graph.controls().target.lerp(new THREE.Vector3(selected.x, selected.y, selected.z), 0.1);
      }
    }
  }
  animationFrameId = requestAnimationFrame(animate)
}

function calculateNodeScore(node: GraphNode, active: string[]) {
  if (active.length === 0) return 0.5;
  if (!node.aspects || Object.keys(node.aspects).length === 0) return 0;

  let sum = 0;
  let count = 0;
  active.forEach(a => {
    if (node.aspects && node.aspects[a] !== undefined) {
       sum += node.aspects[a];
       count++;
    }
  });
  return count > 0 ? sum / count : 0;
}

function getAspectColor(value: number) {
  const colors = [
    { stop: 0.0, color: new THREE.Color('#4a4a4e') }, // Gray (0%)
    { stop: 0.5, color: new THREE.Color('#3b82f6') }, // Blue (50%)
    { stop: 0.75, color: new THREE.Color('#fbbf24') }, // Yellow (75%)
    { stop: 1.0, color: new THREE.Color('#ef4444') }  // Red (100%)
  ];

  if (value <= colors[0].stop) return colors[0].color;
  if (value >= colors[colors.length - 1].stop) return colors[colors.length - 1].color;

  for (let i = 0; i < colors.length - 1; i++) {
    const c1 = colors[i];
    const c2 = colors[i + 1];
    if (value >= c1.stop && value <= c2.stop) {
      const alpha = (value - c1.stop) / (c2.stop - c1.stop);
      return new THREE.Color().copy(c1.color).lerp(c2.color, alpha);
    }
  }
  return colors[0].color;
}

function updateNodeVisuals() {
  if (!graph) return;
  const { nodes } = graph.graphData();
  nodes.forEach((node: any) => {
    if (node.__threeObj) {
      const mesh = node.__threeObj.getObjectByName('node-mesh');
      if (mesh && mesh.material) {
        mesh.material.color.set(getHealthColor(node));
      }
    }
  });
}

function getHealthColor(node: GraphNode) {
  if (node.status === 'forbidden') return '#450a0a';
  if (props.thinkingNodeId === node.id) return '#22c55e';

  const active = props.data.settings?.activeAspects || [];
  const score = calculateNodeScore(node, active);

  return '#' + getAspectColor(score).getHexString();
}

function initGraph() {
  graph = new ForceGraph3D(container.value!)
    .nodeLabel("")
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
    .d3VelocityDecay(0.3);

  // Force set to stable -20 as requested
  const baseCharge = -20;
  const active = props.data.settings?.activeAspects || [];

  graph.d3Force('charge')
    .strength((node: any) => {
      if (active.length === 0) return baseCharge;
      const score = calculateNodeScore(node, active);
      const multiplier = 2.5 - (score * 1.5);
      return baseCharge * multiplier;
    })
    .distanceMax(500);
}

function createTextSprite(text: string, isLabel = true) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Object3D();

  const fontSize = isLabel ? 63 : 48; // 1.5x for nodes (42->63), 2x for links (24->48)
  context.font = `bold ${fontSize}px Inter, Arial`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  
  canvas.width = textWidth + 40;
  canvas.height = fontSize + 40;

  context.fillStyle = 'rgba(0, 0, 0, 0.9)'; // Black background
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
      const { x, y, z, fx, fy, fz, __threeObj, neighbors, links, ...serializable } = n;
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
    const distance = 140;
    // Smoothly transition camera position and look-at target
    // Passing 'node' as the second argument automatically updates the OrbitControls target
    graph.cameraPosition(
      { x: node.x, y: node.y, z: node.z + distance }, 
      node, 
      1200
    );
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
