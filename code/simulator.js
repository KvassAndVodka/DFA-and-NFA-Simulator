let automaton;
let network;

// Initialize an automaton instance (DFA or NFA) based on user selection.
function initializeAutomaton() {
  const selectedType = document.getElementById("automatonType").value;

  switch (selectedType) {               // Dropdown sa HTML, choose between NFA or DFA
    case "DFA":
      automaton = new DFA();            // New instance DFA.js
      break;
    case "NFA":                         // New instance NFA.js
      automaton = new NFA();
      break;
    default:
      throw new Error(`Unknown automaton type: ${selectedType}`);
  }

  // Reset all elements on the screen
  const stateListElement = document.getElementById("stateList");        // WHY RESET???
  if (stateListElement) {                                               // BRUH, different FSM, reset data, less hassle
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
  nodes = new vis.DataSet();            // Empty DataSet for nodes
  edges = new vis.DataSet();            // Empty DataSet for edges
  edgeOffsets = {};                     // To handle edge offsets for self-loops

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

// Adds a new state to the automaton instance.
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


// Resets the state form to its original state.
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

// Adds a transition to the automaton (either NFA or DFA) based on user input.
function addTransition() {
  const fromState = document.getElementById("fromState").value.trim();
  const symbol = document.getElementById("symbol").value.trim();
  const toStateInput = document.getElementById("toState").value.trim();

  const isNFA = automaton instanceof NFA;
  const transitionSymbol = symbol || (isNFA ? "ε" : "");  // Use epsilon for NFA, enforce symbol for DFA

  // Check of From and To are not empty
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


// Updates the state list UI with the current states of the automaton.
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

// Resets the node and edge colors to their default states.
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
  // Verify if automaton is initialized
  if (!automaton) {
    alert("Automaton not initialized.");
    return;
  }

  // Computes the epsilon closure of the initial statesAI
  // The epsilon closure is the set of all states reachable from 
  // the initial states using only epsilon transitions.
  function getEpsilonClosure(initialStates) {
    const closure = new Set(initialStates);               // Set to store the epsilon closure
    const stack = [...initialStates];                     // Stack to perform depth-first search
    const epsilonPath = [];                               // Array to store epsilon transitions


    // Perform depth-first search
    while (stack.length > 0) {
      const state = stack.pop();                                                   // Get the current state

      if (automaton.transitions[state] && automaton.transitions[state]["ε"]) {     // If the current state has epsilon transitions, then
        const epsilonTransitions = automaton.transitions[state]["ε"];              // Get the epsilon transition of the current state
        const newStates = Array.isArray(epsilonTransitions)                        // Ensure that epsilonTransitions is an array
          ? epsilonTransitions                                                     
          : [epsilonTransitions];                                                 

        newStates.forEach((epsilonState) => {                                      // Iterate over the list of epsilon states
          if (!closure.has(epsilonState)) {                                        // Check if the epsilon state is already in the closure (to avoid loop of death)
            closure.add(epsilonState);                                             // add the epsilon state to the closure
            stack.push(epsilonState);                                              // push the epsilon state to the stack
            epsilonPath.push({ from: state, to: epsilonState });                   // add the epsilon transition to the path
          }
        });
      }
    }

    return { closureStates: Array.from(closure), epsilonPath: epsilonPath };       // return the epsilon closure and the epsilon path
  }

  if (input.length === 0) {                                                                 // Handle empty/epsilon input
    const { closureStates, epsilonPath } = getEpsilonClosure([automaton.startState]);       // Get the epsilon closure and path 
  
    function animateEpsilonTransitions(pathIndex = 0) {                   // Function to animate epsilon transitions
      if (pathIndex >= epsilonPath.length) {                              // Termination condition if all epsilon transitions have been animated
        const isAccepted = closureStates.some((state) =>                  // Check if any state in the closure is an accept state
          automaton.acceptStates.has(state)
        );
        document.getElementById("result").textContent = isAccepted        // If accept state is in closure,
          ? "Accepted (Empty String)"                                     // Accepted, else
          : "Rejected (Empty String)";                                    // Rejected.

        highlightState(closureStates, [], "ε");                           // Highlight the epsilon closure
        resetGraphColors(); // Reset graph colors after simulation        // Reset graph colors
        return;                                                           // terminate the function
      }
      
      // ANIMATION STARTS HERE
      const { from, to } = epsilonPath[pathIndex];                        // Get the current epsilon transition
  
      // Display the transition and render the graph
      document.getElementById("result").textContent = `ε-transition: ${from} → ${to}`;    
      highlightState([from], [to], "ε");
  
      // Introduce a delay before proceeding to the next epsilon transition
      setTimeout(() => {
        animateEpsilonTransitions(pathIndex + 1);                         // Recursively animate the next epsilon transition
      }, 1000);                                                           // 1-second delay for each epsilon transition
    }
  
    animateEpsilonTransitions();
    return;                                                               // terminate the function
  }

  let currentStates = [automaton.startState];                             // allow all functions to access the currentStates
  let currentIndex = 0;                                                   // allow all functions to access the currentIndex (animation step)

  
  // Function to animate a single step of the simulation
  function animateStep() {                                                
    if (currentIndex >= input.length) {                                   // Termination condition if all input symbols have been processed
      const isAccepted = currentStates.some((state) =>                    // Check if any state in the current states is an accept state
        automaton.acceptStates.has(state)
      );
      document.getElementById("result").textContent = isAccepted          // If accept state is in current states,
        ? "Accepted"                                                      // Accepted, else
        : "Rejected";                                                     // Rejected.
      resetGraphColors();                                                 // Reset graph colors after simulation
      return;
    }
  
    const symbol = input[currentIndex];                                   // Get the current symbol
  
    function performEpsilonClosureAndTransition() {
      // First, compute epsilon closure for the current states
      const { closureStates, epsilonPath } = getEpsilonClosure(currentStates);
      

      // uhhuh, yes animate epsilon transitions
      function animateEpsilonTransitions(pathIndex = 0) {                   
        if (pathIndex >= epsilonPath.length) {                                  // Termination condition if all epsilon transitions have been animated
          // After epsilon transitions are done, process the current symbol
          processSymbol(closureStates);
          return;
        }
  
        const { from, to } = epsilonPath[pathIndex];
  
        // Display the epsilon transition and render the graph
        document.getElementById("result").textContent = `ε-transition: ${from} → ${to}`;
        highlightState([from], [to], "ε");
  
        // Introduce a delay before proceeding to the next epsilon transition
        setTimeout(() => {
          animateEpsilonTransitions(pathIndex + 1);
        }, 1000); // 1-second delay for each epsilon transition
      }
  
      animateEpsilonTransitions();
    }
    
    
    // INPUT PROCESSOR YES THE REAL DEAL
    function processSymbol(closureStates) {                 // Function to process the current symbol
      const nextStates = [];                                // Initialize an array to store the next states

      closureStates.forEach((state) => {                    // Process the transition for the current symbol
        if (
          automaton.transitions[state] &&                   // Check if the state has a transition for the current symbol
          automaton.transitions[state][symbol]
        ) {
          const transitionTargets = automaton.transitions[state][symbol];         // Get the transition targets
          const targets = Array.isArray(transitionTargets)                        // Check if the transition targets are an array
            ? transitionTargets                                                   // If they are, use them as-is
            : [transitionTargets];                                                // Else, wrap them in an array  
          nextStates.push(...targets);                                            // Add the transition targets to the next states
        }
      });
      
      // No transitions??? XXXXXXXX REJECTED XXXXXXXX
      if (nextStates.length === 0) {
        document.getElementById("result").textContent = `Rejected: No transition for ${symbol} from states ${closureStates.join(", ")}`;
        resetGraphColors(); // Reset graph colors on rejection
        return;
      }
  
      // Now, we compute the epsilon closure for the next set of states
      const { 
        closureStates: nextClosureStates, 
        epsilonPath: nextClosureTransitions 
      } = getEpsilonClosure(nextStates);
  
      // Display the transition information and render the graph
      document.getElementById("result").textContent = `Processing symbol: ${symbol} (States: ${nextClosureStates.join(", ")})`;
      highlightState(closureStates, nextClosureStates, symbol, nextClosureTransitions);
  
      // Update current states with the closure states
      currentStates = nextClosureStates;
      currentIndex++;
  
      // Continue the simulation after a short delay
      setTimeout(animateStep, 1000);
    }
  
    performEpsilonClosureAndTransition();
  }
  
  

  animateStep();
}


// "Animation" of the graph.
// just recoloring states and transitions to make it look like an animiation basically
function highlightState(currentStates, nextStates, transitionSymbol, epsilonTransitions = []) {
  const networkNodes = network.body.data.nodes;           // instantiate network nodes
  networkNodes.forEach((node) => {                        // loop through all nodes
    const state = node.id;                                // get the node id

    // WHAT TYPE OF NODE ARE YOUUU?? (CLASSIFICATION)
    let backgroundColor = "#caf0f8";                      // just a chill state (wala na traverse)
    if (currentStates.includes(state)) {
      backgroundColor = "#ffe399";                        // Yellow for current states (node rn)
    } else if (nextStates.includes(state)) {
      backgroundColor = "#ff9b0b";                        // Orange for next states (node nt)
    } else if (state === automaton.startState) {
      backgroundColor = "#a2d2ff";                        // Light blue for start state 
    }

    // Outline lang para klaro
    let borderColor = "white";                            // npc ahh
    if (state === automaton.startState) { 
      borderColor = "blue";                               // START STATE BLUE BLUE START BLUE BLUEEEEE
    } else if (automaton.acceptStates.has(state)) {
      borderColor = "green";                              // ACCEPT STATE GREEN GREEEN GREEEEEEEEEEEEN
      borderWidth = 4;
    }

    // Update node properties
    networkNodes.update({                                 // What happens here is gina update nato ang states nato para "animated"
      id: state,                                          // RECOLOR NODES, ANIMATION, MAGIC, WHOAAAA
      color: {
        background: backgroundColor,
        border: borderColor
      },
      borderWidth: automaton.acceptStates.has(state) ? 4 : 2,
      size: (currentStates.includes(state) || nextStates.includes(state) || automaton.acceptStates.has(state)) ? 30 : 20
    });
  });

  // Update edges directly in the vis.js network
  const networkEdges = network.body.data.edges;           // instantiate network edges
  networkEdges.forEach((edge) => {                        // loop through all edges
    const isActiveTransition =                            // check if the edge is an active transition
      (currentStates.includes(edge.from) &&               // check if the edge's from state is in the current states
        nextStates.includes(edge.to) &&
        edge.label === transitionSymbol) ||
      (edge.label === "ε" &&                              // check if the edge is an epsilon transition
        currentStates.includes(edge.from) &&
        nextStates.includes(edge.to)) ||
      // Add check for epsilon transitions
      epsilonTransitions.some(
        (transition) => transition.from === edge.from && transition.to === edge.to
      );

    networkEdges.update({                         // What happens now is all edges that is epsilon are highlighted
      id: edge.id,
      color: {
        color: isActiveTransition ? "red" : "#848484"
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
