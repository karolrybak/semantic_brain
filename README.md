# Brain Engine - Dokumentacja Fizyki Grafu

Stałe fizyczne zdefiniowane w `ConceptGraph.vue` sterują zachowaniem i estetyką sieci pojęć:

- **TRANSITION_SPEED**: Szybkość, z jaką wyniki aspektów (Aspect Scores) oraz kolory płynnie przechodzą między stanami. Wartość `0.04` zapewnia ok. 0.5-sekundową animację.
- **LINK_DISTANCE**: Bazowa długość połączenia między węzłami. Im większa, tym bardziej rozproszony graf.
- **LINK_STRENGTH_BASE**: Podstawowa siła sprężystości linków. Jest modulowana przez dopasowanie połączonych węzłów do aspektów.
- **ASPECT_FILTER_LINK_MULT**: Współczynnik redukcji siły linków w momencie, gdy aktywne są filtry aspektów.
- **ASPECT_FILTER_CHARGE_MULT**: Współczynnik redukcji siły odpychania (charge) w trybie filtrowania. Pozwala węzłom łatwiej skupiać się w centrum lub grupować na podstawie podobieństwa.
- **CHARGE_STRENGTH**: Globalna siła odpychania (repulsji) między wszystkimi węzłami. Zapobiega nakładaniu się punktów.
- **CHARGE_DYNAMICS**: Określa, jak bardzo nody "uciekają" na zewnątrz, gdy nie pasują do wybranych aspektów. Niskie dopasowanie = silniejsze odpychanie.
- **CENTER_GRAVITY_K**: Siła przyciągania do środka układu współrzędnych (0,0,0). Działa najmocniej na węzły o wysokim wyniku.
- **SIMILARITY_K**: Współczynnik siły " Similarity Spring". Przyciąga do siebie pojęcia o podobnych wektorach aspektów, nawet jeśli nie mają bezpośredniej krawędzi.
- **SIMILARITY_THRESHOLD**: Próg podobieństwa kosinusowego (od 0 do 1), powyżej którego aktywowana jest siła przyciągania między niepołączonymi nodami.
- **NODE_SIZE_RANGE**: Określa minimalną i maksymalną wielkość (promień) węzła w zależności od jego dopasowania do filtrów.
- **VELOCITY_DECAY**: Współczynnik tarcia/tłumienia ruchu. Wyższe wartości (np. 0.4) szybciej stabilizują graf.
