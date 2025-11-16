// Frontend Learn UI Problems Database - Progressive Learning Path

export const frontendProblems = [
  // ========== LEVEL 1: HTML BASICS ==========
  {
    id: 1,
    title: 'Make a Blue Box',
    difficulty: 'Beginner',
    category: 'HTML',
    level: 1,
    description: 'Create a simple blue square on the page using HTML.',
    instructions: [
      'Create a div element',
      'Give it a width and height of 100px',
      'Make the background color blue',
    ],
    starterCode: {
      html: `<!-- Create your blue box here -->`,
      css: `/* Add CSS to make it blue */`,
      js: ``,
    },
    solution: {
      html: `<div class="blue-box"></div>`,
      css: `.blue-box {
  width: 100px;
  height: 100px;
  background-color: blue;
}`,
      js: ``,
    },
    hints: [
      'Use a <div> tag to create a box',
      'Set width and height to 100px in CSS',
      'Use background-color: blue;',
    ],
  },
  {
    id: 2,
    title: 'Hello World Text',
    difficulty: 'Beginner',
    category: 'HTML',
    level: 1,
    description: 'Display "Hello World!" on the page with big, red text.',
    instructions: [
      'Use an h1 heading tag',
      'Write "Hello World!" inside it',
      'Make the text red and large (32px)',
    ],
    starterCode: {
      html: `<!-- Add your heading here -->`,
      css: `/* Style your heading */`,
      js: ``,
    },
    solution: {
      html: `<h1>Hello World!</h1>`,
      css: `h1 {
  color: red;
  font-size: 32px;
}`,
      js: ``,
    },
    hints: [
      'Use the <h1> tag for headings',
      'Use color: red; for text color',
      'Use font-size: 32px; for size',
    ],
  },
  {
    id: 3,
    title: 'Two Colored Boxes',
    difficulty: 'Beginner',
    category: 'HTML',
    level: 1,
    description: 'Create two boxes side by side - one red and one blue.',
    instructions: [
      'Create two div elements',
      'Give them both 100px width and height',
      'Make one red and one blue',
      'Put them next to each other',
    ],
    starterCode: {
      html: `<!-- Create two boxes -->`,
      css: `/* Style your boxes */`,
      js: ``,
    },
    solution: {
      html: `<div class="container">
  <div class="red-box"></div>
  <div class="blue-box"></div>
</div>`,
      css: `.container {
  display: flex;
  gap: 10px;
}

.red-box {
  width: 100px;
  height: 100px;
  background-color: red;
}

.blue-box {
  width: 100px;
  height: 100px;
  background-color: blue;
}`,
      js: ``,
    },
    hints: [
      'Use display: flex to put boxes side by side',
      'Create two divs with different class names',
      'Style each box with different background colors',
    ],
  },

  // ========== LEVEL 2: STYLING BASICS ==========
  {
    id: 4,
    title: 'Style a Button',
    difficulty: 'Beginner',
    category: 'CSS',
    level: 2,
    description:
      'Create a nice looking button with padding and rounded corners.',
    instructions: [
      'Create a button element',
      'Add padding of 12px 24px',
      'Make it have rounded corners (8px)',
      'Give it a blue background and white text',
    ],
    starterCode: {
      html: `<button>Click Me!</button>`,
      css: `/* Style your button */
button {
  /* Add your styles here */
}`,
      js: ``,
    },
    solution: {
      html: `<button>Click Me!</button>`,
      css: `button {
  padding: 12px 24px;
  border-radius: 8px;
  background-color: #3b82f6;
  color: white;
  border: none;
  font-size: 16px;
  cursor: pointer;
}

button:hover {
  background-color: #2563eb;
}`,
      js: ``,
    },
    hints: [
      'Use padding: 12px 24px; for spacing',
      'border-radius makes corners round',
      'Add a :hover effect for interactivity',
    ],
  },
  {
    id: 5,
    title: 'Center a Box',
    difficulty: 'Beginner',
    category: 'CSS',
    level: 2,
    description: 'Center a colored box in the middle of the screen.',
    instructions: [
      'Create a container that fills the screen',
      'Put a 200px red square inside',
      'Center it using flexbox',
    ],
    starterCode: {
      html: `<div class="container">
  <div class="box"></div>
</div>`,
      css: `/* Center the box */
.container {
  /* Add your styles */
}

.box {
  width: 200px;
  height: 200px;
  background-color: red;
}`,
      js: ``,
    },
    solution: {
      html: `<div class="container">
  <div class="box"></div>
</div>`,
      css: `.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.box {
  width: 200px;
  height: 200px;
  background-color: red;
}`,
      js: ``,
    },
    hints: [
      'Use display: flex on the container',
      'justify-content: center centers horizontally',
      'align-items: center centers vertically',
    ],
  },

  // ========== LEVEL 3: JAVASCRIPT BASICS ==========
  {
    id: 6,
    title: 'Click Counter',
    difficulty: 'Beginner',
    category: 'JavaScript',
    level: 3,
    description: 'Make a button that counts how many times it was clicked.',
    instructions: [
      'Create a button and a number display',
      'Start the count at 0',
      'Increase the count each time the button is clicked',
    ],
    starterCode: {
      html: `<div>
  <p id="count">0</p>
  <button id="btn">Click Me!</button>
</div>`,
      css: `p {
  font-size: 48px;
  font-weight: bold;
}

button {
  padding: 12px 24px;
  font-size: 16px;
}`,
      js: `// Add your JavaScript here
const btn = document.getElementById('btn');
const count = document.getElementById('count');

// Your code here`,
    },
    solution: {
      html: `<div>
  <p id="count">0</p>
  <button id="btn">Click Me!</button>
</div>`,
      css: `p {
  font-size: 48px;
  font-weight: bold;
  text-align: center;
}

button {
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
}`,
      js: `const btn = document.getElementById('btn');
const count = document.getElementById('count');

let clicks = 0;

btn.addEventListener('click', () => {
  clicks++;
  count.textContent = clicks;
});`,
    },
    hints: [
      'Use addEventListener to detect clicks',
      'Store the count in a variable',
      'Update textContent to show the new count',
    ],
  },
  {
    id: 7,
    title: 'Change Background Color',
    difficulty: 'Beginner',
    category: 'JavaScript',
    level: 3,
    description:
      'Create a button that changes the background color when clicked.',
    instructions: [
      'Create a button',
      'When clicked, change the page background to a different color',
    ],
    starterCode: {
      html: `<button id="colorBtn">Change Color</button>`,
      css: `body {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

button {
  padding: 16px 32px;
  font-size: 18px;
}`,
      js: `// Add your code here`,
    },
    solution: {
      html: `<button id="colorBtn">Change Color</button>`,
      css: `body {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  transition: background-color 0.3s;
}

button {
  padding: 16px 32px;
  font-size: 18px;
  cursor: pointer;
}`,
      js: `const btn = document.getElementById('colorBtn');

const colors = ['#ffcccc', '#ccffcc', '#ccccff', '#ffffcc', '#ffccff'];
let currentIndex = 0;

btn.addEventListener('click', () => {
  document.body.style.backgroundColor = colors[currentIndex];
  currentIndex = (currentIndex + 1) % colors.length;
});`,
    },
    hints: [
      'Use document.body.style.backgroundColor',
      'Create an array of colors',
      'Use addEventListener on the button',
    ],
  },

  // ========== LEVEL 4: INTERMEDIATE ==========
  {
    id: 8,
    title: 'Simple Calculator',
    difficulty: 'Intermediate',
    category: 'JavaScript',
    level: 4,
    description: 'Create a calculator that can add two numbers.',
    instructions: [
      'Create two input fields for numbers',
      'Add a button to calculate the sum',
      'Display the result',
    ],
    starterCode: {
      html: `<div class="calculator">
  <input type="number" id="num1" placeholder="First number">
  <input type="number" id="num2" placeholder="Second number">
  <button id="addBtn">Add</button>
  <p id="result"></p>
</div>`,
      css: `.calculator {
  padding: 20px;
}

input {
  padding: 8px;
  margin: 5px;
}

button {
  padding: 8px 16px;
}`,
      js: `// Add your calculator logic`,
    },
    solution: {
      html: `<div class="calculator">
  <input type="number" id="num1" placeholder="First number">
  <input type="number" id="num2" placeholder="Second number">
  <button id="addBtn">Add</button>
  <p id="result"></p>
</div>`,
      css: `.calculator {
  padding: 20px;
  text-align: center;
}

input {
  padding: 8px;
  margin: 5px;
  border: 2px solid #333;
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

#result {
  font-size: 24px;
  font-weight: bold;
  margin-top: 10px;
}`,
      js: `const num1 = document.getElementById('num1');
const num2 = document.getElementById('num2');
const addBtn = document.getElementById('addBtn');
const result = document.getElementById('result');

addBtn.addEventListener('click', () => {
  const sum = Number(num1.value) + Number(num2.value);
  result.textContent = 'Result: ' + sum;
});`,
    },
    hints: [
      'Get values using .value from inputs',
      'Convert to numbers using Number()',
      'Display result in the paragraph',
    ],
  },
  {
    id: 9,
    title: 'Todo List',
    difficulty: 'Intermediate',
    category: 'JavaScript',
    level: 4,
    description: 'Build a simple todo list where you can add and remove items.',
    instructions: [
      'Create an input and add button',
      'Add items to a list when button is clicked',
      'Allow removing items by clicking them',
    ],
    starterCode: {
      html: `<div class="todo-app">
  <input type="text" id="todoInput" placeholder="Enter a task">
  <button id="addBtn">Add</button>
  <ul id="todoList"></ul>
</div>`,
      css: `* {
  font-family: Arial, sans-serif;
}

.todo-app {
  max-width: 400px;
  margin: 20px;
}

input {
  padding: 8px;
  width: 70%;
}

button {
  padding: 8px 16px;
}

ul {
  list-style: none;
  padding: 0;
}`,
      js: `// Build your todo list`,
    },
    solution: {
      html: `<div class="todo-app">
  <input type="text" id="todoInput" placeholder="Enter a task">
  <button id="addBtn">Add</button>
  <ul id="todoList"></ul>
</div>`,
      css: `* {
  font-family: Arial, sans-serif;
}

.todo-app {
  max-width: 400px;
  margin: 20px;
}

input {
  padding: 8px;
  width: 70%;
  border: 2px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  background: #22c55e;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  padding: 10px;
  margin: 5px 0;
  background: #f3f4f6;
  border-radius: 4px;
  cursor: pointer;
}

li:hover {
  background: #fecaca;
  text-decoration: line-through;
}`,
      js: `const input = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const list = document.getElementById('todoList');

addBtn.addEventListener('click', addTodo);
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTodo();
});

function addTodo() {
  if (input.value.trim() === '') return;

  const li = document.createElement('li');
  li.textContent = input.value;
  li.addEventListener('click', () => li.remove());

  list.appendChild(li);
  input.value = '';
}`,
    },
    hints: [
      'Use createElement to make new list items',
      'Add click listener to remove items',
      'Clear input after adding',
    ],
  },
  {
    id: 10,
    title: 'Responsive Card',
    difficulty: 'Intermediate',
    category: 'CSS',
    level: 4,
    description: 'Create a card that looks good on both mobile and desktop.',
    instructions: [
      'Create a card with an image, title, and description',
      'Make it stack vertically on mobile',
      'Make it horizontal on desktop',
    ],
    starterCode: {
      html: `<div class="card">
  <div class="image">📸</div>
  <div class="content">
    <h2>Card Title</h2>
    <p>This is a responsive card that changes layout based on screen size.</p>
  </div>
</div>`,
      css: `/* Make this responsive! */
.card {
  /* Add your styles */
}`,
      js: ``,
    },
    solution: {
      html: `<div class="card">
  <div class="image">📸</div>
  <div class="content">
    <h2>Card Title</h2>
    <p>This is a responsive card that changes layout based on screen size.</p>
  </div>
</div>`,
      css: `.card {
  max-width: 600px;
  margin: 20px;
  padding: 20px;
  border: 2px solid #ddd;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.image {
  font-size: 64px;
  text-align: center;
  padding: 20px;
  background: #f3f4f6;
  border-radius: 8px;
}

.content h2 {
  margin: 0 0 10px 0;
}

.content p {
  margin: 0;
  color: #666;
}

@media (min-width: 768px) {
  .card {
    flex-direction: row;
  }

  .image {
    min-width: 150px;
  }
}`,
      js: ``,
    },
    hints: [
      'Use flexbox for layout',
      'Use @media queries for responsive design',
      'Change flex-direction at breakpoint',
    ],
  },
];

// Helper functions
export const getProblemById = id => {
  return frontendProblems.find(p => p.id === id);
};

export const getProblemsByLevel = level => {
  return frontendProblems.filter(p => p.level === level);
};

export const getProblemsByCategory = category => {
  return frontendProblems.filter(p => p.category === category);
};

export const getProblemsByDifficulty = difficulty => {
  return frontendProblems.filter(p => p.difficulty === difficulty);
};

export const getLevelInfo = () => {
  return [
    {
      level: 1,
      name: 'HTML Basics',
      emoji: '📝',
      description: 'Learn basic HTML structure',
    },
    {
      level: 2,
      name: 'Styling Basics',
      emoji: '🎨',
      description: 'Style with CSS',
    },
    {
      level: 3,
      name: 'JavaScript Basics',
      emoji: '⚡',
      description: 'Add interactivity',
    },
    {
      level: 4,
      name: 'Build Projects',
      emoji: '🏗️',
      description: 'Put it all together',
    },
  ];
};
