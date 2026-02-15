<template>
  <div ref="container" class="w-full h-full" @contextmenu.prevent></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import * as THREE from 'three'
import ForceGraph3D, { type ForceGraph3DInstance } from '3d-force-graph'
import SpriteText from 'three-spritetext'
import type { GraphNode, GraphLink, GraphSettings } from '../types/graph'
import { useGraphConfigStore } from '../stores/graphConfig'

const props = defineProps<{
  nodes: GraphNode[]
  links: GraphLink[]
  settings: GraphSettings
  selectedNodeId?: string | null
  thinkingNodeId?: string | null
}>()

const emit = defineEmits<{ (e: 'select', node: GraphNode | null): void }>()

// --- Physics & Visual Constants ---
const PHYSICS = {
  TRANSITION_SPEED: 0.04,
  LINK_DISTANCE: 45,
  LINK_STRENGTH_BASE: 0.4,
  CHARGE_STRENGTH: -120,
  CHARGE_DYNAMICS: { base: 1.6, multiplier: 1.1 },
  CENTER_GRAVITY_K: 0.08,
  CENTER_GRAVITY_SCORE_BIAS: 0.4,
  SIMILARITY_K: 0.02,
  SIMILARITY_THRESHOLD: 0.85,
  SIMILARITY_FORCE_MULTIPLIER: 0.05,
  VELOCITY_DECAY: 0.4,
  NODE_SIZE_RANGE: { min: 1, max: 15 }, // Range for node value (radius factor)
  NODE_REL_SIZE: 1.5, // Base relative size multiplier
  FOCUS_DISTANCE: 80,
  SCORE_THRESHOLDS: { irrelevant: 0.25, relevant: 0.85, center: 0.5, high: 0.7 }
};

const container = ref<HTMLElement | null>(null)
const config = useGraphConfigStore()
const graph = shallowRef<ForceGraph3DInstance | null>(null)
let resizeObserver: ResizeObserver | null = null
let updateTimer: number | null = null;

// Physics and Animation state
const nodePhysicsData = new Map<string, { currentScore: number, targetScore: number }>();
let transitionAlpha = 1.0;

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>, aspects: string[]) {
  if (!aspects.length) return 0;
  let dot = 0, mA = 0, mB = 0;
  for (const k of aspects) {
    const valA = a[k] || 0;
    const valB = b[k] || 0;
    dot += valA * valB;
    mA += valA * valA;
    mB += valB * valB;
  }
  const mag = Math.sqrt(mA) * Math.sqrt(mB);
  return mag === 0 ? 0 : dot / mag;
}

function calculateNodeScore(node: GraphNode, active: string[]): number {
  if (!active || active.length === 0) return 0.5;
  const aspects = node.aspects || {};
  let sum = 0, count = 0;
  for (const key of active) {
    if (typeof aspects[key] === 'number') {
      sum += aspects[key]; count++;
    }
  }
  return count > 0 ? sum / count : 0.2;
}

function scheduleUpdate() {
  if (updateTimer) return;
  updateTimer = window.requestAnimationFrame(() => {
    updateData();
    updateTimer = null;
  });
}

watch(() => props.nodes.length, scheduleUpdate);
watch(() => props.links.length, scheduleUpdate);

watch(() => props.settings.activeAspects, (active) => {
  props.nodes.forEach(n => {
    const data = nodePhysicsData.get(n.id) || { currentScore: 0.5, targetScore: 0.5 };
    data.targetScore = calculateNodeScore(n, active);
    nodePhysicsData.set(n.id, data);
  });
  transitionAlpha = 0;
  if (graph.value) {
    graph.value.d3ReheatSimulation();
  }
}, { deep: true, immediate: true });

function updateData() {
  if (!graph.value) return;
  const currentData = graph.value.graphData();
  const nodeMap = new Map(currentData.nodes.map((n: any) => [n.id, n]));
  
  const nextNodes = props.nodes.map(n => {
    const existing = nodeMap.get(n.id);
    if (existing) return Object.assign(existing, n);
    const newNode = { ...n };
    nodePhysicsData.set(n.id, { currentScore: 0.5, targetScore: calculateNodeScore(n, props.settings.activeAspects) });
    return newNode;
  });

  graph.value.graphData({
    nodes: nextNodes,
    links: props.links.map(l => ({ ...l }))
  });
}

function initGraph() {
  if (!container.value) return;
  
  const g = new ForceGraph3D(container.value)
    .backgroundColor('#19191d')
    .nodeColor(node => getHealthColor(node as GraphNode))
    .nodeVal(node => {
      const score = nodePhysicsData.get((node as any).id)?.currentScore || 0.5;
      return PHYSICS.NODE_SIZE_RANGE.min + (PHYSICS.NODE_SIZE_RANGE.max - PHYSICS.NODE_SIZE_RANGE.min) * score;
    })
    .nodeThreeObject(node => {
      const sprite = new SpriteText((node as GraphNode).label);
      sprite.color = '#ffffff';
      sprite.textHeight = config.labelSize * 4;
      sprite.center.y = -1.2; // Slightly more offset for larger nodes
      return sprite;
    })
    .nodeThreeObjectExtend(true)
    .linkColor(() => 'rgba(255,255,255,0.15)')
    .onNodeClick((node: any) => {
      emit('select', node);
      performFocus(node);
    });

  // Force: Link Strength
  g.d3Force('link')?.distance(PHYSICS.LINK_DISTANCE).strength(link => {
    const s = nodePhysicsData.get((link.source as any).id)?.currentScore || 0.5;
    const t = nodePhysicsData.get((link.target as any).id)?.currentScore || 0.5;
    return PHYSICS.LINK_STRENGTH_BASE * ((s + t) / 2);
  });

  // Force: Repulsion (Charge)
  g.d3Force('charge')?.strength(node => {
    const score = nodePhysicsData.get((node as any).id)?.currentScore || 0.5;
    return PHYSICS.CHARGE_STRENGTH * (PHYSICS.CHARGE_DYNAMICS.base - score * PHYSICS.CHARGE_DYNAMICS.multiplier);
  });

  // Force: Aspect-Based Gravity
  g.d3Force('aspectCenter', (alpha: number) => {
    const nodes = g.graphData().nodes;
    const k = PHYSICS.CENTER_GRAVITY_K * alpha;
    nodes.forEach((n: any) => {
      const score = nodePhysicsData.get(n.id)?.currentScore || 0.5;
      n.vx += (0 - n.x) * k * score * PHYSICS.CENTER_GRAVITY_SCORE_BIAS;
      n.vy += (0 - n.y) * k * score * PHYSICS.CENTER_GRAVITY_SCORE_BIAS;
      n.vz += (0 - n.z) * k * score * PHYSICS.CENTER_GRAVITY_SCORE_BIAS;
    });
  });

  // Force: Similarity Spring
  g.d3Force('similarity', (alpha: number) => {
    const nodes = g.graphData().nodes;
    if (nodes.length > 80) return; 
    const k = PHYSICS.SIMILARITY_K * alpha;
    const allAspects = props.settings.definedAspects;
    if (allAspects.length === 0) return;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i] as any;
        const b = nodes[j] as any;
        const sim = cosineSimilarity(a.aspects || {}, b.aspects || {}, allAspects);
        
        if (sim > PHYSICS.SIMILARITY_THRESHOLD) {
          const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
          const f = sim * k * PHYSICS.SIMILARITY_FORCE_MULTIPLIER;
          a.vx += dx * f; a.vy += dy * f; a.vz += dz * f;
          b.vx -= dx * f; b.vy -= dy * f; b.vz -= dz * f;
        }
      }
    }
  });

  // Transition Loop: Interpolate Scores and Refresh Visuals
  g.d3Force('transition', () => {
    if (transitionAlpha < 1.0) {
      transitionAlpha = Math.min(1.0, transitionAlpha + PHYSICS.TRANSITION_SPEED);
      nodePhysicsData.forEach((data) => {
        data.currentScore += (data.targetScore - data.currentScore) * PHYSICS.TRANSITION_SPEED * 2.5;
      });
      // Refresh visual properties
      g.nodeColor(g.nodeColor());
      g.nodeVal(g.nodeVal());
    }
  });

  g.nodeRelSize(PHYSICS.NODE_REL_SIZE)
   .linkWidth(config.linkWidth)
   .linkOpacity(config.linkOpacity)
   .linkDirectionalParticles(config.linkDirectionalParticles)
   .linkCurvature(0.1)
   .d3VelocityDecay(PHYSICS.VELOCITY_DECAY);

  graph.value = g;
  updateData();
}

function getHealthColor(node: GraphNode) {
  if (node.status === 'forbidden') return '#450a0a';
  if (props.thinkingNodeId === node.id) return '#22c55e';
  const data = nodePhysicsData.get(node.id);
  const score = data ? data.currentScore : 0.5;
  return '#' + getAspectColor(score).getHexString();
}

function getAspectColor(value: number): THREE.Color {
  const cGray = new THREE.Color('#4a4a4e');
  const cBlue = new THREE.Color('#3b82f6');
  const cYellow = new THREE.Color('#fbbf24');
  const cRed = new THREE.Color('#ef4444');

  if (props.settings.activeAspects.length === 0) return cBlue;

  const T = PHYSICS.SCORE_THRESHOLDS;
  if (value <= T.irrelevant) return cGray;
  if (value >= T.relevant) return cRed;
  
  if (value < T.center) {
    const alpha = (value - T.irrelevant) / (T.center - T.irrelevant);
    return cGray.clone().lerp(cBlue, alpha);
  } else if (value < T.high) {
    const alpha = (value - T.center) / (T.high - T.center);
    return cBlue.clone().lerp(cYellow, alpha);
  } else {
    const alpha = (value - T.high) / (T.relevant - T.high);
    return cYellow.clone().lerp(cRed, alpha);
  }
}

function performFocus(node: any) {
  if (!graph.value) return;
  const distance = PHYSICS.FOCUS_DISTANCE;
  const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
  const newPos = (node.x || node.y || node.z)
    ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
    : { x: 0, y: 0, z: distance };
  graph.value.cameraPosition(newPos, node, 2000);
}

watch(() => config.linkOpacity, (val) => {
  if (graph.value) graph.value.linkOpacity(val);
});

watch(() => config.labelSize, () => {
  if (graph.value) graph.value.nodeThreeObject(graph.value.nodeThreeObject());
});

onMounted(() => {
  initGraph();
  resizeObserver = new ResizeObserver(() => {
    if (graph.value && container.value) {
      graph.value.width(container.value.clientWidth);
      graph.value.height(container.value.clientHeight);
    }
  });
  resizeObserver.observe(container.value!);
});

onBeforeUnmount(() => {
  if (updateTimer) cancelAnimationFrame(updateTimer);
  resizeObserver?.disconnect();
  graph.value?._destructor();
});

defineExpose({
  focusNode: (id: string) => {
    const node = props.nodes.find(n => n.id === id);
    if (node) performFocus(node);
  },
  reheat: () => graph.value?.d3ReheatSimulation()
})
</script>