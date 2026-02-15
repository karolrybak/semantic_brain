import { defineStore } from "pinia";
import { ref } from "vue";

export const useGraphConfigStore = defineStore(
	"graphConfig",
	() => {
		// Appearance
		const backgroundColor = ref("#19191d");
		const nodeColor = ref("#cccccc");
		const linkColor = ref("#555555");

		// Physics & Layout
		const nodeRelSize = ref(1); // Multiplier for node sphere size
		const linkWidth = ref(0.5);
		const linkOpacity = ref(0.5);
		const linkDirectionalParticles = ref(0);
		const linkDirectionalParticleSpeed = ref(0.005);
		const labelVisibleDistance = ref(10000); // Effectivly infinite

		// Forces
		const chargeStrength = ref(-20);
		const distanceMax = ref(400);

		// Engine & Advanced
		const forceEngine = ref<"d3" | "ngraph">("d3");
		const numDimensions = ref<1 | 2 | 3>(3);
		const dagMode = ref<string>("null"); // 'null', 'td', 'bu', 'lr', 'rl', 'zout', 'zin', 'radialout', 'radialin'
		const dagLevelDistance = ref(50);
		const warmupTicks = ref(0);
		const cooldownTicks = ref(15000); // -1 for infinite

		function reset() {
			backgroundColor.value = "#19191d";
			nodeRelSize.value = 4;
			linkWidth.value = 0.5;
			linkOpacity.value = 0.5;
			linkDirectionalParticles.value = 0;
			chargeStrength.value = -20;
			forceEngine.value = "d3";
			numDimensions.value = 3;
			dagMode.value = "null";
			dagLevelDistance.value = 50;
			warmupTicks.value = 0;
			cooldownTicks.value = 15000;
		}

		return {
			backgroundColor,
			nodeColor,
			linkColor,
			nodeRelSize,
			linkWidth,
			linkOpacity,
			linkDirectionalParticles,
			linkDirectionalParticleSpeed,
			chargeStrength,
			distanceMax,
			forceEngine,
			numDimensions,
			dagMode,
			dagLevelDistance,
			warmupTicks,
			cooldownTicks,
			reset,
		};
	},
	{
		persist: true,
	},
);
