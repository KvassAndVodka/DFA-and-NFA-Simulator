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

  // Reset all elements on the screen
  const stateListElement = document.getElementById("stateList");
  if (stateListElement) {
    stateListElement.innerHTML = "";
  }
  const transitionListElement = document.getElementById("transitionList");
  if (transitionListElement) {
    transitionListElement.innerHTML = "";
  }
  document.getElementById("result").textContent = "";
  document.getElementById("testString").value = "";
  resetStateForm();
  
  // Initialize nodes and edges as empty DataSets
  nodes = new vis.DataSet();  // Empty DataSet for nodes
  edges = new vis.DataSet();   // Empty DataSet for edges
  edgeOffsets = {}; // To handle edge offsets for self-loops

  // Prepare data object for vis.Network
  const data = {
    nodes: nodes,
    edges: edges,
  };
  var options = {};
   // Initialize the network
   const container = document.getElementById("network");
   network = new vis.Network(container, data, options);

  // Call update functions directly
  updateStateList();
  updateTransitionList();
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

  // Add the state as a node in the graph
  nodes.add({
    id: stateName, // Use stateName as the ID
    label: stateName,
    shape: "circle",
    color: {
      background:
        isStartState
          ? "#a2d2ff" // Highlight start state
          : isAcceptState
          ? "#4FFFB0" // Highlight accept states
          : "#caf0f8", // Regular state
      border:
        isStartState
          ? "blue"
          : isAcceptState
          ? "green"
          : "white",
    },
    font : {
      size: 25,
      face: "cambria"
    },
    physics: false,
    size: isAcceptState ? 30 : 20, // Larger size for accept states
    borderWidth: isAcceptState ? 4 : 2, // Thicker border for accept states
  });

  // // Reset the state form to its original state
  resetStateForm();

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
  const transitionSymbol = symbol || (isNFA ? "ε" : "");  // Use epsilon for NFA, enforce symbol for DFA

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

  // Handle DFA transitions: Check for duplicate symbols for the same fromState
  if (!isNFA) {
    // Check if a transition for this symbol already exists in the DFA
    const existingTransition = automaton.transitions[fromState] && automaton.transitions[fromState][transitionSymbol];
    if (existingTransition) {
      alert(`Transition already exists for state ${fromState} with symbol ${transitionSymbol}.`);
      return;
    }
  }

  // Add the transition to the automaton instance
  automaton.addTransition(fromState, transitionSymbol, targetState);

  // Update the transition list UI
  updateTransitionList();
  document.getElementById(
    "result"
  ).textContent = `Transition added: ${fromState} --${transitionSymbol}--> ${toStates.join(", ")}`;

  // Reset transition form inputs
  document.getElementById("fromState").value = "";
  document.getElementById("symbol").value = "";
  document.getElementById("toState").value = "";

  // Handle self-loop
  const isSelfLoop = fromState === toStateInput;
  
  // Initialize edge offset for self-loop handling
  if (!edgeOffsets[fromState]) edgeOffsets[fromState] = {};
  if (!edgeOffsets[fromState][toStateInput])
    edgeOffsets[fromState][toStateInput] = 0;

  const offset = edgeOffsets[fromState][toStateInput]++;
  const transitionLength = isSelfLoop ? 250 + offset * 100 : 250;

  // Add edge(s) for NFA transitions
  if (isNFA) {
    toStates.forEach((state) => {
      edges.add({
        from: fromState,
        to: state,
        label: transitionSymbol,
        arrows: "to",
        color: { color: "white" },
        smooth: {
          type: isSelfLoop ? "cubicBezier" : "continuous",
          roundness: isSelfLoop ? 0.6 : 0.4,
        },
        font: { align: "horizontal" },
        physics: false,
        length: transitionLength,
      });
    });
  } else {
    // For DFA, only one 'toState'
    edges.add({
      from: fromState,
      to: targetState,
      label: transitionSymbol,
      arrows: "to",
      color: { color: "white" },
      smooth: {
        type: isSelfLoop ? "cubicBezier" : "continuous",
        roundness: isSelfLoop ? 0.6 : 0.4,
      },
      font: { align: "horizontal" },
      physics: false,
      length: transitionLength,
    });
  }
}


/**
 * Updates the state list UI with the current states of the automaton.
 */
function updateStateList() {
  const stateTableBody = document.querySelector("#stateTable tbody");
  stateTableBody.innerHTML = ""; // Clear existing rows

  automaton.states.forEach((state) => {
    const row = document.createElement("tr");

    const stateCell = document.createElement("td");
    stateCell.textContent = state;

    const typeCell = document.createElement("td");
    const types = [];
    if (state === automaton.startState) types.push("Start");
    if (automaton.acceptStates.has(state)) types.push("Accept");
    typeCell.textContent = types.join(", ") || "Normal";

    const deleteCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.onclick = () => {
      // Call a function to remove the state from the automaton
      removeState(state);
    };
    deleteCell.appendChild(deleteButton);

    row.appendChild(stateCell);
    row.appendChild(typeCell);
    row.appendChild(deleteCell);

    stateTableBody.appendChild(row);
  });
}

function updateTransitionList() {
  const transitionTableBody = document.querySelector("#transitionTable tbody");
  transitionTableBody.innerHTML = ""; // Clear existing rows

  for (const fromState in automaton.transitions) {
    for (const symbol in automaton.transitions[fromState]) {
      const toStates = Array.isArray(automaton.transitions[fromState][symbol])
        ? automaton.transitions[fromState][symbol]
        : [automaton.transitions[fromState][symbol]];

      toStates.forEach((toState) => {
        const row = document.createElement("tr");

        const fromCell = document.createElement("td");
        fromCell.textContent = fromState;

        const symbolCell = document.createElement("td");
        symbolCell.textContent = symbol;

        const toCell = document.createElement("td");
        toCell.textContent = toState;

        const deleteCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.onclick = () => {
          // Call a function to remove the transition from the automaton
          removeTransition(fromState, symbol, toState);
        };
        deleteCell.appendChild(deleteButton);

        row.appendChild(fromCell);
        row.appendChild(symbolCell);
        row.appendChild(toCell);
        row.appendChild(deleteCell);

        transitionTableBody.appendChild(row);
      });
    }
  }
}

function removeState(state) {
  if (automaton.states.has(state)) {
    automaton.acceptStates.delete(state);
    automaton.startState = null;
    automaton.states.delete(state);
    nodes.remove({ id: state });
  }

  updateStateList();
  updateTransitionList(); // Update transition list to remove transitions related to the deleted state
}

function removeTransition(fromState, symbol, toState) {
  if (automaton.transitions[fromState] && automaton.transitions[fromState][symbol]) {
    const toStates = Array.isArray(automaton.transitions[fromState][symbol])
      ? automaton.transitions[fromState][symbol]
      : [automaton.transitions[fromState][symbol]];
    const filteredToStates = toStates.filter((s) => s !== toState);
    if (filteredToStates.length === 0) {
      delete automaton.transitions[fromState][symbol];
      if (Object.keys(automaton.transitions[fromState]).length === 0) {
        delete automaton.transitions[fromState];
      }
    } else {
      automaton.transitions[fromState][symbol] = filteredToStates;
    }
  }

  // Remove the edge from the vis.js network
  const edgesToRemove = edges.get({
    filter: (edge) =>
      edge.from === fromState &&
      edge.to === toState &&
      edge.label === symbol,
  });

  // Remove each matching edge
  edgesToRemove.forEach(edge => {
    edges.remove(edge);
  });

  updateTransitionList();
}

/**
 * Resets the node and edge colors to their default states.
 */
function resetGraphColors() {
  // Reset nodes to default color
  const networkNodes = network.body.data.nodes;
  networkNodes.forEach((node) => {
    const state = node.id;

    let backgroundColor = "#caf0f8"; // Default color
    let borderColor = "black"; // Default border color
    if (state === automaton.startState) {
      backgroundColor = "#a2d2ff"; // Light blue for start state
      borderColor = "blue"; // Blue border for start state
    } else if (automaton.acceptStates.has(state)) {
      backgroundColor = "#4FFFB0"; // Green for accept states
      borderColor = "green"; // Green border for accept states
    }

    // Reset node properties
    networkNodes.update({
      id: state,
      color: {
        background: backgroundColor,
        border: borderColor,
      },
      borderWidth: automaton.acceptStates.has(state) ? 4 : 2,
      size: automaton.acceptStates.has(state) ? 30 : 20,
    });
  });

  // Reset edges to default color
  const networkEdges = network.body.data.edges;
  networkEdges.forEach((edge) => {
    networkEdges.update({
      id: edge.id,
      color: {
        color: "#848484", // Gray color for edges
      },
      width: 1, // Default width
    });
  });
}


function simulateWithAnimation(input) {
  if (!automaton) {
    alert("Automaton not initialized.");
    return;
  }

  function getEpsilonClosure(initialStates) {
    const closure = new Set(initialStates);
    const stack = [...initialStates];
    const epsilonPath = [];

    while (stack.length > 0) {
      const state = stack.pop();

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

    return { closureStates: Array.from(closure), epsilonPath: epsilonPath };
  }

  if (input.length === 0) {
    const { closureStates } = getEpsilonClosure([automaton.startState]);
    const isAccepted = closureStates.some((state) =>
      automaton.acceptStates.has(state)
    );
    document.getElementById("result").textContent = isAccepted
      ? "Accepted (Empty String)"
      : "Rejected (Empty String)";
    renderGraphWithMultiStateHighlight(closureStates, [], "ε");
    resetGraphColors(); // Reset graph colors after simulation
    return;
  }

  let currentStates = [automaton.startState];
  let currentIndex = 0;

  function animateStep() {
    if (currentIndex >= input.length) {
      const isAccepted = currentStates.some((state) =>
        automaton.acceptStates.has(state)
      );
      document.getElementById("result").textContent = isAccepted
        ? "Accepted"
        : "Rejected";
      resetGraphColors(); // Reset graph colors after simulation
      return;
    }

    const symbol = input[currentIndex];

    function performEpsilonClosure() {
      const { closureStates, epsilonPath } = getEpsilonClosure(currentStates);

      function animateEpsilonTransitions(pathIndex = 0) {
        if (pathIndex >= epsilonPath.length) {
          processSymbol(closureStates); // Proceed to process the next symbol after all epsilon animations
          return;
        }

        const { from, to } = epsilonPath[pathIndex];

        // Display the transition and render the graph
        document.getElementById("result").textContent = `ε-transition: ${from} → ${to}`;
        renderGraphWithMultiStateHighlight([from], [to], "ε");

        // Introduce a delay before proceeding to the next epsilon transition
        setTimeout(() => {
          animateEpsilonTransitions(pathIndex + 1);
        }, 1000); // 1-second delay for each epsilon transition
      }

      animateEpsilonTransitions();
    }

    function processSymbol(closureStates) {
      const nextStates = [];

      closureStates.forEach((state) => {
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

      if (nextStates.length === 0) {
        document.getElementById("result").textContent = `Rejected: No transition for ${symbol} from states ${closureStates.join(", ")}`;
        resetGraphColors(); // Reset graph colors on rejection
        return;
      }

      const { closureStates: nextClosureStates } = getEpsilonClosure(nextStates);

      document.getElementById("result").textContent = `Processing symbol: ${symbol} (States: ${nextClosureStates.join(", ")})`;

      renderGraphWithMultiStateHighlight(closureStates, nextClosureStates, symbol);

      currentStates = nextClosureStates;
      currentIndex++;

      setTimeout(animateStep, 1000);
    }

    performEpsilonClosure();
  }

  animateStep();
}



/**
 * Renders the graph with multiple states highlighted.
 * This is used for animation in the simulateWithAnimation() function.
 * @param {string[]} currentStates - The current states of the automaton
 * @param {string[]} nextStates - The next states of the automaton
 * @param {string} transitionSymbol - The transition symbol
 */
/**
 * Renders the graph with multiple states highlighted.
 * This updates the existing graph elements directly.
 * @param {string[]} currentStates - The current states of the automaton
 * @param {string[]} nextStates - The next states of the automaton
 * @param {string} transitionSymbol - The transition symbol
 */
function renderGraphWithMultiStateHighlight(currentStates, nextStates, transitionSymbol) {
  // Update node properties directly in the vis.js network
  const networkNodes = network.body.data.nodes;
  networkNodes.forEach((node) => {
    const state = node.id;

    // Determine node background color
    let backgroundColor = "#caf0f8"; // Default background
    if (currentStates.includes(state)) {
      backgroundColor = "#ffe399"; // Yellow for current states
    } else if (nextStates.includes(state)) {
      backgroundColor = "#ff9b0b"; // Orange for next states
    } else if (state === automaton.startState) {
      backgroundColor = "#a2d2ff"; // Light blue for start state
    }

    // Determine border properties
    let borderColor = "white";
    let borderWidth = 2;
    if (state === automaton.startState) {
      borderColor = "blue";
    } else if (automaton.acceptStates.has(state)) {
      borderColor = "green";
      borderWidth = 4;
    }

    // Update node properties
    networkNodes.update({
      id: state,
      color: {
        background: backgroundColor,
        border: borderColor
      },
      borderWidth: automaton.acceptStates.has(state) ? 4 : 2,
      size: (currentStates.includes(state) || nextStates.includes(state) || automaton.acceptStates.has(state)) ? 30 : 20
    });
  });

  // Update edges directly in the vis.js network
  const networkEdges = network.body.data.edges;
  networkEdges.forEach((edge) => {
    const isActiveTransition =
      (currentStates.includes(edge.from) &&
        nextStates.includes(edge.to) &&
        edge.label === transitionSymbol) ||
      (edge.label === "ε" &&
        currentStates.includes(edge.from) &&
        nextStates.includes(edge.to));

    networkEdges.update({
      id: edge.id,
      color: {
        color: isActiveTransition ? "red" : "#848484" // Changed from white to a more visible gray
      },
      width: isActiveTransition ? 3 : 1
    });
  });
}



// Modify the existing simulate button to use animation
function simulate() {
  const testString = document.getElementById("testString").value.trim();
  simulateWithAnimation(testString);
}
// Initialize automaton to DFA by default
initializeAutomaton();
