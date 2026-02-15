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

const RELATION_TYPES = [
  'enables', 'causes', 'conflicts_with', 'depends_on', 
  'example_of', 'part_of', 'risk_of', 'opportunity_for', 
  'similar_to', 'opposite_of'
];

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

const textureCache = new Map<string, THREE.SpriteMaterial>();

function precomputeTextures() {
  RELATION_TYPES.forEach(type => {
    const material = createTextMaterial(type, false);
    textureCache.set(`link-${type}`, material);
  });
}

function createTextMaterial(text: string, isLabel: boolean) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return new THREE.SpriteMaterial();

  const fontSize = isLabel ? 64 : 40;
  context.font = `bold ${fontSize}px Inter, Arial`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  
  canvas.width = textWidth + 40;
  canvas.height = fontSize + 40;

  context.fillStyle = 'rgba(0, 0, 0, 0.9)';
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, 8);
  context.fill();

  context.font = `bold ${fontSize}px Inter, Arial`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = isLabel ? '#ffffff' : '#999999';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
}

function getSprite(text: string, isLabel: boolean) {
  const key = isLabel ? `node-${text}` : `link-${text}`;
  let material = textureCache.get(key);
  
  if (!material) {
    material = createTextMaterial(text, isLabel);
    textureCache.set(key, material);
  }

  const sprite = new THREE.Sprite(material);
  const scaleFactor = isLabel ? 50 : 100;
  const canvas = material.map?.image;
  if (canvas) {
    sprite.scale.set(canvas.width / scaleFactor, canvas.height / scaleFactor, 1);
  }
  return sprite;
}

onMounted(() => {
  if (container.value) {
    precomputeTextures();
    initGraph();
    if (props.data) updateGraph(props.data);
    
    resizeObserver = new ResizeObserver(() => {
      if (graph && container.value) {
        graph.width(container.value.clientWidth);
        graph.height(container.value.clientHeight);
      }
    });
    resizeObserver.observe(container.value);
    animate();
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

watch(() => [props.selectedNodeId, props.thinkingNodeId], () => {
  // Purely visual change, no layout update needed
  updateVisualStates();
});

watch(() => props.data.settings?.activeAspects, () => {
  if (graph) {
    // Aspects change visual representation and potentially drift forces
    // but we don't call updateGraph to avoid simulation reset
    updateVisualStates();
    applyForces();
  }
}, { deep: true });

function animate() {
  if (graph) {
    const { nodes } = graph.graphData();
    
    if (props.thinkingNodeId) {
      const node = nodes.find((n: any) => n.id === props.thinkingNodeId);
      if (node && node.__threeObj) {
        node.__threeObj.rotation.y += 0.05;
        node.__threeObj.rotation.x += 0.02;
      }
    }

    if (props.selectedNodeId) {
      const selected = nodes.find((n: any) => n.id === props.selectedNodeId);
      if (selected && graph.controls()) {
        graph.controls().target.lerp(new THREE.Vector3(selected.x, selected.y, selected.z), 0.1);
      }
    }
  }
  animationFrameId = requestAnimationFrame(animate);
}

function getHealthColor(node: GraphNode) {
  if (node.status === 'forbidden') return '#450a0a';
  if (props.thinkingNodeId === node.id) return '#22c55e';
  const active = props.data.settings?.activeAspects || [];
  const score = calculateNodeScore(node, active);
  return '#' + getAspectColor(score).getHexString();
}

function calculateNodeScore(node: GraphNode, active: string[]) {
  if (active.length === 0) return 0.5;
  if (!node.aspects) return 0;
  let sum = 0, count = 0;
  active.forEach(a => {
    if (node.aspects[a] !== undefined) { sum += node.aspects[a]; count++; }
  });
  return count > 0 ? sum / count : 0;
}

function getAspectColor(value: number) {
  const colors = [
    { stop: 0.0, color: new THREE.Color('#4a4a4e') },
    { stop: 0.5, color: new THREE.Color('#3b82f6') },
    { stop: 0.75, color: new THREE.Color('#fbbf24') },
    { stop: 1.0, color: new THREE.Color('#ef4444') }
  ];
  if (value <= colors[0].stop) return colors[0].color;
  if (value >= colors[colors.length - 1].stop) return colors[colors.length - 1].color;
  for (let i = 0; i < colors.length - 1; i++) {
    const c1 = colors[i], c2 = colors[i + 1];
    if (value >= c1.stop && value <= c2.stop) {
      return new THREE.Color().copy(c1.color).lerp(c2.color, (value - c1.stop) / (c2.stop - c1.stop));
    }
  }
  return colors[0].color;
}

function updateVisualStates() {
  if (!graph) return;
  const { nodes } = graph.graphData();
  nodes.forEach((node: any) => {
    if (node.__threeObj) {
      const mesh = node.__threeObj.getObjectByName('node-mesh');
      if (mesh && mesh.material) {
        mesh.material.color.set(getHealthColor(node));
        mesh.material.opacity = node.status === 'proposed' ? 0.4 : 0.9;
      }
    }
  });
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
    .nodeThreeObject((node: any) => {
        const group = new THREE.Group();
        const size = (node.val || 2) * config.nodeRelSize;
        let geometry;
        if (node.type === 'root') geometry = new THREE.IcosahedronGeometry(size, 0);
        else geometry = new THREE.SphereGeometry(size, 12, 12);

        const material = new THREE.MeshLambertMaterial({ 
          color: getHealthColor(node), 
          transparent: true, 
          opacity: node.status === 'proposed' ? 0.4 : 0.9 
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = 'node-mesh';
        group.add(mesh);

        const label = getSprite(node.label || node.id, true);
        label.position.y = size + 4;
        label.name = 'node-label';
        group.add(label);
        return group;
    })
    .nodeThreeObjectExtend(false)
    .linkThreeObjectExtend(true)
    .linkThreeObject((link: any) => {
        if (!link.relationType) return null;
        return getSprite(link.relationType, false);
    })
    .linkPositionUpdate((sprite: any, { start, end }: any) => {
        sprite.position.set(
          start.x + (end.x - start.x) / 2,
          start.y + (end.y - start.y) / 2,
          start.z + (end.z - start.z) / 2
        );
    });

  applyConfig();
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

  applyForces();
}

function applyForces() {
  if (!graph) return;
  const active = props.data.settings?.activeAspects || [];
  const baseCharge = -30;

  graph.d3Force('charge')
    .strength((node: any) => {
       if (active.length === 0) return baseCharge;
       const score = calculateNodeScore(node, active);
       // Dynamic repulsion: nodes relevant to active aspects push more significantly
       return -  ( score * 2);
    })
    .distanceMax(500);
}

function updateGraph(data: GraphData) {
  const current = graph.graphData();
  
  // Identify truly new entities
  const existingNodeIds = new Set(current.nodes.map((n: any) => n.id));
  const newNodes = data.nodes.filter(n => !existingNodeIds.has(n.id));
  
  const existingLinkKeys = new Set(current.links.map((l: any) => 
    `${typeof l.source === 'object' ? l.source.id : l.source}=>${typeof l.target === 'object' ? l.target.id : l.target}`
  ));
  const newLinks = data.links.filter(l => !existingLinkKeys.has(`${l.source}=>${l.target}`));

  const topologyChanged = newNodes.length > 0 || newLinks.length > 0 || data.nodes.length < current.nodes.length;

  if (topologyChanged) {
    if (config.cooldownTicks === -1 && data.nodes.length >= current.nodes.length) {
      // Prevent Reheat: Inject new data into existing arrays
      newNodes.forEach(n => {
        const node = { ...n };
        // Try to position new node near its parent to reduce jitter
        const parentLink = data.links.find(l => l.target === n.id);
        const parent = parentLink ? current.nodes.find((cn: any) => cn.id === parentLink.source) : null;
        if (parent) {
          node.x = parent.x + (Math.random() - 0.5) * 20;
          node.y = parent.y + (Math.random() - 0.5) * 20;
          node.z = parent.z + (Math.random() - 0.5) * 20;
        }
        current.nodes.push(node);
      });
      
      newLinks.forEach(l => {
        current.links.push({ ...l });
      });

      // Handle deletions (if any node was removed despite our length check)
      if (data.nodes.length < current.nodes.length) {
        const dataNodeIds = new Set(data.nodes.map(n => n.id));
        current.nodes = current.nodes.filter((n: any) => dataNodeIds.has(n.id));
        const dataLinkKeys = new Set(data.links.map(l => `${l.source}=>${l.target}`));
        current.links = current.links.filter((l: any) => 
          dataLinkKeys.has(`${typeof l.source === 'object' ? l.source.id : l.source}=>${typeof l.target === 'object' ? l.target.id : l.target}`)
        );
      }

      graph.refresh();
    } else {
      // Standard update (Triggers reheat)
      graph.graphData({
        nodes: data.nodes.map(n => ({ ...n })),
        links: data.links.map(l => ({ ...l }))
      });
    }
  }

  // Always sync metadata for existing nodes (aspects, status, etc.)
  const nodeMap = new Map(current.nodes.map((n: any) => [n.id, n]));
  data.nodes.forEach(n => {
    const existing = nodeMap.get(n.id);
    if (existing) {
      const { x, y, z, vx, vy, vz, fx, fy, fz, __threeObj, ...metadata } = n as any;
      Object.assign(existing, metadata);
    }
  });

  updateVisualStates();
}

function focusNode(id: string) {
  const { nodes } = graph.graphData();
  const node = nodes.find((n: any) => n.id === id);
  if (node) {
    graph.cameraPosition({ x: node.x, y: node.y, z: node.z + 140 }, node, 1200);
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
