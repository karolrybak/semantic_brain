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
  LINK_DISTANCE: 35,
  LINK_STRENGTH_BASE: 0.4,
  ASPECT_FILTER_LINK_MULT: 0.1, // Reduction when filtering
  CHARGE_STRENGTH: -120,
  ASPECT_FILTER_CHARGE_MULT: 0.4, 
  CHARGE_DYNAMICS: { base: 1.2, multiplier: 0.4 },
  CENTER_GRAVITY_K: 0.08,
  CENTER_GRAVITY_SCORE_BIAS: 5,
  SIMILARITY_K: 0.01,
  SIMILARITY_THRESHOLD: 0.85,
  SIMILARITY_FORCE_MULTIPLIER: 0.5,
  VELOCITY_DECAY: 0.4,
  NODE_SIZE_RANGE: { min: 1, max: 15 },
  NODE_REL_SIZE: 1.5,
  FOCUS_DISTANCE: 80,
  MAX_DISTANCE: 5000,
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
let currentLinkMult = 1.0;
let targetLinkMult = 1.0;
let currentChargeMult = 1.0;
let targetChargeMult = 1.0;

// Clock for pulsing animations
const clock = new THREE.Clock();

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
  
  const isFiltering = active.length > 0;
  targetLinkMult = isFiltering ? PHYSICS.ASPECT_FILTER_LINK_MULT : 1.0;
  targetChargeMult = isFiltering ? PHYSICS.ASPECT_FILTER_CHARGE_MULT : 1.0;

  transitionAlpha = 0;
  if (graph.value) graph.value.d3ReheatSimulation();
}, { deep: true, immediate: true });

watch(() => props.thinkingNodeId, () => {
  if (graph.value) graph.value.nodeThreeObject(graph.value.nodeThreeObject());
});

function updateData() {
  if (!graph.value) return;
  const currentData = graph.value.graphData();
  const nodeMap = new Map(currentData.nodes.map((n: any) => [n.id, n]));
  
  let needsObjectRefresh = false;
  const nextNodes = props.nodes.map(n => {
    const existing = nodeMap.get(n.id);
    if (existing) {
      if (existing.label !== n.label || existing.emoji !== n.emoji || existing.status !== n.status) {
        needsObjectRefresh = true;
      }
      return Object.assign(existing, n);
    }
    const newNode = { ...n };
    nodePhysicsData.set(n.id, { currentScore: 0.5, targetScore: calculateNodeScore(n, props.settings.activeAspects) });
    return newNode;
  });

  graph.value.graphData({
    nodes: nextNodes,
    links: props.links.map(l => ({ ...l }))
  });

  if (needsObjectRefresh) {
    graph.value.nodeThreeObject(graph.value.nodeThreeObject());
  }
}

function createThinkingHalo() {
  const geometry = new THREE.SphereGeometry(6, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide
  });
  const halo = new THREE.Mesh(geometry, material);
  halo.name = 'thinking-halo';
  return halo;
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
      const gNode = node as GraphNode;
      const group = new THREE.Group();

      // Label
      var text = gNode.label
      if(props.settings.showEmoji && gNode.emoji) 
        text = `${gNode.emoji} ${text}`
      const sprite = new SpriteText(text);
      sprite.color = '#ffffff';
      sprite.textHeight = config.labelSize * 4;
      sprite.center.y = -1.2;
      group.add(sprite);

      // Thinking Aura
      if (props.thinkingNodeId === gNode.id) {
        group.add(createThinkingHalo());
      }

      return group;
    })
    .nodeThreeObjectExtend(true)
    .linkColor(() => 'rgba(255,255,255,0.15)')
    .onNodeClick((node: any) => {
      emit('select', node);
      performFocus(node);
    });

  // Forces
  g.d3Force('link')?.distance(PHYSICS.LINK_DISTANCE).strength(link => {
    const s = nodePhysicsData.get((link.source as any).id)?.currentScore || 0.5;
    const t = nodePhysicsData.get((link.target as any).id)?.currentScore || 0.5;
    const isFiltering = props.settings.activeAspects.length > 0;
    const mult = isFiltering ? currentLinkMult : 1.0;
    return PHYSICS.LINK_STRENGTH_BASE * ((s + t) / 2) * mult;
  });

  g.d3Force('charge')?.strength(node => {
    const score = nodePhysicsData.get((node as any).id)?.currentScore || 0.5;
    const strength = PHYSICS.CHARGE_STRENGTH * (PHYSICS.CHARGE_DYNAMICS.base - score * PHYSICS.CHARGE_DYNAMICS.multiplier);
    return strength * currentChargeMult;
  });

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

  // Animation & Transition Loop
  g.d3Force('transition', () => {
    const elapsed = clock.getElapsedTime();
    const lerpFactor = PHYSICS.TRANSITION_SPEED * 2.5;

    if (transitionAlpha < 1.0) {
      transitionAlpha = Math.min(1.0, transitionAlpha + PHYSICS.TRANSITION_SPEED);
      nodePhysicsData.forEach((data) => {
        data.currentScore += (data.targetScore - data.currentScore) * lerpFactor;
      });
      currentLinkMult += (targetLinkMult - currentLinkMult) * lerpFactor;
      currentChargeMult += (targetChargeMult - currentChargeMult) * lerpFactor;
      
      g.nodeColor(g.nodeColor());
      g.nodeVal(g.nodeVal());
      const lForce: any = g.d3Force('link');
      if (lForce) lForce.strength(lForce.strength());
      const cForce: any = g.d3Force('charge');
      if (cForce) cForce.strength(cForce.strength());
    }

    // Animate Thinking Halos
    g.graphData().nodes.forEach((node: any) => {
      if (node.__threeObj && props.thinkingNodeId === node.id) {
        const halo = node.__threeObj.getObjectByName('thinking-halo');
        if (halo) {
          const pulse = (Math.sin(elapsed * 4) + 1) / 2;
          halo.scale.setScalar(1.2 + pulse * 0.4);
          halo.material.opacity = 0.1 + pulse * 0.2;
        }
      }
    });
  });

  g.nodeRelSize(PHYSICS.NODE_REL_SIZE)
   .linkWidth(config.linkWidth)
   .linkOpacity(config.linkOpacity)
   .linkDirectionalParticles(config.linkDirectionalParticles)
   .linkCurvature(0.1)
   .d3VelocityDecay(PHYSICS.VELOCITY_DECAY);

  graph.value = g;
  g.controls().maxDistance = PHYSICS.MAX_DISTANCE;

  // Starfield background
  const starsGeometry = new THREE.BufferGeometry();
  const starCount = 1000;
  const positions = [];
  for (let i = 0; i < starCount; i++) {
    positions.push(
      (Math.random() - 0.5) * 10000,
      (Math.random() - 0.5) * 10000,
      (Math.random() - 0.5) * 10000
    );
  }
  starsGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1,
    sizeAttenuation: true
  });
  const starField = new THREE.Points(starsGeometry, starsMaterial);
  g.scene().add(starField);

  updateData();
  }



function getHealthColor(node: GraphNode) {
  if (node.status === 'forbidden') return '#450a0a';
  if (props.thinkingNodeId === node.id) return '#10b981';
  const data = nodePhysicsData.get(node.id);
  const score = data ? data.currentScore : 0.5;
  return '#' + getAspectColor(score).getHexString();
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function getAspectColor(value: number): THREE.Color {
  const v = THREE.MathUtils.clamp(value, 0, 1);

  const hueStops = [
    { t: 0.0, h: 220 / 360 }, // blue
    { t: 0.5, h: 140 / 360 }, // green
    { t: 0.66, h: 35 / 360 },  // orange
    { t: 1.0, h: 0 / 360 }     // red
  ];

  for (let i = 0; i < hueStops.length - 1; i++) {
    const s1 = hueStops[i];
    const s2 = hueStops[i + 1];

    if (v >= s1.t && v <= s2.t) {
      const localT = (v - s1.t) / (s2.t - s1.t);
      const hue = lerp(s1.h, s2.h, localT);

      const color = new THREE.Color();
      color.setHSL(hue, 0.8, 0.55); // saturation, lightness
      return color;
    }
  }

  // fallback (should never happen)
  const fallback = new THREE.Color();
  fallback.setHSL(0, 0.8, 0.55);
  return fallback;
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

watch(() => [config.labelSize, props.settings.showEmoji], () => {
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
    if (!graph.value) return;
    const simNodes = graph.value.graphData().nodes as any[];
    const node = simNodes.find(n => n.id === id);
    if (node) performFocus(node);
  },
  reheat: () => graph.value?.d3ReheatSimulation()
})
</script>