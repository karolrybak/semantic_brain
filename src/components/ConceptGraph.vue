<template>
  <div 
    ref="container" 
    class="w-full h-full" 
    @contextmenu.prevent 
  ></div>
</template>

<script setup lang="ts">
/// <reference lib="dom" />
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph'
import SpriteText from 'three-spritetext'
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
let graph: ForceGraph3DInstance | null = null
let resizeObserver: ResizeObserver | null = null
const draggedNode = ref<GraphNode | null>(null)
let animationFrameId: number | null = null

onMounted(() => {
  if (container.value) {
    initGraph();
    if (props.data) updateGraph(props.data);
    
    resizeObserver = new ResizeObserver(() => {
      if (graph && container.value) {
        graph.width(container.value.clientWidth);
        graph.height(container.value.clientHeight);
      }
    });
    resizeObserver.observe(container.value);
    
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
  if (graph) graph._destructor();
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
});

watch(() => props.data, (newData) => {
  if (graph) updateGraph(newData);
}, { deep: true });


function getHealthColor(node: GraphNode) {
  if (node.status === 'forbidden') return '#450a0a';
  if (props.thinkingNodeId === node.id) return '#22c55e';
  const active = props.data.settings?.activeAspects || [];
  const score = calculateNodeScore(node, active);
  return '#' + getAspectColor(score).getHexString();
}

function calculateNodeScore(node: GraphNode, active: string[]): number {
  if (!active || active.length === 0) return 0.5;
  const aspects = node.aspects || {};
  let sum = 0;
  let count = 0;
  for (const key of active) {
    const val = aspects[key];
    if (typeof val === 'number') {
      sum += val;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

function getAspectColor(value: number): THREE.Color {
  const cGray = new THREE.Color('#4a4a4e');
  const cBlue = new THREE.Color('#3b82f6');
  const cYellow = new THREE.Color('#fbbf24');
  const cRed = new THREE.Color('#ef4444');

  if (value <= 0) return cGray;
  if (value >= 1) return cRed;

  if (value < 0.5) {
    const alpha = value / 0.5;
    return cGray.clone().lerp(cBlue, alpha);
  } else if (value < 0.75) {
    const alpha = (value - 0.5) / 0.25;
    return cBlue.clone().lerp(cYellow, alpha);
  } else {
    const alpha = (value - 0.75) / 0.25;
    return cYellow.clone().lerp(cRed, alpha);
  }
}

function performFocus(node: any) {
  if (!graph) return;
  const distance = 40;
  const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);

  const newPos = (node.x || node.y || node.z)
    ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
    : { x: 0, y: 0, z: distance };

  graph.cameraPosition(
    newPos,
    node,
    3000
  );
}

function initGraph() {
  graph = new ForceGraph3D(container.value!)
    .nodeColor(node => getHealthColor(node as GraphNode))
    // .nodeLabel(null)
    .nodeThreeObject(node => {
      const sprite = new SpriteText((node as GraphNode).label);
      sprite.material.depthWrite = false;
      sprite.color = '#ffffff';
      sprite.textHeight = config.labelSize * 4;
      sprite.center.y = -0.8;
      return sprite;
    })
    .nodeThreeObjectExtend(true)
    .linkColor(() => '#ffffff')
    .onNodeClick((node: any) => {
      emit('select', node);
      performFocus(node);
    })

  applyConfig();
}

function applyConfig() {
  if (!graph) return;
  graph
    .backgroundColor('#19191d')
    .nodeRelSize(config.nodeRelSize)
    .linkWidth(config.linkWidth)
    .linkOpacity(config.linkOpacity)
    .linkDirectionalParticles(config.linkDirectionalParticles)
    .linkDirectionalParticleSpeed(0.005)
    .linkCurvature(0.1)
    .showNavInfo(true)
    // .cooldownTicks(config.cooldownTicks === -1 ? Infinity : config.cooldownTicks)
    // .d3VelocityDecay(0.3);
    graph.d3Force('charge')?.strength(-120);

  // applyForces();
}

// function applyForces() {
//   if (!graph) return;
//   const active = props.data.settings?.activeAspects || [];
//   const baseCharge = -80;

//   graph.d3Force('charge')
//     ?.strength((node: any) => {
//        if (active.length === 0) return baseCharge;
//        const score = calculateNodeScore(node, active);
//        return baseCharge * (1 + score * 1.5);
//     })
//     .distanceMax(500);
// }

function updateGraph(data: GraphData) {
  if (!graph || !data.nodes) return;
  console.log("graph update", data.nodes.length);
  const currentData = graph.graphData();
  const currentNodesMap = new Map(currentData.nodes.map((n: any) => [n.id, n]));

  const nextNodes = data.nodes.map(nodeData => {
    const existing = currentNodesMap.get(nodeData.id);
    if (existing) {
      Object.assign(existing, nodeData);
      return existing;
    } else {
      const newNode = { ...nodeData };
      const link = data.links.find(l => l.target === nodeData.id);
      const parentId = link ? (typeof link.source === 'string' ? link.source : (link.source as any).id) : null;
      const parent = parentId ? currentNodesMap.get(parentId) : null;
      if (parent) {
        newNode.x = parent.x + (Math.random() - 0.5) * 20;
        newNode.y = parent.y + (Math.random() - 0.5) * 20;
        newNode.z = parent.z + (Math.random() - 0.5) * 20;
      }
      return newNode;
    }
  });

  graph.graphData({
    nodes: nextNodes,
    links: data.links.map(l => ({ ...l }))
  });
}

function reheat() {
  if (graph) graph.d3ReheatSimulation();
}

function focusNode(id: string) {
  if (!graph) return;
  const { nodes } = graph.graphData();
  const node = nodes.find((n: any) => n.id === id);
  if (node) {
    performFocus(node);
  }
}

defineExpose({ focusNode, reheat })
</script>