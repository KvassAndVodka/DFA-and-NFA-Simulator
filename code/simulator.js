let automaton;
let network;

/**
 * Initialize an automaton instance (DFA or NFA) based on user selection.
 */
function initializeAutomaton() {
  const selectedType = document.getElementById("automatonType").value;

  switch (selectedType) {
    case "DFA":
      automaton = new DFA();
      break;
    case "NFA":
      automaton = new NFA();
      break;
    default:
      throw new Error(`Unknown automaton type: ${selectedType}`);
  }

  document.getElementById("stateList").innerHTML = "";
  document.getElementById("transitionList").innerHTML = "";
  document.getElementById("result").textContent = `Initialized ${selectedType}`;
  renderGraph(); // Initialize graph when automaton is initialized
}

/**
 * Adds a new state to the automaton instance.
 */
function addState() {
  const stateName = document.getElementById("stateName").value.trim();
  const isStartState = document.getElementById("startState").checked;
  const isAcceptState = document.getElementById("acceptState").checked;

  // Check for empty state name
  if (stateName === "") {
    alert("State name cannot be empty.");
    return;
  }

  // Add state to the automaton instance and update the state list
  automaton.addState(stateName, isStartState, isAcceptState);
  updateStateList();

  // Update the result display
  document.getElementById("result").textContent = `State ${stateName} added.`;

  // Reset the state form to its original state
  resetStateForm();

  // Re-render the graph with the new state
  renderGraph();
}

/**
 * Resets the state form to its original state.
 */
function resetStateForm() {
  // Clear the state name input
  const stateNameField = document.getElementById("stateName");
  stateNameField.value = "";

  // Uncheck the start state and accept state checkboxes
  const startStateCheckbox = document.getElementById("startState");
  startStateCheckbox.checked = false;

  const acceptStateCheckbox = document.getElementById("acceptState");
  acceptStateCheckbox.checked = false;
}

/**
 * Adds a transition to the automaton (either NFA or DFA) based on user input.
 */
function addTransition() {
  const fromState = document.getElementById("fromState").value.trim();
  const symbol = document.getElementById("symbol").value.trim();
  const toStateInput = document.getElementById("toState").value.trim();

  const isNFA = automaton instanceof NFA;
  // Use epsilon for empty symbols in NFA, enforce symbol for DFA
  const transitionSymbol = symbol || (isNFA ? "ε" : "");

  // Validate 'From State' and 'To State' inputs
  if (!fromState || !toStateInput) {
    alert("Both 'From State' and 'To State' must be provided.");
    return;
  }

  // Ensure DFA transitions have a valid symbol
  if (!isNFA && !transitionSymbol) {
    alert("A valid symbol is required for DFA transitions.");
    return;
  }

  // Parse 'To States' for NFA or single 'To State' for DFA
  const toStates = toStateInput.split(",").map((state) => state.trim());
  const targetState = isNFA ? toStates : toStates[0];

  // Add the transition to the automaton instance
  automaton.addTransition(fromState, transitionSymbol, targetState);

  // Update the transition list UI
  updateTransitionList();
  document.getElementById(
    "result"
  ).textContent = `Transition added: ${fromState} --${transitionSymbol}--> ${toStates.join(
    ", "
  )}`;

  // Reset transition form inputs
  document.getElementById("fromState").value = "";
  document.getElementById("symbol").value = "";
  document.getElementById("toState").value = "";

  // Re-render the graph with the new transition
  renderGraph();
}

/**
 * Updates the state list UI with the current states of the automaton.
 */
function updateStateList() {
  const stateListElement = document.getElementById("stateList");
  stateListElement.innerHTML = "";

  // Iterate over the states of the automaton
  for (const state of automaton.states) {
    // Create a list item for each state
    const listItem = document.createElement("li");
    listItem.textContent = [
      state,
      state === automaton.startState ? "(Start)" : "",
      automaton.acceptStates.has(state) ? "(Accept)" : "",
    ]
      .filter((text) => !!text)
      .join(" ");
    // Add the list item to the state list UI
    stateListElement.appendChild(listItem);
  }
}

/**
 * Updates the transition list UI with the current transitions of the automaton.
 */
function updateTransitionList() {
  // Get the transition list element from the DOM
  const transitionListElement = document.getElementById("transitionList");

  // Clear existing transition list entries
  transitionListElement.innerHTML = "";

  // Iterate over each source state in the automaton's transitions
  for (const sourceState in automaton.transitions) {
    // Iterate over each transition symbol for the current source state
    for (const transitionSymbol in automaton.transitions[sourceState]) {
      // Retrieve the destination states for the current source state and symbol
      const destinationStates =
        automaton.transitions[sourceState][transitionSymbol];

      // Create a list item element to represent the transition
      const listItem = document.createElement("li");
      listItem.textContent = `${sourceState} --${transitionSymbol}--> ${
        Array.isArray(destinationStates)
          ? destinationStates.join(", ")
          : destinationStates
      }`;

      // Append the list item to the transition list element in the UI
      transitionListElement.appendChild(listItem);
    }
  }
}

/**
 * Renders the automaton graph using vis.js library.
 * This function creates and updates the visual representation of the automaton,
 * including its states as nodes and transitions as edges.
 */
function renderGraph() {
  const nodes = [];
  const edges = [];
  const edgeOffsets = {}; // To handle edge offsets for self-loops

  // Add states as nodes with specific styling
  automaton.states.forEach((state) => {
    nodes.push({
      id: state,
      label: state,
      shape: "circle",
      color: {
        background:
          state === automaton.startState
            ? "blue" // Highlight start state
            : automaton.acceptStates.has(state)
            ? "green" // Highlight accept states
            : "white", // Regular state
        border: "black",
      },
      size: automaton.acceptStates.has(state) ? 30 : 20, // Larger size for accept states
      borderWidth: automaton.acceptStates.has(state) ? 4 : 2, // Thicker border for accept states
    });
  });

  // Add transitions as directed edges
  for (const fromState in automaton.transitions) {
    for (const symbol in automaton.transitions[fromState]) {
      const toStates = Array.isArray(automaton.transitions[fromState][symbol])
        ? automaton.transitions[fromState][symbol]
        : [automaton.transitions[fromState][symbol]];

      toStates.forEach((toState) => {
        const isSelfLoop = fromState === toState;

        // Initialize edge offset for self-loop handling
        if (!edgeOffsets[fromState]) edgeOffsets[fromState] = {};
        if (!edgeOffsets[fromState][toState])
          edgeOffsets[fromState][toState] = 0;

        const offset = edgeOffsets[fromState][toState]++;
        const transitionLength = isSelfLoop ? 250 + offset * 100 : 250;

        edges.push({
          from: fromState,
          to: toState,
          label: symbol,
          arrows: "to",
          color: { color: "black" },
          smooth: {
            type: isSelfLoop ? "cubicBezier" : "continuous",
            roundness: isSelfLoop ? 0.6 : 0.4,
          },
          font: { align: "top" },
          physics: true,
          length: transitionLength,
        });
      });
    }
  }

  // Prepare data for the network
  const data = {
    nodes: new vis.DataSet(nodes),
    edges: new vis.DataSet(edges),
  };

  // Configure the network options
  const options = {
    nodes: {
      shape: "circle",
      font: { size: 16 },
      margin: 10,
    },
    edges: {
      arrows: {
        to: {
          enabled: true,
          type: "arrow",
        },
      },
      smooth: {
        enabled: true,
        type: "dynamic",
      },
      color: { color: "black" },
      font: { size: 10 },
    },
    layout: {
      hierarchical: false,
      improvedLayout: true,
    },
    physics: {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -2000,
        centralGravity: 0.1,
        springLength: 250,
      },
      forceAtlas2Based: {
        gravitationalConstant: -1000,
        centralGravity: 0.01,
        springLength: 250,
        springConstant: 0.08,
        avoidOverlap: 0.5,
      },
    },
  };

  // Initialize or update the network
  if (!network) {
    const container = document.getElementById("network");
    network = new vis.Network(container, data, options);
  } else {
    network.setData(data);
  }
}

function simulateWithAnimation(input) {
  if (!automaton) {
    alert("Automaton not initialized.");
    return;
  }

  // Reset graph to initial state
  renderGraph();

  let currentStates = [automaton.startState];
  let currentIndex = 0;

  // Function to compute epsilon closure with animation
  function getEpsilonClosure(states) {
    const closure = new Set(states);
    const stack = [...states];
    const epsilonPath = [];

    while (stack.length > 0) {
      const state = stack.pop();

      // Check for epsilon transitions from this state
      if (automaton.transitions[state] && automaton.transitions[state]["ε"]) {
        const epsilonTransitions = automaton.transitions[state]["ε"];
        const newStates = Array.isArray(epsilonTransitions)
          ? epsilonTransitions
          : [epsilonTransitions];

        newStates.forEach((epsilonState) => {
          if (!closure.has(epsilonState)) {
            closure.add(epsilonState);
            stack.push(epsilonState);
            epsilonPath.push({ from: state, to: epsilonState });
          }
        });
      }
    }

    return {
      closureStates: Array.from(closure),
      epsilonPath: epsilonPath,
    };
  }

  // Perform step-by-step animation
  function animateStep() {
    // Check if we've processed all input
    if (currentIndex >= input.length) {
      // Final state check
      const isAccepted = currentStates.some((state) =>
        automaton.acceptStates.has(state)
      );
      document.getElementById("result").textContent = isAccepted
        ? "Accepted"
        : "Rejected";
      return;
    }

    const symbol = input[currentIndex];

    // First, compute epsilon closure of current states with animation
    function performEpsilonClosure() {
      const { closureStates, epsilonPath } = getEpsilonClosure(currentStates);

      // If no epsilon transitions, proceed to next step
      if (epsilonPath.length === 0) {
        processSymbol(closureStates);
        return;
      }

      // Animate epsilon transitions
      function animateEpsilonTransitions(pathIndex = 0) {
        if (pathIndex >= epsilonPath.length) {
          // After all epsilon transitions, process symbol
          processSymbol(closureStates);
          return;
        }

        const { from, to } = epsilonPath[pathIndex];

        // Highlight epsilon transition
        document.getElementById(
          "result"
        ).textContent = `ε-transition: ${from} → ${to}`;

        renderGraphWithMultiStateHighlight([from], [to], "ε");

        // Next epsilon transition after delay
        setTimeout(() => {
          animateEpsilonTransitions(pathIndex + 1);
        }, 1000);
      }

      // Start epsilon transition animation
      animateEpsilonTransitions();
    }

    // Process symbol after epsilon transitions
    function processSymbol(closureStates) {
      // Update current states to closure states
      currentStates = closureStates;

      // Update result display with current processing
      document.getElementById(
        "result"
      ).textContent = `Processing symbol: ${symbol} (States: ${currentStates.join(
        ", "
      )})`;

      // Compute next states for the current symbol
      const nextStates = [];
      currentStates.forEach((state) => {
        if (
          automaton.transitions[state] &&
          automaton.transitions[state][symbol]
        ) {
          const transitionTargets = automaton.transitions[state][symbol];
          const targets = Array.isArray(transitionTargets)
            ? transitionTargets
            : [transitionTargets];
          nextStates.push(...targets);
        }
      });

      // If no transitions found
      if (nextStates.length === 0) {
        document.getElementById(
          "result"
        ).textContent = `Rejected: No transition for ${symbol} from states ${currentStates.join(
          ", "
        )}`;
        return;
      }

      // Render graph with current states highlighted
      renderGraphWithMultiStateHighlight(currentStates, nextStates, symbol);

      // Move to next states and next symbol
      currentStates = nextStates;
      currentIndex++;

      // Schedule next step with 1 second delay for animation
      setTimeout(animateStep, 1000);
    }

    // Start by performing epsilon closure with animation
    performEpsilonClosure();
  }

  // Start animation
  animateStep();
}

/**
 * Renders the graph with multiple states highlighted.
 * This is used for animation in the simulateWithAnimation() function.
 * @param {string[]} currentStates - The current states of the automaton
 * @param {string[]} nextStates - The next states of the automaton
 * @param {string} transitionSymbol - The transition symbol
 */
function renderGraphWithMultiStateHighlight(
  currentStates,
  nextStates,
  transitionSymbol
) {
  const nodes = [];
  const edges = [];

  // Add nodes with specific colors based on their state
  automaton.states.forEach((state) => {
    nodes.push({
      id: state,
      label: state,
      shape: "circle",
      color: {
        // Highlight current states in yellow
        background: currentStates.includes(state)
          ? "yellow"
          : // Highlight next states in orange
          nextStates.includes(state)
          ? "orange"
          : // Highlight start state in blue
          state === automaton.startState
          ? "blue"
          : // Highlight accept states in green
          automaton.acceptStates.has(state)
          ? "green"
          : // All other states are white
            "white",
        border: "black",
      },
      // Increase size of highlighted states
      size:
        currentStates.includes(state) ||
        nextStates.includes(state) ||
        automaton.acceptStates.has(state)
          ? 30
          : 20,
      // Increase border width of accept states
      borderWidth: automaton.acceptStates.has(state) ? 4 : 2,
    });
  });

  // Add edges for transitions
  for (const sourceState in automaton.transitions) {
    for (const symbol in automaton.transitions[sourceState]) {
      const targetStates = automaton.transitions[sourceState][symbol];
      const destinations = Array.isArray(targetStates)
        ? targetStates
        : [targetStates];

      destinations.forEach((targetState) => {
        const isActiveTransition =
          currentStates.includes(sourceState) &&
          nextStates.includes(targetState) &&
          symbol === transitionSymbol;

        edges.push({
          from: sourceState,
          to: targetState,
          label: symbol,
          arrows: "to",
          color: {
            // Highlight active transitions in red
            color: isActiveTransition ? "red" : "black",
          },
          // Increase width of highlighted transitions
          width: isActiveTransition ? 3 : 1,
          smooth: { type: "continuous", roundness: 0.4 },
          font: { align: "top" },
        });
      });
    }
  }

  // Set the data for the network visualization
  const graphData = {
    nodes: new vis.DataSet(nodes),
    edges: new vis.DataSet(edges),
  };

  network.setData(graphData);
}
// Modify the existing simulate button to use animation
function simulate() {
  const testString = document.getElementById("testString").value.trim();
  simulateWithAnimation(testString);
}

// Initialize automaton to DFA by default
initializeAutomaton();
